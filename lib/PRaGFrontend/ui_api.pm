package PRaGFrontend::ui_api;

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use PRaGFrontend::Plugins::DB;

use HTTP::Status qw/:constants/;

prefix '/api/ui';

get q{/menu/} => sub {

    # if ( !serve_json ) {
    #     send_error( 'Incorrect headers', HTTP_BAD_REQUEST );
    #     return;
    # }

    reset_menu;
    send_as JSON => { menu => menu, state => 'success' };
};

put q{/theme/} => sub {
    my $new_theme = body_parameters->get('theme');
    if ( $new_theme ne 'default' and $new_theme ne 'dark' ) {
        send_error( 'Incorrect payload: ' . $new_theme, HTTP_BAD_REQUEST );
        return;
    }

    update_theme($new_theme);
    send_as JSON => { state => 'success', };
};

sub update_theme {
    my $theme = shift;
    logging->debug( 'Updating theme with ' . $theme );

    my $j     = JSON::MaybeXS->new( { allow_nonref => 1 } );
    my $query = sprintf q{jsonb_set("attributes", '{"ui"}', }
      . q{%s::jsonb,true)},
      database->quote( $j->encode( { theme => $theme } ) );

    database->quick_update(
        table('users'),
        { uid        => user->uid },
        { attributes => \$query }
    );
    return 1;
}

1;
