package PRaG::Proto::ProtoMAB;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

extends 'PRaG::Proto::ProtoRadius';

sub BUILD {
    my $self = shift;
    $self->_set_method('MAB');
    return $self;
}

sub do {
    my $self = shift;

    $self->logger and $self->logger->debug('Starting MAB');
    $self->_send_request;
}

sub _send_request {
    my $self = shift;

    my $ra = [];

    # General attributes
    $self->_add_general($ra);

    # MAB-specific
    $self->_parse_and_add(
        [ { name => 'Service-Type', value => 'Call-Check' } ], $ra )
      if ( !$self->_find_by_name('Service-Type') );
    $self->_parse_and_add(
        [
            {
                name  => 'User-Name',
                value => $self->_find_and_remove('User-Name') // '$MAC$'
            },
            {
                name  => 'User-Password',
                value => $self->_find_and_remove('User-Password') // '$MAC$'
            },
        ],
        $ra
    );

    # Provided by user
    $self->_parse_and_add( $self->radius->{request}, $ra );

    # Start authentication
    $self->_set_status( $self->_S_STARTED );
    $self->_client->request( to_send => $ra );
}

# Functions to call before construction
sub determine_vars {
    my $class = shift;
    my ( $vars, $specific ) = @_;
}

__PACKAGE__->meta->make_immutable();

1;
