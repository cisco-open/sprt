package PRaG::Vars::GeneratorString;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Carp;
use Data::Dumper;
use Data::Fake      qw/Core Company Internet Names Text/;
use List::MoreUtils qw/firstidx/;
use Readonly;
use Ref::Util qw/is_plain_arrayref/;
use String::Random;
use Math::Random::Secure qw/rand/;

extends 'PRaG::Vars::VarGenerator';

Readonly my %VARIANTS_DISPATCHER => (
    'list'           => \&_vh_list,
    'random'         => \&_vh_rnd,
    'random-pattern' => \&_vh_rnd_pattern,
    'static'         => \&_vh_static,
    'faker'          => \&_vh_faker,
);

Readonly my %FAKERS => (
    first_name => sub { return fake_first_name()->(); },
    last_name  => sub { return fake_surname()->(); },
    email      => sub { return fake_email()->(); },
    company    => sub { return fake_company()->(); },
    sentence   => sub { return fake_sentences(1)->(); },
    phone      => sub {
        my $format = fake_pick(
            '###-###-####',  '(###)###-####',
            '# ### #######', '############',
            '#-###-###-####'
        );
        return fake_digits( $format->() )->();
    },
);

after '_fill' => sub {
    my $self = shift;

    if ( my $cr = $VARIANTS_DISPATCHER{ $self->parameters->{variant} } ) {
        return $self->$cr();
    }
    $self->_set_error('Unsupported variant');

    return;
};

sub _vh_list {
    my $self = shift;

    if ( !is_plain_arrayref( $self->parameters->{'list'} ) ) {
        $self->parameters->{'list'} =
          [ split /\R/sxm, $self->parameters->{'list'} ];
    }
    $self->_set_sub_next('_next_list');

    return 1;
}

sub _vh_rnd {
    my $self = shift;

    if (
        (
               $self->parameters->{'min-length'}
            && $self->parameters->{'max-length'}
        )
        || $self->parameters->{'length'}
      )
    {
        if ( exists $self->parameters->{pattern} ) {
            delete $self->parameters->{pattern};
        }
        $self->_set_sub_next('_next_random');
        return 1;
    }

    $self->_set_error('Incorrect parameters variant');
    return;
}

sub _vh_rnd_pattern {
    my $self = shift;

    if ( !$self->parameters->{pattern} ) {
        $self->_set_error('Pattern not specified');
        return;
    }
    $self->_set_sub_next('_next_random');

    return 1;
}

sub _vh_static {
    my $self = shift;

    $self->_set_sub_next('_get_static');

    return 1;
}

sub _vh_faker {
    my $self = shift;

    $self->parameters->{'faker'} = $FAKERS{ $self->parameters->{'what'} }
      // undef;
    if ( !$self->parameters->{'faker'} ) {
        $self->_set_error('Faker is unknown');
        return;
    }

    $self->_set_sub_next('_next_faker');
    return 1;
}

sub amount {
    my $self = shift;
    if ( $self->parameters->{variant} eq 'list' ) {
        return scalar @{ $self->parameters->{'list'} };
    }

    return -1;
}

sub _str_length {
    my $self = shift;
    if (   $self->parameters->{'min-length'}
        && $self->parameters->{'max-length'} )
    {
        my $min = int( $self->parameters->{'min-length'} );
        my $max = int( $self->parameters->{'max-length'} );
        return $min + ( int( rand( $max - $min + 1 ) ) );
    }

    return $self->parameters->{'length'};
}

sub _is_usable {
    my $self = shift;
    my $val  = shift;

    if ( $self->parameters->{'disallow-repeats'} ) {
        if ( $self->used_is_empty ) { return 1; }
        return $self->find_used( sub { $_ eq $val } ) > -1 ? 0 : 1;
    }

    return 1;
}

sub _push_to_used {
    my $self = shift;
    my $val  = shift;

    if ( $self->parameters->{'disallow-repeats'} ) {
        if ( $self->logger ) { $self->logger->debug(qq/Adding $val to used./); }
        $self->add_used($val);
    }
    return;
}

sub _next_random {
    my $self       = shift;
    my $string_gen = String::Random->new;
    my $pattern    = $self->parameters->{pattern}
      // '\w{' . $self->_str_length . '}';
    my $new_str;
    my $counter = 0;

    do {
        $new_str = $string_gen->randregex($pattern);
        if ( ++$counter > $self->max_tries ) {
            return $self->_no_next;
        }
    } while ( !$self->_is_usable($new_str) );

    $self->_push_to_used($new_str);
    return { code => 'OK', value => $new_str };
}

sub _next_list {
    my $self = shift;
    if ( $self->parameters->{'how-to-follow'} eq 'one-by-one' ) {
        $self->parameters->{'nextIdx'} //= 0;
        return $self->_no_next if ( $self->parameters->{'nextIdx'} == -1 );

        return $self->_no_next
          if ( !defined $self->parameters->{'list'}
            ->[ $self->parameters->{'nextIdx'} ] );

        my $new_mac =
          $self->parameters->{'list'}->[ $self->parameters->{'nextIdx'} ];

        $self->parameters->{'nextIdx'}++;
        if ( !defined $self->parameters->{'list'}
            ->[ $self->parameters->{'nextIdx'} ] )
        {
            # reset index if reached end of list
            $self->parameters->{'nextIdx'} =
              $self->parameters->{'disallow-repeats'} ? -1 : 0;
        }

        return { code => 'OK', value => $new_mac };
    }
    else {
        return $self->_no_next if ( !scalar @{ $self->parameters->{'list'} } );

        my $idx = int( rand( scalar @{ $self->parameters->{'list'} } ) );
        return $self->_no_next
          if ( !defined $self->parameters->{'list'}->[$idx] );

        my $new_mac = $self->parameters->{'list'}->[$idx];
        if ( $self->parameters->{'disallow-repeats'} ) {

            # remove this value from the list, so it won't be used again
            if ( $self->logger ) {
                $self->logger->debug(
qq/Removing $self->parameters->{'list'}->[$idx] from the list/
                );
            }
            my @tmp = @{ $self->parameters->{'list'} };
            splice @tmp, $idx, 1;
            $self->parameters->{'list'} = \@tmp;
        }
        return { code => 'OK', value => $new_mac };
    }
}

sub _get_static {
    my $self = shift;
    return { code => 'OK', value => $self->parameters->{'value'} };
}

sub _next_faker {
    my $self = shift;

    return { code => 'OK', value => $self->parameters->{faker}->() };
}

__PACKAGE__->meta->make_immutable;

1;
