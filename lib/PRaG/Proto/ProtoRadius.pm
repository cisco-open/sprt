package PRaG::Proto::ProtoRadius;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

extends 'PRaG::Proto::Proto';

use Carp;
use Data::Dumper;
use JSON::MaybeXS   ();
use English         qw/-no_match_vars/;
use List::MoreUtils qw/firstidx/;
use Path::Tiny;
use Readonly;
use Ref::Util qw/is_plain_arrayref is_plain_hashref is_coderef/;
use Tie::RegexpHash;
use Time::HiRes qw/gettimeofday usleep/;

use PRaG::Types;
use PRaG::RadiusClient;
use PRaG::Vars qw/vars_substitute/;

our %av_handlers;
tie %av_handlers, 'Tie::RegexpHash';

$av_handlers{'ACS:CiscoSecure-Defined-ACL'} = '_download_dacl';
$av_handlers{qr/^url-redirect$/sxm}         = '_grab_redirect_url';
$av_handlers{qr/ip:\w+acl#\d+/sxm}          = '_dacl_one_line';

# Have a RADIUS server data here like address, ports, so on
has 'server' => (
    is       => 'ro',
    isa      => 'PRaG::RadiusServer | Object',
    required => 1,
);

# RADIUS attributes to send
has 'radius' => ( is => 'rw', isa => 'HashRef', required => 1 );

# List of RADIUS dictionaries
has 'dicts' => ( is => 'ro', isa => 'ArrayRef', required => 1 );

# RADIUS Client (send/receive packets)
has '_client' => (
    is     => 'ro',
    isa    => 'Maybe[PRaG::RadiusClient | Object]',
    writer => '_set_client',
);

# Cisco AV pairs if any
has '_cisco' => ( is => 'ro', isa => 'ArrayRef', writer => '_set_cisco' );

# Should Message Authenticator be calculated or not
has 'message_auth' => ( is => 'rw', isa => 'Bool', default => 0 );

# State RADIUS attribute
has 'session_state' =>
  ( is => 'ro', isa => 'Str', writer => '_set_session_state' );

# Continue after save needed
has 'continue_on_save' => (
    is      => 'ro',
    isa     => 'Str',
    writer  => '_set_continue_on_save',
    default => q{}
);

# Session attributes
for my $name (qw(ip class id mac user)) {
    has "session_$name" =>
      ( is => 'ro', isa => 'Str', writer => "_set_session_$name" );
}

with 'PRaG::Proto::RoleAccounting';
with 'PRaG::Proto::RoleDACL';
with 'PRaG::Proto::RoleHTTP';
with 'PRaG::Proto::RoleStats';

sub BUILD {
    my $self = shift;
    $self->_set_protocol('radius');
}

sub do {
    my $self = shift;
    $self->logger->error('No DO defined');
    return;
}

sub get_session_data {
    my $self = shift;
    return {
        server     => $self->server->address,
        mac        => $self->session_mac,
        user       => $self->session_user,
        sessid     => $self->session_id,
        class      => $self->session_class,
        ipAddr     => $self->session_ip,
        shared     => $self->server->secret,
        started    => $self->parameters->{started},
        changed    => $self->parameters->{changed},
        RADIUS     => $self->radius,
        attributes => $self->session_attributes,
        bulk => $self->parameters->{bulk} // $self->vars->{BULK} // 'none',
    };
}

sub done {
    my $self = shift;
    $self->logger->debug('Shutting down and closing socket');
    $self->_client->done;
    $self->_client->unset_catcher;
    return;
}

# Handler for ACCESS_ACCEPT
sub _succeed {
    my $self = shift;
    my $h    = {@_};

    $self->_set_status( $self->_S_ACCEPTED );
    $self->logger->info(
        'Got ACCESS-ACCEPT on the session',
        radius_type => 'ACCESS-ACCEPT',
        server      => $self->server->address,
        mac         => $self->session_mac,
        sessid      => $self->session_id,
        class       => $self->session_class,
        ip_address  => $self->session_ip,
        protocol    => $self->_our_protocol,
        method      => $self->_our_method,
    );
    $self->logger->debug('Processing response');

    $self->_parse_response( $h->{response} );
    $self->_parse_cisco_pairs;
    $self->_start_accounting;
    return 1;
}

# Handler for ACCESS_REJECT
sub _rejected {
    my $self = shift;

    $self->_set_status( $self->_S_REJECTED );
    $self->logger->warn(
        'Got ACCESS-REJECT on the session',
        radius_type => 'ACCESS-REJECT',
        server      => $self->server->address,
        mac         => $self->session_mac,
        sessid      => $self->session_id,
        class       => $self->session_class,
        ip_address  => $self->session_ip,
        protocol    => $self->_our_protocol,
        method      => $self->_our_method,
    );

    return 1;
}

around '_got_error' => sub {
    my ( $orig, $self, %h ) = @_;

    return $self->$orig(
        %h,
        server     => $self->server->address,
        mac        => $self->session_mac,
        sessid     => $self->session_id,
        class      => $self->session_class,
        ip_address => $self->session_ip,
    );
};

# Create new RadiusClient
sub _create_client {
    my $self = shift;

    my $c = PRaG::RadiusClient->new(
        server => $self->server,
        dicts  => $self->dicts,
        logger => $self->logger,

        event_catcher => $self,
        on_success    => $self->can('_succeed'),
        on_reject     => $self->can('_rejected'),
        on_packet     => $self->can('_new_packet'),
        on_error      => $self->can('_got_error'),
    );

    $self->_set_client($c);
    return 1;
}

sub _add_vsa {
    my $self = shift;
    my $h    = {@_};
    $h->{set_used} //= 1;

    return if ( !$h->{where} || !$h->{vsa} );
    push @{ $h->{where} }, $h->{vsa};
    $h->{set_used} and $self->add_used( 'Vendor-Specific', $h->{vsa} );
    return;
}

sub _add_general {
    my ( $self, $where, $opts ) = @_;
    $opts //= {};

# $self->_add_attribute(
# 	where => $where,
# 	name => 'Calling-Station-Id',
# 	value => vars_substitute($self->_find_and_remove('Calling-Station-Id') // '$MAC$', $self->vars)
# );
    $self->_set_session_mac( $self->_get_used('Calling-Station-Id')
          || 'empty' );

    $self->_add_attribute(
        where => $where,
        name  => 'Acct-Session-Id',
        value => vars_substitute(
            $self->_find_and_remove('Acct-Session-Id') // '$SESSIONID$',
            $self->vars
        )
    );
    $self->_set_session_id( $self->_get_used('Acct-Session-Id') );

    # TODO: Cisco-AVPair for audit-session-id
    return;
}

# Special handler for Message-Authenticator
sub _h_message_authenticator {
    my $self      = shift;
    my $attribute = shift;
    if ( $attribute->{value} eq 'Calculate' ) {
        $self->message_auth(1);
        $self->_client->message_auth(1);
        return;
    }
    else {
        return $attribute->{value};
    }
}

# Special handler for Framed-IP-Address
sub _h_framed_ip_address {
    my $self      = shift;
    my $attribute = shift;

    my $ip =
      $attribute->{value} eq 'Random'
      ? vars_substitute( '$IP$', $self->vars )
      : $self->_h_default($attribute);
    $self->_set_session_ip($ip);
    return $ip;
}

# Special handler for VSA
sub _h_vendor_specific {
    my $self      = shift;
    my $attribute = shift;

    my $temp = {
        Vendor => $attribute->{vendor},
        Nested => [],
        Name   => 'Vendor-Specific',
        type   => 'vsa'
    };
    foreach my $a ( @{ $attribute->{'value'} } ) {
        push @{ $temp->{Nested} },
          {
            Name  => $a->{name},
            Value => vars_substitute( $a->{value}, $self->vars )
          };
    }
    return $temp;
}

# To update session data with username
sub _h_username {
    my $self      = shift;
    my $attribute = shift;

    my $v = $self->_h_default($attribute);
    if ($v) {
        $self->_set_session_user($v);
    }
    return $v;
}

# To update session data with MAC
sub _h_calling_station_id {
    my $self      = shift;
    my $attribute = shift;

    my $v = $self->_h_default($attribute);
    if ($v) {
        $self->_set_session_mac($v);
    }
    return $v;
}

# To update session data with Session ID
sub _h_acct_session_id {
    my $self      = shift;
    my $attribute = shift;

    my $v = $self->_h_default($attribute);
    if ($v) {
        $self->_set_session_id($v);
    }
    return $v;
}

# Default attribute handler
sub _h_default {
    my $self      = shift;
    my $attribute = shift;

    return $self->_get_used( $attribute->{name} )
      if ( $attribute->{value} eq 'Same As Last Generated'
        || $attribute->{value} eq 'Copy Latest Value' );

    if ( $attribute->{value} eq 'Copy From Response' ) {
        return $self->_get_response( $attribute->{name} )
          // $self->_get_used( $attribute->{name} );
    }

    return $self->_time_since_change if $attribute->{value} eq 'timeFromChange';

    return $self->_time_since_create if $attribute->{value} eq 'timeFromCreate';

    return vars_substitute( $attribute->{value}, $self->vars );
}

my $handlers = {
    'Message-Authenticator' => \&_h_message_authenticator,
    'Framed-IP-Address'     => \&_h_framed_ip_address,
    'Vendor-Specific'       => \&_h_vendor_specific,
    'User-Name'             => \&_h_username,
    'Calling-Station-Id'    => \&_h_calling_station_id,
    'Acct-Session-Id'       => \&_h_acct_session_id,
    'default'               => \&_h_default,
};

# Parse user-specified attributes to an array with substituted values
sub _parse_and_add {
    my ( $self, $from, $to ) = @_;
    foreach my $new_a ( @{$from} ) {

        # RADIUS attributes
        $self->logger->debug(
            'Parsing attribute with name: ' . $new_a->{'name'} );
        my $cr     = $handlers->{ $new_a->{'name'} } // $handlers->{'default'};
        my $newval = $self->$cr($new_a);
        $self->logger->debug( 'Got: ' . Dumper($newval) );
        if ( !is_plain_hashref($newval) ) {
            $self->_add_attribute(
                where => $to,
                name  => $new_a->{'name'},
                value => $newval
            );
        }
        else { $self->_add_vsa( where => $to, vsa => $newval ); }
    }
}

# Check if attribute specified in radius request, remove and return value
sub _find_and_remove {
    my ( $self, $name ) = @_;

    for ( my $i = 0 ; $i < scalar @{ $self->radius->{request} } ; $i++ ) {
        if ( $self->radius->{request}->[$i]->{name} eq $name ) {
            my $val = $self->radius->{request}->[$i]->{value};
            splice @{ $self->radius->{request} }, $i, 1;
            return $val;
        }
    }

    return;
}

# search for an attribute and return it's value or undef
sub _find_by_name {
    my ( $self, $name, $where ) = @_;
    $where //= 'request';

    my $idx = firstidx { $_->{name} eq $name } @{ $self->radius->{$where} };
    return ( $idx >= 0 ? $self->radius->{$where}->[$idx]->{value} : undef );
}

# Adds attribute to an array or a hash
sub _add_radius_attribute {
    my ( $self, $where, $what ) = @_;
    if ( is_plain_arrayref($where) ) {    # If array - just push the value
        push @{$where},
          { 'name' => $what->{'key'}, 'value' => $what->{'value'} };
    }
    else {                                # If hash - add key
        if ( !defined $where->{ $what->{'key'} } ) {    # One value only
            $where->{ $what->{'key'} } = $what->{'value'};
        }
        else {    # If already exists - push to array, or make an array
            if ( ref( $where->{ $what->{'key'} } ) eq 'ARRAY' )
            {     # Push to array of values
                push @{ $where->{ $what->{'key'} } }, $what->{'value'};
            }
            else {    # Make an array of values
                $where->{ $what->{'key'} } =
                  [ $where->{ $what->{'key'} }, $what->{'value'} ];
            }
        }
    }
    return;
}

# Parse server response, populate _response and _cisco attributes. Return array of parsed attributes if needed
sub _parse_response {
    my ( $self, $response ) = @_;

    my @cisco_pairs;
    my $radius_response =
      [];    # if needed, return also an array of RADIUS attributes
    my $log_message = "Parsing response:\n";
    for my $a ( @{$response} ) {
        $log_message .=
"\tattr: name=$a->{'Name'} value=$a->{'Value'} code=$a->{'Code'} vendor=$a->{'Vendor'}\n";
        my $element = {
            'key'   => $a->{'Name'},
            'value' => ( $a->{'Value'} || $a->{'RawValue'} )
        };

        $self->_add_radius_attribute( $radius_response, $element )
          ;    # add to temp array
        $self->_add_radius_attribute( $self->_response, $element )
          ;    # set _response

        if ( $a->{'Name'} eq 'Class' ) {
            $self->_set_session_class( $a->{'Value'} );
        }
        if ( $a->{'Name'} eq 'User-Name' ) {
            $self->logger->debug( 'Updating session user: ' . $a->{'Value'} );
            $self->_set_session_user( $a->{'Value'} );
        }
        if ( $a->{'Name'} eq 'Cisco-AVPair' ) {
            push @cisco_pairs, [ split /=/sxm, $a->{'Value'}, 2 ];
        }
    }
    $self->logger->debug($log_message);
    $self->_set_cisco( \@cisco_pairs );

    return $radius_response if wantarray;
}

# Parse and handle Cisco AV pairs
sub _parse_cisco_pairs {
    my $self = shift;
    $self->logger->debug( 'Got Cisco pairs: ' . Dumper( $self->_cisco ) );
    if ( scalar @{ $self->_cisco } ) {
        foreach my $pair ( @{ $self->_cisco } ) {
            my $c =
              $av_handlers{ $pair->[0] } ? $av_handlers{ $pair->[0] } : undef;
            $self->logger->debug(
                $c ? "Got AV handler: $c" : 'No AV handler for ' . $pair->[0] );
            if ( $c && ( my $callback = $self->can($c) ) ) {
                $self->$callback( $pair->[1], $pair->[0] );
            }
        }
    }
}

# Add new packet to the flow
sub _new_packet {
    my $self = shift;
    my $h    = {@_};
    $self->add_packet($h);
    return;
}

sub _collect_state {
    my $self = shift;
    my $from = shift;

    foreach my $attribute ( @{$from} ) {
        if ( $attribute->{Name} eq 'State' ) {
            $self->logger->debug('Got State, saving');
            $self->_set_session_state( $attribute->{RawValue} );
            return 1;
        }
    }

    return 1;
}

sub _add_if_known {
    my ( $self, $to, $compare ) = @_;

    return if ( !$self->vars->{RADIUS} );
    return if ( !is_coderef($compare) );

    foreach my $cur_attr (
        (
            @{ $self->vars->{RADIUS}->{request} },
            @{ $self->vars->{RADIUS}->{accounting} }
        )
      )
    {
        if ( $compare->($cur_attr) ) {
            $self->_parse_and_add( [$cur_attr], $to );
            return;
        }
    }
    return;
}

__PACKAGE__->meta->make_immutable;

1;
