package PRaGFrontend::pxgrid;

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use PRaGFrontend::Plugins::Config;

use Crypt::JWT qw/encode_jwt/;
use Data::Dumper;
use Encode  qw/encode_utf8/;
use English qw( -no_match_vars );
use Exporter 'import';
use HTTP::Request   ();
use HTTP::Status    qw/:constants/;
use JSON::MaybeXS   ();
use List::MoreUtils qw/firstidx/;
use LWP::UserAgent;
use MIME::Base64 qw/decode_base64 encode_base64/;
use Readonly;
use Ref::Util qw/is_ref/;
use Syntax::Keyword::Try;
use URI;

Readonly my $PREFIX => '/pxgrid';

our @EXPORT_OK = qw/make_rest_call/;

hook 'plugin.pragfrontend_plugins_menu.menu_collect' => sub {
    if ( !config->{pxgrid} ) { return; }

    add_menu
      name  => 'pxgrid',
      icon  => 'icon-data-usage',
      title => 'pxGrid',
      link  => $PREFIX . q{/};
};

prefix $PREFIX;

get q{/?} => sub {
    if ( !config->{pxgrid} ) {
        send_error( q/pxGrid not configured/, HTTP_NOT_IMPLEMENTED );
    }

    send_as
      html => template 'pxgrid.tt',
      {
        active    => 'pxgrid',
        title     => 'pxGrid',
        pageTitle => 'pxGrid',
      };
};

any [ 'get', 'post', 'patch', 'del' ] => '/**?' => sub {
    if ( !serve_json ) { forward $PREFIX. q{/}, { forwarded => 1 }; }
    prepare_jwt();
    pass;
};

get '/get-connections/' => sub {
    forward $PREFIX. '/connections/get-connections';
};

prefix $PREFIX. q{/connections};

any [ 'get', 'post', 'patch', 'del' ] => '/**?' => sub {
    my $res = make_rest_call(
        method => request->request_method,
        call   => request->path =~ s/^$PREFIX//sxmr,
        data   => request->content || undef
    );

    try {
        send_as JSON =>
          JSON::MaybeXS->new( utf8 => 1 )->decode( encode_utf8($res) );
    }
    catch {
        send_file \$res, content_type => 'application/json';
    };
};

prefix q{/};

sub prepare_jwt {
    my $u = {
        'uid'      => user->uid,
        'cn'       => user->givenName,
        'provider' => 'cisco'
    };

    var pxgrid_jwt => encode_jwt(
        payload => $u,
        alg     => 'HS256',
        key     => config_at('pxgrid.token')
    );

    return;
}

sub make_rest_call {
    my $h = {@_};

    logging->debug( 'Doing pxGrid REST: ' . $h->{call} );
    my $uri = URI->new( $h->{call} );
    $uri->scheme('http');
    $uri->host( config_at('pxgrid.address') );

    my $req = HTTP::Request->new( $h->{method} => $uri->as_string );
    $req->header( 'Content-Type' => request->content_type
          || 'application/json' );
    $req->header( 'Accept'   => 'application/json' );
    $req->header( 'SPRT-JWT' => var 'pxgrid_jwt' );

    if ( $h->{data} ) {
        $req->content(
            is_ref( $h->{data} )
            ? encode_utf8(
                JSON::MaybeXS->new( utf8 => 1 )->encode( $h->{data} )
              )
            : $h->{data}
        );
    }

    logging->debug( 'pxGrid request: ' . $req->as_string );
    my $ua       = LWP::UserAgent->new($req);
    my $response = $ua->request($req);

    if ( !$response->is_success ) {
        if ( $h->{no_send} ) { return; }
        logging->error( "Error from pxGrider:\n"
              . $response->status_line . "\n"
              . $response->decoded_content );
        logging->error( "Request:\n" . $response->request->as_string );

        status $response->code;
        my $d = $response->content;
        send_file( \$d, content_type => $response->content_type );
        return;
    }

    return $response->decoded_content;
}

1;
