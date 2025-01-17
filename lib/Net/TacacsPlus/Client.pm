
=head1 NAME

Net::TacacsPlus::Client - Tacacs+ client library

=head1 SYNOPSIS

	use Net::TacacsPlus::Client;
	use Net::TacacsPlus::Constants;
	
	my $tac = new Net::TacacsPlus::Client(
				host => 'localhost',
				key => 'secret');
	
	if ($tac->authenticate($username, $password, TAC_PLUS_AUTHEN_TYPE_PAP)){                   
		print "Authentication successful.\n";                                  
	} else {                                                    
		print "Authentication failed: ".$tac->errmsg()."\n";         
	}                                                           

	my @args = ( 'service=shell', 'cmd=ping', 'cmd-arg=10.0.0.1' );
	my @args_response;
	if($tac->authorize($username, \@args, \@args_response))
	{
		print "Authorization successful.\n";
		print "Arguments received from server:\n";
		print join("\n", @args_response);
	} else {
		print "Authorization failed: " . $tac->errmsg() . "\n";
	}

	@args = ( 'service=shell', 'cmd=ping', 'cmd-arg=10.0.0.1' );
	if($tac->account($username, \@args))
	{
		print "Accounting successful.\n";
	} else {
		print "Accounting failed: " . $tac->errmsg() . "\n";
	}

=head1 DESCRIPTION

Currently only PAP and ASCII authentication can be used agains Tacacs+ server.

Tested agains Cisco ACS 3.3 and Cisco (ftp://ftp-eng.cisco.com/pub/tacacs/) tac-plus server.

=cut

package Net::TacacsPlus::Client;

use strict;
use warnings;

our $VERSION = '1.11';

use 5.016_000;
use Carp::Clan;
use English qw/-no_match_vars/;
use Exporter;
use Fcntl qw/:DEFAULT/;
use IO::Socket;
use IO::Socket::IP -register;
use POSIX qw/EINTR/;
use Readonly;
use Syntax::Keyword::Try;

use Net::TacacsPlus::Constants;
use Net::TacacsPlus::Packet;

use base qw{ Class::Accessor::Fast };

__PACKAGE__->mk_accessors(
    qw{
      timeout
      retries
      port
      host
      key

      local_addr
      local_port

      tacacsserver
      session_id
      seq_no
      errmsg
      server_msg
      authen_method
      authen_type

      event_handler
      on_packet
      on_error
      on_success
      on_reject
    }
);

our @EXPORT_OK = qw/authenticate authorize account/;

Readonly my $DEFAULT_TIMEOUT   => 15;
Readonly my $DEFAULT_PORT      => 49;
Readonly my $DEFAULT_RETRIES   => 5;
Readonly my $DEFAULT_BUFF_SIZE => 1024;
Readonly my $MAX_SESSION_ID    => 2**32 - 1;

=head1 METHODS

=over 4

=item new( somekey => somevalue )

required parameters: host, key

	host	- tacacs server
	key	- ecryption secret

optional parameters: timeout, port

	timeout	- tcp timeout
	port	- tcp port

=cut

sub new {
    my $class  = shift;
    my %params = @_;

    #let the class accessor contruct the object
    my $self = $class->SUPER::new( \%params );

    $self->timeout($DEFAULT_TIMEOUT) if !defined $self->timeout;
    $self->port($DEFAULT_PORT)       if !defined $self->port;
    $self->retries($DEFAULT_RETRIES) if !defined $self->retries;

    return $self;
}

=item close()

Close socket connection.

=cut

sub close {
    my $self = shift;

    if ( $self->tacacsserver ) {
        if ( !close $self->tacacsserver ) {
            warn "Error closing IO socket!\n";
        }
        $self->tacacsserver(undef);
    }
    return;
}

=item init_tacacs_session()

Inititalize socket connection to tacacs server.

=cut

sub init_tacacs_session {
    my $self = shift;

    my $remote;
    $remote = IO::Socket::IP->new(
        Proto    => 'tcp',
        PeerAddr => $self->host,
        PeerPort => $self->port,
        Timeout  => $self->timeout,
        $self->local_addr ? ( LocalAddr => $self->local_addr ) : (),
        $self->local_port ? ( LocalPort => $self->local_port ) : (),
    );
    croak( 'unable to connect to ' . $self->host . q{:} . $self->port . "\n" )
      if !defined $remote;

    $self->tacacsserver($remote);
    $self->tacacsserver->blocking(0); # should not block because we use select()
    $self->session_id( int rand $MAX_SESSION_ID );
    $self->seq_no(1);
    $self->errmsg(q{});
    return;
}

=item errmsg()

Returns latest error message

=item authenticate(username, password, authen_type)

username        - tacacs+ username
password        - tacacs+ user password
authen_type     - TAC_PLUS_AUTHEN_TYPE_ASCII | TAC_PLUS_AUTHEN_TYPE_PAP
rem_addr        - remote client address (optional, default is 127.0.0.1)
port            - remote client port (optional, default is Virtual00)
new_password    - if set (other than undef) will trigger password change

=cut

sub authenticate {
    my ( $self, $username, $password, $authen_type, $rem_addr, $port,
        $new_password, @rest )
      = @_;

    my $status = 0;
    try {
        #init session. will die if unable to connect.
        $self->init_tacacs_session();    # moved within eval

        #tacacs+ START packet
        my $pkt;

        $rem_addr //= '127.0.0.1';
        $port     //= 'Virtual00';
        if ( $authen_type == TAC_PLUS_AUTHEN_TYPE_ASCII ) {
            $pkt = Net::TacacsPlus::Packet->new(

                #header
                'type'        => TAC_PLUS_AUTHEN,
                'seq_no'      => $self->seq_no,
                'flags'       => 0,
                'session_id'  => $self->session_id,
                'authen_type' => $authen_type,

                #start
                'action' => (
                    defined $new_password
                    ? TAC_PLUS_AUTHEN_CHPASS
                    : TAC_PLUS_AUTHEN_LOGIN
                ),
                'user'     => $username,
                'key'      => $self->key,
                'rem_addr' => $rem_addr,
                'port'     => $port,

                #if anything
                @rest,
            );
        }
        elsif ( $authen_type == TAC_PLUS_AUTHEN_TYPE_PAP ) {
            $pkt = Net::TacacsPlus::Packet->new(

                #header
                'type'          => TAC_PLUS_AUTHEN,
                'seq_no'        => $self->seq_no,
                'flags'         => 0,
                'session_id'    => $self->session_id,
                'authen_type'   => $authen_type,
                'minor_version' => 1,

                #start
                'action'   => TAC_PLUS_AUTHEN_LOGIN,
                'key'      => $self->key,
                'user'     => $username,
                'data'     => $password,
                'rem_addr' => $rem_addr,
                'port'     => $port,

                #if anything
                @rest,
            );
        }
        else {
            croak 'unsupported "authen_type" ' . $authen_type . q{.};
        }

        $self->_event(
            'on_packet',
            type   => TAC_PLUS_PKT_SEND,
            packet => $pkt,
            code   => $pkt->type_string
        );
        $pkt->send( $self->tacacsserver );

        #loop through REPLY/CONTINUE packets
        while (( $status != TAC_PLUS_AUTHEN_STATUS_FAIL )
            && ( $status != TAC_PLUS_AUTHEN_STATUS_PASS ) )
        {
            #receive reply packet
            my $reply = $self->recv_reply(TAC_PLUS_AUTHEN);
            $self->_event(
                'on_packet',
                type   => TAC_PLUS_PKT_RECV,
                packet => $reply,
                code   => $reply->type_string
            );

            Net::TacacsPlus::Packet->check_reply( $pkt, $reply );
            $self->seq_no( $reply->seq_no() + 1 );

            $self->server_msg( $reply->server_msg );

            $status = $reply->status();
            $pkt    = undef;
            if ( $status == TAC_PLUS_AUTHEN_STATUS_GETUSER ) {
                $pkt = Net::TacacsPlus::Packet->new(

                    #header
                    'type'       => TAC_PLUS_AUTHEN,
                    'seq_no'     => $self->seq_no,
                    'session_id' => $self->session_id,

                    #continue
                    'user_msg' => $username,
                    'data'     => q{},
                    'key'      => $self->key,
                );
            }
            elsif ( $status == TAC_PLUS_AUTHEN_STATUS_GETDATA
                and $self->server_msg !~ /new\s+password/sxm )
            {
                $pkt = Net::TacacsPlus::Packet->new(

                    #header
                    'type'       => TAC_PLUS_AUTHEN,
                    'seq_no'     => $self->seq_no,
                    'session_id' => $self->session_id,

                    #continue
                    'user_msg' => $password,
                    'data'     => q{},
                    'key'      => $self->key,
                );
            }
            elsif ($status == TAC_PLUS_AUTHEN_STATUS_GETPASS
                or $self->server_msg =~ /new\s+password/sxm )
            {
                $pkt = Net::TacacsPlus::Packet->new(

                    #header
                    'type'       => TAC_PLUS_AUTHEN,
                    'seq_no'     => $self->seq_no,
                    'session_id' => $self->session_id,

                    #continue
                    'user_msg' =>
                      ( defined $new_password ? $new_password : $password ),
                    'data' => q{},
                    'key'  => $self->key,
                );
            }
            elsif ( $status == TAC_PLUS_AUTHEN_STATUS_ERROR ) {
                croak('authen status - error');
            }
            elsif (( $status == TAC_PLUS_AUTHEN_STATUS_FAIL )
                || ( $status == TAC_PLUS_AUTHEN_STATUS_PASS ) )
            {
                last;
            }
            else {
                croak 'unhandled status '
                  . ( 0 + $status )
                  . ' (wrong secret key?)' . "\n";
            }

            if ($pkt) {
                $self->_event(
                    'on_packet',
                    type   => TAC_PLUS_PKT_SEND,
                    packet => $pkt,
                    code   => $pkt->type_string
                );
                $pkt->send( $self->tacacsserver );
            }
        }
    }
    catch {
        $self->_event( 'on_error', code => 'AUTHC', message => $EVAL_ERROR );
        $self->errmsg($EVAL_ERROR);
        $self->close();
        return;
    }

    $self->close();
    if ( $status == TAC_PLUS_AUTHEN_STATUS_FAIL ) {
        $self->_event( 'on_reject', code => 'AUTHC' );
        return;
    }

    $self->authen_method(TAC_PLUS_AUTHEN_METH_TACACSPLUS)
      ;    # used later for authorization
    $self->authen_type($authen_type);    # used later for authorization
    $self->_event( 'on_success', code => 'AUTHC' );
    return 1;
}

=item authorize(username, args, args_response)

username		- tacacs+ username
args			- tacacs+ authorization arguments
args_response   - updated by tacacs+ authorization arguments returned by server (optional)
rem_addr                - remote client address (optional, default is 127.0.0.1)
port                    - remote client port (optional, default is Virtual00)


=cut

sub authorize {
    my ( $self, $username, $args, $args_response, $rem_addr, $port ) = @_;

    $args_response //= [];
    croak 'pass array ref as args_response parameter'
      if ref $args_response ne 'ARRAY';

    my $status = 0;
    try {
        check_args($args);
        $self->init_tacacs_session();

        $rem_addr //= '127.0.0.1';
        $port     //= 'Virtual00';

        # tacacs+ authorization REQUEST packet
        my $pkt = Net::TacacsPlus::Packet->new(

            #header
            'type'       => TAC_PLUS_AUTHOR,
            'seq_no'     => $self->seq_no,
            'flags'      => 0,
            'session_id' => $self->session_id,

            #request
            'authen_method' => $self->authen_method,
            'authen_type'   => $self->authen_type,
            'user'          => $username,
            'args'          => $args,
            'key'           => $self->key,
            'rem_addr'      => $rem_addr,
            'port'          => $port,
        );

        $self->_event(
            'on_packet',
            type   => TAC_PLUS_PKT_SEND,
            packet => $pkt,
            code   => $pkt->type_string
        );
        $pkt->send( $self->tacacsserver );

        #receive reply packet
        my $reply = $self->recv_reply(TAC_PLUS_AUTHOR);
        $self->_event(
            'on_packet',
            type   => TAC_PLUS_PKT_RECV,
            packet => $reply,
            code   => $reply->type_string
        );

        Net::TacacsPlus::Packet->check_reply( $pkt, $reply );
        $self->seq_no( $reply->seq_no() + 1 );

        $status = $reply->status();
        if ( $status == TAC_PLUS_AUTHOR_STATUS_ERROR ) {
            croak('author status - error');
        }
        elsif ($status == TAC_PLUS_AUTHOR_STATUS_PASS_ADD
            || $status == TAC_PLUS_AUTHOR_STATUS_PASS_REPL )
        {
            @{$args_response} = @{ $reply->args() }
              ;    # make any arguments from server available to caller
            $self->_event(
                'on_success',
                code      => 'AUTHZ',
                status    => $status,
                arguments => $args_response
            );
        }
        elsif ( $status == TAC_PLUS_AUTHOR_STATUS_FAIL ) {
            $self->_event( 'on_reject', code => 'AUTHZ' );
        }
        else {
            croak( 'unhandled status ' . ( 0 + $status ) . q{} );
        }
    }
    catch {
        $self->_event( 'on_error', code => 'AUTHZ', message => $EVAL_ERROR );
        $self->errmsg($EVAL_ERROR);
        $self->close();
        return;
    }

    $self->close();
    return if $status == TAC_PLUS_AUTHOR_STATUS_FAIL;
    return $status;
}

=item check_args([])

Check if the arguments comply with RFC.

=cut

sub check_args {
    my $args = shift;
    my @args = @{$args};
    my %args;
    foreach my $arg (@args) {
        if ( $arg =~ /^([^=*]+)[=*](.*)$/sxm ) {
            $args{$1} = $2;
        }
        else {
            croak("Invalid authorization argument syntax: $arg");
        }
    }
    croak q{Missing mandatory argument 'service'}
      if ( !$args{'service'} );
    croak q{Must supply 'cmd' argument if service=shell is specified}
      if ( $args{'service'} eq 'shell' && !exists $args{'cmd'} );

    # TODO: more RFC checks
    return;
}

=item account(username, args)

username		- tacacs+ username
args			- tacacs+ authorization arguments
flags			- optional: tacacs+ accounting flags
			  default: TAC_PLUS_ACCT_FLAG_STOP
rem_addr                - remote client address (optional, default is 127.0.0.1)
port                    - remote client port (optional, default is Virtual00)

=cut

sub account {
    my ( $self, $username, $args, $flags, $rem_addr, $port ) = @_;

    my $status;
    try {
        $self->init_tacacs_session();

        $rem_addr //= '127.0.0.1';
        $port     //= 'Virtual00';

        # tacacs+ accounting REQUEST packet
        my $pkt = Net::TacacsPlus::Packet->new(

            #header
            'type'       => TAC_PLUS_ACCT,
            'seq_no'     => $self->seq_no,
            'flags'      => 0,
            'session_id' => $self->session_id,

            #request
            'acct_flags'    => $flags,
            'authen_method' => $self->authen_method,
            'authen_type'   => $self->authen_type,
            'user'          => $username,
            'args'          => $args,
            'key'           => $self->key,
            'rem_addr'      => $rem_addr,
            'port'          => $port,
        );

        $self->_event(
            'on_packet',
            type   => TAC_PLUS_PKT_SEND,
            packet => $pkt,
            code   => $pkt->type_string
        );
        $pkt->send( $self->tacacsserver );

        #receive reply packet
        my $reply = $self->recv_reply(TAC_PLUS_ACCT);
        $self->_event(
            'on_packet',
            type   => TAC_PLUS_PKT_RECV,
            packet => $reply,
            code   => $reply->type_string
        );

        Net::TacacsPlus::Packet->check_reply( $pkt, $reply );
        $self->seq_no( $reply->seq_no() + 1 );

        $status = $reply->status();
        if ( $status == TAC_PLUS_ACCT_STATUS_ERROR ) {
            croak('account status - error');
        }
        elsif ( $status == TAC_PLUS_ACCT_STATUS_SUCCESS ) {
            $self->_event(
                'on_success',
                code       => 'ACCT',
                status     => $status,
                server_msg => $reply->body->server_msg
            );

            # TODO: do we expect any attributes from server here?
        }
        else {
            croak( 'unhandled status ' . ( 0 + $status ) . q{} );
        }
    }
    catch {
        $self->_event( 'on_error', code => 'ACCT', message => $EVAL_ERROR );
        $self->errmsg($EVAL_ERROR);
        $self->close();
        return;
    }

    $self->close();
    return if $status == TAC_PLUS_ACCT_STATUS_ERROR;
    return $status;
}

=item recv_reply(type)

method for receiving TAC+ reply packet from the server.

C<type> is a L<Net::TacacsPlus::Packet> type.

=cut

sub recv_reply {
    my ( $self, $type ) = @_;

    Readonly my $NOT_FOUND_IDX => -1;

    my $raw_reply = q{};
    my $reply     = undef;
    my $retry     = 0;
    while ( $retry <= $self->retries ) {
        $retry++;
        my $readset = q{};
        vec( $readset, fileno( $self->tacacsserver ), 1 ) = 1;
        my $nfound = select $readset, undef, undef, $self->timeout;
        croak('reply read error: timeout') if $nfound == 0;
        if ( $nfound == $NOT_FOUND_IDX ) {
            next if $ERRNO == EINTR;
            croak("reply read error: $ERRNO");
        }
        my $buf;
        my $nread = $self->tacacsserver->recv( $buf, $DEFAULT_BUFF_SIZE );
        if ( !defined $nread ) {
            next if $ERRNO == EINTR;
            croak("reply read error: $ERRNO");
        }
        $raw_reply .= $buf;
        if ( length($raw_reply) >= TAC_PLUS_HEADER_SIZE ) {
            my ( $raw_header, $raw_body ) =
              unpack 'a' . TAC_PLUS_HEADER_SIZE . 'a*', $raw_reply;
            my $header = Net::TacacsPlus::Packet::Header->new(
                'raw_header' => $raw_header );
            if ( length($raw_body) >= $header->length ) {
                $reply = Net::TacacsPlus::Packet->new(
                    'type' => $type,
                    'raw'  => $raw_reply,
                    'key'  => $self->key,
                );
                last;
            }
        }
    }
    croak('reply read error: maximum retry count exceeded') if !defined $reply;
    return $reply;
}

sub unset_handler {
    my ($self) = @_;
    $self->event_handler(undef);
    return;
}

sub DESTROY {
    my $self = shift;

    $self->event_handler(undef);
    $self->close();
    return;
}

sub _event {
    my ( $self, $event, @data ) = @_;

    # execute event is set
    if ( $self->$event and $self->event_handler ) {
        my $e_coderef = $self->$event;
        return $self->event_handler->$e_coderef(@data);
    }

    return;
}

1;

=back

=head1 AUTHOR

Jozef Kutej - E<lt>jkutej@cpan.orgE<gt>

Authorization and Accounting contributed by Rubio Vaughan E<lt>rubio@passim.netE<gt>

=head1 VERSION

1.07

=head1 SEE ALSO

tac-rfc.1.78.txt, Net::TacacsPlus::Packet

Complete client script C<Net-TacacsPlus/examples/client.pl>.

=head1 TODO

	tacacs+ CHAP, ARAP, MSCHAP authentication

=head1 COPYRIGHT AND LICENSE

Copyright (C) 2006 by Jozef Kutej

This library is free software; you can redistribute it and/or modify
it under the same terms as Perl itself, either Perl version 5.8.4 or,
at your option, any later version of Perl 5 you may have available.

=cut

