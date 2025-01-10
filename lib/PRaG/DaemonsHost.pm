package PRaG::DaemonsHost;

use strict;
use warnings;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

with 'MooseX::Getopt';
with 'MooseX::Getopt::GLD' => { getopt_conf => ['pass_through'] };

use Carp;
use Cwd 'abs_path';
use Data::Dumper;
use Data::GUID;
use Data::HexDump;
use File::Basename;
use File::Temp      qw/tempfile/;
use JSON::MaybeXS   qw/encode_json decode_json/;
use List::MoreUtils qw/firstidx indexes/;
use Path::Tiny;
use Readonly;
use Redis::JobQueue;
use Proc::ProcessTable;
use String::ShellQuote qw/shell_quote/;
use Time::HiRes        qw/gettimeofday/;
use English            qw( -no_match_vars );
use Syntax::Keyword::Try;
use AnyEvent;
use EV;
use POSIX ":sys_wait_h";
use Daemon::Control;

use PRaG::DaemonGenerator;
use PRaG::JobsWatcher;

has 'pid_file' => (
    is            => 'rw',
    isa           => 'Str',
    required      => 1,
    documentation => 'Filename to store pid of parent process.',
);
has 'log_file' => (
    is            => 'rw',
    isa           => 'Str',
    required      => 0,
    documentation => 'Name of log file to be written to.',
);
has 'background' => (
    is            => 'rw',
    isa           => 'Bool',
    default       => 0,
    documentation => 'Run in background',
);
has 'setsid' => (
    is            => 'rw',
    isa           => 'Bool',
    default       => 0,
    documentation => 'Run the POSIX::setsid() command to truly daemonize',
);
has 'appdir' => (
    is            => 'rw',
    isa           => 'Str',
    required      => 0,
    documentation => 'Directory to chroot to after bind process has taken '
      . 'place and the server is still running as root.',
);
has 'verbose' => (
    is            => 'rw',
    isa           => 'Bool',
    default       => 0,
    documentation => 'Enable verbose mode.',
);
has 'logger' => (
    is     => 'ro',
    isa    => 'logger',
    writer => '_set_logger',
    traits => ['NoGetopt'],
);
has 'cv' => (
    is     => 'ro',
    isa    => 'AnyEvent::CondVar',
    writer => '_set_cv',
    traits => ['NoGetopt'],
);
has '_interval_watcher' => (
    is     => 'ro',
    isa    => 'EV::Timer',
    writer => '_set_interval_watcher',
    traits => ['NoGetopt'],
);

has '_jobqueue' => (
    is     => 'ro',
    isa    => 'Maybe[Redis::JobQueue]',
    writer => '_set_jq',
    traits => ['NoGetopt'],
);

use base qw(Net::Server::PreFork);
Readonly my $EOL => "\015\012";
Readonly my %CMD_HANDLERS => (
    'START'    => \&_start_process,
    'CONTINUE' => \&_continue_process,
);

with 'PRaG::Role::Config', 'PRaG::Role::Logger';

sub start_server {
    my $self = shift;

    $self->_init_config;
    $self->_init_logger('_dhost');
    $self->_init_jobqueue;
    $self->_init_condvar;

    srand( time ^ $$ ^ unpack "%L*", `ps axww | gzip -f` );

    @_ = undef;

    my $listen = $self->config->{generator}->{port} // 52525;

    # $self->logger->info( 'Starting Daemons Host on '
    #       . $self->config->{generator}->{host_socket} );
    $self->logger->info( 'Starting Daemons Host on ' . $listen );
    $self->run(
        port       => $listen,
        proto      => 'tcp',
        host       => 'localhost',
        ipv        => '4',
        pid_file   => $self->pid_file,
        log_file   => $self->log_file || undef,
        log_level  => 3,
        background => $self->background || undef,
        setsid     => $self->setsid     || undef,
    );
    return;
}

sub _init_condvar {
    my $self = shift;

    if ( $self->cv ) {
        $self->logger->debug('Condvar already exists');
        return;
    }

    $self->logger->debug('Creating new condvar');
    my $cv = AE::cv;
    $self->_set_cv($cv);

    $self->logger->debug('Setting up timer watcher');
    my $w_interval = AnyEvent->timer(
        after    => 2,
        interval => 5,
        cb       => sub {
            $self->logger->debug('Interval watcher');
            my ( $zombies, $alive ) = $self->get_my_zombie_descendant_processes;
            my $my_pid = $$;
            $self->logger->debug( 'My PID: ' . $my_pid );
            $self->logger->debug( 'Zombies PIDs: ' . join q{, },
                map { $_->pid } @{$zombies} );
            $self->logger->debug(
                'Alive PIDs and states: ' . join q{, },
                map { $_->pid . q{ - } . $_->state } @{$alive}
            );

            if ( scalar @{$zombies} ) {
                $self->logger->debug('Zombies found');
                for my $zombie ( @{$zombies} ) {
                    $self->logger->debug(
                        'Killing zombie with PID ' . $zombie->pid );
                    my $waitpid_result = waitpid( $zombie->pid, WNOHANG );
                    if ( $waitpid_result == -1 ) {
                        $self->logger->warn( "Error waiting for child process"
                              . $zombie->pid . "."
                              . "It may not exist or is not a child of this process."
                        );
                    }
                    elsif ( $waitpid_result == $zombie->pid ) {
                        $self->logger->debug( "Child process with PID "
                              . $zombie->pid
                              . " has been reaped." );
                    }
                    else {
                        $self->logger->warn("Unexpected result from waitpid.");
                    }
                }
            }

            if ( !scalar @{$zombies} && !scalar @{$alive} ) {
                $self->logger->debug('No zombies or alive processes');
                $self->cv->send;
                return;
            }
        }
    );
    $self->logger->debug('Interval watcher set');
    $self->_set_interval_watcher($w_interval);

    return;
}

sub get_my_zombie_descendant_processes {
    my $self   = shift;
    my $my_pid = $$;
    my $t      = Proc::ProcessTable->new;
    my @zombies =
      grep { $_->ppid == $my_pid && $_->state eq 'defunct' } @{ $t->table };
    my @alive =
      grep { $_->ppid == $my_pid && $_->state ne 'defunct' } @{ $t->table };
    return ( \@zombies, \@alive );
}

after '_init_config' => sub {
    my $self = shift;

    my ( undef, $DIR, undef ) = fileparse( $self->configfile );
    $self->config->{appdir} =
      ( $self->appdir && -d $self->appdir ) ? $self->appdir : $DIR;

    $self->config->{foreground_daemon} // 0;

    return $self;
};

sub _init_jobqueue {
    my $self = shift;

    my $server = { server => $self->config->{redis}->{server}, };
    if ( $self->config->{redis}->{password} ) {
        $server->{password} = $self->config->{redis}->{password};
    }

    my $jq;
    try {
        $jq = Redis::JobQueue->new( redis => $server );
    }
    catch {
        if ( $jq && $jq->last_errorcode ) {
            $self->logger->error(
                q{No connection to Radius server. Code: } . $jq->last_error );
        }
        else {
            $self->logger->error(
                q{No connection to Radius server. } . $EVAL_ERROR );
        }
    }

    $self->_set_jq($jq);
    return $self;
}

sub process_request {
    my $self = shift;
    my $prop = $self->{'server'};

    my $req = q{};
    while ( my $line = <STDIN> ) {
        last
          if $line =~ /^\.\s*/; # End conversation if got just dot on a new line
        $req .= $line;
    }
    $req =~ s/\s*$//;

    $self->logger->debug( 'Got ' . $req );

    my ( $cmd, $json ) = split /\s/sxm, $req, 2;
    if ( exists $CMD_HANDLERS{$cmd} && ( my $h = $CMD_HANDLERS{$cmd} ) ) {
        $self->$h($json);
    }
    else {
        $self->logger->error('Cmd not known');
        print qq/ERROR: CMD NOT KNOWN$EOL/;
        return 0;
    }
}

sub _start_process {
    my ( $self, $json, $prefix, $need_watcher ) = @_;

    $prefix ||= 'PRaG-';
    $need_watcher //= 0;

    my $parsed;
    try {
        $parsed = decode_json($json);
    }
    catch {
        $self->logger->error( 'JSON not parsable' . $EVAL_ERROR );
        print qq/ERROR: JSON NOT PARSABLE$EOL/;
        return 0;
    };

    if ( !exists $parsed->{configfile} || !$parsed->{configfile} ) {
        $parsed->{configfile} = $self->configfile;
    }

    if ( !exists $parsed->{o} || !$parsed->{o} ) {
        $self->logger->error('Owner must be specified');
        print qq/ERROR: OWNER MUST BE SPECIFIED$EOL/;
        return 0;
    }

    if (   ( !exists $parsed->{jsondata} || !$parsed->{jsondata} )
        && ( !exists $parsed->{jsonfile} || !$parsed->{jsonfile} ) )
    {
        $self->logger->error('No attributes');
        print qq/ERROR: NO ATTRIBUTES$EOL/;
        return 0;
    }

    my %attributes = (
        progname => $prefix
          . shell_quote( $parsed->{o} ) . q{-}
          . Data::GUID->guid_string,
        configfile => $parsed->{configfile} // undef,
        verbose    => $parsed->{verbose}    // undef,
        o          => $parsed->{o}          // undef,
    );
    if ( $parsed->{jsonfile} ) { $attributes{jsonfile} = $parsed->{jsonfile}; }
    else                       { $attributes{jsondata} = $parsed->{jsondata}; }

    if ($need_watcher) {
        $self->_add_job( \%attributes );
    }
    else {
        $self->_start_daemon( \%attributes );
    }
    return;
}

sub _start_daemon {
    my ( $self, $attributes ) = @_;
    $self->logger->debug('Starting new process');

    my $daemon;
    my $daemon_attributes = {
        name        => $attributes->{progname},
        lsb_sdesc   => 'New generator daemon',
        lsb_desc    => 'New generator daemon - ' . $attributes->{progname},
        pid_file    => '/var/run/' . $attributes->{progname} . '.pid',
        stderr_file => '/var/log/' . $attributes->{progname} . '.log',
        stdout_file => '/var/log/' . $attributes->{progname} . '.log',
        quiet       => 1,
    };

    $attributes->{pidfile} = $daemon_attributes->{pid_file};
    $attributes->{logfile} = $daemon_attributes->{stderr_file};
    if ( $self->config->{debug} && $self->config->{foreground_daemon} ) {
        print {*STDERR} 'Debug mode' . "\n";

        $daemon_attributes->{fork} = 0;
        $attributes->{foreground}  = 1;

        # $attributes->{foreground}     = 1;
        # $attributes->{no_double_fork} = 1;
        # $attributes->{is_daemon}      = 0;
        # $attributes->{fork} = 0;
    }

    # $attributes->{no_double_fork} = 1;
    $self->logger->debug( 'Attributes: ' . encode_json($attributes) );

    try {
        # $daemon = PRaG::DaemonGenerator->new( %{$attributes} );
        $daemon_attributes->{program} = sub {
            my $daemon =
              PRaG::DaemonGenerator->new_with_options( %{$attributes} );
            $daemon->start;
        };
        $daemon = Daemon::Control->new( %{$daemon_attributes} );

        $daemon->run_command('start');
        $daemon->read_pid;
        my $new_pid = $daemon->pid;
        $self->logger->debug( 'Started, got PID: ' . $new_pid );

        # $self->logger->debug( 'Got status: ' . $daemon->status );
        print 'PID: ' . $new_pid . $EOL;
    }
    catch {
        $self->logger->error(qq{Daemon creation error: $EVAL_ERROR});
        print "ERROR: $EVAL_ERROR $EOL";
        return 0;
    };

    $self->cv->recv;

    return;
}

sub _add_job {
    my ( $self, $attributes ) = @_;

    $self->logger->debug('Adding job to the queue');

    if ( !$self->_jobqueue ) {
        $self->logger->error('Job queue is not available. Check Redis');
        print 'ERROR: JOB QUEUE IS NOT AVAILABLE';
        return;
    }

    my $owner = $attributes->{o};
    my $queue = $owner . '_jobs';

    try {
        $self->_jobqueue->add_job(
            {
                queue    => $queue,
                workload => \encode_json($attributes),
                expire   => 10 * 60,
            }
        );
    }
    catch {
        $self->logger->error(qq{Job adding error: $EVAL_ERROR});
        print "ERROR: $EVAL_ERROR $EOL";
        return 0;
    };

    $self->logger->debug( 'Added to queue ' . $queue );

    $self->_start_watcher($owner);
    return;
}

sub _start_watcher {
    my ( $self, $owner ) = @_;

    if ( $self->_is_watcher_running($owner) ) {
        $self->logger->debug( 'Watcher is already running for ' . $owner );
        print 'PID: -1' . $EOL;
    }
    else {
        $self->logger->debug(
            'Watcher is not running for ' . $owner . '. Would start it.' );

        my $watcher;
        try {
            $watcher = PRaG::JobsWatcher->new(
                progname => 'PRaG:watcher:'
                  . shell_quote($owner) . q{-}
                  . Data::GUID->guid_string,
                o          => $owner,
                configfile => $self->configfile,
                queue      => $owner . '_jobs',
            );
        }
        catch {
            print "ERROR: $EVAL_ERROR $EOL";
            $self->logger->error("Watcher creation error: $EVAL_ERROR");
            return 0;
        }

        $watcher->start;
        $self->logger->info( 'Watcher for '
              . $owner
              . ' started with PID: '
              . $watcher->get_pid );
        print 'PID: ' . $watcher->get_pid . $EOL;
    }
    return;
}

sub _continue_process {
    my ( $self, $json ) = @_;

    $self->_start_process( $json, 'PRaG:nocount-', 1 );
    return;
}

sub _is_watcher_running {
    my ( $self, $owner ) = @_;
    my $t = Proc::ProcessTable->new;
    my $regex =
      'PRaG:watcher:' . ( $owner ? shell_quote($owner) : q{} ) . q{.*};
    my @runs = grep { $_->cmndline =~ /$regex/ } @{ $t->table };

    if (wantarray) {
        return @runs;
    }
    elsif ( defined wantarray ) {
        return scalar @runs;
    }
    else { return; }
}

sub post_child_cleanup_hook {
    my $self = shift;
    if ( $self->{'server'}->{'_HUP'} ) {
        $self->logger->debug('Got HUP, hence not sending INT to watchers');
        return 1;
    }
    return $self->_kill_watchers('INT');
}

sub restart_open_hook {
    my $self = shift;
    $self->logger->debug('Reload watchers if any');
    return $self->_kill_watchers('HUP');
}

sub _kill_watchers {
    my ( $self, $sig ) = @_;
    try {
        my $watchers = [ $self->_is_watcher_running() ];
        for my $process ( @{$watchers} ) {
            $self->logger->debug(
                "Sending $sig to watcher with PID " . $process->pid );
            $process->kill($sig);
        }
        return 1;
    }
    catch {
        $self->logger->fatal("Something went wrong: $EVAL_ERROR");
    };
    return;
}

__PACKAGE__->meta->make_immutable;

1;

