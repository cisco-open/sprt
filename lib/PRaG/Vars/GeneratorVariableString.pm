package PRaG::Vars::GeneratorVariableString;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Data::Dumper;
use List::MoreUtils qw/firstidx/;
use String::Random;
extends 'PRaG::Vars::VarGenerator';

# has '_internal_vars' => ( is => 'rw', isa => 'HashRef' );

after '_fill' => sub {
    my $self = shift;

    if ( $self->parameters->{variant} eq 'pattern' ) {
        $self->_set_sub_next('_next_pattern');
    }
    else {
        $self->_set_error('Unsupported variant');
    }
};

sub _is_usable {
    my ( $self, $val ) = @_;

    if ( $self->parameters->{'disallow-repeats'} ) {
        if ( !scalar @{ $self->used } ) { return 1; }
        return firstidx { $_ eq $val } @{ $self->used } > -1 ? 0 : 1;
    }
    else { return 1; }
}

sub _push_to_used {
    my ( $self, $val ) = @_;

    if ( $self->parameters->{'disallow-repeats'} ) {
        if ( $self->logger ) { $self->logger->debug(qq/Adding $val to used./); }
        push @{ $self->used }, $val;
    }
    return;
}

sub _next_pattern {
    my ( $self, $other_vars ) = @_;
    my $new_str;
    my $counter = 0;

    do {
        $new_str = $self->all_vars->substitute(
            $self->parameters->{pattern},
            vars      => $other_vars // undef,
            functions => 1,
        );
        while ( $self->_find_function( \$new_str ) ) { }
        if ( ++$counter > $self->max_tries ) { return $self->_no_next; }
    } while ( !$self->_is_usable($new_str) );

    $self->_push_to_used($new_str);
    return { code => 'OK', value => $new_str };
}

__PACKAGE__->meta->make_immutable;

1;
