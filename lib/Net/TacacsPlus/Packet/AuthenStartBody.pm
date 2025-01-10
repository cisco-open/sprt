package Net::TacacsPlus::Packet::AuthenStartBody;

=head1 NAME

Net::TacacsPlus::Packet::AuthenStartBody - Tacacs+ authentication packet body

=head1 DESCRIPTION

The authentication START packet body

	 1 2 3 4 5 6 7 8  1 2 3 4 5 6 7 8  1 2 3 4 5 6 7 8  1 2 3 4 5 6 7 8

	+----------------+----------------+----------------+----------------+
	|    action      |    priv_lvl    |  authen_type   |     service    |
	+----------------+----------------+----------------+----------------+
	|    user len    |    port len    |  rem_addr len  |    data len    |
	+----------------+----------------+----------------+----------------+
	|    user ...
	+----------------+----------------+----------------+----------------+
	|    port ...
	+----------------+----------------+----------------+----------------+
	|    rem_addr ...
	+----------------+----------------+----------------+----------------+
	|    data...
	+----------------+----------------+----------------+----------------+

=cut

our $VERSION = '1.10';

use strict;
use warnings;

use 5.006;
use Net::TacacsPlus::Constants;
use Carp::Clan;

use base qw{ Class::Accessor::Fast };

__PACKAGE__->mk_accessors(
    qw{
      action
      priv_lvl
      authen_type
      service
      user
      data
      port
      rem_addr
      }
);

=head1 METHODS

=over 4

=item new( somekey => somevalue)

Construct tacacs+ authentication START packet body object

Parameters:

	action      : TAC_PLUS_AUTHEN_[^_]+$
	priv_lvl    : TAC_PLUS_PRIV_LVL_*      - default TAC_PLUS_PRIV_LVL_MIN
	authen_type : TAC_PLUS_AUTHEN_TYPE_*
	service     : TAC_PLUS_AUTHEN_SVC_*    - default TAC_PLUS_AUTHEN_SVC_LOGIN
	user        : username
	data        : data                     - default ''
	port        : port                     - default 'Virtual00'
	rem_addr    : our ip address           - default '127.0.0.1'

=cut

sub new {
    my $class  = shift;
    my %params = @_;

    #let the class accessor contruct the object
    my $self = $class->SUPER::new( \%params );

    if ( $params{'raw_body'} ) {
        $self->decode( $params{'raw_body'} );
        delete $self->{'raw_body'};
        return $self;
    }

    $self->priv_lvl(TAC_PLUS_PRIV_LVL_MIN)    if not defined $self->priv_lvl();
    $self->service(TAC_PLUS_AUTHEN_SVC_LOGIN) if not defined $self->service();
    $self->data('')                           if not defined $self->data();
    $self->port('Virtual00')                  if not defined $self->port();
    $self->rem_addr('127.0.0.1')              if not defined $self->rem_addr();

    return $self;
}

=item decode($raw_data)

Construct object from raw packet.

=cut

sub decode {
    my ( $self, $raw_data ) = @_;

    my $length_user;
    my $length_port;
    my $length_rem_addr;
    my $length_data;
    my $payload;

    (
        $self->{'action'},  $self->{'priv_lvl'}, $self->{'authen_type'},
        $self->{'service'}, $length_user,        $length_port,
        $length_rem_addr,   $length_data,        $payload,
    ) = unpack( "C8a*", $raw_data );

    ( $self->{'user'}, $self->{'port'}, $self->{'rem_addr'}, $self->{'data'}, )
      = unpack(
        "a"
          . $length_user . "a"
          . $length_port . "a"
          . $length_rem_addr . "a"
          . $length_data,
        $payload
      );
}

=item raw()

Return binary data of packet body.

=cut

sub raw {
    my $self = shift;

    my $body = pack( "C8a*a*a*a*",
        $self->{'action'},             $self->{'priv_lvl'},
        $self->{'authen_type'},        $self->{'service'},
        length( $self->{'user'} ),     length( $self->{'port'} ),
        length( $self->{'rem_addr'} ), length( $self->{'data'} ),
        $self->{'user'},               $self->{'port'},
        $self->{'rem_addr'},           $self->{'data'},
    );

    return $body;
}

sub TO_JSON {
    my $self   = shift;
    my @fields = qw /
      action
      priv_lvl
      authen_type
      service
      user
      data
      port
      rem_addr/;

    my $mapping = {
        action => {
            0x01 => 'TAC_PLUS_AUTHEN_LOGIN',
            0x02 => 'TAC_PLUS_AUTHEN_CHPASS',
            0x03 => 'TAC_PLUS_AUTHEN_SENDPASS',    #(deprecated)
            0x04 => 'TAC_PLUS_AUTHEN_SENDAUTH',
        },
        authen_type => {
            0x01 => 'TAC_PLUS_AUTHEN_TYPE_ASCII',
            0x02 => 'TAC_PLUS_AUTHEN_TYPE_PAP',
            0x03 => 'TAC_PLUS_AUTHEN_TYPE_CHAP',
            0x04 => 'TAC_PLUS_AUTHEN_TYPE_ARAP',
            0x05 => 'TAC_PLUS_AUTHEN_TYPE_MSCHAP',
        },
        service => {
            0x00 => 'TAC_PLUS_AUTHEN_SVC_NONE',
            0x01 => 'TAC_PLUS_AUTHEN_SVC_LOGIN',
            0x02 => 'TAC_PLUS_AUTHEN_SVC_ENABLE',
            0x03 => 'TAC_PLUS_AUTHEN_SVC_PPP',
            0x04 => 'TAC_PLUS_AUTHEN_SVC_ARAP',
            0x05 => 'TAC_PLUS_AUTHEN_SVC_PT',
            0x06 => 'TAC_PLUS_AUTHEN_SVC_RCMD',
            0x07 => 'TAC_PLUS_AUTHEN_SVC_X25',
            0x08 => 'TAC_PLUS_AUTHEN_SVC_NASI',
            0x09 => 'TAC_PLUS_AUTHEN_SVC_FWPROXY',
        }
    };

    return {
        map {
            $_ => defined $mapping->{$_}
              ? ( $mapping->{$_}->{ $self->$_ } or $self->$_ )
              : $self->$_
        } @fields
    };
}

1;

=back

=cut
