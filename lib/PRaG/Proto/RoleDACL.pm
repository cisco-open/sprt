package PRaG::Proto::RoleDACL;

use strict;
use utf8;

use Moose::Role;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use List::MoreUtils qw(firstidx);

# DACL
has 'dacl' => (
    is      => 'ro',
    isa     => 'Maybe[ArrayRef]',
    writer  => '_set_dacl',
    default => undef
);
has '_dacl_name' => ( is => 'ro', isa => 'Str', writer => '_set_dacl_name' );

# Download DACL if needed
sub _download_dacl {
    my ( $self, $dacl ) = @_;
    $self->logger and $self->logger->debug("Downloading DACL $dacl");

    if ( !$self->parameters->{download_dacl} ) {
        $self->logger and $self->logger->debug('Skipping DACL');
        return;
    }

    $self->_set_dacl_name($dacl);
    if ( defined $self->dacl ) {
        $self->_add_dacl_line( 'ip:inacl', '! Separate DACL' );
    }
    else { $self->_set_dacl( [] ); }
    $self->_client->on_success( $self->can('_accept_dacl') );
    $self->_client->on_challenge( $self->can('_challenge_dacl') );
    $self->_client->on_reject( $self->can('_dacl_reject') );

    my $attributes = [];
    $self->_add_attribute(
        where    => $attributes,
        name     => 'User-Name',
        value    => $dacl,
        set_used => 0
    );
    $self->_add_attribute(
        where    => $attributes,
        name     => 'Cisco-AVPair',
        value    => 'aaa:service=ip_admission',
        set_used => 0
    );
    $self->_add_attribute(
        where    => $attributes,
        name     => 'Cisco-AVPair',
        value    => 'aaa:event=acl-download',
        set_used => 0
    );

    $self->_client->request( to_send => $attributes );
    return;
}

# DACL request rejected, save the response
sub _dacl_reject {
    my $self = shift;
    $self->logger
      and $self->logger->error('Access-Reject received on DACL request');
    return;
}

sub _challenge_dacl {
    my $self = shift;
    my $h    = {@_};
    $self->logger
      and $self->logger->debug('Access-Challenge received for dACL request');

    $self->_process_dacl(@_);

    $self->_set_session_state(q{});
    $self->_collect_state( $h->{response} );

    my $attributes = [];
    $self->_add_attribute(
        where    => $attributes,
        name     => 'User-Name',
        value    => $self->_dacl_name,
        set_used => 0
    );
    $self->_add_attribute(
        where    => $attributes,
        name     => 'Cisco-AVPair',
        value    => 'aaa:service=ip_admission',
        set_used => 0
    );
    $self->_add_attribute(
        where    => $attributes,
        name     => 'Cisco-AVPair',
        value    => 'aaa:event=acl-download',
        set_used => 0
    );

    if ( $self->session_state ) {
        $self->_add_attribute(
            where    => $attributes,
            name     => 'State',
            value    => $self->session_state,
            set_used => 0
        );
    }

    $self->_client->request( to_send => $attributes );
    return;
}

sub _accept_dacl {
    my $self = shift;
    $self->logger
      and $self->logger->debug('Access-Accept received for dACL request');

    $self->_process_dacl(@_);
    return;
}

# Got the response with DACL, process it
sub _process_dacl {
    my $self = shift;
    my $h    = {@_};

    my $log_message = 'Parsing DACL attributes';
    for my $a ( @{ $h->{response} } ) {
        $log_message .=
"\tattr: name=$a->{'Name'} value=$a->{'Value'} code=$a->{'Code'} vendor=$a->{'Vendor'}\n";

        if ( $a->{'Name'} eq 'Cisco-AVPair' ) {
            $self->_add_dacl_line( split( /=/sxm, $a->{'Value'}, 2 ) );
        }
    }
    $self->logger and $self->logger->debug($log_message);
    return;
}

# Parse and push DACL line
sub _add_dacl_line {
    my ( $self, $attribute, $value ) = @_;
    if ( $attribute =~ /^ip:\w+acl/ ) {
        push @{ $self->dacl }, $value;
    }
    return;
}

sub _dacl_one_line {
    my $self = shift;
    my ( $val, $attr ) = @_;

    $self->logger
      and $self->logger->debug("Got DACL in Access-Accept: $attr=$val");

    if ( !defined $self->dacl ) {
        $self->_set_dacl( [] );
        $self->_add_dacl_line( 'ip:inacl', '! DACL from Access-Accept' );
    }

    $self->_add_dacl_line( $attr, $val );
    return;
}

1;
