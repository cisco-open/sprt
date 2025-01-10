package PRaG::Engine;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Class::Load ':all';
use Data::Dumper;
use Data::GUID;
use English qw/-no_match_vars/;
use File::Basename;
use JSON::MaybeXS   ();
use List::MoreUtils qw/indexes/;
use Path::Tiny;
use POSIX qw/strftime ceil/;
use Readonly;
use Ref::Util    qw/is_ref is_plain_hashref is_plain_arrayref is_blessed_ref/;
use Scalar::Util qw/blessed/;
use Storable     qw/dclone/;
use Time::HiRes  qw/usleep/;
use Syntax::Keyword::Try;

use URI::Escape qw/uri_escape/;

use PRaG::Types;
use PRaG::Vars qw/vars_substitute/;
use logger;

# UID of the owner (User, who started generator)
has 'owner' => ( is => 'ro', isa => 'Str', required => 1 );

# Data about server
has 'server' => ( is => 'ro', isa => 'PRaG::Server', required => 1 );

# Which protocol to use, like map, pap, accounting only, eap-tls
has 'protocol' => ( is => 'ro', isa => 'Str', default => 'mab' );

# Parameters of the generator, proto-specific also
has 'parameters' => ( is => 'ro', isa => 'HashRef' );

# How many to generate
has 'count' =>
  ( is => 'ro', isa => 'PositiveInt', default => 1, writer => '_set_count' );

# RADIUS dictionaries
has 'dicts' => ( is => 'ro', isa => 'ArrayRef' );

# RADIUS data, 2 expected: request & accounting
has 'radius' => ( is => 'rw', isa => 'HashRef' );

# TACACS data
has 'tacacs' => ( is => 'rw', isa => 'HashRef' );

# Variables data, must be undef if updating existent sessions
has 'vars' => ( is => 'rw', isa => 'Maybe[PRaG::Vars]' );

# DB handler
has 'db' => ( is => 'rw', isa => 'Maybe[DBI::db]' );

# Config data, global config from config file
has 'config' => ( is => 'rw', isa => 'HashRef' );

# the logger
has 'logger' => ( is => 'ro', isa => 'logger' );

# Flag for async or not
has 'async' => ( is => 'rw', isa => 'Bool', default => 0 );

# Flag for async or not
has 'debug' => ( is => 'rw', isa => 'Bool', default => 0 );

# Infor about error, if any
has 'error' => (
    is      => 'ro',
    isa     => 'Str',
    writer  => '_set_error',
    clearer => '_no_error'
);

# Internal proto handler
has '_engine' =>
  ( is => 'ro', isa => 'Str', writer => '_set_engine', reader => 'engine' );

# How many done
has '_percent' => ( is => 'ro', isa => 'HashRef', writer => '_set_percent' );

# How many succeeded
has '_succeeded' => (
    traits  => ['Counter'],
    is      => 'ro',
    isa     => 'Num',
    default => 0,
    handles => {
        inc_succeeded   => 'inc',
        reset_succeeded => 'reset',
    },
);

# How many failed
has '_failed' => (
    traits  => ['Counter'],
    is      => 'ro',
    isa     => 'Num',
    default => 0,
    handles => {
        inc_failed   => 'inc',
        reset_failed => 'reset',
    },
);

# Loaded sessions
has '_sessions' => ( is => 'rw', isa => 'Maybe[ArrayRef]', default => undef );

# Statistics
has 'stats_file' => (
    is      => 'ro',
    isa     => 'Maybe[Path::Tiny]',
    writer  => '_set_stats_file',
    default => undef,
);

has 'json' => (
    is      => 'ro',
    lazy    => 1,
    default => sub {
        return JSON::MaybeXS->new(
            utf8            => 1,
            allow_nonref    => 1,
            allow_blessed   => 1,
            convert_blessed => 1,
        );
    },
);

with 'PRaG::Role::Certificates', 'PRaG::Role::ProcessWork',
  'PRaG::Role::AsyncEngine', 'PRaG::Role::Scheduler';

# package internal flag to tell if TERM received or not. Used only when not async mode
my $GOT_TERM = 0;

Readonly my $PROTOS => {
    'accounting'   => 'PRaG::Proto::ProtoAccounting',
    'eap-tls'      => 'PRaG::Proto::ProtoEAPTLS',
    'eaptls'       => 'PRaG::Proto::ProtoEAPTLS',
    'eap-mschapv2' => 'PRaG::Proto::ProtoMSCHAP',
    'peap'         => 'PRaG::Proto::ProtoPEAP',
    'mab'          => 'PRaG::Proto::ProtoMAB',
    'pap'          => 'PRaG::Proto::ProtoPAP',
    'http'         => 'PRaG::Proto::ProtoHTTP',
    'tacacs'       => 'PRaG::Proto::ProtoTacacs',
};

my $meta = __PACKAGE__->meta;

sub BUILD {
    my $self = shift;

    $meta->make_mutable;
    if ( $self->protocol ne 'tacacs' ) {
        with 'PRaG::Role::RadiusSessions';
    }
    else {
        with 'PRaG::Role::TacacsSessions';
    }
    $meta->make_immutable;

    $self->_set_percent( { last => 0, step => 1, done => 0 } );

    # Parse latency
    if (   $self->parameters->{'latency'}
        && $self->parameters->{'latency'} =~ /^(\d+)([.]{2}(\d+))?$/sxm )
    {
        $self->parameters->{'latency'} = { min => $1, max => $3 };
    }
    else {
        $self->parameters->{'latency'}
          and $self->parameters->{'latency'} =
          { min => $self->parameters->{'latency'} };
    }

    if ( !$self->vars && !$self->parameters->{sessions} ) {
        $self->_set_error('Vars and sessions to load are not set! Exit.');
        return;
    }

    $self->_roles_init;

    if ( !$self->async ) { $self->_set_term_handler; }
    $self->_load_engine;
    $self->_check_job;
    return 1;
}

sub do {
    my $self = shift;
    return if not $self->engine;

    $self->{done} = 0;
    $self->{counter} //= 0;

    if   ( $self->async ) { $self->_async_loop; }
    else                  { $self->_sync_loop; }

    $self->_finish_job;
    $self->_logs_to_db;

    return 1;
}

sub _sync_loop {
    my ($self) = @_;

    $self->debug and $self->logger->debug('Starting SYNC loop');

    while ( my $snap = $self->_has_job_to_do ) {

      # continue if we have something to do, should return snapshot of variables
        $self->debug
          and $self->logger->debug( 'Got snapshot: ' . Dumper($snap) );
        $self->_wait_latency;

        my $g = $self->_one_auth(
            snap   => $snap,
            logger => $self->_get_logger( idx => $self->{counter} ),
            server => $self->_session_server($snap)
        );
        my %session = (
            session_data => $g->get_session_data,
            status       => $g->status,
            snapshot     => $g->vars,
            statistics   => [ $g->statistics ],
        );

        my $id =
          $snap->{LOADED}
          ? $self->_update_session(
            %session,
            $self->protocol ne 'tacacs'
            ? ( should_continue => $g->continue_on_save, )
            : (),
          )
          : $self->_save_session(
            %session,
            ( is_successful => $g->successful ),
            $self->protocol ne 'tacacs'
            ? (
                is_message_auth => $g->message_auth,
                dacl            => $g->dacl,
                should_continue => $g->continue_on_save,
              )
            : (),
          );
        if ($id) { $self->_add_to_flow( $g->flow, $id, $snap ); }
        if ( !$snap->{LOADED} ) {
            if   ( $g->successful ) { $self->inc_succeeded; }
            else                    { $self->inc_failed; }
        }
        undef $g;
        $self->_update_percentage( done => ++$self->{done} );
    }

    return 1;
}

sub _one_auth {
    my $self = shift;
    my $h    = {@_};

    if ( !$self->async ) {
        $self->debug
          and $self->logger->debug(
            'Got the server to work with: ' . Dumper( $h->{server} ) );
    }
    else {
        $h->{logger}
          ->debug( 'Got the server to work with: ' . Dumper( $h->{server} ) );
    }

    my $g = $self->engine->new(
        owner      => $self->owner,
        parameters => dclone( $self->parameters ),
        server     => $h->{server},
        logger     => $h->{logger},
        vars       => $h->{snap},
        debug      => $self->debug,
        status => exists $h->{snap}->{START_STATE} ? $h->{snap}->{START_STATE}
        : 'UNKNOWN',
        $self->protocol eq 'tacacs' ? ( tacacs => dclone( $self->tacacs ), )
        : (
            dicts  => $self->dicts,
            radius => dclone( $self->radius ),
        )
    );

    if ( !$g || $g->error ) {
        $h->{logger}
          ->error( $g->error // q{Couldn't create engine, unknown error} );
        return;
    }

    # Add "used" values if we have loaded sessions, not newly created.
    # If re-auth, everything should be set already
    if ( is_ref( $self->_sessions ) && $self->parameters->{action} ne 'reauth' )
    {
        $g->used_from_vars;
    }

    # Do the stuff
    $g->do;
    $g->done;

    return $g if defined wantarray;
    return;
}

# Add packets to flow of existing session(s)
# $what - either ARRAY or HASH reference
# $ids - either scalar or ARRAY reference
sub _add_to_flow {
    my ( $self, $what, $ids, $server ) = @_;

    if (   ( is_plain_hashref($what) and not %{$what} )
        or ( is_plain_arrayref($what) and not @{$what} ) )
    {
        $self->debug and $self->logger->debug('Nothing to save');
        return;
    }

    # $self->debug and
    # $self->logger->debug( 'Saving the flow ' . $json_obj->encode($what) );
    $self->debug and $self->logger->debug('Saving the flow');

    my @inserts;
    my $query =
      sprintf
'INSERT INTO "%s" ("session_id", "radius", "packet_type", "proto") VALUES ',
      $self->config->{tables}->{flows};

    if ( !is_plain_arrayref($ids) ) {
        $what = { $ids => $what };
    }    # If only one ID, then make hash with one key

    foreach my $id ( keys %{$what} ) {
        for my $i ( 0 .. $#{ $what->{$id} } ) {
            $i > 0 and $query .= ', ';
            $query .= '(?,?,?,?)';
            my $radius_data = {
                %{ $what->{$id}->[$i] },
                defined $server
                ? (
                    server => is_blessed_ref($server)
                    ? $server->as_hashref
                    : $server
                  )
                : ()
            };
            push @inserts,
              (
                $id,
                $self->json->encode($radius_data),
                $what->{$id}->[$i]->{type},
                $what->{$id}->[$i]->{proto} // 'radius',
              );
        }
    }

    $self->debug and $self->logger->debug("About to execute: $query");
    if ( !defined $self->db->do( $query, undef, @inserts ) ) {
        $self->logger->error( 'Error while execution: ' . $self->db->errstr );
    }
    else {
        $self->debug and $self->logger->debug('Packets saved in DB');
    }

    return $ids;
}

# Check if async.flow_directory has files "*.pragflow" in it and load list of them
sub _has_dumps {
    my $self = shift;

    opendir my $DIR, $self->{flow_dir};
    my @files = grep { /[.]pragflow$/sxm } readdir $DIR;
    closedir $DIR;

    return ( @files and scalar @files ? @files : undef );
}

# Find and load engine module
sub _load_engine {
    my $self = shift;

    if ( my $m = $PROTOS->{ $self->protocol } ) {
        if ( !is_class_loaded($m) ) { load_class($m) }
        $self->debug and $self->logger->debug("Got Engine: $m");
        $self->_set_engine($m);
        if ( $m->can('determine_vars') ) {
            $m->determine_vars( $self->vars, $self->parameters->{specific},
                $self );
        }
    }

    if ( !$self->engine ) {
        $self->_set_error( 'No engine found for ' . $self->protocol );
        $self->logger->error( 'No engine found for ' . $self->protocol );
    }

    delete $self->parameters->{specific};

    return;
}

# Return logger for the session
sub _get_logger {
    my $self = shift;
    return $self->async ? $self->_create_logger(@_) : $self->logger;
}

# New file-logger if needed
sub _create_logger {
    my ( $self, %h ) = @_;

    $h{no_object} //= 0;

    my $level         = $self->logger->get_level;
    my $guid          = Data::GUID->guid_string;
    my $logger_name   = 'L_' . $self->owner . '_' . $guid;
    my $appender_name = 'A_' . $self->owner . '_' . $guid;
    my $f_owner       = $self->config->{async}->{user};

    my $fn = vars_substitute(
        $self->config->{async}->{log_file},
        {
            owner         => $self->owner,
            logger_name   => $logger_name,
            appender_name => $appender_name,
            job_name      => $self->parameters->{job_name},
            job_id        => $self->parameters->{job_id},
            chunk         => $guid,
            idx           => $h{idx},
        },
        undef, 'BRACES'
    );    # File Name of log file

    if ( $h{no_object} ) {
        return {
            logger_name  => $logger_name,
            logger_file  => $fn,
            logger_chunk => $guid,
        };
    }

    my $l = logger->new_file_logger(
        owner         => $self->owner,
        chunk         => $guid,
        'logger-name' => $logger_name,
        filename      => $fn,
        syslog        => $self->config->{syslog},
    );

    return $l;
}

# go through the logs directory and instert them in DB
sub _logs_to_db {
    my $self = shift;
    return if !$self->logger;

    my $sample_name = vars_substitute(
        $self->config->{async}->{log_file},
        {
            owner         => $self->owner,
            logger_name   => 'logger',
            appender_name => 'appender',
            job_name      => $self->parameters->{job_name},
            job_id        => $self->parameters->{job_id},
            chunk         => 'null',
            idx           => 0,
        },
        undef, 'BRACES'
    );    # File Name of log file

  # if ( $self->async ) {
  #     foreach my $f ( path($sample_name)->parent->children(qr{[.]log$}sxm) ) {
  #         next if ( $f->basename =~ /^JOB_STATS/sxm );
  #         $self->logger->info( 'file:' . $f->stringify );
  #     }
  # }

    return 1;
}

# update job done status
sub _update_percentage {
    my $self = shift;
    my $h    = {@_};
    my $percentage =
      $h->{done} ? ceil( ( $h->{done} / $self->count ) * 100 ) : 0;
    if ( $percentage >= $self->_percent->{last} + $self->_percent->{step} ) {
        $self->_update_job(
            {
                percentage => $percentage,
                attributes => {
                    succeeded => $self->_succeeded,
                    failed    => $self->_failed,
                },
            }
        );
        $self->_percent->{last} = $percentage;
    }
    return;
}

# wait before starting next authentication
sub _wait_latency {
    my $self = shift;
    if ( $self->parameters->{'latency'} ) {
        my $l =
          $self->parameters->{latency}->{max}
          ? int(
            rand(
                $self->parameters->{latency}->{max} -
                  $self->parameters->{latency}->{min}
            )
          ) + int( $self->parameters->{latency}->{min} )
          : $self->parameters->{latency}->{min};

        $self->debug and $self->logger->debug("Waiting for $l miliseconds...");
        usleep( $l * 1_000 );
    }
    return 1;
}

sub _create_job {
    my $self = shift;

    my $uuid       = Data::GUID->guid_string;
    my $attributes = {
        count   => $self->count // 0,
        created => time
    };

    if ( $self->parameters->{saved_cli} ) {
        $attributes = {
            %{$attributes},
            action   => $self->parameters->{action},
            protocol => $self->protocol,
            server   => $self->server->address,
        };
    }

    $self->_create_stats_file($uuid);
    if ( $self->stats_file ) {
        $attributes->{stats} = $self->stats_file->stringify;
    }

    my $sql =
        q/INSERT INTO /
      . $self->config->{tables}->{jobs}
      . q/ ("id", "name", "percentage", "sessions", "attributes", "owner", "pid", "cli")/
      . q/ VALUES (?, ?, ?, ?, ?::jsonb, ?, ?, ?)/;
    my @bind = (
        $uuid,
        $self->parameters->{job_name},
        0,
        $self->parameters->{job_chunk},
        $self->json->encode($attributes),
        $self->owner,
        $PID,
        $self->parameters->{saved_cli} // undef,
    );
    $self->debug and $self->logger->debug(qq/About to execute: $sql/);

    if ( !defined $self->db->do( $sql, undef, @bind ) ) {
        $self->logger->error( "Error on '$sql': " . $self->db->errstr );
        return;
    }

    $self->parameters->{job_id} = $uuid;
    return $uuid;
}

sub _update_job {
    my ( $self, $attributes ) = @_;

    $self->debug
      and $self->logger->debug( 'Updating job '
          . $self->parameters->{job_id}
          . ' with '
          . Dumper($attributes) );

    my @values;
    while ( my ( $key, $v ) = each %{$attributes} ) {
        if ( $key eq 'attributes' ) {
            push @values,
                'attributes = attributes || '
              . $self->db->quote( $self->json->encode($v) )
              . '::jsonb';
        }
        else {
            push @values,
              $self->db->quote_identifier($key) . ' = ' . $self->db->quote($v);
        }
    }
    my $update = join q{,}, @values;

    my $sql = sprintf 'UPDATE "%s" SET %s WHERE "id" = ? AND "owner" = ?',
      $self->config->{tables}->{jobs}, $update;
    my @bind = ( $self->parameters->{job_id}, $self->owner );

    $self->debug and $self->logger->debug(qq/About to execute query: $sql/);

    if ( !defined $self->db->do( $sql, undef, @bind ) ) {
        $self->debug
          and
          $self->logger->debug( 'Error while execution: ' . $self->db->errstr );
        return;
    }

    return 1;
}

sub _finish_job {
    my $self = shift;

    $self->debug and $self->logger->debug('Job finished');
    $self->_unblock_job_sessions;

    if ( !$self->parameters->{saved_cli} ) {

        # No CLI assigned, hence non-repeatable, hence remove it
        $self->debug
          and $self->logger->debug('Job is non-repeatable, removing.');

        my $q =
            q/DELETE FROM /
          . $self->db->quote_identifier( $self->config->{tables}->{jobs} )
          . q/ WHERE "id" = ?/;
        $self->debug and $self->logger->debug(qq/About to execute query: $q/);

        if (
            not
            defined $self->db->do( $q, undef, ( $self->parameters->{job_id} ) )
          )
        {
            $self->logger->error( 'SQL Error: ' . $self->db->errstr );
        }

        if ( $self->stats_file ) {
            try { $self->stats_file->remove; }
            catch {
                $self->logger->warn(
                    q/Couldn't delete stats file: / . $EVAL_ERROR );
            }
        }
        return;
    }

    $self->_update_job(
        {
            percentage => 100,
            sessions   => undef,
            pid        => 0,
            attributes => {
                succeeded => $self->_succeeded,
                failed    => $self->_failed,
                finished  => time,
            },
        }
    );

    return 1;
}

sub _unblock_job_sessions {
    my $self = shift;
    if (  !$self->parameters->{'keep_job_chunk'}
        && $self->_sessions
        && scalar @{ $self->_sessions }
        && $self->parameters->{sessions}->{chunk} )
    {
        $self->debug and $self->logger->debug('Unblocking job sessions');
        foreach my $s ( @{ $self->_sessions } ) {
            $self->debug
              and $self->logger->debug( 'Unblocking session ' . $s->{id} );
            $self->_remove_session_attribute( $s->{id}, 'job-chunk',
                $self->parameters->{sessions}->{chunk} );
        }
    }
    return 1;
}

sub _check_job {
    my $self = shift;

    if ( !$self->vars ) {
        my $count = 1;
        $self->debug and $self->logger->debug('Looking for sessions');
        my $sessions =
          $self->_find_sessions( $self->parameters->{sessions}, \$count );
        $self->_set_count($count);

        if ( !$count ) {
            $self->logger->warn(q{Couldn't find any session to work with.});
            $self->_set_error(q{Couldn't find any session to work with.});
            return;
        }

        $self->_sessions($sessions);
    }

    $self->_generate_job_name;
    $self->_create_job;

    return 1;
}

sub _generate_job_name {
    my $self = shift;

    $self->parameters->{job_name} ||=
        $self->owner . ' - '
      . $self->protocol
      . (
        $self->protocol eq 'accounting'
        ? q{-} . ( $self->parameters->{accounting_type} || 'update' )
        : q{}
      )
      . q{ - }
      . strftime( '%Y-%m-%d %H:%M:%S', localtime );
    return;
}

# Check if something left to do
sub _has_job_to_do {
    my $self = shift;

    if ($GOT_TERM) {
        $self->debug and $self->logger->debug('Got TERM signal, finishing...');
        return;
    }

    # finish threads creation if TERM received

    $self->{counter} //= 0;
    if ( $self->vars ) {    # Variables-based generation of sessions
        if ( ++$self->{counter} <= $self->count ) {
            $self->vars->next_all;    # generate next values
            if ( $self->vars->error ) {
                $self->logger->error( $self->vars->error );
                return;
            }
            return $self->vars->snapshot;
        }
        else {
            return;
        }
    }
    else {    # We should load "var snapshot" here from sessions data
        my $r = $self->_snapshot_from_data;
        $self->{counter}++;
        return $r;
    }
}

sub _create_stats_file {
    my ( $self, $uuid ) = @_;
    $uuid //= $self->parameters->{job_id};
    return if ( !$uuid );

    my $logger_name = 'JOB_STATS_' . $uuid;
    my $f_owner     = $self->config->{async}->{user};

    my $fn = vars_substitute(
        $self->config->{async}->{log_file},
        {
            owner       => $self->owner,
            logger_name => $logger_name,
            job_name    => $self->parameters->{job_name} // q{},
            job_id      => $uuid,
            idx         => 0,
        },
        undef, 'BRACES'
    );    # File Name of stats file

    my $p;
    $self->debug and $self->logger->debug("Creating stats file: $fn");
    try {
        $p = path($fn);
        $p->touchpath;
    }
    catch {
        $self->logger->error( q{Couldn't create stats file: } . $EVAL_ERROR );
    };
    if ($p) {
        $self->_set_stats_file($p);
        return 1;
    }
    return;
}

sub _add_statistics {
    my $self = shift;
    my $h    = {@_};
    return if ( !$self->stats_file );

    try {
        $self->stats_file->append_utf8(
            $h->{id} . q{,} . join( q{,}, @{ $h->{statistics} } ) . "\n" );
    }
    catch {
        $self->logger->error( q{Couldn't append stats file: } . $EVAL_ERROR );
    };
    return;
}

sub load_user_dictionaries {
    my ( $self, $id_string ) = @_;
    my @ids;
    if ( is_plain_arrayref($id_string) ) {
        @ids = map { $_->{id} } @{$id_string};
    }
    else { @ids = split /,/sxm, $id_string; }

    $self->debug
      and
      $self->logger->debug( 'Loading dictionaries. IDS: ' . join q{,}, @ids );

    my $sql = sprintf 'SELECT content FROM %s WHERE id IN (%s)',
      $self->db->quote_identifier( $self->config->{tables}->{dictionaries} ),
      join q{,}, map { $self->db->quote($_) } @ids;

    $self->debug
      and $self->logger->debug( 'Loading dictionaries. SQL: ' . $sql );

    my @r;
    try {
        my $values = $self->db->selectall_arrayref( $sql, { Slice => {} } );
        if ( !scalar @{$values} ) { return; }

        $values = [ map { $_->{content} } @{$values} ];
        foreach my $d ( @{$values} ) {
            push @r, split /\n/sxm, $d;
        }
    }
    catch {
        $self->logger->error(
            'Error on loading dictionary by name: ' . $EVAL_ERROR );
        return;
    };

    return \@r;
}

sub _roles_init {

    # Just a placeholder. Method modifiers should be created for that method
    # to initiate roles
    return 1;
}

sub config_at {
    my ( $self, $path, $default ) = @_;
    $default //= undef;
    if ( not is_plain_arrayref($path) ) {
        $path = [ split /[.]/sxm, $path ];
    }

    return $default if not scalar @{$path};

    my $found = $self->config;
    for ( 0 .. $#{$path} ) {
        if ( exists $found->{ $path->[$_] } ) {
            $found = $found->{ $path->[$_] };
        }
        else { return $default; }
    }

    return $found;
}

# Subs to handle TERM signal correctly
sub _term_handler {
    $GOT_TERM = 1;
    return;
}

sub _set_term_handler {
    my $self = shift;
    $SIG{TERM} = \&_term_handler;
    return;
}

__PACKAGE__->meta->make_immutable;

1;
