package PRaGFrontend::logs;

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use PRaGFrontend::Plugins::Logger;

use English qw/-no_match_vars/;
use Syntax::Keyword::Try;
use Archive::Zip qw(:CONSTANTS :ERROR_CODES);
use IO::Scalar;
use DateTime;
use HTTP::Status    qw/:constants/;
use POSIX           qw/strftime floor/;
use List::MoreUtils qw/uniq/;
use Readonly;

use PRaG::Util::Folders qw/remove_folder_if_empty/;

super_only qw/logs.read logs.remove/;

Readonly my $PREFIX => '/logs';

Readonly my %ORDERABLE => (
    'last_update' => 1,
    'owner'       => 1,
);

hook 'plugin.pragfrontend_plugins_menu.menu_collect' => sub {
    return if ( !user_allowed 'logs.read' );

    add_menu
      name  => 'tools',
      icon  => 'icon-tools',
      title => 'Tools';

    add_submenu 'tools',
      {
        name  => 'logs',
        icon  => 'icon-syslog',
        title => 'Logs',
        link  => '/logs/',
      };
};

prefix $PREFIX;
get q{/?} => sub {
    #
    # Main logs page
    #
    user_allowed 'logs.read', throw_error => 1;

    my $owners = load_log_owners();

    if (serve_json) {
        send_as JSON => { owners => $owners, };
    }
    else {
        send_as
          html => template 'react.tt',
          {
            active    => 'logs',
            ui        => 'logs',
            title     => 'Logs',
            pageTitle => 'Logs',
          };
    }
};

get '/**?' => sub {
    if ( !serve_json ) {
        forward $PREFIX . q{/},
          {
            forwarded => 0,
            result    => [],
          };
    }
    pass;
};

get '/owner/:owner/**?' => sub {
    #
    # Main catcher, check if owner is known
    #
    var owner => route_parameters->get('owner');
    if (
        !database->quick_lookup(
            config->{tables}->{logs}, { owner => [ owner_pack() ] },
            'owner'
        )
      )
    {
        send_error( 'Owner <strong>' . vars->{owner} . '</strong> not found.',
            HTTP_NOT_FOUND );
    }
    pass;
};

get '/owner/:owner/' => sub {
    #
    # Load chunks
    #
    # user_allowed 'logs.read', throw_error => 1;

    my @op = owner_pack();
    my $sql =
      sprintf
q/SELECT chunk, MIN(timestamp) AS started, COUNT(id) AS count, owner FROM %s/
      . q/ WHERE owner IN (%s) GROUP BY chunk, owner ORDER BY started DESC/,
      config->{tables}->{logs},
      join q{,}, (q{?}) x scalar @op;
    debug $sql;
    my $sth = database->prepare($sql);
    if ( !defined $sth->execute(@op) ) {
        logging->error( 'SQL exception: ' . $sth->errstr );
        send_error( 'SQL exception: ' . $sth->errstr,
            HTTP_INTERNAL_SERVER_ERROR );
    }

    my $chunks = $sth->fetchall_arrayref( {} );

    send_as JSON => {
        state      => 'success',
        chunks     => $chunks,
        logs_owner => vars->{owner},
        pack       => \@op
    };
};

get '/owner/:owner/no-chunks/**?' => sub {

    # user_allowed 'logs.read', throw_error => 1;

    # if ( !serve_json ) { forward '/owner/' . vars->{owner} . q{/}; }

    my @more = splat;
    @more = scalar @more ? grep { $_ ne q{} } @{ $more[0] } : ();

    my $options = {};
    if ( scalar @more && scalar(@more) % 2 == 0 ) {
        $options = {@more};
        if ( $options->{columns} ) {
            $options->{columns} = [ split /,/sxm, $options->{columns} ];
        }
        if ( $options->{order_by} && $options->{order_by} !~ /,/sxm ) {
            $options->{order_by} = 'asc' . $options->{order_by};
        }
        if ( $options->{order_by} ) {
            $options->{order_by} = { split /,/sxm, $options->{order_by} };
        }
    }

    debug to_dumper($options);

    my $total = database->quick_count(
        config->{tables}->{logs},
        { owner => [ owner_pack() ], },
    );

    $options->{columns} //=
      [ 'id', 'timestamp', 'loglevel', 'message', 'owner' ];
    $options->{limit} //= 1_000;
    $options->{offset} //=
      floor( $total / $options->{limit} ) * $options->{limit};
    $options->{offset} = $options->{offset} < 0 ? 0 : $options->{offset};
    $options->{order_by} //= { asc => 'timestamp' };

    my @lines = database->quick_select( config->{tables}->{logs},
        { owner => [ owner_pack() ], }, $options, );

    send_as JSON => {
        state      => 'success',
        logs       => \@lines,
        total      => $total,
        offset     => $options->{offset},
        limit      => $options->{limit},
        logs_owner => vars->{owner},
    };
};

get '/owner/:owner/chunk/:chunk/' => sub {
    #
    # Load particular chunk
    #
    # user_allowed 'logs.read', throw_error => 1;

    my $logs = [
        database->quick_select(
            config->{tables}->{logs},
            { chunk => route_parameters->get('chunk'), owner => vars->{owner} },
            { order_by => { asc => 'timestamp' } }
        )
    ];

    send_as JSON => {
        state      => 'success',
        logs       => $logs,
        chunk      => route_parameters->get('chunk'),
        logs_owner => vars->{owner}
    };
};

get '/owner/:owner/chunk/:chunk/download/:format/' => sub {
    my $logs = join "\n",
      map { $_->{timestamp} . q{: } . $_->{loglevel} . q{: } . $_->{message} }
      database->quick_select(
        config->{tables}->{logs},
        { chunk    => route_parameters->get('chunk'), owner => vars->{owner} },
        { order_by => { asc => 'timestamp' } }
      );

    if ( route_parameters->get('format') eq 'txt' ) {
        send_file \$logs,
          content_type => 'text/plain',
          filename     => 'sprt_logs.txt';
    }

    my $zip_contents = q{};
    my $SH           = IO::Scalar->new( \$zip_contents );

    my $zip    = Archive::Zip->new();
    my $member = $zip->addString( $logs, 'sprt_logs.txt' );
    $member->desiredCompressionMethod(COMPRESSION_DEFLATED);
    $member->desiredCompressionLevel(COMPRESSION_LEVEL_FASTEST);

    my $status = $zip->writeToFileHandle($SH);

    send_file \$zip_contents,
      content_type => 'application/zip',
      filename     => 'sprt_logs.zip';
};

get '/owner/:owner/chunk/:chunk/preview/' => sub {

    # user_allowed 'logs.read', throw_error => 1;

    my $logs = [
        database->quick_select(
            config->{tables}->{logs},
            { chunk => route_parameters->get('chunk'), owner => vars->{owner} },
            { order_by => { asc => 'id' },             limit => 2 }
        )
    ];
    send_as JSON => {
        state      => 'success',
        logs       => $logs,
        chunk      => route_parameters->get('chunk'),
        logs_owner => vars->{owner}
    };
};

get '/owner/:owner/remove/:chunk/' => sub {
    #
    # Remove chunk or all chunks
    #
    # user_allowed 'logs.remove', throw_error => 1;

    my $chunk   = route_parameters->get('chunk');
    my $where   = { owner => [ owner_pack() ] };
    my $forward = '/logs/';
    if ( $chunk ne 'all' ) {
        $where->{chunk} = $chunk;
        $forward .= 'owner/' . vars->{owner} . q{/};
    }

    my @files = database->quick_select( config->{tables}->{logs},
        { %{$where}, message => { ilike => 'file:%' } } );

    if ( scalar @files ) {
        @files = map { $_->{message} =~ s/^file://sxmr } @files;
        logging->debug( 'Files to delete:' . "\n" . join "\n", @files );
        for my $file (@files) {
            next if not -e $file;
            try {
                logging->debug(qq{Deleting $file});
                unlink $file;
            }
            catch {
                logging->warn(qq{Couldn't remove file $file: $EVAL_ERROR});
            };
        }
        remove_folder_if_empty( $files[0] );
    }

    database->quick_delete( config->{tables}->{logs}, $where );

    send_as JSON => { state => 'success' };
};

prefix q{/};

sub load_log_owners {
    my %opts = @_;

    my $order_by = query_parameters->get('order_by');
    $order_by = $ORDERABLE{$order_by} ? $order_by : 'last_update';

    my $order_how =
      query_parameters->get('order_how') =~ /^(a|de)sc$/sxmi
      ? uc query_parameters->get('order_how')
      : 'DESC';

    my $sql =
      q/SELECT "owner", max(timestamp) as "last_update" FROM /
      . config->{tables}->{logs};

    if ( $opts{owner_only} ) {
        $sql .= q/ WHERE "owner" IN (/ . join q{,},
          map { database->quote($_) } owner_pack() . q/)/;
    }

    $sql .=
        q/ GROUP BY "owner" ORDER BY /
      . database->quote_identifier($order_by) . q/ /
      . $order_how;

    my $sth = database->prepare($sql);
    if ( !defined $sth->execute() ) {
        logging->error( 'SQL exception: ' . $sth->errstr );
        send_error( 'SQL exception: ' . $sth->errstr,
            HTTP_INTERNAL_SERVER_ERROR );
    }

    my $owners = $sth->fetchall_arrayref( {} );
    if ( scalar @{$owners} ) {
        foreach my $i ( @{$owners} ) {
            $i->{owner} =~ s/__(watcher|generator|udp_server)//sxm;
        }
        my %added = ();
        $owners = [
            grep {
                $added{ $_->{owner} }
                  ? undef
                  : ( $added{ $_->{owner} } = 1 )
            } @{$owners}
        ];
    }

    return $owners;
}

Readonly my @POSTFIXES => qw/__watcher __generator __udp_server/;

sub owner_pack {
    my $o    = shift // vars->{owner};
    my @tags = split /__/sxm, $o;
    if ( scalar @tags == 2 && $tags[1] ne '__api' ) {
        $o = $tags[0];
    }
    if ( scalar @tags > 2 ) {
        return ($o);
    }

    return (
        $o,
        map( { $o . $_ } @POSTFIXES ),
        $o . '__api',
        map( { $o . '__api' . $_ } @POSTFIXES ),
    );
}

1;
