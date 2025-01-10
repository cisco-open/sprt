package plackGen;

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Config;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use PRaGFrontend::Plugins::DB;

use Data::GUID;
use DateTime;
use DateTime::Event::Cron;
use Devel::StackTrace;
use Encode  qw/encode_utf8/;
use English qw/-no_match_vars/;
use Exporter 'import';
use File::Temp qw/tempfile/;
use FindBin;
use HTTP::Status    qw/:constants status_message/;
use IO::Socket      ();
use JSON::MaybeXS   ();
use List::MoreUtils qw/firstidx/;
use Net::Interface  qw/ipV6compress/;
use ParseCron;
use Proc::ProcessTable;
use Readonly;
use Ref::Util      qw/is_ref is_plain_arrayref is_blessed_ref/;
use Regexp::Common qw/net/;
use Rex::Commands::Cron;
use String::Random;
use String::ShellQuote qw/shell_quote/;
use Syntax::Keyword::Try;
use Text::ParseWords qw/shellwords/;

use PRaGFrontend::variables qw/:definitions/;
use PRaGFrontend::login;

use PRaG::Util::Procs;

our $VERSION = '1.4.2';

Readonly my $KILL_ATTEMPTS => 5;

our $DEFAULT_PER_PAGE;
our $MAX_SESSIONS_ONE_GO;
our $MAX_SESSIONS_IN_CLEAN;
our $SECS_IN_DAY;
our $SECS_FIVE_DAYS;
our $SECS_10_DAYS;
our $SECS_30_DAYS;
our $PROTO_RADIUS;
our $PROTO_TACACS;

Readonly $DEFAULT_PER_PAGE      => 50;
Readonly $MAX_SESSIONS_ONE_GO   => 65_535;
Readonly $MAX_SESSIONS_IN_CLEAN => 20_000;
Readonly $SECS_IN_DAY           => 86_400;
Readonly $SECS_FIVE_DAYS        => $SECS_IN_DAY * 5;
Readonly $SECS_10_DAYS          => $SECS_IN_DAY * 10;
Readonly $SECS_30_DAYS          => $SECS_IN_DAY * 30;
Readonly $PROTO_RADIUS          => 'radius';
Readonly $PROTO_TACACS          => 'tacacs';

our $SCHEDULER_BIN;
our $CRON_USER;
our $MAX_SCHEDULED_PER_USER;

Readonly $SCHEDULER_BIN          => "$FindBin::Bin/scheduler";
Readonly $CRON_USER              => 'root';
Readonly $MAX_SCHEDULED_PER_USER => 4;

Readonly my @CONST_NAMES => qw/
  $DEFAULT_PER_PAGE
  $MAX_SESSIONS_ONE_GO
  $MAX_SESSIONS_IN_CLEAN
  $SECS_IN_DAY
  $SECS_FIVE_DAYS
  $SECS_10_DAYS
  $SECS_30_DAYS
  $PROTO_RADIUS
  $PROTO_TACACS
  /;

Readonly my @SCHEDULER => qw /
  collect_crons
  remove_cron
  $SCHEDULER_BIN
  $CRON_USER
  $MAX_SCHEDULED_PER_USER
  /;

our @EXPORT_OK = qw/
  count_processes load_servers load_server_bulks start_process stop_process
  load_page_settings load_user_attributes collect_procs load_pagination save_pagination prepare_sort
  check_precreate_section save_attributes find_server_of_user collect_nad_ips is_ip save_cli check_processes
  sessions_exist is_radius is_tacacs parse_tokens
  /;

our %EXPORT_TAGS = ( const => \@CONST_NAMES, cron => \@SCHEDULER );
Exporter::export_ok_tags( 'const', 'cron' );

set static_handler => true;
set serializer     => 'MyMutable';
set version        => $VERSION;

super_only qw/debug.view debug.change config.view/;

hook before => sub {
    #
    # Check login, update session and set logger
    #
    var debug => config->{debug};

    return 1 if ( request->path =~ m{^/auth/anonym/}sxm );
    return 1 if ( request->path =~ m{^/auth/login}sxm && request->is_get );
    return 1 if ( request->path =~ m{^/sms/}sxm );

    my $login = PRaGFrontend::login->new();
    if (   request->path =~ m{^/auth}sxm
        || request->path =~ m{^/(?:perl-)?version}sxm )
    {
        var login => $login;
        return 1;
    }

    if ( !$login->login() ) { halt('Unauthorized'); }

    user_logged_in $login;
    if (is_super) { load_super(); }

    set_log_owner user->uid, 1;

    var errors => [];

    check_precreate_user();
    return 1;
};

hook before_template_render => sub {
    #
    # Set default values
    #
    my $tokens = shift;
    $tokens->{pxgrid}          = config->{pxgrid} ? 1 : 0;
    $tokens->{debug}           = vars->{debug};
    $tokens->{version}         = $VERSION;
    $tokens->{hostname}        = config->{hostname};
    $tokens->{page_settings}   = load_page_settings( $tokens->{active} );
    $tokens->{page_attributes} = load_user_attributes( $tokens->{active} );
    $tokens->{ui_settings}     = load_user_attributes('ui');
};

hook before_error => sub {
    #
    # Handle errors correctly
    #
    my $error = shift;

    set_log_owner '_gui_general';
    logging->error( 'From '
          . user->uid . q{: }
          . ( $error->{exception} || $error->message || q{} ) );

    # status $error->status || HTTP_INTERNAL_SERVER_ERROR;
    if (serve_json) {
        my $exception = $error->{exception};
        if ($exception) { $exception =~ s{\s*at\s*/.*$}{}sxm; }
        send_as
          JSON => {
            error          => $error->message || $exception,
            status_message =>
              status_message( $error->status || HTTP_INTERNAL_SERVER_ERROR ),
            status => $error->status
          },
          { content_type => 'application/json; charset=UTF-8' };
    }
    else {
        send_as
          html => template 'error.tt',
          {
            code           => $error->status || HTTP_INTERNAL_SERVER_ERROR,
            status_message =>
              status_message( $error->status || HTTP_INTERNAL_SERVER_ERROR ),
            message => $error->message || $error->exception,
          },
          { layout => undef };
    }
};

#-----------------------------------------------------------------------------#
# Generic routes
#-----------------------------------------------------------------------------#

prefix q{/};
get q{/} => sub {
    send_as
      html => template 'index.tt',
      {}, { layout => undef };
};

get '/obrar.cgi' => sub {
    logging->debug('obrar.cgi called');
};

get '/favicon.ico' => sub {
    send_file 'favicon.png';
};

options '/version' => sub {
    response_header 'Access-Control-Allow-Origin'  => q{*};
    response_header 'Access-Control-Allow-Methods' => 'GET, OPTIONS';
    status 'no_content';
};

get '/version' => sub {
    response_header 'Access-Control-Allow-Origin' => q{*};
    send_as JSON => { version => setting('version') };
};

options '/perl-version' => sub {
    response_header 'Access-Control-Allow-Origin'  => q{*};
    response_header 'Access-Control-Allow-Methods' => 'GET, OPTIONS';
    status 'no_content';
};

get '/perl-version' => sub {
    response_header 'Access-Control-Allow-Origin' => q{*};
    send_as JSON => { version => $PERL_VERSION->{original} };
};

get '/debug/' => sub {
    user_allowed 'debug.view', throw_error => 1;

    send_as JSON => {
        appdir     => config->{appdir},
        public_dir => config->{public_dir}
    };
};

get '/debug/:new/' => sub {
    user_allowed 'debug.change', throw_error => 1;

    var debug => route_parameters->get('new') ? 1 : 0;
    check_precreate_page('global');
    if ( vars->{debug} ) {
        set_log_level 'DEBUG';
        database->quick_update(
            config->{tables}->{users},
            { uid => user->uid },
            {
                pages => \
                  q/(jsonb_set(pages, '{global,"debug"}', '"on"', true))::jsonb/
            }
        );
    }
    else {
        set_log_level 'INFO';
        database->quick_update(
            config->{tables}->{users},
            { uid => user->uid },
            {
                pages => \
q/(jsonb_set(pages, '{global,"debug"}', '"ignore"', true))::jsonb/
            }
        );
    }

    logging->info(
        'New debug state: ' . ( vars->{debug} ? 'ENABLED' : 'DISABLED' ) );
    redirect q{/};
};

get '/config/dump' => sub {
    user_allowed 'config.view', throw_error => 1;

    my $cfg = JSON::MaybeXS->new(
        allow_nonref    => 1,
        allow_blessed   => 1,
        allow_stringify => 1,
        allow_unknown   => 1
    )->encode(config);

    send_file \$cfg, content_type => 'application/json', charset => 'utf8';
};

#-----------------------------------------------------------------------------#
# Exported Function
#-----------------------------------------------------------------------------#

sub count_processes {
    return PRaG::Util::Procs::count_processes( user => user->uid );
}

sub check_processes {
    my $current_prcs = count_processes();
    logging->debug(qq/Found processes for the user: $current_prcs/);
    if ( $current_prcs >= config->{processes}->{max} ) {
        send_error( 'To many processes started already.', HTTP_CONFLICT );
        return;
    }
    return 1;
}

sub sessions_exist {
    my $proto = shift;

    return database->quick_lookup(
        $proto eq $PROTO_RADIUS
        ? config->{tables}->{sessions}
        : config->{tables}->{tacacs_sessions},
        { server => var('server'), owner => user->owners },
        'server'
    );
}

sub load_servers {
    my ( $split, %o ) = @_;

    $o{proto} //= $PROTO_RADIUS;

    my $condition = q{};
    my @bind;

    # push @bind, ( $o{user} // user->uid );

    if ($split) {
        $condition = q/AND "server" = ? /;
        push @bind, $split;
    }

    my $inner_select =
        q/SELECT rs."server", COUNT(rs."id") as sessionscount, rs."owner" /
      . q/FROM /
      . database->quote_identifier(
        $o{proto} eq $PROTO_RADIUS
        ? config->{tables}->{sessions}
        : config->{tables}->{tacacs_sessions}
      )
      . q/ rs WHERE rs."owner" IN (/
      . user->join_owners( $o{user} // user->real_uid ) . q/) /
      . $condition
      . q/GROUP BY rs."server", rs."owner"/;

    my $fields = q/"t"."server", "t"."sessionscount",/
      . q/"m"."attributes"->>'friendly_name' as "friendly_name" /;
    my $join =
        q/ON "t"."server"::text = "m"."attributes"->>'resolved' /
      . q/AND "t"."owner" = "m"."owner"/;

    my $sql =
        q/SELECT /
      . $fields
      . qq/FROM ($inner_select) t /
      . q/LEFT JOIN /
      . database->quote_identifier( config->{tables}->{servers} ) . q/ m /
      . $join;

    logging->debug( 'Loading servers: ' . $sql );
    my $sth = database->prepare($sql);

    if ( !defined $sth->execute(@bind) ) {
        push @{ vars->{errors} },
          qq/Error while '${sql}' execution: $sth->errstr/;
        logging->error( "Error while '${sql}' execution: " . $sth->errstr );
        return;
    }
    else {
        my $servers = $sth->fetchall_arrayref( {} );
        if ( !vars->{no_bulks} ) {
            foreach my $srv ( @{$servers} ) {
                $srv->{'bulks'} =
                  load_server_bulks( $srv->{'server'}, $o{proto} );
            }
        }
        return $servers;
    }
}

sub load_server_bulks {
    my ( $server, $proto ) = @_;

    my $sql =
      q/SELECT COUNT(DISTINCT "id") AS "sessions", bulk AS "name" FROM /
      . database->quote_identifier(
        $proto eq $PROTO_RADIUS
        ? config->{tables}->{sessions}
        : config->{tables}->{tacacs_sessions}
      )
      . q/ WHERE "server" = ? AND "owner" IN (/
      . user->join_owners
      . q/) GROUP BY "bulk"/;
    my $sth = database->prepare($sql);

    if ( !defined $sth->execute($server) ) {
        push @{ vars->{errors} },
          "Error while '${sql}' execution: " . $sth->errstr;
        logging->error( "Error while '${sql}' execution: " . $sth->errstr );
        return;
    }
    else {
        return $sth->fetchall_arrayref( {} );
    }
}

sub start_process {
    my ( $encoded_json, $h ) = @_;

    $h->{as_continue}     //= 0;
    $h->{count_processes} //= 1;

    my $resp;

    try {
        $resp = PRaG::Util::Procs::start_new_process(
            $encoded_json,
            cmd                 => ( $h->{as_continue} ? 'CONTINUE' : 'START' ),
            logger              => logging,
            owner               => $h->{user} // user->real_uid,
            max_cli_length      => config_at('generator.max_cli_length'),
            port                => config_at('generator.port') // 52525,
            json                => JSON::MaybeXS->new( utf8 => 1 ),
            configfile          => config->{appdir} . 'config.yml',
            verbose             => $h->{verbose} // vars->{debug} // 0,
            die_on_error        => 1,
            check_running_procs => $h->{count_processes},
            max_per_user        => config_at('processes.max'),

            # host_socket         => config_at('generator.host_socket'),
        );
    }
    catch {
        send_error( q{Couldn't connect to socket: } . $EVAL_ERROR,
            HTTP_INTERNAL_SERVER_ERROR );
        return;
    };

    return defined wantarray
      ? {
        type    => 'success',
        message => 'Job started.<br>'
          . ( vars->{debug} ? "Process with $resp was started." : q{} ),
      }
      : undef;
}

sub stop_process {
    my $pid        = shift;
    my $skip_check = shift // 0;

    return PRaG::Util::Procs::stop_process(
        $pid,
        skip_check => $skip_check,
        logger     => logging
    );
}

sub random_string {
    my $length = shift;

    my $string = String::Random->new;
    return $string->randregex( '\w{' . $length . '}' );
}

sub load_pagination {
    my %h = @_;

    my $saved = session->read('pagination') // {};
    return $saved->{ $h{where} } // {
        'per-page' => $DEFAULT_PER_PAGE,
        'sort'     => undef,
        'order'    => undef,
    };
}

sub save_pagination {
    my %h = @_;

    my $known = session->read('pagination') // {};
    $known->{ $h{where} } = $h{what};

    session pagination => $known;
    return 1;
}

sub prepare_sort {
    my ( $sortable, $r, $default_sort, $dorder ) = @_;
    my %add_params;
    $dorder //= 'desc';

    # Parse additional parameters
    if ( scalar @{$r} ) {
        if ( scalar( @{$r} ) % 2 == 1 ) { pop @{$r}; }
        %add_params = @{$r};
    }

    # And default them if anything
    $add_params{page} //= 0;
    my @how_sort =
      split /-/sxm, $add_params{sort} || $default_sort . q{-} . $dorder;
    $add_params{'per-page'} //= $DEFAULT_PER_PAGE;

    my %sort = (
        column => ( $how_sort[0] && $sortable->{ $how_sort[0] } )
        ? scalar $sortable->{ $how_sort[0] }
        : $default_sort,
        order => ( $how_sort[1] && $how_sort[1] =~ /^(a|de)sc$/isxm )
        ? uc scalar $how_sort[1]
        : 'DESC',
        limit => (
                 $add_params{'per-page'}
              && $add_params{'per-page'} =~ /^(\d+|all)$/isxm
        ) ? scalar $add_params{'per-page'} : $DEFAULT_PER_PAGE,
        offset => ( $add_params{offset} && $add_params{offset} =~ /^\d+$/sxm )
        ? scalar $add_params{offset}
        : undef,
        filter => $add_params{filter} || undef,
    );
    $sort{offset} //=
      (      $add_params{page}
          && $add_params{page} =~ /^\d+$/sxm
          && $sort{limit}      =~ /^\d+$/sxm )
      ? ( $add_params{page} - 1 ) * $sort{limit}
      : 0;
    return \%sort;
}

sub check_precreate_user {
    return 1
      if (
        database->quick_count(
            config->{tables}->{users}, { uid => user->uid }
        )
      );
    logging->debug( 'Adding user to DB: ' . user->uid );
    database->quick_insert( config->{tables}->{users},
        { uid => user->uid, pages => '{}', attributes => '{}' } );
    return;
}

sub check_precreate_page {
    my $page = shift;
    my $sql  = sprintf
      'SELECT count(*) FROM %s where uid=%s and pages->%s is not null',
      database->quote_identifier( config->{tables}->{users} ),
      database->quote( user->uid ),
      database->quote($page);
    if ( !database->selectrow_arrayref($sql)->[0] ) {
        logging->debug("Creating key for the page '$page'");
        database->quick_update(
            config->{tables}->{users},
            { uid   => user->uid },
            { pages => \qq/pages || '{"$page": {}}'::jsonb/ }
        );
    }
    return;
}

sub load_page_settings {
    my $page = shift;
    return {} if not $page;
    my $sql = sprintf
      'select pages->%s as r from %s where %s=%s',
      database->quote($page),
      database->quote_identifier( config->{tables}->{users} ),
      database->quote_identifier('uid'),
      database->quote( user->uid );
    my $r = database->selectrow_arrayref($sql);
    return JSON::MaybeXS->new( utf8 => 1 )->decode( encode_utf8( $r->[0] ) )
      if ( $r && scalar @{$r} && $r->[0] );
    return {};
}

sub load_user_attributes {
    my ( $section, %o ) = @_;
    return {} if ( !$section );
    if ( is_plain_arrayref($section) ) {
        for my $i ( 0 .. $#{$section} ) {
            $section->[$i] = database->quote( $section->[$i] );
        }
        $section = join '->', @{$section};
    }
    else {
        $section = database->quote($section);
    }
    $section = 'attributes->' . $section;

    my $sql = sprintf
      'select %s as r from %s where %s=%s',
      $section,
      database->quote_identifier( config->{tables}->{users} ),
      database->quote_identifier('uid'),
      database->quote( $o{user} // user->uid );
    debug 'Executing ' . $sql;
    my $r = database->selectrow_arrayref($sql);
    return JSON::MaybeXS->new( utf8 => 1 )->decode( encode_utf8( $r->[0] ) )
      if ( $r && scalar @{$r} && $r->[0] );
    return {};
}

sub load_super {
    my $atts = load_page_settings('global');
    if    ( $atts->{debug} eq 'on' )  { var debug => 1; }
    elsif ( $atts->{debug} eq 'off' ) { var debug => 0; }
    else                              { var debug => config->{debug}; }
    set_log_level vars->{debug} ? 'DEBUG' : 'INFO';
    return 1;
}

sub unbless_process {
    my $p = shift;
    my $r = {};
    foreach my $k ( keys %{$p} ) {
        if ( not is_blessed_ref( $p->{$k} ) ) { $r->{$k} = $p->{$k}; }
    }
    return $r;
}

sub process_process {
    my ( $proc, $table ) = @_;

    my $unblessed = unbless_process($proc);
    return {
        %{$unblessed},
        (
            children => [
                map  { process_process( $_, $table ) }
                grep { $_->ppid == $proc->pid } @{$table}
            ]
        )
    };
}

sub collect_procs {
    my $t = Proc::ProcessTable->new;
    my $guid =
'([[:xdigit:]]{8}-[[:xdigit:]]{4}-[[:xdigit:]]{4}-[[:xdigit:]]{4}-([[:xdigit:]]){12})';
    my @running = grep { $_->cmndline =~ /PRaG-/sxm } @{ $t->table };
    my $peruser = {};
    my $total   = 0;
    foreach my $p (@running) {
        if ( $p->cmndline =~ /PRaG-(.+)-${guid}/isxm ) {
            $total++;
            my $u = $1;
            if ( !exists $peruser->{$u} ) { $peruser->{$u} = []; }
            push @{ $peruser->{$u} }, process_process( $p, $t->table );
        }
    }
    return {
        total   => $total,
        peruser => $peruser
    };
}

sub check_precreate_section {
    my $section = shift;

    my $sql = sprintf
'SELECT attributes->%s FROM %s WHERE uid=%s AND attributes->%s IS NOT NULL',
      database->quote($section),
      database->quote_identifier( config->{tables}->{users} ),
      database->quote( user->uid ),
      database->quote($section);

    if ( my $saved = database->selectrow_arrayref($sql) ) {
        my $j = JSON::MaybeXS->new( allow_nonref => 1 );
        return $j->decode( encode_utf8( $saved->[0] ) );
    }
    else {
        my $j = JSON::MaybeXS->new( allow_nonref => 1 );
        my $a = q/attributes || '{/ . $j->encode($section) . q/: {}}'::jsonb/;
        undef $j;

        logging->debug("Creating key for the section '$section' in attributes");
        database->quick_update(
            config->{tables}->{users},
            { uid        => user->uid },
            { attributes => \$a }
        );
        return {};
    }
}

sub save_attributes {
    my $data = shift;

    my $j = JSON::MaybeXS->new( allow_nonref => 1 );
    foreach my $s ( keys %{$data} ) {
        my $saved = check_precreate_section($s);
        foreach my $k ( keys %{ $data->{$s} } ) {
            $saved->{$k} = $data->{$s}->{$k};
        }

        my $update =
          sprintf q/(jsonb_set(attributes, '{%s}', %s, true))::jsonb/,
          $j->encode($s), database->quote( $j->encode($saved) );

        database->quick_update(
            config->{tables}->{users},
            { uid        => user->uid },
            { attributes => \$update }
        );
    }
    undef $j;
    return;
}

sub find_server_of_user {
    my %o = @_;

    my $where =
        sprintf q{"owner" IN (%s) AND (}
      . q{"address" = %2$s OR }
      . q{"attributes"->>'resolved' = %2$s OR }
      . q{"attributes"->>'v6_address' = %2$s} . q{)},
      user->join_owners( $o{user} ), database->quote( $o{address} );

    return scalar database->quick_select( config->{tables}->{servers},
        $where, { columns => $o{columns}, limit => 1 } );
}

sub collect_nad_ips {
    my @all_ifs   = Net::Interface->interfaces();
    my $by_family = { IPv4 => [], IPv6 => [] };
    my $exclude =
      exists config->{nad}->{exclude} ? config->{nad}->{exclude} : undef;
    my $allowed =
      exists config->{nad}->{allowed} ? config->{nad}->{allowed} : undef;
    logging->debug( 'Got allowed interfaces: ' . to_dumper($allowed) );
    foreach my $if (@all_ifs) {
        foreach my $add ( $if->address( Net::Interface::AF_INET6() ) ) {
            my $p = Net::Interface::full_inet_ntop($add);
            next if ( $exclude && $p =~ /$exclude/sxm );
            my $p_compressed = Net::Interface::ipV6compress($p);
            next if ( $exclude && $p =~ /$exclude/sxm );
            next
              if ( defined $allowed
                && scalar @{$allowed}
                && ( firstidx { $_ eq $p } @{$allowed} ) < 0
                && ( firstidx { $_ eq $p_compressed } @{$allowed} ) < 0 );
            push @{ $by_family->{IPv6} },
              { idx => $if->index(), addr => $p_compressed };
        }

        foreach my $add ( $if->address( Net::Interface::AF_INET() ) ) {
            my $p = Net::Interface::inet_ntoa($add);
            next if ( $exclude && $p =~ /$exclude/sxm );
            next
              if ( defined $allowed
                && scalar @{$allowed}
                && ( firstidx { $_ eq $p } @{$allowed} ) < 0 );
            push @{ $by_family->{IPv4} }, { idx => $if->index(), addr => $p };
        }
    }

    return $by_family;
}

sub is_ip {
    my $value = shift;
    return ( body_parameters->get('server-ip') =~ /^$RE{net}{IPv4}$/xms
          || body_parameters->get('server-ip') =~ /^$RE{net}{IPv6}$/xms );
}

sub save_cli {
    my $cli = shift;

    my $id = Data::GUID->guid_string;
    database->quick_insert( config->{tables}->{cli},
        { id => $id, owner => user->uid, line => $cli } );

    return $id;
}

sub is_radius {
    return shift eq $PROTO_RADIUS ? 1 : undef;
}

sub is_tacacs {
    return shift eq $PROTO_TACACS ? 1 : undef;
}

sub collect_crons {
    my %opts = @_;
    $opts{show_next} //= 0;
    $opts{show_args} //= 0;
    $opts{human}     //= 0;
    $opts{per_user}  //= 1;

    my @crons = cron list => config_at( 'cron.user', $CRON_USER );
    push @crons, jobs_for_repeat( user => $opts{user} );

    my $collected;
    my $total = 0;
    for (@crons) {
        if ( $_->{command} =~ /$SCHEDULER_BIN/sxm ) {
            $total++;
            my $args = parse_tokens( shellwords( $_->{command} ) );

            if ( $opts{show_next} ) {
                my $dtset = DateTime::Event::Cron->from_cron(
                    cron  => $_->{line},
                    after => DateTime->now( time_zone => 'local' )
                );
                my $dt = $dtset->next;
                $_->{next} = "$dt";
            }
            if ( $opts{show_args} ) {
                $_->{args} = $args;
            }
            if ( $opts{human} ) {
                $_->{human} = ParseCron->parse_cron(
                    join q{ },          $_->{minute}, $_->{hour},
                    $_->{day_of_month}, $_->{month},  $_->{day_of_week}
                );
            }

            if ( $opts{per_user} ) {
                $collected //= {};
                $collected->{ $args->{owner} } //= [];
                push @{ $collected->{ $args->{owner} } }, $_;
            }
            else {
                $collected //= [];
                push @{$collected}, $_;
            }
        }
        elsif ( exists $_->{repeat} ) {
            $total++;
            if ( $opts{show_next} ) {
                $_->{next} =
                    $_->{repeat}->{wait} . q{ }
                  . $_->{repeat}->{units}
                  . ' after previous iteration finished';
            }
            if ( $opts{show_args} ) {
                $_->{args} = { %{ $_->{repeat} }, ( jid => $_->{id} ) };
            }
            if ( $opts{human} ) {
                $_->{human} =
                  'More ' . $_->{repeat}->{times} . ' time(s) to go';
            }

            if ( $opts{per_user} ) {
                $collected //= {};
                $collected->{ $_->{owner} } //= [];
                push @{ $collected->{ $_->{owner} } }, $_;
            }
            else {
                $collected //= [];
                push @{$collected}, $_;
            }
        }
    }

    if ( $opts{user} && $opts{per_user} ) {
        return $collected->{ $opts{user} } // [];
    }
    else {
        return {
            $opts{per_user}
            ? ( peruser => $collected // {} )
            : ( all => $collected // [] ),
            total => $total
        };
    }
}

sub jobs_for_repeat {
    my %opts = @_;
    $opts{user} //= undef;

    my $sql =
        q/SELECT /
      . q/"id", "name", "owner", "attributes"#>>'{scheduler,repeat}' repeat, "id" "line", 'repeat' "command"/
      . q/ FROM /
      . database->quote_identifier( table('jobs') )
      . q/ WHERE/
      . (
        $opts{user}
        ? q/ "owner" IN (/ . user->join_owners( $opts{user} ) . q/) AND/
        : q{}
      ) . q/ "attributes"#>'{scheduler,repeat,times}' IS NOT NULL/;

    logging->debug( 'Loading jobs with repeater: ' . $sql );

    my $js = JSON::MaybeXS->new( utf8 => 1 );
    my @r  = @{ database->selectall_arrayref( $sql, { Slice => {} } ) };
    for (@r) {
        $_->{repeat} = $js->decode( $_->{repeat} );
    }

    logging->debug( 'Got repeats: ' . to_dumper( \@r ) );
    return @r;
}

sub parse_tokens {
    my @tokens = @_;

    my %data;
    my @keys;
    my $key = '_unknown';
    foreach my $token (@tokens) {
        if ( $token =~ s/^[-]{1,2}//sxm ) {
            $key = $token;
            push @keys, $key;
            next;
        }

        if ( is_ref( $data{$key} ) ) {
            push @{ $data{$key} }, $token;
        }
        elsif ( defined $data{$key} ) {
            $data{$key} = [ $data{$key}, $token ];
        }
        else {
            $data{$key} = $token;
        }
    }

    foreach my $key (@keys) {
        next if defined $data{$key};
        $data{$key} = 1;
    }

    return \%data;
}

sub remove_cron {
    my %opts = @_;

    my @crons = cron list => config_at( 'cron.user', $CRON_USER );

    if ( scalar @crons ) {
        if ( $opts{line} ) {
            my $idx = firstidx { $_->{line} eq $opts{line} } @crons;
            if ( $idx >= 0 ) {
                cron delete => config_at( 'cron.user', $CRON_USER ), $idx;
                return 1;
            }
        }
    }

    return;
}

1;
