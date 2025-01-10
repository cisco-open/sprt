package PRaG::DaemonGenerator;

use strict;
use utf8;
use 5.016_000;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

with 'MooseX::Getopt';
with 'MooseX::Getopt::GLD' => { getopt_conf => ['pass_through'] };

# with 'MooseX::Daemonize';

use Carp;
use Config::Any;
use Crypt::Random::Seed;
use Data::Dumper;
use Data::GUID;
use DBI;
use English qw( -no_match_vars );
use FileHandle;
use JSON::MaybeXS        ();
use Math::Random::Secure qw/irand/;
use Readonly;
use Ref::Util   qw/is_hashref/;
use Time::HiRes qw/gettimeofday/;
use Syntax::Keyword::Try;

use PRaG::Types;
use PRaG::Vars;
use PRaG::RadiusServer;
use PRaG::TacacsServer;
use PRaG::Engine;
use PRaG::Util::ENVConfig qw/apply_env_cfg/;

Readonly my $OWNER_POSTFIX     => '__generator';
Readonly my $DEFAULT_TIMEOUT   => 5;
Readonly my $SEED_LENGTH_BYTES => 4;

Readonly my $TAC_PORT    => 49;
Readonly my $R_ACCT_PORT => 1813;
Readonly my $R_AUTH_PORT => 1812;

# Parameters
has 'jsondata'   => ( is => 'rw', isa => 'Str',  required => 0 );
has 'jsonfile'   => ( is => 'rw', isa => 'Str',  required => 0 );
has 'o'          => ( is => 'rw', isa => 'Str',  required => 1 );
has 'configfile' => ( is => 'rw', isa => 'Str',  required => 1 );
has 'verbose'    => ( is => 'rw', isa => 'Bool', default  => 0 );
has 'progname'   => ( is => 'rw', isa => 'Str',  default  => $PROGRAM_NAME );
has 'foreground' => ( is => 'rw', isa => 'Bool', default  => 0 );
has 'pidfile'    => ( is => 'rw', isa => 'Str',  default  => q{} );
has 'logfile'    => ( is => 'rw', isa => 'Str',  default  => q{} );

# Loaded from config file
has 'config' => ( is => 'rw', isa => 'HashRef' );

# Internal
has '_data' => ( is => 'ro', isa => 'HashRef', writer => '_set_data' );
has '_seq' => (
    is      => 'ro',
    isa     => 'ArrayRef[HashRef]',
    traits  => ['Array'],
    handles => { add_job => 'push', clear_seq => 'clear', next_job => 'shift' },
);
has '_engines' => (
    is      => 'ro',
    isa     => 'ArrayRef[PRaG::Engine]',
    traits  => ['Array'],
    handles => {
        add_engine    => 'push',
        clear_engine  => 'clear',
        next_engine   => 'shift',
        engines_count => 'count'
    },
);
has '_vars' => (
    is      => 'ro',
    isa     => 'ArrayRef[PRaG::Vars]',
    traits  => ['Array'],
    handles =>
      { add_vars => 'push', clear_vars => 'clear', next_vars => 'shift' },
);
has '_servers' => (
    is      => 'ro',
    isa     => 'ArrayRef[PRaG::Server]',
    traits  => ['Array'],
    handles =>
      { add_server => 'push', clear_server => 'clear', next_server => 'shift' },
);

with 'PRaG::Role::DB', 'PRaG::Role::Logger';

# Just a stub
sub start {
    my $self = shift;

    print {*STDERR} 'Starting' . "\n";
}

after start => sub {
    my $self = shift;

    # if ( !$self->foreground && !$self->is_daemon ) {
    #     print {*STDERR} 'Not daemon, not foreground';
    #     return;
    # }
    # if ( $self->foreground  && !$self->is_daemon ) {
    #     print {*STDERR} 'Not daemon, foreground';
    # }

    my $source = Crypt::Random::Seed->new( Never => ['Win32'] );
    my $srand  = srand unpack 'L', $source->random_bytes($SEED_LENGTH_BYTES);
    undef $source;

    print {*STDERR} 'Srand: ' . $srand . "\n";

    try {
        print {*STDERR} 'Initiating' . "\n";
        $self->_init_config;

        print {*STDERR} 'Parsing data' . "\n";
        $self->_parse_data;

        print {*STDERR} 'Initiating logger' . "\n";
        $self->_init_logger( $self->_data->{owner} . $OWNER_POSTFIX );

        $self->logger->debug('Updating process name');
        $self->_update_proc_name;

        $self->logger->debug('Connecting to DB');
        $self->db_connect;

        $self->logger->debug('Parsing sequence');
        $self->_parse_seq;

        $self->logger->debug( 'Got srand: ' . $srand );
        $self->logger->debug('Filling vars');
        $self->_fill_vars;

        $self->logger->debug('Initiating engines');
        $self->_init_engine;

        $self->logger->debug('Starting');
        $self->do;
    }
    catch {
        if ( $self->logger ) {
            $self->logger->fatal("Something went wrong: $EVAL_ERROR");
        }
        else {
            print {*STDERR} "Something went wrong: $EVAL_ERROR\n";
        }
        croak $EVAL_ERROR;
    };

    $self->logger->debug('Clearing vars');
    $self->clear_vars;
    $self->remove_pid;
    $self->remove_log;
    $self->logger->debug('Quiting');

    # $self->OK;
    # $self->shutdown;
    exit(0);
};

sub do {
    my $self = shift;

    if ( !$self->engines_count ) {
        $self->logger->fatal('No engine initiated.');
        return;
    }

    my $num = 1;
    while ( my $e = $self->next_engine ) {
        $self->logger->debug("Doing job #$num");
        $e->do;
        $num++;
        if ( $e->vars ) { $e->vars->clear; }
    }

    return 1;
}

sub _update_proc_name {
    my $self = shift;

    $PROGRAM_NAME = $self->progname;

    return $self;
}

sub _init_config {

    # Load config from config file
    my $self = shift;

    croak q{No config file specified, bye!}
      if ( !-e $self->configfile || -z $self->configfile );
    my $cfg = Config::Any->load_files(
        { files => [ $self->configfile ], use_ext => 1 } );

    $self->config( $cfg->[0]->{ $self->configfile } );
    $self->config->{debug} //= 0;
    $self->config->{debug} ||= $self->verbose;

    apply_env_cfg( $self->config );

    return $self;
}

sub remove_log {
    my $self = shift;

    if ( !$self->verbose && $self->logfile && -e $self->logfile ) {
        $self->logger->debug( 'Removing log file (STDERR) ' . $self->logfile );
        unlink $self->logfile;
    }

    return $self;
}

sub remove_pid {
    my $self = shift;

    $self->logger->debug('Checking PID file');
    if ( $self->pidfile && -e $self->pidfile ) {
        $self->logger->debug( 'Removing PID file' . $self->pidfile );
        unlink $self->pidfile;
    }

    return $self;
}

sub get_pid {
    my $self = shift;

    return $PID;
}

after '_init_logger' => sub {
    my $self = shift;

    if ( $self->foreground ) {
        $self->logger->debug(
            q{I'm a foreground thread. My PID: } . $self->get_pid );
    }
    else {
        $self->logger->debug(
            q{I'm a background thread. My PID: } . $self->get_pid );
    }

    return $self;
};

sub _parse_data {

    # Parse user-provided JSON data
    my $self = shift;

    if ( $self->jsondata ) {
        $self->_set_data(
            JSON::MaybeXS->new( utf8 => 1 )->decode( $self->jsondata ) );
        return $self;
    }

    if ( $self->jsonfile ) {
        my $fh = FileHandle->new( $self->jsonfile, q{<:encoding(UTF-8)} );
        if ( defined $fh ) {
            $self->_set_data( JSON::MaybeXS->new( utf8 => 1 )
                  ->decode( join q{}, $fh->getlines ) );
            $fh->close;
            unlink $self->jsonfile;
        }
        else {
            croak "Couldn't open file: $ERRNO\n";
        }
        return $self;
    }

    croak q{No data provided, bye!};
}

sub _parse_seq {
    my $self = shift;

    if ( $self->_data->{sequence} ) {
        $self->add_job( @{ $self->_data->{sequence} } );
    }
    else { $self->add_job( $self->_data ); }

    return $self;
}

sub _var_type_by_name {
    my $self = shift;
    my $name = shift;

    my $known = {
        'MAC'        => 'MAC',
        'IP'         => 'IP',
        'SESSIONID'  => 'VariableString',
        'OWNER'      => 'String',
        'GUEST_FLOW' => 'Guest',
    };

    return $known->{$name} // 'String';
}

sub _parse_server {
    my $self = shift;
    my $j    = shift;

    my %attrs = (
        timeout     => $self->_get_timeout,
        local_addr  => $self->_get_local_addr,
        local_port  => $self->_get_local_port,
        retransmits => $self->_get_retransmits,
    );

    $attrs{family} = $j->{server}->{family} // $self->_data->{server}->{family}
      // 'v4';

    my $loaded = 0;
    if ( $j->{server}->{id} ) {
        $loaded = $self->_load_server( $j->{server}->{id},
            \%attrs, $j->{protocol} eq 'tacacs' ? 'tacacs' : 'radius' ) ? 1 : 0;
    }

    if ( !$loaded && $j->{server}->{address} ) {
        $self->logger->debug('Populating server from $j');

        $attrs{address} = $j->{server}->{address};
        if ( $j->{protocol} eq 'tacacs' ) {
            $attrs{ports} = $j->{server}->{ports} // [$TAC_PORT];
        }
        else {
            $attrs{auth_port} = $j->{server}->{auth_port} // $R_AUTH_PORT;
            $attrs{acct_port} = $j->{server}->{acct_port} // $R_ACCT_PORT;
        }
        $attrs{secret} = $j->{server}->{secret};
    }

    $self->add_server(
        $j->{protocol} eq 'tacacs'
        ? PRaG::TacacsServer->new(%attrs)
        : PRaG::RadiusServer->new(%attrs)
    );
    return 1;
}

sub _fill_radius_vars {
    my ( $self, $vars, $j ) = @_;

    my $session_id = {
        variant => 'pattern',
        pattern => $self->config->{generator}->{patterns}->{session_id}
    };

    foreach my $i (qw/collectables variables/) {
        next if ( !is_hashref( $j->{$i} ) );    # Skip irrelevant
        foreach my $key ( keys %{ $j->{$i} } ) {
            $self->logger->debug( 'Adding variable - ' . $key );

            if ( $key eq 'SESSIONID' ) {
                $session_id = $j->{$i}->{$key}->{parameters}
                  // $j->{$i}->{$key};
                next;
            }

            try {
                $vars->add(
                    type => $j->{$i}->{$key}->{type}
                      // $self->_var_type_by_name($key),
                    name       => $key,
                    parameters => $j->{$i}->{$key}->{parameters}
                      // $j->{$i}->{$key},
                );
            }
            catch {
                $self->logger->warn(
                    q{Couldn't parse variable: } . $EVAL_ERROR );
            };
        }
    }

    # Set defaults
    if ( !$vars->is_added('MAC') ) {
        $vars->add(
            type       => $self->_var_type_by_name('MAC'),
            name       => 'MAC',
            parameters => { variant => 'random', 'disallow-repeats' => 0 }
        );
    }

    if ( !$vars->is_added('IP') ) {
        $vars->add(
            type       => $self->_var_type_by_name('IP'),
            name       => 'IP',
            parameters => { variant => 'random', 'disallow-repeats' => 0 }
        );
    }

    if ( !$vars->is_added('SESSIONID') ) {
        $vars->add(
            type       => $self->_var_type_by_name('SESSIONID'),
            name       => 'SESSIONID',
            parameters => $session_id
        );
    }

    return;
}

sub _fill_tacacs_vars {
    my ( $self, $vars, $j ) = @_;

    $vars->add(
        type       => $self->_var_type_by_name('IP'),
        name       => 'IP',
        parameters => $j->{auth}->{ip},
    );

    return;
}

sub _fill_vars {
    my $self = shift;

    foreach my $j ( @{ $self->_seq } ) {
        $self->_parse_server($j);
        next
          if ( $j->{parameters}->{sessions} )
          ;    # no need to set variables if loading sessions

        my $vars = PRaG::Vars->new(
            logger          => $self->logger,
            max_tries       => $self->config->{generator}->{max_var_tries},
            stop_if_no_more => 1,
            parent          => $self,
        );

        if ( $j->{protocol} eq 'tacacs' ) {
            $self->_fill_tacacs_vars( $vars, $j );
        }
        else {
            $self->_fill_radius_vars( $vars, $j );
        }

        if ( !$vars->is_added('OWNER') ) {
            $vars->add(
                type       => $self->_var_type_by_name('OWNER'),
                name       => 'OWNER',
                parameters => { variant => 'static', 'value' => $j->{owner} }
            );
        }

        $self->add_vars($vars);
    }

    return $self;
}

sub _get_local_addr {
    my $self = shift;
    return q{} if $self->config->{nad}->{no_local_addr};
    my $l =
         $self->_data->{'local-addr'}
      || $self->_data->{nad}->{ip}
      || $self->config->{nad}->{ip};
    return $l;
}

sub _get_local_port {
    my $self = shift;
    return ( $self->_data->{'src-port'} ? $self->_data->{'src-port'} : 0 );
}

sub _get_timeout {
    my $self = shift;
    return $self->_data->{socket}->{timeout} //    # User set first
      $self->_data->{nad}->{timeout} // (
        defined $self->config->{radius}
          && defined $self->config->{radius}->{timeout}
        ? $self->config->{radius}->{timeout}
        : undef
      ) //                                         # Config if defined
      $DEFAULT_TIMEOUT;                            # 5 seconds by default
}

sub _get_retransmits {
    my $self = shift;
    return $self->_data->{socket}->{retransmits} //    # User set first
      $self->_data->{nad}->{retries} // (
        defined $self->config->{radius}
          && defined $self->config->{radius}->{retransmits}
        ? $self->config->{radius}->{retransmits}
        : undef
      ) //                                             # Config if defined
      0;                                               # 0 by default
}

sub _init_engine {
    my $self = shift;

    $self->logger->debug(
        'Got sequence of ' . scalar @{ $self->_seq } . ' jobs' );

    while ( my $j = $self->next_job ) {
        my $e = PRaG::Engine->new(
            owner      => $self->_data->{owner},
            server     => $self->next_server,
            protocol   => $j->{protocol},
            parameters => $j->{parameters},
            count      => $j->{count},
            vars       => $self->next_vars,
            db         => $self->_db,
            config     => $self->config,
            debug      => $self->config->{debug} // 0,
            logger     => $self->logger,
            async      => $j->{async} // 0,
            $j->{protocol} eq 'tacacs'
            ? (
                tacacs => {
                    commands => $j->{commands},
                    authz    => $j->{authz},
                    auth     => $j->{auth}
                },
              )
            : (
                dicts => $j->{dicts}
                  || $self->config->{dictionaries},
                radius => $j->{radius},
            )
        );

        if ( $e->error ) {
            $self->logger->error( $e->error );
            croak q{Couldn't create engine: } . $e->error;
        }

        $self->add_engine($e);
    }

    return $self;
}

sub _load_server {
    my $self = shift;
    my $id   = shift;
    my $to   = shift;
    my $prot = shift || 'radius';

    $self->logger->debug("Trying to load server with ID: $id");

    my $sql = sprintf
      q{SELECT * from %s where %s = %s and %s = %s limit 1},
      $self->_db->quote_identifier( $self->config->{tables}->{servers} ),
      $self->_db->quote_identifier('owner'),
      $self->_db->quote( $self->o ),
      $self->_db->quote_identifier('id'),
      $self->_db->quote($id);

    $self->logger->debug("Executing: $sql");

    my $r = $self->_db->selectall_arrayref( $sql, { Slice => {} } );
    if ( !scalar @{$r} ) {
        $self->logger->debug('Server not found by provided ID');
        return;
    }

    $r = $r->[0];
    $r->{attributes} =
      $r->{attributes}
      ? JSON::MaybeXS->new( utf8 => 1 )->decode( $r->{attributes} )
      : {};

    if ($to) {
        if ( $to->{family} eq 'v6' ) {
            $to->{address} = $r->{attributes}->{v6_address};
        }
        else {
            $to->{address} = $r->{attributes}->{resolved} // $r->{address};
        }

        if ( $prot eq 'tacacs' ) {
            $to->{ports}  = $r->{attributes}->{tac}->{ports};
            $to->{secret} = $r->{attributes}->{tac}->{shared};
        }
        else {
            $to->{acct_port} = $r->{acct_port};
            $to->{auth_port} = $r->{auth_port};
            $to->{secret}    = $r->{attributes}->{shared} // q{};
        }

        if ( exists $r->{attributes}->{dns} && $r->{attributes}->{dns} ) {
            $to->{dns} = $r->{attributes}->{dns};
        }
        $to->{id} = $id;
    }
    return $r;
}

__PACKAGE__->meta->make_immutable;

1;
