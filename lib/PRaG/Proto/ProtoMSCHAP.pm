package PRaG::Proto::ProtoMSCHAP;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Coro;

use Carp;
use Data::Dumper;
use Readonly;
use List::Util qw/min/;
use Crypt::Mode::ECB;

use PRaG::Util::Credentials qw/parse_credentials/;
use PRaG::Vars              qw/vars_substitute/;
use PRaG::EAPClient         qw/:const/;
use PRaG::Proto::RoleMSCHAP qw/:const :errors/;
use PRaG::Util::String      qw/as_hex_string hex_to_ascii/;
use PRaG::Util::ByPath;

extends 'PRaG::Proto::ProtoRadius';    # We are a protocol handler
with 'PRaG::Proto::RoleEAP',
  'PRaG::Proto::RoleMSCHAP';           # And we are EAP protocol and MSCHAP

# Initial Access-Request attributes
has '_initial_request' =>
  ( is => 'rw', isa => 'Maybe[ArrayRef]', default => undef );

has '_cb' => (
    is      => 'rw',
    default => undef,
    clearer => '_clear_cb',
);

has '_user' => (
    is      => 'rw',
    isa     => 'Str',
    lazy    => 1,
    default => sub { shift->vars->{USERNAME} // q{}; },
);

has '_password' => (
    is      => 'rw',
    isa     => 'Str',
    lazy    => 1,
    default => sub { shift->vars->{PASSWORD} // q{}; },
);

has 'can_change_pwd' => (
    is      => 'ro',
    isa     => 'Bool',
    lazy    => 1,
    default => sub {
        shift->vars->{MSCHAPV2_PWD_CHANGE} eq 'change';
    },
);

Readonly my $MSCHAPV2_EAP_TYPE => 26;
Readonly my $RESERVED          => pack 'Z8', q{};
Readonly my $RESERVED_FLAGS    => 0x00;

sub BUILD {
    my $self = shift;
    $self->eap_type($MSCHAPV2_EAP_TYPE);
    $self->_set_method('MSCHAPv2');
    return $self;
}

sub do {
    my $self = shift;

    $self->logger and $self->logger->debug('Starting EAP-MSCHAPv2');
    $self->_cb(Coro::rouse_cb);
    $self->_send_request;
    Coro::rouse_wait $self->_cb;
    $self->_clear_cb;

    return;
}

sub _send_request {
    my ($self) = @_;

    my $ra = [];

    # General attributes
    if ( not $self->raw_eap ) {
        $self->_add_general($ra);

        # EAP-MSCHAPv2 specific
        $self->_parse_and_add(
            [
                { name => 'Service-Type', value => 'Framed-User' },
                { name => 'User-Name',    value => '$USERNAME$' },
            ],
            $ra
        );

        # User provided
        $self->_parse_and_add( $self->radius->{request}, $ra );
    }
    else {
        $self->_parse_and_add(
            [ { name => 'User-Name', value => '$USERNAME$' }, ], $ra );
    }

    # Save initial request
    my @initial = @{$ra};
    $self->_initial_request( \@initial );

   # Now, compose EAP Identity message: code - 2 (Response), type - 1 (Identity)
    my $eap = $self->compose_eap(
        code      => $EAP_RESPONSE,
        type      => 1,
        type_data => $self->_user
    );

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

Readonly my %DISPATCH => (
    $CHALLENGE_OPCODE        => \&process_mv2_challenge,
    $SUCCESS_RESPONSE_OPCODE => \&process_mv2_success,
    $FAILURE_RESPONSE_OPCODE => \&process_mv2_failure,
);

sub _challenge {

    # We've got RADIUS challenge
    my ( $self, %h ) = @_;

    # $h is - {response => ARRAYREF, type => 'ACCESS_CHALLENGE'}

    $self->_set_status( $self->_S_ACCESS_CHALLENGE );

    # Check if State attribute present and save it
    $self->_collect_state( $h{response} );
    my ( $code, $id, $len, $type, $type_data ) =
      $self->collect_and_parse_eap( $h{response} );

    if ( $type != $MSCHAPV2_EAP_TYPE ) {    # Warn if not MSCHAPv2 message
        $self->logger->warn(
            "Unexpected EAP type received $type, expected 26 (EAP-MSCHAPv2)");
        $self->propose_eap_method($MSCHAPV2_EAP_TYPE);
        return;
    }

    my ( $opcode, $identifier, $ms_len, $value ) =
      $self->parse_mschapv2_packet($type_data);

    $self->logger->debug( 'Got '
          . $self->opcode_string($opcode)
          . ' MSCHAPv2 packet with length of '
          . $ms_len
          . ' bytes and ID '
          . $identifier );

    if ( my $cref = $DISPATCH{$opcode} ) {
        $self->$cref( $identifier, $value );
    }
    else {
        $self->logger->error( 'Unknown opcode: ' . $opcode );
        $self->respond_failure;
    }

    return 1;
}

sub process_mv2_challenge {
    my ( $self, $id, $value ) = @_;
    $self->logger->debug('MSCHAPv2 challenge');

    my ( $vs, $server_challenge, $name ) =
      $self->parse_mschapv2_challenge($value);
    $self->logger->debug( 'Name: ' . $name );
    $self->logger->debug( 'Server challenge ('
          . length($server_challenge)
          . ' bytes): '
          . as_hex_string($server_challenge) );

    my $client_challenge = $self->random_buffer($CHALLENGE_SIZE);
    $self->logger->debug( 'Random challenge ('
          . length($client_challenge)
          . ' bytes): '
          . as_hex_string($client_challenge) );

    my $nt_response = $self->generate_nt_response(
        $client_challenge, $server_challenge,
        $self->_user,      $self->_password
    );
    $self->logger->debug( 'nt_response ('
          . length($nt_response)
          . ' bytes): '
          . as_hex_string($nt_response) );

    my $ms_len =
      $MS_HEADER_SIZE + 1 + $RESPONSE_VALUE_SIZE + length $self->_user;
    my $flags       = $RESERVED_FLAGS;
    my $mschap_data = pack 'C C n C a16 Z8 a24 C a' . length( $self->_user ),
      $CHALLENGE_RESPONSE_OPCODE,
      $id, $ms_len, $RESPONSE_VALUE_SIZE, $client_challenge, $RESERVED,
      $nt_response, $flags,
      $self->_user;

    $self->send_eap(
        code      => $EAP_RESPONSE,
        type      => $self->eap_type,
        type_data => $mschap_data
    );

    return;
}

sub process_mv2_success {
    my ( $self, $id, $value ) = @_;
    $self->logger->debug('MSCHAPv2 success');

    my $parsed = $self->parse_mschapv2_success($value);
    $self->logger->debug( 'Success: ' . Dumper($parsed) );

    $self->send_eap(
        code      => $EAP_RESPONSE,
        type      => $self->eap_type,
        type_data => pack( 'C', $SUCCESS_RESPONSE_OPCODE ),
    );

    return;
}

sub process_mv2_failure {
    my ( $self, $id, $value ) = @_;
    $self->logger->debug('MSCHAPv2 failure');

    my $parsed = $self->parse_mschapv2_failure($value);
    $self->logger->debug( 'Failure: ' . Dumper($parsed) );

    if (    $parsed->{error_code} eq "$ERROR_PASSWD_EXPIRED"
        and $self->can_change_pwd )
    {
        $self->try_pwd_change( $id, $parsed->{challenge} );
    }
    else {
        $self->send_eap(
            code      => $EAP_RESPONSE,
            type      => $self->eap_type,
            type_data => pack( 'C', $FAILURE_RESPONSE_OPCODE ),
        );
    }

    return;
}

sub try_pwd_change {
    my ( $self, $id, $server_challenge ) = @_;

    $self->logger->debug('Changing password');

    $server_challenge = hex_to_ascii($server_challenge);
    $self->logger->debug( 'server_challenge ('
          . length($server_challenge)
          . ' bytes): '
          . as_hex_string($server_challenge) );

    my $new_pwd          = $self->vars->{MSCHAPV2_NEW_PWD};
    my $client_challenge = $self->random_buffer($CHALLENGE_SIZE);
    $self->logger->debug( 'client_challenge ('
          . length($client_challenge)
          . ' bytes): '
          . as_hex_string($client_challenge) );

    my $nt_response =
      $self->generate_nt_response( $client_challenge, $server_challenge,
        $self->_user, $new_pwd );
    $self->logger->debug( 'nt_response ('
          . length($nt_response)
          . ' bytes): '
          . as_hex_string($nt_response) );

    my $old_password_hash = $self->nt_password_hash( $self->_password );
    $self->logger->debug( 'old_password_hash ('
          . length($old_password_hash)
          . ' bytes): '
          . as_hex_string($old_password_hash) );

    my $new_password_hash = $self->nt_password_hash($new_pwd);
    $self->logger->debug( 'new_password_hash ('
          . length($new_password_hash)
          . ' bytes): '
          . as_hex_string($new_password_hash) );

    my $encrypted_password =
      $self->nt_encrypt_password( $new_pwd, $old_password_hash );
    $self->logger->debug( 'encrypted_password ('
          . length($encrypted_password)
          . ' bytes): '
          . as_hex_string($encrypted_password) );

    my $encrypted_hash =
      $self->old_nt_password_hash_encrypted_with_new_nt_password_hash( $new_pwd,
        $self->_password );
    $self->logger->debug( 'encrypted_hash ('
          . length($encrypted_hash)
          . ' bytes): '
          . as_hex_string($encrypted_hash) );

    Readonly my $CH_PASS_PACKET_LENGTH => 586;
    $id++;
    my $mschap_data = pack 'C C n a516 a16 a16 Z8 a24 CC',
      $PASSWORD_CHANGE_OPCODE,
      $id, $CH_PASS_PACKET_LENGTH, $encrypted_password,
      $encrypted_hash, $client_challenge, $RESERVED, $nt_response,
      $RESERVED_FLAGS,
      $RESERVED_FLAGS;

    $self->send_eap(
        code      => $EAP_RESPONSE,
        type      => $self->eap_type,
        type_data => $mschap_data
    );

    return;
}

sub respond_failure {
    my ($self) = @_;

    $self->send_eap(
        code      => $EAP_FAILURE,
        type      => $self->eap_type,
        type_data => q{},
    );

    return;
}

sub _clear_self {
    my $self = shift;

    $self->logger->debug('Cleaning');
    $self->_cb->();
    return 1;
}

around [qw/_succeed _rejected/] => sub {

    # Clean after self
    my $orig = shift;
    my $self = shift;

    $self->_clear_self;

    $self->$orig(@_);
};

# Functions to call before construction
sub determine_vars {
    my ( $class, $vars, $specific, $e ) = @_;

    return if ( !$vars );

    parse_credentials( $vars, $specific, $e );
    parse_password_change( $vars, $specific, $e );

    return 1;
}

sub parse_password_change {
    my ( $vars, $specific, $e ) = @_;

    my $how = get_by_path( $specific, 'change-password.variant', 'drop' );
    $vars->add(
        type       => 'String',
        name       => 'MSCHAPV2_PWD_CHANGE',
        parameters => { variant => 'static', value => $how, }
    );

    if ( $how eq 'change' ) {
        $vars->add(
            type       => 'String',
            name       => 'MSCHAPV2_NEW_PWD',
            parameters => {
                variant => 'static',
                value   =>
                  get_by_path( $specific, 'change-password.new-password', q{} ),
            }
        );
    }

    return 1;
}

__PACKAGE__->meta->make_immutable();

1;
