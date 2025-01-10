package PRaG::Util::Brew;

use strict;
use warnings;

use FindBin;

require Exporter;

use base qw(Exporter);

our @EXPORT    = qw/brewcron_with/;
our @EXPORT_OK = qw/brewcron/;

sub brewcron {
    my $BREW_CRON = q{};
    if ( $ENV{'PERLBREW_HOME'} ) {
        $BREW_CRON = "$FindBin::Bin/perlbrew-cron ";
    }
    return $BREW_CRON;
}

sub brewcron_with {
    my $BREW_CRON = brewcron();
    if ( $BREW_CRON and $ENV{'PERLBREW_PERL'} ) {
        $BREW_CRON .= q/--with / . $ENV{'PERLBREW_PERL'} . q/ /;
    }
    return $BREW_CRON;
}

1;
