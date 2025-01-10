package PRaGFrontend::manipulate;

use feature ':5.18';
no warnings 'experimental';

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use PRaGFrontend::Plugins::DB;
use PRaGFrontend::pxgrid qw/make_rest_call/;
use plackGen             qw/load_servers start_process sessions_exist :const/;

use Data::Dumper;
use Data::GUID;
use Data::Types qw/:is/;
use DateTime;
use DateTime::Format::Pg;
use Encode  qw/encode_utf8/;
use English qw/-no_match_vars/;
use Exporter 'import';
use HTTP::Status  qw/:constants/;
use JSON::MaybeXS ();
use POSIX         qw/strftime ceil/;
use Readonly;
use Ref::Util          qw/is_plain_arrayref is_plain_hashref is_ref/;
use Regexp::Common     qw/net/;
use String::ShellQuote qw/shell_quote/;
use Syntax::Keyword::Try;
use PerlX::Maybe;

our @EXPORT_OK = qw/
  load_sessions
  load_sessions_attribute
  get_session_flow
  block_sessions
  delete_sessions
  check_sessions
  prepare_filter
  load_session_pxgrid
  /;

Readonly my %SORTABLE => (
    'mac'     => 1,
    'user'    => 1,
    'sessid'  => 1,
    'ipAddr'  => 1,
    'started' => 1,
    'changed' => 1,
);

hook 'plugin.pragfrontend_plugins_menu.menu_collect' => sub {
    add_menu
      name  => 'manipulate',
      icon  => 'icon-list-view',
      title => 'Sessions';

    add_submenu 'manipulate',
      {
        html => '<a class="flex" style="flex-direction: row;">'
          . '<div class="flex-fluid">Loading...</div>'
          . '<span class="icon-animation spin" aria-hidden="true"></span>'
          . '</a>',
        load => '/manipulate/servers/?no_bulks=1'
      };
};

prefix '/manipulate';
get q{/?} => sub {
    #
    # Main manipulation page
    #
    if ( query_parameters->get('session_id') ) {
        my @s =
          load_sessions( undef, { id => query_parameters->get('session_id') },
            0 );
        if ( !scalar @s ) { send_error( 'Session not found', HTTP_NOT_FOUND ); }
        my $s = $s[0];

        redirect '/manipulate/server/'
          . $s->{server}
          . '/bulk/'
          . $s->{bulk}
          . '/session-flow/'
          . query_parameters->get('session_id') . q{/};
    }

    if (serve_json) {
        body_parameters->set( 'no-content', 1 );
        send_as JSON => {
            state     => 'success',
            sessions  => [],
            forwarded => query_parameters->get('forwarded') // undef,
            messages  => query_parameters->get('result')    // undef,
            paging    => var('paging') || undef,
        };
    }
    else {
        send_as
          html => template 'react.tt',
          {
            active    => 'manipulate',
            ui        => 'radius_sessions',
            title     => 'Sessions',
            pageTitle => 'Manipulate sessions',
          };
    }
};

get '/servers/' => sub {
    var no_bulks => query_parameters->get('no_bulks') // 0;
    if (serve_json) {
        body_parameters->set( 'no-content', 1 );
        send_as JSON => {
            state   => 'success',
            servers => {
                radius => load_servers(),
                tacacs => load_servers( undef, proto => 'tacacs' ),
            }
        };
    }
    else {
        forward '/manipulate/', { forwarded => 0, result => [] };
    }
};

any '/server/radius/**' => sub {
    my ($rest) = splat;
    my $link   = '/manipulate/server/' . join q{/}, @{$rest};
    logging->debug( 'Redirecting to: ' . $link );
    forward $link;
};

get '/server/:server/' => sub {
    var server => route_parameters->get('server');
    if ( not sessions_exist('radius') ) {
        send_error( q{Server } . var('server') . q{ not found},
            HTTP_BAD_REQUEST );
        return;
    }

    if (serve_json) {
        send_as JSON =>
          { server => load_servers( var('server'), proto => 'radius' ) };
    }
    else {
        forward '/manipulate/', { forwarded => 0, result => [] };
    }
};

any [ 'get', 'post', 'patch', 'del' ] => '/server/:server/bulk/:bulk/**?' =>
  sub {
    #
    # General catcher
    #
    var server => route_parameters->get('server');
    if ( not sessions_exist('radius') ) {
        send_error( q{Server } . var('server') . q{ not found},
            HTTP_BAD_REQUEST );
        return;
    }
    var bulk => route_parameters->get('bulk');
    pass;
  };

prefix '/manipulate/server/:server/bulk/:bulk';
patch '/**?' => sub {
    #
    # Check standart parameters here
    #
    debug 'Standart checks';
    my $sessions =
         body_parameters->get('update-session')
      || body_parameters->get('drop-session')
      || body_parameters->get('sessions');
    var messages => [];

    if (   !is_int($sessions)
        && $sessions !~ /^all$/sxm
        && $sessions !~ /^bulk:.+$/sxm
        && $sessions !~ /^array:(?:\d+,?)+$/sxm )
    {
        send_error( q{Couldn't parse session ID.}, HTTP_BAD_REQUEST );
    }
    if ( is_int($sessions) ) {
        $sessions = 'id:' . $sessions;
    }
    body_parameters->set( 'sessions', $sessions );

    if ( body_parameters->get('framed-ip-address') !~ /^$RE{net}{IPv4}$/ ) {
        push @{ vars->{messages} },
          {
            type    => 'alert',
            message =>
'Framed-IP-Address is not an IP address. Will try to use it anyway.'
          };
    }

    pass;
};

patch '/update/' => sub {
    #
    # Update sessions
    #
    if (
        (
            !is_int( body_parameters->get('interim-session-time') )
            || body_parameters->get('interim-session-time') < 0
        )
        && body_parameters->get('interim-session-time') ne 'timeFromCreate'
        && body_parameters->get('interim-session-time') ne 'timeFromChange'
      )
    {
        push @{ vars->{messages} },
          {
            type    => 'alert',
            message =>
'Acct-Session-Time is not an integer or less than 0, dropping to 0.'
          };
        body_parameters->set('interim-session-time');
    }
    if ( !is_int( body_parameters->get('input-packets') )
        || body_parameters->get('input-packets') < 0 )
    {
        push @{ vars->{messages} },
          {
            type    => 'alert',
            message =>
'Acct-Input-Packets is not an integer or less than 0, dropping to 0.'
          };
        body_parameters->set( 'input-packets', 0 );
    }
    if ( !is_int( body_parameters->get('output-packets') )
        || body_parameters->get('output-packets') < 0 )
    {
        push @{ vars->{messages} },
          {
            type    => 'alert',
            message =>
'Acct-Output-Packets is not an integer or less than 0, dropping to 0.'
          };
        body_parameters->set( 'output-packets', 0 );
    }
    if ( !is_int( body_parameters->get('input-octets') )
        || body_parameters->get('input-octets') < 0 )
    {
        push @{ vars->{messages} },
          {
            type    => 'alert',
            message =>
'Acct-Input-Octets is not an integer or less than 0, dropping to 0.'
          };
        body_parameters->set( 'input-octets', 0 );
    }
    if ( !is_int( body_parameters->get('output-octets') )
        || body_parameters->get('output-octets') < 0 )
    {
        push @{ vars->{messages} },
          {
            type    => 'alert',
            message =>
'Acct-Output-Octets is not an integer or less than 0, dropping to 0.'
          };
        body_parameters->set( 'output-octets', 0 );
    }

    my %status_types = (
        '1' => 'Start',
        '3' => 'Interim-Update',
        '7' => 'Accounting-On',
        '8' => 'Accounting-Off',
    );
    body_parameters->set( 'acct-status-type',
        $status_types{ body_parameters->get('acct-status-type') }
          // 'Interim-Update' );

    my $chunk = block_sessions( body_parameters->get('sessions') );

    my ( $server, $local_addr ) = another_server();
    my $jsondata = {
        server   => $server,
        owner    => user->real_uid,
        protocol => 'accounting',
        count    => 1,
        radius   => {
            request    => undef,
            accounting => [
                {
                    name   => 'Acct-Status-Type',
                    value  => body_parameters->get('acct-status-type'),
                    vendor => undef
                },
                {
                    name   => 'Acct-Session-Time',
                    value  => body_parameters->get('interim-session-time'),
                    vendor => undef
                },
                {
                    name   => 'Acct-Input-Octets',
                    value  => body_parameters->get('input-octets'),
                    vendor => undef
                },
                {
                    name   => 'Acct-Output-Octets',
                    value  => body_parameters->get('output-octets'),
                    vendor => undef
                },
                {
                    name   => 'Acct-Input-Packets',
                    value  => body_parameters->get('input-packets'),
                    vendor => undef
                },
                {
                    name   => 'Acct-Output-Packets',
                    value  => body_parameters->get('output-packets'),
                    vendor => undef
                },
                (
                    body_parameters->get('sessions') =~ /^id:/sxm
                    ? {
                        name   => 'Framed-IP-Address',
                        value  => body_parameters->get('framed-ip-address'),
                        vendor => undef
                      }
                    : {}
                )
            ],
        },
        async      => body_parameters->get('async') ? 1 : undef,
        variables  => undef,
        parameters => {
            'sessions'           => { chunk => $chunk },
            'specific'           => undef,
            'job_name'           => undef,
            'latency'            => undef,
            'bulk'               => body_parameters->get('bulk') || undef,
            'action'             => 'update',
            'job_chunk'          => $chunk,
            'job_id'             => undef,
            'accounting_type'    => 'update',
            'save_sessions'      => 1,
            'saved_cli'          => undef,
            'download_dacl'      => undef,
            'accounting_latency' => undef,
            'accounting_start'   => undef,
            'framed-mtu'         => undef,
        },
        maybe 'local-addr' => $local_addr,
    };

    if ( my $user_added = body_parameters->get('additional-attrs') ) {
        foreach my $line ( split /\n/sxm, $user_added ) {
            my @a = split /=/sxm, $line, 2;
            if ( $a[0] && $a[1] ) {
                push @{ $jsondata->{radius}->{accounting} },
                  { name => $a[0], value => $a[1] };
            }
        }
    }

    my $encoded_json = JSON::MaybeXS->new( utf8 => 1 )->encode($jsondata);

    my $result = start_process(
        $encoded_json,
        {
            proc        => body_parameters->get('proc-name'),
            verbose     => body_parameters->get('verbose') ? 1 : 0,
            as_continue => 1,
        }
    );

    if ( $result->{type} eq 'error' ) {
        send_error( $result->{message}, HTTP_INTERNAL_SERVER_ERROR );
    }
    else {
        send_as
          JSON => { status => 'ok', messages => vars->{messages} },
          { content_type => 'application/json; charset=UTF-8' };
    }
};

patch '/drop/' => sub {
    #
    # Drop sessions
    #
    if (   !is_int( body_parameters->get('terminate-cause') )
        || body_parameters->get('terminate-cause') < 0
        || body_parameters->get('terminate-cause') > 18 )
    {
        send_error(
            "Unknown Acct-Terminate-Cause.\n"
              . q{Should be in range [1:18], refer to <a href='https://tools.ietf.org/html/rfc2866#page-19' target='_blank'>RFC</a>}
              . 'Your value: '
              . body_parameters->get('terminate-cause'),
            HTTP_BAD_REQUEST
        );
    }
    else {
        my $causes = {
            '1'  => 'User-Request',
            '2'  => 'Lost-Carrier',
            '3'  => 'Lost-Service',
            '4'  => 'Idle-Timeout',
            '5'  => 'Session-Timeout',
            '6'  => 'Admin-Reset',
            '7'  => 'Admin-Reboot',
            '8'  => 'Port-Error',
            '9'  => 'NAS-Error',
            '10' => 'NAS-Request',
            '11' => 'NAS-Reboot',
            '12' => 'Port-Unneeded',
            '13' => 'Port-Preempted',
            '14' => 'Port-Suspended',
            '15' => 'Service-Unavailable',
            '16' => 'Callback',
            '17' => 'User-Error',
            '18' => 'Host-Request',
        };
        body_parameters->set( 'terminate-cause',
            $causes->{ body_parameters->get('terminate-cause') } );
    }
    if (
        (
            !is_int( body_parameters->get('session-time') )
            || body_parameters->get('session-time') < 0
        )
        && body_parameters->get('session-time') ne 'timeFromCreate'
        && body_parameters->get('session-time') ne 'timeFromChange'
      )
    {
        push @{ vars->{messages} },
          {
            type    => 'alert',
            message =>
'Acct-Session-Time is not an integer or less than 0, dropping to 0.'
          };
        body_parameters->set( 'session-time', 0 );
    }
    if ( !is_int( body_parameters->get('delay-time') )
        || body_parameters->get('delay-time') < 0 )
    {
        push @{ vars->{messages} },
          {
            type    => 'alert',
            message =>
              'Acct-Delay-Time is not an integer or less than 0, dropping to 0.'
          };
        body_parameters->get('delay-time') = 0;
    }

    my $chunk = block_sessions( body_parameters->get('sessions') );

    my ( $server, $local_addr ) = another_server();
    my $jsondata = {
        server   => $server,
        owner    => user->real_uid,
        protocol => 'accounting',
        count    => 1,
        radius   => {
            request    => undef,
            accounting => [
                {
                    name   => 'Acct-Terminate-Cause',
                    value  => body_parameters->get('terminate-cause'),
                    vendor => undef
                },
                {
                    name   => 'Acct-Session-Time',
                    value  => body_parameters->get('session-time'),
                    vendor => undef
                },
                {
                    name   => 'Acct-Delay-Time',
                    value  => body_parameters->get('delay-time'),
                    vendor => undef
                },
                (
                    body_parameters->get('sessions') =~ /^id:/sxm
                    ? {
                        name   => 'Framed-IP-Address',
                        value  => body_parameters->get('framed-ip-address'),
                        vendor => undef
                      }
                    : {}
                )
            ],
        },
        async      => body_parameters->get('async') ? 1 : undef,
        variables  => undef,
        parameters => {
            'sessions'           => { chunk => $chunk },
            'specific'           => undef,
            'job_name'           => undef,
            'latency'            => undef,
            'bulk'               => body_parameters->get('bulk') || undef,
            'action'             => 'drop',
            'job_chunk'          => $chunk,
            'job_id'             => undef,
            'accounting_type'    => 'drop',
            'save_sessions'      => body_parameters->get('keep-session') || 0,
            'saved_cli'          => undef,
            'download_dacl'      => undef,
            'accounting_latency' => undef,
            'accounting_start'   => undef,
            'framed-mtu'         => undef,
        },
        maybe 'local-addr' => $local_addr,
    };

    my $encoded_json = JSON::MaybeXS->new( utf8 => 1 )->encode($jsondata);

    my $result = start_process(
        $encoded_json,
        {
            proc        => body_parameters->get('proc-name'),
            verbose     => body_parameters->get('verbose') ? 1 : 0,
            as_continue => 1,
        }
    );

    if ( $result->{type} eq 'error' ) {
        send_error( $result->{message}, HTTP_INTERNAL_SERVER_ERROR );
    }
    else {
        send_as
          JSON => { status => 'ok', messages => vars->{messages} },
          { content_type => 'application/json; charset=UTF-8' };
    }
};

get '/unblock/' => sub {
    #
    # Unblock all sessions in bulk
    #
    database->quick_update(
        table('sessions'),
        { server => var('server'), bulk => var('bulk'), owner => user->owners },
        { attributes => \q/"attributes" - 'job-chunk'/ }
    );
    forward '/manipulate/server/'
      . var('server')
      . '/bulk/'
      . var('bulk') . q{/},
      {
        forwarded => 1,
        result    => [ { type => 'success', message => 'Sessions unblocked.' } ]
      };
};

post '/check/' => sub {
    #
    # Check sessions status
    #
    my $rv = check_sessions( body_parameters->get('check-session') );
    if ( $rv->{type} eq 'ok' ) {
        send_as
          JSON => $rv->{result},
          { content_type => 'application/json; charset=UTF-8' };
    }
    else {
        send_as
          JSON => { messages => [$rv] },
          { content_type => 'application/json; charset=UTF-8' };
    }
};

get '/delete/:to_delete/' => sub {
    #
    # Delete something, called from link
    #
    my $rv = delete_sessions( route_parameters->get('to_delete') );
    if (serve_json) {
        send_as
          JSON => $rv,
          { content_type => 'application/json; charset=UTF-8' };
    }
    else {
        forward '/manipulate/server/'
          . var('server')
          . '/bulk/'
          . var('bulk') . q{/},
          { forwarded => 1, result => [$rv] };
    }
};

del q{/} => sub {
    #
    # Delete something, called from JS
    #
    my $rv = delete_sessions( body_parameters->get('delete-session') );
    if (serve_json) {
        send_as
          JSON => $rv,
          { content_type => 'application/json; charset=UTF-8' };
    }
    else {
        forward '/manipulate/server/'
          . var('server')
          . '/bulk/'
          . var('bulk') . q{/},
          { forwarded => 1, result => [$rv] };
    }
};

Readonly my $FLOW_TYPE_BY_PACKET => {
    ACCESS_REQUEST     => 'radius-auth',
    ACCOUNTING_REQUEST => 'radius-acct',
    COA_REQUEST        => 'radius-coa',
    DISCONNECT_REQUEST => 'radius-disconnect',
    HTTP_REQUEST       => 'http'
};

get '/session-flow/:flow/**?' => sub {
    #
    # Return session flow
    #
    if ( !serve_json ) {
        forward '/manipulate/server/' . var('server') . q{/};
    }

    my @more = splat;
    @more = scalar @more ? grep { $_ ne q{} } @{ $more[0] } : ();

    my $options = {};
    if ( scalar @more && scalar(@more) % 2 == 0 ) {
        $options = {@more};
        if ( $options->{columns} ) {
            $options->{columns} = [ split /,/sxm, $options->{columns} ];
        }
    }

    my $sessions = [
        load_sessions(
            {
                server => var('server'),
                bulk   => var('bulk')
            },
            {
                id      => route_parameters->get('flow'),
                columns => $options->{columns} // undef
            },
            1
        )
    ];

    if ( scalar @{$sessions} ) {
        my $flows = [];
        foreach my $pckt ( @{ $sessions->[0]->{flow} } ) {
            if ( exists $pckt->{radius}->{code} ) {
                my $type = $FLOW_TYPE_BY_PACKET->{ $pckt->{radius}->{code} }
                  // (
                    scalar @{$flows} ? $flows->[-1]->{type} : 'out-of-order' );

               # if ( $pckt->{radius}->{code} eq 'ACCESS_REQUEST' ) {
               #     $type = 'radius-auth';
               # }
               # if ( $pckt->{radius}->{code} eq 'ACCOUNTING_REQUEST' ) {
               #     $type = 'radius-acct';
               # }
               # if ( $pckt->{radius}->{code} eq 'COA_REQUEST' ) {
               #     $type = 'radius-coa';
               # }
               # if ( $pckt->{radius}->{code} eq 'DISCONNECT_REQUEST' ) {
               #     $type = 'radius-disconnect';
               # }
               # if ( $pckt->{radius}->{code} eq 'HTTP_REQUEST' ) {
               #     $type = 'http';
               # }
               # if ( !$type ) {
               #     $type =
               #       scalar @{$flows} ? $flows->[-1]->{type} : 'out-of-order';
               # }

                if ( !scalar @{$flows} || $flows->[-1]->{type} ne $type ) {
                    push @{$flows}, { type => $type, packets => [], };
                }
            }

            push @{ $flows->[-1]->{packets} }, $pckt;
        }
        my $px = load_session_pxgrid( $sessions->[0]->{mac} );
        if ( is_plain_arrayref($px) && scalar @{$px} ) {
            push @{$flows}, { type => 'pxgrid', messages => $px };
        }
        $sessions->[0]->{flows} = $flows;
        delete $sessions->[0]->{flow};
        send_as
          JSON => { session => $sessions->[0], },
          { content_type => 'application/json; charset=UTF-8' };
        return;
    }

    send_as
      JSON => { sessions => $sessions },
      { content_type => 'application/json; charset=UTF-8' };
};

get '/session-dacl/:session/' => sub {
    #
    # Return session dACL
    #
    if ( !serve_json ) {
        forward '/manipulate/server/' . var('server') . q{/};
    }

    my $sessions = [
        load_sessions(
            { server => var('server'), bulk => var('bulk'), },
            {
                id      => route_parameters->get('session'),
                columns => [qw/attributes/],
            },
            0
        )
    ];
    if ( !scalar @{$sessions} ) {
        send_error( 'Session not found.', HTTP_NOT_FOUND );
    }
    else {
        if ( !is_plain_hashref( $sessions->[0]->{attributes} ) ) {
            $sessions->[0]->{attributes} = JSON::MaybeXS->new( utf8 => 1 )
              ->decode( $sessions->[0]->{attributes} );
        }
        send_as
          JSON => { dacl => $sessions->[0]->{attributes}->{DACL} // [] },
          { content_type => 'application/json; charset=UTF-8' };
    }
};

post '/get-guest-creds/' => sub {
    if ( !serve_json ) {
        forward '/manipulate/server/' . var('server') . q{/}, {},
          { method => 'GET' };
    }

    my @s = grep { /^(\d+|all)$/sxm } body_parameters->get_all('sessions');

    if ( !scalar @s ) {
        send_error( 'No sessions specified', HTTP_BAD_REQUEST );
    }

    my @data = load_sessions_attribute(
        path => [qw/snapshot GUEST_FLOW CREDENTIALS/],
        $s[0] ne 'all' ? ( sessions => \@s ) : (),
        flatten => 1,
    );

    my $jobj = JSON::MaybeXS->new( utf8 => 1 );
    @data = map { $jobj->decode($_) } @data;

    send_as JSON => \@data;
};

get '/**?' => sub {
    #
    # Default catcher, show sessions of the server
    #
    if ( !serve_json ) {
        forward '/manipulate/server/' . var('server') . q{/},
          {
            forwarded => 0,
            result    => [],
            sessions  => query_parameters->get('sessions'),
          };
    }

    my ($r) = splat;
    my %add_params;

    # Parse additional parameters
    if ( scalar @{$r} ) {
        if ( scalar( @{$r} ) % 2 == 1 ) { pop @{$r}; }
        %add_params = @{$r};
    }

    if ( $add_params{columns} ) {
        $add_params{columns} = [ split /,/sxm, $add_params{columns} ];
    }

    # And default them if anything
    $add_params{page} //= 0;
    my @how_sort = split /-/sxm, $add_params{sort} || 'changed-desc';
    $add_params{'per-page'} //= $DEFAULT_PER_PAGE;

    my %sort = (
        column => ( $how_sort[0] && $SORTABLE{ $how_sort[0] } )
        ? scalar $how_sort[0]
        : 'changed',
        order => ( $how_sort[1] && $how_sort[1] =~ /^(a|de)sc$/isxm )
        ? uc scalar $how_sort[1]
        : 'DESC',
        limit => (
                 $add_params{'per-page'}
              && $add_params{'per-page'} =~ /^(\d+|all)$/isxm
        ) ? scalar $add_params{'per-page'} : '10',
        offset => ( $add_params{offset} && is_int( $add_params{offset} ) )
        ? scalar $add_params{offset}
        : undef,
        filter  => $add_params{filter} || undef,
        columns => $add_params{columns} // undef,
    );
    $sort{offset} //=
      (      $add_params{page}
          && is_int( $add_params{page} )
          && is_int( $sort{limit} ) )
      ? ( $add_params{page} - 1 ) * $sort{limit}
      : 0;

    my $sessions = [
        load_sessions(
            { server => var('server'), bulk => var('bulk') }, \%sort
        )
    ];

    if ( !scalar @{$sessions} ) {
        my $rv = { type => 'info', message => 'No sessions found.' };
        forward '/manipulate/', { forwarded => 1, result => [$rv] },
          { method => 'GET' };
    }

    $sort{total} = database->quick_count( table('sessions'),
        { server => var('server'), bulk => var('bulk'), owner => user->owners }
    );
    $sort{pages} =
      ( is_int( $sort{limit} ) && $sort{limit} > 0 )
      ? ceil( $sort{total} / $sort{limit} )
      : -1;
    var 'paging' => \%sort;

    if (serve_json) {
        body_parameters->set( 'no-content', 1 );
        send_as JSON => {
            state    => 'success',
            sessions => $sessions,
            paging   => var('paging') || undef,
            pxgrid   => config->{pxgrid} ? 1 : 0,
        };
    }
};

prefix q{/};

sub load_sessions {
    #
    # Load sessions
    #
    my ( $from, $sort, $load_flows, $proto ) = @_;

    $proto //= 'radius';
    my $where = {
        server => $from->{server} // undef,
        bulk   => $from->{bulk}   // undef,
        owner  => user->owners
    };

    my $options = {};

    if ( $sort->{id} ) {
        $options->{limit} = 1;
        $where->{id}      = $sort->{id};
        if ( !defined $where->{server} ) { delete $where->{server}; }
        if ( !defined $where->{bulk} )   { delete $where->{bulk}; }
        $load_flows //= 1;
    }
    else {
        $options->{order_by} = {};
        $options->{order_by}->{ $sort->{order} } = $sort->{column};
        if ( is_int( $sort->{limit} ) ) {
            $options->{limit} = $sort->{limit};
        }
        $options->{offset} = $sort->{offset};
        if ( $sort->{filter} ) {
            $where =
                database->quote_identifier('server') . ' = '
              . database->quote( $from->{server} ) . ' AND '
              . database->quote_identifier('bulk') . ' = '
              . database->quote( $from->{bulk} ) . ' AND '
              . database->quote_identifier('owner') . ' IN ('
              . user->join_owners . q{)}
              . ' AND (';

            my @radius_clmns = qw/mac user sessid ipAddr/;
            my @tacacs_clmns = qw/user ip_addr/;

            my @t = map {
                    database->quote_identifier($_)
                  . ' ILIKE '
                  . database->quote(
                    prepare_filter( $sort->{filter}, $_ eq 'mac' ? 1 : 0 ) )
            } $proto eq 'radius' ? @radius_clmns : @tacacs_clmns;

            $where .= join( ' OR ', @t ) . q{)};
        }
        $load_flows //= 0;
    }

    if (   is_plain_hashref($sort)
        && exists $sort->{columns}
        && is_plain_arrayref( $sort->{columns} ) )
    {
        $options->{columns} = $sort->{columns};
    }

    my @result =
      database->quick_select( sessions_table($proto), $where, $options );
    my $found = database->quick_count( sessions_table($proto), $where );
    if ($load_flows) { get_session_flow( \@result, $proto ); }
    my $jobj = JSON::MaybeXS->new( utf8 => 1 );
    foreach my $ses (@result) {
        my $dt;
        if ( exists $ses->{'started'} ) {
            $dt =
              is_int( $ses->{'started'} )
              ? DateTime->from_epoch(
                epoch     => $ses->{'started'},
                time_zone => strftime( '%z', localtime )
              )
              : DateTime::Format::Pg->parse_timestamp( $ses->{'started'} );
            $ses->{'started_f'} = $dt->strftime('%H:%M:%S %d/%m/%Y');
        }

        if ( exists $ses->{'changed'} ) {
            $dt =
              is_int( $ses->{'changed'} )
              ? DateTime->from_epoch(
                epoch     => $ses->{'changed'},
                time_zone => strftime( '%z', localtime )
              )
              : DateTime::Format::Pg->parse_timestamp( $ses->{'changed'} );
            $ses->{'changed_f'} = $dt->strftime('%H:%M:%S %d/%m/%Y');
        }

        if ( exists $ses->{attributes} ) {
            $ses->{attributes} = $jobj->decode( $ses->{attributes} );
            if ( exists $ses->{attributes}->{snapshot}
                && !is_ref( $ses->{attributes}->{snapshot} ) )
            {
                $ses->{attributes}->{snapshot} =
                  $jobj->decode( $ses->{attributes}->{snapshot} );
            }
        }
        if ( exists $ses->{proto_data} ) {
            $ses->{proto_data} = $jobj->decode( $ses->{proto_data} );
        }
    }
    return wantarray
      ? @result
      : {
        sessions => \@result,
        total    => $found
      };
}

sub load_sessions_attribute {
    my %o = @_;

    $o{proto} //= 'radius';

    my $path = database->quote_identifier('attributes') . q{->} . join q{->},
      map { database->quote($_) } @{ $o{path} };

    my @where;
    push @where,
      database->quote_identifier('owner') . q{ IN (} . user->join_owners . q{)};

    push @where, $path . q{ IS NOT NULL};

    if ( $o{sessions} && is_plain_arrayref( $o{sessions} ) ) {
        push @where,
            database->quote_identifier('id')
          . q{ IN (}
          . join( q{,}, map { database->quote($_) } @{ $o{sessions} } ) . q{)};
    }
    else {
        push @where,
          database->quote_identifier('server') . q{=}
          . database->quote( $o{server} // var('server') );
        push @where,
          database->quote_identifier('bulk') . q{=}
          . database->quote( $o{bulk} // var('bulk') );
    }

    my $identifier = $o{path}->[-1];
    my $sql =
        'SELECT '
      . $path . ' AS '
      . database->quote_identifier($identifier)
      . ' FROM '
      . database->quote_identifier( sessions_table( $o{proto} ) )
      . ' WHERE '
      . join ' AND ', @where;

    debug $sql;

    my @rv = database->selectall_array( $sql, { Slice => {} } );

    if ( $o{flatten} ) {
        @rv = map { $_->{$identifier} } @rv;
    }

    return @rv;
}

sub get_session_flow {
    #
    # Load RADIUS flow of sessions
    #
    my ( $sessions, $proto ) = @_;
    $proto //= 'radius';

    foreach my $session ( @{$sessions} ) {
        $session->{'flow'} = [
            database->quick_select(
                table('flows'),
                { session_id => $session->{'id'}, proto => $proto },
                { order_by   => 'order', }
            )
        ];

        foreach my $packet ( @{ $session->{'flow'} } ) {
            my $radius_str = $packet->{radius};
            if ( !utf8::is_utf8($radius_str) ) {
                $radius_str = utf8::decode($radius_str);
            }
            $packet->{radius} =
              JSON::MaybeXS->new( utf8 => 1 )->decode($radius_str);
            my $dt;
            if ( defined $packet->{radius}->{'Timestamp'} ) {
                $dt = DateTime->from_epoch(
                    epoch     => $packet->{radius}->{'Timestamp'},
                    time_zone => strftime( '%z', localtime )
                );
            }
            else {
                $dt = DateTime->from_epoch(
                    epoch     => $packet->{radius}->{'time'},
                    time_zone => strftime( '%z', localtime )
                );
            }
            $packet->{radius}->{'formattedDateTime'} =
              $dt->strftime('%H:%M:%S.%3N %d/%m/%Y');
        }
    }
    return;
}

sub block_sessions {
    #
    # Block sessions for some job
    #
    my ( $sessions, $proto ) = @_;
    $proto //= 'radius';
    my $chunk = Data::GUID->guid_string;

    my @bind;

    # push @bind, user->uid;
    my $where = q/"owner" IN (/ . user->join_owners . q/)/;

    if ( var('bulk') ) {
        push @bind, var('bulk');
        $where .= q/ AND "bulk" = $/ . scalar @bind;
    }

    if ( $sessions =~ /^bulk:(.+)$/isxm && !var('bulk') ) {
        push @bind, $1;
        $where .= q/ AND "bulk" = $/ . scalar @bind;
    }
    elsif ( $sessions =~ /^array:((\d+,?)+)$/isxm ) {
        $where .= qq/ AND "id" IN ($1)/;
    }
    elsif ( $sessions =~ /^(\d+)$/isxm || $sessions =~ /^id:(\d+)$/isxm ) {
        push @bind, $1;
        $where .= q/ AND "id" = $/ . scalar @bind;
    }
    elsif ( $sessions !~ /^all$/isxm ) {
        send_error( q{Couldn't parse sessions, unknown value } . $sessions,
            HTTP_INTERNAL_SERVER_ERROR );
    }

    if ( var('server') ) {
        push @bind, var('server');
        $where .= q/ AND "server" = $/ . scalar @bind;
    }

    $where .= q/ AND NOT "attributes" ? 'job-chunk'/;

    my $query = qq/'{"job-chunk"}','"$chunk"'::jsonb,true/;
    my $sql =
        q/UPDATE /
      . database->quote_identifier( sessions_table($proto) )
      . qq/ SET attributes = jsonb_set(attributes, $query) WHERE $where/;
    my $sth = database->prepare( $sql, { pg_placeholder_dollaronly => 1 } );
    logging->debug( "Executing $sql  with params " . join q{,}, @bind );
    debug "Executing $sql  with params " . join q{,}, @bind;
    $sth->execute(@bind);

    return $chunk;
}

sub _add_outdated {
    my ( $where, $bind, $proto ) = @_;

    my $last_second =
      time - $SECS_FIVE_DAYS;  # Current time in seconds minus 5 days in seconds
    if ( $proto eq 'radius' ) {
        push @{$bind}, $last_second;
        ${$where} .= q/ AND "changed" < $/ . scalar @{$bind};
    }
    else {
        $last_second = DateTime->from_epoch( epoch => $last_second, );
        $last_second = DateTime::Format::Pg->format_timestamp($last_second);

        push @{$bind}, $last_second;
        ${$where} .= q/ AND "changed" < $/ . scalar @{$bind};
    }
    return 'Outdated sessions removed.';
}

sub _add_dropped {
    my ( $where, $bind, $proto ) = @_;
    ${$where} .= q/ AND "attributes" @> '{"Dropped":1}'/;
    return 'Dropped sessions removed.';
}

sub _add_different_bulk {
    my ( $where, $bind, $proto, $bulk ) = @_;
    push @{$bind}, $bulk;
    ${$where} .= q/ AND "bulk" = $/ . scalar @{$bind};
    return 'Bulk sessions removed.';
}

sub _add_ids_array {
    my ( $where, $bind, $proto, $array ) = @_;
    ${$where} .= qq/ AND "id" IN ($array)/;
    return 'Sessions removed.';
}

sub _add_one_id {
    my ( $where, $bind, $proto, $id ) = @_;
    push @{$bind}, $id;
    ${$where} .= q/ AND "id" = $/ . scalar @{$bind};
    return 'Session removed.';
}

sub _add_same_bulk {
    return 'Bulk removed.';
}

sub delete_sessions {
    #
    # Remove sessions completely
    #
    my ( $sessions, $proto ) = @_;
    $proto //= 'radius';

    return { type => 'error', message => 'No sessions specified.' }
      if ( !$sessions );
    return { type => 'error', message => 'No server specified.' }
      if ( !var('server') );

    my $where = q/"owner" IN (/ . user->join_owners . q/) AND "server" = $1/;
    my @bind  = ( var('server') );
    my $ok;

    if ( var('bulk') ) {
        push @bind, var('bulk');
        $where .= q/ AND "bulk" = $/ . scalar @bind;
    }

    for ($sessions) {
        when ('outdated') {
            $ok = _add_outdated( \$where, \@bind, $proto );
        }
        when ('dropped') {
            $ok = _add_dropped( \$where, \@bind, $proto );
        }
        when ( /^bulk:(.+)$/isxm && !var('bulk') ) {
            $ok = _add_different_bulk( \$where, \@bind, $proto, $1 );
        }
        when (/^array:((?:\d+,?)+)$/isxm) {
            $ok = _add_ids_array( \$where, \@bind, $proto, $1 );
        }
        when ( /^(\d+)$/isxm || /^id:(\d+)$/isxm ) {
            $ok = _add_one_id( \$where, \@bind, $proto, $1 );
        }
        when ( /^bulk:(.+)$/isxm && var('bulk') eq $1 ) {
            $ok = _add_same_bulk();
        }
        default {
            send_error( q{Couldn't parse sessions, unknown value } . $sessions,
                HTTP_INTERNAL_SERVER_ERROR );
            return;
        }
    }

    my $sql =
        q/SELECT "id" FROM /
      . database->quote_identifier( sessions_table($proto) )
      . qq/ WHERE $where/;
    logging->debug( "Executing $sql with parameters " . join q{,}, @bind );
    my $found;
    my $rv = database->selectall_arrayref( $sql, { Slice => [0] }, @bind );
    if ( defined $rv && is_plain_arrayref($rv) && scalar @{$rv} ) {
        $found = [ map { $_->[0]; } @{$rv} ];
        logging->debug( 'Found sessions: ' . join q{,}, @{$found} );
    }
    elsif ( !defined $rv ) {
        logging->error( 'SQL exception: ' . database->errstr );
        send_error( 'SQL exception: ' . database->errstr,
            HTTP_INTERNAL_SERVER_ERROR );
    }
    else {
        return { type => 'info', message => 'No sessions found.' };
    }

    while ( scalar @{$found} ) {
        my @tmp;
        if ( scalar @{$found} > $MAX_SESSIONS_ONE_GO ) {
            @tmp = splice @{$found}, 0, $MAX_SESSIONS_ONE_GO;
        }
        else {
            @tmp = splice @{$found}, 0, scalar @{$found};
        }

        $rv = database->quick_delete( table('flows'), { session_id => \@tmp } );
        debug 'Removed flows ' . $rv;
    }

    $sql =
        q/DELETE FROM /
      . database->quote_identifier( sessions_table($proto) )
      . qq/ WHERE $where/;
    logging->debug( "Executing $sql with parameters " . join q{,}, @bind );
    $rv = database->do( $sql, undef, @bind );
    debug 'Removed sessions ' . $rv;

    return { type => 'success', message => $ok, refresh => 1 };
}

sub check_sessions {
    my ( $ids, $proto ) = @_;
    $proto //= 'radius';

    return { type => 'error', message => 'No sessions specified.' }
      if ( !$ids );
    return { type => 'error', message => 'No server specified.' }
      if ( !var('server') );

    my $where = {
        server => var('server'),
        owner  => user->owners
    };

    if ( var('bulk') ) {
        $where->{bulk} = var('bulk');
    }

    if ( $ids =~ /^bulk:(.+)$/sxmi && !var('bulk') ) {
        $where->{bulk} = $1;
    }
    elsif ( $ids =~ /^array:((\d+,?)+)$/sxmi ) {
        $where->{id} = [ split /,/sxm, $1 ];
    }
    elsif ( $ids =~ /^(\d+)$/sxmi || $ids =~ /^id:(\d+)$/sxmi ) {
        $where->{id} = $1;
    }
    elsif ( $ids !~ /^all$/sxmi ) {
        send_error( q{Couldn't parse sessions, unknown value } . $ids,
            HTTP_BAD_REQUEST );
    }

    my @sessions = database->quick_select( sessions_table($proto), $where );
    if ( !scalar @sessions ) {
        return { type => 'info', message => 'No sessions found.' };
    }

    my $s = {};
    my $dt;
    foreach my $k (@sessions) {
        $s->{ $k->{id} } = $k;
        $s->{ $k->{id} }->{'attributes'} = JSON::MaybeXS->new( utf8 => 1 )
          ->decode( $s->{ $k->{id} }->{'attributes'} );

        if ( exists $s->{ $k->{id} }->{'started'} ) {
            $dt =
              is_int( $s->{ $k->{id} }->{'started'} )
              ? DateTime->from_epoch(
                epoch     => $s->{ $k->{id} }->{'started'},
                time_zone => strftime( '%z', localtime )
              )
              : DateTime::Format::Pg->parse_timestamp(
                $s->{ $k->{id} }->{'started'} );
            $s->{ $k->{id} }->{'started_f'} =
              $dt->strftime('%H:%M:%S %d/%m/%Y');
        }

        if ( exists $s->{ $k->{id} }->{'changed'} ) {
            $dt =
              is_int( $s->{ $k->{id} }->{'changed'} )
              ? DateTime->from_epoch(
                epoch     => $s->{ $k->{id} }->{'changed'},
                time_zone => strftime( '%z', localtime )
              )
              : DateTime::Format::Pg->parse_timestamp(
                $s->{ $k->{id} }->{'changed'} );
            $s->{ $k->{id} }->{'changed_f'} =
              $dt->strftime('%H:%M:%S %d/%m/%Y');
        }
    }
    return { type => 'ok', result => $s };
}

sub prepare_filter {
    my $filter   = shift;
    my $mac_flag = shift // 0;

    $mac_flag and $filter =~ s/[:.-]/_/gsmx;
    return q{%} . $filter . q{%};
}

sub load_session_pxgrid {
    if ( !config->{pxgrid} ) { return; }

    my $mac = shift;

    PRaGFrontend::pxgrid::prepare_jwt();
    logging->debug('Get count of pxGrid');
    my $rest_res = make_rest_call(
        call    => '/connections/get-connections-count',
        method  => 'GET',
        no_send => 1
    );
    logging->debug( 'Got ' . Dumper($rest_res) );

    my $c;
    try {
        $c = JSON::MaybeXS->new( utf8 => 1 )->decode( encode_utf8($rest_res) );
    }
    catch {
        logging->warn( 'JSON decode error: ' . $EVAL_ERROR );
    };
    if ( !defined $c->{count} ) { return; }
    if ( !$c->{count} ) {
        logging->debug('Get all pxGrid connections');
        make_rest_call(
            call    => '/connections/get-connections',
            method  => 'GET',
            no_send => 1
        );
        logging->debug('Get count again');
        $rest_res = make_rest_call(
            call    => '/connections/get-connections-count',
            method  => 'GET',
            no_send => 1
        );
        logging->debug( 'Got ' . Dumper($rest_res) );
        try {
            $c =
              JSON::MaybeXS->new( utf8 => 1 )->decode( encode_utf8($rest_res) );
        }
        catch {
            logging->warn( 'JSON decode error: ' . $EVAL_ERROR );
        };
        if ( !defined $c->{count} ) { return; }
        if ( !$c->{count} )         { return; }
    }

    $rest_res = make_rest_call(
        call    => '/connections/messages-by-mac/' . $mac,
        method  => 'GET',
        no_send => 1
    );
    try {
        $c = JSON::MaybeXS->new( utf8 => 1 )->decode( encode_utf8($rest_res) );
    }
    catch {
        logging->warn( 'JSON decode error: ' . $EVAL_ERROR );
        $c = undef;
    };
    return $c;
}

sub another_server {
    my $flag = body_parameters->get('useAnotherServer');
    return undef if ( not $flag );

    my $s = body_parameters->get('server');
    return (
        {
            address   => $s->{address},
            auth_port => 1812,
            acct_port => $s->{acctPort},
            secret    => $s->{secret},
        },
        $s->{localAddr} // undef
    );
}

1;
