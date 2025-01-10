package PRaG::Proto::ProtoTacacs;

use feature ':5.18';
use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

extends 'PRaG::Proto::Proto';

use Net::TacacsPlus::Client;
use Net::TacacsPlus::Constants;

use Carp;
use Data::Dumper;
use English         qw/-no_match_vars/;
use JSON::MaybeXS   ();
use List::MoreUtils qw/firstidx firstval/;
use List::Util      qw/min/;
use Path::Tiny;
use Readonly;
use Ref::Util          qw/is_ref is_plain_arrayref/;
use String::ShellQuote qw/shell_quote/;
use Time::HiRes        qw/gettimeofday usleep/;

use PRaG::Types;
use PRaG::Util::Array qw/random_item/;
use PRaG::Vars        qw/vars_substitute/;

# Have a RADIUS server data here like address, ports, so on
has 'server' => ( is => 'ro', isa => 'PRaG::TacacsServer', required => 1 );

# RADIUS attributes to send
has 'tacacs' => ( is => 'rw', isa => 'HashRef', required => 1 );

# RADIUS Client (send/receive packets)
has '_client' => (
    is     => 'ro',
    isa    => 'Maybe[Net::TacacsPlus::Client]',
    writer => '_set_client',
);

# Session attributes
for my $name (qw/ip user/) {
    has "session_$name" =>
      ( is => 'ro', isa => 'Str', writer => "_set_session_$name" );
}

Readonly my %T_STATUS_CODES => (
    _S_ACCEPTED_AUTHZ => 'ACCEPTED_AUTHZ',
    _S_REJECTED_AUTHZ => 'REJECTED_AUTHZ',
    _S_ACCEPTED_ACCT  => 'ACCEPTED_ACCT',
    _S_REJECTED_ACCT  => 'REJECTED_ACCT',
    _S_ERROR_AUTHC    => 'ERROR_AUTHC',
    _S_ERROR_AUTHZ    => 'ERROR_AUTHZ',
    _S_ERROR_ACCT     => 'ERROR_ACCT',
);

for my $k ( keys %T_STATUS_CODES ) {
    has $k => ( is => 'ro', isa => 'Str', default => $T_STATUS_CODES{$k} );
}

with 'PRaG::Proto::RoleStats';

Readonly my $UUID_CHUNK => q/[\da-f]/;
Readonly my $UUID_REGEX =>
qr/ ^ $UUID_CHUNK{8}\-$UUID_CHUNK{4}\-$UUID_CHUNK{4}\-$UUID_CHUNK{4}\-$UUID_CHUNK{12} $ /isxm;

sub BUILD {
    my $self = shift;
    $self->_set_protocol('tacacs');
}

sub do {
    my $self = shift;
    $self->logger->debug('TACACS+');
    $self->logger->debug( 'Server: ' . Dumper( $self->server ) );
    $self->logger->debug( 'Vars: ' . Dumper( $self->vars ) );

    # clean up a little
    delete $self->tacacs->{auth}->{ip};
    delete $self->tacacs->{auth}->{credentials};

    # set some data
    $self->_set_session_ip( $self->vars->{IP} );
    $self->_set_session_user( $self->vars->{USERNAME} );

    # start
    $self->_set_status( $self->_S_STARTED );
    $self->_authenticate;
    $self->_authz_and_acct;
    return;
}

sub _authenticate {
    my $self = shift;
    $self->logger->debug( 'AuthC: ' . Dumper( $self->tacacs->{auth} ) );

    #username password authen_type rem_addr port new_password
    my $res = $self->_client->authenticate(
        $self->vars->{USERNAME},     $self->vars->{PASSWORD},
        $self->_method_to_auth_type, $self->vars->{IP},
        $self->tacacs->{auth}->{attributes}->{port},
        $self->vars->{NEW_PASSWORD} || undef,
        priv_lvl => $self->tacacs->{auth}->{attributes}->{priv_lvl},
        service  => $self->tacacs->{auth}->{attributes}->{service}
    );

    if ( !$res && $self->_client->errmsg ) {
        $self->_set_status( $self->_S_ERROR_AUTHC );
        $self->_new_packet(
            type    => $self->PKT_RCVD,
            code    => 'ERROR',
            message => $self->_client->errmsg,
        );
    }

    return;
}

sub _authz_and_acct {
    my $self = shift;

    if ( not $self->successful ) {
        $self->logger->debug('Not doing AuthZ and Acct since AuthC failed');
        return;
    }

    $self->logger->debug('Doing AuthZ and Acct');

    foreach my $id ( @{ $self->tacacs->{authz}->{order} } ) {
        my $o = $self->tacacs->{authz}->{$id};
        next if not $o;
        $self->logger->debug( 'Doing ' . $id . ' from order' );

        if ( $o->{type} eq 'acct' ) {
            return if not $self->_acct($o);
        }
        else {
            return if not $self->_authz($o);
        }
    }

    return 1;
}

sub _make_args {
    my ( $self, $o ) = @_;

    my @r;
    if ( $o->{service} ) {
        push @r, q{service=} . $o->{service};
    }

    if ( $o->{cmd} ) {
        my @parts = split /\s/sxm, $o->{cmd}, 2;
        push @r, q{cmd=} . $parts[0];
        push @r, q{cmd-arg=} . $parts[1];
    }

    if ( is_plain_arrayref( $o->{custom} ) ) {
        foreach my $cust ( @{ $o->{custom} } ) {
            push @r, $cust->{attr} . q{=} . $cust->{value};
        }
    }

    $self->logger->debug( 'Got arguments: ' . Dumper( \@r ) );

    return \@r;
}

sub _authz {
    my ( $self, $o ) = @_;
    $self->logger->debug( 'Doing authZ: ' . Dumper($o) );

    if ( $o->{cmd} eq 'null' ) {
        delete $o->{cmd};
    }

    if ( $o->{cmd} =~ $UUID_REGEX ) {
        foreach
          my $c ( @{ $self->tacacs->{commands}->{ $o->{cmd} }->{commands} } )
        {
            my $join = { %{$o}, %{$c} };
            last if ( not $self->_authz($join) and $o->{stop} );
        }
    }
    else {
        my $response = [];
        my $args     = $self->_make_args($o);

        $self->_wait( $o->{dly} // 0 );

        # $username, $args, $args_response, $rem_addr, $port
        my $r = $self->_client->authorize(
            $self->vars->{USERNAME},
            $args, $response, $self->vars->{IP},
            $self->tacacs->{auth}->{attributes}->{port},
        );

        if ( !$r && $self->_client->errmsg ) {
            $self->_set_status( $self->_S_ERROR_AUTHZ );
            $self->_new_packet(
                type    => $self->PKT_RCVD,
                code    => 'ERROR',
                message => $self->_client->errmsg,
            );
        }

        if ( ( $r and $o->{acc} eq 'authorized' ) or $o->{acc} eq 'always' ) {
            $self->_acct(
                { %{$o}, ( args => $args, type => 'acct', dly => 0 ) } );
        }

        # authorized off always

        return if ( not $r and $o->{stop} );
    }

    return 1;
}

sub _acct {
    my ( $self, $o ) = @_;
    $self->logger->debug( 'Doing acct: ' . Dumper($o) );

    my $args;
    if ( $o->{args} ) {
        $args = $o->{args};
    }
    else {
        $args = $self->_make_args($o);
    }

    $self->_wait( $o->{dly} // 0 );

    # $username, $args, $flags, $rem_addr, $port
    my $r = $self->_client->account(
        $self->vars->{USERNAME},
        $args,

        # FIXME: flags should be configurable!
        TAC_PLUS_ACCT_FLAG_STOP,
        $self->vars->{IP},
        $self->tacacs->{auth}->{attributes}->{port},
    );

    if ( !$r && $self->_client->errmsg ) {
        $self->_set_status( $self->_S_ERROR_ACCT );
        $self->_new_packet(
            type    => $self->PKT_RCVD,
            code    => 'ERROR',
            message => $self->_client->errmsg,
        );
    }

    return 1;
}

sub _method_to_auth_type {
    my ( $self, $m ) = @_;

    Readonly my %METHODS => (
        pap   => TAC_PLUS_AUTHEN_TYPE_PAP,
        ascii => TAC_PLUS_AUTHEN_TYPE_ASCII,
        chap  => TAC_PLUS_AUTHEN_TYPE_CHAP,
    );

    return $METHODS{ $self->tacacs->{auth}->{method} } // undef;
}

sub get_session_data {
    my $self = shift;
    return {
        proto      => 'tacacs',
        server     => $self->server->address,
        user       => $self->session_user,
        ip_addr    => $self->session_ip,
        shared     => $self->server->secret,
        started    => $self->parameters->{started},
        changed    => $self->parameters->{changed},
        proto_data => $self->tacacs,
        attributes => $self->session_attributes,
        bulk => $self->parameters->{bulk} // $self->vars->{BULK} // 'none',
    };
}

sub done {
    my $self = shift;
    $self->logger->debug('Shutting down and closing socket');
    $self->_client->close;
    return;
}

# Handler for ACCESS_ACCEPT
sub _succeed {
    my $self = shift;
    my $h    = {@_};

    for ( $h->{code} ) {
        when ('AUTHC') { $self->_set_status( $self->_S_ACCEPTED ); }
        when ('AUTHZ') { $self->_set_status( $self->_S_ACCEPTED_AUTHZ ); }
        when ('ACCT')  { $self->_set_status( $self->_S_ACCEPTED_ACCT ); }
        default        { $self->_set_status( $self->_S_ACCEPTED ); }
    }

    $self->logger->info(
        'Success on ' . $h->{code},
        code     => $h->{code},
        server   => $self->server->address,
        protocol => $self->_our_protocol,
    );
    return 1;
}

# Handler for ACCESS_REJECT
sub _rejected {
    my $self = shift;
    my $h    = {@_};

    for ( $h->{code} ) {
        when ('AUTHC') { $self->_set_status( $self->_S_REJECTED ); }
        when ('AUTHZ') { $self->_set_status( $self->_S_REJECTED_AUTHZ ); }
        when ('ACCT')  { $self->_set_status( $self->_S_REJECTED_ACCT ); }
        default        { $self->_set_status( $self->_S_REJECTED ); }
    }

    $self->logger->info(
        'Reject on ' . $h->{code},
        code     => $h->{code},
        server   => $self->server->address,
        protocol => $self->_our_protocol,
    );
    return 1;
}

# Create new TacacsClient
sub _create_client {
    my $self = shift;

    $self->logger->debug('Creating client');
    $self->_set_client(
        Net::TacacsPlus::Client->new(
            host       => $self->server->address,
            key        => $self->server->secret,
            timeout    => $self->server->timeout,
            port       => random_item( @{ $self->server->ports } ),
            retries    => $self->server->retransmits,
            local_addr => $self->server->local_addr || undef,
            local_port => $self->server->local_port || undef,

            event_handler => $self,
            on_packet     => $self->can('_new_packet'),
            on_error      => $self->can('_got_error'),
            on_success    => $self->can('_succeed'),
            on_reject     => $self->can('_rejected'),
        )
    );

    return 1;
}

# Add new packet to the flow
sub _new_packet {
    my ( $self, %h ) = @_;

    $self->add_packet(
        { %h, ( time => scalar gettimeofday(), proto => 'tacacs' ), } );
    return;
}

# Functions to call before construction
sub determine_vars {
    my ( $class, $vars, $specific, $e ) = @_;

    return if ( !$vars );

    _parse_credentials( $vars, $e->tacacs->{auth}->{credentials}, $e );
    _parse_new_password( $vars, $e->tacacs->{auth}->{attributes}, $e );

    if ( $e->tacacs->{auth}->{credentials}->{limit_sessions} ) {
        $e->_set_count(
            min(
                $vars->amount_of('CREDENTIALS'),
                $e->config->{processes}->{max_sessions},
            )
        );
    }
    return;
}

my %variant_handlers = (
    'list'       => \&_vh_list,
    'dictionary' => \&_vh_dictionary,
);

sub _parse_credentials {
    my ( $vars, $params, $e ) = @_;

    if ( is_ref($params) ) {
        if (   !exists $variant_handlers{ $params->{variant} }
            || !$variant_handlers{ $params->{variant} }->( $vars, $params, $e )
          )
        {
            carp 'Unsupported variant' . $params->{variant};
        }
    }
    else {
        $vars->add(
            type       => 'Credentials',
            name       => 'CREDENTIALS',
            parameters => {
                'variant'          => 'list',
                'list'             => $params,
                'how-to-follow'    => 'one-by-one',
                'disallow-repeats' => 0
            }
        );
    }

    $vars->add_alias( var => 'USERNAME', alias => 'CREDENTIALS.0' );
    $vars->add_alias( var => 'PASSWORD', alias => 'CREDENTIALS.1' );

    return;
}

sub _vh_list {
    my ( $vars, $params, $e ) = @_;
    $vars->add(
        type       => 'Credentials',
        name       => 'CREDENTIALS',
        parameters => {
            'variant'          => 'list',
            'list'             => $params->{'list'},
            'how-to-follow'    => 'one-by-one',
            'disallow-repeats' => 0
        }
    );
    return 1;
}

sub _vh_dictionary {
    my ( $vars, $params, $e ) = @_;

    my $lines = $e->load_user_dictionaries( $params->{dictionary} );

    $vars->add(
        type       => 'Credentials',
        name       => 'CREDENTIALS',
        parameters => {
            'variant'          => 'list',
            'list'             => $lines,
            'how-to-follow'    => $params->{'how-to-follow'}    // 'one-by-one',
            'disallow-repeats' => $params->{'disallow-repeats'} // 0
        }
    );
    return 1;
}

sub _parse_new_password {
    my ( $vars, $params, $e ) = @_;

    return if ( not $params->{chpass} or not $params->{chpass}->{variant} );
    return
      if (
        not $params->{chpass_how}
        or ( $params->{chpass}->{variant} eq 'static'
            and not $params->{chpass_how}->{value} )
      );

    $vars->add(
        type       => 'String',
        name       => 'NEW_PASSWORD',
        parameters => {
            ( 'variant' => $params->{chpass}->{variant} ),
            %{ $params->{chpass_how} }
        }
    );

    return;
}

sub _wait {
    my ( $self, $l ) = @_;
    usleep($l);
    return 1;
}

__PACKAGE__->meta->make_immutable;

1;
