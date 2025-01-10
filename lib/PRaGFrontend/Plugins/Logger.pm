package PRaGFrontend::Plugins::Logger;

use strict;
use warnings;
use Data::GUID;
use Data::Dumper;
use logger;

$PRaGFrontend::Plugins::Logger::VERSION = '1.0';

use Dancer2::Plugin;

has _logger =>
  ( is => 'ro', writer => '_set_logger', plugin_keyword => 'logging', );
has debug => ( is => 'rw', default => 0 );

plugin_keywords qw/set_logger set_log_level set_log_owner/;

sub BUILD {
    my $plugin = shift;

    $plugin->debug( $plugin->app->config->{debug} );
    $plugin->set_log_owner( '_nologin', 1 );
    return;
}

sub set_logger {
    my ( $plugin, $new_logger ) = @_;
    $plugin->_set_logger($new_logger);
    return;
}

sub set_log_level {
    my ( $plugin, $new_level ) = @_;
    $plugin->_logger->set_level($new_level);
    if ( uc $new_level eq 'DEBUG' || uc $new_level eq 'TRACE' ) {
        $plugin->debug(1);
    }
    else { $plugin->debug(0); }
    return;
}

sub set_log_owner {
    my ( $plugin, $new_owner, $recreate_logger ) = @_;
    $recreate_logger //= 1;

    if ($recreate_logger) {
        $plugin->_set_logger(
            logger->new(
                'log-parameters' => \scalar( $plugin->app->config->{log4perl} ),
                owner            => $new_owner,
                chunk            => Data::GUID->guid_string,
                debug            => $plugin->debug,
                syslog           => $plugin->app->config->{syslog},
            )
        );
    }
    else {
        $plugin->_logger->{owner} = $new_owner;
    }
    return;
}

1;
