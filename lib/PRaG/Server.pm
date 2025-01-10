package PRaG::Server;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;

use JSON::MaybeXS;

use namespace::autoclean;
use PRaG::Types;

enum 'INET_FAMILIES', [ 'v4', 'v6' ];

has 'address'     => ( is => 'rw', isa => 'Str' );
has 'secret'      => ( is => 'rw', isa => 'Str' );
has 'timeout'     => ( is => 'rw', isa => 'PositiveInt', default => 5 );
has 'local_addr'  => ( is => 'rw', isa => 'Str' );
has 'local_port'  => ( is => 'rw', isa => 'Int',           default => 0 );
has 'retransmits' => ( is => 'rw', isa => 'PositiveInt',   default => 2 );
has 'family'      => ( is => 'rw', isa => 'INET_FAMILIES', default => 'v4' );
has 'dns'         => ( is => 'rw', isa => 'Str',           default => q{} );
has 'id'          => ( is => 'ro', isa => 'Str',           default => q{} );

sub dump_for_load {
    my $self = shift;

    if ( $self->id ) {
        return {
            id     => $self->id,
            family => $self->family,
        };
    }
    else {
        return $self->as_hashref;
    }
}

sub as_hashref {
    my $self = shift;
    my $obj  = {
        address     => $self->address,
        secret      => $self->secret,
        timeout     => $self->timeout,
        local_addr  => $self->local_addr,
        local_port  => $self->local_port,
        retransmits => $self->retransmits,
        family      => $self->family,
    };
    if ( $self->dns ) { $obj->{dns} = $self->{dns}; }
    if ( $self->id )  { $obj->{id}  = $self->{id}; }
    return $obj;
}

sub as_json {
    my $self = shift;

    my $json_obj = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );
    return $json_obj->encode( $self->as_hashref );
}

__PACKAGE__->meta->make_immutable;

1;
