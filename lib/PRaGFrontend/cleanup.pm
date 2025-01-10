package PRaGFrontend::cleanup;

use feature ':5.18';

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::DB;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use PRaGFrontend::Plugins::Config;
use plackGen qw/stop_process collect_procs is_radius :const :cron/;

use Cwd 'abs_path';
use Data::Types qw/:is/;
use File::Basename;
use FindBin;
use HTTP::Status    qw/:constants/;
use List::MoreUtils qw/firstidx/;
use Readonly;
use Ref::Util qw/is_ref is_plain_arrayref/;
use Rex::Commands::Cron;

use PRaGFrontend::jobs ();
use PRaG::Util::Brew;

Readonly my $CLEANER_NAME => 'sprt_cleaner';

super_only qw/cleanup.access cleanup.kill cleanup.config cleanup.change_cron/;

hook 'plugin.pragfrontend_plugins_menu.menu_collect' => sub {
    return if ( !user_allowed 'cleanup.access' );

    add_menu
      name  => 'tools',
      icon  => 'icon-tools',
      title => 'Tools';

    add_submenu 'tools',
      {
        name  => 'cleanup',
        icon  => 'icon-compliance',
        title => 'Clean Ups',
        link  => '/cleanup/',
      };
};

prefix '/cleanup';
get q{/?} => sub {
    #
    # Main logs page
    #
    user_allowed 'cleanup.access', throw_error => 1;

    if (serve_json) {
        send_as JSON =>
          { messages => query_parameters->get('result') // undef, };
    }
    else {
        send_as
          html => template 'react.tt',
          {
            active    => 'cleanup',
            ui        => 'cleanup',
            title     => 'Clean Ups',
            pageTitle => 'Clean Ups',
          };
    }
};

get '/running/' => sub {
    send_as JSON => collect_procs();
};

get '/kill/:pid/' => sub {
    user_allowed 'cleanup.kill', throw_error => 1;

    stop_process( route_parameters->get('pid') );
    if (serve_json) { send_as JSON => { status => 'ok' }; }
    else            { forward '/cleanup/'; }
};

del '/cron/' => sub {
    user_allowed 'cleanup.change_cron', throw_error => 1;

    my $line    = body_parameters->get('line');
    my $command = body_parameters->get('command');
    my $user    = body_parameters->get('user') // user->uid;

    if ( $command eq 'repeat' ) {
        PRaGFrontend::jobs::remove_job_scheduler($line);
    }
    else {
        remove_cron( line => $line );
    }

    if (serve_json) { send_as JSON => { status => 'ok' }; }
    else            { forward '/cleanup/'; }
};

get '/clean/orphan-flows/' => sub {
    #
    # Remove orphaned flows
    #
    user_allowed 'cleanup.access', throw_error => 1;

    my $orphan_flows = search_orphan_flows();
    my $r =
      database->quick_delete( table('flows'), { session_id => $orphan_flows } );
    logging->info(qq/Removed $r flows records./);
    forward '/cleanup/',
      {
        forwarded => 1,
        result => [ { type => 'success', message => qq/Removed $r records./ } ]
      };
};

get '/clean/older-:days/' => sub {
    #
    # Remove flows older than N days
    #
    user_allowed 'cleanup.access', throw_error => 1;

    my $days  = route_parameters->get('days');
    my $proto = query_parameters->get('proto') // $PROTO_RADIUS;
    if ( not is_int($days) ) {
        send_error q{Amount of days must be an integer.'}, HTTP_BAD_REQUEST;
        return;
    }

    my $sessions = sessions_older_than( $days, all_ids => 1, proto => $proto );
    @{$sessions} = map { $_->{id} } @{$sessions};

    while ( scalar @{$sessions} > 0 ) {
        my @tmp = splice @{$sessions}, 0, $MAX_SESSIONS_IN_CLEAN;

        logging->info(
            q/Removing first / . scalar @tmp . qq/ sessions of ${proto}./ );
        my $flows_removed = database->quick_delete( table('flows'),
            { session_id => \@tmp, proto => $proto } );

        my $sessions_removed =
          database->quick_delete( sessions_table($proto), { id => \@tmp } );
        logging->info( qq/Removed $sessions_removed sessions /
              . qq/and $flows_removed flows records./ );
    }

    forward '/cleanup/',
      {
        forwarded => 1,
        result => [ { type => 'success', message => q/Removed old sessions./ } ]
      };
};

get '/clean/orphan-cli/' => sub {
    #
    # Remove orphaned CLIs
    #
    user_allowed 'cleanup.access', throw_error => 1;

    my $orphan_cli = search_orphan_cli();
    my $r =
      database->quick_delete( table('cli'), { id => $orphan_cli } );
    logging->info(qq/Removed $r CLIs./);
    forward '/cleanup/',
      {
        forwarded => 1,
        result    => [ { type => 'success', message => qq/Removed $r CLIs./ } ]
      };
};

Readonly my $HEALTH_DISPATCHER => {
    sessions => {
        lookup => sub {
            my $test = sub {
                return (
                    sessions_older_than(
                        $_[0],
                        proto  => $PROTO_RADIUS,
                        lookup => 1
                      )
                      or sessions_older_than(
                        $_[0],
                        proto  => $PROTO_TACACS,
                        lookup => 1
                      )
                );
            };

            if ( $test->(30) ) {
                return { level => 'danger', type => 'icon' };
            }
            if ( $test->(10) ) {
                return { level => 'warning', type => 'icon' };
            }
            if ( $test->(5) ) {
                return { level => 'info', type => 'icon' };
            }
            return { level => 'success' };
        },
        full => sub {
            my $days = query_parameters->get('days');
            if ($days) {
                return {
                    radius => sessions_older_than(
                        $days, proto => $PROTO_RADIUS,
                    ),
                    tacacs => sessions_older_than(
                        $days, proto => $PROTO_TACACS,
                    )
                };
            }
            return {
                radius => outdated_sessions($PROTO_RADIUS),
                tacacs => outdated_sessions($PROTO_TACACS)
            };
        }
    },
    flows => {
        lookup => sub {
            my $r = search_orphan_flows();
            return ( $r and scalar @{$r} )
              ? { level => 'warning', type => 'icon' }
              : { level => 'success' };
        },
        full => \&search_orphan_flows
    },
    clis => {
        lookup => sub {
            my $r = search_orphan_cli();
            return ( $r and scalar @{$r} )
              ? { level => 'warning', type => 'icon' }
              : { level => 'success' };
        },
        full => \&search_orphan_cli
    },
    procs => {
        lookup => sub {
            my $r = collect_procs();
            return ( $r and $r->{total} )
              ? { level => 'warning', type => 'text', value => $r->{total} }
              : { level => 'success' };
        },
        full => sub {
            my $r = collect_procs();
            return $r;
        }
    },
    schedules => {
        lookup => sub {
            my $r = collect_crons();
            return ( $r and $r->{total} )
              ? { level => 'info', type => 'text', value => $r->{total} }
              : { level => 'success' };
        },
        full => sub {
            my $r = collect_crons( show_next => 1 );
            return $r;
        }
    },
    settings => {
        lookup => sub {
            send_error q{No health lookup for setting}, HTTP_BAD_REQUEST;
            return;
        },
        full => \&load_cleanup_settings,
        put  => \&save_cleanup_settings
    }
};

get '/health/:what/' => sub {
    user_allowed 'cleanup.access', throw_error => 1;

    my $what = route_parameters->get('what');
    my $full = query_parameters->get('full') // 0;

    if ( not exists $HEALTH_DISPATCHER->{$what} ) {
        send_error q{Unknown value } . $what, HTTP_INTERNAL_SERVER_ERROR;
        return;
    }

    send_as JSON => {
        result => $full
        ? $HEALTH_DISPATCHER->{$what}->{full}->()
        : $HEALTH_DISPATCHER->{$what}->{lookup}->()
    };
};

put '/health/:what/' => sub {
    user_allowed 'cleanup.config', throw_error => 1;

    my $what = route_parameters->get('what');

    if (   not exists $HEALTH_DISPATCHER->{$what}
        or not exists $HEALTH_DISPATCHER->{$what}->{put} )
    {
        send_error q{Unknown value } . $what, HTTP_INTERNAL_SERVER_ERROR;
        return;
    }

    send_as JSON => { result => $HEALTH_DISPATCHER->{$what}->{put}->() };
};

get '/**?' => sub {
    forward '/cleanup/';
};

sub search_orphan_flows {
    #
    # Search for flows which session IDs do not exist
    #
    my $radius = flows_by_proto($PROTO_RADIUS);
    my $tacacs = flows_by_proto($PROTO_TACACS);

    return $radius ? ( [ @{$radius}, @{ $tacacs // [] } ] ) : $tacacs;
}

sub flows_by_proto {
    my $proto = shift;

    my $sql =
        q/SELECT DISTINCT "session_id" FROM /
      . table('flows')
      . q/ WHERE "proto" = /
      . database->quote($proto);
    logging->debug("Executing $sql");
    my $flows = [];
    my $rv    = database->selectall_arrayref( $sql, { Slice => [0] } );

    if ( defined $rv && is_plain_arrayref($rv) && scalar @{$rv} ) {
        $flows = [ map { $_->[0]; } @{$rv} ];

        # logging->debug( 'Found sessions: ' . join q{,}, @{$flows} );
    }
    elsif ( !defined $rv ) {
        logging->error( 'SQL exception: ' . database->errstr );
        send_error( 'SQL exception: ' . database->errstr,
            HTTP_INTERNAL_SERVER_ERROR );
    }

    return if ( !scalar @{$flows} );

    $sql = q/SELECT DISTINCT "id" FROM /
      . database->quote_identifier( sessions_table($proto) );
    logging->debug("Executing $sql");
    my $sessions = [];
    $rv = database->selectall_arrayref( $sql, { Slice => [0] } );

    if ( defined $rv && is_plain_arrayref($rv) && scalar @{$rv} ) {
        $sessions = [ map { $_->[0]; } @{$rv} ];

        # logging->debug( 'Found sessions: ' . join q{,}, @{$sessions} );
    }
    elsif ( !defined $rv ) {
        logging->error( 'SQL exception: ' . database->errstr );
        send_error( 'SQL exception: ' . database->errstr,
            HTTP_INTERNAL_SERVER_ERROR );
    }

    my %lookup;
    my $result = [];

    @lookup{ @{$sessions} } = ();
    foreach my $elem ( @{$flows} ) {
        if ( not exists $lookup{$elem} ) { push @{$result}, $elem; }
    }

    return $result;
}

sub outdated_sessions {
    #
    # Search all outdated sessions
    #
    my $proto = shift // $PROTO_RADIUS;

    return {
        older_than_five => sessions_older_than( 5,  proto => $proto ),
        older_than_ten  => sessions_older_than( 10, proto => $proto ),
        older_than_30   => sessions_older_than( 30, proto => $proto )
    };
}

sub sessions_older_than {
    my ( $days, %h ) = @_;
    $h{proto}   //= $PROTO_RADIUS;
    $h{lookup}  //= 0;
    $h{all_ids} //= 0;

    my $secs = time - ( $days * $SECS_IN_DAY );
    my ( $sql, $time_compare );
    my $table = sessions_table( $h{proto} );
    $time_compare =
      is_radius( $h{proto} )
      ? qq/"changed" < $secs/
      : qq/EXTRACT(EPOCH FROM "changed") < $secs/;

    if ( $h{lookup} || $h{all_ids} ) {
        $sql =
            q/select "id" from /
          . database->quote_identifier($table)
          . qq/ where $time_compare/;
        if ( $h{lookup} ) { $sql .= ' limit 1'; }
    }
    else {
        $sql =
            q/select "owner", count(id) as "count" from /
          . database->quote_identifier($table)
          . qq/ where $time_compare group by "owner" order by "count" desc/;
    }

    debug "Executing $sql";
    my $result = database->selectall_arrayref( $sql, { Slice => {} } );
    if ( !defined $result ) {
        logging->error( 'SQL exception: ' . database->errstr );
        send_error( 'SQL exception: ' . database->errstr,
            HTTP_INTERNAL_SERVER_ERROR );
    }

    return $h{lookup} ? scalar @{$result} : $result;
}

sub search_orphan_cli {
    #
    # Search for orphan clis
    #
    my $sql = q/SELECT DISTINCT "id" FROM / . table('cli');
    logging->debug("Executing $sql");
    my $cli_ids = [];
    my $rv      = database->selectall_arrayref( $sql, { Slice => [0] } );

    if ( defined $rv && is_plain_arrayref($rv) && scalar @{$rv} ) {
        $cli_ids = [ map { $_->[0]; } @{$rv} ];

        # logging->debug( 'Found sessions: ' . join q{,}, @{$cli_ids} );
    }
    elsif ( !defined $rv ) {
        logging->error( 'SQL exception: ' . database->errstr );
        send_error( 'SQL exception: ' . database->errstr,
            HTTP_INTERNAL_SERVER_ERROR );
    }

    return if ( !scalar @{$cli_ids} );

    $sql =
        q/SELECT DISTINCT "cli" FROM /
      . table('jobs')
      . q/ where "cli" IS NOT NULL/;
    logging->debug("Executing $sql");
    my $jobs = [];
    $rv = database->selectall_arrayref( $sql, { Slice => [0] } );

    if ( defined $rv && is_plain_arrayref($rv) && scalar @{$rv} ) {
        @{$jobs} = map { $_->[0]; } @{$rv};

        # logging->debug( 'Found sessions: ' . join q{,}, @{$jobs} );
    }
    elsif ( !defined $rv ) {
        logging->error( 'SQL exception: ' . database->errstr );
        send_error( 'SQL exception: ' . database->errstr,
            HTTP_INTERNAL_SERVER_ERROR );
    }

    my %lookup;
    my $result = [];

    @lookup{ @{$jobs} } = ();
    foreach my $elem ( @{$cli_ids} ) {
        if ( !exists $lookup{$elem} ) { push @{$result}, $elem; }
    }

    return $result;
}

sub load_cleanup_settings {
    my @crons = cron list => 'root';
    return [ grep { $_->{command} =~ /${CLEANER_NAME}/sxm } @crons ];
}

sub save_cleanup_settings {
    my $enabled = body_parameters->get('enabled');
    my $days    = body_parameters->get('days');
    my $hour    = body_parameters->get('hour');

    my ( undef, $DIR, undef ) = fileparse(__FILE__);
    my $PARENT = abs_path( $DIR . '../../bin/' ) . q{/};

    if ($enabled) {
        cron_entry 'cleaner',
          ensure  => 'present',
          command => brewcron_with() . qq{${PARENT}${CLEANER_NAME} -d ${days}},
          hour    => $hour =~ s/:00$//rsxm,
          minute  => q/0/,
          user    => 'root',
          on_change => sub { logging->debug('Cron added') };
    }
    else {
        my @crons = cron list => 'root';
        if ( scalar @crons ) {
            my $idx = firstidx { $_->{command} =~ /${CLEANER_NAME}/sxm } @crons;
            if ( $idx >= 0 ) {
                cron delete => 'root', $idx;
            }
        }
    }

    return 'done';
}

prefix q{/};

1;
