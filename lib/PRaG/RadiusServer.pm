package PRaG::RadiusServer;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;

use JSON::MaybeXS;

use namespace::autoclean;
use PRaG::Types;

extends 'PRaG::Server';

has 'acct_port' => ( is => 'rw', isa => 'PortNumber' );
has 'auth_port' => ( is => 'rw', isa => 'PortNumber' );

around 'as_hashref' => sub {
    my $orig = shift;
    my $self = shift;

    my $obj = $self->$orig();
    $obj->{acct_port} = $self->acct_port;
    $obj->{auth_port} = $self->auth_port;
    return $obj;
};

__PACKAGE__->meta->make_immutable;

1;
