package PRaG::Util::Procs;

use strict;
use warnings;
use utf8;

use Carp;
use English qw/-no_match_vars/;
use FindBin;
use IO::Socket         ();
use File::Temp         qw/tempfile/;
use String::ShellQuote qw/shell_quote/;
use Proc::ProcessTable;
use Readonly;
use PerlX::Maybe;

require Exporter;

use base qw(Exporter);

Readonly my $KILL_ATTEMPTS => 5;

our @EXPORT_OK =
  qw/start_new_process prepare_parameters_file stop_process count_processes filtered_processes/;

sub start_new_process {
    my ( $encoded_json, %h ) = @_;

    croak 'No logger'         if not $h{logger};
    croak 'No owner'          if not $h{owner};
    croak 'No max_cli_length' if not defined $h{max_cli_length};
    croak 'No json'           if not $h{json};
    croak 'No port'           if not $h{port};

    # croak 'No host_socket'    if not $h{host_socket};

    $h{die_on_error}        //= 0;
    $h{cmd}                 //= 'START';
    $h{check_running_procs} //= ( $h{cmd} eq 'START' ? 1 : 0 );

    croak 'No max procs per user'
      if ( $h{check_running_procs} and not defined $h{max_per_user} );

    if ( $h{check_running_procs}
        && count_processes( user => $h{owner} ) >= $h{max_per_user} )
    {
        croak q/You've reached maximum of processes per user./
          if $h{die_on_error};
        return;
    }

    $h{logger}->debug('Starting new process');

    my $parameters = {
        o       => $h{owner},
        verbose =>
          ( $h{verbose} or ( $h{logger}->get_level eq 'DEBUG' ? 1 : 0 ) ),
        maybe configfile => $h{configfile},
    };

    if ( length($encoded_json) > $h{max_cli_length} ) {
        $parameters->{jsonfile} =
          prepare_parameters_file( $encoded_json, logger => $h{logger} );
    }
    else {
        $parameters->{jsondata} = $encoded_json;
    }

    $h{logger}->info( '--jsondata=' . shell_quote($encoded_json) );

    # my $sock =
    #   IO::Socket::UNIX->new( Peer => $h{host_socket} );
    my $sock = IO::Socket::INET->new(
        PeerAddr => 'localhost',
        PeerPort => $h{port},
        Proto    => 'tcp'
    );
    if ( !$sock ) {
        $h{logger}->error("Socket error: $ERRNO");
        croak $ERRNO if $h{die_on_error};
        return;
    }

    print {$sock} $h{cmd} . q/ / . $h{json}->encode($parameters) . "\n.\n";
    my $resp = $sock->getline();
    $sock->shutdown(2);

    if ( $resp =~ /^ERROR:\s+/sxm ) {
        $h{logger}->error("Socket error: $resp");
        croak $resp if $h{die_on_error};
        return;
    }

    $h{logger}->debug( 'Socket response: ' . $resp );
    $h{logger}->debug('DHost was informed about new process');

    return $resp;
}

sub prepare_parameters_file {
    my ( $data, %h ) = @_;

    my ( $fh, $file ) =
      tempfile( 'jsondataXXXXX', UNLINK => 0, SUFFIX => '.prag', TMPDIR => 1 );
    $h{logger}->debug("Temp file created: $file");
    binmode $fh, ':encoding(UTF-8)';
    print {$fh} $data;
    close $fh or $h{logger}->error( q/Error closing file: / . $ERRNO );

    return $file;
}

sub stop_process {
    my ( $pid, %h ) = @_;

    croak 'No logger' if not $h{logger};

    $h{skip_check}    //= 0;
    $h{kill_attempts} //= $KILL_ATTEMPTS;

    $h{logger}->debug('Trying to stop the process');

    my $t = Proc::ProcessTable->new;
    my ($proc) = grep { $_->pid == $pid } @{ $t->table };
    return if not $proc;

    if ( !$h{skip_check} ) {
        $h{logger}
          ->debug( "Doing checks of PID $pid, cmd: " . $proc->cmndline );
        if ( index( $proc->cmndline, 'PRaG' ) < 0 ) {
            $h{logger}->error('Not generator process');
            croak 'Not generator process';
        }
    }

    $proc->kill('TERM');
    my $tries = 0;
    while ( kill( 0, $pid ) && $tries < $h{kill_attempts} ) {
        $h{logger}->debug("Waited $tries seconds");
        $tries++;
        sleep 1;
    }

    if ( kill 0, $pid ) {
        $h{logger}->debug(q{Process wasn't stopped, killing it});
        $proc->kill('KILL');
    }
    return;
}

sub count_processes {
    my %h = @_;

    croak 'No user' if not $h{user};

    my $t          = Proc::ProcessTable->new;
    my $regex      = 'PRaG-' . shell_quote( $h{user} );
    my $is_running = grep { $_->{cmndline} =~ /$regex/sxm } @{ $t->table };
    return $is_running;
}

sub filtered_processes(&) {
    my $f = shift;

    my $t = Proc::ProcessTable->new;
    my @r;
    foreach my $p ( @{ $t->table } ) {
        local $_ = $p;
        $f->() or next;
        push @r, $_;
    }
    undef $t;

    return @r;
}

1;
