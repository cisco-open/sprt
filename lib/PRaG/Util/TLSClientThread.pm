package PRaG::Util::TLSClientThread;

use strict;
use warnings;
use utf8;

use Coro;
use AnyEvent;
use EV;

use AnyEvent::Socket;
use AnyEvent::Handle;
use AnyEvent::Strict;

use Carp;
use Readonly;
use Ref::Util qw/is_hashref/;
use IO::Socket::SSL::Utils;
use Net::SSLeay;
use Data::Compare;
use Data::HexDump;
use Data::Dumper;

require Exporter;

use base qw(Exporter);

our $CMD_CONTINUE;
Readonly $CMD_CONTINUE => 1;

our @EXPORT_OK   = qw/client_thread compose_chain/;
our %EXPORT_TAGS = ( const => [qw/$CMD_CONTINUE/] );
Exporter::export_ok_tags('const');

# Separate thread for SSL Client
sub client_thread {
    my %h = @_;

    $h{socket_type} //= 'unix/';
    $h{out_channel} //= undef;

    # my $verification_failed = 0;

# If given as a list of X509* please note, that the all the chain certificates (e.g. all except the first) will be
#  "consumed" by openssl and will be freed if the SSL context gets destroyed - so you should never free them
#  yourself. But the servers certificate (e.g. the first) will not be consumed by openssl and thus must be freed
#  by the application.

    # SERVER_VALIDATE object:
    # {
    # 	validate: bool
    # 	action: 'inform' | 'drop'
    # 	trusted: array ref
    # }

    my $inner_cv = AnyEvent->condvar;

    my @ca_cert     = @{ $h{vars}->{SERVER_VALIDATE}->{trusted} // [] };
    my $ca_cert_pem = "";
    foreach my $cert (@ca_cert) {
        if ( is_hashref($cert) ) {
            $ca_cert_pem .= ( $ca_cert_pem ? "\n" : "" ) . $cert->{content};
        }
        else {
            $ca_cert_pem .= "\n" . $cert;
        }
    }

    my $r = AnyEvent::Handle->new(
        connect => [ $h{socket_type}, $h{socket} ],
        tls     => 'connect',
        tls_ctx => {
            method          => $h{vars}->{TLS_OPTIONS}->{versions},
            verify          => $h{vars}->{SERVER_VALIDATE}->{validate} ? 1 : 0,
            verify_peername => 0,
            cipher_list     => $h{vars}->{TLS_OPTIONS}->{ciphers},
            ca_cert         => $ca_cert_pem,

            # client cert and key only if exist
            exists $h{vars}->{CERTIFICATE}->{content}
            ? ( cert => join "\n", compose_chain( $h{vars}, 1 ) )
            : (),
            exists $h{vars}->{CERTIFICATE}->{keys}->{private}
            ? ( key => $h{vars}->{CERTIFICATE}->{keys}->{private} )
            : (),
        },
        no_delay    => 1,
        on_starttls => sub {
            my ( $handle, $success, $error_message ) = @_;

            if ($success) {
                if ( not $h{inner} ) {
                    $handle->push_shutdown;
                    $handle->_freetls;
                }
                $inner_cv->send('OK');
            }
            else {
                $handle->push_shutdown;
                my $w   = q{};
                my $tmp = q{};
                while (
                    length( $tmp = Net::SSLeay::BIO_read( $handle->{_wbio} ) ) )
                {
                    $w .= $tmp;
                }
                $handle->_freetls;
                $inner_cv->send( { buf => $w, message => $error_message } );
            }
        },
        on_connect_error => sub {
            my ( $handle, $message ) = @_;

            $handle->_freetls;
            $handle->destroy;
            $inner_cv->send($message);
        },
        on_error => sub {
            my ( $handle, $fatal, $message ) = @_;

            $handle->_freetls;
            $handle->push_shutdown;
            $inner_cv->send($message);
        }
    );

    my $result = $inner_cv->recv;
    undef $inner_cv;

    if ( $result eq 'OK' and defined $h{inner} ) {
        do_inner( $r, %h );
    }

    $r->destroy;
    return $result;
}

sub do_inner {
    my ( $handle, %h ) = @_;

    # $h{logger}->debug('Writing zeros');
    # $handle->push_write('');

    # $h{logger}->debug('Suspending thread');

    # $Coro::current->suspend;

    $h{semaphore}->wait;

    my $g = $h{inner}->new(
        owner      => $h{vars}->{OWNER},
        parameters => {},
        server     => $handle,
        logger     => $h{logger},
        vars       => $h{vars},
        debug      => $h{debug},
        radius     => {},
        dicts      => [],
        raw_eap    => 1,
        status     => exists $h{vars}->{START_STATE}
        ? $h{vars}->{START_STATE}
        : 'UNKNOWN',
    );

    $g->do;
    $g->done;

    undef $g;
    return;
}

sub compose_chain {

    # return list of X509* based on user config
    # (only identity, all but root, full chain)
    my ( $options, $pem ) = @_;

    $pem //= 0;
    my @chain;
    push @chain, $pem
      ? $options->{CERTIFICATE}->{content}
      : PEM_string2cert( $options->{CERTIFICATE}->{content} );

    # return if "only-identity" is the option
    return @chain if ( $options->{TLS_OPTIONS}->{chain} eq 'only-identity' );

    foreach my $cert ( @{ $options->{CERTIFICATE}->{chain} } ) {
        my $obj        = PEM_string2cert( $cert->{content} );
        my $hashed     = CERT_asHash($obj);
        my $selfsigned = Compare( $hashed->{issuer}, $hashed->{subject} );

        # Push root only if "full" is the option
        if ( $options->{TLS_OPTIONS}->{chain} eq 'full' && $selfsigned ) {
            push @chain, $pem ? $cert->{content} : $obj;
        }

        # Push any non-root certificate
        if ( !$selfsigned ) {
            push @chain, $pem ? $cert->{content} : $obj;
        }

        if ($pem) {
            CERT_free($obj);
        }

        undef $hashed;
    }
    return @chain;
}

1;
