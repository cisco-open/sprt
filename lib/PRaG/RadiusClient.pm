package PRaG::RadiusClient;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Authen::Radius;
use Data::Dumper;
use Time::HiRes    qw(gettimeofday usleep);
use Regexp::Common qw/net/;
use Readonly;
use Ref::Util qw/is_plain_arrayref is_plain_hashref/;

use PRaG::Types;

Readonly my $SERVICE_AUTH => 'radius';
Readonly my $SERVICE_ACCT => 'radacct';

Readonly my $RADIUS_PACKET_SENT => 1;
Readonly my $RADIUS_PACKET_RCVD => 2;

enum 'Radius::Services', [ $SERVICE_AUTH, $SERVICE_ACCT ];

has 'server' => ( is => 'ro', isa => 'PRaG::RadiusServer', required => 1 );
has 'dicts'  => ( is => 'ro', isa => 'ArrayRef',           required => 1 );
has 'logger' => ( is => 'ro', isa => 'logger' );
has 'message_auth' => ( is => 'rw', isa => 'Bool', default => 0 );

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

# Internals
has '_service' => (
    is      => 'ro',
    isa     => 'Maybe[Radius::Services]',
    default => undef,
    writer  => '_set_service'
);
has '_r' => (
    is      => 'ro',
    isa     => 'Maybe[Authen::Radius]',
    default => undef,
    writer  => '_set_r',
    clearer => '_no_r'
);
has '_rets' => (
    traits  => ['Counter'],
    is      => 'ro',
    isa     => 'Num',
    default => 0,
    handles => {
        inc_retransmits => 'inc',
        dec_retransmits => 'dec',
        no_retransmits  => 'reset',
    },
);
has '_s_type' => ( is => 'rw', isa => 'Int' );

sub set_service {
    my $self    = shift;
    my $service = shift;

    return
      if ( $self->_service && $self->_service eq $service && $self->_r )
      ;    # No need to change
    $self->logger->debug( 'Setting service to ' . $service );
    if ( $self->server->local_addr ) {
        $self->logger->debug( 'Local: ' . $self->server->local_addr );
    }

    $self->_no_r;
    $self->_set_service($service);
    my $r = Authen::Radius->new(
        Host               => $self->_get_service_host,
        Service            => $service,
        Secret             => $self->server->secret,
        LocalAddr          => $self->server->local_addr,
        LocalPort          => $self->server->local_port,
        Rfc3579MessageAuth => $self->message_auth,
        TimeOut            => $self->server->timeout,
        Retransmits        => $self->server->retransmits,
        Debug              => $self->_is_debug,
    );

    return $self->logger->error(
        Authen::Radius->strerror . ': ' . Authen::Radius->error_comment )
      if ( Authen::Radius->get_error ne 'ENONE' );

    $self->_set_r($r);
    $self->_load_dictionaries;
    $self->logger->debug(qq/New service handler for "$service" created./);
    return;
}

sub request {
    my $self = shift;

    $self->set_service($SERVICE_AUTH);
    return if ( !$self->_r );

    return $self->_send( ACCESS_REQUEST, @_ );
}

sub accounting {
    my $self = shift;

    $self->set_service($SERVICE_ACCT);
    return if ( !$self->_r );

    return $self->_send( ACCOUNTING_REQUEST, @_ );
}

sub calc_length {
    my $self       = shift;
    my $attributes = shift;

    foreach my $k ( @{$attributes} ) {
        my @prepared = $self->_prepare_attribute($k);
        $self->_r->add_attributes(@prepared);
    }
    return 20 + length( $self->_r->{attributes} );
}

sub done {
    my $self = shift;
    if ( $self->_r ) {
        return $self->_r->shutdown();
    }
    return;
}

sub unset_catcher {
    my ($self) = @_;
    $self->event_catcher(undef);
    $self->clear_catcher;
    return;
}

sub _send {
    my $self = shift;
    my $what = shift;
    my %h    = @_;

    return $self->logger->error('Nothing to send')
      if ( !$h{to_send} || !is_plain_arrayref( $h{to_send} ) );
    $self->logger->debug( $self->_radius_type_to_str($what)
          . " attributes: "
          . Dumper( $h{to_send} ) );

    $self->_r->clear_attributes;
    my @added = ();
    foreach my $k ( @{ $h{to_send} } ) {
        $self->logger->debug( 'Adding attribute: ' . Dumper($k) );
        my @prepared = $self->_prepare_attribute($k);
        push @added, @prepared;
        $self->_r->add_attributes(@prepared);
    }

    $self->_event(
        'on_packet',
        type   => $RADIUS_PACKET_SENT,
        packet => \@added,
        code   => $self->_radius_type_to_str($what),
        time   => scalar gettimeofday()
    );

    $self->_s_type($what);
    $self->no_retransmits;
    $self->_transmit;
}

sub _transmit {
    my $self = shift;
    $self->_r->send_packet( $self->_s_type, $self->_rets )
      and my $type = $self->_r->recv_packet();
    if ( !defined $type ) {
        $self->logger->debug( 'Error '
              . $self->_r->get_error . ' on '
              . $self->_s_type . ': '
              . $self->_r->strerror() . "\n"
              . $self->_r->error_comment() );
        $self->_event(
            'on_packet',
            type        => $RADIUS_PACKET_RCVD,
            packet      => { 'Comment' => $self->_r->error_comment() },
            code        => $self->_r->get_error(),
            time        => scalar gettimeofday(),
            retransmits => $self->_rets,
        );
        $self->_event(
            'on_error',
            code    => $self->_r->get_error(),
            message => $self->_r->strerror()
        );

        if (   $self->server->retransmits
            && $self->_r->get_error() eq 'ETIMEOUT'
            && $self->_rets < $self->server->retransmits )
        {
            $self->logger->debug('Retransmitting packet');
            $self->inc_retransmits;
            $self->_transmit;
        }
    }
    else {
        $self->logger->debug( "Server response type for Request = $type ("
              . $self->_radius_type_to_str($type)
              . ")" );
        $self->_process_response($type);
    }
    return;
}

sub _process_response {
    my $self = shift;
    my $type = shift;

    my $response = [ $self->_r->get_attributes() ] // [];
    my $code     = $self->_radius_type_to_str($type);

    my $event = 'on_response';
    if ( $type == ACCESS_ACCEPT )    { $event = 'on_success'; }
    if ( $type == ACCESS_REJECT )    { $event = 'on_reject'; }
    if ( $type == ACCESS_CHALLENGE ) { $event = 'on_challenge'; }

    # if ( $type == ACCESS_REJECT ) {
    #     $self->logger->warn("$code received");
    # }
    # else {
    #     $self->logger->debug("$code received");
    # }
    $self->logger->debug("$code received");

    $self->_event(
        'on_packet',
        type        => $RADIUS_PACKET_RCVD,
        packet      => $response,
        code        => $code,
        time        => scalar gettimeofday(),
        retransmits => $self->_rets,
    );
    $self->_event( $event, response => $response, type => $type );
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

sub _get_service_host {
    my $self = shift;

    my $address = $self->server->address;
    if ( $self->server->address =~ /^$RE{net}{IPv6}$/sxm ) {
        $address = "[$address]";
    }
    return
      $address . q{:}
      . (
          $self->_service eq $SERVICE_AUTH
        ? $self->server->auth_port
        : $self->server->acct_port
      );
}

sub _is_debug {
    my $self = shift;
    return ( $self->logger->get_level eq 'DEBUG'
          || $self->logger->get_level eq 'TRACE' ) ? 1 : 0;
}

sub _load_dictionaries {
    my $self = shift;
    foreach my $dict ( @{ $self->dicts } ) {
        $self->_r->load_dictionary(
            is_plain_hashref($dict) ? $dict->{file} : $dict,
            format => is_plain_hashref($dict)
            ? ( $dict->{format} || 'freeradius' )
            : 'freeradius'
        );
    }
    return;
}

sub _radius_type_to_str {
    my ( $self, $code ) = @_;
    my %codes = (
        '1'  => 'ACCESS_REQUEST',
        '2'  => 'ACCESS_ACCEPT',
        '3'  => 'ACCESS_REJECT',
        '4'  => 'ACCOUNTING_REQUEST',
        '5'  => 'ACCOUNTING_RESPONSE',
        '6'  => 'ACCOUNTING_STATUS',
        '11' => 'ACCESS_CHALLENGE',
        '12' => 'STATUS_SERVER',
        '40' => 'DISCONNECT_REQUEST',
        '41' => 'DISCONNECT_ACCEPT',
        '42' => 'DISCONNECT_REJECT',
        '43' => 'COA_REQUEST',
        '44' => 'COA_ACCEPT',
        '44' => 'COA_ACK',
        '45' => 'COA_REJECT',
        '45' => 'COA_NAK',
    );

    return $codes{$code} // q{};
}

# Break in chunks of 253 bytes (max) and return array of such attributes
sub _prepare_attribute {
    my $self = shift;
    my $a    = shift;

    return ($a)
      if ( $a->{Nested} )
      ;   # FIXME: add handler for nested attributes as well... Skipping for now
    return ($a) if ( length $a->{Value} < 253 );    # no need to split anything

    my $n      = 253;
    my @groups = unpack "a$n" x ( ( length( $a->{Value} ) / $n ) ) . 'a*',
      $a->{Value};

    return map {
        {
            Name   => $a->{Name},
            Value  => $_,
            Type   => $a->{Type}   // undef,
            Vendor => $a->{Vendor} // undef,
            Tag    => $a->{Tag}    // undef,
        }
    } @groups;
}

__PACKAGE__->meta->make_immutable;

1;
