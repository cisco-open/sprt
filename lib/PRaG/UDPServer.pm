package PRaG::UDPServer;

use strict;
use warnings;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

with 'MooseX::Getopt';
with 'MooseX::Getopt::GLD' => { getopt_conf => ['pass_through'] };

use Authen::Radius;
use Carp;
use Cwd 'abs_path';
use Data::Dumper;
use Data::GUID;
use Data::HexDump;
use File::Basename;
use File::Temp           qw/tempfile/;
use IO::Socket           ();
use JSON::MaybeXS        qw/encode_json decode_json/;
use List::MoreUtils      qw/firstidx indexes/;
use Math::Random::Secure qw/irand/;
use Path::Tiny;
use Readonly;
use Ref::Util          qw/is_plain_hashref/;
use String::ShellQuote qw/shell_quote/;
use Time::HiRes        qw/gettimeofday/;
use English            qw( -no_match_vars );
use Syntax::Keyword::Try;
use YAML qw/LoadFile DumpFile/;
use logger;

use PRaG::Util::Procs;
use PRaG::Util::ENVConfig qw/apply_env_cfg/;

use base qw(Net::Server::PreFork);

Readonly my $PKT_SENT => 1;
Readonly my $PKT_RCVD => 2;

Readonly my $ACTION_ACK          => 'ack';
Readonly my $ACTION_NAK          => 'nak';
Readonly my $NO_ACTION           => 'nothing';
Readonly my $AFTER_ACTION_DROP   => 'drop';
Readonly my $AFTER_ACTION_REAUTH => 'reauth';
Readonly my $AFTER_ACTION_MAB    => 'reauth-mab';
Readonly my $NO_ERR_CAUSE        => '000';

Readonly my $MESSAGE_AUTH_CODE => 80;

Readonly my $OWNER_POSTFIX => '__udp_server';

Readonly my %STATUS_CODES => (
    _S_COA_BOUNCE            => 'COA_BOUNCE',
    _S_COA_DISABLE           => 'COA_DISABLE',
    _S_COA_REAUTH            => 'COA_REAUTH',
    _S_COA_DEFAULT           => 'COA_DEFAULT',
    _S_COA_DISCONNECT        => 'COA_DISCONNECT',
    _S_COA_DISCONNECT_ACCEPT => 'COA_DISCONNECT_ACCEPT',
    _S_COA_ACK               => 'COA_ACK',
    _S_COA_NAK               => 'COA_NAK',
    _S_COA_DROP              => 'COA_DROP',
);

for my $k ( keys %STATUS_CODES ) {
    has $k => ( is => 'ro', isa => 'Str', default => $STATUS_CODES{$k} );
}

with 'PRaG::Role::DB';

# CLI attributes
has 'pid_file' => (
    is            => 'rw',
    isa           => 'Str',
    required      => 1,
    documentation => 'Filename to store pid of parent process.',
);
has 'log_file' => (
    is            => 'rw',
    isa           => 'Str',
    required      => 0,
    documentation => 'Name of log file to be written to.',
);
has 'appdir' => (
    is            => 'rw',
    isa           => 'Str',
    required      => 0,
    documentation =>
'Directory to chroot to after bind process has taken place and the server is still running as root.',
);
has 'configfile' => (
    is            => 'rw',
    isa           => 'Str',
    required      => 0,
    documentation => 'SPRT configuration file.',
);
has 'background' => (
    is            => 'rw',
    isa           => 'Bool',
    default       => 0,
    documentation => 'Run in background',
);
has 'setsid' => (
    is            => 'rw',
    isa           => 'Bool',
    default       => 0,
    documentation => 'Run the POSIX::setsid() command to truly daemonize',
);
has 'verbose' => (
    is            => 'rw',
    isa           => 'Bool',
    default       => 0,
    documentation => 'Enable verbose mode.',
);

has 'config' => (
    is     => 'ro',
    isa    => 'HashRef',
    writer => '_set_config',
    traits => ['NoGetopt'],
);
has 'logger' => (
    is     => 'ro',
    isa    => 'logger',
    writer => '_set_logger',
    traits => ['NoGetopt'],
);

# RADIUS parser
has '_r' => (
    is      => 'ro',
    isa     => 'Maybe[Authen::Radius]',
    default => undef,
    writer  => '_set_r',
    clearer => '_no_r',
);

# Request handlers
has '_h' => ( is => 'ro', isa => 'HashRef', writer => '_set_handlers' );

# Authenticator from (Disconnect/CoA)-Request
has '_req_a' => (
    is      => 'ro',
    isa     => 'Maybe[Str]',
    writer  => '_set_req_authenticator',
    clearer => '_no_req_a',
);

# Request type
has '_type' =>
  ( is => 'ro', isa => 'Int', writer => '_set_type', clearer => '_no_type' );

# Attributes from (Disconnect/CoA)-Request
has '_r_atts' => (
    is      => 'ro',
    isa     => 'Maybe[ArrayRef]',
    writer  => '_got_attributes',
    clearer => '_no_attributes',
);

# Loaded server data
has '_srv' => (
    is      => 'ro',
    isa     => 'Maybe[HashRef]',
    writer  => '_set_srv',
    clearer => '_no_srv',
);

# Loaded session data
has '_sess' => (
    is      => 'ro',
    isa     => 'Maybe[HashRef]',
    writer  => '_set_session',
    clearer => '_no_session',
);

#Session status
has '_session_status' => (
    is      => 'rw',
    isa     => 'Str',
    default => 'UNKNOWN',
    clearer => '_no_session_status',
    trigger => \&_push_session_status,
);

# Packets
has 'flow' => (
    is     => 'ro',
    isa    => 'ArrayRef',
    writer => '_set_flow',
    traits => ['NoGetopt'],
);

sub start_server {
    my $self = shift;

    $self->_init_config;
    $self->_init_logger;
    $self->_init_radius;
    $self->_init_handlers;

    @_ = undef;

    $self->logger->info( 'Starting UPD listener on '
          . $self->config->{coa}->{listen_on} . q{:}
          . $self->config->{coa}->{port}
          . '/udp' );
    try {
        $self->run(
            port => {
                host  => $self->config->{coa}->{listen_on},
                port  => $self->config->{coa}->{port},
                ipv   => 4,                                   # IPv4 only
                proto => 'udp',                               # UDP protocol
            },
            pid_file   => $self->pid_file,
            log_file   => $self->log_file || undef,
            log_level  => 3,
            background => $self->background || undef,
            setsid     => $self->setsid     || undef,
        );
    }
    catch {
        $self->logger->fatal( q{Something went wrong: } . $EVAL_ERROR );
    };
    return;
}

sub _init_config {
    my $self = shift;

    my $DIR;
    if ( !$self->configfile || ( $self->configfile && !-e $self->configfile ) )
    {
        print "Trying default config file.\n";
        ( undef, $DIR, undef ) = fileparse(__FILE__);
        $DIR = abs_path( $DIR . '../../' ) . q{/};
        $self->configfile("${DIR}config.yml");
    }
    else {
        ( undef, $DIR, undef ) = fileparse( $self->configfile );
    }

    if ( !-e $self->configfile ) { croak 'Config file not found!' }

    $self->_set_config( LoadFile( $self->configfile ) );
    $self->config->{appdir} =
      ( $self->appdir && -d $self->appdir ) ? $self->appdir : $DIR;

    apply_env_cfg( $self->config );

    return $self;
}

sub _init_logger {

    # Create logger
    my $self = shift;
    my $owner =
      $self->_srv ? $self->_srv->{owner} . $OWNER_POSTFIX : '_udp_server';

    if ( $self->logger ) {
        $self->logger->debug( 'About to switch logger user. Old: '
              . $self->logger->{owner}
              . ' New: '
              . $owner );
    }
    return $self if ( $self->logger && $self->logger->{owner} eq $owner );

    $self->_set_logger(
        logger->new(
            'log-parameters' => \scalar( $self->config->{log4perl} ),
            owner            => $owner,
            chunk            => Data::GUID->guid_string,
            debug            => $self->config->{debug},
            syslog           => $self->config->{syslog},
        )
    );

    $self->logger->debug('Verbose is enabled.');
    return $self;
}

sub _init_radius {
    my $self = shift;

    $self->logger->debug('Initializing RADIUS handler');
    $self->_no_r;
    my $r = Authen::Radius->new_no_connection(
        Rfc3579MessageAuth => 1,
        Debug              => $self->config->{debug},
    );

    die $self->logger->error( Authen::Radius->strerror ) . "\n"
      if ( Authen::Radius->get_error ne 'ENONE' );

    $self->_set_r($r);
    $self->_load_dictionaries;

    return $self;
}

sub _init_handlers {
    my $self = shift;

    $self->_set_handlers(
        {
            DISCONNECT_REQUEST,
            'process_disconnect',
            COA_REQUEST,
            'process_coa',
            'coa',
            {
                'bounce-host-port'  => 'prep_coa_command',
                'disable-host-port' => 'prep_coa_command',
                'reauthenticate'    => 'prep_coa_reauth',
                'default'           => 'prep_coa_command'
            }
        }
    );

    return $self;
}

sub _clear_flow {
    my $self = shift;
    $self->_set_flow( [] );
    return $self if ( defined wantarray );
    return;
}

sub _load_dictionaries {
    my $self = shift;
    foreach my $dict ( @{ $self->config->{dictionaries} } ) {
        $self->_r->load_dictionary(
            is_plain_hashref($dict) ? $dict->{file} : $dict,
            format => is_plain_hashref($dict)
            ? ( $dict->{format} || 'freeradius' )
            : 'freeradius'
        );
    }
    return;
}

sub _load_session {
    my $self = shift;

    $self->_no_session;
    $self->_no_session_status;
    my $idx =
      firstidx { $_->{Name} eq 'Calling-Station-Id' } @{ $self->_r_atts };
    return if $idx < 0;
    my $mac = $self->_r_atts->[$idx]->{Value} =~ s/[:.-]/%/rg;
    my $query =
        sprintf q{SELECT * FROM %s }
      . q{WHERE %s ILIKE %s AND %s = %s AND %s = %s }
      . q{AND NOT (attributes @> '{"State": "DROPPED"}'::jsonb) LIMIT 1},
      $self->_db->quote_identifier( $self->config->{tables}->{sessions} ),
      $self->_db->quote_identifier('mac'), $self->_db->quote($mac),
      $self->_db->quote_identifier('owner'),
      $self->_db->quote( $self->_srv->{owner} ),
      $self->_db->quote_identifier('server'),
      $self->_db->quote( $self->_srv->{attributes}->{resolved}
          // $self->_srv->{address} );

    $self->logger->debug( 'Executing SQL: ' . $query );
    my $session_data;
    try {
        $session_data = $self->_db->selectrow_hashref($query);
    }
    catch {
        $self->logger->error( 'Got DB exception: ' . $EVAL_ERROR );
        return;
    };
    if ( !$session_data ) {
        $self->logger->debug('Session not found');
        return;
    }
    if ( $session_data->{attributes} ) {
        $session_data->{attributes} =
          decode_json( $session_data->{attributes} );
    }
    if ( $session_data->{RADIUS} ) {
        $session_data->{RADIUS} = decode_json( $session_data->{RADIUS} );
    }
    $self->logger->debug( 'Session: ' . Dumper($session_data) );
    $self->_set_session($session_data);
    return 1;
}

# Add new packet to the flow
sub _new_packet {
    my $self = shift;
    my $h    = {@_};
    push @{ $self->flow }, $h;
    return;
}

sub child_init_hook {
    my $self = shift;
    srand irand();
    $self->db_connect();
    return;
}

sub configure_hook {
    my $self = shift;

    ### change the packet len?
    $self->{server}->{udp_recv_len} =
      $self->config->{coa}->{recv_length};    # default is 4096
    return;
}

sub process_request {
    my $self = shift;
    my $prop = $self->{'server'};

    $self->_no_srv;
    $self->_init_logger;    # switch to default if it is user-specific
    $self->logger->debug(
        'Got packet from ' . $prop->{'peeraddr'} . q{:} . $prop->{'peerport'} );
    local $Data::Dumper::Sortkeys = 1;
    $self->check_db;
    if ( !$self->load_server( $prop->{'peeraddr'} ) ) {
        $self->logger->debug('Dropping CoA');
        return;
    }
    if ( !$self->_srv->{coa} ) {
        $self->logger->debug('Server is not enabled for CoA, dropping');
        return;
    }

    $self->_init_logger;    # switch to user-specific
    $self->_no_req_a;
    $self->_no_attributes;
    $self->_no_type;
    $self->_r->authenticator(q{});
    $self->_r->secret( $self->_srv->{attributes}->{shared} );
    if ( $self->config->{debug} ) {
        print "Got packet: \n";
        print HexDump( $prop->{'udp_data'} );
    }
    my ( $type, $authenticator ) =
      $self->_r->recv_packet( 0, $prop->{'udp_data'} );
    if ( !$type ) {
        $self->logger->error( 'Got error: ' . $self->_r->strerror );
        if ( $self->config->{debug} ) {
            print 'Got error: ' . $self->_r->strerror . "\n";
        }
        return;
    }
    return if ( !$type );
    print "Got type: $type\n";
    $self->_set_type($type);
    $self->_set_req_authenticator($authenticator);
    $self->_got_attributes( [ $self->_r->get_attributes ] );

    $self->_clear_flow;
    $self->_new_packet(
        type   => $PKT_RCVD,
        packet => $self->_r_atts,
        code   => $self->_type_to_str,
        time   => scalar gettimeofday()
    );

    if (   $self->_type != Authen::Radius::DISCONNECT_REQUEST
        && $self->_type != Authen::Radius::COA_REQUEST )
    {
        $self->logger->warn( 'Unexpected packet from '
              . $prop->{'peeraddr'}
              . ' with type '
              . $self->_type_to_str . ' ('
              . $self->_type
              . ')' );
        $self->logger->debug(
            'Received attributes: ' . Dumper( [ $self->_r->get_attributes ] ) );
        return;
    }

    return 1 if $self->special_handling;
    return 1 if $self->process_session;

    if ( $self->_h->{ $self->_type }
        && ( my $meth = $self->can( $self->_h->{ $self->_type } ) ) )
    {
        $self->prepare_for_reply;
        $self->$meth();
    }
    else {
        $self->logger->warn( 'No handler found for packet from '
              . $prop->{'peeraddr'}
              . ' with type '
              . $self->_type );
        $self->logger->debug(
            'Received attributes: ' . Dumper( [ $self->_r->get_attributes ] ) );
    }

    return;
}

sub special_handling {
    my $self = shift;

    if ( $self->config->{debug} ) { print "Check special_handling\n"; }
    if (
        (
            firstidx {
                $_->{Name} eq 'Service-Type' && $_->{Value} eq 'Authorize-Only'
            }
            @{ $self->_r_atts }
        ) >= 0
      )
    {
        $self->logger->warn(
'Service-Type is Authorize-Only in Disconnect-Request, hence Disconnect-NAK per RFC.'
        );
        $self->prepare_for_reply;
        $self->process_error( '404', '404' );
        return 1;
    }

    return;
}

sub _no_coa {
    my $self = shift;

    if ( $self->config->{debug} ) { print "Check _no_coa\n"; }
    return
      if ( $self->_type == Authen::Radius::DISCONNECT_REQUEST )
      ;    # disconnect requests always supported
    return
      if ( $self->_sess->{attributes}->{coa} )
      ;    # coa flag set for the session, return false

    $self->logger->debug('CoA flag not set, send error');
    $self->prepare_for_reply;
    $self->process_error( '504', '501' );

    return 1;
}

sub _session_blocked {
    my $self = shift;

    if ( $self->config->{debug} ) { print "Check _session_blocked\n"; }
    return
      if ( !$self->_sess->{attributes}->{'job-chunk'} )
      ;    # session not blocked, return false

    $self->logger->debug('Session blocked by another process, send error');
    $self->prepare_for_reply;
    $self->process_error( '506', '506' );

    return 1;
}

sub drop_session_json {
    my $self = shift;
    my $h    = {@_};

    return {
        protocol => 'accounting',
        count    => 1,
        radius   => {
            accounting => [
                {
                    name   => 'Acct-Terminate-Cause',
                    value  => $h->{cause} // 'Admin-Reset',
                    vendor => undef
                },
                {
                    name   => 'Acct-Session-Time',
                    value  => 'timeFromCreate',
                    vendor => undef
                },
                { name => 'Acct-Delay-Time', value => 0, vendor => undef },
            ],
        },
        parameters => {
            'sessions'        => { chunk => $h->{chunk} },
            'action'          => 'drop',
            'job_chunk'       => $h->{chunk},
            'accounting_type' => 'drop',
            'save_sessions'   => 1,
            'keep_job_chunk'  => $h->{more} // 0,
        }
    };
}

sub reauth_session_json {
    my $self = shift;
    my $h    = {@_};

    my $idx = firstidx {
        $_->{Name} eq 'Cisco-AVPair'
          && index( $_->{Value}, 'audit-session-id=' ) >= 0
    }
    @{ $self->_r_atts };
    my $radius = {};
    if ( $idx >= 0 ) {
        $self->logger->debug(
            'Saving audit-session-id: ' . $self->_r_atts->[$idx]->{Value} );
        $radius->{request} = [
            {
                value      => $self->_r_atts->[$idx]->{Value},
                dictionary => 'dictionary.cisco',
                name       => 'Cisco-AVPair',
                vendor     => 'Cisco',
            }
        ];
        $radius->{accounting} = [
            {
                value      => $self->_r_atts->[$idx]->{Value},
                dictionary => 'dictionary.cisco',
                name       => 'Cisco-AVPair',
                vendor     => 'Cisco',
            }
        ];
    }

    return {
        protocol   => $h->{reauth} || 'mab',
        count      => 1,
        radius     => $radius,
        parameters => {
            'sessions'        => { chunk => $h->{chunk} },
            'reauth'          => $h->{reauth} || 'mab',
            'same_session_id' => $h->{same_session_id} // 0,
            'action'          => 'reauth',
            'job_chunk'       => $h->{chunk},
            'download_dacl'   => $h->{dacl} // 1,
            'save_sessions'   => 1,
            'keep_job_chunk'  => $h->{more} // 0,
        }
    };
}

sub get_coa_action {
    my ( $self, %o ) = @_;

    if ( $self->_sess->{attributes}->{coa}->{ $o{command} } ) {
        $self->logger->debug( 'Got COA options:'
              . Dumper( $self->_sess->{attributes}->{coa}->{ $o{command} } ) );
        $o{act}   = $self->_sess->{attributes}->{coa}->{ $o{command} }->{act};
        $o{after} = $self->_sess->{attributes}->{coa}->{ $o{command} }->{after};
        $o{same_id} =
          $self->_sess->{attributes}->{coa}->{ $o{command} }->{same_id};
        $o{err_cause} =
          $self->_sess->{attributes}->{coa}->{ $o{command} }->{err_cause}
          // $o{err_cause};
        $o{drop_old} =
          $self->_sess->{attributes}->{coa}->{ $o{command} }->{drop_old}
          // $o{drop_old};
    }

    return
      wantarray
      ? ( $o{act}, $o{after}, $o{same_id}, $o{err_cause}, $o{drop_old} )
      : \%o;
}

sub prep_coa_command {
    my ( $self, $jsondata, $chunk, $cmd ) = @_;

    my $opts = $self->get_coa_action( %{ $self->_comand_and_defaults($cmd) } );
    if ( $opts->{command} eq 'bounce' ) {
        $self->_session_status( $self->_S_COA_BOUNCE );
    }
    if ( $opts->{command} eq 'disable' ) {
        $self->_session_status( $self->_S_COA_DISABLE );
    }
    if ( $opts->{command} eq 'default' ) {
        $self->_session_status( $self->_S_COA_DEFAULT );
    }

    $self->logger->debug( "Got subscriber:command=$cmd, sending "
          . $opts->{act}
          . ' and doing '
          . $opts->{after} );
    return ( $opts->{act}, $opts->{err_cause} )
      if ( $opts->{after} eq $NO_ACTION );
    if ( $opts->{drop_old} ) {
        push @{ $jsondata->{sequence} },
          $self->drop_session_json( chunk => $chunk, more => 1 );
    }
    return ( $opts->{act}, $opts->{err_cause} )
      if ( $opts->{after} eq $AFTER_ACTION_DROP );
    push @{ $jsondata->{sequence} },
      $self->reauth_session_json(
        chunk  => $chunk,
        reauth => $opts->{after} eq $AFTER_ACTION_REAUTH
        ? $self->_sess->{attributes}->{proto} || 'mab'
        : 'mab',
        same_session_id => $opts->{same_id},
        dacl            => 1,
      );
    return ( $opts->{act}, $opts->{err_cause} );
}

sub prep_coa_reauth {
    my ( $self, $jsondata, $chunk ) = @_;
    my $rtype;
    my $idx = firstidx {
        $_->{Name} eq 'Cisco-AVPair'
          && index( $_->{Value}, 'subscriber:reauthenticate-type=' ) >= 0
    }
    @{ $self->_r_atts };
    if ( $idx >= 0 ) {
        ( undef, $rtype ) = split /=/sxm, $self->_r_atts->[$idx]->{Value}, 2;
    }
    else {
        $rtype = 'default';
    }

    $self->logger->debug(
        "Got subscriber:command=reauthenticate, reauth-type is $rtype");
    my $opts = $self->get_coa_action(
        %{ $self->_comand_and_defaults('reauthenticate') } );
    $self->_session_status( $self->_S_COA_REAUTH );
    foreach my $k ( keys %{$opts} ) {
        if ( is_plain_hashref( $opts->{$k} ) ) {
            $opts->{$k} = $opts->{$k}->{$rtype};
        }
    }

    return ( $opts->{act}, $opts->{err_cause} )
      if ( !$opts->{after} || $opts->{after} eq $NO_ACTION );
    if ( $opts->{drop_old} ) {
        push @{ $jsondata->{sequence} },
          $self->drop_session_json( chunk => $chunk, more => 1 );
    }
    return ( $opts->{act}, $opts->{err_cause} )
      if ( $opts->{after} eq $AFTER_ACTION_DROP );
    push @{ $jsondata->{sequence} },
      $self->reauth_session_json(
        chunk  => $chunk,
        reauth => $opts->{after} eq $AFTER_ACTION_REAUTH
        ? $self->_sess->{attributes}->{proto} || 'mab'
        : 'mab',
        same_session_id => $opts->{same_id},
        dacl            => 1,
      );
    return ( $opts->{act}, $opts->{err_cause} );
}

sub process_session {
    my $self     = shift;
    my $jsondata = { owner => $self->_srv->{owner}, sequence => [] };

    return if ( !$self->_load_session );    # fail if couldn't find session
    return 1
      if $self->_no_coa
      ; # if coa not enabled for session send error and return true to finish processing
    return 1
      if $self->_session_blocked;    # stop doing anything if session is blocked

    if ( $self->config->{debug} ) {
        print "Checks passed\n";
        print "Got attributes:\n"
          . join( "\n",
            map { $_->{Name} . q{=} . $_->{Value} } @{ $self->_r_atts } )
          . "\n";
    }

    my $chunk = $self->block_session;
    if ( !$chunk ) { $self->process_error( '506', '506' ); return 1; }

    if ( $self->_type == Authen::Radius::COA_REQUEST ) {

        # treat Cisco-AVPairs here
        # Cisco:Avpair=“subscriber:command=bounce-host-port”
        # Cisco:Avpair=“subscriber:command=disable-host-port”
        # Cisco:Avpair=“subscriber:command=reauthenticate”
        # Cisco:Avpair=“subscriber:reauthenticate-type=<last | rerun>”
        my $cmd = 'default';
        my $idx = firstidx {
            $_->{Name} eq 'Cisco-AVPair'
              && ( index( $_->{Value}, 'subscriber:command' ) >= 0 )
        }
        @{ $self->_r_atts };
        if ( $self->config->{debug} ) { print "Got index: $idx\n"; }
        if ( $idx >= 0 ) {
            ( undef, $cmd ) = split /=/sxm, $self->_r_atts->[$idx]->{Value}, 2;
        }
        my $meth = $self->can( $self->_h->{coa}->{$cmd}
              // $self->_h->{coa}->{'default'} );

        my ( $act, $err_cause ) = $self->$meth( $jsondata, $chunk, $cmd );
        if ( $act eq $ACTION_ACK ) {
            $self->prepare_for_reply;
            $self->_session_status( $self->_S_COA_ACK );
            $self->process_response( Authen::Radius::COA_ACK, $NO_ERR_CAUSE );
        }
        elsif ( $act eq $ACTION_NAK ) {
            $self->prepare_for_reply;
            $self->_session_status( $self->_S_COA_NAK );
            $self->process_response( Authen::Radius::COA_NAK, $err_cause );
        }
        else {
            $self->_session_status( $self->_S_COA_DROP );
            $self->_add_to_flow;
            $self->_set_flow( [] );
            $self->logger->debug('No action, dropping');
            return 1;
        }
    }
    else {
        # Drop session
        $self->logger->debug('Got DISCONNECT_REQUEST hence dropping session.');
        $self->_session_status( $self->_S_COA_DISCONNECT );

        $self->prepare_for_reply;
        $self->_r->add_attributes(
            { Name => 'Acct-Terminate-Cause', Value => 'Admin-Reset', } );
        $self->_session_status( $self->_S_COA_DISCONNECT_ACCEPT );
        $self->process_response( Authen::Radius::DISCONNECT_ACCEPT,
            $NO_ERR_CAUSE );

        push @{ $jsondata->{sequence} },
          $self->drop_session_json( chunk => $chunk );
    }

    if (   !$jsondata
        || !$jsondata->{sequence}
        || !scalar @{ $jsondata->{sequence} } )
    {
        $self->unblock_session;
        return 1;
    }
    $self->start_process( $jsondata, 'CoA for session' );

    return 1;
}

sub process_disconnect {

    # Disconnect Request received for unknown session
    my $self = shift;

    my $action = $self->_srv->{attributes}->{no_session_dm_action}
      // 'disconnect-nak';
    my $err_cause = $self->_srv->{attributes}->{dm_err_cause} // '503';

    if ( $action eq 'drop' ) {
        $self->logger->debug('Dropping CoA as configured');
        return;
    }

    my $code =
      $action eq 'disconnect-nak' ? DISCONNECT_REJECT : DISCONNECT_ACCEPT;
    if ( $code == DISCONNECT_ACCEPT ) {

        # copy attributes here...
    }

    return $self->process_response( $code, $err_cause );

# {"dns": "", "shared": "cisco", "resolved": "10.48.26.64", "dm_err_cause": "503", "coa_nak_err_cause": "503", "no_session_action": "coa-nak", "no_session_dm_action": "disconnect-nak"}
}

sub process_coa {

    # CoA received for unknown session
    my $self = shift;

    my $action    = $self->_srv->{attributes}->{no_session_action} // 'coa-nak';
    my $err_cause = $self->_srv->{attributes}->{coa_nak_err_cause} // '503';

    if ( $action eq 'drop' ) {
        $self->logger->debug('Dropping CoA as configured');
        return;
    }

    my $code =
      $action eq 'coa-nak' ? Authen::Radius::COA_NAK : Authen::Radius::COA_ACK;
    if ( $code == COA_ACK ) {

        # copy attributes here...
    }

    return $self->process_response( $code, $err_cause );
}

sub process_error {
    my ( $self, $dm_errcode, $coa_errcode ) = @_;

    if ( $self->_type == Authen::Radius::DISCONNECT_REQUEST ) {
        $self->_srv->{attributes}->{dm_err_cause}         = $dm_errcode;
        $self->_srv->{attributes}->{no_session_dm_action} = 'disconnect-nak';
        $self->process_disconnect;
    }
    else {
        $self->_srv->{attributes}->{coa_nak_err_cause} = $coa_errcode;
        $self->_srv->{attributes}->{no_session_action} = 'coa-nak';
        $self->process_coa;
    }
    return;
}

sub process_response {
    my ( $self, $code, $err_cause ) = @_;
    my $prop = $self->{'server'};

    if ( $err_cause ne $NO_ERR_CAUSE ) {
        $self->_r->add_attributes(
            { Name => 'Error-Cause', Value => $err_cause, } );
    }

    $self->_new_packet(
        type   => $PKT_SENT,
        packet => [ $self->_r->get_attributes ],
        code   => $self->_type_to_str($code),
        time   => scalar gettimeofday()
    );

    $self->_add_to_flow;
    $self->_set_flow( [] );

    my $data = $self->_r->send_packet( $code, 1 );
    if ( $self->config->{debug} ) { print "Sending response back\n"; }
    $prop->{'client'}->send( $data, 0 );
    return;
}

sub load_server {
    my ( $self, $ip ) = @_;

    $self->_set_srv(undef);
    $self->logger->debug( 'Loading server ' . $ip );
    my $sql = sprintf 'SELECT * FROM %s WHERE %s = %s LIMIT 1',
      $self->_db->quote_identifier( $self->config->{tables}->{servers} ),
      $self->_db->quote_identifier('address'),
      $self->_db->quote($ip);
    $self->logger->debug( 'Executing SQL: ' . $sql );
    my $server_data;
    try { $server_data = $self->_db->selectrow_hashref($sql); }
    catch { };

    if ( $self->_db->err ) {
        $self->logger->error( 'Got DB exception: ' . $self->_db->errstr );
        return;
    }
    if ( !$server_data ) { $self->logger->debug('Server not found'); return; }
    $server_data->{attributes} = decode_json( $server_data->{attributes} );

    $self->_set_srv($server_data);

    $self->logger->debug( 'Loaded server of '
          . $self->_srv->{owner}
          . q{. Will switch to owner's logger.} );
    return 1;
}

sub _type_to_str {
    my ( $self, $code ) = @_;
    $code ||= $self->_type;
    my %codes = (
        '1'  => 'ACCESS_REQUEST',
        '2'  => 'ACCESS_ACCEPT',
        '3'  => 'ACCESS_REJECT',
        '4'  => 'ACCOUNTING_REQUEST',
        '5'  => 'ACCOUNTING_RESPONSE',
        '6'  => 'ACCOUNTING_STATUS',
        '11' => 'ACCESS_CHALLENGE',
        '12' => 'STATUS_SERVER',
        '40' => 'DISCONNECT_REQUEST',
        '41' => 'DISCONNECT_ACCEPT',
        '42' => 'DISCONNECT_REJECT',
        '43' => 'COA_REQUEST',
        '44' => 'COA_ACCEPT',
        '44' => 'COA_ACK',
        '45' => 'COA_REJECT',
        '45' => 'COA_NAK',
    );

    return $codes{$code} // q{};
}

sub start_process {
    my ( $self, $jsondata, $process_name ) = @_;

    my $encoded_json = encode_json($jsondata);

    return PRaG::Util::Procs::start_new_process(
        $encoded_json,
        cmd            => 'CONTINUE',
        logger         => $self->logger,
        owner          => $self->_srv->{owner},
        max_cli_length => $self->config->{generator}->{max_cli_length},
        port           => $self->config->{generator}->{port} // 52525,
        json           => JSON::MaybeXS->new( utf8 => 1 ),
        configfile     => $self->config->{appdir} . 'config.yml',
        verbose        => $self->config->{debug} // 0,
        max_per_user   => $self->config->{processes}->{max},

        # host_socket    => $self->config->{generator}->{host_socket},
    );
}

sub block_session {
    my ($self) = @_;
    my $chunk = Data::GUID->guid_string;

    my $where = q/"owner" = ? AND "id" = ? AND "server" = ?/;
    my @bind  = (
        $self->_srv->{owner},
        $self->_sess->{id},
        $self->_srv->{attributes}->{resolved} // $self->_srv->{address}
    );

    my $update = qq/'{"job-chunk"}','"$chunk"'::jsonb,true/;
    my $sql =
        q/UPDATE /
      . $self->config->{tables}->{sessions}
      . qq/ SET attributes = jsonb_set(attributes, $update) WHERE $where/;

    $self->logger->debug( "Executing $sql with params " . join q{,}, @bind );
    try { $self->_db->do( $sql, undef, @bind ); }
    catch { };
    if ( $self->_db->err ) {
        $self->logger->warn( 'Got DB exception: ' . $self->_db->errstr );
        return;
    }

    return $chunk;
}

sub unblock_session {
    my $self  = shift;
    my $where = q/"owner" = ? AND "id" = ? AND "server" = ?/;
    my @bind  = (
        $self->_srv->{owner},
        $self->_sess->{id},
        $self->_srv->{attributes}->{resolved} // $self->_srv->{address}
    );

    my $update = q/"attributes" - 'job-chunk'/;
    my $sql =
        q/UPDATE /
      . $self->config->{tables}->{sessions}
      . qq/ SET attributes = $update WHERE $where/;

    $self->logger->debug( "Executing $sql with params " . join q{,}, @bind );
    try { $self->_db->do( $sql, undef, @bind ); }
    catch { };
    if ( $self->_db->err ) {
        $self->logger->warn( 'Got DB exception: ' . $self->_db->errstr );
        return;
    }

    return 1;
}

sub prepare_for_reply {
    my $self = shift;
    $self->_r->message_auth(
        ( firstidx { $_->{Code} == $MESSAGE_AUTH_CODE } @{ $self->_r_atts } )
        >= 0 );
    $self->_r->clear_attributes;
    $self->_r->authenticator( $self->_req_a );
    return 1;
}

sub _add_to_flow {
    my $self = shift;

    return if ( !$self->_sess || !$self->_sess->{id} );

    $self->_update_status_history;

    my $json_obj = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );
    $self->logger->debug(
        'Saving the flow ' . $json_obj->encode( $self->flow ) );

    my @inserts;
    my $query =
      sprintf
      'INSERT INTO "%s" ("session_id", "radius", "packet_type") VALUES ',
      $self->config->{tables}->{flows};

    foreach my $pkt ( @{ $self->flow } ) {
        push @inserts,
          ( $self->_sess->{id}, $json_obj->encode($pkt), $pkt->{type} );
    }

    $query .= join q{,}, ('(?,?,?)') x int( scalar @inserts / 3 );

    $self->logger->debug( "About to execute: $query with params " . join q{,},
        @inserts );
    if ( !defined $self->_db->do( $query, undef, @inserts ) ) {
        $self->logger->error( 'Error while execution: ' . $self->_db->errstr );
    }
    else {
        $self->logger->debug('Packets saved in DB');
    }

    return 1;
}

sub _update_status_history {
    my $self = shift;

    $self->logger->debug('Updating StatesHistory');
    return $self->_set_session_attribute( $self->_sess->{id},
        { StatesHistory => $self->_sess->{attributes}->{StatesHistory} } );
}

sub _comand_and_defaults {
    my ( $self, $cmd ) = @_;

    $self->logger->debug( 'Looking for defaults, CMD: ' . $cmd );

    $cmd =~ s/-host-port$//sxm;
    $cmd = $cmd =~ /reauthenticate/sxm ? 'reauthenticate' : $cmd;

    $self->logger->debug( 'Sanified CMD: ' . $cmd );

    my $defaults = {
        'bounce' => {
            'act'       => $ACTION_ACK,
            'after'     => $AFTER_ACTION_REAUTH,
            'same_id'   => 0,
            'err_cause' => $NO_ERR_CAUSE,
            'drop_old'  => 1,
        },
        'disable' => {
            'act'       => $ACTION_ACK,
            'after'     => $AFTER_ACTION_DROP,
            'same_id'   => 0,
            'err_cause' => $NO_ERR_CAUSE,
            'drop_old'  => 1,
        },
        'default' => {
            'act'       => $ACTION_ACK,
            'after'     => $AFTER_ACTION_REAUTH,
            'same_id'   => 0,
            'err_cause' => $NO_ERR_CAUSE,
            'drop_old'  => 1,
        },
        'reauthenticate' => {
            'act' => {
                rerun   => $ACTION_ACK,
                last    => $ACTION_ACK,
                default => $ACTION_ACK
            },
            'after' => {
                rerun   => $AFTER_ACTION_MAB,
                last    => $AFTER_ACTION_REAUTH,
                default => $AFTER_ACTION_MAB
            },
            'same_id'   => { rerun => 1, last => 1, default => 1 },
            'err_cause' => {
                rerun   => $NO_ERR_CAUSE,
                last    => $NO_ERR_CAUSE,
                default => $NO_ERR_CAUSE
            },
            'drop_old' => { rerun => 0, last => 0, default => 0 },
        },
    };

    return { ( command => $cmd ), %{ $defaults->{$cmd} }, };
}

sub _push_session_status {
    my ( $self, $new_status, $old_status ) = @_;
    return if ( !$new_status || !$self->_sess );
    return if ( $new_status eq $old_status );

    $self->_sess->{attributes} //= {};
    $self->_sess->{attributes}->{StatesHistory} //= [];

    if ( scalar @{ $self->_sess->{attributes}->{StatesHistory} }
        && $self->_sess->{attributes}->{StatesHistory}->[-1]->{code} eq
        $new_status )
    {
        return;
    }

    push @{ $self->_sess->{attributes}->{StatesHistory} },
      { code => $new_status, time => scalar gettimeofday() };

    return;
}

sub _set_session_attribute {
    my ( $self, $id, $data ) = @_;

    my $json_obj =
      JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1, allow_blessed => 1 );
    my $json = $json_obj->encode($data);
    $self->logger->debug("Updating session $id with '$json'");

    my $query =
      sprintf
      'UPDATE %s SET attributes = attributes || %s::jsonb WHERE "id" = %s',
      $self->_db->quote_identifier( $self->config->{tables}->{sessions} ),
      $self->_db->quote($json),
      $self->_db->quote($id);

    $self->logger->debug("About to execute SQL: $query");
    if ( !defined $self->_db->do($query) ) {
        $self->logger->error( 'Error while execution: ' . $self->_db->errstr );
        return;
    }
    return 1;
}

__PACKAGE__->meta->make_immutable;

1;
