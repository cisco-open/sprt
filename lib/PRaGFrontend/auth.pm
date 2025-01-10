package PRaGFrontend::auth;
use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::Config;
use PRaGFrontend::Plugins::Serve;

use Crypt::JWT qw/decode_jwt encode_jwt/;
use Crypt::OpenSSL::X509;
use Crypt::PK::RSA;
use HTTP::Status  qw/:constants/;
use MIME::Base64  qw/decode_base64url encode_base64url/;
use Ref::Util     qw/is_plain_hashref/;
use JSON::MaybeXS ();
use LWP::UserAgent;
use URI;
use URI::QueryParam;
use HTTP::Request::Common;

prefix '/auth';

get '/session/:session_id/' => sub {
    my $back = query_parameters->get('back');
    my $t    = query_parameters->get('token');

    debug $t;
    my $data = decode_jwt(
        token => $t,
        key   => Crypt::PK::RSA->new( config_at('external_auth_opts.private') ),
    );
    debug to_dumper($data);
    debug 'ENCKEY: '
      . length( decode_base64url( $data->{key} ) ) . ' - '
      . decode_base64url( $data->{key} );

    session 'REDIRECT_BACK'    => $back;
    session 'REDIRECT_SESSION' => route_parameters->get('session_id');
    session 'REDIRECT_ENC'     => $data->{key};

    if ( vars->{login}->login() ) {
        forward '/auth/redirect/';
    }
};

get '/redirect/' => sub {
    my $back = session('REDIRECT_BACK');
    my $ssid = session('REDIRECT_SESSION');
    my $key  = session('REDIRECT_ENC');

    session 'REDIRECT_BACK'    => undef;
    session 'REDIRECT_SESSION' => undef;
    session 'REDIRECT_ENC'     => undef;

    my $jwt = encode_jwt(
        payload => {
            status    => 'ok',
            uid       => session('uid'),
            givenName => session('givenName'),
            session   => $ssid,
        },
        key => decode_base64url($key),
        alg => 'A192GCMKW',
        enc => 'A192GCM',
        zip => 'deflate'
    );

    redirect $back. '/auth/jwt/' . $jwt . q{/};
};

get '/jwt/:jwt/' => sub {

    # JWTID
    # ENCKEY
    debug 'JWTID: ' . session('JWTID');
    debug 'ENCKEY: ' . session('ENCKEY');
    my $key  = decode_base64url( session('ENCKEY') );
    my $data = decode_jwt( token => route_parameters->get('jwt'), key => $key );

    if ( is_plain_hashref($data) && $data->{session} eq session('JWTID') ) {
        session JWTID     => undef;
        session ENCKEY    => undef;
        session uid       => $data->{uid};
        session givenName => $data->{givenName};
        redirect q{/};
    }
    elsif ( is_plain_hashref($data) && $data->{session} ne session('JWTID') ) {
        send_error( 'Wrong session, try again.', HTTP_BAD_REQUEST );
    }
    else {
        send_error( q{Couldn't decode JWT.}, HTTP_INTERNAL_SERVER_ERROR );
    }
    return;
};

get '/anonym/' => sub {
    session uid         => 'anonymous';
    session givenName   => 'Anonymous';
    session displayName => 'Anonymous';
    redirect q{/};
};

get '/login' => sub {
    my $state = query_parameters->get('state');
    my $code  = query_parameters->get('code');

    if ( !session('state') || !$state || !$code || $state ne session('state') )
    {
        send_error( 'Wrong session data.', HTTP_BAD_REQUEST );
        return;
    }

    my $client_id     = config_at('oauth.client_id');
    my $client_secret = config_at('oauth.secret');

    my $u = URI->new();
    $u->scheme( config->{proto} );
    $u->host( config->{hostname} );
    $u->path('/auth/login');

    my $body = {
        grant_type    => 'authorization_code',
        code          => $code,
        redirect_uri  => $u->as_string,
        client_id     => $client_id,
        client_secret => $client_secret,
    };

    my $ua = LWP::UserAgent->new( timeout => 10 );
    $ua->env_proxy;

    my $req =
        POST 'https://sso-dbbfec7f.sso.duosecurity.com/oidc/'
      . $client_id
      . '/token', $body;

    my $response = $ua->request($req);

    logging->debug( 'SSO data response: ' . $response->status_line );

    if ( !$response->is_success ) {
        logging->warn( 'SSO data error: ' . $response->decoded_content );
        send_error( $response->message, $response->code );
        return;
    }

    my $sso_data =
      JSON::MaybeXS->new( utf8 => 1 )->decode( $response->decoded_content );
    my $access_token = $sso_data->{access_token};

    my $req_uri =
      URI->new( 'https://sso-dbbfec7f.sso.duosecurity.com/oidc/'
          . $client_id
          . '/userinfo' );
    $req_uri->query_param( access_token => $access_token );

    $response = $ua->request(
        HTTP::Request->new(
            GET => $req_uri->as_string,
            [
                'Accept'        => 'application/json',
                'Authorization' => 'Bearer ' . $access_token
            ]
        )
    );

    logging->debug( 'User Data response: ' . $response->status_line );

    if ( !$response->is_success ) {
        logging->warn( 'User Data error: ' . $response->decoded_content );
        send_error( $response->message, $response->code );
        return;
    }

    my $user_data =
      JSON::MaybeXS->new( utf8 => 1 )->decode( $response->decoded_content );

    session uid       => $user_data->{user};
    session givenName => $user_data->{given_name};
    session displayName => $user_data->{given_name} . q{ }
      . $user_data->{family_name};

    my $redirect = session('requestedURL') || q{/};
    session requestedURL => undef;
    session state        => undef;

    redirect $redirect;
};

post '/login/' => sub {
    if ( !config_at( 'one_user_mode', undef ) ) {
        send_error( 'Only for one user mode.', HTTP_FORBIDDEN );
    }

    my $pass = body_parameters->get('password');
    if ( $pass ne config_at( 'one_user_opts.super_pass', q{} ) ) {

        send_error( 'Forbidden.', HTTP_FORBIDDEN );
    }

    session super => 1;

    if (serve_json) {
        send_as JSON => { status => 'ok' };
    }
    else {
        redirect q{/};
    }
};

get '/logout/' => sub {
    if ( config_at( 'one_user_mode', undef ) ) {
        session->delete('super');
    }
    else {
        session->delete('uid');
        session->delete('givenName');
        session->delete('displayName');
    }
    redirect q{/};
};

prefix q{/};

1;
