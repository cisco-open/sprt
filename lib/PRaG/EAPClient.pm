package PRaG::EAPClient;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use AnyEvent;
use AnyEvent::Handle;
use Data::Dumper;
use Data::HexDump;
use Time::HiRes qw/gettimeofday usleep/;
use Readonly;
use Ref::Util qw/is_plain_arrayref is_plain_hashref/;

Readonly my $RADIUS_PACKET_SENT => 1;
Readonly my $RADIUS_PACKET_RCVD => 2;
Readonly my $EAP_HEADER_LENGTH  => 4;

our $EAP_REQUEST;
our $EAP_RESPONSE;
our $EAP_SUCCESS;
our $EAP_FAILURE;
our %EAP_CODES;
our %EAP_TYPES;

Readonly $EAP_REQUEST  => 1;
Readonly $EAP_RESPONSE => 2;
Readonly $EAP_SUCCESS  => 3;
Readonly $EAP_FAILURE  => 4;

Readonly %EAP_CODES => (
    '1' => 'request',
    '2' => 'response',
    '3' => 'success',
    '4' => 'failure',
);

Readonly %EAP_TYPES => (
    1  => 'identity',
    2  => 'notification',
    3  => 'nak',
    4  => 'md5_challenge',
    5  => 'otp',
    6  => 'gtc',
    13 => 'tls',
    25 => 'peap',
    26 => 'mschapv2',
    29 => 'peapv0_mschapv2',
);

Readonly my $ATTR_NAME => 'EAP-Message';

has 'server' => ( is => 'ro', isa => 'AnyEvent::Handle', required => 1 );
has 'logger' => ( is => 'ro', isa => 'logger' );

# Events
my $events =
  [qw/on_challenge on_response on_success on_reject on_packet on_error/];
has $events => ( is => 'rw', isa => 'Maybe[CodeRef]', default => undef );
has 'event_catcher' => (
    is      => 'rw',
    isa     => 'Maybe[Object]',
    default => undef,
    clearer => 'clear_catcher',
);

my %events_fallback = (
    'on_success'   => [qw/on_response/],
    'on_reject'    => [qw/on_response/],
    'on_challenge' => [qw/on_response/],
);

require Exporter;

use base qw(Exporter);

Readonly my @CONST_NAMES => qw/
  $EAP_REQUEST
  $EAP_RESPONSE
  $EAP_SUCCESS
  $EAP_FAILURE
  %EAP_CODES
  %EAP_TYPES
  /;

our @EXPORT_OK   = qw/parse_eap/;
our %EXPORT_TAGS = ( const => \@CONST_NAMES );
Exporter::export_ok_tags('const');

sub request {
    my ( $self, %h ) = @_;

    return $self->logger->error('Nothing to send')
      if ( !$h{to_send} || !is_plain_arrayref( $h{to_send} ) );

    $self->logger->debug(
        'RADIUS attributes: ' . join qq{\n},
        map {
            $_->{Name} eq $ATTR_NAME
              ? Dumper(
                {
                    Name  => $_->{Name},
                    Value => qq{\n} . HexDump( $_->{Value} )
                }
              )
              : Dumper($_)
        } @{ $h{to_send} }
    );

    my $data = join q{},
      map { $_->{Value} } grep { $_->{Name} eq $ATTR_NAME } @{ $h{to_send} };

    $self->logger->debug( "Raw EAP packet:\n" . HexDump($data) );

    $self->logger->debug('Writing EAP to handle');
    $self->server->push_write($data);

    $self->_process_response( $self->recv_eap );
    return;
}

sub recv_eap {
    my ($self) = @_;

    $self->logger->debug('Reading EAP from handle');
    my $cv = AnyEvent->condvar;

    $self->server->push_read(
        chunk => $EAP_HEADER_LENGTH,
        sub {
            # header arrived, decode
            my $header = $_[1];
            my ( undef, undef, $len ) = parse_eap( $header, header => 1 );

            # now read the payload
            shift->push_read(
                chunk => $len - $EAP_HEADER_LENGTH,
                sub {
                    $cv->send( $header . $_[1] );
                }
            );
        }
    );

    my $buf = $cv->recv;

    return $buf;
}

sub done {
    my $self = shift;
    $self->clear_catcher;
    if ( $self->server ) {
        return $self->server->push_shutdown();
    }
    return;
}

sub _process_response {
    my ( $self, $response ) = @_;

    my $event = 'on_response';

    my ( $code, $id, $len ) = parse_eap( $response, header => 1 );
    if ( $code == $EAP_SUCCESS ) { $event = 'on_success'; }
    if ( $code == $EAP_FAILURE ) { $event = 'on_reject'; }

    $self->_event(
        'on_packet',
        type   => $RADIUS_PACKET_RCVD,
        packet => $response,
        time   => scalar gettimeofday(),
    );
    $self->_event( $event,
        response => [ { Name => $ATTR_NAME, Value => $response } ] );

    return;
}

sub _event {
    my $self  = shift;
    my $event = shift;
    my @data  = @_;

    # execute event is set
    if ( $self->$event and $self->event_catcher ) {
        my $e_coderef = $self->$event;
        return $self->event_catcher->$e_coderef(@data);
    }

    # go through fallbacks if not set
    if ( $events_fallback{$event} ) {
        foreach my $e ( @{ $events_fallback{$event} } ) {
            if ( $self->$e and $self->event_catcher ) {
                my $e_coderef = $self->$e;
                return $self->event_catcher->$e_coderef(@data);
            }
        }
    }
    return;
}

sub parse_eap {
    my ( $message, %options ) = @_;

    $options{header} //= 0;

    return if not defined wantarray;

    if ( $options{header} ) {
        my ( $code, $id, $len ) = unpack 'CCn', $message;
        return ( $code, $id, $len );
    }

    my ( $code, $id, $len, $rest ) = unpack 'CCna*', $message;
    my ( $type, $type_data );
    if ($rest) { ( $type, $type_data ) = unpack 'Ca*', $rest; }

    return ( $code, $id, $len, $type, $type_data ) if wantarray;
    return $type_data;
}

sub unset_catcher {
    my ($self) = @_;
    $self->event_catcher(undef);
    $self->clear_catcher;
    return;
}

__PACKAGE__->meta->make_immutable;

1;
