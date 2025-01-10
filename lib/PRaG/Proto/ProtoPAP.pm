package PRaG::Proto::ProtoPAP;

use strict;
use utf8;

use Carp;
use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Math::Random::Secure qw/irand/;
use Ref::Util            qw/is_ref/;
use List::Util           qw/min/;

use PRaG::Util::Credentials qw/parse_credentials/;

extends 'PRaG::Proto::ProtoRadius';
with 'PRaG::Proto::RoleCHAP';    # And we are Credentials user and CHAP protocol

sub BUILD {
    my $self = shift;
    $self->_set_method('PAP');
    return $self;
}

sub do {
    my $self = shift;

    $self->logger and $self->logger->debug('Starting PAP');
    $self->_send_request;

    return 1;
}

sub _send_request {
    my $self = shift;

    my $ra = [];

    # General attributes
    $self->_add_general($ra);

    # PAP specific
    if ( !$self->_find_by_name('Service-Type') ) {
        $self->_parse_and_add(
            [ { name => 'Service-Type', value => 'Framed-User' } ], $ra );
    }

    $self->_parse_and_add( [ { name => 'User-Name', value => '$USERNAME$' } ],
        $ra );

    if ( !$self->vars->{CHAP} ) {    # Doing PAP
        $self->_parse_and_add(
            [ { name => 'User-Password', value => '$PASSWORD$' } ], $ra );
    }
    else {                           # Doing CHAP
        my $challenge = $self->generate_challenge_string();
        my $chap_id   = irand(256);
        my $challenge_response =
          $self->challenge_response( $chap_id, $self->vars->{PASSWORD},
            $challenge );
        $self->_parse_and_add(
            [
                { name => 'CHAP-Challenge', value => $challenge },
                {
                    name  => 'CHAP-Password',
                    value => pack( 'C', $chap_id ) . $challenge_response
                },
            ],
            $ra
        );
    }

    # User provided
    $self->_parse_and_add( $self->radius->{request}, $ra );

    # Start authentication
    $self->_set_status( $self->_S_STARTED );
    $self->_client->request( to_send => $ra );

    return 1;
}

# Functions to call before construction
sub determine_vars {
    my ( $class, $vars, $specific, $e ) = @_;

    return if ( !$vars );

    $vars->add(
        type       => 'Const',
        name       => 'CHAP',
        parameters => {
            'value' => $specific->{'chap'} ? 1 : 0
        }
    );

    parse_credentials( $vars, $specific, $e );
    return;
}

__PACKAGE__->meta->make_immutable();

1;
