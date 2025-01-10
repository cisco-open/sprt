package PRaG::Vars::VarGenerator;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use String::Random;
use Math::Random::Secure qw/irand/;
use Data::Dumper;
use Carp;
use logger;

class_type 'logger';

has 'parameters' => ( is => 'ro', isa => 'Any', required => 1, );
has 'max_tries'  => ( is => 'ro', isa => 'Int', default  => 10_000, );
has 'logger'     => ( is => 'ro', isa => 'logger', );
has 'all_vars'   => ( is => 'ro', isa => 'Maybe[PRaG::Vars]', );
has 'used' => (
    is      => 'ro',
    isa     => 'ArrayRef',
    writer  => '_set_used',
    traits  => ['Array'],
    handles => {
        add_used      => 'push',
        find_used     => 'first_index',
        used_is_empty => 'is_empty',
    },
);
has 'latest' => (
    is      => 'ro',
    isa     => 'Any',
    writer  => '_set_latest',
    clearer => '_drop_latest',
);
has 'error' => (
    is      => 'ro',
    writer  => '_set_error',
    clearer => '_no_error',
    trigger => \&_croak_error
);
has '_sub_next' => ( is => 'ro', isa => 'Str',  writer => '_set_sub_next', );
has '_filled'   => ( is => 'ro', isa => 'Bool', writer => '_set_filled', );

sub BUILD {
    my $self = shift;

    $self->_set_used( [] );
    $self->_drop_latest;
    $self->_no_error;
    $self->_fill;
}

sub _fill {
    my $self = shift;
    $self->_set_sub_next('_next_unsupported');
    if ( $self->logger ) {
        $self->logger->debug( 'Variable generated with parameters '
              . Dumper( $self->{parameters} ) );
    }
    return;
}

sub _next_unsupported {
    my $self = shift;
    return { code => 'UNSUPPORTED', error => 'Generator is unavailable.' };
}

sub _no_next {
    my $self = shift;
    my $msg =
        q{Couldn't generate not repeated value for the varialbe of }
      . ref($self)
      . q{ class.};
    $self->_set_error($msg);
    return { code => 'NO_NEXT', error => $msg };
}

sub get_next {
    my $self   = shift;
    my $n      = $self->can( $self->_sub_next );
    my $result = $self->$n(@_);
    if ( $result->{code} && $result->{code} eq 'OK' ) {
        $self->_set_latest( $result->{value} );
        if ( $self->logger ) {
            $self->logger->debug(
                'Next value: ' . ref $result->{value}
                ? Dumper( $result->{value} )
                : $result->{value}
            );
        }
    }
    elsif ( $result->{code} && $result->{code} ne 'OK' ) {
        $self->_set_error( $result->{error} );
    }

    return wantarray ? $result : $result->{value} // undef;
}

sub amount {
    my $self = shift;
    return 0;
}

sub _h_rand {
    my $self      = shift;
    my $parameter = shift;

    if ( $parameter =~ /^(\d+)([.]{2}(\d+))?$/sxm ) {
        my $r = int($1) + irand( $3 - $1 );
        return $r;
    }
    elsif ( $parameter =~ /^\d+$/sxm ) {
        my $r = irand($parameter);
        return $r;
    }
    else {
        return $parameter;
    }
}

sub _h_randstr {
    my $self      = shift;
    my $parameter = shift;

    my $string_gen = String::Random->new;
    if ( $parameter =~ /^(\d+)?,(\d+)$/sxm || $parameter =~ /^\d+$/sxm ) {
        return $string_gen->randregex( '\w{' . $parameter . '}' );
    }
    else {
        return $string_gen->randregex($parameter);
    }
}

sub _h_hex {
    my $self      = shift;
    my $parameter = shift;

    if ( $parameter =~ /^\d+$/sxm ) {
        return sprintf( '%x', $parameter );
    }
    else {
        return $parameter;
    }
}

sub _h_oct {
    my $self      = shift;
    my $parameter = shift;

    if ( $parameter =~ /^\d+$/sxm ) {
        return sprintf( '%o', $parameter );
    }
    else {
        return $parameter;
    }
}

sub _h_uc {
    my $self      = shift;
    my $parameter = shift;

    return uc $parameter;
}

sub _h_lc {
    my $self      = shift;
    my $parameter = shift;

    return lc $parameter;
}

sub _h_no_delimeters {
    my $self      = shift;
    my $parameter = shift;

    return $parameter =~ s/[-:.]//gr;
}

my $_f_handlers = {
    'rand'          => \&_h_rand,
    'randstr'       => \&_h_randstr,
    'hex'           => \&_h_hex,
    'oct'           => \&_h_oct,
    'uc'            => \&_h_uc,
    'lc'            => \&_h_lc,
    'no_delimeters' => \&_h_no_delimeters,
};

sub _find_function {
    my $self   = shift;
    my $string = shift;

    my $re = '((' . join( q{|}, keys %{$_f_handlers} ) . ")\\(([^()]+)\\))";
    return if ${$string} !~ /$re/;

    # $1 - full found, like "rand(3232)"
    # $2 - name of function, like "rand"
    # $3 - parameter, like "3232"
    my $cr = $_f_handlers->{$2};
    my $v  = $self->$cr($3);
    ${$string} =~ s/\Q$1\E/$v/;
    return 1;
}

sub _croak_error {
    my ( $self, $err, $old_err ) = @_;
    croak $err if $err;
}

__PACKAGE__->meta->make_immutable;

1;
