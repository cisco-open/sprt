package PRaG::Role::AsyncEngine;

use strict;
use utf8;

use Moose::Role;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use AnyEvent;
use AnyEvent::Fork;
use AnyEvent::Fork::Pool;

use Carp;
use Data::Dumper;
use English qw/-no_match_vars/;
use Path::Tiny;
use File::Basename;

use PRaG::Vars qw/vars_substitute/;
use PRaG::Proto::AsyncWorker;
use PRaG::Util::ClearObject;

has 'async_queue_length' => (
    traits  => ['Counter'],
    is      => 'ro',
    isa     => 'Num',
    default => 0,
    handles => {
        inc_async_q  => 'inc',
        dec_async_q  => 'dec',
        drop_async_q => 'reset',
    },
);

has 'max_async_queue_length' => (
    is      => 'ro',
    lazy    => 1,
    default => sub {
        my $self = shift;
        return $self->config->{processes}->{max_threads} * 2;
    },
);

has '_common_async_args' => (
    is      => 'ro',
    lazy    => 1,
    default => sub {
        my $self = shift;
        return {
            (
                engine     => $self->engine,
                debug      => $self->debug,
                owner      => $self->owner,
                parameters => $self->parameters,
                protocol   => $self->protocol,
                syslog     => $self->config->{syslog},
            ),
            $self->protocol eq 'tacacs'
            ? ( tacacs => $self->tacacs )
            : (
                dicts  => $self->dicts,
                radius => $self->radius,
            ),
        };
    },
);

has '_no_jobs' => (
    is      => 'rw',
    isa     => 'Bool',
    default => 0,
);

has '_pool' => (
    is      => 'rw',
    clearer => 'destroy_pool',
);

sub _async_loop {
    my ($self) = @_;

    $self->debug and $self->logger->debug('Starting ASYNC loop');

    $self->drop_async_q;
    $self->_no_jobs(0);
    $self->_create_flow_dir;
    my $done = AE::cv;
    $self->_create_pool($done);

    $self->_add_worker_job;

    $done->recv;
    undef $done;

    return 1;
}

sub _add_worker_job {
    my ($self) = @_;

    return if $self->async_queue_length >= $self->max_async_queue_length;

    my $snap = $self->_has_job_to_do;
    $self->debug
      and $self->logger->debug( 'Got snapshot: ' . Dumper($snap) );
    if ( not $snap ) {
        $self->_no_jobs(1);
        return;
    }

    $self->_wait_latency;
    $self->inc_async_q;

    $self->debug
      and
      $self->logger->debug( 'Adding child process job #' . $self->{counter} );

    $self->_pool->(
        %{ $self->_common_async_args },
        (
            counter   => $self->{counter},
            flow_file => $self->_flow_file,
            server    => $self->_session_server($snap)->as_hashref,
            snap      => remove_blessed($snap),
        ),
        %{ $self->_get_logger( idx => $self->{counter}, no_object => 1 ) },
        sub {
            $self->_async_result(shift);

            $self->dec_async_q;
            if ( $self->_no_jobs ) {
                if ( not $self->async_queue_length and $self->_pool ) {
                    $self->destroy_pool;
                }
                return;
            }

            $self->_add_worker_job;
        }
    );

    $self->_add_worker_job;

    return;
}

sub _flow_file {
    my ($self) = @_;
    return $self->{flow_dir}
      . vars_substitute(
        $self->config->{async}->{flow_file},
        {
            owner    => $self->owner,
            job_name => $self->parameters->{job_name},
            idx      => $self->{counter},
            pid      => $PID,
        },
        undef, 'BRACES'
      );
}

sub _create_flow_dir {
    my ($self) = @_;
    $self->{flow_dir} = vars_substitute(
        $self->config->{async}->{flow_directory},
        {
            owner    => $self->owner,
            job_name => $self->parameters->{job_name}
        },
        undef, 'BRACES'
    );
    path( $self->{flow_dir} )->mkpath;
    return;
}

sub _create_pool {
    my ( $self, $done ) = @_;
    $self->_pool(
        AnyEvent::Fork->new->require(
            'PRaG::RadiusServer', 'PRaG::TacacsServer',
            'CBOR::XS',           'PRaG::Proto::AsyncWorker',
            'Class::Load',        $self->engine
        )->send_arg( $self->engine )->AnyEvent::Fork::Pool::run(
            'PRaG::Proto::AsyncWorker::run',    # the worker function

            # pool management
            max => $self->config->{processes}->{max_threads}
            ,    # absolute maximum # of processes
            idle  => 0,   # minimum # of idle processes
            load  => 1,   # queue at most this number of jobs per process
            start => 0.1, # wait this many seconds before starting a new process
            stop  => 2, # wait this many seconds before stopping an idle process
            on_destroy => sub {
                $self->debug and $self->logger->debug('Pool destroyed');
                $done->send;
            },          # called when object is destroyed

            # parameters passed to AnyEvent::Fork::RPC
            async    => 1,
            on_error => sub {
                my ( $package, $filename, $line ) = caller;

                $filename = fileparse($filename);
                my $message = qq/$package:${filename}:${line}: $_[0]/;
                $self->logger->error($message);

                # croak $_[0];
            },
            on_event => sub {
                if ( $_[0] eq 'ae_log' ) {
                    my ( undef, $level, $message ) = @_;
                    $self->logger->debug( 'From child: ' . $message );
                }
                else {
                    # other event types
                    $self->logger->debug( 'Some event: ' . Dumper( \@_ ) );
                }
            },
            init       => 'PRaG::Proto::AsyncWorker::init',
            serialiser => $AnyEvent::Fork::RPC::CBOR_XS_SERIALISER,
        )
    );

    return;
}

sub _async_result {
    my ( $self, $result ) = @_;

    $self->{done}++;
    $self->_update_percentage( done => $self->{done} );

    if ( exists $result->{is_successful}
        && defined $result->{is_successful} )
    {
        if ( $result->{is_successful} ) {
            $self->inc_succeeded;
        }
        else { $self->inc_failed; }
    }

    my %session = (
        session_data => $result->{session_data},
        status       => $result->{status},
        snapshot     => $result->{snapshot},
        statistics   => $result->{statistics},
    );

    my $id =
      ( exists $result->{snapshot} && $result->{snapshot}->{LOADED} )
      ? $self->_update_session(
        %session,
        $self->protocol ne 'tacacs'
        ? ( should_continue => $result->{should_continue} )
        : (),
      )
      : $self->_save_session(
        %session,
        ( is_successful => $result->{is_successful} ),
        $self->protocol ne 'tacacs'
        ? (
            is_message_auth => $result->{is_message_auth},
            dacl            => $result->{dacl},
            should_continue => $result->{should_continue},
          )
        : (),
      );

    $self->debug
      and $self->logger->debug(
        "Loading flow for session $id from " . $result->{flow_file} );
    my $content =
      $self->json->decode( path( $result->{flow_file} )->slurp_utf8 );
    unlink $result->{flow_file};

    if ($id) {
        $self->_add_to_flow( $content->{flow}, $id,
            $self->_session_server( $result->{snapshot} ) );
    }

    if ( $result->{logger_file} ) {
        $self->logger->info( 'file:' . $result->{logger_file} );
    }

    return;
}

1;
