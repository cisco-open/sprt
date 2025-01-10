package PRaGFrontend::guest;

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use plackGen qw/load_user_attributes save_attributes/;

use Encode          qw/encode_utf8/;
use HTTP::Status    qw/:constants/;
use List::MoreUtils qw/firstidx/;
use MIME::Base64    qw/decode_base64 encode_base64/;

hook 'plugin.pragfrontend_plugins_menu.menu_collect' => sub {
    add_menu
      name  => 'my-settings',
      icon  => 'icon-configurations',
      title => 'Settings';

    add_submenu 'my-settings',
      {
        name  => 'sms',
        title => 'SMS Gateway',
        link  => '/guest/sms/',
      };
};

prefix '/guest';

post '/sms/' => sub {
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

get '/sms/examples/' => sub {
    send_as JSON => [
        {
            title  => 'Examples',
            type   => 'header-full',
            values => [
                {
                    type  => 'value',
                    title => 'Like "Inmobile"',
                    value => {
                        url_postfix =>
q{Api/V2/Get/SendMessages?apiKey=111&sendername=SPRT&recipients=$phone$&flash=false&text=$message$},
                        method           => q{get},
                        message_template =>
q{Your account details: Username: $username$ Password: $password$},
                        content_type => 'text/plain',
                    }
                },
                {
                    type  => 'value',
                    title => 'Like "Global Default"',
                    value => {
                        url_postfix =>
q{http/sendmsg?user=USER&password=PASS&api_id=123456&to=$phone$&MO=0&from=654321&text=$message$},
                        method           => q{get},
                        message_template =>
q{Your account details: Username: $username$ Password: $password$},
                        content_type => 'text/plain',
                    }
                },
                {
                    type  => 'value',
                    title => 'Default POST',
                    value => {
                        url_postfix      => q{sms.php},
                        method           => q{post},
                        message_template =>
q{Your account details: Username: $username$ Password: $password$},
                        body_template => q[{
	"phone": "$phone$",
	"message": "$message$"
}],
                        content_type => 'application/json',
                    }
                },
                {
                    type  => 'value',
                    title => 'Default GET',
                    value => {
                        url_postfix =>
                          q{sms.php?phone=$phone$&message=$message$},
                        method           => q{get},
                        message_template =>
q{Your account details: Username: $username$ Password: $password$},
                        body_template => q{},
                        content_type  => 'application/json',
                    }
                },
            ]
        }
    ];
};

get '/sms/**?' => sub {
    if (serve_json) {
        send_as JSON => {
            state => 'success',
            sms   => load_user_attributes('sms'),
        };
    }
    else {
        send_as
          html => template 'sms.tt',
          {
            active    => 'sms',
            title     => 'SMS Gateway',
            pageTitle => 'SMS Gateway',
          };
    }
};

prefix q{/};

1;
