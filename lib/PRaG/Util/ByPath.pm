package PRaG::Util::ByPath;

use strict;
use warnings;

use Ref::Util qw/is_plain_arrayref is_plain_hashref/;

require Exporter;

use base qw(Exporter);

our @EXPORT    = qw/get_by_path/;
our @EXPORT_OK = qw/get_by_path/;

sub get_by_path {
    my ( $o, $path, $default ) = @_;
    my @a = split /[.]/sxm, $path;
    $default //= undef;

    foreach my $k (@a) {
        if (   ( is_plain_arrayref($o) && defined $o->[$k] )
            || ( is_plain_hashref($o) && exists $o->{$k} ) )
        {
            $o = is_plain_arrayref($o) ? $o->[$k] : $o->{$k};
        }
        else {
            return $default;
        }
    }
    return $o;
}

1;
