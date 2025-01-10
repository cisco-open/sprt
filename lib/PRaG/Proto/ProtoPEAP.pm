package PRaG::Proto::ProtoPEAP;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Coro;
use AnyEvent;
use EV;

use AnyEvent::Socket;
use AnyEvent::Handle;
use AnyEvent::Strict;

use Carp;
use Data::Dumper;
use Data::HexDump;
use English qw/-no_match_vars/;
use Errno ':POSIX';
use File::Basename;
use File::Temp;
use FileHandle;
use IO::Interface::Simple;
use Path::Tiny;
use POSIX ();
use Readonly;
use Ref::Util qw/is_ref is_hashref is_arrayref/;
use Syntax::Keyword::Try;
use Time::HiRes qw/gettimeofday/;

use PRaG::Proto::ProtoMSCHAP;

use PRaG::Vars              qw/vars_substitute/;
use PRaG::Util::Array       qw/is_empty/;
use PRaG::Util::Credentials qw/parse_credentials/;
use PRaG::Util::TLS         qw/
  :const
  parse_tls_options
  parse_validation
  /;
use PRaG::Util::ByPath;
use PRaG::Util::TLSClientThread qw/client_thread :const/;

extends 'PRaG::Proto::ProtoRadius';    # We are a protocol handler
with 'PRaG::Proto::RoleEAP';           # And we are EAP protocol

Readonly my $PEAP_EAP_TYPE => 25;
Readonly my $PEAP_VERSION  => 0x1;

Readonly my $HVER_BIT => 0x02;
Readonly my $LVER_BIT => 0x01;

Readonly my $INNER_METHOD_CLASS => { mschapv2 => 'PRaG::Proto::ProtoMSCHAP', };

has 'peap_version' => ( is => 'rw', default => $PEAP_VERSION );

# Accepted client handler
has '_accepted_client' => ( is => 'rw', default => undef );

has '_proxy_guard' => (
    is        => 'rw',
    isa       => 'Maybe[Object]',
    default   => undef,
    clearer   => 'clear_proxy_guard',
    predicate => 'has_proxy_guard',
);

# Client thread
has '_client_thread' => ( is => 'rw', isa => 'Maybe[Coro]', default => undef );

# Name of socket
has '_socket_name' => (
    is      => 'ro',
    lazy    => 1,
    default => sub {
        my $self = shift;
        return $self->_socket_dir
          ? $self->_socket_dir->dirname . '/prag_socket'
          : undef;
    },
);

has '_cb' => (
    is      => 'rw',
    default => undef,
    clearer => '_clear_cb',
);

# Socket directory object
has '_socket_dir' => ( is => 'rw', isa => 'Maybe[Object]' );

# EAP-TLS fragments to send
has '_tls_fragments' =>
  ( is => 'rw', isa => 'Maybe[ArrayRef]', default => undef );

# Full length of EAP-TLS message
has '_tls_length' => ( is => 'rw', isa => 'Int', default => 0 );

# Flag. True when TLS established
has '_tls_done' => ( is => 'rw', isa => 'Bool', default => 0 );

# Received RAW data
has '_received_data' => (
    is      => 'rw',
    isa     => 'Str',
    traits  => ['String'],
    default => q{},
    handles => {
        _add_received_data   => 'append',
        _clear_received_data => 'clear',
    },
);

# Initial Access-Request attributes
has '_initial_request' =>
  ( is => 'rw', isa => 'Maybe[ArrayRef]', default => undef );

# Semaphore
has 'semaphore' => ( is => 'rw', default => sub { Coro::Signal->new(); } );

sub BUILD {
    my $self = shift;
    if ( $self->debug ) {
        require AnyEvent::Debug;
        require Coro::Debug;

        AnyEvent::Debug::wrap(1);
        Coro::Debug::stderr_loglevel(9);
    }

    $self->eap_type($PEAP_EAP_TYPE);
    $self->_set_method('PEAP');

    return $self;
}

sub do {
    my $self = shift;

    $self->debug and $self->logger->debug('Starting PEAP');
    $self->_check_framed_mtu;
    $self->_cb(Coro::rouse_cb);
    $self->_send_request;
    Coro::rouse_wait $self->_cb;
    $self->_clear_cb;
    return;
}

sub _send_request {
    my $self = shift;

    return if not $self->_create_ssl;    # exit if couldn't create SSL handlers

    # We can start the authentication here...
    # First: get Identity
    return if not $self->_define_identity;

   # Now, compose EAP Identity message: code - 2 (Response), type - 1 (Identity)
    my $eap = $self->compose_eap(
        code      => 2,
        type      => 1,
        type_data => $self->vars->{OUTER_USERNAME}
    );
    my $ra = [];

    # General attributes
    $self->_add_general( $ra, { include_mtu => 1 } );

    # PEAP specific
    $self->_parse_and_add(
        [
            { name => 'Service-Type', value => 'Framed-User' },
            { name => 'User-Name',    value => '$OUTER_USERNAME$' },
        ],
        $ra
    );

    # User provided
    $self->_parse_and_add( $self->radius->{request}, $ra );

    # Save initial request
    my @initial = @{$ra};
    $self->_initial_request( \@initial );

    # Add EAP message
    $self->_parse_and_add( [ { name => 'EAP-Message', value => $eap } ], $ra );

    # Start authentication
    $self->_set_status( $self->_S_STARTED );

    # Set events handlers
    $self->_client->on_challenge( $self->can('_challenge') );

    # Start session
    $self->_client->request( to_send => $ra );
    return;
}

sub _challenge {

    # We've got RADIUS challenge
    my ( $self, %h ) = @_;

    # $h is - {response => ARRAYREF, type => 'ACCESS_CHALLENGE'}

    $self->_set_status( $self->_S_ACCESS_CHALLENGE );

    # Check if State attribute present and save it
    $self->_collect_state( $h{response} );
    my ( $code, $id, $len, $type, $type_data ) =
      $self->collect_and_parse_eap( $h{response} );

    if ( $type != $PEAP_EAP_TYPE ) {    # Propose PEAP if not PEAP message
        $self->logger->warn(
            "Unexpected EAP type received $type, expected 25 (PEAP)");
        $self->propose_eap_method($PEAP_EAP_TYPE);
        return;
    }

    my ( $length_bit, $more_bit, $start_bit, $ssl );

    ( $length_bit, $more_bit, $start_bit, $len, $ssl ) =
      $self->_parse_peap($type_data);

    if ($length_bit) {
        $self->debug
          and $self->logger->debug(
            "Advertised length: $len, real length: " . length $ssl );
    }
    $len //= length $ssl;

    return $self->_start_peap                       if $start_bit;
    return $self->_more_tls_fragments( $ssl, $len ) if $more_bit;
    return $self->_next_tls_fragment if not is_empty( $self->_tls_fragments );
    return $self->_continue_peap( $ssl, $len );
}

around [qw/_succeed _rejected/] => sub {

    # Clean after self
    my $orig = shift;
    my $self = shift;

    $self->_clear_self;

    $self->$orig(@_);
};

before 'done' => sub {
    my $self = shift;

    $self->eap_event_catcher(undef);
    $self->clear_eap_catcher;
    $self->_proxy_guard(undef);
    $self->clear_proxy_guard;
    return;
};

after '_got_error' => sub {
    my $self = shift;
    $self->_clear_self;
};

sub _clear_self {
    my $self = shift;

    $self->debug and $self->logger->debug('Cleaning');
    if (   $self->_client_thread
        && $self->_client_thread->is_running
        && !eval { $self->_client_thread->safe_cancel } )
    {
        $self->logger->warn("unable to cancel thread: $EVAL_ERROR");
    }

    $self->_client_thread(undef);
    unlink $self->_socket_name;
    unlink $self->_socket_dir;

    $self->_cb->();
    return 1;
}

sub _start_peap {

    # Got start TLS, need to send Client Hello
    my $self = shift;

    $self->debug and $self->logger->debug('Starting TLS');

    $self->_proxy_guard(
        tcp_server 'unix/',
        $self->_socket_name,
        sub {
            my ( $fh, $host, $port ) = @_;
            $self->_accepted_client(
                AnyEvent::Handle->new(
                    fh       => $fh,
                    no_delay => 1,
                )
            );
            $self->debug
              and $self->logger->debug( 'Accepted on: ' . $host . $port );

            # Continue from here
            $self->_accepted_continue;
        }
    );

    $self->debug and $self->logger->debug('Creating client thread');
    $self->_client_thread(
        async {
            client_thread(@_)
        }
        socket => $self->_socket_name,
        vars   => $self->vars,
        logger => $self->logger,
        inner  => $self->vars->{INNER_CLASS},
        debug  => $self->debug,

        semaphore => $self->semaphore,

        # out_channel => $self->out_channel,
    );

    $self->debug and $self->logger->debug('Client thread created');

    return 1;
}

sub _accepted_continue {
    my $self = shift;

    $self->_recv_from_client(
        unblock_sub {
            my $buff = shift;
            $self->_clear_received_data;
            $self->_prepare_peap_response($buff);
        }
    );
    return 1;
}

sub _more_tls_fragments {

    # Got response with "More Fragments" bit set, need to request them
    my ( $self, $ssl, $len ) = @_;

    $self->debug
      and $self->logger->debug(
        'Got more TLS fragments, storing and requesting next');
    $self->_add_received_data($ssl);    # Store what we received
    $self->_prepare_peap_response();    # Send empty EAP-TLS response

    return 1;
}

sub _continue_peap {

    # Got TLS response, no bits set,
    # need to parse all received TLS and respond
    my ( $self, $ssl, $len ) = @_;

    $self->debug and $self->logger->debug('Continue PEAP');
    $self->_add_received_data($ssl);    # Store what we received

    if ( $self->_client_thread->is_zombie ) {
        $self->logger->error('Client thread died, exiting');
        $self->logger->error( $self->_client_thread->join );
        return;
    }

    $self->debug
      and $self->logger->debug( 'Passing TLS data to client SSL: ' . "\n"
          . HexDump( $self->_received_data ) );

    $self->_accepted_client->push_write( $self->_received_data );

    if ( $self->_tls_done and $self->semaphore->awaited ) {
        $self->logger->debug('Resuming thread');
        $self->semaphore->send;

        # $self->_client_thread->resume;
    }

    my ( $c_type, undef, undef, $v ) = unpack 'C n n a*', $self->_received_data;
    if ( $c_type == $ALERT_CONTENT_TYPE ) {

        # server didn't like something
        $self->_client->on_challenge(undef);
        $self->_ack_alert($v);
        return;
    }

    # At the end we clear all
    $self->_clear_received_data;

    $self->_recv_from_client(
        unblock_sub {
            my $buff = shift;
            $self->debug
              and $self->logger->debug(
                'Received ' . ( length($buff) || 0 ) . ' bytes' );

            if ( $self->semaphore->awaited ) {
                $self->_tls_done(1);
                $self->_ack_ok;
                return;
            }

            if ( $self->_client_thread->is_zombie ) {
                my $res = $self->_client_thread->join;
                $self->_client->on_challenge(undef);
                if ( !is_hashref($res) && $res eq 'OK' ) {
                    $self->_ack_ok;
                }
                else {
                    $self->logger->error( $res->{message} );

                    # Save error as "packet"
                    $self->_new_packet(
                        type   => $self->PKT_RCVD,
                        packet => [
                            {
                                'value' => $res->{message},
                                'name'  => 'OpenSSL Error'
                            }
                        ],
                        code => 'EOPENSSL',
                        time => scalar gettimeofday()
                    );
                    if (   $self->vars->{SERVER_VALIDATE}->{validate}
                        && $self->vars->{SERVER_VALIDATE}->{action} eq
                        'inform' )
                    {
                        # Inform only if action 'inform'
                        $self->_inform_ssl_failure($res);
                    }
                    else {
                        $self->_clear_self;
                        $self->_set_status( $self->_S_REJECTED );
                    }
                }
            }
            else {
                $self->_prepare_peap_response($buff);
            }
        }
    );

    return 1;
}

sub _ack_ok {
    my ($self) = @_;

    $self->debug
      and
      $self->logger->debug('Seems to be fine, send empty response as an ACK');
    $self->_prepare_peap_response();
    return;
}

sub _ack_alert {
    my ( $self, $v ) = @_;
    $self->debug
      and $self->logger->debug(q{Server didn't like something, ack that});
    my ( $a_level, $reason ) = unpack 'CC', $v;
    $self->_new_packet(
        type   => $self->PKT_RCVD,
        packet => [
            {
                'value' => $self->_ssl_reason_descr($reason),
                'name'  => 'OpenSSL Error'
            }
        ],
        code => 'EOPENSSL',
        time => scalar gettimeofday()
    );
    $self->_prepare_peap_response();
    return;
}

sub _inform_ssl_failure {
    my ( $self, $ssl_result ) = @_;

    $self->debug and $self->logger->debug('Informing server about failure');
    $self->_prepare_peap_response( $ssl_result->{buf} );
    return;
}

sub _recv_from_client {
    my ( $self, $cb ) = @_;

    return if $self->_client_thread->is_zombie;
    return if not $self->_accepted_client;

    my $buff = q{};
    $self->debug and $self->logger->debug('Reading from client');

    my ( $sem_watcher, $sem_sub );
    my $reader;

    $sem_sub = sub {
        if ( not $self->semaphore->awaited ) {
            undef $sem_watcher;
            $sem_watcher = AnyEvent->timer( after => 0, cb => $sem_sub );
        }
        else {
            $self->logger->debug('Signal awaited');
            $self->_accepted_client->on_error(undef);
            $self->_accepted_client->on_read(undef);
            undef $sem_sub;
            undef $sem_watcher;
            undef $reader;

            &{$cb}($buff);
            undef $cb;
        }
    };
    $sem_watcher ||= AnyEvent->timer( after => 0, cb => $sem_sub );

    $reader = sub {
        my $record_layer = $_[1];
        my ( undef, undef, $length ) = unpack 'C n n', $record_layer;
        $self->_accepted_client->push_read(
            chunk => $length,
            sub {
                $buff .= $record_layer . $_[1];
                if ( length $_[0]->{rbuf} ) {
                    $self->_accepted_client->push_read(
                        chunk => 5,
                        $reader
                    );
                }
                else {
                    $self->_accepted_client->on_error(undef);
                    $self->_accepted_client->on_read(undef);
                    undef $reader;
                    undef $sem_watcher;
                    undef $sem_sub;

                    &{$cb}($buff);
                    undef $cb;
                }
            }
        );
    };

    $self->_accepted_client->on_read(
        sub {
            shift->unshift_read(
                chunk => 5,
                $reader
            );
        }
    );

    $self->_accepted_client->on_error(
        sub {
            my ( $hdl, $fatal, $msg ) = @_;
            if ( $ERRNO != EPIPE ) { $self->logger->error($msg); }
            $hdl->destroy;
            $self->_accepted_client->on_error(undef);
            $self->_accepted_client->on_read(undef);
            undef $reader;
            undef $sem_watcher;
            undef $sem_sub;

            &{$cb}(q{});
            undef $cb;
        }
    );

    $self->_accepted_client->on_eof(
        sub {
            my ($hdl) = @_;
            $hdl->destroy;
            $self->_accepted_client->on_error(undef);
            $self->_accepted_client->on_read(undef);
            undef $reader;
            undef $sem_watcher;
            undef $sem_sub;

            &{$cb}(q{});
            undef $cb;
        }
    );

    return 1;
}

sub _prepare_peap_response {
    my ( $self, $data ) = @_;
    $data //= q{};    # 0 length string by default

    $self->_tls_length(0);

    # Get current length
    my $l = $self->_client->calc_length( $self->_initial_request );
    my $peap_data;

    $self->debug
      and $self->logger->debug( 'About to prepare EAP-Message, length: '
          . length($data)
          . ' Framed-MTU: '
          . $self->parameters->{'framed-mtu'} );

    if ( $self->parameters->{'framed-mtu'} < $l + length($data) + 8 )
    {    # need to brake in TLS fragments...
        $self->_tls_length( length $data );
        my $max_payload = $self->parameters->{'framed-mtu'} - $l;
        $max_payload -= int( 8 * int( $max_payload / 255 ) );
        $self->debug
          and $self->logger->debug(
            "Max payload length: $max_payload, we have: " . length $data );

        # Split in groups of $max_payload size
        my @groups =
          unpack "a$max_payload" x ( ( length($data) / $max_payload ) ) . 'a*',
          $data;
        $peap_data = $self->_pack_peap(
            length_included => 1,              # should be only in first packet
            more_fragments  => 1,
            start           => 0,
            data            => shift @groups
        );

        # Save what left
        $self->_tls_fragments( \@groups );
    }
    else {
        $peap_data = $self->_pack_peap(
            length_included => length($data) && !$self->_tls_done ? 1 : 0,
            more_fragments  => 0,
            start           => 0,
            data            => $data
        );
    }

    return $self->_send_peap_response($peap_data);
}

sub _next_tls_fragment {
    my $self = shift;

    $self->debug and $self->logger->debug('Sending next TLS fragments');

    my $data     = shift @{ $self->_tls_fragments };
    my $tls_data = $self->_pack_peap(
        length_included => 0,
        more_fragments  => is_empty( $self->_tls_fragments ) ? 0 : 1,
        start           => 0,
        data            => $data
    );

    return $self->_send_peap_response($tls_data);
}

sub _send_peap_response {
    my ( $self, $peap_data ) = @_;

    my $eap_message = $self->compose_eap(
        code      => 2,
        type      => $PEAP_EAP_TYPE,
        type_data => $peap_data
    );

    my @new_request;
    push @new_request, @{ $self->_initial_request() };
    push @new_request, { Name => 'EAP-Message', Value => $eap_message };
    if ( $self->session_state ) {
        $self->debug
          and $self->logger->debug('Got State, pushing and clearing');
        push @new_request, { Name => 'State', Value => $self->session_state };
        $self->_set_session_state(q{});
    }

    $self->debug
      and $self->logger->debug(
            'Attributes for PEAP response prepared, payload length: '
          . length($eap_message)
          . ", sending. Dump:\n"
          . HexDump($eap_message) );
    $self->_client->request( to_send => \@new_request );
    return 1;
}

sub _parse_peap {

    # Parse PEAP flags, length (if present) and SSL/TLS data
    my ( $self, $data ) = @_;

    my ( $len, $lbit, $mbit, $sbit, $hver, $lver, $bits );

    ( $bits, $data ) = unpack 'C a*', $data;
    $lbit = $bits & $LENGTH_BIT;
    $mbit = $bits & $MORE_BIT;
    $sbit = $bits & $START_BIT;
    $hver = $bits & $HVER_BIT;
    $lver = $bits & $LVER_BIT;

    if ($lbit) { ( $len, $data ) = unpack 'N a*', $data; }

    return ( $lbit, $mbit, $sbit, $len, $data );
}

sub _pack_peap {

    # Pack PEAP flags, version, length and data
    my ( $self, %h ) = @_;

    # %h {
    # 	length_included
    # 	more_fragments
    # 	start
    #	data
    # }

    my $flags =
      ( $h{length_included} ? $LENGTH_BIT : $NO_BIT ) |
      ( $h{more_fragments}  ? $MORE_BIT   : $NO_BIT ) |
      ( $h{start}           ? $START_BIT  : $NO_BIT ) | $self->peap_version;

    if ( $h{length_included} ) {
        my $len = $self->_tls_length || length $h{data};
        return pack 'C N a*', $flags, $len, $h{data};
    }
    else {
        return pack 'C a*', $flags, $h{data};
    }
}

sub _create_ssl {
    my $self = shift;
    $self->debug
      and $self->logger->debug('Creating SSL client and proxy-server');

    $self->_socket_dir( File::Temp->newdir() );
    $self->debug
      and $self->logger->debug(
        'Using ' . $self->_socket_name . ' for connections' );

    return 1;
}

sub _define_identity {

    # Pupolate session_user attribute with the correct information
    my $self = shift;

    $self->_set_session_user( $self->vars->{USERNAME} );
    return 1;
}

sub _check_framed_mtu {
    my $self = shift;
    return 1 if $self->parameters->{'framed-mtu'};
    $self->parameters->{'framed-mtu'} = $self->_find_by_name('Framed-MTU');
    return 1 if $self->parameters->{'framed-mtu'};
    $self->debug
      and
      $self->logger->debug('Framed MTU not set, grabbing from first interface');
    my @ifs = IO::Interface::Simple->interfaces;
    $self->parameters->{'framed-mtu'} = ( $ifs[0]->mtu - 200 );
    $self->debug
      and $self->logger->debug(
        'Got Framed MTU:' . $self->parameters->{'framed-mtu'} );
    return 1;
}

sub _ssl_reason_descr {
    my ( $self, $reason ) = @_;
    return $SSL_REASONS->{$reason} // "Unknown reason - $reason";
}

# Functions to call before construction
sub determine_vars {
    my ( $class, $vars, $specific, $e ) = @_;

    return if not $vars;

    my $inner = get_by_path( $specific, 'inner-method', 'none' );
    if ( my $m = $INNER_METHOD_CLASS->{$inner} ) {
        $m->determine_vars( $vars, $specific, $e );

        $vars->add(
            type       => 'String',
            name       => 'INNER_CLASS',
            parameters => { variant => 'static', value => $m }
        );
    }
    else {
        croak 'Unknown inner method: ' . $inner;
    }

    parse_tls_options( $vars, $specific, $e );
    parse_validation( $vars, $specific, $e );
    parse_outer_identity( $vars, $specific, $e );
    return 1;
}

sub parse_outer_identity {
    my ( $vars, $specific, $e ) = @_;

    my $how = get_by_path( $specific, 'outer-identity.variant', 'same' );
    if ( $how eq 'specified' ) {
        $vars->add(
            type       => 'String',
            name       => 'OUTER_USERNAME',
            parameters => {
                variant => 'static',
                value   => get_by_path(
                    $specific, 'outer-identity.identity', 'Anonymous'
                )
            }
        );
    }
    else {
        $vars->add_alias( var => 'OUTER_USERNAME', alias => 'CREDENTIALS.0' );
    }

    return 1;
}

__PACKAGE__->meta->make_immutable();

1;
