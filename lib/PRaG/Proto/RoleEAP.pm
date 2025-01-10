package PRaG::Proto::RoleEAP;

use strict;
use utf8;

use Moose::Role;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

# use PRaG::Proto::Proto qw/:session_status/;
use Time::HiRes qw/gettimeofday usleep/;
use Data::Dumper;
use Data::HexDump;
use Readonly;
use PRaG::EAPClient qw/:const parse_eap/;

has 'raw_eap' => ( is => 'rw', isa => 'Bool', default => undef );

has '_eap_id' => ( is => 'rw', isa => 'PositiveInt', default => 1 );

has 'eap_type' => ( is => 'rw', isa => 'PositiveInt', default => 255 );

# Catcher for the events
has 'eap_event_catcher' => (
    is      => 'rw',
    isa     => 'Maybe[Object]',
    default => sub { my $self = shift; return $self; },
    clearer => 'clear_eap_catcher',
);

# Events for EAP codes
has [ map { 'on_eap_' . $_ } values %EAP_CODES ] =>
  ( is => 'rw', isa => 'Maybe[CodeRef]', default => undef );

# Events for EAP types
has [ map { 'on_eap_' . $_ } values %EAP_TYPES ] =>
  ( is => 'rw', isa => 'Maybe[CodeRef]', default => undef );
has 'on_eap_unknown' =>
  ( is => 'rw', isa => 'Maybe[CodeRef]', default => undef );

sub compose_eap {
    my ( $self, %h ) = @_;

    # $h object: {
    # 	code
    # 	type
    # 	type_data
    # }

    $self->logger
      and $self->logger->debug( 'Composing EAP with code '
          . $h{code}
          . ' and type '
          . ( $h{type} || 0 ) . qq{:\n}
          . HexDump( $h{type_data} ) );

    if ( $h{code} < $EAP_SUCCESS && !$h{type} ) {
        $self->_set_error('Type must be provided for EAP Request/Response');
        return;
    }

    my $len     = ( $h{code} < $EAP_SUCCESS ) ? length( $h{type_data} ) + 5 : 4;
    my $message = pack 'C C n', $h{code}, $self->_eap_id, $len;

    if ( $h{code} < $EAP_SUCCESS ) {
        $message .= pack( 'C', $h{type} ) . $h{type_data};
    }
    if ( $h{code} == 1 ) {
        $self->_eap_id( $self->_eap_id + 1 )
          ;    # increment EAP ID if Request was sent
    }

    return $message;
}

sub _parse_eap {
    my $self    = shift;
    my $message = shift;

    my ( $event, $e_coderef );

    my ( $code, $id, $len, $type, $type_data ) = parse_eap($message);

    # TODO: check length, ID and so on
    if ( $code == 1 ) {
        $self->_eap_id($id);
    }    # keep EAP ID if Request arrived as Response should have same

    if ( exists $EAP_CODES{$code} )
    {    # check events for the code (req, resp, success, fail)
        $event = 'on_eap_' . $EAP_CODES{$code};
        ( $e_coderef = $self->$event )
          and
          $self->eap_event_catcher->$e_coderef( $id, $len, $type, $type_data );
    }

    $event =
      'on_eap_' . ( exists $EAP_TYPES{$type} ? $EAP_TYPES{$type} : 'unknown' );
    ( $e_coderef = $self->$event )
      and $self->eap_event_catcher->$e_coderef( $id, $len, $type, $type_data );

    return ( $code, $id, $len, $type, $type_data ) if wantarray;
    return $type_data                              if defined wantarray;
    return;
}

# Find and return all EAP-Message attributes in one EAP message
sub collect_eap {
    my $self = shift;
    my $from = shift;
    my $collected;

    foreach my $attribute ( @{$from} ) {
        next if ( $attribute->{Name} ne 'EAP-Message' );
        $collected .= ( $attribute->{RawValue} // $attribute->{Value} );
    }

    return $collected;
}

sub collect_and_parse_eap {
    my ( $self, $from ) = @_;
    return $self->_parse_eap( $self->collect_eap($from) );
}

sub eap_nak {
    my ( $self, @desired_methods ) = @_;

    return $self->compose_eap(
        code      => $EAP_RESPONSE,
        type      => 3,
        type_data => pack( 'C*', @desired_methods ),
    );
}

sub propose_eap_method {
    my ( $self, @desired_methods ) = @_;

    my $eap_message = $self->eap_nak(@desired_methods);

    my @new_request;

    if ( $self->can('_initial_request') ) {
        push @new_request, @{ $self->_initial_request() };
    }

    push @new_request, { Name => 'EAP-Message', Value => $eap_message };

    if ( $self->can('session_state') and $self->session_state ) {
        $self->debug
          and $self->logger->debug('Got State, pushing and clearing');
        push @new_request, { Name => 'State', Value => $self->session_state };
        $self->_set_session_state(q{});
    }

    $self->_client->request( to_send => \@new_request );
    return 1;
}

sub send_eap {
    my $self = shift;
    my $eap;
    if ( @_ > 1 ) {
        $eap = $self->compose_eap(@_);
    }
    else {
        $eap = shift;
    }

    my @new_request;
    if ( not $self->raw_eap ) {
        push @new_request, @{ $self->_initial_request };
    }
    push @new_request, { Name => 'EAP-Message', Value => $eap };

    $self->_client->request( to_send => \@new_request );
    return;
}

before '_clear_self' => sub {
    my $self = shift;

    $self->eap_event_catcher(undef);
    $self->clear_eap_catcher;
};

around '_succeed' => sub {

    # Clean after self
    my $orig = shift;
    my $self = shift;

    if ( $self->raw_eap ) {
        $self->_clear_self;
        return;
    }

    $self->$orig(@_);
};

around '_create_client' => sub {
    my $orig = shift;
    my $self = shift;

    return $self->$orig() if not $self->raw_eap;

    $self->logger->debug('Raw EAP, replacing _client with EAP client.');

    $self->_set_client(
        PRaG::EAPClient->new(
            server => $self->server,
            logger => $self->logger,

            event_catcher => $self,
            on_response   => $self->can('_eap_response'),
            on_success    => $self->can('_succeed'),
            on_reject     => $self->can('_rejected'),
        )
    );
};

around 'do' => sub {
    my $orig = shift;
    my $self = shift;

    return $self->$orig() if not $self->raw_eap;

    $self->logger->debug('Getting first EAP packet');
    my $initial_packet = $self->_client->recv_eap;
    my ( $code, $id, $len, $type, $type_data ) =
      $self->_parse_eap($initial_packet);

    $self->logger->debug(
        'First packet: '
          . Dumper(
            {
                code => $EAP_CODES{$code} || $code,
                id   => $id,
                len  => $len,
                type => $EAP_TYPES{$type} || $type,
                data => $type_data
            }
          )
    );

    if ( $code == $EAP_REQUEST and $type == 1 ) {
        $self->$orig();
    }

    return;
};

sub _eap_response {
    my ( $self, %h ) = @_;

    $self->logger->debug(
        'Got response for EAP: ' . join qq{\n},
        map {
            $_->{Name} eq 'EAP-Message'
              ? Dumper(
                {
                    Name  => $_->{Name},
                    Value => qq{\n} . HexDump( $_->{Value} )
                }
              )
              : Dumper($_)
        } @{ $h{response} }
    );
    $self->_challenge(%h);

    return;
}

1;
