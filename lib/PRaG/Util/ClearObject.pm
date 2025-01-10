package PRaG::Util::ClearObject;

use strict;
use warnings;

use Ref::Util qw/is_hashref is_arrayref is_blessed_ref/;

require Exporter;

use base qw(Exporter);

our @EXPORT = qw/remove_blessed/;

sub remove_blessed {
    my $r = shift;

    if ( is_arrayref($r) ) {
        _clear_array($r);
    }
    elsif ( is_hashref($r) ) {
        _clear_hash($r);
    }

    return $r if defined wantarray;
    return;
}

sub _clear_array {
    my $r = shift;

    @{$r} = grep { not is_blessed_ref($_) } @{$r};

    for my $el ( @{$r} ) {
        remove_blessed($el);
    }

    return;
}

sub _clear_hash {
    my $r = shift;

    for my $k ( keys %{$r} ) {
        if ( is_blessed_ref( $r->{$k} ) ) {
            if ( $r->{$k}->can('as_hashref') ) {
                $r->{$k} = $r->{$k}->as_hashref();
            }
            else { delete $r->{$k}; }
        }
        else {
            remove_blessed( $r->{$k} );
        }
    }

    return;
}

1;
