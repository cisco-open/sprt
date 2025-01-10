package PRaGFrontend::dictionaries;

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use plackGen qw/save_attributes/;

use Data::GUID;
use HTTP::Status    qw/:constants/;
use List::MoreUtils qw/firstidx/;
use Readonly;
use Ref::Util qw/is_plain_arrayref/;
use English   qw( -no_match_vars );
use Syntax::Keyword::Try;

Readonly my $GLOBAL_USER => '__GLOBAL__';
Readonly my $PREFIX      => '/dictionaries';

super_only qw/dictionaries.add_global dictionaries.change_global/;

hook 'plugin.pragfrontend_plugins_menu.menu_collect' => sub {
    add_menu
      name  => 'my-settings',
      icon  => 'icon-configurations',
      title => 'Settings';

    add_submenu 'my-settings',
      {
        name  => 'dictionaries',
        title => 'Dictionaries',
        link  => $PREFIX . q{/},
      };
};

prefix $PREFIX;

get q{/?} => sub {
    if (serve_json) {
        send_as JSON => {
            state        => 'success',
            dictionaries => load_dictionaries(),
            types        => types_list(),
        };
    }
    else {
        send_as
          html => template 'dictionaries.tt',
          {
            active    => 'dictionaries',
            title     => 'Dictionaries',
            pageTitle => 'Dictionaries',
            forwarded => query_parameters->get('forwarded') // undef,
            messages  => query_parameters->get('messages')  // undef,
            types     => types_list(),
          };
    }
};

get '/new/?' => sub {
    forward $PREFIX. q{/};
};

get '/type/:type/**?' => sub {
    if ( !serve_json ) { forward $PREFIX. q{/}, { forwarded => 1 }; }

    my @more = splat;
    @more = scalar @more ? grep { $_ } @{ $more[0] } : ();

    my $options = {};
    if ( scalar @more && scalar(@more) % 2 == 0 ) {
        $options = {@more};
        if ( $options->{columns} ) {
            $options->{columns} = [ split /,/sxm, $options->{columns} ];
        }
    }

    send_as JSON => {
        state  => 'success',
        result => load_dictionaries(
            type    => allowed_types( route_parameters->get('type') ),
            columns => $options->{columns} // undef,
            combine => $options->{combine} // undef,
        ) // [],
    };
};

get '/name/:name/**?' => sub {
    if ( !serve_json ) { forward $PREFIX. q{/}, { forwarded => 1 }; }

    my @more = splat;
    @more = scalar @more ? grep { $_ } @{ $more[0] } : ();

    my $options = {};
    if ( scalar @more && scalar(@more) % 2 == 0 ) {
        $options = {@more};
        if ( $options->{columns} ) {
            $options->{columns} = [ split /,/sxm, $options->{columns} ];
        }
    }

    my $loaded;
    try {
        $loaded = load_dictionaries(
            name    => route_parameters->get('name'),
            columns => $options->{columns} // undef,
            combine => $options->{combine} // undef,
        );
    }
    catch {
        logging->error( 'Error on loading dictionary by name: ' . $EVAL_ERROR );
        send_error( q/Couldn't find dictionary/, HTTP_NOT_FOUND );
    };

    if ( !scalar @{$loaded} ) {
        send_error( q/Dictionary doesn't exist/, HTTP_NOT_FOUND );
    }

    send_as JSON => {
        state  => 'success',
        result => $loaded,
    };
};

get '/id/:id/' => sub {
    if ( !serve_json ) { forward $PREFIX. q{/}, { forwarded => 1 }; }

    my $loaded;
    try {
        $loaded = load_dictionaries(
            id      => route_parameters->get('id'),
            combine => 'none'
        );
    }
    catch {
        logging->error( 'Error on loading dictionary by ID: ' . $EVAL_ERROR );
        send_error( q/Couldn't find dictionary/, HTTP_NOT_FOUND );
    };

    if ( !scalar @{$loaded} ) {
        send_error( q/Dictionary doesn't exist/, HTTP_NOT_FOUND );
    }

    send_as JSON => {
        state  => 'success',
        result => $loaded->[0],
    };
};

get '/ids/**?' => sub {
    if ( !serve_json ) { forward $PREFIX. q{/}, { forwarded => 1 }; }

    my @more = splat;
    @more = scalar @more ? grep { $_ } @{ $more[0] } : ();

    my $options = {};
    if ( scalar @more && scalar(@more) % 2 == 0 ) {
        $options = {@more};
        if ( $options->{columns} ) {
            $options->{columns} = [ split /,/sxm, $options->{columns} ];
        }
    }

    my $ids = [ split /,/sxm, query_parameters->get('ids') ];

    my $loaded;
    try {
        $loaded = load_dictionaries(
            id      => $ids,
            columns => $options->{columns} // undef,
            combine => $options->{combine} // 'none',
        );
    }
    catch {
        logging->error( 'Error on loading dictionary by IDs: ' . $EVAL_ERROR );
        send_error( q/Couldn't find dictionary/, HTTP_NOT_FOUND );
    };

    if ( !scalar @{$loaded} ) {
        send_error( q/Dictionaries doesn't exist/, HTTP_NOT_FOUND );
    }

    send_as JSON => {
        state  => 'success',
        result => $loaded,
    };
};

post '/new/' => sub {
    my $make_global = body_parameters->get('make_global') // 0;
    if ($make_global) {
        user_allowed 'dictionaries.add_global',
          throw_error => 1,
          message     => 'You cannot create global dictionaries';
    }

    my $new_vals = {
        id      => Data::GUID->guid_string,
        type    => allowed_types( body_parameters->get('type') )->[0],
        owner   => $make_global ? $GLOBAL_USER : user->uid,
        name    => clear_dictionary_name( body_parameters->get('name') ),
        content => clear_dictionary_content( body_parameters->get('content') ),
    };

    try {
        database->quick_insert( config->{tables}->{dictionaries}, $new_vals );
    }
    catch {
        logging->error( 'Error on insert: ' . $EVAL_ERROR );
        send_error( q/Couldn't create dictionary/, HTTP_INTERNAL_SERVER_ERROR );
    };

    if ( !serve_json ) {
        forward $PREFIX. q{/},
          {
            forwarded => 1,
            messages  =>
              [ { type => 'success', message => 'Dictionary created' } ],
          },
          { method => 'GET' };
    }
    else {
        status HTTP_NO_CONTENT;
    }
};

any [ 'post', 'del' ] => '/id/:id/' => sub {
    my $users = [ user->uid ];
    if ( user_allowed 'dictionaries.change_global' ) {
        push @{$users}, $GLOBAL_USER;
    }

    my $cnt = database->quick_count(
        config->{tables}->{dictionaries},
        {
            owner => $users,
            id    => route_parameters->get('id'),
        }
    );

    if ( !$cnt ) {
        send_error(
            q/Dictionary doesn't exist or you don't have enought permissions/,
            HTTP_NOT_FOUND );
    }

    var id => route_parameters->get('id');
    pass;
};

post '/id/:id/' => sub {
    my $make_global = body_parameters->get('make_global') // 0;
    if ($make_global) {
        user_allowed 'dictionaries.add_global',
          throw_error => 1,
          message     => 'You cannot create global dictionaries';
    }

    my $new_vals = {
        type    => allowed_types( body_parameters->get('type') )->[0],
        owner   => $make_global ? $GLOBAL_USER : user->uid,
        name    => clear_dictionary_name( body_parameters->get('name') ),
        content => clear_dictionary_content( body_parameters->get('content') ),
    };

    try {
        database->quick_update( config->{tables}->{dictionaries},
            { id => vars->{id}, }, $new_vals );
    }
    catch {
        logging->error( 'Error on update: ' . $EVAL_ERROR );
        send_error( q/Couldn't update dictionary/, HTTP_INTERNAL_SERVER_ERROR );
    };

    if ( !serve_json ) {
        forward $PREFIX. q{/},
          {
            forwarded => 1,
            messages  =>
              [ { type => 'success', message => 'Dictionary updated' } ],
          },
          { method => 'GET' };
    }
    else {
        status HTTP_NO_CONTENT;
    }
};

del '/id/:id/' => sub {
    try {
        database->quick_delete( config->{tables}->{dictionaries},
            { id => vars->{id}, } );
    }
    catch {
        logging->error( 'Error on delete: ' . $EVAL_ERROR );
        send_error( q/Couldn't delete dictionary/, HTTP_INTERNAL_SERVER_ERROR );
    };

    if ( !serve_json ) {
        forward $PREFIX. q{/},
          {
            forwarded => 1,
            messages  =>
              [ { type => 'success', message => 'Dictionary deleted' } ],
          },
          { method => 'GET' };
    }
    else {
        status HTTP_NO_CONTENT;
    }
};

prefix q{/};

sub load_dictionaries {
    my $sort;
    if   ( scalar @_ > 1 ) { $sort       = {@_}; }
    else                   { $sort->{id} = shift; }

    $sort->{include_global} //= 1;
    $sort->{combine}        //= 'type';

    my $options = { order_by => $sort->{order_by} // { asc => 'name' }, };
    my $where   = { owner    => [ user->uid ], };
    if ( $sort->{include_global} ) {
        push @{ $where->{owner} }, $GLOBAL_USER;
    }

    if ( $sort->{id} ) {
        if ( is_plain_arrayref( $sort->{id} ) ) {
            $options->{limit} = scalar @{ $sort->{id} };
            $where->{id}      = $sort->{id};
        }
        else {
            $options->{limit} = 1;
            $where->{id}      = $sort->{id};
        }
    }
    elsif ( $sort->{name} ) {
        $where->{name} = { like => $sort->{name} };
    }

    if ( $sort->{type} )    { $where->{type}      = $sort->{type}; }
    if ( $sort->{columns} ) { $options->{columns} = $sort->{columns}; }

    logging->debug( 'Loading dictionaries, where: '
          . to_dumper($where)
          . ' options: '
          . to_dumper($options) );

    my @r = database->quick_select( config->{tables}->{dictionaries},
        $where, $options );
    if ( !scalar @r ) { return; }

    if ( $sort->{combine} eq 'type' ) {
        my $result = {};
        foreach my $el (@r) {
            $result->{ $el->{type} } //= [];
            push @{ $result->{ $el->{type} } }, $el;
        }
        $result->{labels} =
          { map { $_->{name} => $_->{title} } @{ types_list() } };
        return $result;
    }
    return \@r;
}

sub types_list {
    my $names_only = shift;
    my $sprtd      = [
        { name => 'ua',           title => 'User Agents', },
        { name => 'credentials',  title => 'Credentials', },
        { name => 'form',         title => 'Form Fields', },
        { name => 'mac',          title => 'MAC Addresses', },
        { name => 'ip',           title => 'IP Addresses', },
        { name => 'unclassified', title => 'Unclassified', },
    ];

    if ($names_only) {
        return [ map { $_->{name} } @{$sprtd} ];
    }
    else {
        return $sprtd;
    }
}

sub allowed_types {
    my @list  = split /,/sxm, shift;
    my $sprtd = types_list(1);
    my @alwd;

    foreach my $e (@list) {
        if ( ( firstidx { $_ eq $e } @{$sprtd} ) >= 0 ) {
            push @alwd, $e;
        }
    }

    if ( scalar @alwd < 1 ) {
        send_error( 'All provided types are unsupported', HTTP_BAD_REQUEST );
        return;
    }
    else {
        return \@alwd;
    }
}

sub clear_dictionary_name {
    my $name = shift;
    return $name;
}

sub clear_dictionary_content {
    my $content = shift;
    $content =~ s/\r\n/\n/gsxm;
    return $content;
}

1;
