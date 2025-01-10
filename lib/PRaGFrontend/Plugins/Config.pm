package PRaGFrontend::Plugins::Config;

use strict;
use warnings;
use Carp;
use Ref::Util             qw/is_plain_arrayref/;
use PRaG::Util::ENVConfig qw/apply_env_cfg/;

$PRaGFrontend::Plugins::Config::VERSION = '1.0';

use Dancer2::Plugin;

plugin_keywords qw/config_at/;

sub BUILD {
    my $plugin = shift;

    apply_env_cfg( $plugin->app->config );

    return;
}

sub config_at {
    my ( $plugin, $path, $default ) = @_;

    $default //= undef;
    if ( not is_plain_arrayref($path) ) {
        $path = [ split /[.]/sxm, $path ];
    }

    return $default if not scalar @{$path};

    my $found = $plugin->app->config;
    for ( 0 .. $#{$path} ) {
        if ( exists $found->{ $path->[$_] } ) {
            $found = $found->{ $path->[$_] };
        }
        else { return $default; }
    }

    return $found;
}

1;
