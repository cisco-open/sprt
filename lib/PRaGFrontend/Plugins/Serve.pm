package PRaGFrontend::Plugins::Serve;

use strict;
use warnings;

$PRaGFrontend::Plugins::Serve::VERSION = '1.0';

use Dancer2::Plugin;

has serve => (
    is      => 'ro',
    writer  => '_set_serve',
    default => sub {
        $_[0]->config->{default_serve} || 'html';
    },
);

plugin_keywords qw/serve_json serve_html/;

sub BUILD {
    my $plugin = shift;

    $plugin->app->add_hook(
        Dancer2::Core::Hook->new(
            name => 'before',
            code => sub {
                my $acpt =
                  $_[0]->request->headers->header('Accept') || 'text/html';
                $plugin->_set_serve(
                    $acpt =~ m{application/json}isxm ? 'json' : 'html' );
            },
        )
    );
    return;
}

sub serve_json {
    my ($plugin) = @_;
    return $plugin->serve eq 'json';
}

sub serve_html {
    my ($plugin) = @_;
    return $plugin->serve eq 'html';
}

1;
