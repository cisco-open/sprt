package Net::TacacsPlus::Packet::AuthorRequestBody;

=head1 NAME

Net::TacacsPlus::Packet::AuthorRequestBody - Tacacs+ authorization request body 

=head1 DESCRIPTION

The authorization REQUEST packet body

         1 2 3 4 5 6 7 8  1 2 3 4 5 6 7 8  1 2 3 4 5 6 7 8  1 2 3 4 5 6 7 8

        +----------------+----------------+----------------+----------------+
        |  authen_method |    priv_lvl    |  authen_type   | authen_service |
        +----------------+----------------+----------------+----------------+
        |    user len    |    port len    |  rem_addr len  |    arg_cnt     |
        +----------------+----------------+----------------+----------------+
        |   arg 1 len    |   arg 2 len    |      ...       |   arg N len    |
        +----------------+----------------+----------------+----------------+
        |   user ...
        +----------------+----------------+----------------+----------------+
        |   port ...
        +----------------+----------------+----------------+----------------+
        |   rem_addr ...
        +----------------+----------------+----------------+----------------+
        |   arg 1 ...
        +----------------+----------------+----------------+----------------+
        |   arg 2 ...
        +----------------+----------------+----------------+----------------+
        |   ...
        +----------------+----------------+----------------+----------------+
        |   arg N ...
        +----------------+----------------+----------------+----------------+


=cut


our $VERSION = '1.10';

use strict;
use warnings;

use 5.006;
use Net::TacacsPlus::Constants;
use Carp::Clan;

use base qw{ Class::Accessor::Fast };

__PACKAGE__->mk_accessors(qw{
	authen_method
	priv_lvl
	authen_type
	authen_service
	user
	port
	rem_addr
	args
});

=head1 METHODS

=over 4

=item new( somekey => somevalue)

Construct tacacs+ authorization REQUEST packet body object

Parameters:

	authen_method : TAC_PLUS_AUTHEN_METH_*
	priv_lvl      : TAC_PLUS_PRIV_LVL_*
	authen_type   : TAC_PLUS_AUTHEN_TYPE_*
	authen_service: TAC_PLUS_AUTHEN_SVC_*
	user          : username
	port          : port                     - default 'Virtual00'
	rem_addr      : our ip address
	args          : args arrayref

=cut

sub new() {
	my $class = shift;
	my %params = @_;

	#let the class accessor contruct the object
	my $self = $class->SUPER::new(\%params);

	if ($params{'raw_body'}) {
		$self->decode($params{'raw_body'});
		delete $self->{'raw_body'};
		return $self;
	}

	$self->authen_method(TAC_PLUS_AUTHEN_METH_TACACSPLUS) if not defined $self->authen_method;
	$self->priv_lvl(TAC_PLUS_PRIV_LVL_MIN)                if not defined $self->priv_lvl;
	$self->authen_type(TAC_PLUS_AUTHEN_TYPE_ASCII)        if not defined $self->authen_type;
	$self->authen_service(TAC_PLUS_AUTHEN_SVC_LOGIN)      if not defined $self->authen_service;
	$self->port('Virtual00')                              if not defined $self->port;
	$self->rem_addr('127.0.0.1')                          if not defined $self->rem_addr;

	return $self;
}


=item decode($raw_data)

Construct object from raw packet.

=cut

sub decode {
	my ($self, $raw_data) = @_;
	
	my $length_user;
	my $length_port;
	my $length_rem_addr;
	my $args_count;
	my $payload;
	
	(
		$self->{'authen_method'},
		$self->{'priv_lvl'},
		$self->{'authen_type'},
		$self->{'authen_service'},
		$length_user,
		$length_port,
		$length_rem_addr,
		$args_count,
		$payload,
	) = unpack("C8a*", $raw_data);

	my @args_unpack_strings = map { 'a'.$_ } unpack('C'.$args_count, $payload);
	
	$payload = substr($payload, $args_count);

	(
		$self->{'user'},
		$self->{'port'},
		$self->{'rem_addr'},
		$payload,
	) = unpack(
		'a'.$length_user
		.'a'.$length_port
		.'a'.$length_rem_addr
		.'a*'
		,
		$payload
	);
	
	$self->{'args'} = [ unpack(join('', @args_unpack_strings), $payload) ];
}


=item raw()

Return binary data of packet body.

=cut

sub raw {
	my $self = shift;

	my $body = pack("C8",
		$self->{'authen_method'},
		$self->{'priv_lvl'},
		$self->{'authen_type'},
		$self->{'authen_service'},
		length($self->{'user'}),
		length($self->{'port'}),
		length($self->{'rem_addr'}),
		scalar(@{$self->{'args'}}),
	);

	#add lengths of arguments
	$body .= pack("C".(scalar @{$self->{'args'}}),
				map { length($_) } @{$self->{'args'}}
	);
	
	$body .= $self->{'user'}
				.$self->{'port'}
				.$self->{'rem_addr'}
				.join('', @{$self->{'args'}})
	;

	return $body;
}

sub TO_JSON {
    my $self   = shift;
    my @fields = qw /
      authen_method
      priv_lvl
      authen_type
      authen_service
      user
      port
      rem_addr
      args/;

    my $mapping = {
        authen_method => {
            0x00 => 'TAC_PLUS_AUTHEN_METH_NOT_SET',
            0x01 => 'TAC_PLUS_AUTHEN_METH_NONE',
            0x02 => 'TAC_PLUS_AUTHEN_METH_KRB5',
            0x03 => 'TAC_PLUS_AUTHEN_METH_LINE',
            0x04 => 'TAC_PLUS_AUTHEN_METH_ENABLE',
            0x05 => 'TAC_PLUS_AUTHEN_METH_LOCAL',
            0x06 => 'TAC_PLUS_AUTHEN_METH_TACACSPLUS',
            0x08 => 'TAC_PLUS_AUTHEN_METH_GUEST',
            0x10 => 'TAC_PLUS_AUTHEN_METH_RADIUS',
            0x11 => 'TAC_PLUS_AUTHEN_METH_KRB4',
            0x20 => 'TAC_PLUS_AUTHEN_METH_RCMD',
        },
        authen_type => {
            0x01 => 'TAC_PLUS_AUTHEN_TYPE_ASCII',
            0x02 => 'TAC_PLUS_AUTHEN_TYPE_PAP',
            0x03 => 'TAC_PLUS_AUTHEN_TYPE_CHAP',
            0x04 => 'TAC_PLUS_AUTHEN_TYPE_ARAP',
            0x05 => 'TAC_PLUS_AUTHEN_TYPE_MSCHAP',
        },
        authen_service => {
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
