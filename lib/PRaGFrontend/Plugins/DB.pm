package PRaGFrontend::Plugins::DB;

use strict;
use warnings;
use Carp;

$PRaGFrontend::Plugins::DB::VERSION = '1.0';

use Dancer2::Plugin;

plugin_keywords qw/table sessions_table/;

sub table {
    my ( $plugin, $wanted ) = @_;

    if ( exists $plugin->app->config->{tables}->{$wanted} ) {
        return $plugin->app->config->{tables}->{$wanted};
    }

    croak qq/No mapping for '$wanted' exists./;
}

sub sessions_table {
    my ( $plugin, $proto ) = @_;
    return table( $plugin, 'sessions' )        if $proto eq 'radius';
    return table( $plugin, 'tacacs_sessions' ) if $proto eq 'tacacs';

    croak qq/Unknown proto '$proto'./;
}

1;
