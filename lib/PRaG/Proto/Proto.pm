package PRaG::Proto::Proto;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Carp;
use Data::Dumper;
use English         qw/-no_match_vars/;
use JSON::MaybeXS   ();
use List::MoreUtils qw/firstidx/;
use Path::Tiny;
use Readonly;
use Time::HiRes qw/gettimeofday/;

use PRaG::Types;

has 'PKT_SENT' => ( is => 'ro', default => 1, );
has 'PKT_RCVD' => ( is => 'ro', default => 2, );

Readonly my %STATUS_CODES => (
    _S_ACCEPTED           => 'ACCEPTED',
    _S_ACCESS_CHALLENGE   => 'ACCESS_CHALLENGE',
    _S_ACCOUNTING_STARTED => 'ACCOUNTING_STARTED',
    _S_REJECTED           => 'REJECTED',
    _S_STARTED            => 'STARTED',
    _S_UNEXPECTED         => 'UNEXPECTED',
    _S_DROPPED            => 'DROPPED',
    _S_UNKNOWN            => 'UNKNOWN',
    _S_INIT               => 'INIT',
);

for my $k ( keys %STATUS_CODES ) {
    has $k => ( is => 'ro', isa => 'Str', default => $STATUS_CODES{$k} );
}

# All relevant parameters
has 'parameters' => ( is => 'ro', isa => 'Any', required => 1 );

# Debug flag
has 'debug' => ( is => 'rw', isa => 'Bool', default => 0 );

# Variables (Username, SessionID, MAC, etc)
has 'vars' => ( is => 'ro', isa => 'HashRef', required => 1 );

# Logging engine
has 'logger' => ( is => 'ro', isa => 'logger' );

# Put error in here
has 'error' => (
    is      => 'ro',
    isa     => 'Str',
    writer  => '_set_error',
    clearer => '_no_error',
    trigger => \&_log_error,
);

# Current session status
has 'status' => (
    is      => 'ro',
    isa     => 'Str',
    default => 'UNKNOWN',
    writer  => '_status',
    trigger => \&_push_state,
);

# Packets of the flow
has 'flow' => (
    is      => 'ro',
    isa     => 'ArrayRef',
    writer  => '_set_flow',
    traits  => ['Array'],
    handles =>
      { add_packet => 'push', clear_flow => 'clear', next_packet => 'shift' },
);

# Previousely used values
has '_used_attributes' =>
  ( is => 'ro', isa => 'HashRef', writer => '_set_used' );

# Values from the response
has '_response' => ( is => 'ro', isa => 'HashRef', writer => '_set_response' );

has 'session_attributes' => (
    is      => 'ro',
    isa     => 'Maybe[HashRef]',
    writer  => '_set_session_attributes',
    default => sub { {} },
);

# Successful or not, flag
has 'successful' =>
  ( is => 'ro', isa => 'Bool', default => 0, writer => '_set_successful' );

has '_our_protocol' =>
  ( is => 'ro', isa => 'Str', default => '', writer => '_set_protocol' );
has '_our_method' =>
  ( is => 'ro', isa => 'Str', default => '', writer => '_set_method' );

sub BUILD {
    my $self = shift;

    $self->_no_error;
    $self->_set_used( {} );
    $self->_set_response( {} );
    $self->clear_flow;
    if ( !$self->session_attributes ) { $self->_set_session_attributes( {} ); }
    $self->_create_client;
    if ( $self->status ne $self->_S_UNKNOWN ) {
        $self->_set_status( $self->status );
    }
    if ( $self->status eq $self->_S_UNKNOWN ) {
        $self->_set_status( $self->_S_INIT );
    }
    $self->logger->debug('Proto built.');
    return $self;
}

sub do {
    my $self = shift;
    $self->logger->error('No DO defined');
    return;
}

sub get_session_data {
    return;
}

sub dump_flow {
    my ( $self, $file, $id ) = @_;

    return if ( !$file );

    my $json_obj = JSON::MaybeXS->new(
        utf8            => 1,
        allow_nonref    => 1,
        allow_blessed   => 1,
        convert_blessed => 1
    );
    path($file)->touch->spew_utf8(
        $json_obj->encode(
            {
                session => $id,
                flow    => $self->flow
            }
        )
    );

    # close $fh;
    undef $json_obj;
    return;
}

sub done {
    return;
}

sub _set_status {
    my ( $self, $new_status ) = @_;
    if ( $self->status ne $new_status ) { $self->_status($new_status); }
    $self->debug and $self->logger->debug("Setting status to $new_status");
    if ( $new_status eq $self->_S_STARTED )  { $self->_started; }
    if ( $new_status eq $self->_S_ACCEPTED ) { $self->_set_successful(1); }
    $self->_changed;
    return 1;
}

sub _succeed {
    return;
}

sub _rejected {
    return;
}

# Save value as last used
sub add_used {
    my ( $self, $name, $value ) = @_;

    return if $name eq 'Vendor-Specific';
    $self->_used_attributes->{$name} = $value;
    return 1;
}

# Return last used value
sub _get_used {
    my $self = shift;
    my $name = shift;

    return $self->_used_attributes->{$name} // undef;
}

# Return value from the last response
sub _get_response {
    my $self = shift;
    my $name = shift;

    return $self->_response->{$name} // undef;
}

# Pushes value to an array
sub _add_attribute {
    my $self = shift;
    my $h    = {@_};
    $h->{set_used} //= 1;

    return if ( !$h->{where} || !$h->{name} );

    my $v = $h->{value} // $self->_get_used( $h->{name} );
    return if !defined $v;

    push @{ $h->{where} }, { Name => $h->{name}, Value => $v };
    $h->{set_used} and $self->add_used( $h->{name}, $v );
    return 1;
}

# Return seconds since last change of session
sub _time_since_change {
    my $self = shift;
    return defined $self->vars->{CHANGED}
      ? int( time - $self->vars->{CHANGED} )
      : undef;
}

# Return seconds sice session create
sub _time_since_create {
    my $self = shift;
    return defined $self->vars->{STARTED}
      ? int( time - $self->vars->{STARTED} )
      : undef;
}

# Set started timestamp
sub _started {
    my $self = shift;
    $self->parameters->{started} ||= time;
    return;
}

# Set changed timestamp
sub _changed {
    my $self = shift;
    $self->parameters->{changed} = time;
    return;
}

# Got an error, log it
sub _got_error {
    my ( $self, %h ) = @_;

    $self->logger->error(
        'Got an error ' . $h{code} . ': ' . ( delete $h{message} ), %h );

    return;
}

sub _log_error {
    my ( $self, $new_v ) = @_;

    if ($new_v) { $self->logger->error($new_v); }
    return;
}

sub _push_state {
    my ( $self, $new_s, $old_s ) = @_;

    $old_s //= q{};

    return if ( $new_s eq $old_s );

    $self->session_attributes->{StatesHistory} //= [];
    if ( scalar @{ $self->session_attributes->{StatesHistory} }
        && $self->session_attributes->{StatesHistory}->[-1]->{code} eq $new_s )
    {
        return;
    }
    push @{ $self->session_attributes->{StatesHistory} },
      { code => $new_s, time => scalar gettimeofday() };

    return;
}

sub used_from_vars {
    my ($self) = @_;

    my $attributes = {
        'USERNAME'  => 'User-Name',
        'CLASS'     => 'Class',
        'SESSIONID' => 'Acct-Session-Id'
    };

    foreach my $var_name ( keys %{$attributes} ) {
        if ( defined $self->vars->{$var_name} ) {
            $self->add_used( $attributes->{$var_name},
                $self->vars->{$var_name} );
        }
    }

    my @from_radius_req = qw/NAS-IP-Address NAS-Port-Type Called-Station-Id/;
    foreach my $aname (@from_radius_req) {
      SEARCH_ATT:
        foreach my $att ( @{ $self->vars->{RADIUS}->{request} } ) {
            if ( $att->{name} eq $aname ) {
                $self->add_used( $aname, $att->{value} );
                last SEARCH_ATT;
            }
        }
    }

    return;
}

__PACKAGE__->meta->make_immutable;

1;
