package PRaGFrontend::generate;
use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use plackGen qw/
  load_servers
  start_process
  load_user_attributes
  check_processes
  collect_nad_ips
  is_ip
  save_cli
  /;

use Data::GUID;
use English qw/-no_match_vars/;
use File::Basename;
use HTTP::Status    qw/:constants/;
use JSON::MaybeXS   ();
use List::MoreUtils qw/firstidx/;
use Net::DNS::Nslookup;
use PRaGFrontend::variables qw/:definitions :proto proto_parameters/;
use Readonly;
use Regexp::Common     qw/net/;
use Regexp::Util       qw/:all/;
use Ref::Util          qw/is_plain_arrayref/;
use String::ShellQuote qw/shell_quote/;
use PerlX::Maybe;

use utf8;

my ( %dict_id, %dict_name, %dict_val, %dict_vendor_id, %dict_vendor_name,
    %included_files, %dict_by_dictname );

# Internal constants
Readonly my %PROTOCOLS => (
    'mab'          => 'mab',
    'pap'          => 'pap',
    'eap-tls'      => 'eap-tls',
    'eap-mschapv2' => 'eap-mschapv2',
    'peap'         => 'peap',
);

Readonly my $GET_REG => join q{|}, keys %PROTOCOLS;

Readonly my %PROTO_SPECIFIC => (
    'eap-tls' => {
        title => 'EAP-TLS Parameters',
        proto_parameters('eap-tls'),
    },
    'pap' => {
        title => 'PAP/CHAP Parameters',
        proto_parameters('pap'),
    },
    'eap-mschapv2' => {
        title => 'EAP-MSCHAPv2',
        proto_parameters('eap-mschapv2'),
    },
    'peap' => {
        title => 'PEAP',
        proto_parameters('peap'),
    },
);

Readonly my $NO_VENDOR   => 'not defined';
Readonly my $ATTR_VENDOR => 26;

hook 'plugin.pragfrontend_plugins_menu.menu_collect' => sub {
    add_menu
      name  => 'generate',
      icon  => 'icon-add-outline',
      title => 'Generate';

    add_submenu 'generate',
      {
        name     => 'generate-radius',
        title    => 'RADIUS',
        class    => 'proto-select',
        children => [
            {
                name       => 'generate-mab',
                link       => '/generate/mab/',
                title      => 'MAB',
                class      => 'proto-select',
                attributes => 'data-protocol="mab"',
            },
            {
                name       => 'generate-pap',
                link       => '/generate/pap/',
                title      => 'PAP/CHAP',
                class      => 'proto-select',
                attributes => 'data-protocol="pap"',
            },
            {
                name       => 'generate-peap',
                link       => '/generate/peap/',
                title      => 'PEAP',
                class      => 'proto-select',
                attributes => 'data-protocol="peap"',
            },
            {
                name       => 'generate-eaptls',
                link       => '/generate/eap-tls/',
                title      => 'EAP-TLS',
                class      => 'proto-select',
                attributes => 'data-protocol="eap-tls"',
            }
        ]
      };
};

# Routes
prefix '/generate';
get qr{/(($GET_REG)/.*)?}sxm => sub {
    #
    # Main generate page
    #
    logging->debug('Main generate page requested');
    get_radius_attributes();

    my $nad = {
        %{ config->{nad} },
        %{ config->{radius} },
        ( ips => collect_nad_ips() ),
        session_id => config->{generator}->{patterns}->{session_id},
    };

    send_as
      html => template 'generate.tt',
      {
        active     => 'generate',
        title      => 'Sessions generation',
        pageTitle  => 'Generate New RADIUS Sessions',
        dictionary => {
            values        => \%dict_val,
            names         => \%dict_name,
            by_dictionary => \%dict_by_dictname,
            by_vendor     => \%dict_vendor_name
        },
        nad => $nad,
      };
};

post q{/?} => sub {
    #
    # Start sessions generation here
    #
    return if !check_processes();

    my @messages;
    my $proto = $PROTOCOLS{ body_parameters->get('protocol') } // 'mab';

    if ( !is_ip( body_parameters->get('server-ip') ) ) {
        my $dns_resp =
          Net::DNS::Nslookup->get_ips( body_parameters->get('server-ip') );
        if ( $dns_resp =~ /($RE{net}{IPv4})/sxm ) {
            body_parameters->set( 'server-ip', $1 );
        }
        else {
            send_error(
                q{Could not resole FQDN <strong>'}
                  . body_parameters->get('server-ip')
                  . q{'</strong>. Try another FQDN or use IP address.},
                HTTP_BAD_REQUEST
            );
        }
    }

    if (   body_parameters->get('count') !~ /^\d+$/sxm
        || body_parameters->get('count') < 1
        || body_parameters->get('count') > config->{processes}->{max_sessions} )
    {
        send_error(
            q{Count should be an integer between 1 and }
              . config->{processes}->{max_sessions} . q{.},
            HTTP_NOT_ACCEPTABLE
        );
    }

    body_parameters->set( 'save-sessions',
        body_parameters->get('save-sessions') ? 1 : 0 );
    if (   body_parameters->get('save-sessions')
        && body_parameters->get('bulk-name') )
    {
        body_parameters->set( 'save-bulk', 1 );
    }

    logging->debug( q{Save bulk: } . body_parameters->get('save-bulk') );

    if ( body_parameters->get('save-bulk') ) {
        if ( body_parameters->get('bulk-name') ) {
            my $bn = shell_quote(
                body_parameters->get('bulk-name') =~ s/[\/\\\s]/_/rg );
            logging->debug("Sanified bulk name: $bn");
            body_parameters->set( 'bulk-name', $bn );
        }
        else {
            body_parameters->set( 'save-bulk', 0 );
            body_parameters->set( 'bulk-name', 'none' );
            push @messages,
              {
                type    => q{alert},
                message =>
                  q{Bulk will not be created: bulk name was not specified.}
              };
        }
    }
    else {
        body_parameters->set( 'save-bulk', 0 );
        body_parameters->set( 'bulk-name', 'none' );
    }

    if ( !length body_parameters->get('shared-secret') ) {
        send_error( q{Shared secret should be specified.},
            HTTP_NOT_ACCEPTABLE );
    }

    if (   body_parameters->get('latency') !~ /^\d+(?:[.]{2}\d+)?$/sxm
        || body_parameters->get('latency') < 0 )
    {
        body_parameters->set( 'latency', 0 );
        push @messages,
          { type => q{alert}, message => q{Latency dropped to 0.} };
    }

    if (   body_parameters->get('proc-name')
        && body_parameters->get('proc-name') !~ /^[a-z\d_]+$/isxm )
    {
        send_error(
            q{Only the following symbols are allowed for job name:}
              . q{<br>Latin letters (a-z)}
              . q{<br>Numbers (0-9)}
              . q{<br>Underscore (_)},
            HTTP_NOT_ACCEPTABLE
        );
    }

    Readonly my $MIN_MTU     => 120;
    Readonly my $MAX_MTU     => 65_535;
    Readonly my $DEFAULT_MTU => 1_300;

    if (   body_parameters->get('framed-mtu') !~ /^\d+$/sxm
        || body_parameters->get('framed-mtu') < $MIN_MTU
        || body_parameters->get('framed-mtu') > $MAX_MTU )
    {
        body_parameters->set( 'framed-mtu', $DEFAULT_MTU );
        push @messages,
          { type => q{alert}, message => q{Framed-MTU set to 1300.} };
    }

    if ( body_parameters->get('save-server') ) {
        save_server(
            address   => body_parameters->get('server-ip'),
            auth_port => body_parameters->get('auth-port'),
            acct_port => body_parameters->get('acct-port'),
            shared    => body_parameters->get('shared-secret')
        );
    }

    my $collectables   = body_parameters->get('collectables');
    my $proto_specific = $collectables->{ $proto . '-params' } // undef;

    my $coa = format_coa($collectables);

    my $dicts       = body_parameters->get('radius')->{dicts};
    my $clear_dicts = [];
    if ( $dicts && is_plain_arrayref($dicts) ) {
        foreach my $i ( 0 .. $#{$dicts} ) {
            my $n = $dicts->[$i];
            $n =~ s/[^A-Za-z0-9\-\.=]/_/g;
            $n =~ s/[.]{2}/__/g;

            if ( !-e config->{dynamic_dictionaries}->{path} . $n ) {
                logging->warn(qq/Dictionary $n not found/);
            }
            else {
                push @{$clear_dicts},
                  config->{dynamic_dictionaries}->{path} . $n;
            }
        }
    }
    else {
        logging->warn(q/Incorrect dictionaries format/);
        $clear_dicts = undef;
    }

    if (   exists $collectables->{'guest-flow'}
        && exists $collectables->{'guest-flow'}->{'user-agents'} )
    {
        $collectables->{'guest-flow'}->{'GUEST_FLOW'} = {
            %{ $collectables->{'guest-flow'}->{'GUEST_FLOW'} },
            (
                'user-agents' => {
                    'dictionary' =>
                      $collectables->{'guest-flow'}->{'user-agents'},
                    'how-to-follow' =>
                      $collectables->{'guest-flow'}->{'how-to-follow'},
                    'disallow-repeats' =>
                      $collectables->{'guest-flow'}->{'disallow-repeats'},
                }
            ),
        };
        delete $collectables->{'guest-flow'}->{'user-agents'};
        delete $collectables->{'guest-flow'}->{'how-to-follow'};
        delete $collectables->{'guest-flow'}->{'disallow-repeats'};
    }

    $collectables->{vars} = {
        %{ $collectables->{'vars'}       // {} },
        %{ $collectables->{'guest-flow'} // {} },
        (
            SESSIONID => {
                variant => 'pattern',
                pattern => body_parameters->get('session-id')
                  || config->{generator}->{patterns}->{session_id}
            }
        )
    };

    if ( exists $collectables->{scheduler} ) {
        $collectables->{scheduler} =
          prepare_scheduler( $collectables->{scheduler} );
    }

    my $jsondata = {
        server => {
            address   => body_parameters->get('server-ip'),
            auth_port => body_parameters->get('auth-port'),
            acct_port => body_parameters->get('acct-port'),
            secret    => body_parameters->get('shared-secret'),
        },
        owner    => user->real_uid,
        protocol => $proto,
        count    => body_parameters->get('count'),
        radius   => {
            request    => body_parameters->get('radius')->{request},
            accounting => body_parameters->get('send-acct-start')
            ? body_parameters->get('radius')->{acct_start}
            : undef,
        },
        dicts      => $clear_dicts,
        async      => body_parameters->get('async') ? 1 : 0,
        variables  => $collectables->{vars} // undef,
        parameters => {
            'sessions'        => undef,
            'specific'        => $proto_specific,
            'job_name'        => body_parameters->get('proc-name'),
            'latency'         => body_parameters->get('latency'),
            'bulk'            => body_parameters->get('bulk-name') || undef,
            'action'          => 'generate',
            'job_chunk'       => undef,
            'job_id'          => undef,
            'accounting_type' => undef,
            'save_sessions'   => body_parameters->get('save-sessions') // '0',
            'saved_cli'       => undef,
            'download_dacl'   => body_parameters->get('download-dacl') // undef,
            'accounting_latency' => body_parameters->get('accounting-latency'),
            'accounting_start'   => (
                body_parameters->get('send-acct-start') ? 1
                : { nosend => 1 }
            ),
            'framed-mtu'      => body_parameters->get('framed-mtu'),
            'coa'             => $coa,
            maybe 'scheduler' => $collectables->{'scheduler'},
        }
    };
    if ( body_parameters->get('nad-ip') and not config->{nad}->{no_local_addr} )
    {
        $jsondata->{'local-addr'} = body_parameters->get('nad-ip');
    }
    my $sock = {};
    if (    body_parameters->get('timeout')
        and body_parameters->get('timeout') =~ /^\d+$/sxm )
    {
        $sock->{timeout} = body_parameters->get('timeout');
    }
    if (    body_parameters->get('retransmits')
        and body_parameters->get('retransmits') =~ /^\d+$/sxm )
    {
        $sock->{retransmits} = body_parameters->get('retransmits');
    }
    if ( keys %{$sock} ) { $jsondata->{socket} = $sock; }

    if ( body_parameters->get('server-loaded-id') ) {
        $jsondata->{server}->{id} = body_parameters->get('server-loaded-id');
    }

    if ( body_parameters->get('server-inet-family') ) {
        $jsondata->{server}->{family} =
          body_parameters->get('server-inet-family');
    }

    $jsondata->{parameters}->{saved_cli} =
      save_cli( JSON::MaybeXS->new( utf8 => 1 )->encode($jsondata) );

    my $encoded_json = JSON::MaybeXS->new( utf8 => 1 )->encode($jsondata);

    my $result = start_process(
        $encoded_json,
        {
            proc    => body_parameters->get('proc-name'),
            verbose => body_parameters->get('verbose') ? 1 : 0,
        }
    );

    if ( $result->{type} eq 'error' ) {
        send_error( $result->{message}, HTTP_INTERNAL_SERVER_ERROR );
    }
    else {
        my $redirect =
            '/manipulate/server/'
          . body_parameters->get('server-ip')
          . '/bulk/'
          . body_parameters->get('bulk-name') . q{/};
        send_as
          JSON => {
            status  => 'ok',
            success =>
"Process started. Sessions can be checked <a href='$redirect'>here</a>.",
            messages => [ $result->{message} ]
          },
          { content_type => 'application/json; charset=UTF-8' };
    }
};

get '/get-attribute-data/:attribute/' => sub {
    #
    # attribute edit requested data
    #
    logging->debug('Attribute data requested');
    my $result = {};
    my $at     = route_parameters->get('attribute');
    if ( defined $fieldsDefinitions->{$at} ) {
        $result = $fieldsDefinitions->{$at};
        $result->{defaults} = load_user_attributes( [ 'vars', uc $at ] );
    }
    else {
        $result = { error => 'Field is not supported' };
    }

    send_as
      JSON => $result,
      { content_type => 'application/json; charset=UTF-8' };
};

get '/get-attribute-values/bulks/' => sub {
    my $servers = load_servers();
    for ( my $i = 0 ; $i < scalar @{$servers} ; $i++ ) {
        $servers->[$i]->{values} = [];
        $servers->[$i]->{type}   = 'group';
        $servers->[$i]->{title}  = $servers->[$i]->{server};

       # push @{$servers->[$i]->{values}}, {type => 'header', title => 'Bulks'};
        for (
            my $bulk_i = 0 ;
            $bulk_i < scalar @{ $servers->[$i]->{bulks} } ;
            $bulk_i++
          )
        {
            push @{ $servers->[$i]->{values} },
              {
                type => 'link',
                link => '/generate/get-attribute-values/bulk-macs/'
                  . $servers->[$i]->{bulks}->[$bulk_i]->{name}
                  . '/server/'
                  . $servers->[$i]->{server} . q{/},
                title =>
qq/$servers->[$i]->{bulks}->[$bulk_i]->{name} ($servers->[$i]->{bulks}->[$bulk_i]->{sessions} sessions)/
              };
        }
        delete $servers->[$i]->{bulks};
        delete $servers->[$i]->{server};
        delete $servers->[$i]->{sessionscount};
    }
    unshift @{$servers}, { type => 'header-full', title => 'servers' };

    send_as JSON => $servers;
};

get '/get-attribute-values/bulk-macs/:bulk/server/:server/' => sub {
    my $server = route_parameters->get('server');
    my $bulk   = route_parameters->get('bulk');

    my @result = database->quick_select(
        config->{tables}->{sessions},
        { server  => $server, bulk => $bulk, owner => user->uid },
        { columns => qw/mac/ }
    );

    my @macs = map { $_->{mac} } @result;
    send_as JSON => { values => \@macs };
};

get '/get-proto-specific-params/:proto/' => sub {
    my $p = route_parameters->get('proto');

    if ( $PROTO_SPECIFIC{$p} ) {
        send_as JSON => $PROTO_SPECIFIC{$p};
    }
    else {
        send_error( 'Protocol specific data not found.', HTTP_NOT_FOUND );
    }
};

get '/get-ciphers/:tls/' => sub {
    my $tls_string = route_parameters->get('tls');

    my $result;
    if ( defined $ciphers->{$tls_string} ) {
        send_as JSON =>
          { state => 'success', ciphers => $ciphers->{$tls_string} };
    }
    else {
        send_as JSON => { state => 'failure' };
    }
};

get '/get-dictionaries/' => sub {
    my $mask = config->{dynamic_dictionaries}->{mask};

    opendir my $DIRH, config->{dynamic_dictionaries}->{path};
    my @files = sort grep { /$mask/sxm } readdir $DIRH;
    closedir $DIRH;

    my $byletter = {};
    foreach my $file (@files) {
        if ( $file =~ /$mask/sxm ) {
            my $letter = uc substr $1, 0, 1;
            if ( !exists $byletter->{$letter} ) { $byletter->{$letter} = []; }
            push @{ $byletter->{$letter} }, { 'name' => $1, 'file' => $file };
        }
    }

    send_as JSON => { state => 'success', dictionaries => $byletter };
};

get '/get-dictionary/:name/' => sub {
    my $n = route_parameters->get('name');
    $n =~ s/[^A-Za-z0-9\-\.=]/_/gsxm;
    $n =~ s/[.]{2}/__/gsxm;

    if ( !-e config->{dynamic_dictionaries}->{path} . $n ) {
        send_error( 'Dictionary not found', HTTP_NOT_FOUND );
    }

    my $r = load_dictionary_no_save( $n,
        config->{dynamic_dictionaries}->{path} . $n );

    send_as JSON => {
        state      => 'success',
        dictionary => $r->{dictionary},

        # names => $dict_by_dictname{$n},
        vendor => $r->{vendor},
        values => $r->{values},
    };
};

get '/get-nad-ips/' => sub {
    send_as JSON => {
        state => 'success',
        ips   => collect_nad_ips()
    };
};

get '/get-guest-flow/' => sub {

};

prefix q{/};

sub get_radius_attributes {
    #
    # Load all dictionaries
    #
    foreach my $file ( @{ config->{dictionaries} } ) {
        logging->debug("Loading $file dictionary");
        load_dictionary( $file, format => 'freeradius' );
    }
    return;
}

sub load_dictionary_no_save {
    my $n = shift;
    my (
        %old_dict_id,        %old_dict_name,        %old_dict_val,
        %old_dict_vendor_id, %old_dict_vendor_name, %old_included_files,
        %old_dict_by_dictname
      )
      = (
        %dict_id, %dict_name, %dict_val, %dict_vendor_id, %dict_vendor_name,
        %included_files, %dict_by_dictname
      );

    (
        %dict_id, %dict_name, %dict_val, %dict_vendor_id, %dict_vendor_name,
        %included_files, %dict_by_dictname
    ) = ( (), (), (), (), (), (), () );

    load_dictionary(@_);

    my $vendor = undef;
    foreach my $i ( keys %{ $dict_by_dictname{$n} } ) {
        $vendor = $dict_by_dictname{$n}{$i}{vendor};
        last;
    }
    if ( $vendor eq 'not defined' ) { $vendor = undef; }
    my %values =
      map { $_ => $dict_val{$_} // undef } keys %{ $dict_by_dictname{$n} };
    my @filtered_keys = grep { defined $values{$_} } keys %values;
    my %filtered_values;
    @filtered_values{@filtered_keys} = @values{@filtered_keys};

    my $r = {
        dictionary => $dict_by_dictname{$n} // {},
        vendor     => { $vendor => $dict_vendor_name{$vendor} },
        values     => \%filtered_values,
    };

    (
        %dict_id, %dict_name, %dict_val, %dict_vendor_id, %dict_vendor_name,
        %included_files, %dict_by_dictname
      )
      = (
        %old_dict_id,        %old_dict_name,        %old_dict_val,
        %old_dict_vendor_id, %old_dict_vendor_name, %old_included_files,
        %old_dict_by_dictname
      );

    return $r;
}

sub load_dictionary {
    #
    # Load RADIUS dictionary
    #
    my $file = shift;

    # options, format => {freeradius|gnuradius|default}
    my %opt             = @_;
    my $freeradius_dict = ( ( $opt{format} // q{} ) eq 'freeradius' ) ? 1 : 0;
    my $gnuradius_dict  = ( ( $opt{format} // q{} ) eq 'gnuradius' )  ? 1 : 0;

    my $dictionary_name = ( $opt{name} // basename($file) );

    my ( $cmd, $name, $id, $type, $vendor, $tlv, $extra, $has_tag );
    my $dict_def_vendor = $NO_VENDOR;

    if ( !-e $file ) {
        logging->error("File $file doesn't exist.");
        return;
    }

    # prevent infinite loop in the include files
    return if exists $included_files{$file};
    $included_files{$file} = 1;
    my $fh = FileHandle->new($file);
    if ( !$fh ) {
        logging->error("Can't open dictionary '$file' ($ERRNO)\n");
        return;
    }
    logging->debug( "Loading dictionary $file using "
          . ( $freeradius_dict ? 'FreeRADIUS' : 'default' )
          . " format\n" );

    while ( my $line = <$fh> ) {
        chomp $line;
        next if ( $line =~ /^\s*$/sxm || $line =~ /^[#]/sxm );

        if ($freeradius_dict) {

            # ATTRIBUTE name number type [options]
            ( $cmd, $name, $id, $type, $extra ) = split /\s+/sxm, $line;
            $vendor = undef;
        }
        elsif ($gnuradius_dict) {

            # ATTRIBUTE name number type [vendor] [flags]
            ( $cmd, $name, $id, $type, $vendor, undef ) = split /\s+/sxm, $line;

            # flags looks like '[LR-R-R]=P'
            $vendor = $NO_VENDOR
              if ( $vendor && ( $vendor eq q{-} || $vendor =~ /^\[/sxm ) );
        }
        else {
            # our default format (Livingston radius)
            ( $cmd, $name, $id, $type, $vendor ) = split /\s+/sxm, $line;
        }

        $cmd = lc $cmd;
        if ( $cmd eq 'attribute' ) {

            # Vendor was previously defined via BEGIN-VENDOR
            $vendor ||= $dict_def_vendor // $NO_VENDOR;

            $has_tag = 0;
            if ( $extra && $extra !~ /^[#]/sxm ) {
                my (@p) = split /,/sxm, $extra;
                $has_tag = grep { /has_tag/sxm } @p;
            }

            $dict_name{$name} = {
                id         => $id,
                type       => $type,
                vendor     => $vendor,
                has_tag    => $has_tag,
                dictionary => $dictionary_name,
            };

            $dict_by_dictname{$dictionary_name}{$name} = $dict_name{$name};

            if ( defined $tlv ) {

                # inside of a TLV definition
                $dict_id{$vendor}{$id}{'tlv'} = $tlv;
                $dict_name{$name}{'tlv'} = $tlv;

# IDs of TLVs are only unique within the master attribute, not in the dictionary
# so we have to use a composite key
                $dict_id{$vendor}{ $tlv . q{/} . $id }{'name'} = $name;
                $dict_id{$vendor}{ $tlv . q{/} . $id }{'type'} = $type;
            }
            else {
                $dict_id{$vendor}{$id} = {
                    name    => $name,
                    type    => $type,
                    has_tag => $has_tag,
                };
            }
        }
        elsif ( $cmd eq 'value' ) {
            next if !exists $dict_name{$name};
            $dict_val{$name}->{$type}->{'name'} = $id;
            $dict_val{$name}->{$id}->{'id'}     = $type;
        }
        elsif ( $cmd eq 'vendor' ) {
            $dict_vendor_name{$name}{'id'} = $id;
            $dict_vendor_id{$id}{'name'}   = $name;
        }
        elsif ( $cmd eq 'begin-vendor' ) {
            $dict_def_vendor = $name;
        }
        elsif ( $cmd eq 'end-vendor' ) {
            $dict_def_vendor = $NO_VENDOR;
        }
        elsif ( $cmd eq 'begin-tlv' ) {

            # FreeRADIUS dictionary syntax for defining WiMAX TLV
            if ( exists $dict_name{$name}
                && $dict_name{$name}{'type'} eq 'tlv' )
            {
                # This name was previously defined as an attribute with TLV type
                $tlv = $name;
            }
        }
        elsif ( $cmd eq 'end-tlv' ) {
            undef $tlv;
        }
        elsif ( $cmd eq '$include' ) {
            my @path = split qr{/}sxm, $file;
            pop @path;    # remove the filename at the end
            my $path = ( $name =~ /^\//sxm ) ? $name : join q{/}, @path, $name;
            load_dictionary( q{}, $path );
        }
    }
    $fh->close;
}

sub check_eap_tls_params {
    my $c = shift;

    # my $all_good = false;
    if ( !$c->{'eap-tls-params'} ) {
        send_error( 'EAP-TLS parameters not specified.', HTTP_BAD_REQUEST );
    }
    my $p = $c->{'eap-tls-params'};
    if ( $p->{'identity-certificates'}->{'variant'} eq 'scep' ) {
        if ( !$p->{'identity-certificates'}->{'scep-server'} ) {
            send_error( 'SCEP server is not specified.', HTTP_BAD_REQUEST );
        }
        if ( !$p->{'identity-certificates'}->{'template'} ) {
            send_error( 'CSR template is not specified.', HTTP_BAD_REQUEST );
        }
    }
    else {
        if ( !$p->{'identity-certificates'}->{'certificates'} ) {
            send_error( 'Identity certificates are not specified.',
                HTTP_BAD_REQUEST );
        }
    }

    if ( $p->{'usernames'}->{'variant'} eq 'random' ) {
        if ( $p->{'usernames'}->{'min-length'} >
            $p->{'usernames'}->{'max-length'} )
        {
            send_error( 'Max username length should be more than min length.',
                HTTP_BAD_REQUEST );
        }
        if (   $p->{'usernames'}->{'min-length'} <= 0
            || $p->{'usernames'}->{'max-length'} <= 0 )
        {
            send_error( 'Max and min username lengths should be positive.',
                HTTP_BAD_REQUEST );
        }
    }
    elsif ( $p->{'usernames'}->{'variant'} eq 'specified' ) {
        if ( !$p->{'usernames'}->{'specified-usernames'} ) {
            send_error( 'Usernames are not specified.', HTTP_BAD_REQUEST );
        }
        $p->{'usernames'}->{'specified-usernames'} = split /\r?\n/sxm,
          $p->{'usernames'}->{'specified-usernames'};
    }
    elsif ( $p->{'usernames'}->{'variant'} eq 'from-cert-san-pattern' ) {
        if ( !scalar @{ $p->{'usernames'}->{'san-types-allowed'} } ) {
            send_error( 'Select at least one SAN type.', HTTP_BAD_REQUEST );
        }
        if ( !$p->{'usernames'}->{'san-pattern'} ) {
            send_error( 'Pattern is not specified.', HTTP_BAD_REQUEST );
        }
        if ( !check_regexp( $p->{'usernames'}->{'san-pattern'} ) ) {
            send_error( 'Pattern is invalid.', HTTP_BAD_REQUEST );
        }
    }

    if ( $p->{'fail-start-new'} ) {
        if ( $p->{'fail-start-new-repeats'} < 0 ) {
            send_error( 'How do you imagine negative amount of repeats?',
                HTTP_BAD_REQUEST );
        }
        if ( $p->{'fail-start-new-repeats'} > 5 ) {
            send_error( 'No more than 5 repeats are allowed',
                HTTP_BAD_REQUEST );
        }
    }
    return 1;
}

sub check_regexp {
    my $re = shift;
    $re = eval {
        no re 'eval';
        qr/$re/sxm;
    };
    return defined($re) ? !regexp_seen_evals($re) : 0;
}

sub save_server {
    my $h = {@_};

    $h->{id}         = \'uuid_generate_v1()';
    $h->{owner}      = user->uid;
    $h->{coa}        = 'TRUE';
    $h->{group}      = q{};
    $h->{attributes} = {
        shared               => $h->{shared},
        dns                  => q{},
        no_session_action    => 'coa-nak',
        coa_nak_err_cause    => '503',
        no_session_dm_action => 'disconnect-nak',
        dm_err_cause         => '503',
        friendly_name        => $h->{address},
    };
    delete $h->{shared};
    my $cnt = 0;

    if ( $h->{address} =~ /^$RE{net}{IPv4}$/sxm ) {
        $cnt = database->quick_count(
            config->{tables}->{servers},
            {
                address   => $h->{address},
                auth_port => $h->{auth_port},
                acct_port => $h->{acct_port},
            }
        );
    }
    else {
        my $p   = sprintf 'attributes->>%s', database->quote('v6_address');
        my $sql = sprintf
          'SELECT COUNT(*) FROM %s WHERE %s = %s',
          database->quote_identifier( config->{tables}->{servers} ),
          $p, database->quote( $h->{address} );
        $cnt = database->selectrow_arrayref($sql)->[0] // 0;
        debug to_dumper($cnt);
        $h->{attributes}->{v6_address} = $h->{address};
        $h->{address} = q{};
    }
    $h->{attributes} =
      JSON::MaybeXS->new( utf8 => 1 )->encode( $h->{attributes} );

    if ($cnt) { logging->debug('Server already exists'); }
    else {
        database->quick_insert( config->{tables}->{servers}, $h );
    }

    return;
}

Readonly my $TIME_MAPPER => {
    'Seconds since creation'    => 'timeFromCreate',
    'Seconds since last change' => 'timeFromChange'
};

Readonly my $ATTR_HANDLERS => {
    'Acct-Session-Time' => sub {
        return {
            name  => $_[0]->{name},
            value => $TIME_MAPPER->{ $_[0]->{value} } // $_[0]->{value}
        };
    },
    'Additional attributes' => sub {
        my $attr = shift;
        $attr->{value} =~ s/^\s+|\s+$//sxmg;
        return if not $attr->{value};

        my @result;
        foreach my $line ( split /\n/sxm, $attr->{value} ) {
            my @a = split /=/sxm, $line, 2;
            if ( $a[0] && $a[1] ) {
                push @result, { name => $a[0], value => $a[1] };
            }
        }
        return @result;
    }
};

sub flat {
    return
      map { is_plain_arrayref($_) ? flat( @{$_} ) : $_ } grep { defined } @_;
}

sub attribute_walker {
    my $a = shift;
    return
      exists $ATTR_HANDLERS->{ $a->{name} }
      ? $ATTR_HANDLERS->{ $a->{name} }->($a)
      : $a;
}

sub prepare_scheduler {
    my $s = shift;

    if ( exists $s->{updates}->{attributes} ) {
        $s->{updates}->{attributes} = [
            flat(
                map { attribute_walker($_) } @{ $s->{updates}->{attributes} }
            )
        ];
    }

    return $s;
}

sub format_coa {
    my $coa = undef;
    if ( my $t = shift->{'coa-options'} ) {
        $coa = {
            bounce => {
                act       => $t->{'bounce'}->{'variant'},
                after     => $t->{'bounce'}->{'action-after'},
                same_id   => !$t->{'bounce'}->{'new-session-id'},
                err_cause => $t->{'bounce'}->{'error-cause'},
                drop_old  => $t->{'bounce'}->{'new-session-id'}
                  && $t->{'bounce'}->{'drop-old'} ? 1 : 0,
            },
            disable => {
                act       => $t->{'disable'}->{'variant'},
                after     => $t->{'disable'}->{'action-after'},
                same_id   => !$t->{'disable'}->{'new-session-id'},
                err_cause => $t->{'disable'}->{'error-cause'},
                drop_old  => $t->{'disable'}->{'new-session-id'}
                  && $t->{'disable'}->{'drop-old'} ? 1 : 0,
            },
            reauthenticate => {
                act => {
                    rerun   => $t->{'reauthenticate-rerun'}->{'variant'},
                    last    => $t->{'reauthenticate-last'}->{'variant'},
                    default => $t->{'reauthenticate-default'}->{'variant'},
                },
                after => {
                    rerun   => $t->{'reauthenticate-rerun'}->{'action-after'},
                    last    => $t->{'reauthenticate-last'}->{'action-after'},
                    default => $t->{'reauthenticate-default'}->{'action-after'},
                },
                same_id => {
                    rerun => !$t->{'reauthenticate-rerun'}->{'new-session-id'},
                    last  => !$t->{'reauthenticate-last'}->{'new-session-id'},
                    default =>
                      !$t->{'reauthenticate-default'}->{'new-session-id'},
                },
                err_cause => {
                    rerun   => $t->{'reauthenticate-rerun'}->{'error-cause'},
                    last    => $t->{'reauthenticate-last'}->{'error-cause'},
                    default => $t->{'reauthenticate-default'}->{'error-cause'},
                },
                drop_old => {
                    rerun => $t->{'reauthenticate-rerun'}->{'new-session-id'}
                      && $t->{'reauthenticate-rerun'}->{'drop-old'} ? 1 : 0,
                    last => $t->{'reauthenticate-last'}->{'new-session-id'}
                      && $t->{'reauthenticate-last'}->{'drop-old'} ? 1 : 0,
                    default =>
                      $t->{'reauthenticate-default'}->{'new-session-id'}
                      && $t->{'reauthenticate-default'}->{'drop-old'} ? 1 : 0,
                },
            },
            default => {
                act       => $t->{'default'}->{'variant'},
                after     => $t->{'default'}->{'action-after'},
                same_id   => !$t->{'default'}->{'new-session-id'},
                err_cause => $t->{'default'}->{'error-cause'},
                drop_old  => $t->{'default'}->{'new-session-id'}
                  && $t->{'default'}->{'drop-old'} ? 1 : 0,
            },
        };
    }

    return $coa;
}

1;
