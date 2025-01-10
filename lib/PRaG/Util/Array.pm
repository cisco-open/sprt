package PRaG::Util::Array;

use strict;
use warnings;
use Ref::Util            qw/is_arrayref/;
use Math::Random::Secure qw/irand/;

require Exporter;

use base qw(Exporter);

our @EXPORT_OK = qw/is_empty random_item/;

sub is_empty {
    my $a = shift;
    return not( is_arrayref($a) && scalar @{$a} );
}

sub random_item {
    my @list = @_;
    return $list[ irand scalar @list ];
}

1;
