package PRaG::Proto::AsyncWorker;

use warnings;
use strict;
use utf8;

# use Devel::MAT::Dumper;

use AnyEvent;

# use AnyEvent::Log;

use Carp;
use Data::Dumper;
use Class::Load ':all';
use Ref::Util qw/is_ref is_hashref is_arrayref is_blessed_ref/;

use PRaG::RadiusServer;
use PRaG::TacacsServer;
use PRaG::Util::ClearObject;

use logger;

# $AnyEvent::Log::LOG->log_cb(
#     sub {
#         my ( $timestamp, $orig_ctx, $level, $message ) = @{ +shift };

#         if ( defined &AnyEvent::Fork::RPC::event ) {
#             AnyEvent::Fork::RPC::event( ae_log => $level, $message );
#         }
#         else {
#             warn "[$$ before init] $message\n";
#         }
#     }
# );

sub init {
    my $engine_class = shift;

    if ( !is_class_loaded($engine_class) ) { load_class($engine_class); }
    return;
}

sub run {
    my ( $done, %args ) = @_;

    my $inner_logger = _create_logger(%args);
    $args{debug}
      and $inner_logger->debug(
        'Got the server to work with: ' . Dumper( $args{server} ) );

    my $g = $args{engine}->new(
        owner      => $args{owner},
        parameters => $args{parameters},
        server     =>
          _create_server( %{ $args{server} }, ( protocol => $args{protocol} ) ),
        logger => $inner_logger,
        vars   => $args{snap},
        debug  => $args{debug},
        status => exists $args{snap}->{START_STATE} ? $args{snap}->{START_STATE}
        : 'UNKNOWN',
        $args{protocol} eq 'tacacs' ? ( tacacs => $args{tacacs}, )
        : (
            dicts  => $args{dicts},
            radius => $args{radius},
        )
    );

    if ( !$g || $g->error ) {
        $inner_logger->error( $g->error
              // q{Couldn't create engine, unknown error} );
        return;
    }

    if ( exists $args{snap}->{LOADED} and $args{snap}->{LOADED} ) {
        $g->used_from_vars;
    }

    # Do the stuff
    $g->do;
    $g->done;

    my $r = _create_result( $g, %args );
    _clear_result($r);
    undef $g;
    undef $inner_logger;

    # Devel::MAT::Dumper::dump(
    #     '/tmp/pmat/worker_' . $$ . '_' . $args{counter} . '.pmat' );

    undef %args;
    $done->($r);
    undef $r;
    return;
}

sub _create_result {
    my ( $g, %args ) = @_;

    my $result =
      $args{snap}->{LOADED}
      ? {
        session_data => $g->get_session_data,
        status       => $g->status,
      }
      : {
        session_data  => $g->get_session_data,
        status        => $g->status,
        is_successful => $g->successful,
        $args{protocol} ne 'tacacs'
        ? (
            is_message_auth => $g->message_auth,
            dacl            => $g->dacl,
          )
        : (),
      };
    if ( $args{protocol} ne 'tacacs' ) {
        $result->{should_continue} = $g->continue_on_save;
    }
    $result->{statistics}  = [ $g->statistics ];
    $result->{snapshot}    = $g->vars;
    $result->{flow_file}   = $args{flow_file};
    $result->{logger_file} = $args{logger_file};
    $g->dump_flow( $args{flow_file}, $args{counter} );

    return $result;
}

sub _create_logger {
    my %h = @_;

    my $l = logger->new_file_logger(
        'logger-name' => $h{logger_name},
        owner         => $h{owner},
        chunk         => $h{logger_chunk},
        filename      => $h{logger_file},
        debug         => $h{debug},
        syslog        => $h{syslog},
    );

    return $l;
}

sub _create_server {
    my %args = @_;
    my $p    = $args{protocol};
    delete $args{protocol};

    if   ( $p eq 'tacacs' ) { return PRaG::TacacsServer->new(%args); }
    else                    { return PRaG::RadiusServer->new(%args); }
}

sub _clear_result {
    remove_blessed( $_[0] );
    return;
}

1;
