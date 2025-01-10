package PRaGFrontend::Plugins::User;

use strict;
use warnings;
use Data::GUID;
use Data::Dumper;

$PRaGFrontend::Plugins::User::VERSION = '1.0';

use Dancer2::Plugin;
use Dancer2::Plugin::Database;
use HTTP::Status qw/:constants/;
use Readonly;
use PRaGFrontend::Plugins::Config;

has 'uid'      => ( is => 'ro', writer => '_set_uid',      default => undef );
has 'real_uid' => ( is => 'ro', writer => '_set_real_uid', default => undef );
has 'givenName' =>
  ( is => 'ro', writer => '_set_given_name', default => undef );
has 'super'     => ( is => 'ro', writer => '_set_super',  default => undef );
has 'logged_in' => ( is => 'ro', writer => '_set_logged', default => 0 );

has '_super_acts' =>
  ( is => 'ro', writer => '_set_super_acts', default => sub { {} } );

plugin_keywords qw/user is_super user_logged_in user_allowed super_only/;

sub BUILD {
    my $plugin = shift;

    $plugin->app->add_hook(
        Dancer2::Core::Hook->new(
            name => 'before_template_render',
            code => sub {
                my $tokens = shift;
                if ( $plugin->logged_in ) {
                    $tokens->{user} = $plugin->givenName;
                    $tokens->{displayName} =
                         $plugin->dsl->session('displayName')
                      || $plugin->givenName;
                    $tokens->{username}   = $plugin->uid;
                    $tokens->{super_user} = $plugin->is_super;
                    $tokens->{one_user}   = config_at( 'one_user_mode', 0 );
                }
            }
        )
    );

    return;
}

sub user {
    return shift;
}

sub user_logged_in {
    my ( $plugin, $login ) = @_;

    $plugin->_set_uid( $login->{uid} );
    $plugin->_set_real_uid( $login->{real_user_id} || $login->{uid} );
    $plugin->_set_given_name( $login->givenName() );
    $plugin->_set_super( $login->{super} ? 1 : 0 );
    $plugin->_set_logged(1);
    return;
}

sub is_super {
    return shift->super;
}

sub user_allowed {
    my ( $plugin, $action, %opts ) = @_;
    $opts{throw_error} //= 0;
    $opts{message}     //= 'Forbidden';

    my $allow = $plugin->_super_acts->{$action} ? $plugin->is_super : 1;

    if ( !$allow && $opts{throw_error} ) {
        $plugin->dsl->send_error( $opts{message}, HTTP_FORBIDDEN );
        return;
    }
    return $allow;
}

sub super_only {
    my ( $plugin, @actions ) = @_;
    foreach my $a (@actions) {
        $plugin->_super_acts->{$a} = 1;
    }
    return;
}

sub owners {
    my ( $plugin, $of ) = @_;

    $of //= $plugin->uid;
    my @parts = split /__/sxm, $of;
    return [ $parts[0], $parts[0] . '__api' ];
}

sub join_owners {
    my ( $plugin, $of ) = @_;
    return join q{,}, map { database->quote($_) } @{ $plugin->owners($of) };
}

1;
