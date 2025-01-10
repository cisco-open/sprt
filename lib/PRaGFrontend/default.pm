package PRaGFrontend::default;
use Dancer2 appname => 'plackGen';

prefix q{/};

any qr{.*} => sub {
    #
    # Default route
    #
    send_error( 'Path <strong>' . request->path . '</strong> not found.', 404 );
};

1;
