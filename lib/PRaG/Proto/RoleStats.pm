package PRaG::Proto::RoleStats;

use strict;
use utf8;

use Moose::Role;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Time::HiRes;

has 'largest_delay' =>
  ( is => 'ro', isa => 'Num', writer => '_set_largest_delay', default => 0 );
has 'largest_retransmits' => (
    is      => 'ro',
    isa     => 'Num',
    writer  => '_set_largest_retransmits',
    default => 0,
);
has 'whole_flow_time' => (
    is      => 'ro',
    isa     => 'Num',
    writer  => '_set_whole_flow_time',
    default => 0
);

has 'first_packet_sent' =>
  ( is => 'ro', writer => '_first_was_sent', default => undef );
has 'latest_packet_rcvd' =>
  ( is => 'ro', writer => '_update_latest_rcvd', default => undef );
has 'latest_packet_sent' =>
  ( is => 'ro', writer => '_update_latest_sent', default => undef );
has 'when_session_ended' =>
  ( is => 'ro', writer => '_set_session_end', default => undef );

before '_new_packet' => sub {
    my $self = shift;
    my $h    = {@_};
    my $t    = $h->{time} || Time::HiRes::time();
    if ( $h->{type} == 1 ) {    # sent
        $self->_update_latest_sent($t);
        if ( !$self->first_packet_sent ) { $self->_first_was_sent($t); }
    }
    else {                      # received
        $self->_update_latest_rcvd($t);

        # Update retransmits
        if (   $h->{retransmits}
            && $h->{retransmits} > $self->largest_retransmits )
        {
            $self->_set_largest_retransmits( $h->{retransmits} );
        }

        # Update whole time of the flow
        if ( $self->first_packet_sent ) {
            $self->_set_whole_flow_time( $t - $self->first_packet_sent );
        }

        # Update largest delay
        if ( $self->latest_packet_sent ) {
            my $delay = $self->latest_packet_rcvd - $self->latest_packet_sent;
            if ( $delay > $self->largest_delay ) {
                $self->_set_largest_delay($delay);
            }
        }
    }
};

after 'done' => sub {
    my $self = shift;
    $self->_set_session_end( Time::HiRes::time() );
    return;
};

sub statistics {
    my $self = shift;
    if (wantarray) {
        return (
            $self->largest_delay,   $self->largest_retransmits,
            $self->whole_flow_time, $self->when_session_ended
        );
    }
    elsif ( defined wantarray ) {
        return {
            delay       => $self->largest_delay,
            retransmits => $self->largest_retransmits,
            flow_time   => $self->whole_flow_time,
            end         => $self->when_session_ended,
        };
    }
}

1;
