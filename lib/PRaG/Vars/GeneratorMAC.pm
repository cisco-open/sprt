package PRaG::Vars::GeneratorMAC;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use List::MoreUtils qw/indexes firstidx onlyidx/;
use Net::MAC;
use PRaG::Vars::MAC;
use Readonly;
use String::Random;

extends 'PRaG::Vars::VarGenerator';

Readonly my %VARIANTS_DISPATCHER => (
    'list'           => '_vh_list',
    'one-by-one'     => '_vh_one_by_one',
    'random'         => '_vh_random',
    'random-pattern' => '_vh_random_pattern',
    'dictionary'     => '_vh_dictionary',
);

after '_fill' => sub {
    my $self = shift;

    if (
        exists $VARIANTS_DISPATCHER{ $self->parameters->{'variant'} }
        && (
            my $code = $self->can(
                $VARIANTS_DISPATCHER{ $self->parameters->{'variant'} }
            )
        )
      )
    {
        $self->$code();
    }
    else {
        $self->_set_error('Unsupported variant');
    }
};

sub _vh_list {
    my $self = shift;
    $self->parameters->{'mac-list'} =
      [ split( /\R/sxm, $self->parameters->{'mac-list'} ) ];
    $self->_set_sub_next('_next_list');
    return 1;
}

sub _vh_one_by_one {
    my $self      = shift;
    my $first_mac = Net::MAC->new( 'mac' => $self->parameters->{'first-mac'} );
    my $last_mac  = Net::MAC->new( 'mac' => $self->parameters->{'last-mac'} );

    $self->parameters->{'first-mac'} =
      $first_mac->convert( 'base' => 16, 'bit_group' => 8, 'delimiter' => ':' )
      ->get_mac();
    $self->parameters->{'last-mac'} =
      $last_mac->convert( 'base' => 16, 'bit_group' => 8, 'delimiter' => ':' )
      ->get_mac();

    # creating MAC object to be able to increase
    $self->{generator} = MAC->new( $self->parameters->{'first-mac'} );
    $self->_set_sub_next('_next_increment');
    return 1;
}

sub _vh_random {
    my $self = shift;

    # setting pattern
    $self->parameters->{'pattern'} =
      '[A-F0-9]{2}:[A-F0-9]{2}:[A-F0-9]{2}:[A-F0-9]{2}:[A-F0-9]{2}:[A-F0-9]{2}';
    $self->parameters->{'variant'} = 'random-pattern';
    $self->_set_sub_next('_next_pattern');
    return 1;
}

sub _vh_random_pattern {
    my $self = shift;
    $self->_set_sub_next('_next_pattern');
    return 1;
}

sub _vh_dictionary {
    my $self = shift;

    my $lines =
      $self->all_vars->parent->load_user_dictionaries(
        $self->parameters->{dictionary} );

    $self->parameters->{'mac-list'} = $lines;
    $self->parameters->{'how-to-follow'}    //= 'one-by-one';
    $self->parameters->{'disallow-repeats'} //= 0;
    $self->_set_sub_next('_next_list');

    return 1;
}

sub _next_pattern {
    my $self       = shift;
    my $string_gen = String::Random->new;
    my $new_mac    = $string_gen->randregex( $self->parameters->{pattern} );

    if ( $self->parameters->{'disallow-repeats'} ) {
        my $counter = 0;
        if ( not $self->used_is_empty ) {
            while ( $self->find_used( sub { $_ eq $new_mac } ) > -1 ) {
                $new_mac =
                  $string_gen->randregex( $self->parameters->{pattern} );
                if ( ++$counter > $self->max_tries ) {
                    return $self->_no_next;
                }
            }
        }
    }
    $self->logger->debug(qq/Adding $new_mac to used./);
    $self->add_used($new_mac);
    return { code => 'OK', value => $new_mac };
}

sub _next_list {
    my $self = shift;
    if ( $self->parameters->{'how-to-follow'} eq 'one-by-one' ) {
        $self->parameters->{'nextIdx'} //= 0;
        if ( $self->parameters->{'nextIdx'} == -1 ) {
            return $self->_no_next;
        }

        if ( !defined $self->parameters->{'mac-list'}
            ->[ $self->parameters->{'nextIdx'} ] )
        {
            return $self->_no_next;
        }
        else {
            my $new_mac = $self->parameters->{'mac-list'}
              ->[ $self->parameters->{'nextIdx'} ];

            $self->parameters->{'nextIdx'}++;
            if ( !defined $self->parameters->{'mac-list'}
                ->[ $self->parameters->{'nextIdx'} ] )
            {
                # reset index if reached end of list
                $self->parameters->{'nextIdx'} =
                  $self->parameters->{'disallow-repeats'} ? -1 : 0;
            }

            return { code => 'OK', value => $new_mac };
        }
    }
    else {
        if ( !scalar @{ $self->parameters->{'mac-list'} } ) {
            return $self->_no_next;
        }

        my $idx = int( rand( scalar @{ $self->parameters->{'mac-list'} } ) );
        if ( !defined $self->parameters->{'mac-list'}->[$idx] ) {
            return $self->_no_next;
        }

        my $new_mac = $self->parameters->{'mac-list'}->[$idx];
        if ( $self->parameters->{'disallow-repeats'} ) {

            # remove this mac from the list, so it won't be used again
            $self->logger->debug(
qq/Removing $self->parameters->{'mac-list'}->[$idx] from the list/
            );
            my @tmp = @{ $self->parameters->{'mac-list'} };
            splice @tmp, $idx, 1;
            $self->parameters->{'mac-list'} = \@tmp;
        }
        return { code => 'OK', value => $new_mac };
    }
}

sub _next_increment {
    my $self          = shift;
    my $nextCandidate = $self->{generator}->showhex();
    $self->{generator}->increase( $self->parameters->{step} );

    if (   $nextCandidate gt $self->parameters->{'last-mac'}
        && $self->parameters->{'round-robin'} )
    {
        # end reached, start again
        my $counter = 0;
        while ( $nextCandidate gt $self->parameters->{'last-mac'} ) {
            if ( ++$counter > $self->parameters->{'max-tries'} ) {
                return $self->_no_next;
            }

            undef $self->{generator};
            $self->{generator} = MAC->new( $self->parameters->{'first-mac'} );
            $nextCandidate = $self->parameters->{'first-mac'};
        }
        return { code => 'OK', value => $nextCandidate };
    }
    elsif ( $nextCandidate gt $self->parameters->{'last-mac'}
        && !$self->parameters->{'round-robin'} )
    {
        # end reached, loop denied
        return $self->_no_next;
    }
    else {
        # all good, return value
        return { code => 'OK', value => $nextCandidate };
    }
}

__PACKAGE__->meta->make_immutable;

1;
