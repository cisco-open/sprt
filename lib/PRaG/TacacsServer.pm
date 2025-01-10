package PRaG::TacacsServer;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;

use JSON::MaybeXS;

use namespace::autoclean;
use PRaG::Types;

extends 'PRaG::Server';

has 'ports' => ( is => 'rw', isa => 'ArrayRef' );

around 'as_hashref' => sub {
    my $orig = shift;
    my $self = shift;

    my $obj = $self->$orig();
    $obj->{ports} = $self->ports;
    return $obj;
};

__PACKAGE__->meta->make_immutable;

1;
