package PRaGFrontend::Plugins::Menu;

use utf8;
use strict;
use warnings;
use List::MoreUtils qw/firstidx/;

$PRaGFrontend::Plugins::Menu::VERSION = '1.0';

use Dancer2::Plugin;
use PRaGFrontend::Plugins::Serve;

has 'menu' => ( is => 'ro', writer => '_set_menu', plugin_keyword => 1 );

plugin_hooks 'menu_collect';

sub BUILD {
    my $plugin = shift;

    $plugin->app->add_hook(
        Dancer2::Core::Hook->new(
            name => 'before_template_render',
            code => sub {
                my $tokens = shift;
                return if serve_json;
                $plugin->reset_menu;
                $tokens->{side_menu} //= [];
                push @{ $tokens->{side_menu} }, @{ $plugin->menu };
            }
        )
    );
    return;
}

sub add_menu : PluginKeyword {
    my ( $plugin, %opts ) = @_;

    return if ( !%opts || !scalar keys %opts );
    return if ( !$opts{name} || !$opts{icon} || !$opts{title} );
    return
      if ( ( firstidx { $_->{name} eq $opts{name} } @{ $plugin->menu } ) >= 0 );

    push @{ $plugin->menu }, \%opts;
    return;
}

sub add_submenu : PluginKeyword {
    my ( $plugin, $parent, @values ) = @_;

    return if ( !$parent || !scalar @values );
    return if ( !defined( my $c = $plugin->children_of($parent) ) );

    push @{$c}, @values;
    return;
}

sub children_of {
    my ( $plugin, $parent ) = @_;

    my $idx = firstidx { $_->{name} eq $parent } @{ $plugin->menu };
    return if ( $idx < 0 );

    $plugin->menu->[$idx]->{children} //= [];
    return $plugin->menu->[$idx]->{children};
}

sub reset_menu : PluginKeyword {
    my ($plugin) = @_;
    if ( $plugin->menu ) {
        $plugin->_set_menu(undef);
    }
    $plugin->_set_menu( [] );
    $plugin->execute_plugin_hook('menu_collect');
    return;
}

1;
