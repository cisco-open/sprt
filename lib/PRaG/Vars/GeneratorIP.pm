package PRaG::Vars::GeneratorIP;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Net::IP;
use List::MoreUtils qw/firstidx/;
use Data::Dumper;
use Readonly;
extends 'PRaG::Vars::VarGenerator';

has '_ip'     => ( is => 'ro', isa => 'Maybe[Net::IP]', writer => '_set_ip', );
has '_reints' => ( is => 'rw' );

Readonly my %VARIANTS_DISPATCHER => (
    'range'        => '_vh_range',
    'range-random' => '_vh_range_random',
    'random'       => '_vh_random',
    'dictionary'   => '_vh_dictionary',
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

sub _vh_range {
    my $self = shift;
    my $ip   = Net::IP->new( $self->parameters->{'range'} );

    if ($ip) {
        $self->_set_ip($ip);
        $self->_reints(0);
        $self->_set_sub_next('_next_range');
        $self->parameters->{'how'} = 'increment';
        $self->parameters->{'increment'} =
          int( $self->parameters->{'increment'} ) || 1;
    }
    else {
        $self->_set_error('Incorrect IP range');
    }

    return;
}

sub _vh_range_random {
    my $self = shift;
    my $ip   = Net::IP->new( $self->parameters->{'range'} );

    if ( $ip && $ip->version == 4 ) {
        $self->logger->debug('Valid IPv4 range');
        $self->_set_sub_next('_next_range_random');
    }
    else {
        $self->_set_error('Incorrect IP range');
    }

    return;
}

sub _vh_random {
    my $self = shift;

    $self->_set_sub_next('_next_random');

    return;
}

sub _vh_dictionary {
    my $self = shift;

    my $lines =
      $self->all_vars->parent->load_user_dictionaries(
        $self->parameters->{dictionary} );

    $self->parameters->{'ip-list'} = $lines;
    $self->parameters->{'how-to-follow'}    //= 'one-by-one';
    $self->parameters->{'disallow-repeats'} //= 0;
    $self->_set_sub_next('_next_list');

    return 1;
}

sub _next_range {
    my $self = shift;

    $self->latest
      and $self->_ip
      and $self->_set_ip( $self->_ip + $self->_range_step );
    my $counter = 0;
    while ( !$self->_ip || !$self->_is_ip_usable ) {
        if ( !$self->_ip ) {

            # re-initialize
            $self->_set_ip( Net::IP->new( $self->parameters->{'range'} ) );

            # if step is constant, start from "+ reinst + 1" address
            ( $self->parameters->{'how'} eq 'increment' )
              and $self->_set_ip( $self->_ip + $self->_reints + 1 );
            if ( !$self->_ip ) {

                # no reason to try further
                return $self->_no_next;
            }
            $self->_reints( $self->_reints + 1 );
        }
        else {
            $self->_set_ip( $self->_ip + $self->_range_step );
        }    # increment again if no luck
        if ( ++$counter > $self->max_tries ) { return $self->_no_next; }
    }

    $self->_push_to_used;
    return { code => 'OK', value => $self->_ip->ip };
}

sub _next_range_random {
    my $self = shift;

    my $val;
    my $counter = 0;
    do {
        my $ip = Net::IP->new( $self->parameters->{'range'} );
        $self->logger->debug( 'Size: ' . $ip->size );
        $ip += int( rand( $ip->size ) );
        $val = $ip->ip;
        if ( ++$counter > $self->max_tries ) { return $self->_no_next; }
        undef $ip;
    } while ( !$self->_is_ip_usable($val) );
    $self->_push_to_used($val);
    return { code => 'OK', value => $val };
}

sub _is_ip_usable {
    my $self = shift;
    my $val  = shift || $self->_ip->ip;

    if ( $self->parameters->{'disallow-repeats'} ) {
        if ( $self->used_is_empty ) { return 1; }
        return $self->find_used( sub { $_ eq $val } ) > -1 ? 0 : 1;
    }
    else { return 1; }
}

sub _range_step {
    my $self = shift;
    return $self->parameters->{'how'} eq 'increment'
      ? $self->parameters->{'increment'}
      : int( rand( $self->parameters->{'max-step'} || 100 ) ) + 1;
}

sub _push_to_used {
    my $self = shift;
    my $val  = shift || $self->_ip->ip;

    if ( $self->parameters->{'disallow-repeats'} ) {
        $self->logger->debug(qq/Adding $val to used./);
        $self->add_used($val);
    }
}

sub _next_random {
    my $self = shift;
    my $new_ip;
    my $counter = 0;

    do {
        $new_ip = join( '.', map { int rand 255 } 1 .. 4 );
        if ( ++$counter > $self->max_tries ) {
            return $self->_no_next;
        }
    } while ( !$self->_is_ip_usable($new_ip) );

    $self->_push_to_used($new_ip);

    return { code => 'OK', value => $new_ip };
}

sub _next_list {
    my $self = shift;
    if ( $self->parameters->{'how-to-follow'} eq 'one-by-one' ) {
        $self->parameters->{'nextIdx'} //= 0;
        if ( $self->parameters->{'nextIdx'} == -1 ) {
            return $self->_no_next;
        }

        if ( !defined $self->parameters->{'ip-list'}
            ->[ $self->parameters->{'nextIdx'} ] )
        {
            return $self->_no_next;
        }
        else {
            my $new_ip = $self->parameters->{'ip-list'}
              ->[ $self->parameters->{'nextIdx'} ];

            $self->parameters->{'nextIdx'}++;
            if ( !defined $self->parameters->{'ip-list'}
                ->[ $self->parameters->{'nextIdx'} ] )
            {
                # reset index if reached end of list
                $self->parameters->{'nextIdx'} =
                  $self->parameters->{'disallow-repeats'} ? -1 : 0;
            }

            return { code => 'OK', value => $new_ip };
        }
    }
    else {
        if ( !scalar @{ $self->parameters->{'ip-list'} } ) {
            return $self->_no_next;
        }

        my $idx = int( rand( scalar @{ $self->parameters->{'ip-list'} } ) );
        if ( !defined $self->parameters->{'ip-list'}->[$idx] ) {
            return $self->_no_next;
        }

        my $new_ip = $self->parameters->{'ip-list'}->[$idx];
        if ( $self->parameters->{'disallow-repeats'} ) {

            # remove this ip from the list, so it won't be used again
            $self->logger->debug(
qq/Removing $self->parameters->{'ip-list'}->[$idx] from the list/
            ) if $self->logger;
            my @tmp = @{ $self->parameters->{'ip-list'} };
            splice @tmp, $idx, 1;
            $self->parameters->{'ip-list'} = \@tmp;
        }
        return { code => 'OK', value => $new_ip };
    }
}

__PACKAGE__->meta->make_immutable;

1;
