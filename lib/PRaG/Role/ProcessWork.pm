package PRaG::Role::ProcessWork;

use strict;
use utf8;

use Moose::Role;
use namespace::autoclean;

use PRaG::Util::Procs;

sub start_new_process {
    my ( $self, $encoded_json, %h ) = @_;

    return PRaG::Util::Procs::start_new_process(
        $encoded_json,
        cmd            => $h{cmd} // 'START',
        logger         => $self->logger,
        owner          => $self->owner,
        max_cli_length => $self->config->{generator}->{max_cli_length},
        port           => $self->config->{generator}->{port} // 52525,
        json           => $self->json,
        max_per_user   => $self->config->{processes}->{max},

        # host_socket    => $self->config->{generator}->{host_socket},
    );
}

1;
