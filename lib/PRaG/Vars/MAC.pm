package MAC;

use strict;
use warnings;

use Carp;

#constructor. Takes 1 argument besides the Class name, a MAC address separated by colons(:)
# returns an object ref
sub new {
    my ( $class, $mac ) = @_;
    my $self = bless( [], $class );
    @{$self} = split( ':', $mac );
    unless ( $#{$self} == 5 ) {
        carp "failure to create MAC Object: address not composed of 6 bytes";
        return;
    }
    my $c = 0;
    foreach my $byte ( @{$self} ) {

        #check for proper input values
        unless ( $byte =~ /[0-9a-fA-F]{2}/ ) {
            carp "failure creating MAC Object: invalid address";
            return;
        }

    #convert it to decimal, borrowed straight from the source of Data::Translate
        $byte = ord( unpack( "A", pack( "H*", $byte ) ) );
        @{$self}[$c] = $byte;
        $c++;
    }
    return $self;
}

#takes no arguments. returns the mac address in decimal format, mostly for reference
sub showdec {
    my $self = shift;
    return join( ":", @{$self} );
}

#takes no arguments. returns the mac address in hexadecimal format
sub showhex {
    my $self = shift;
    return $self->_dectohex;
}

#increases the mac address by argument. returns the newly increased address in hexadecimal format
sub increase {
    my ( $self, $increase ) = @_;
    unless ( $increase =~ /^\d+$/ ) {
        carp "argument to \'increase\' must be a positive integer";
        return;
    }
    $$self[5] += $increase;
    for ( my $c = 5 ; $c >= 1 ; $c-- ) {
        while ( $$self[$c] > 255 ) {
            $$self[$c] -= 256;
            $$self[ $c - 1 ] += 1;
        }
    }
    return $self->_dectohex;
}

#decreases the mac address by argument. returns the newly decreased address in hexadecimal format
sub decrease {
    my ( $self, $decrease ) = @_;
    unless ( $decrease =~ /^\d+$/ ) {
        carp "argument to \'decrease\' must be a positive integer";
        return;
    }
    $$self[5] -= $decrease;
    for ( my $c = 5 ; $c >= 1 ; $c-- ) {
        while ( $$self[$c] < 0 ) {
            $$self[$c] += 256;
            $$self[ $c - 1 ] -= 1;
        }
    }
    return $self->_dectohex;
}

sub _dectohex {
    my $self = shift;
    my @hexmac;
    my $c = 0;
    foreach my $byte ( @{$self} ) {

      #convert to hex, this also borrowed (almost) straight from Data::Translate
        $hexmac[$c] = sprintf( "%02X", $byte );
        $c++;
    }
    return join( ":", @hexmac );
}

1;
