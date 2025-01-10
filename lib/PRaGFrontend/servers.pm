package PRaGFrontend::servers;

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use plackGen qw/prepare_sort/;

use Data::GUID;
use DateTime;
use HTTP::Status    qw/:constants/;
use JSON::MaybeXS   ();
use List::MoreUtils qw/sort_by/;
use Net::DNS;
use Net::Interface     qw/inet_pton full_inet_ntop ipV6compress/;
use POSIX              qw/strftime ceil/;
use Regexp::Common     qw/net/;
use String::ShellQuote qw/shell_quote/;
use English            qw( -no_match_vars );
use Syntax::Keyword::Try;
use Readonly;
use Ref::Util qw/is_plain_arrayref is_plain_hashref is_ref/;

hook 'plugin.pragfrontend_plugins_menu.menu_collect' => sub {
    add_menu
      name  => 'my-settings',
      icon  => 'icon-configurations',
      title => 'Settings';

    add_submenu 'my-settings',
      {
        name  => 'servers',
        title => 'Servers',
        link  => '/servers/',
      };
};

prefix '/servers';
del q{/?} => sub {
    my $rv = delete_servers( body_parameters->get('servers') );
    if (serve_json) {
        send_as JSON => $rv;
    }
    else {
        forward '/servers/', { forwarded => 1, result => [$rv] },
          { method => 'GET' };
    }
};

get '/id/:id/' => sub {
    if ( !serve_json ) { forward '/servers/'; }

    my $server = load_servers( route_parameters->get('id') );
    if ( scalar @{$server} ) {
        send_as JSON => { server => $server->[0] };
    }
    else {
        send_error( 'Server ' . route_parameters->get('id') . ' not found.',
            HTTP_NOT_FOUND );
    }
};

post '/id/:id/' => sub {
    my $server;
    if ( body_parameters->get('server') ) {
        $server = body_parameters->get('server');
        $server->{id} = route_parameters->get('id');
    }
    else {
        $server = {
            id         => body_parameters->get('id'),
            address    => body_parameters->get('server-ip'),
            auth_port  => body_parameters->get('auth-port'),
            acct_port  => body_parameters->get('acct-port'),
            coa        => body_parameters->get('coa') ? 'TRUE' : 'FALSE',
            group      => body_parameters->get('group'),
            attributes => {
                friendly_name     => body_parameters->get('friendly-name'),
                shared            => body_parameters->get('shared-secret'),
                dns               => body_parameters->get('dns'),
                no_session_action => body_parameters->get('no-session-action'),
                coa_nak_err_cause => body_parameters->get('error-cause'),
                no_session_dm_action =>
                  body_parameters->get('no-session-dm-action'),
                dm_err_cause => body_parameters->get('dm-error-cause'),
                v6_address   => body_parameters->get('server-ipv6'),
            }
        };
    }

    # Overwrite user
    $server->{owner} = user->uid;

    if ( !$server->{address} && !$server->{attributes}->{v6_address} ) {
        send_error( 'At least one address must be specified (IPv4 or IPv6)',
            HTTP_BAD_REQUEST );
    }

    if (   $server->{attributes}->{dns}
        && $server->{attributes}->{dns} !~ /^$RE{net}{IPv4}$/sxm )
    {
        send_error( 'DNS address is not an IPv4 address', HTTP_BAD_REQUEST );
    }

    if ( $server->{address} ) {
        if ( $server->{address} !~ /^$RE{net}{IPv4}$/sxm ) {
            return if ( !check_dns($server) );
        }
        else { $server->{attributes}->{resolved} = $server->{address}; }
    }
    else { $server->{address} = q{}; }

    if (   $server->{attributes}->{v6_address}
        && $server->{attributes}->{v6_address} !~ /^$RE{net}{IPv6}$/sxm )
    {
        send_error( 'Incorrect IPv6 address', HTTP_BAD_REQUEST );
    }
    $server->{attributes}->{v6_address} =
      ipV6compress( $server->{attributes}->{v6_address} );

    $server->{attributes} =
      JSON::MaybeXS->new( utf8 => 1 )->encode( $server->{attributes} );
    if ( $server->{id} eq 'new' ) {
        $server->{id} = Data::GUID->guid_string;
        try { database->quick_insert( config->{tables}->{servers}, $server ); }
        catch {
            logging->debug( 'DB exception:' . $EVAL_ERROR );
        };
        if ( database->err ) {
            if ( database->errstr =~ /duplicate.*"full_server"/isxm ) {
                send_error(
                    'Server '
                      . $server->{address} . ' ('
                      . $server->{auth_port} . q{:}
                      . $server->{acct_port}
                      . ') already exists.',
                    HTTP_BAD_REQUEST
                );
            }
            else { send_error( database->errstr, HTTP_INTERNAL_SERVER_ERROR ); }
        }
        else { send_as JSON => { status => 'ok', id => $server->{id} }; }
    }
    else {
        my $where = { id => $server->{id}, owner => $server->{owner} };
        delete $server->{id};
        delete $server->{owner};
        database->quick_update( config->{tables}->{servers}, $where, $server );
        if ( database->err ) {
            send_error( database->errstr, HTTP_INTERNAL_SERVER_ERROR );
        }
        else { send_as JSON => { status => 'ok' }; }
    }
};

get '/groups/' => sub {
    my $term = query_parameters->get('term') || undef;
    my $grps = load_server_groups($term)     || [];

    send_as JSON => [ map { $_->[0] } @{$grps} ];
};

get '/dropdown/' => sub {
    forward '/servers/dropdown/radius/v4/';
};

get qr{/dropdown/(v[46])/}sxm => sub {
    my ($version) = splat;
    forward '/servers/dropdown/radius/' . $version . q{/};
};

sub make_server_obj {
    my ( $data, $proto ) = @_;

    if ( $proto eq 'radius' ) {
        return {
            link  => '/servers/id/' . $data->{id} . q{/},
            id    => $data->{id},
            title => '<span>'
              . ( $data->{attributes}->{friendly_name} || $data->{address} )
              . q{ }
              . '(<span class="text-muted">'
              . $data->{address} . q{/}
              . $data->{auth_port} . q{:}
              . $data->{acct_port}
              . ',&nbsp;</span>'
              . (
                $data->{coa}
                ? '<span class="text-success">CoA</span>'
                : '<span class="text-warning">No CoA</span>'
              )
              . ')'
              . '</span>',
            type => 'link'
        };
    }
    else {
        return {
            link       => '/servers/id/' . $data->{id} . q{/},
            id         => $data->{id},
            attributes => $data,
            type       => 'link'
        };
    }
}

get qr{
		/dropdown
		/(?<proto> radius | tacacs)
		/(?<version> v[46])
		/
	}sxm => sub {
    #
    # For JS script to generate dropdown
    #
    my $value_for = captures;
    my $servers   = load_servers(
        {
            order   => 'asc',
            column  => 'friendly_name',
            version => $value_for->{'version'},
            tacacs  => $value_for->{'proto'} eq 'tacacs' ? 1 : 0
        }
    );
    if ( !is_plain_arrayref($servers) || !scalar @{$servers} ) {
        send_as JSON => ['empty'];
    }
    else {
        send_as JSON => [
            {
                title  => 'Servers',
                type   => 'header-full',
                values => [
                    map { make_server_obj( $_, $value_for->{'proto'} ) }
                      @{$servers}
                ]
            }
        ];
    }
};

get '/**?' => sub {
    #
    # Main servers page
    #
    logging->debug('Main servers page requested');
    if (serve_json) {
        my ($r) = splat;

        Readonly my $NO_PAGE => -1;

        my $sortable = {
            'server'        => 'address',
            'address'       => 'address',
            'group'         => 'group',
            'friendly_name' => 'friendly_name',
        };

        logging->debug( 'Splat: ' . to_dumper($r) );
        my $sort = prepare_sort( $sortable, $r, 'friendly_name', 'asc' );
        if ( query_parameters->get('all') ) {
            $sort->{all} = 1;
        }
        logging->debug( 'Sort: ' . to_dumper($sort) );
        my $servers = load_servers($sort);

        $sort->{total} = database->quick_count( config->{tables}->{servers},
            { owner => user->real_uid } );
        $sort->{pages} =
          ( $sort->{limit} =~ /^\d+$/sxm && $sort->{limit} > 0 )
          ? ceil( $sort->{total} / $sort->{limit} )
          : $NO_PAGE;
        var 'paging' => $sort;

        send_as JSON => {
            state   => 'success',
            servers => $servers,
            paging  => vars->{paging} || undef,
        };
    }
    else {
        send_as
          html => template 'react.tt',
          {
            active    => 'servers',
            ui        => 'servers',
            title     => 'Servers',
            pageTitle => 'Servers'
          };
    }
};

prefix q{/};

sub decode_attributes {
    my $v = shift;
    if ( exists $v->{attributes} ) {
        $v->{attributes} =
          JSON::MaybeXS->new( utf8 => 1 )->decode( $v->{attributes} );
    }
    return $v;
}

Readonly my $ALLOWED_SERVERS_FILTERS => {
    address => sub {
        my ( $how, $where ) = @_;
        ${$where} .=
            ' AND ('
          . database->quote_identifier('address')
          . ' ILIKE '
          . database->quote($how) . q{ OR }
          . database->quote_identifier('attributes')
          . q{->>'v6_address'}
          . ' ILIKE '
          . database->quote($how) . q{)};
        return;
    },
    group => sub {
        my ( $how, $where ) = @_;
        ${$where} .= ' AND '
          . database->quote_identifier('group')
          . ' ILIKE '
          . database->quote($how);
        return;
    },
    friendly_name => sub {
        my ( $how, $where ) = @_;
        ${$where} .= ' AND '
          . database->quote_identifier('attributes')
          . q{->>'friendly_name'}
          . ' ILIKE '
          . database->quote($how);
        return;
    },
};

sub _ls_add_filter {
    my ( $where, $filter ) = @_;
    if ($filter) {
        my ( $what, $how ) = split /=/sxm, $filter, 2;
        if ( $how && ( my $cb = $ALLOWED_SERVERS_FILTERS->{$what} ) ) {
            $cb->( $how, $where );
        }
        else {
            ${$where} .= ' AND (';
            my @t = (
                database->quote_identifier('address')
                  . ' ILIKE '
                  . database->quote( q{%} . $filter . q{%} ),
                database->quote_identifier('group')
                  . ' ILIKE '
                  . database->quote( q{%} . $filter . q{%} ),
            );
            ${$where} .= join( ' OR ', @t ) . q{)};
        }
    }
    return;
}

sub _ls_add_version {
    my ( $where, $version ) = @_;
    if ( $version eq 'v6' ) {
        ${$where} .= ' AND '
          . database->quote_identifier('attributes')
          . q{->>'v6_address' IS NOT NULL } . ' AND '
          . database->quote_identifier('attributes')
          . q{->>'v6_address' <> '' };
    }
    else {
        ${$where} .=
          ' AND ' . database->quote_identifier('address') . q{ <> ''};
    }
    return;
}

sub _ls_add_proto {
    my ( $where, $tacacs ) = @_;
    if ($tacacs) {
        ${$where} .=
            ' AND ('
          . database->quote_identifier('attributes')
          . q{->>'tacacs')::boolean};
    }
    else {
        ${$where} .=
            ' AND (('
          . database->quote_identifier('attributes')
          . q{->>'radius')::boolean = TRUE OR }
          . database->quote_identifier('attributes')
          . q{->>'radius' IS NULL)};
    }
    return;
}

sub load_servers {
    my $sort = shift;

    my $options = {};
    my $where;
    if ( $sort && !is_ref($sort) ) {
        $where = { id => $sort, owner => user->real_uid };
    }
    elsif ( is_plain_hashref($sort) ) {
        if ( $sort->{id} ) {
            $options->{limit} = 1;
            $where->{id}      = $sort->{id};
        }
        else {
            $options->{order_by} = {};
            $options->{order_by}->{ $sort->{order} } = $sort->{column};
            if ( $options->{order_by}->{ $sort->{order} } eq 'friendly_name' ) {
                delete $options->{order_by}->{ $sort->{order} };
                delete $options->{order_by};
            }
            if ( $sort->{limit} && $sort->{limit} =~ /^\d+$/sxm ) {
                $options->{limit} = $sort->{limit};
            }
            $options->{offset} = $sort->{offset};
            $where = database->quote_identifier('owner') . ' = '
              . database->quote( $sort->{user} // user->real_uid );

            _ls_add_filter( \$where, $sort->{filter} );
            _ls_add_version( \$where, $sort->{version} );
            if ( !$sort->{all} ) {
                _ls_add_proto( \$where, $sort->{tacacs} );
            }
        }
    }

    logging->debug( 'Loading servers, where: '
          . to_dumper($where)
          . ' options: '
          . to_dumper($options) );

    my @r =
      map { decode_attributes($_) }
      database->quick_select( config->{tables}->{servers}, $where, $options );

    if ( !scalar @r ) { return; }
    if ( is_plain_hashref($sort) && $sort->{version} eq 'v6' ) {
        foreach my $el (@r) {
            $el->{address} = $el->{attributes}->{v6_address};
        }
    }

    if ( is_plain_hashref($sort) && $sort->{column} eq 'friendly_name' ) {
        @r = sort_by { $_->{attributes}->{friendly_name} || q{} } @r;
        if ( $sort->{order} =~ /desc/ism ) { @r = reverse @r; }
    }
    return \@r;
}

sub load_server_groups {
    my $filter = shift;
    my $sql =
        q/SELECT DISTINCT "group" FROM /
      . config->{tables}->{servers}
      . q/ WHERE length("group") > 0/
      . q/ AND "owner" = /
      . database->quote( user->uid );

    if ($filter) {
        $sql .=
          q/ AND "group" ILIKE / . database->quote( q{%} . $filter . q{%} );
    }
    my $sth = database->prepare($sql);
    if ( !defined $sth->execute() ) {
        send_error( 'SQL exception: ' . $sth->errstr,
            HTTP_INTERNAL_SERVER_ERROR );
    }

    return $sth->fetchall_arrayref( [0] );
}

sub check_dns {
    my $server = shift;

    Readonly my $TIMEOUT => 5;

    my $resolver;
    debug 'Creating DNS resolver';
    if ( $server->{attributes}->{dns} ) {
        $resolver =
          Net::DNS::Resolver->new(
            nameservers => [ $server->{attributes}->{dns} ] );
    }
    else { $resolver = Net::DNS::Resolver->new(); }
    debug 'Setting timeout';
    $resolver->udp_timeout($TIMEOUT);
    $resolver->tcp_timeout($TIMEOUT);
    debug 'Searching ' . $server->{address};
    my $handle = $resolver->bgsend( $server->{address}, 'A' );

    while ( $resolver->bgbusy($handle) ) {

        # just wait
    }

    debug 'Got something';
    my $reply = $resolver->bgread($handle);
    if ($reply) {
        my $rr = $reply->pop('pre');
        if ( $rr && $rr->can('address') ) {
            $server->{attributes}->{resolved} = $rr->address;
            return 1;
        }
        else {
            send_error(
                'DNS query failed: no address for ' . $server->{address},
                HTTP_BAD_REQUEST );
        }
    }
    else {
        send_error( 'DNS query failed: ' . $resolver->errorstring,
            HTTP_BAD_REQUEST );
    }
    return;
}

sub delete_servers {
    #
    # Remove servers completely
    #
    my $servers = shift;

    return { type => 'error', message => 'Nothing specified.' }
      if ( !$servers );

    my $where = { owner => user->uid };
    my $ok;

    if ( $servers =~ /^array:(([[:digit:][:lower:]-]+,?)+)$/isxm ) {
        $where->{id} = [ split( /,/sxm, $1 ) ];
        $ok = 'Servers removed.';
    }
    elsif ( $servers =~ /^id:([[:digit:][:lower:]-]+)$/isxm ) {
        $where->{id} = $1;
        $ok = 'Server removed.';
    }
    elsif ( $servers =~ /^all$/isxm ) {
        $ok = 'All servers removed.';
    }
    else {
        send_error( q{Couldn't parse servers, unknown value } . $servers,
            HTTP_INTERNAL_SERVER_ERROR );
    }

    database->quick_delete( config->{tables}->{servers}, $where );
    if ( database->err ) {
        send_error( 'DB error: ' . database->errstr,
            HTTP_INTERNAL_SERVER_ERROR );
    }
    return { type => 'success', message => $ok, refresh => 1 };
}

1;
