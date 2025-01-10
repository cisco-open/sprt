#!/usr/bin/env perl

use strict;
use warnings;

use 5.018;

use Carp;
use Cwd 'abs_path';
use Data::Dumper;
use DBI;
use English qw/-no_match_vars/;
use File::Basename;
use File::Find;
use Getopt::Long::Descriptive;
use IO::Interface::Simple;
use List::MoreUtils qw(firstidx);
use Net::Interface  qw/ipV6compress/;
use Path::Tiny;
use Readonly;
use Syntax::Keyword::Try;
use Term::ANSIColor;
use Term::ANSIScreen qw/:cursor :screen/;
use Term::Clui       qw/edit ask_password/;
use YAML             qw/LoadFile DumpFile/;

my ( $opt, $usage ) = describe_options(
    'SPRT configurator tool %o',
    [ 'confirm|c', 'Auto-confirm', { default => 0 } ],
    [
        'env-only|e',
        'Use only env variables, do not ask anything',
        { default => 0 }
    ],
    [ 'use-env|u', 'Use env variables before asking', { default => 0 } ],
    [],
    [ 'help', 'Print this help', { shortcircuit => 1 } ],
);

if ( $opt->help ) {
    print $usage->text;
    exit;
}

my ( undef, $DIR, undef ) = fileparse(__FILE__);
Readonly my $PARENT => abs_path( $DIR . '../' ) . q{/};

my $CONFIG = LoadFile("${PARENT}config.example.yml");
my $SAVED;
$SAVED = LoadFile("${PARENT}config.yml") if -e "${PARENT}config.yml";

if ( $opt->use_env || $opt->env_only ) { saved_from_env(); }
if ( !$opt->env_only ) {
    exit if ( !collect_config() );
}
dump_yaml();

# Subroutines

sub collect_config {
    return if ( !collect_hostname() );
    return if ( !collect_db_config() );
    return if ( !collect_redis_config() );
    return if ( !collect_pxgrid_config() );
    return if ( !collect_login_options() );
    return if ( !collect_nad() );
    return if ( !collect_coa() );
    return if ( !collect_paths() );
    return if ( !collect_async() );
    return if ( !collect_cron() );
    return if ( !collect_max() );
    return if ( !collect_debug_info() );
    return 1;
}

sub dump_yaml {
    my $file = read_data( 'Config file name', 'string', "${PARENT}config.yml" );
    DumpFile( $file, $CONFIG );
    say colored( ['green'], "Configuration saved in $file, bye!" );
    return;
}

sub collect_hostname {
    my $self = shift;
    $CONFIG->{hostname} = read_data( 'Your FQDN (might be IP)',
        'string', $SAVED->{hostname} // q{} );
    return 1;
}

sub collect_db_config {
    my $success;
    my $db_host;
    my $database;
    my $port;
    my $username;
    my $password;

    do {
        header('DB configuration');
        $db_host = read_data( tab() . 'DB host',
            'string',
            $SAVED ? $SAVED->{plugins}->{Database}->{host} : 'localhost' );
        $database = read_data( tab() . 'DB name',
            'string',
            $SAVED ? $SAVED->{plugins}->{Database}->{database} : q{} );
        $port = read_data( tab() . 'DB port',
            'number', $SAVED ? $SAVED->{plugins}->{Database}->{port} : '5432' );
        $username = read_data( tab() . 'DB user',
            'string',
            $SAVED ? $SAVED->{plugins}->{Database}->{username} : q{} );
        $password = read_data( tab() . 'DB password',
            'string',
            $SAVED ? $SAVED->{plugins}->{Database}->{password} : q{} );

        try {
            my $dbh = DBI->connect(
                'DBI:Pg:dbname='
                  . $database
                  . ';host='
                  . $db_host
                  . ';port='
                  . $port,
                $username, $password
            ) or croak $DBI::errstr;
            my $version = $dbh->selectrow_arrayref(
q{select version(), current_setting('server_version_num')::int >= 90600 as good;}
            );
            say q{You've got }
              . colored( ['cyan'], $version->[0] )
              . q{ which is }
              . ( $version->[1] ? OK() : NOK() );
            croak 'Please update PostgreSQL to 9.6 version at least'
              unless $version->[1];

            $CONFIG->{plugins}->{Database} = {
                driver                     => 'Pg',
                database                   => $database,
                host                       => $db_host,
                port                       => $port,
                username                   => $username,
                password                   => $password,
                connection_check_threshold => 10,
                dbi_params                 => {
                    RaiseError => 1,
                    AutoCommit => 1,
                },
                log_queries => 1
            };

            $success = check_sql($dbh);
            add_logger();
            $dbh->disconnect or croak $dbh->errstr;
            $success = 1;
        }
        catch {
            say colored( ['red'], $EVAL_ERROR );
            $success = 0;
        }
    } while ( !$success && confirm('Re-try DB configuration') );

    say 'DB configuration - ' . OK();

    #return $success;
    return 1;
}

sub check_sql {
    my $dbh = shift;
    say 'Checking SQL stuff, please wait...';
    my $user = $CONFIG->{plugins}->{Database}->{username};

    find(
        sub {
            return
                 if ( ( $_ eq q{.} ) || ( $_ eq q{..} ) )
              || (-d)
              || ( !m/^other[.](.+)[.]sql$/sxm );
            print tab() . "Processing '$1'";
            my $query = path($_)->slurp_utf8 =~ s/[{]{2}OWNER[}]{2}/$user/rsxm;
            $dbh->do($query) or croak $dbh->errstr;
            say ' - ' . OK();
        },
        './sql/'
    );
    return check_tables($dbh);
}

sub check_tables {
    my $dbh = shift;
    say 'Checking tables, please wait...';
    my $success = 1;

    my @tables =
      qw/cli scep_servers jobs servers certificates templates logs flows sessions users dictionaries tacacs_sessions/;
    my $query;
    foreach my $tname (@tables) {
        print tab() . "Checking '$tname' - ";
        $query =
'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = ?)';
        my $res = $dbh->selectrow_arrayref( $query, undef, ($tname) )
          or croak $dbh->errstr;
        if ( $res->[0] ) { say OK(); }
        else {
            print NOK() . ', creating - ';
            $query = path("sql/table.${tname}.sql")->slurp_utf8;
            $dbh->do($query) or croak $dbh->errstr;
            say OK();
            if (
                confirm(
                        tab()
                      . "Change owner of the '$tname' to "
                      . $CONFIG->{plugins}->{Database}->{username}
                )
              )
            {
                $query = "ALTER TABLE public.$tname OWNER TO "
                  . $CONFIG->{plugins}->{Database}->{username};
                $dbh->do($query) or croak $dbh->errstr;
            }

            if ( -e $PARENT . "sql/data.${tname}.sql" ) {
                print 'Populating... ';
                $query = path( $PARENT . "sql/table.${tname}.sql" )->slurp_utf8;
                $dbh->do($query) or croak $dbh->errstr;
                say OK();
            }
        }
    }
    return $success;
}

sub add_logger {
    my $v = shift // $CONFIG;
    $v->{log4perl} = q[log4perl.logger.main = DEBUG, DBI
log4perl.appender.DBI = Log::Log4perl::Appender::DBI
log4perl.appender.DBI.datasource=DBI:Pg:dbname=]
      . $v->{plugins}->{Database}->{database}
      . q[;host=]
      . $v->{plugins}->{Database}->{host}
      . q[;port=]
      . $v->{plugins}->{Database}->{port} . q[
log4perl.appender.DBI.username=]
      . $v->{plugins}->{Database}->{username} . q[
log4perl.appender.DBI.password=]
      . $v->{plugins}->{Database}->{password} . q[
log4perl.appender.DBI.sql=INSERT INTO "logs" ("id", "timestamp", "loglevel", "message", "owner", "chunk") VALUES (uuid_generate_v1(),?,?,?,?,?)
log4perl.appender.DBI.params.1=%d{yyyy-MM-dd HH:mm:ss.SSS}
log4perl.appender.DBI.params.2=%p
log4perl.appender.DBI.usePreparedStmt=1
log4perl.appender.DBI.layout=Log::Log4perl::Layout::NoopLayout
log4perl.appender.DBI.warp_message=0
log4perl.appender.DBI.attrs.AutoInactiveDestroy=1];
    return 1;
}

sub collect_redis_config {
    header('Redis options');
    $CONFIG->{redis}->{server} = read_data(
        tab(1) . 'Server (host:port or socket)',
        'string',
        $SAVED->{redis}->{server} // $CONFIG->{redis}->{server}
          // '127.0.0.1:6379'
    );
    say 'Redis options - ' . OK();
    return 1;
}

sub collect_pxgrid_config {
    header('pxGrid options');
    $CONFIG->{pxgrid}->{address} = read_data(
        tab(1) . 'Server (host:port or socket)',
        'string',
        $SAVED->{pxgrid}->{address} // $CONFIG->{pxgrid}->{address}
          // '127.0.0.1:8910'
    );

    do {
        $CONFIG->{pxgrid}->{token} = read_data( tab(1) . 'Token (32 chars)',
            'string',
            $SAVED->{pxgrid}->{token} // $CONFIG->{pxgrid}->{token} // q{} );
    } while ( length $CONFIG->{pxgrid}->{token} != 32 );

    say 'pxGrid options - ' . OK();
    return 1;
}

sub collect_login_options {
    header('Login options');

    $CONFIG->{one_user_mode} = 1;
    $CONFIG->{external_auth} = 0;
    $CONFIG->{one_user_opts}->{uid} =
      read_data( tab(2) . 'UID', 'string', 'user' );
    $CONFIG->{one_user_opts}->{givenName} =
      read_data( tab(2) . 'Display name', 'string', 'User' );

    if ( !$CONFIG->{one_user_opts}->{super_pass}
        || confirm( tab() . 'Would you like to change admin password', 'n' ) )
    {
        $CONFIG->{one_user_opts}->{super_pass} = q{};
        while ( !$CONFIG->{one_user_opts}->{super_pass} ) {
            $CONFIG->{one_user_opts}->{super_pass} =
              ask_password( tab(2) . 'Admin password' );
        }
    }

    delete $CONFIG->{oauth};
    delete $CONFIG->{external_auth_opts};

    say 'Login options - ' . OK();
    return 1;
}

sub collect_supers {
    return 1
      if ( !confirm( tab() . 'Would you like to change super users', 'n' ) );

    my $newusers = edit( 'List of super users - one per line',
        join "\n", @{ $CONFIG->{supers} // [] } );

    $CONFIG->{supers} = [ split /\n/sxm, $newusers ];
    say tab() . 'Got users:' . join q{,}, @{ $CONFIG->{supers} };

    return 1;
}

sub collect_nad {
    header('RADIUS configuration');

    Readonly my $MAX_LENGTH => 45;
    my @all_ifs = Net::Interface->interfaces();
    my @options;
    my @v4;
    my @v6;
    my $selected = [];
    foreach my $if (@all_ifs) {
        foreach my $add ( $if->address( Net::Interface::AF_INET() ) ) {
            my $p = Net::Interface::inet_ntoa($add);
            push @v4, $p . q{ } x ( $MAX_LENGTH - length $p ) . $if->name;
        }

        foreach my $add ( $if->address( Net::Interface::AF_INET6() ) ) {
            my $p = Net::Interface::full_inet_ntop($add);
            $p = Net::Interface::ipV6compress($p);
            push @v6, $p . q{ } x ( $MAX_LENGTH - length $p ) . $if->name;
        }
    }

    push @options, @v4, @v6;
    if ( exists $SAVED->{nad}->{allowed} && $SAVED->{nad}->{allowed} ) {
        for my $if ( @{ $SAVED->{nad}->{allowed} } ) {
            my $idx = firstidx { /^$if/ } @options;
            if ( $idx >= 0 ) { push @{$selected}, $idx; }
        }
    }

    select_multiple_options( tab() . 'RADIUS source interface (NAD IP address)',
        \@options, tab(2), $selected );
    $CONFIG->{nad}->{allowed} = [];
    foreach my $allowed ( @{$selected} ) {
        push @{ $CONFIG->{nad}->{allowed} },
          $options[$allowed] =~ s/\s+.*$//rsxm;
    }

    my $idx = select_options( tab() . 'Default source address',
        $CONFIG->{nad}->{allowed}, tab(2) );
    $CONFIG->{nad}->{ip} = $CONFIG->{nad}->{allowed}->[$idx];

    $CONFIG->{radius}->{timeout} =
      read_data( tab() . 'Default RADIUS timeout (seconds)',
        'number', $SAVED ? $SAVED->{radius}->{timeout} : '5' );

    $CONFIG->{generator}->{watcher_lifetime} = read_data(
        tab() . 'Lifetime of watcher process (per user, seconds, 0 - forever)',
        'number',
        $SAVED ? $SAVED->{generator}->{watcher_lifetime} : '86400'
    );

    $CONFIG->{generator}->{port} = read_data( tab() . 'Generator port',
        'number', $SAVED ? $SAVED->{generator}->{port} : '52525' );

    my $dd;
    do {
        my $tdir;
        try {
            ( undef, $tdir, undef ) = fileparse( $SAVED->{dictionaries}->[0] )
              if ( $SAVED && ref $SAVED->{dictionaries} eq 'ARRAY' );
        }
        catch { }
        $dd = read_data( tab() . 'Directory with FreeRADIUS dictionaries',
            'string', $tdir || "${PARENT}lib/dictionaries/" );
        $dd .= q{/} if ( $dd !~ /\/$/ );
    } while ( !check_dict_dir($dd) );
    say 'RADIUS configuration - ' . OK();
    return 1;
}

sub collect_coa {
    header('CoA configuration');
    my $port = read_data( tab() . 'Port to listen on',
        'number', $SAVED ? $SAVED->{coa}->{port} : '1700' );
    $CONFIG->{coa}->{port} = $port;
    $CONFIG->{coa}->{listen_on}   //= q{*};
    $CONFIG->{coa}->{recv_length} //= 8192;
    say 'CoA configuration - ' . OK();
    return 1;
}

sub check_dict_dir {
    my $dir     = shift;
    my $success = 1;

    my @d = @{ $CONFIG->{dictionaries} };
    foreach my $dict (@d) {
        $dict =~ s{^/usr/share/freeradius/}{$dir}isxm;
        if ( !-e $dict ) {
            say colored( ['red'], tab(2) . "File $dict not found" );
            return;
        }
    }

    $CONFIG->{dictionaries} = \@d;
    $CONFIG->{dynamic_dictionaries}->{path} = $dir;

    return $success;
}

sub collect_paths {
    my $success = 1;
    header('Paths');
    $CONFIG->{directory}->{certificates} =
      read_path( tab() . 'Where to store certificates (path)',
        '/var/sprt/certificates/' )
      . '{{user}}/{{type}}/{{id}}/';
    say 'Paths - ' . OK();
    return $success;
}

sub collect_async {
    header('Async options');
    $CONFIG->{async}->{log_file} =
      read_path( tab() . 'Where to store logs (path)', '/var/sprt/logs/' )
      . '{{owner}}/{{job_id}}/{{logger_name}}.log';
    $CONFIG->{async}->{flow_directory} =
      read_path( tab() . 'Where to store flows (path)', '/var/sprt/flows/' )
      . '{{owner}}/';
    $CONFIG->{processes}->{max_threads} = read_data( tab() . 'Max threads',
        'number', $SAVED ? $SAVED->{processes}->{max_threads} : '16' );
    say 'Async options - ' . OK();
    return 1;
}

sub collect_max {
    header('Other');
    $CONFIG->{processes}->{max_sessions} =
      read_data( tab() . 'Max amount of sessions per run',
        'number', $SAVED ? $SAVED->{processes}->{max_sessions} : '100000' );
    say 'Other - ' . OK();
    return 1;
}

sub collect_cron {
    header('Scheduler');
    $CONFIG->{cron}->{user} = read_data( tab() . 'Cron user',
        'string', $SAVED ? $SAVED->{cron}->{user} : 'root' );
    $CONFIG->{cron}->{max_per_user} = read_data( tab() . 'Max crons per user',
        'number', $SAVED ? $SAVED->{cron}->{max_per_user} : '4' );
    say 'Scheduler - ' . OK();
    return 1;
}

sub collect_debug_info {
    header('Debug configuration');
    my $d = confirm( tab() . 'Enable debugs', 'n' );
    if ($d) {
        $CONFIG->{debug}        = 1;
        $CONFIG->{log}          = 'debug';
        $CONFIG->{startup_info} = 1;
        $CONFIG->{show_errors}  = 1;
    }
    else {
        $CONFIG->{debug}        = 0;
        $CONFIG->{log}          = 'warning';
        $CONFIG->{startup_info} = 0;
        $CONFIG->{show_errors}  = 0;
    }
    return 1;
}

sub collect_oauth {
    header('OAuth configuration');
    $CONFIG->{oauth} //= {};
    $CONFIG->{oauth}->{client_id} = read_data( tab() . 'Client ID',
        'string', $SAVED ? $SAVED->{oauth}->{client_id} : q{} );
    $CONFIG->{oauth}->{secret} = read_data( tab() . 'Secret',
        'string', $SAVED ? $SAVED->{oauth}->{secret} : q{} );
    return 1;
}

sub confirm {
    my $question = shift;
    my $default  = shift;
    my $reply    = q{};

    while ( $reply !~ m/^[yn]/isxm ) {
        print "$question? (y/n) " . ( $default ? "[$default] " : q{} );
        chomp( $reply = <STDIN> );
        $reply ||= $default;
    }
    return $reply =~ m/^y/sxmi ? 1 : undef;
}

sub check_number {
    my $val = shift;
    return $val =~ /^\d+$/sxm ? 1 : undef;
}

sub check_string {
    my $val = shift;
    return $val =~ /.+/sxm ? 1 : undef;
}

Readonly my $TYPE_CHECKER => {
    'string' => \&check_string,
    'number' => \&check_number,
};

sub read_data {
    my $question = shift;
    my $type     = shift || 'string';
    my $default  = shift;
    my $reply    = q{};

    return $default if $opt->confirm;

    do {    # allow for pedants who reply "yes" or "no"
        print "$question? " . ( $default ? "[$default] " : q{} );
        $reply = <STDIN>;
        if ($reply) { chomp $reply; }
        $reply ||= $default;
    } while (
        !$reply
        || ( exists $TYPE_CHECKER->{$type}
            && !$TYPE_CHECKER->{$type}->($reply) )
    );
    return $reply;
}

sub read_path {
    my $question = shift;
    my $default  = shift;
    my $d;
    my $success = 1;

    do {
        $d = read_data( $question, 'string', $default );
        $d .= q{/} if ( $d !~ /\/$/sxm );
        try {
            path($d)->mkpath;
            $success = 1;
        }
        catch {
            say colored( ['red'], "Couldn't create path: $EVAL_ERROR" );
            $success = 0;
        }
    } while ( !$success && confirm('Try another') );

    return $d;
}

sub select_options {
    my $question = shift;
    my $options  = shift;
    my $tab      = shift || tab(2);
    my $reply;
    my $out = q{};

    my $firstout = 1;
    while ( !$reply
        || $reply !~ /^\d+$/sxm
        || $reply < 1
        || $reply > scalar @{$options} )
    {
        $out .= "$question?\n";
        foreach my $i ( 0 .. $#{$options} ) {
            $out .= $tab . q{[} . ( $i + 1 ) . q{] } . $options->[$i] . "\n";
        }
        $out .= $tab . q{> };

        if ( !$firstout ) {
            print up( scalar split /\n/sxm, $out );
            print cldown;

        }
        $firstout = 0;
        print $out;

        chomp( $reply = <STDIN> );
    }
    return $reply - 1;
}

sub select_multiple_options {
    my $question = shift;
    my $options  = shift;
    my $tab      = shift || tab(2);
    my $selected = shift // [];
    my $reply;

    my $spaces   = int( scalar @{$options} / 10 ) + 1;
    my $firstout = 1;

    while (!$reply
        || lc $reply ne 'q'
        || ( $reply eq 'q' && !scalar @{$selected} ) )
    {
        my $out = q{};
        $out .= "$question?\n";
        $out .= tab(2)
          . "Enter a number to select. Enter a number again to deselect. At least one should be selected\n";

        foreach my $i ( 0 .. $#{$options} ) {
            my $pr =
                $tab . q{[}
              . ( $i + 1 ) . q{]}
              . q{ } x ( 1 + $spaces - length $i + 1 )
              . $options->[$i];
            if ( scalar @{$selected}
                && ( firstidx { $_ == $i } @{$selected} ) >= 0 )
            {
                $out .= header( underline($pr) );
            }
            else {
                $out .= $pr . "\n";
            }
        }
        $out .= $tab . '[q]' . q{ } x $spaces . "Save and continue\n";
        $out .= $tab . '> ';

        if ( !$firstout ) {
            print up( scalar split /\n/sxm, $out );
            print cldown;

        }
        $firstout = 0;
        print $out;

        chomp( $reply = <STDIN> );
        if (   $reply =~ /^\d+$/sxm
            && $reply > 0
            && $reply <= scalar @{$options} )
        {
            $reply--;
            my $s = firstidx { $_ == $reply } @{$selected};
            if ( scalar @{$selected} && $s >= 0 ) {
                splice @{$selected}, $s, 1;
            }
            else { push @{$selected}, $reply; }
        }
    }
    return 1;
}

sub OK {
    return colored( ['green'], 'OK' );
}

sub NOK {
    return colored( ['red'], 'NOT OK' );
}

sub header {
    my $r = colored( ['white bold'], shift ) . "\n";
    if   ( defined wantarray ) { return $r; }
    else                       { print $r; }
    return;
}

sub underline {
    return colored( ['underline'], shift );
}

sub tab {
    my $c = shift // 1;
    return q{ } x ( 2 * $c );
}

sub saved_from_env {
    $CONFIG->{hostname} = $ENV{SPRT_HOSTNAME} // $SAVED->{hostname};
    $CONFIG->{plugins}->{Database}->{host} = $ENV{SPRT_DB_HOST}
      // $SAVED->{plugins}->{Database}->{host};
    $CONFIG->{plugins}->{Database}->{database} = $ENV{SPRT_DB_NAME}
      // $SAVED->{plugins}->{Database}->{database};
    $CONFIG->{plugins}->{Database}->{port} = $ENV{SPRT_DB_PORT}
      // $SAVED->{plugins}->{Database}->{port};
    $CONFIG->{plugins}->{Database}->{username} = $ENV{SPRT_DB_USER}
      // $SAVED->{plugins}->{Database}->{username};
    $CONFIG->{plugins}->{Database}->{password} = $ENV{SPRT_DB_PASSWORD}
      // $SAVED->{plugins}->{Database}->{password};
    $CONFIG->{redis}->{server} = $ENV{SPRT_REDIS_SERVER}
      // $SAVED->{redis}->{server};
    $CONFIG->{pxgrid}->{address} = $ENV{SPRT_PX_ADDRESS}
      // $SAVED->{pxgrid}->{address};
    $CONFIG->{pxgrid}->{token} = $ENV{SPRT_PX_TOKEN}
      // $SAVED->{pxgrid}->{token};

    $CONFIG->{one_user_mode} =
      defined $ENV{SPRT_USER_MODE}
      ? $ENV{SPRT_USER_MODE} eq 'single'
      : $SAVED->{one_user_mode};
    $CONFIG->{external_auth} =
      defined $ENV{SPRT_USER_MODE}
      ? $ENV{SPRT_USER_MODE} eq 'external'
      : $SAVED->{external_auth};

    if ( $CONFIG->{one_user_mode} ) {
        $CONFIG->{one_user_opts}->{uid} = $ENV{SPRT_USER_UID}
          // $SAVED->{one_user_opts}->{uid};
        $CONFIG->{one_user_opts}->{givenName} = $ENV{SPRT_USER_GIVEN}
          // $SAVED->{one_user_opts}->{givenName};
        $CONFIG->{one_user_opts}->{super} = $ENV{SPRT_USER_SUPER}
          // $SAVED->{one_user_opts}->{super};
        $CONFIG->{one_user_opts}->{super_pass} = $ENV{SPRT_USER_SUPER_PASSWORD}
          // $SAVED->{one_user_opts}->{super_pass};
        delete $CONFIG->{external_auth};
        delete $CONFIG->{external_auth_opts};
        delete $CONFIG->{oauth};
    }
    elsif ( $CONFIG->{external_auth} ) {
        $CONFIG->{external_auth_opts}->{public} = $ENV{SPRT_PUB_KEY}
          // '';
        $CONFIG->{external_auth_opts}->{host} = $ENV{SPRT_EXT_AUTH_ADDRESS}
          // '';
        delete $CONFIG->{one_user_mode};
        delete $CONFIG->{one_user_opts};
        delete $CONFIG->{oauth};
    }
    else {
        # FIXME: OAuth
        $CONFIG->{oauth}->{client_id} = $ENV{SPRT_SSO_CLIENT_ID}
          // $SAVED->{oauth}->{client_id};
        $CONFIG->{oauth}->{secret} = $ENV{SPRT_SSO_SECRET}
          // $SAVED->{oauth}->{secret};
    }

    $CONFIG->{nad}->{allowed} =
      defined $ENV{SPRT_NAD_ALLOWED}
      ? [ split /;/sxm, $ENV{SPRT_NAD_ALLOWED} ]
      : $SAVED->{nad}->{allowed};
    $CONFIG->{nad}->{ip} = $ENV{SPRT_NAD_IP} // $SAVED->{nad}->{ip};
    if ( $ENV{SPRT_REAL_IP} ) {
        $CONFIG->{nad}->{ip}            = $ENV{SPRT_REAL_IP};
        $CONFIG->{nad}->{no_local_addr} = 1;
    }
    else {
        delete $CONFIG->{nad}->{no_local_addr};
    }

    $CONFIG->{radius}->{timeout} = $ENV{SPRT_RADIUS_TIMEOUT}
      // $SAVED->{radius}->{timeout};
    $CONFIG->{radius}->{retransmits} = $ENV{SPRT_RADIUS_RETRANSMITS}
      // $SAVED->{radius}->{retransmits};
    $CONFIG->{generator}->{watcher_lifetime} = $ENV{SPRT_WATCHER_LIFETIME}
      // $SAVED->{generator}->{watcher_lifetime};
    $CONFIG->{generator}->{port} = $ENV{SPRT_GENERATOR_PORT}
      // $SAVED->{generator}->{port};
    $CONFIG->{dictionaries} =
      defined $ENV{SPRT_RADIUS_DICTIONARIES}
      ? [ split /;/sxm, $ENV{SPRT_RADIUS_DICTIONARIES} ]
      : ( $SAVED->{dictionaries} // $CONFIG->{dictionaries} );
    $CONFIG->{coa}->{port}      = $ENV{SPRT_COA_PORT} // $SAVED->{coa}->{port};
    $CONFIG->{processes}->{max} = $ENV{SPRT_PROCESSES_MAX}
      // $SAVED->{processes}->{max};
    $CONFIG->{processes}->{max_threads} = $ENV{SPRT_PROCESSES_MAX_THREADS}
      // $SAVED->{processes}->{max_threads};
    $CONFIG->{processes}->{max_sessions} = $ENV{SPRT_PROCESSES_MAX_SESSIONS}
      // $SAVED->{processes}->{max_sessions};

    $CONFIG->{supers} =
      defined $ENV{SPRT_SUPERS}
      ? [ split /;/sxm, $ENV{SPRT_SUPERS} ]
      : $SAVED->{supers};

    $CONFIG->{scep}->{type}   = $ENV{SPRT_SCEP_TYPE} // $SAVED->{scep}->{type};
    $CONFIG->{scep}->{listen} = $ENV{SPRT_SCEP_LISTEN}
      // $SAVED->{scep}->{listen};

    $CONFIG->{directory}->{certificates} = $ENV{SPRT_CERTIFICATES_DIRECTORY}
      // $SAVED->{directory}->{certificates};
    $CONFIG->{async}->{log_file} = $ENV{SPRT_ASYNC_LOG_FILE}
      // $SAVED->{async}->{log_file};
    $CONFIG->{async}->{flow_directory} = $ENV{SPRT_ASYNC_FLOW_DIRECTORY}
      // $SAVED->{async}->{flow_directory};

    $CONFIG->{debug} = $ENV{SPRT_DEBUG} // $SAVED->{debug} // 0;

    $CONFIG->{dynamic_dictionaries}->{path} = $ENV{SPRT_DYNAMIC_DICTIONARIES}
      // $SAVED->{dynamic_dictionaries}->{path};

    $CONFIG->{cron}->{user} = $ENV{SPRT_CRON_USER} // $SAVED->{cron}->{user}
      // 'root';
    $CONFIG->{cron}->{max_per_user} = $ENV{SPRT_MAX_CRONS_PER_USER}
      // $SAVED->{cron}->{max_per_user} // 4;

    add_logger();

    return;
}

1;
__END__

=pod

Env vriables:

SPRT_HOSTNAME
SPRT_DB_HOST
SPRT_DB_NAME
SPRT_DB_PORT
SPRT_DB_USER
SPRT_DB_PASSWORD
SPRT_REDIS_SERVER
SPRT_PX_ADDRESS
SPRT_PX_TOKEN
SPRT_USER_MODE
SPRT_USER_MODE
SPRT_USER_MODE
SPRT_USER_MODE
SPRT_USER_UID
SPRT_USER_GIVEN
SPRT_USER_SUPER
SPRT_USER_SUPER_PASSWORD
SPRT_PUB_KEY
SPRT_EXT_AUTH_ADDRESS
SPRT_NAD_ALLOWED
SPRT_NAD_ALLOWED
SPRT_RADIUS_TIMEOUT
SPRT_RADIUS_RETRANSMITS
SPRT_WATCHER_LIFETIME
SPRT_RADIUS_DICTIONARIES
SPRT_RADIUS_DICTIONARIES
SPRT_COA_PORT
SPRT_PROCESSES_MAX
SPRT_PROCESSES_MAX_THREADS
SPRT_PROCESSES_MAX_SESSIONS
SPRT_SUPERS
SPRT_SUPERS
SPRT_SCEP_TYPE
SPRT_SCEP_LISTEN
SPRT_CERTIFICATES_DIRECTORY
SPRT_ASYNC_LOG_FILE
SPRT_ASYNC_FLOW_DIRECTORY
SPRT_DEBUG
SPRT_REAL_IP
SPRT_NAD_IP
SPRT_DYNAMIC_DICTIONARIES
SPRT_CRON_USER
SPRT_MAX_CRONS_PER_USER
SPRT_SSO_CLIENT_ID
SPRT_SSO_SECRET

=cut
