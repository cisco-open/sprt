package PRaG::Proto::ProtoEAPTLS;

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
use Crypt::OpenSSL::PKCS10;
use Crypt::OpenSSL::RSA;
use Crypt::OpenSSL::X509;
use Data::Dumper;
use Data::HexDump;
use English qw/-no_match_vars/;
use Errno ':POSIX';
use File::Basename;
use File::Temp;
use FileHandle;
use IO::Interface::Simple;
use IO::Socket::SSL::Utils;
use JSON::MaybeXS qw/encode_json decode_json/;
use Path::Tiny;
use POSIX ();
use Readonly;
use Ref::Util qw/is_ref is_hashref/;
use Syntax::Keyword::Try;
use Time::HiRes qw/gettimeofday/;

use PRaG::SCEPClient;
use PRaG::Vars      qw/vars_substitute/;
use PRaG::Util::TLS qw/
  :const
  parse_tls_options
  parse_validation
  parse_indentity_certs
  parse_tls_usernames
  /;
use PRaG::Util::TLSClientThread qw/client_thread/;

extends 'PRaG::Proto::ProtoRadius';    # We are a protocol handler
with 'PRaG::Proto::RoleEAP';           # And we are EAP protocol

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

# SCEP client
has '_scep' => (
    is      => 'ro',
    isa     => 'Maybe[PRaG::SCEPClient]',
    writer  => '_set_scep',
    default => undef,
);

# EAP-TLS fragments to send
has '_tls_fragments' =>
  ( is => 'rw', isa => 'Maybe[ArrayRef]', default => undef );

# Full length of EAP-TLS message
has '_tls_length' => ( is => 'rw', isa => 'Int', default => 0 );

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

Readonly my $EAPTLS_EAP_TYPE => 13;

Readonly my %DIGESTS => map { $_ => 1 }
  qw/sha1 sha256 sha384 sha512 sha512_224 sha512_256/;

Readonly my %SAN_TO_ID => (
    'rfc822Name'                => 1,
    'dNSName'                   => 2,
    'x400Address'               => 3,
    'directoryName'             => 4,
    'uniformResourceIdentifier' => 6,
    'iPAddress'                 => 7,
);

Readonly my %ID_TO_SAN => (
    1 => 'email',
    2 => 'DNS',
    4 => 'dirName',
    6 => 'URI',
    7 => 'IP',
);

# my @subject_order = qw/cn ou o l st c e/;

sub BUILD {
    my $self = shift;
    if ( $self->debug ) {
        require AnyEvent::Debug;
        require Coro::Debug;

        AnyEvent::Debug::wrap(1);
        Coro::Debug::stderr_loglevel(9);
    }

    $self->eap_type($EAPTLS_EAP_TYPE);
    $self->_set_method('EAP-TLS');

    return $self;
}

sub do {
    my $self = shift;

    $self->debug and $self->logger->debug('Starting EAP-TLS');
    $self->_check_framed_mtu;
    $self->_cb(Coro::rouse_cb);
    $self->_send_request;
    Coro::rouse_wait $self->_cb;
    $self->_clear_cb;
    return;
}

sub _send_request {
    my $self = shift;

    return
      if ( !$self->_get_scep_cert )
      ;    # exit if SCEP should be used but couldn't enroll
    $self->vars->{CERTIFICATE}->{obj} = Crypt::OpenSSL::X509->new_from_string(
        $self->vars->{CERTIFICATE}->{content},
        Crypt::OpenSSL::X509::FORMAT_PEM()
    );
    return if ( !$self->_create_ssl );    # exit if couldn't create SSL handlers

    # We can start the authentication here...
    # First: get Identity
    return if ( !$self->_define_identity );

   # Now, compose EAP Identity message: code - 2 (Response), type - 1 (Identity)
    my $eap = $self->compose_eap(
        code      => 2,
        type      => 1,
        type_data => $self->session_user
    );
    my $ra = [];

    # General attributes
    $self->_add_general( $ra, { include_mtu => 1 } );

    # EAP-TLS specific
    $self->_parse_and_add(
        [
            { name => 'Service-Type', value => 'Framed-User' },
            { name => 'User-Name',    value => '$USERNAME$' },
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

# We've got RADIUS challenge
sub _challenge {
    my $self = shift;
    my $h    = {@_};

    # $h is - {response => ARRAYREF, type => 'ACCESS_CHALLENGE'}

    $self->_set_status( $self->_S_ACCESS_CHALLENGE );

    # Check if State attribute present and save it
    $self->_collect_state( $h->{response} );
    my ( $code, $id, $len, $type, $type_data ) =
      $self->collect_and_parse_eap( $h->{response} );

    if ( $type != $EAPTLS_EAP_TYPE ) {    # Stop if not EAP-TLS message
        $self->logger->warn(
            "Unexpected EAP type received $type, expected 13 (EAP-TLS)");
        $self->propose_eap_method($EAPTLS_EAP_TYPE);
        return;
    }

    my ( $length_bit, $more_bit, $start_bit, $ssl );
    ( undef, $more_bit, $start_bit, $len, $ssl ) =
      $self->_parse_eap_tls($type_data);
    if ($length_bit) {
        $self->debug
          and $self->logger->debug(
            "Advertised length: $len, real length: " . length $ssl );
    }
    $len //= length $ssl;

    return $self->_start_eap_tls if $start_bit;

    return $self->_more_tls_fragments( $ssl, $len ) if $more_bit;

    return $self->_next_tls_fragment
      if ( $self->_tls_fragments && scalar( @{ $self->_tls_fragments } ) );

    return $self->_continue_eap_tls( $ssl, $len );
}

# Clean after self
around [qw/_succeed _rejected/] => sub {
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

    $self->_cb->();
    return 1;
}

# Got start TLS, need to send Client Hello
sub _start_eap_tls {
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
              and $self->logger->debug(
                'Accepted on: ' . $host . $port . $self->_socket_name );

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
        debug  => $self->debug,
    );

    $self->debug and $self->logger->debug('Client thread created');

    return 1;
}

sub _accepted_continue {
    my $self = shift;

    $self->_recv_from_client(
        sub {
            my $buff = shift;
            $self->_clear_received_data;
            $self->_prepare_eap_tls_response($buff);
        }
    );
    return 1;
}

# Got response with "More Fragments" bit set, need to request them
sub _more_tls_fragments {
    my $self = shift;
    my ( $ssl, $len ) = @_;

    $self->debug
      and $self->logger->debug(
        'Got more TLS fragments, storing and requesting next');
    $self->_add_received_data($ssl);       # Store what we received
    $self->_prepare_eap_tls_response();    # Send empty EAP-TLS response

    return 1;
}

# Got EAP-TLS response, no bits set,
# need to parse all received EAP-TLS and respond
sub _continue_eap_tls {
    my $self = shift;
    my ( $ssl, $len ) = @_;
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
        sub {
            my $buff = shift;
            $self->debug
              and $self->logger->debug(
                'Received ' . ( length($buff) || 0 ) . ' bytes' );

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
                        type   => 2,
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
                $self->_prepare_eap_tls_response($buff);
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
    $self->_prepare_eap_tls_response();
    return;
}

sub _ack_alert {
    my ( $self, $v ) = @_;
    $self->debug
      and $self->logger->debug(q{Server didn't like something, ack that});
    my ( $a_level, $reason ) = unpack 'CC', $v;
    $self->_new_packet(
        type   => 2,
        packet => [
            {
                'value' => $self->_ssl_reason_descr($reason),
                'name'  => 'OpenSSL Error'
            }
        ],
        code => 'EOPENSSL',
        time => scalar gettimeofday()
    );
    $self->_prepare_eap_tls_response();
    return;
}

sub _inform_ssl_failure {
    my ( $self, $ssl_result ) = @_;

    $self->debug and $self->logger->debug('Informing server about failure');
    $self->_prepare_eap_tls_response( $ssl_result->{buf} );
    return;
}

sub _recv_from_client {
    my ( $self, $cb ) = @_;

    return if $self->_client_thread->is_zombie;
    return if not $self->_accepted_client;

    my $buff = q{};
    $self->debug and $self->logger->debug('Setting up client for reading');

    my $reader;

    $reader = sub {
        my $record_layer = $_[1];
        $self->debug and $self->logger->debug('Received chunk');
        my ( $c_type, $version, $length ) = unpack 'C n n', $record_layer;
        $self->_accepted_client->push_read(
            chunk => $length,
            sub {
                $buff .= $record_layer . $_[1];
                if ( length $_[0]->{rbuf} ) {
                    $self->debug
                      and $self->logger->debug('Continue reading buffer');
                    $self->_accepted_client->push_read(
                        chunk => 5,
                        $reader
                    );
                }
                else {
                    $self->debug
                      and $self->logger->debug(
                        'Finished reading, executing callback');
                    &{$cb}($buff);
                    undef $cb;
                    undef $reader;
                }
            }
        );
    };

    $self->_accepted_client->on_error(
        sub {
            my ( $hdl, $fatal, $msg ) = @_;
            if ( $ERRNO != EPIPE ) { $self->logger->error($msg); }
            $hdl->destroy;
            &{$cb}(q{});
            undef $cb;
            undef $reader;
        }
    );

    $self->debug and $self->logger->debug('Starting read from client');

    try {
        $self->_accepted_client->push_read(
            chunk => 5,
            $reader
        );
    }
    catch {
        $self->logger->error( q{Couldn't read from client: } . $EVAL_ERROR );
    };

    return 1;
}

sub _prepare_eap_tls_response {
    my $self = shift;
    my $data = shift;
    $data //= q{};    # 0 length string by default

    $self->_tls_length(0);

    # Get current length
    my $l = $self->_client->calc_length( $self->_initial_request );
    my $eap_tls_data;

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
        $eap_tls_data = $self->_pack_eap_tls(
            length_included => 1,              # should be only in first packet
            more_fragments  => 1,
            start           => 0,
            data            => shift @groups
        );

        # Save what left
        $self->_tls_fragments( \@groups );
    }
    else {
        $eap_tls_data = $self->_pack_eap_tls(
            length_included => length($data) ? 1 : 0,
            more_fragments  => 0,
            start           => 0,
            data            => $data
        );
    }

    return $self->_send_eap_tls_response($eap_tls_data);
}

sub _next_tls_fragment {
    my $self = shift;

    my $data         = shift @{ $self->_tls_fragments };
    my $eap_tls_data = $self->_pack_eap_tls(
        length_included => 0,
        more_fragments  => $self->_tls_fragments
          && scalar( @{ $self->_tls_fragments } ) ? 1 : 0,
        start => 0,
        data  => $data
    );

    return $self->_send_eap_tls_response($eap_tls_data);
}

sub _send_eap_tls_response {
    my $self         = shift;
    my $eap_tls_data = shift;

    my $eap_message = $self->compose_eap(
        code      => 2,
        type      => $EAPTLS_EAP_TYPE,
        type_data => $eap_tls_data
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
            'Attributes for EAP-TLS response prepared, payload length: '
          . length($eap_message)
          . ", sending. Dump:\n"
          . HexDump($eap_message) );
    $self->_client->request( to_send => \@new_request );
    return 1;
}

# Parse EAP-TLS flags, length (if present) and SSL/TLS data
sub _parse_eap_tls {
    my $self = shift;
    my $data = shift;

    my $flags;
    my $len;
    ( $flags, $data ) = unpack 'C a*', $data;

    my $lbit = $flags & $LENGTH_BIT;    # Length included bit
    my $mbit = $flags & $MORE_BIT;      # More fragments bit
    my $sbit = $flags & $START_BIT;     # Start bit

    if ($lbit) { ( $len, $data ) = unpack 'N a*', $data; }

    return ( $lbit, $mbit, $sbit, $len, $data );
}

# Pack EAP-TLS flags, length and data
sub _pack_eap_tls {
    my $self = shift;
    my $h    = {@_};

    # $h object: {
    # 	length_included
    # 	more_fragments
    # 	start
    #	data
    # }

    my $flags =
      ( $h->{length_included} ? $LENGTH_BIT : $NO_BIT ) |
      ( $h->{more_fragments}  ? $MORE_BIT   : $NO_BIT ) |
      ( $h->{start}           ? $START_BIT  : $NO_BIT );

    if ( $h->{length_included} ) {
        my $len = $self->_tls_length || length( $h->{data} );
        return pack 'C N a*', $flags, $len, $h->{data};
    }
    else {
        return pack 'C a*', $flags, $h->{data};
    }
}

sub _create_ssl {
    my $self = shift;
    $self->debug
      and $self->logger->debug('Creating SSL client amd proxy-server');

    $self->_socket_dir( File::Temp->newdir() );
    $self->debug
      and $self->logger->debug(
        'Using ' . $self->_socket_name . ' for connections' );

    return 1;
}

sub _create_scep {
    my $self = shift;

    # object - $self->vars->{SCEP_OPTIONS}: {
    # 	ca             - array of CA certificates
    # 	scep_name      - name of SCEP server
    # 	url            - URL of SCEP server
    # 	signer_cert    - signing certificate
    # 	signer_keys    - keys for signing
    #	connect_to     - populated from config
    # }

    $self->debug and $self->logger->debug('Creating SCEP client');
    my $s = PRaG::SCEPClient->new(
        logger => $self->logger,
        url    => $self->vars->{SCEP_OPTIONS}->{url},
        name   => $self->vars->{SCEP_OPTIONS}->{scep_name},
        csr    => $self->_compose_csr,
        signer => {
            certificate => $self->vars->{SCEP_OPTIONS}->{signer_cert},
            pvk         => $self->vars->{SCEP_OPTIONS}->{signer_keys}->{private}
        },
        ca_certificates => $self->vars->{SCEP_OPTIONS}->{ca},
        connect_to      => $self->vars->{SCEP_OPTIONS}->{connect_to},
    );
    $self->_set_scep($s);
    return 1;
}

sub _get_scep_cert {
    my $self = shift;
    if ( !$self->vars->{SCEP_OPTIONS} ) {
        if ( $self->vars->{CERTIFICATE}->{id} ) {
            my $json_obj = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );
            $self->session_attributes->{certificate} =
              $self->vars->{CERTIFICATE}->{id};
            undef $json_obj;
        }
        return 1;
    }

    $self->_create_scep;

    $self->debug and $self->logger->debug('Enrolling certificate');
    my $cert = $self->_scep->enroll;
    if ( !$cert || $self->_scep->error ) {
        $self->_got_error(
            code    => 'ESCEP_ENROLL',
            message => $self->_scep->error
        );
        return;
    }
    $self->debug
      and $self->logger->debug( "Got certificate from SCEP:\n" . $cert->{pem} );
    $self->vars->{CERTIFICATE}->{content} = $cert->{pem};
    $self->_save_certificate;
    return 1;
}

sub _save_certificate {
    my $self = shift;

    return 1 if ( !$self->vars->{SAVE_CERTIFICATES} );

    my $json_obj = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );
    $self->session_attributes->{certificate} = {
        content => $self->vars->{CERTIFICATE}->{content},
        pvk     => $self->vars->{CERTIFICATE}->{keys}->{private},
        type    => 'identity'
    };
    undef $json_obj;

    $self->debug
      and $self->logger->debug( 'Saving certificate, attributes set: '
          . encode_json( $self->session_attributes ) );

    return 1;
}

sub _compose_csr {
    my $self = shift;

    $self->debug and $self->logger->debug(
        sprintf q/Creating CSR based on '%s' template/,
        $self->vars->{CSR_TEMPLATE}->{friendly_name}
    );

    my ( $csr_pem, $pvk_pem ) =
      $self->_generate_csr(
        $self->_fill_csr( $self->vars->{CSR_TEMPLATE}->{content} ) );
    $self->debug
      and $self->logger->debug(
        "Got CSR:\n" . $csr_pem . "\nGot PVK:\n" . $pvk_pem );

    $self->vars->{CERTIFICATE}->{keys}->{private} = $pvk_pem;

    return {
        pem => $csr_pem,
        pvk => $pvk_pem,
    };
}

sub _fill_csr {

    # Prepares a CSR object based on a template to be used in _generate_csr
    my $self   = shift;
    my $from   = shift;
    my $result = {};
    $from->{ext_key_usage} = {
        (
            clientAuth      => 1,
            codeSigning     => 0,
            emailProtection => 0,
            serverAuth      => 0,
            timeStamping    => 0
        ),
        %{ $from->{ext_key_usage} }
    };    # use defaults if not set different
    $from->{ext_key_usage}->{name} = 'extKeyUsage';

    $from->{key_usage} = {
        (
            cRLSign          => 0,
            dataEncipherment => 0,
            decipherOnly     => 0,
            digitalSignature => 1,
            encipherOnly     => 0,
            keyAgreement     => 0,
            keyCertSign      => 0,
            keyEncipherment  => 1,
            nonRepudiation   => 0,
        ),
        %{ $from->{key_usage} }
    };    # use defaults if not set different
    $from->{key_usage}->{name} = 'keyUsage';

    $result->{key_length} = $from->{key_length} || $KEY_LENGTH;
    $result->{digest} =
      ( $from->{digest} && $DIGESTS{ $from->{digest} } )
      ? $from->{digest}
      : 'sha256';
    $result->{subject}    = [];
    $result->{extensions} = [];

    while ( my ( $key, $value ) = each %{ $from->{subject} } ) {
        foreach my $part ( @{$value} ) {
            push @{ $result->{subject} },
              {
                shortName => uc($key),
                value     => vars_substitute( $part, $self->vars )
              };
        }
    }

    push @{ $result->{extensions} }, $from->{key_usage};
    push @{ $result->{extensions} }, $from->{ext_key_usage};
    if ( $from->{san} && scalar keys %{ $from->{san} } ) {
        my $san = { name => 'subjectAltName', altNames => [] };
        while ( my ( $key, $value ) = each %{ $from->{san} } ) {
            if ( my $type = $SAN_TO_ID{$key} ) {
                foreach my $part ( @{$value} ) {
                    if ( $type == 7 ) {
                        push @{ $san->{altNames} },
                          {
                            type => $type,
                            ip   => vars_substitute( $part, $self->vars )
                          };
                    }
                    else {
                        push @{ $san->{altNames} },
                          {
                            type  => $type,
                            value => vars_substitute( $part, $self->vars )
                          };
                    }
                }
            }
        }
        push @{ $result->{extensions} }, $san;
    }

    return $result;
}

# Returns private key and a PKCS10 CSR. Both in PEM format
sub _generate_csr {
    my $self = shift;
    my $from = shift;

    my $rsa = Crypt::OpenSSL::RSA->generate_key( $from->{key_length} );
    my $req = Crypt::OpenSSL::PKCS10->new_from_rsa($rsa);

    # prepare Subject field
    my $subject_text = join q{}, map {
        q{/} . $_->{shortName} . q{=} . ( $_->{value} =~ s?([=/])?\\$1?gr )
    } @{ $from->{subject} };
    $self->debug and $self->logger->debug("Got Subject: $subject_text");
    $req->set_subject( $subject_text, 1 );

    # parse extensions
    foreach my $ex ( @{ $from->{extensions} } ) {
        if ( $ex->{name} eq 'extKeyUsage' || $ex->{name} eq 'keyUsage' ) {
            my @t =
              map { $_ eq 'name' ? () : ( $ex->{$_} ? $_ : () ) }
              keys %{$ex};    # skip value of "name" field of the hash

            $self->debug
              and $self->logger->debug( $ex->{name} . ': ' . join( ', ', @t ) );
            if ( scalar @t ) {
                $ex->{name} eq 'extKeyUsage'
                  ? $req->add_ext( Crypt::OpenSSL::PKCS10::NID_ext_key_usage(),
                    join( ', ', @t ) )
                  : $req->add_ext( Crypt::OpenSSL::PKCS10::NID_key_usage(),
                    join( ', ', @t ) );
            }
        }
        elsif ( $ex->{name} eq 'subjectAltName' ) {
            my @t;
            foreach my $n ( @{ $ex->{altNames} } ) {
                if ( $ID_TO_SAN{ $n->{type} } ) {
                    push @t, $ID_TO_SAN{ $n->{type} } . q{:}
                      . ( $n->{value} // $n->{ip} );
                }
            }
            $req->add_ext( Crypt::OpenSSL::PKCS10::NID_subject_alt_name(),
                join( q{,}, @t ) );
        }
    }
    $req->add_ext_final();
    $self->debug and $self->logger->debug('Signing CSR');

    # Sign the CSR
    $req->sign();

    return ( $req->get_pem_req(), $rsa->get_private_key_string() );
}

sub _cp_cn {
    my $cert = shift;

    return $cert->subject_name->get_entry_by_type('CN')->value;
}

sub _cp_first_dns {
    my $cert = shift;

    my $r = _get_sans($cert);
    foreach my $el ( @{$r} ) {
        return $el->{dNSName} if ( exists $el->{dNSName} );
    }
    return;
}

sub _cp_any_san {
    my $cert   = shift;
    my $params = shift;

    my $r    = _get_sans($cert);
    my $ptrn = $params->{pattern};

    foreach my $el ( @{$r} ) {
        foreach my $san_name ( @{ $params->{allowed} } ) {
            return $el->{$san_name}
              if ( exists $el->{$san_name} && $el->{$san_name} =~ /$ptrn/ );
        }
    }
    return;
}

Readonly my %CERT_PARSERS => (
    '_FIRST_SAN_DNS' => \&_cp_first_dns,
    '_CN'            => \&_cp_cn,
    '_ANY_SAN'       => \&_cp_any_san,
);

# Pupolate session_user attribute with the correct information
sub _define_identity {
    my $self = shift;

    if ( is_ref( $self->vars->{USERNAME} ) ) {
        my $uo = $self->vars->{USERNAME};
        if ( !$CERT_PARSERS{ $uo->{where} } ) {
            $self->logger->fatal(
                'Unknown option for Identity - ' . $uo->{where} );
            return;
        }

        my $t = $CERT_PARSERS{ $uo->{where} }
          ->( $self->vars->{CERTIFICATE}->{obj}, $uo );
        if ( !defined $t ) {
            $self->logger->error(q{Couldn't find Idenity for the session});
            return;
        }

        $self->vars->{USERNAME} = $t;
        $self->_set_session_user($t);
    }
    else {
        $self->_set_session_user( $self->vars->{USERNAME} );
    }
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

# Part of ASN.1 parser copied from Crypt::X509
sub _asn_san_parser {
    my $asn = Convert::ASN1->new;
    $asn->prepare(<<'ASN1');
AttributeType ::= OBJECT IDENTIFIER
 
AttributeValue ::= DirectoryString  --ANY 
 
AttributeTypeAndValue ::= SEQUENCE {
		type                    AttributeType,
		value                   AttributeValue
		}

Name ::= CHOICE { -- only one possibility for now 
		rdnSequence             RDNSequence                     
		}

DirectoryString ::= CHOICE {
		teletexString           TeletexString,  --(SIZE (1..MAX)),
		printableString         PrintableString,  --(SIZE (1..MAX)),
		bmpString               BMPString,  --(SIZE (1..MAX)),
		universalString         UniversalString,  --(SIZE (1..MAX)),
		utf8String              UTF8String,  --(SIZE (1..MAX)),
		ia5String               IA5String,  --added for EmailAddress,
		integer                 INTEGER
		}
 
RDNSequence ::= SEQUENCE OF RelativeDistinguishedName

RelativeDistinguishedName ::= 
		SET OF AttributeTypeAndValue  --SET SIZE (1 .. MAX) OF

SubjectAltName ::= GeneralNames
 
GeneralNames ::= SEQUENCE OF GeneralName
 
GeneralName ::= CHOICE {
	 otherName                       [0]     AnotherName,
	 rfc822Name                      [1]     IA5String,
	 dNSName                         [2]     IA5String,
	 x400Address                     [3]     ANY, --ORAddress,
	 directoryName                   [4]     Name,
	 ediPartyName                    [5]     EDIPartyName,
	 uniformResourceIdentifier       [6]     IA5String,
	 iPAddress                       [7]     OCTET STRING,
	 registeredID                    [8]     OBJECT IDENTIFIER }
 
EntrustVersionInfo ::= SEQUENCE {
			  entrustVers  GeneralString,
			  entrustInfoFlags EntrustInfoFlags }
 
EntrustInfoFlags::= BIT STRING --{
--      keyUpdateAllowed
--      newExtensions     (1),  -- not used
--      pKIXCertificate   (2) } -- certificate created by pkix
 
-- AnotherName replaces OTHER-NAME ::= TYPE-IDENTIFIER, as
-- TYPE-IDENTIFIER is not supported in the 88 ASN.1 syntax
 
AnotherName ::= SEQUENCE {
	 type    OBJECT IDENTIFIER,
	 value      [0] EXPLICIT ANY } --DEFINED BY type-id }
 
EDIPartyName ::= SEQUENCE {
	 nameAssigner            [0]     DirectoryString OPTIONAL,
	 partyName               [1]     DirectoryString }
ASN1
    return $asn->find('SubjectAltName');
}

# Find and parse all SAN fields in the certificate
sub _get_sans {
    my $cert = shift;

    return if ( !$cert->has_extension_oid('2.5.29.17') );
    my $san = $cert->extensions_by_oid->{'2.5.29.17'};
    my $v   = pack 'H*', $san->value =~ s/^#//r;

    my $pars_subj_alt = _asn_san_parser();
    return $pars_subj_alt->decode($v);
}

sub _ssl_reason_descr {
    my ( $self, $reason ) = @_;
    return $SSL_REASONS->{$reason} // "Unknown reason - $reason";
}

# Functions to call before construction
sub determine_vars {
    my ( $class, $vars, $specific, $e ) = @_;

    return if not $vars;

    parse_tls_options( $vars, $specific, $e );
    parse_validation( $vars, $specific, $e );
    if ( $specific->{'identity-certificates'} ) {
        parse_indentity_certs( $vars, $specific->{'identity-certificates'},
            $e );
    }
    if ( $specific->{'usernames'} ) {
        parse_tls_usernames( $vars, $specific->{'usernames'}, $e );
    }
    return 1;
}

__PACKAGE__->meta->make_immutable();

1;
