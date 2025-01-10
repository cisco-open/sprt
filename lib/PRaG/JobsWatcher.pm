package PRaG::JobsWatcher;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

with 'MooseX::Daemonize';

use Carp;
use Config::Any;
use Data::Dumper;
use Data::GUID;
use English              qw( -no_match_vars );
use JSON::MaybeXS        qw/encode_json decode_json/;
use Math::Random::Secure qw/irand/;
use Parallel::ForkManager;
use Redis;
use Redis::JobQueue;
use String::ShellQuote qw/shell_quote/;
use Time::HiRes        qw/gettimeofday/;
use Syntax::Keyword::Try;

use logger;
use PRaG::DaemonGenerator;
use PRaG::Util::ENVConfig qw/apply_env_cfg/;

# Parameters
has 'o'          => ( is => 'rw', isa => 'Str',  required => 1 );
has 'configfile' => ( is => 'rw', isa => 'Str',  required => 1 );
has 'queue'      => ( is => 'rw', isa => 'Str',  required => 1 );
has 'verbose'    => ( is => 'rw', isa => 'Bool', default  => 0 );

# Loaded from config file
has 'config' => ( is => 'rw', isa => 'HashRef' );
has 'logger' => ( is => 'ro', isa => 'logger', writer => '_set_logger' );

after start => sub {
    my $self = shift;
    return if not $self->is_daemon;

    srand irand();

    try {
        $self->_update_proc_name;
        $self->_init_config;
        $self->_init_logger;
        $self->do;
    }
    catch {
        $self->logger->fatal( 'Something went wrong: ' . $EVAL_ERROR );
    };

    $self->logger->debug('Removing PID');
    $self->remove_pid;
    $self->logger->info('Quiting watcher');
    $self->OK;
    $self->shutdown;
};

sub do {
    my $self = shift;

    $self->logger->info(
        'My PID is: ' . $self->get_pid . '. My queue is ' . $self->queue );
    $self->logger->debug('Starting on queue.');
    my $pm = $self->_create_pm();

    my $data = $self->_next_job;
    while ($data) {
        my $jobs_done = 0;
        while ( $data || ( $data = $self->_next_job ) ) {
            $pm->start_child(
                sub {
                    my $daemon;
                    $daemon = PRaG::DaemonGenerator->new( %{$data} );
                    $daemon->start;
                    $pm->finish;
                }
            );
            $data = undef;
            $jobs_done++;
        }

        $pm->wait_all_children;
        $self->logger->info("Did $jobs_done from the queue, waiting for new");
        $data = $self->_next_job(1);
    }

    $self->logger->debug('No more jobs, quiting');

    return 1;
}

sub _update_proc_name {
    my $self = shift;

    if ( !$self->foreground ) { $PROGRAM_NAME = $self->progname; }

    return $self;
}

sub _next_job {
    my ( $self, $blocking ) = @_;

    $blocking //= 0;
    my $redis;
    try {
        $redis = Redis->new( server => $self->config->{redis}->{server} );
    }
    catch {
        $self->logger->error($EVAL_ERROR);
        return;
    };

    my $jq = Redis::JobQueue->new(
        timeout => $self->config->{generator}->{watcher_lifetime},
        redis   => $redis
    );

    my $len = $jq->queue_length( $self->queue );
    $self->logger->debug( 'Queue length: ' . $len );
    my $job;
    eval {
        $job =
          $jq->get_next_job( queue => $self->queue, blocking => $blocking );
    };

    if ( !$job ) {
        if ($EVAL_ERROR) {
            $self->logger->debug("No new jobs after timeout: $EVAL_ERROR");
        }
        return;
    }
    else {
        $self->logger->debug( 'Got job ' . $job->{id} );
        my $attributes = decode_json( ${ $job->workload } );
        $attributes->{foreground} = 1;
        $self->logger->debug( 'Got workload: ' . Dumper($attributes) );

        $job->status('completed');
        $jq->update_job($job);
        $jq->delete_job($job);
        $redis->quit;

        return $attributes;
    }
}

# Load config from config file
sub _init_config {
    my $self = shift;

    croak q{No config file specified, bye!}
      if ( !-e $self->configfile || -z $self->configfile );
    my $cfg = Config::Any->load_files(
        { files => [ $self->configfile ], use_ext => 1 } );

    $self->config( $cfg->[0]->{ $self->configfile } );
    $self->config->{debug} //= 0;
    $self->config->{debug} ||= $self->verbose;

    apply_env_cfg( $self->config );

    return $self;
}

# Create logger
sub _init_logger {
    my $self = shift;

    $self->_set_logger(
        logger->new(
            'log-parameters' => \scalar( $self->config->{log4perl} ),
            owner            => $self->o . '__watcher',
            chunk            => Data::GUID->guid_string,
            debug            => $self->config->{debug},
            syslog           => $self->config->{syslog},
        )
    );

    $self->logger->debug(q{Verbose is enabled.});
    return $self;
}

# Create ParallelManager
sub _create_pm {
    my $self = shift;

    $self->logger->debug( 'Creating ForkManager, max threads: '
          . $self->config->{processes}->{max_threads} );
    my $pm =
      Parallel::ForkManager->new( $self->config->{processes}->{max_threads} );

    $pm->run_on_finish(
        sub {
            my ( $pid, $exit_code, $ident, $exit_signal ) = @_;
            $self->logger->debug(
                'PID ' . $pid . ' finished with code ' . $exit_code );
        }
    );

    return $pm;
}

__PACKAGE__->meta->make_immutable;

1;
