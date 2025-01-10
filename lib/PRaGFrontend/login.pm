package PRaGFrontend::login;

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::DB;
use PRaGFrontend::Plugins::Config;

use Crypt::JWT qw(decode_jwt encode_jwt);
use Crypt::PRNG;
use Data::GUID;
use HTTP::Cookies;
use HTTP::Status    qw/:constants/;
use JSON::MaybeXS   ();
use List::MoreUtils qw(firstidx);
use LWP::UserAgent;
use MIME::Base64 qw(encode_base64url);
use English      qw( -no_match_vars );
use Syntax::Keyword::Try;
use URI;
use URI::QueryParam;
use Readonly;

Readonly my $ENCKEY_LENGTH => 24;

sub new {
    my $class = shift;
    my $self  = bless {}, $class;

    return $self;
}

sub login {
    my $self = shift;

    my $uid = $self->_login;
    return if not $uid;
    $self->_is_super;
    return $uid;
}

sub _login {
    my $self = shift;

    if ( my $u = $self->_check_bearer ) {
        $self->{uid} = $u;
        return $u;
    }

    if ( config->{one_user_mode} ) {
        $self->{uid}            = config->{one_user_opts}->{uid};
        $self->{loadedUserName} = config->{one_user_opts}->{givenName};
        return config->{one_user_opts}->{givenName};
    }

    if ( session('uid') && session('givenName') ) {
        $self->{uid}            = session('uid');
        $self->{loadedUserName} = session('givenName');
        return session('givenName');
    }

    logging->debug('Nothing found, redirect for SSO');
    $self->_redirect_to_sso();
    return;
}

sub _is_super {
    my $self = shift;
    if ( config->{one_user_mode} ) {
        $self->{super} = session('super') || config->{one_user_opts}->{super};
    }
    else {
        $self->{super} =
          ( ( firstidx { $_ eq $self->{uid} } @{ config->{supers} } ) >= 0 )
          ? 1
          : 0;
    }
    return;
}

sub _redirect_to_sso {
    my $self = shift;

    if ( config->{external_auth} ) {
        my $jwt_id = session('JWTID') || Data::GUID->guid_string;
        my $enc_key =
          session('ENCKEY') || Crypt::PRNG->new->bytes_b64u($ENCKEY_LENGTH);
        session JWTID  => $jwt_id;
        session ENCKEY => $enc_key;

        logging->debug("Saving $enc_key");

        my $token = encode_jwt(
            payload => {
                key => $enc_key
            },
            key =>
              Crypt::PK::RSA->new( config->{external_auth_opts}->{public} ),
            alg => 'RSA-OAEP',
            enc => 'A192GCM',
            zip => 'deflate'
        );

        logging->debug( 'Sending redirect page to '
              . config->{external_auth_opts}->{host} );
        send_as
          html => template 'auth.tt',
          {
            message => 'You are being redirected to '
              . config->{external_auth_opts}->{host}
              . ', please wait.',
            time   => 3,
            url    => config->{external_auth_opts}->{host} . '/auth/',
            jwt_id => $jwt_id,
            token  => $token
          },
          { layout => undef };
    }
    else {
        my $u = URI->new();
        $u->scheme( config->{proto} );
        $u->host( config->{hostname} );
        $u->path('/auth/login');

        my $state = Data::GUID->guid_string;
        $state =~ s/-//gsxm;
        session state        => $state;
        session requestedURL => request->uri;

        my $client_id = config_at('oauth.client_id');
        my $url =
            'https://sso-dbbfec7f.sso.duosecurity.com/oidc/'
          . $client_id
          . '/authorize';

        my $redirect_url = URI->new($url);

        $redirect_url->query_param( state         => $state );
        $redirect_url->query_param( scope         => 'profile email openid' );
        $redirect_url->query_param( response_type => 'code' );
        $redirect_url->query_param( redirect_uri  => $u->as_string );
        $redirect_url->query_param( client_id => config_at('oauth.client_id') );

        redirect $redirect_url->as_string;
    }

    return;
}

sub givenName {
    my $self = shift;

    return session('givenName') // $self->{loadedUserName};
}

sub _check_bearer {
    my ($self) = @_;

    my $header = request_header 'Authorization';
    if ( $header && $header =~ m/bearer\s+([\d[:lower:]-]+)/isxm ) {
        my $bearer = $1;
        logging->debug( 'Got bearer: ' . $bearer );

        my $query =
            'SELECT "uid" FROM '
          . table('users')
          . q{ WHERE }
          . database->quote_identifier('attributes')
          . q{#>>'{api,token}' = }
          . database->quote($bearer);

        my $r = database->selectall_arrayref( $query, { Slice => {} } );
        return if ( not $r or not scalar @{$r} );

        logging->debug( 'Token belongs to ' . $r->[0]->{uid} );
        $self->{real_user_id} = $r->[0]->{uid};

        return $r->[0]->{uid} . '__api';
    }

    return;
}

1;
