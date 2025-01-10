package PRaG::Proto::RoleAccounting;

use strict;
use utf8;

use Moose::Role;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Authen::Radius;    # for constants
use Time::HiRes     qw/gettimeofday usleep/;
use List::MoreUtils qw/firstidx/;
use Data::Dumper;
use Ref::Util qw/is_plain_hashref/;

sub do_accounting {
    my $self = shift;
    $self->logger and $self->logger->debug('Doing Accounting');
    $self->parameters->{starting_accounting} ||=
      ( $self->status eq $self->_S_ACCEPTED ? 1 : 0 );
    $self->parameters->{accounting_type} ||= 'start';

    my $accounting_attributes = [];
    $self->_parse_and_add( $self->radius->{accounting},
        $accounting_attributes );

    my $idx = firstidx {
        $_->{Name} eq 'Cisco-AVPair'
          && index( $_->{Value}, 'audit-session-id=' ) >= 0
    }
    @{$accounting_attributes};

    if ( $idx < 0 ) {
        $self->_add_if_known(
            $accounting_attributes,
            sub {
                $_[0]->{name} eq 'Cisco-AVPair'
                  && $_[0]->{value} =~ /^audit-session-id=/sxm;
            }
        );
    }

    $self->logger
      and $self->logger->debug(
        'Accounting attributes: ' . Dumper($accounting_attributes) );

    if ( $self->parameters->{accounting_latency} ) {
        $self->logger
          and $self->logger->debug( 'Latency before Accounting for '
              . $self->parameters->{accounting_latency}
              . ' milliseconds' );
        usleep( $self->parameters->{accounting_latency} * 1000 );
    }

    $self->_client->on_response( $self->can('_accounting_response') );
    $self->_client->accounting( to_send => $accounting_attributes );
}

# Update session status accordingly
sub _accounting_response {
    my $self = shift;
    my $h    = {@_};
    $self->logger
      and $self->logger->debug(
        'Server response type for Accounting = ' . $h->{type} );
    if ( $h->{type} != ACCOUNTING_RESPONSE() )
    {    # Unexpected response, do nothing, return
        $self->logger
          and $self->logger->warn( 'Expected Accounting-Response but received '
              . $self->_client->_radius_type_to_str( $h->{type} ) );
        return;
    }

    $self->_set_status( $self->vars->{START_STATE} )
      if $self->vars->{START_STATE};
    $self->_set_status( $self->_S_DROPPED )
      if ( $self->parameters->{accounting_type} eq 'drop' );
    $self->_set_status( $self->_S_ACCOUNTING_STARTED )
      if ( $self->parameters->{starting_accounting} );
}

# Start Accounting if needed
sub _start_accounting {
    my $self = shift;
    if ( is_plain_hashref( $self->parameters->{accounting_start} )
        && $self->parameters->{accounting_start}->{nosend} )
    {
        $self->logger and $self->logger->debug(q/Skipping Accounting/);
    }
    else {
        $self->parameters->{starting_accounting} = 1;
        $self->do_accounting;
    }
}

1;
