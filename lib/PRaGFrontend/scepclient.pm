package PRaGFrontend::scepclient;

use Crypt::OpenSSL::PKCS10 qw/:const/;
use Crypt::OpenSSL::X509   qw/FORMAT_ASN1 FORMAT_PEM/;
use File::Temp;
use HTTP::Status  qw/:constants :is/;
use HTTP::Request ();
use JSON::MaybeXS ();
use LWP::Protocol::http::SocketUnixAlt;
use LWP::UserAgent;
use Time::HiRes qw/gettimeofday usleep/;

#
# Public
#

sub new {
    my ( $class, %h ) = @_;
    my $self = bless {}, $class;

    $self->{scep_url} = $h{scep_url};
    $self->{name}     = $h{name} || 'RADIUS Generator SCEP client';

    $self->{verify_hostname}    = $h{verify_hostname}    // 0;
    $self->{ssl_ca_certificate} = $h{ssl_ca_certificate} // q{};

    $self->{timeout} = $h{timeout} // 30;

    if ( $h{logger} ) {
        $self->{logger}    = $h{logger};
        $self->{to_logger} = 1;
    }
    else {
        $self->{to_logger} = 0;
        $self->{messages}  = [];
    }
    $self->{debug} = $h{debug} // 0;

    $self->{connect_to} = $h{connect_to} // {};
    $self->{connect_to}->{type} //= 'port';

    return $self;
}

sub get_logs {
    my $self = shift;
    return $self->{messages};
}

sub GetCACert {
    my $self = shift;

    my $res = $self->_make_rest_call(
        where     => '/get-ca-certs',
        post_data => {
            name => $self->{name}
        }
    );

    if ( is_success( $res->code ) ) {
        return {
            state  => 'success',
            result => JSON::MaybeXS->new( utf8 => 1 )->decode( $res->content )
        };
    }

    return { state => 'error', message => $res->content || $res->message };
}

sub enroll {
    my ( $self, %h ) = @_;

    if ( !$h{ca_certificates} || !scalar @{ $h{ca_certificates} } ) {
        return {
            state   => 'error',
            message => 'CA certificates not specified.'
        };
    }

    if ( !$h{csr} ) {
        return { state => 'error', message => 'CSR not specified.' };
    }

    my %post_data = %{ $h{csr} };
    $post_data{ca_certificates} = $h{ca_certificates};
    $post_data{signer}          = $h{signer} || undef;

    my $res = $self->_make_rest_call(
        where     => '/enroll',
        post_data => \%post_data
    );

    if ( is_success( $res->code ) ) {
        return {
            state  => 'success',
            result => JSON::MaybeXS->new( utf8 => 1 )->decode( $res->content )
        };
    }

    return { state => 'error', message => $res->content || $res->message };
}

#
# Private
#

sub _make_rest_call {
    my ( $self, %h ) = @_;

    my $uri = q{};
    if ( $self->{connect_to}->{type} eq 'socket' ) {
        LWP::Protocol::implementor(
            http => 'LWP::Protocol::http::SocketUnixAlt' );
        $uri = 'http:' . $self->{connect_to}->{listen} . q{/};
    }
    else {
        $uri = 'http://' . $self->{connect_to}->{listen};
    }
    $uri .= $h{where};

    my %post_data = ( ( scep_url => $self->{scep_url} ), %{ $h{post_data} } );

    my $json = JSON::MaybeXS->new( utf8 => 1 )->encode( \%post_data );
    my $req  = HTTP::Request->new( 'POST', $uri );
    $req->header( 'Content-Type' => 'application/json' );
    $req->content($json);

    my $ua = LWP::UserAgent->new();
    return $ua->request($req);
}

sub _log {
    my ( $self, %h ) = @_;

    if ( $self->{to_logger} ) {
        $self->{logger}->log(%h);
    }
    else {
        push @{ $self->{messages} },
          {
            type    => $h{type},
            message => $h{message},
            time    => scalar gettimeofday()
          };
    }
}

1;
