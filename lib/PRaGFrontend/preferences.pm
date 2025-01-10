package PRaGFrontend::preferences;

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use PRaGFrontend::Plugins::Config;
use PRaGFrontend::Plugins::DB;
use plackGen qw/save_attributes load_user_attributes/;

use HTTP::Status    qw/:constants/;
use JSON::MaybeXS   ();
use List::MoreUtils qw/firstidx/;
use MIME::Base64;
use Data::GUID;

hook 'plugin.pragfrontend_plugins_menu.menu_collect' => sub {
    add_menu
      name  => 'my-settings',
      icon  => 'icon-configurations',
      title => 'Settings';

    add_submenu 'my-settings',
      {
        name  => 'preferences',
        title => 'Generation Defaults',
        link  => '/preferences/',
      };

    add_submenu 'my-settings',
      {
        name  => 'api-settings',
        title => 'API',
        link  => '/api-settings/',
      };
};

prefix q{/};
get '/settings/?' => sub {
    send_as
      html => template 'settings.tt',
      {
        active    => 'my-settings',
        title     => 'Settings',
        pageTitle => 'Settings',
      };
};

prefix '/preferences';
get '/versions/:version?' => sub {
    my $versions = load_user_attributes('versions');

    send_as JSON => $versions->{ route_parameters->get('version') }
      // { skip => false };
};

put '/versions/:version' => sub {
    my $version = route_parameters->get('version');
    my $skip    = body_parameters->get('skip') ? 1 : 0;
    save_attributes( { versions => { $version => { skip => $skip } } } );
    status 'no_content';
};

get '/**?' => sub {
    #
    # Main preferences page
    #
    logging->debug('Main preferences page requested');
    if (serve_json) {
        send_as JSON => {
            state       => 'success',
            preferences => load_preferences(),
        };
    }
    else {
        send_as
          html => template 'preferences.tt',
          {
            active      => 'preferences',
            title       => 'Preferences',
            pageTitle   => 'User Preferences',
            preferences => load_preferences(),
          };
    }
};

put '/save/' => sub {
    my $data = body_parameters->get('data');
    if ( !$data ) {
        my $item    = body_parameters->get('item');
        my $value   = body_parameters->get('value');
        my $section = body_parameters->get('section');
        if ( !$item || !$section ) {
            send_error( 'No data provided', HTTP_BAD_REQUEST );
            return;
        }
        $data->{$section} = { $item => $value };
    }

    save_attributes($data);

    send_as JSON => { 'state' => 'ok' };
};

prefix '/api-settings';
get '/token' => sub {
    if ( !config_at( 'one_user_mode', undef ) ) {
        send_error( 'Cannot be used in multi-user mode', HTTP_CONFLICT );
        return;
    }

    my $header = request->header('Authorization');
    my $u      = config_at( 'one_user_opts.uid',        q{} );
    my $p      = config_at( 'one_user_opts.super_pass', q{} );

    my ( $auth_method, $auth_string ) = split( q/ /, $header );
    if ( lc($auth_method) ne 'basic' ) {
        send_error( 'Bad credentials', HTTP_UNAUTHORIZED );
        return;
    }

    my ( $username, $password ) = split( q/:/, decode_base64($auth_string), 2 );
    if ( ( $username ne $u ) || ( $password ne $p ) ) {
        send_error( 'Bad credentials', HTTP_UNAUTHORIZED );
        return;
    }

    my $sts   = load_api_settings();
    my $token = $sts->{token};
    if ( !$token ) {
        $token = Data::GUID->guid_string;
        update_token($token);
    }

    send_as JSON => { 'token' => $token };
};

get '/**?' => sub {
    #
    # Main preferences page
    #
    logging->debug('API settings page');
    if (serve_json) {
        send_as JSON => {
            state       => 'success',
            preferences => load_api_settings(),
        };
    }
    else {
        send_as
          html => template 'react.tt',
          {
            active    => 'api-settings',
            ui        => 'api_settings',
            title     => 'API',
            pageTitle => 'API Settings'
          };
    }
};

put q{/} => sub {
    my $enabled = body_parameters->get('enabled');
    if ($enabled) {
        my $token = body_parameters->get('token');
        update_token($token);
    }
    else {
        remove_token();
    }

    send_as JSON => { state => 'success', };
};

prefix q{/};

sub load_preferences {
    my $row = database->quick_select(
        config->{tables}->{users},
        { uid     => user->uid },
        { columns => ['attributes'] }
    );

    my $j = JSON::MaybeXS->new( { allow_nonref => 1 } );
    return $j->decode( $row->{attributes} ) if ( $row && $row->{attributes} );
    return {};
}

sub load_api_settings {
    my $query =
        q{SELECT "attributes"#>'{api}' as settings FROM }
      . database->quote_identifier( table('users') )
      . q{ WHERE }
      . database->quote_identifier('uid') . ' = '
      . database->quote( user->uid );

    my $r = database->selectall_arrayref( $query, { Slice => {} } );
    return {} if ( not $r or not scalar @{$r} );

    my $j = JSON::MaybeXS->new( { allow_nonref => 1 } );
    return $j->decode( $r->[0]->{settings} )
      if ( $r->[0] && $r->[0]->{settings} );
    return {};
}

sub update_token {
    my $token = shift;
    logging->debug( 'Updating token with ' . $token );

    my $j     = JSON::MaybeXS->new( { allow_nonref => 1 } );
    my $query = sprintf q{jsonb_set("attributes", '{"api"}', }
      . q{%s::jsonb,true)},
      database->quote( $j->encode( { token => $token } ) );

    database->quick_update(
        table('users'),
        { uid        => user->uid },
        { attributes => \$query }
    );
    return 1;
}

sub remove_token {
    logging->debug('Removing token');

    my $query = database->quote_identifier('attributes') . q{ - 'api'};

    database->quick_update(
        table('users'),
        { uid        => user->uid },
        { attributes => \$query }
    );
    return 1;
}

1;
