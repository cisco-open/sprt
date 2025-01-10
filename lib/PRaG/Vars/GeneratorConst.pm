package PRaG::Vars::GeneratorConst;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

extends 'PRaG::Vars::VarGenerator';

has '_const' => ( is => 'ro', isa => 'Any', writer => '_set_const' );

after '_fill' => sub {
    my $self = shift;

    if ( defined $self->parameters->{value} ) {
        $self->_set_const( $self->parameters->{value} );
        $self->_set_sub_next('_get_static');
    }
    else {
        $self->_set_error('No value for constant provided');
    }
};

sub _get_static {
    my $self = shift;
    return { code => 'OK', value => $self->_const };
}

__PACKAGE__->meta->make_immutable;

1;
