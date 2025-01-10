package PRaG::Proto::RoleCHAP;

use strict;
use utf8;

use Moose::Role;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Digest ();

has 'chap_length'   => ( is => 'rw', isa => 'PositiveInt', default => 16 );
has 'chap_hash_alg' => ( is => 'rw', isa => 'Str',         default => 'MD5' );
has 'chap_chars' => (
    is      => 'rw',
    isa     => 'ArrayRef',
    default => sub { [ 'a' .. 'z', 'A' .. 'Z', '0' .. '9' ] },
);

sub generate_challenge_string {
    my $self = shift;
    my $str;
    my $length = $self->chap_length;
    foreach ( 1 .. $length ) {
        $str .= @{ $self->chap_chars }[ rand @{ $self->chap_chars } ];
    }
    return $str;
}

sub challenge_response {
    my ( $self, $id, $password, $challenge ) = @_;

    my $ctx = Digest->new( $self->chap_hash_alg );
    $ctx->add( pack( 'C', $id ) );
    $ctx->add($password);
    $ctx->add($challenge);

    return $ctx->digest;
}

1;
