package PRaG::Vars::GeneratorCredentials;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Data::Dumper;
extends 'PRaG::Vars::GeneratorString';

after '_fill' => sub {
    my $self = shift;

    if ( $self->parameters->{variant} ne 'list' ) {
        $self->_set_sub_next('_next_unsupported');
        $self->_set_error('Only lists are supported for credentials.');
    }
};

around '_next_list' => sub {
    my $orig = shift;
    my $self = shift;

    my $r = $self->$orig();
    if ( $r && $r->{code} eq 'OK' ) {
        $r->{value} = [ split( /:/, $r->{value}, 2 ) ];
    }
    return $r;
};

__PACKAGE__->meta->make_immutable;

1;
