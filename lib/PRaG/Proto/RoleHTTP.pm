package PRaG::Proto::RoleHTTP;

use strict;
use utf8;

use Moose::Role;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use JSON::MaybeXS ();
use Ref::Util     qw/is_plain_hashref/;

has 'redirect_url' =>
  ( is => 'ro', writer => '_set_redirect_url', default => q{} );

sub _grab_redirect_url {
    my $self = shift;
    my $url  = shift;

    $self->logger and $self->logger->debug( 'Got URL: ' . $url );
    $self->_set_redirect_url($url);

    if (   !$self->vars->{GUEST_FLOW}
        || !is_plain_hashref( $self->vars->{GUEST_FLOW} ) )
    {
        $self->logger
          and
          $self->logger->debug('Not expecting guest flow, hence not saving');
        return;
    }

    $self->vars->{GUEST_FLOW}->{REDIRECT_URL} = $url;
    $self->vars->{_updated} = 1;
    return;
}

after 'get_session_data' => sub {
    my $self = shift;

    if (   !$self->vars->{GUEST_FLOW}
        || !is_plain_hashref( $self->vars->{GUEST_FLOW} ) )
    {
        $self->logger->debug('No guest flow parameters.');
        return;
    }
    if ( !$self->redirect_url ) {
        $self->logger->debug('No redirect URL.');
        return;
    }

    if ( ref $self eq 'PRaG::Proto::ProtoHTTP' ) {
        $self->logger->debug(
            'I\'m PRaG::Proto::ProtoHTTP, not starting new process');
    }
    else {
        $self->logger->debug('Start redirect grab process');

        my $jsondata = {
            server     => $self->server->dump_for_load,
            owner      => $self->vars->{OWNER},
            protocol   => 'http',
            count      => 1,
            radius     => {},
            parameters => {
                'sessions' => {
                    sessid => $self->session_id,
                    server => $self->server->address
                },
                'action' => 'continue',
            }
        };

        my $jsn          = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );
        my $encoded_json = $jsn->encode($jsondata);
        $self->_set_continue_on_save($encoded_json);
    }
};

1;
