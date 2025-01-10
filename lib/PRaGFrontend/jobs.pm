package PRaGFrontend::jobs;

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use PRaGFrontend::Plugins::DB;
use plackGen qw/start_process stop_process :cron parse_tokens/;

use utf8;

use DateTime;
use English      qw/-no_match_vars/;
use HTTP::Status qw/:constants/;
use IO::File;
use JSON::MaybeXS ();
use Path::Tiny;
use POSIX qw/strftime ceil/;
use Readonly;
use Ref::Util qw/is_plain_arrayref is_plain_hashref is_ref/;
use PerlX::Maybe;
use String::ShellQuote qw/shell_quote/;
use List::Compare;
use Text::ParseWords qw/shellwords/;

use PRaG::Util::Procs   qw/filtered_processes/;
use PRaG::Util::Folders qw/remove_folder_if_empty/;

Readonly my $CHART_STEPS => 100;
Readonly my $PREFIX      => '/jobs';
Readonly my $MS_IN_SEC   => 1_000;
Readonly my $API_POSTFIX => '__api';

super_only qw/jobs.switch_user/;

hook 'plugin.pragfrontend_plugins_menu.menu_collect' => sub {
    add_menu
      name  => 'jobs',
      icon  => 'icon-applications',
      title => 'Jobs',
      link  => $PREFIX . q{/},
      badge => { from => $PREFIX . '/?run_count=1' };
};

prefix $PREFIX;
get q{/?} => sub {
    #
    # Main jobs page
    #

    if (serve_json) {
        forward $PREFIX . q{/user/} . user->uid . q{/},;
    }
    else {
        send_as
          html => template 'react.tt',
          {
            active    => 'jobs',
            ui        => 'jobs',
            title     => 'Jobs',
            pageTitle => 'Jobs',
          };
    }
};

get '/**?' => sub {
    if ( !serve_json ) {
        forward $PREFIX . q{/};
        return;
    }
    pass;
};

get '/all-users/' => sub {
    return if not user_allowed 'jobs.switch_user', throw_error => 1;

    my $query =
        q/select distinct "owner" from /
      . database->quote_identifier( table('jobs') )
      . q/ order by "owner" asc/;

    my $sth = database->prepare($query);

    if ( !defined $sth->execute() ) {
        send_error( 'SQL exception: ' . $sth->errstr,
            HTTP_INTERNAL_SERVER_ERROR );
    }

    my $owners = $sth->fetchall_arrayref( [0] );
    if ( scalar @{$owners} ) {
        $owners = [ map { $_->[0] } @{$owners} ];
    }
    send_as JSON => { owners => $owners };
};

post q{/update/} => sub {
    my $user = body_parameters->get('user') // user->uid;
    if ( $user ne user->uid ) {
        return if not user_allowed 'jobs.switch_user', throw_error => 1;
    }

    my @gui_have     = body_parameters->get_all('known_jobs');
    my @update_jobs  = body_parameters->get_all('update_jobs');
    my $backend_have = user_job_ids($user);

    my $lc = List::Compare->new(
        {
            lists    => [ \@gui_have, $backend_have ],
            unsorted => 1,
        }
    );
    my $gui_only     = $lc->get_Lonly_ref;
    my $backend_only = $lc->get_Ronly_ref;
    my ( $for_update, $running );

    if ( scalar @update_jobs ) {
        ( $for_update, $running ) =
          load_jobs( \@update_jobs, undef, { user => $user } );
    }

    send_as JSON => {
        removed => $gui_only     // [],
        missing => $backend_only // [],
        updated => $for_update   // [],
        running => $running      // []
    };
};

get q{/user/:user/} => sub {
    my $requested_user = route_parameters->get('user');

    if ( $requested_user ne user->uid ) {
        return if not user_allowed 'jobs.switch_user', throw_error => 1;
    }

    my ( $jobs, $running ) =
      load_jobs( undef, undef, { user => $requested_user } );

    if ( query_parameters->get('run_count') ) {
        send_as JSON => { value => scalar @{$running}, };
        return;
    }

    send_as JSON => {
        jobs       => $jobs,
        running    => $running,
        can_switch => user_allowed('jobs.switch_user'),
        crons      => collect_crons(
            user      => $requested_user,
            show_args => 1,
            show_next => 1,
            human     => 1
        ),
        user => $requested_user,
    };
};

post '/get-jobs/' => sub {
    #
    # Get info about some jobs
    #
    my ( $jobs, $running ) =
      load_jobs( [ body_parameters->get_all('jobs') ] );
    if ( !$jobs || !scalar @{$jobs} ) {
        send_as JSON => {
            status   => 'none',
            messages => { type => 'info', message => 'No jobs found.' }
        };
    }
    else {
        send_as JSON => { status => 'ok', jobs => $jobs, running => $running };
    }
};

get '/id/all/' => sub {
    #
    # Return list of IDs of user's jobs
    #
    my $user = query_parameters->get('user') || user->uid;
    if ( $user ne user->uid ) {
        user_allowed 'jobs.switch_user', throw_error => 1;
    }

    send_as JSON => { jobs => user_job_ids($user) };
};

del '/cron/' => sub {
    my $line    = body_parameters->get('line');
    my $command = body_parameters->get('command');
    my $user    = body_parameters->get('user') // user->uid;

    if ( $user and $user ne user->uid ) {
        user_allowed 'jobs.switch_user', throw_error => 1;
    }

    if ( $command eq 'repeat' ) {
        my $j = load_jobs( [$line], undef, { user => $user } );
        if ( not scalar @{$j} ) {
            send_error( 'Job not found.', HTTP_BAD_REQUEST );
            return;
        }

        remove_job_scheduler($line);
    }
    else {

        my $args = parse_tokens( shellwords($command) );
        if ( not $args or not $args->{owner} ) {
            send_error( 'Incorrect usage.', HTTP_BAD_REQUEST );
            return;
        }

        if (   $args->{owner} ne user->uid
            && $args->{owner} ne user->uid . $API_POSTFIX )
        {
            user_allowed 'jobs.switch_user', throw_error => 1;
        }

        remove_cron line => $line;
    }

    send_as JSON => { status => 'ok' };
};

any [ 'put', 'del', 'get' ] => '/id/:job-id/**?' => sub {
    #
    # General catcher and preload
    #
    my $user = query_parameters->get('user') || user->uid;
    if ( $user ne user->uid ) {
        user_allowed 'jobs.switch_user', throw_error => 1;
    }

    my $what_allowed = {
        'all'      => 1,
        'running'  => 1,
        'finished' => 1,
        'list'     => 1,
    };
    my $what = route_parameters->get('job-id');

    if ( exists $what_allowed->{$what} ) {
        var job => $what;
        if ( request->is_delete ) { pass; return; }
        send_error( 'Incorrect usage.', HTTP_BAD_REQUEST );
    }

    my $j =
      load_jobs( [ route_parameters->get('job-id') ], 1, { user => $user } );
    if ( not scalar @{$j} ) {
        send_error( 'Job not found.', HTTP_NOT_FOUND );
    }

    var job => $j->[0];
    pass;
};

prefix '/jobs/id/:job-id';
del q{/} => sub {
    #
    # Remove saved jobs and CLIs
    #
    if ( not is_plain_hashref( vars->{job} ) and vars->{job} eq 'list' ) {
        logging->debug( 'Removing ' . vars->{job} . ' jobs' );
        var jobs_ids =>
          [ grep { user_can_change_job($_) } body_parameters->get_all('jobs') ];
        logging->debug( 'Jobs: ' . join q{, }, @{ var 'jobs_ids' } );
        if ( not scalar @{ var 'jobs_ids' } ) {
            return send_error( 'No job IDs.', HTTP_BAD_REQUEST );
        }
    }

    remove_jobs( vars->{job} );
    send_as JSON => { status => 'ok' };
};

put q{/} => sub {
    #
    # Repeat saved job
    #
    if ( !vars->{job}->{line} ) {
        send_as JSON => {
            status   => 'none',
            messages => [
                {
                    type    => 'info',
                    message => 'Command line not found for the job.'
                }
            ]
        };
    }

    my $encoded_json = vars->{job}->{line};

    # Clear $encoded_json - remove scheduler data
    my $json    = JSON::MaybeXS->new( utf8 => 1 );
    my $decoded = $json->decode($encoded_json);
    if ( exists $decoded->{parameters} and $decoded->{parameters}->{scheduler} )
    {
        delete $decoded->{parameters}->{scheduler};
    }
    $encoded_json = $json->encode($decoded);
    undef $decoded;
    undef $json;

    start_process(
        $encoded_json,
        {
            proc    => vars->{job}->{name} . ' - Repeated',
            verbose => vars->{debug} ? 1 : 0,
        }
    );

    send_as
      JSON => { status => 'ok', messages => vars->{messages} },
      { content_type => 'application/json; charset=UTF-8' };
};

put '/stop/' => sub {
    #
    # Stop the process if it's running
    #
    if ( !vars->{job}->{'running'} ) {
        send_as JSON => {
            status   => 'none',
            messages => [ { type => 'info', message => 'Job is not running.' } ]
        };
    }

    stop_process( vars->{job}->{'pid'} );
    send_as JSON => { status => 'ok' };
};

get '/charts/' => sub {
    if (   !defined vars->{job}->{attributes_decoded}->{stats}
        || !-e vars->{job}->{attributes_decoded}->{stats} )
    {
        send_error( 'Stats file not found', HTTP_NOT_FOUND );
    }

    my $jatt = vars->{job}->{attributes_decoded};
    my $done = 0;
    if ( vars->{job}->{running} ) {
        $done = int( $jatt->{count} * ( vars->{job}->{percentage} / 100 ) );
    }
    else {
        $done = $jatt->{count};
    }
    my $lines_per_step =
      $done > $CHART_STEPS ? ceil( $done / $CHART_STEPS ) : 1;

    my $fh = IO::File->new( $jatt->{stats}, '<:utf8_strict' );
    if ( !defined $fh ) {
        logging->error( q{Couldn't open file to read: } . $OS_ERROR );
        send_error( q{Couldn't open file to read.},
            HTTP_INTERNAL_SERVER_ERROR );
    }

    my $read      = 0;
    my @step_data = ();
    my $stats     = {};
    while (<$fh>) {
        chomp;
        push @step_data, $_;
        $read++;
        if ( $read >= $lines_per_step ) {
            $read = 0;
            parse_step_data( \@step_data, $stats, $lines_per_step > 1 ? 1 : 0 );
            @step_data = ();
        }
    }
    $fh->close;

    send_as JSON => { stats => $stats };
};

prefix q{/};

sub load_jobs {
    #
    # Load jobs or job by ID, load CLI if load_cli is set
    #
    my ( $id, $load_cli, $sort ) = @_;
    $load_cli //= 0;
    $sort     //= {};

    my $cli_tbl  = table('cli');
    my $jobs_tbl = table('jobs');

    my $uid  = $sort->{user} // user->uid;
    my @bind = user_pack($uid);
    my $sql  = qq/SELECT * FROM $jobs_tbl WHERE "owner" IN (?,?)/;
    if ($id) {
        my ( $idexpr, @idbind );
        if ( is_plain_arrayref($id) ) {
            $idexpr = 'IN (' . join( q{,}, (q{?}) x scalar @{$id} ) . q{)};
            push @idbind, @{$id};
        }
        elsif ( is_ref($id) ) {
            send_error( 'Unacceptable attribute passed.', HTTP_BAD_REQUEST );
        }
        else {
            $idexpr = '= ?';
            push @idbind, $id;
        }

        if ($load_cli) {
            $sql =
                qq/select $jobs_tbl.*, $cli_tbl.line /
              . qq/from $jobs_tbl /
              . qq/left join $cli_tbl on $jobs_tbl.cli = $cli_tbl.id and $cli_tbl.owner = $jobs_tbl.owner /
              . qq/where $jobs_tbl.id $idexpr and $jobs_tbl.owner IN (?,?)/;
            @bind = ( @idbind, user_pack($uid) );
        }
        else {
            $sql .= qq/ AND "id" $idexpr/;
            push @bind, @idbind;
        }
    }

    if ( exists $sort->{'running'} ) {
        $sql .= qq/ AND $jobs_tbl."pid" > 0 AND $jobs_tbl."percentage" < 100/;
    }
    if ( exists $sort->{'finished'} ) {
        $sql .= qq/ AND $jobs_tbl."percentage" = 100/;
    }
    if ( exists $sort->{'repeatable'} ) {
        $sql .=
            qq/ AND $jobs_tbl."cli" IS /
          . ( $sort->{'repeatable'} ? 'NOT' : q{} )
          . q/ NULL/;
    }

    $sql .= " ORDER BY $jobs_tbl.attributes->>'created' DESC";

    # logging->debug( "Executing $sql with params " . join q{,}, @bind );
    my $sth = database->prepare($sql);

    debug "Executing $sql with params " . join q{,}, @bind;

    if ( !defined $sth->execute(@bind) ) {
        send_error( 'SQL exception: ' . $sth->errstr,
            HTTP_INTERNAL_SERVER_ERROR );
    }

    my $jobs = $sth->fetchall_arrayref( {} );
    my $json = JSON::MaybeXS->new( utf8 => 1 );
    my @running;
    for my $i ( 0 .. $#{$jobs} ) {
        $jobs->[$i]->{'running'} =
          ( $jobs->[$i]->{'pid'} && kill( 0, $jobs->[$i]->{'pid'} ) ? 1 : 0 );
        if ( wantarray && $jobs->[$i]->{'running'} ) { push @running, $i; }
        $jobs->[$i]->{'attributes_decoded'} =
          $json->decode( $jobs->[$i]->{'attributes'} // '{}' );

        my $dt = DateTime->from_epoch(
            epoch     => $jobs->[$i]->{'attributes_decoded'}->{'created'},
            time_zone => strftime( '%z', localtime )
        );
        $jobs->[$i]->{'attributes_decoded'}->{'created_f'} =
          $dt->strftime('%H:%M:%S %d/%m/%Y');
        if ( exists $jobs->[$i]->{'attributes_decoded'}->{finished} ) {
            $jobs->[$i]->{'attributes_decoded'}->{finished_f} =
              DateTime->from_epoch(
                epoch     => $jobs->[$i]->{'attributes_decoded'}->{finished},
                time_zone => strftime( '%z', localtime )
            )->strftime('%H:%M:%S %d/%m/%Y');
        }

        $jobs->[$i]->{attributes_decoded}->{stats} =
          -e $jobs->[$i]->{attributes_decoded}->{stats}
          ? $jobs->[$i]->{attributes_decoded}->{stats}
          : 0;

        delete $jobs->[$i]->{attributes};
    }
    undef $json;
    return ( $jobs, \@running ) if wantarray;
    return $jobs;
}

sub remove_jobs {
    my $what = shift;

    my $hndl = {
        'all' => sub {
            return load_jobs();
        },
        'running' => sub {
            return load_jobs( undef, undef, { 'running' => 1 } );
        },
        'finished' => sub {
            return load_jobs( undef, undef, { 'finished' => 1 } );
        },
        'list' => sub {
            return [] if not scalar @{ var 'jobs_ids' };
            return load_jobs(
                vars->{jobs_ids},
                undef,
                {
                    user => database->quick_lookup(
                        table('jobs'), { id => vars->{jobs_ids}->[0] },
                        'owner'
                    )
                }
            );
        }
    };

    my $jobs =
        is_plain_hashref( var 'job' ) ? [ var 'job' ]
      : exists $hndl->{$what}         ? $hndl->{$what}->()
      :                                 [];

    if ( !scalar @{$jobs} ) {
        send_as JSON => {
            status   => 'none',
            messages => [ { type => 'info', message => 'Jobs not found.' } ]
        };
    }

    my $crons = collect_crons( per_user => 0, show_args => 1 )->{all};

    my @clis;
    foreach my $j ( @{$jobs} ) {
        if ( $j->{running} ) { stop_process( $j->{'pid'} ); }
        if ( $j->{cli} )     { push @clis, $j->{cli}; }
        if ( defined $j->{attributes_decoded}->{stats}
            && -f $j->{attributes_decoded}->{stats} )
        {
            unlink $j->{attributes_decoded}->{stats};
            remove_folder_if_empty( $j->{attributes_decoded}->{stats} );
        }
        if ( $j->{'sessions'} ) {    # unblock sessions
            my $chunk_attribute = JSON::MaybeXS->new( utf8 => 1 )->encode(
                {
                    'job-chunk' => $j->{'sessions'}
                }
            );
            my $uid = $j->{owner} // user->uid;
            my $sql =
                q/UPDATE /
              . table('sessions')
              . qq/ SET "attributes" = "attributes" - 'job-chunk'/
              . qq/ WHERE "owner" IN (\$1,\$2) AND "attributes" @> '$chunk_attribute'/;
            my @bind = ( $uid, $uid . $API_POSTFIX );
            logging->debug( "Executing $sql with params " . join q{,}, @bind );
            debug "Executing $sql with params " . join q{,}, @bind;

            if (
                !defined database->do( $sql, { pg_placeholder_dollaronly => 1 },
                    @bind ) )
            {
                send_error( 'SQL exception: ' . database->errstr,
                    HTTP_INTERNAL_SERVER_ERROR );
            }
        }
        for my $c ( @{$crons} ) {
            if ( lc $c->{args}->{jid} eq lc $j->{id} ) {
                remove_cron line => $c->{line};
            }
        }
    }

    if ( scalar @clis ) {
        database->quick_delete( table('cli'), { id => \@clis } );
    }
    database->quick_delete(
        table('jobs'),
        {

            id => [ map { $_->{id} } @{$jobs} ]
        }
    );
    return 1;
}

sub parse_step_data {
    my ( $data, $where, $avg ) = @_;

    $where->{delays}      //= { ids    => [], values  => [] };
    $where->{retransmits} //= { ids    => [], values  => [] };
    $where->{lengths}     //= { ids    => [], values  => [] };
    $where->{averages}    //= { delays => [], lengths => [] };
    $where->{times}       //= { ids    => [], values  => [] };

    my ( $max_delay,             $mdi )          = ( 0, 0 );
    my ( $max_rets,              $mri )          = ( 0, 0 );
    my ( $max_length,            $mli )          = ( 0, 0 );
    my ( $total_length,          $total_delays ) = ( 0, 0 );
    my ( $max_delay_session_end, $sei )          = ( 0, 0 );

    foreach ( @{$data} ) {
        my ( $id, $delay, $retransmits, $flow_time, $sess_end ) = split /,/sxm;
        if ( $delay > $max_delay ) { $max_delay = $delay; $mdi = $id; }
        if ( $retransmits > $max_rets ) {
            $max_rets = $retransmits;
            $mri      = $id;
        }
        if ( $flow_time > $max_length ) {
            $max_length            = $flow_time;
            $mli                   = $id;
            $max_delay_session_end = $sess_end;
            $sei                   = $id;
        }
        if ($avg) {
            $total_length += $flow_time;
            $total_delays += $delay;
        }
    }

    push @{ $where->{delays}->{ids} }, $mdi;
    push @{ $where->{delays}->{values} }, ( $max_delay * $MS_IN_SEC );

    push @{ $where->{retransmits}->{ids} },    $mri;
    push @{ $where->{retransmits}->{values} }, $max_rets;

    push @{ $where->{lengths}->{ids} }, $mli;
    push @{ $where->{lengths}->{values} }, ( $max_length * $MS_IN_SEC );

    push @{ $where->{times}->{ids} },    $sei;
    push @{ $where->{times}->{values} }, $max_delay_session_end;

    if ($avg) {
        my $cnt = scalar @{$data};
        push @{ $where->{averages}->{lengths} },
          $total_length * $MS_IN_SEC / $cnt;
        push @{ $where->{averages}->{delays} },
          $total_delays * $MS_IN_SEC / $cnt;
    }

    $where->{delays}->{new_style}      = [];
    $where->{retransmits}->{new_style} = [];
    $where->{lengths}->{new_style}     = [];
    $where->{times}->{new_style}       = [];

    for my $i ( 0 .. $#{ $where->{delays}->{ids} } ) {
        push @{ $where->{delays}->{new_style} },
          {
            step      => $i,
            id        => $where->{delays}->{ids}->[$i],
            value     => $where->{delays}->{values}->[$i],
            name      => $where->{times}->{values}->[$i] // q{},
            maybe avg => $where->{averages}->{delays}->[$i],
          };

        push @{ $where->{lengths}->{new_style} },
          {
            step      => $i,
            id        => $where->{lengths}->{ids}->[$i],
            value     => $where->{lengths}->{values}->[$i],
            name      => $where->{times}->{values}->[$i] // q{},
            maybe avg => $where->{averages}->{lengths}->[$i],
          };

        push @{ $where->{retransmits}->{new_style} },
          {
            step  => $i,
            id    => $where->{retransmits}->{ids}->[$i],
            value => $where->{retransmits}->{values}->[$i],
            name  => $where->{times}->{values}->[$i] // q{},
          };
    }

    # $where->{averages}              = undef;
    # $where->{delays}->{ids}         = undef;
    # $where->{delays}->{values}      = undef;
    # $where->{lengths}->{ids}        = undef;
    # $where->{lengths}->{values}     = undef;
    # $where->{retransmits}->{ids}    = undef;
    # $where->{retransmits}->{values} = undef;
    # $where->{times}->{ids}          = undef;
    # $where->{times}->{values}       = undef;
    return 1;
}

sub user_can_change_job {
    my $jid = shift;

    my $exists =
      database->quick_lookup( table('jobs'),
        { id => $jid, owner => [ user->uid, user->uid . $API_POSTFIX ] },
        'owner' )
      ? 1
      : 0;

    return $exists || user_allowed 'jobs.switch_user';
}

sub user_job_ids {
    my $user = shift // user->uid;

    my $j = [
        database->quick_select(
            config->{tables}->{jobs},
            { owner   => [ $user, $user . $API_POSTFIX ] },
            { columns => [qw(id)] }
        )
    ];
    if ( scalar @{$j} ) {
        $j = [ map { $_->{id}; } @{$j} ];
    }
    else {
        $j = [];
    }

    return $j;
}

sub remove_job_scheduler {
    my ($jid) = @_;

    my $sql =
        q/UPDATE /
      . database->quote_identifier( table('jobs') ) . q/ /
      . q/SET "attributes" = "attributes" #- '{scheduler}' /
      . q/WHERE "id" = /
      . database->quote($jid)
      . q/ AND /
      . q/"attributes"#>'{scheduler}' IS NOT NULL/;

    logging->debug( 'Executing: ' . $sql );

    my @procs = filtered_processes {
        $_->cmndline =~ /$jid/isxm and $_->cmndline =~ /--repeat/sxm
    };
    foreach (@procs) {
        logging->debug( 'Killing ' . $_->pid . ': ' . $_->cmndline );
        $_->kill('TERM');
    }

    return database->do($sql);
}

sub user_pack {
    my $user = shift;

    if ( index( $user, $API_POSTFIX ) >= 0 ) {

        # API postfix, return user and user without API_POSTFIX
        return $user, substr( $user, 0, -length($API_POSTFIX) );
    }

    # no API postfix, return user and user + API_POSTFIX
    return $user, $user . $API_POSTFIX;
}

1;
