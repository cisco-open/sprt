package PRaGFrontend::manipulate_tacacs;

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use PRaGFrontend::manipulate qw/load_sessions
  load_sessions_attribute
  get_session_flow
  block_sessions
  delete_sessions
  check_sessions
  prepare_filter
  load_session_pxgrid/;
use plackGen qw/load_servers start_process sessions_exist :const/;

use Data::GUID;
use DateTime;
use Encode        qw/encode_utf8/;
use English       qw/-no_match_vars/;
use HTTP::Status  qw/:constants/;
use JSON::MaybeXS ();
use POSIX         qw/strftime ceil/;
use Readonly;
use Ref::Util      qw/is_plain_arrayref is_plain_hashref is_ref/;
use Regexp::Common qw/net/;
use Syntax::Keyword::Try;

Readonly my %SORTABLE => (
    'user'    => 1,
    'ip_addr' => 1,
    'started' => 1,
    'changed' => 1,
);

Readonly my $PREFIX => '/manipulate/server/tacacs';

prefix $PREFIX;
get '/:server/' => sub {
    var server => route_parameters->get('server');
    if ( not sessions_exist('tacacs') ) {
        my $rv = {
            type    => 'info',
            message => q{Server <strong>}
              . var('server')
              . q{</strong> not found}
        };
        forward '/manipulate/', { forwarded => 1, result => [$rv] };
    }

    if (serve_json) {
        send_as JSON =>
          { server => load_servers( var('server'), proto => 'tacacs' ) };
    }
    else {
        send_as
          html => template 'react.tt',
          {
            active    => 'manipulate',
            ui        => 'tacacs_sessions',
            title     => 'Sessions',
            pageTitle => 'Manipulate TACACS+ sessions',
            forwarded => ( query_parameters->get('forwarded') // 0 ),
            messages  => ( query_parameters->get('result') || [] ),
            location  => '/manipulate/server/tacacs/' . var('server') . q{/},
          };
    }
};

any [ 'get', 'post', 'patch', 'del' ] => '/:server/bulk/:bulk/**?' => sub {
    #
    # General catcher
    #
    var server => route_parameters->get('server');
    if ( !serve_json ) {
        forward $PREFIX . q{/} . var('server') . q{/},
          {
            forwarded => 0,
            result    => [],
          };
    }

    if ( not sessions_exist('tacacs') ) {
        my $rv = {
            type    => 'info',
            message => q{Server <strong>}
              . var('server')
              . q{</strong> not found}
        };
        forward '/manipulate/', { forwarded => 1, result => [$rv] };
    }
    var bulk => route_parameters->get('bulk');
    pass;
};

prefix $PREFIX. '/:server/bulk/:bulk';
patch '/**?' => sub {
    #
    # Check standart parameters here
    #
    #FIXME:
    # debug 'Standart checks';
    # my $sessions = body_parameters->get('update-session')
    #   || body_parameters->get('drop-session');
    # var messages => [];

    # if (   $sessions !~ /^\d+$/sxm
    #     && $sessions !~ /^all$/sxm
    #     && $sessions !~ /^bulk:.+$/sxm
    #     && $sessions !~ /^array:(?:\d+,?)+$/sxm )
    # {
    #     send_error( q{Couldn't parse session ID.}, HTTP_BAD_REQUEST );
    # }
    # if ( $sessions =~ /^\d+$/sxm ) {
    #     $sessions = 'id:' . $sessions;
    # }
    # body_parameters->set( 'sessions', $sessions );

# if ( body_parameters->get('framed-ip-address') !~ /^$RE{net}{IPv4}$/ ) {
#     push @{ vars->{messages} },
#       {
#         type => 'alert',
#         message => 'Framed-IP-Address is not an IP address. Will try to use it anyway.'
#       };
# }

    # pass;
};

patch '/update/' => sub {
    #
    # Update sessions
    #
    #FIXME:
    # my %status_types = (
    #     '1' => 'Start',
    #     '3' => 'Interim-Update',
    #     '7' => 'Accounting-On',
    #     '8' => 'Accounting-Off',
    # );
    # body_parameters->set( 'acct-status-type',
    #     $status_types{ body_parameters->get('acct-status-type') }
    #       // 'Interim-Update' );

    # my $chunk = block_sessions( body_parameters->get('sessions') );

    # my $jsondata = {
    #     server   => undef,
    #     owner    => user->uid,
    #     protocol => 'accounting',
    #     count    => 1,
    #     radius   => {
    #     },
    #     async      => undef,
    #     variables  => undef,
    #     parameters => {
    #         'sessions'           => { chunk => $chunk },
    #         'specific'           => undef,
    #         'job_name'           => undef,
    #         'latency'            => undef,
    #         'bulk'               => body_parameters->get('bulk') || undef,
    #         'action'             => 'update',
    #         'job_chunk'          => $chunk,
    #         'job_id'             => undef,
    #         'accounting_type'    => 'update',
    #         'save_sessions'      => 1,
    #         'saved_cli'          => undef,
    #         'download_dacl'      => undef,
    #         'accounting_latency' => undef,
    #         'accounting_start'   => undef,
    #         'framed-mtu'         => undef,
    #     }
    # };

    # if ( my $user_added = body_parameters->get('additional-attrs') ) {
    #     foreach my $line ( split /\n/sxm, $user_added ) {
    #         my @a = split /=/sxm, $line, 2;
    #         if ( $a[0] && $a[1] ) {
    #             push @{ $jsondata->{radius}->{accounting} },
    #               { name => $a[0], value => $a[1] };
    #         }
    #     }
    # }

    # my $encoded_json = JSON::MaybeXS->new( utf8 => 1 )->encode($jsondata);

    # my $result = start_process(
    #     $encoded_json,
    #     {
    #         proc        => body_parameters->get('proc-name'),
    #         verbose     => body_parameters->get('verbose') ? 1 : 0,
    #         as_continue => 1,
    #     }
    # );

    # if ( $result->{type} eq 'error' ) {
    #     send_error( $result->{message}, HTTP_INTERNAL_SERVER_ERROR );
    # }
    # else {
    #     send_as
    #       JSON => { status => 'ok', messages => vars->{messages} },
    #       { content_type => 'application/json; charset=UTF-8' };
    # }
};

patch '/drop/' => sub {
    #
    # Drop sessions
    #
    #FIXME:

    # my $chunk = block_sessions( body_parameters->get('sessions') );

    # my $jsondata = {
    #     server   => undef,
    #     owner    => user->uid,
    #     protocol => 'accounting',
    #     count    => 1,
    #     radius   => {},
    #     async      => undef,
    #     variables  => undef,
    #     parameters => {
    #         'sessions'           => { chunk => $chunk },
    #         'specific'           => undef,
    #         'job_name'           => undef,
    #         'latency'            => undef,
    #         'bulk'               => body_parameters->get('bulk') || undef,
    #         'action'             => 'drop',
    #         'job_chunk'          => $chunk,
    #         'job_id'             => undef,
    #         'accounting_type'    => 'drop',
    #         'save_sessions'      => body_parameters->get('keep-session') || 0,
    #         'saved_cli'          => undef,
    #         'download_dacl'      => undef,
    #         'accounting_latency' => undef,
    #         'accounting_start'   => undef,
    #         'framed-mtu'         => undef,
    #     }
    # };

    # my $encoded_json = JSON::MaybeXS->new( utf8 => 1 )->encode($jsondata);

    # my $result = start_process(
    #     $encoded_json,
    #     {
    #         proc        => body_parameters->get('proc-name'),
    #         verbose     => body_parameters->get('verbose') ? 1 : 0,
    #         as_continue => 1,
    #     }
    # );

    # if ( $result->{type} eq 'error' ) {
    #     send_error( $result->{message}, HTTP_INTERNAL_SERVER_ERROR );
    # }
    # else {
    #     send_as
    #       JSON => { status => 'ok', messages => vars->{messages} },
    #       { content_type => 'application/json; charset=UTF-8' };
    # }
};

get '/unblock/' => sub {
    #
    # Unblock all sessions in bulk
    #
    database->quick_update(
        config->{tables}->{tacacs_sessions},
        { server => var('server'), bulk => var('bulk'), owner => user->owners },
        { attributes => \q/"attributes" - 'job-chunk'/ }
    );
    forward $PREFIX . q{/} . var('server') . '/bulk/' . var('bulk') . q{/},
      {
        forwarded => 1,
        result    => [ { type => 'success', message => 'Sessions unblocked.' } ]
      };
};

post '/check/' => sub {
    #
    # Check sessions status
    #
    my $rv = check_sessions( body_parameters->get('check-session'), 'tacacs' );
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

del q{/} => sub {
    #
    # Delete something, called from JS
    #
    my $rv = delete_sessions( body_parameters->get('what'), 'tacacs' );
    send_as
      JSON => $rv,
      { content_type => 'application/json; charset=UTF-8' };
};

get '/session-flow/:flow/**?' => sub {
    #
    # Return session flow
    #
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
            1, 'tacacs'
        )
    ];

   # if ( scalar @{$sessions} ) {
   #     my $flows = [];
   #     foreach my $pckt ( @{ $sessions->[0]->{flow} } ) {
   #         if ( exists $pckt->{radius}->{code} ) {
   #             my $type;
   #             if (   $pckt->{radius}->{code} eq 'ACCESS_REQUEST'
   #                 || $pckt->{radius}->{code} eq 'ACCOUNTING_REQUEST' )
   #             {
   #                 $type = 'radius-auth';
   #             }
   #             if ( $pckt->{radius}->{code} eq 'COA_REQUEST' ) {
   #                 $type = 'radius-coa';
   #             }
   #             if ( $pckt->{radius}->{code} eq 'DISCONNECT_REQUEST' ) {
   #                 $type = 'radius-disconnect';
   #             }
   #             if ( $pckt->{radius}->{code} eq 'HTTP_REQUEST' ) {
   #                 $type = 'http';
   #             }
   #             if ( !$type ) {
   #                 $type =
   #                   scalar @{$flows} ? $flows->[-1]->{type} : 'out-of-order';
   #             }

    #             if ( !scalar @{$flows} || $flows->[-1]->{type} ne $type ) {
    #                 push @{$flows}, { type => $type, packets => [], };
    #             }
    #         }

    #         push @{ $flows->[-1]->{packets} }, $pckt;
    #     }
    #     my $px = load_session_pxgrid( $sessions->[0]->{mac} );
    #     if ( is_plain_arrayref($px) && scalar @{$px} ) {
    #         push @{$flows}, { type => 'pxgrid', messages => $px };
    #     }
    #     $sessions->[0]->{flows} = $flows;
    #     delete $sessions->[0]->{flow};
    #     send_as
    #       JSON => { session => $sessions->[0], },
    #       { content_type => 'application/json; charset=UTF-8' };
    #     return;
    # }

    send_as
      JSON => { sessions => $sessions },
      { content_type => 'application/json; charset=UTF-8' };
};

get '/**?' => sub {
    #
    # Default catcher, show sessions of the server
    #
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

    my %sort = (
        column => ( $add_params{column} && $SORTABLE{ $add_params{column} } )
        ? scalar $add_params{column}
        : 'changed',
        order =>
          ( $add_params{order} && $add_params{order} =~ /^(a|de)sc$/isxm )
        ? uc scalar $add_params{order}
        : 'DESC',
        limit =>
          ( $add_params{limit} && $add_params{limit} =~ /^(\d+|all)$/isxm )
        ? int scalar $add_params{limit}
        : $DEFAULT_PER_PAGE,
        offset => ( $add_params{offset} && $add_params{offset} =~ /^\d+$/sxm )
        ? int scalar $add_params{offset}
        : undef,
        filter  => $add_params{filter} || undef,
        columns => $add_params{columns} // undef,
    );
    $sort{offset} //=
      (      $add_params{page}
          && $add_params{page} =~ /^\d+$/sxm
          && $sort{limit}      =~ /^\d+$/sxm )
      ? ( $add_params{page} - 1 ) * $sort{limit}
      : 0;

    my $sessions =
      load_sessions( { server => var('server'), bulk => var('bulk') },
        \%sort, undef, 'tacacs' );

    $sort{total} = $sessions->{total};
    $sort{pages} =
      ( $sort{limit} =~ /^\d+$/sxm && $sort{limit} > 0 )
      ? ceil( $sort{total} / $sort{limit} )
      : -1;

    body_parameters->set( 'no-content', 1 );
    send_as JSON => {
        state    => 'success',
        sessions => $sessions->{sessions},
        paging   => \%sort || undef,
        pxgrid   => config->{pxgrid} ? 1 : 0,
    };
};

prefix q{/};

1;
