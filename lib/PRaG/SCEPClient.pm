package PRaG::SCEPClient;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use JSON::MaybeXS;
use LWP::UserAgent;
use LWP::Protocol::http::SocketUnixAlt;
use HTTP::Status qw/:constants :is/;

# Logging engine
has 'logger' => ( is => 'ro', isa => 'Maybe[logger]' );

# Put error in here
has 'error' => (
    is      => 'ro',
    isa     => 'Str',
    writer  => '_set_error',
    clearer => '_no_error'
);

# SCEP URL
has 'url' => ( is => 'rw', isa => 'Str' );

# SCEP Client name
has 'name' => ( is => 'rw', isa => 'Str' );

# CSR content
has 'csr' => ( is => 'rw', isa => 'HashRef' );

# Signer data
has 'signer' => ( is => 'rw', isa => 'HashRef' );

# CA certificates chain
has 'ca_certificates' => ( is => 'rw', isa => 'ArrayRef' );

# Timeout for requests
has 'timeout' => ( is => 'rw', isa => 'Int', default => 10 );

# Connection options
has 'connect_to' => ( is => 'rw', isa => 'HashRef' );

sub BUILD {
    my $self = shift;

    $self->_no_error;
    $self->connect_to->{type} //= 'port';
    return;
}

sub enroll {
    my $self = shift;

    if ( !$self->ca_certificates || !scalar @{ $self->ca_certificates } ) {
        $self->_set_error('CA certificates not specified.');
        return;
    }

    if ( !$self->csr ) {
        $self->_set_error('CSR not specified.');
        return;
    }

    my %post_data = %{ $self->csr };
    $post_data{ca_certificates} = $self->ca_certificates;
    $post_data{signer}          = $self->signer;

    my $res =
      $self->_make_rest_call( where => '/enroll', post_data => \%post_data );

    my $json_obj = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );
    is_success( $res->code ) and return $json_obj->decode( $res->content );

    $self->_set_error( $res->content || $res->message );
    return;
}

sub _make_rest_call {
    my $self = shift;
    my %h    = @_;

    my $uri = '';
    if ( $self->connect_to->{type} eq 'socket' ) {
        LWP::Protocol::implementor(
            http => 'LWP::Protocol::http::SocketUnixAlt' );
        $uri = 'http:' . $self->connect_to->{listen} . '/';
    }
    else {
        $uri = 'http://' . $self->connect_to->{listen};
    }
    $uri .= $h{where};

    my %post_data = ( ( scep_url => $self->url ), %{ $h{post_data} } );

    my $json_obj = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );
    my $json     = $json_obj->encode( \%post_data );
    my $req      = HTTP::Request->new( 'POST', $uri );
    $req->header( 'Content-Type' => 'application/json' );
    $req->content($json);

    my $ua = LWP::UserAgent->new( timeout => $self->timeout );
    return $ua->request($req);
}

__PACKAGE__->meta->make_immutable;

1;
