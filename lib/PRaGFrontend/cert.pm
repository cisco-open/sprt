package PRaGFrontend::cert;
use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use Dancer2::Core::Request::Upload;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use PRaGFrontend::Plugins::DB;
use plackGen qw/load_pagination save_pagination/;

use Archive::Tar;
use Archive::Zip  qw/:ERROR_CODES/;
use Convert::ASN1 qw/:debug/;
use Crypt::Digest 'digest_data';
use Crypt::Misc ':all';
use Crypt::OpenSSL::PKCS10;
use Crypt::OpenSSL::RSA;
use Crypt::OpenSSL::X509;
use Crypt::PK::DSA;
use Crypt::PK::ECC;
use Crypt::PK::RSA;
use Crypt::X509;
use Data::GUID;
use English qw/-no_match_vars/;
use File::Basename;
use File::Path qw/make_path/;
use File::Temp;
use FileHandle;
use HTTP::Status qw/:constants :is/;
use IO::Socket::SSL::Utils;
use JSON::MaybeXS ();
use List::Compare;
use LWP::Protocol::http::SocketUnixAlt;
use LWP::UserAgent;
use POSIX 'strftime', 'ceil';
use Ref::Util qw/is_plain_arrayref is_plain_hashref is_ref is_scalarref/;
use Readonly;
use String::ShellQuote qw/shell_quote/;
use Syntax::Keyword::Try;
use Time::HiRes qw/gettimeofday usleep/;
use URI::URL;

use PRaGFrontend::scepclient;

Readonly my %DIGESTS => (
    sha1       => 1,
    sha256     => 1,
    sha384     => 1,
    sha512     => 1,
    sha512_224 => 1,
    sha512_256 => 1,
);

Readonly my %SAN_TYPES => (
    'rfc822Name'                => 1,
    'dNSName'                   => 2,
    'x400Address'               => 3,
    'directoryName'             => 4,
    'uniformResourceIdentifier' => 6,
    'iPAddress'                 => 7,
);

Readonly my @SUBJECT_ORDER => qw/cn ou o l st c e/;

Readonly my %UPDATABLE_ATTRS => ( 'friendly_name' => 1, );

hook 'plugin.pragfrontend_plugins_menu.menu_collect' => sub {
    add_menu
      name  => 'cert',
      icon  => 'icon-certified',
      title => 'Certificates';

    add_submenu 'cert',
      {
        name  => 'cert-identity',
        link  => '/cert/identity/',
        title => 'Identity Certificates',
      },
      {
        name  => 'cert-trusted',
        link  => '/cert/trusted/',
        title => 'Trusted Certificates',
      },
      {
        name  => 'cert-scep',
        link  => '/cert/scep/',
        title => 'SCEP',
      },
      {
        name  => 'cert-templates',
        link  => '/cert/templates/',
        title => 'Templates',
      };
};

get '/cert/' => sub {

    # forward '/cert/identity/';
    if (serve_json) {
        send_as JSON => { state => 'success', result => {} };
    }
    else {
        send_as
          html => template 'certificates.tt',
          {
            active    => 'certificates',
            title     => 'Certificates',
            pageTitle => 'Certificates',
            forwarded => query_parameters->get('forwarded') // undef,
            messages  => query_parameters->get('result')    // undef,
            location  => '/cert/'
          };
    }
};

any [ 'get', 'post' ] => '/cert/details/:cert-id/' => sub {
    #
    # Provide details of the certificate
    #
    my $cert_id = route_parameters->get('cert-id');
    my $type    = body_parameters->get('type') || 'identity';
    my $loaded  = load_certificates(
        id      => $cert_id,
        type    => $type,
        columns => [qw/content friendly_name/]
    );
    if ( !$loaded || !scalar @{$loaded} ) {
        send_error( qq/Certificate '$cert_id' not found/, HTTP_NOT_FOUND );
    }
    $loaded = $loaded->[0];

    if ( exists $loaded->{broken} ) {
        send_error( q/Couldn't open certificate file/, HTTP_NOT_FOUND );
        return;
    }

    my ( $filled, $x509 ) =
      fill_certificate( $loaded->{content}, include_pem => 0 );
    my @chain;
    push @chain, $filled;
    if ( !is_selfsigned($x509) ) {
        my @t = load_chain( cert => $loaded->{content} );
        for ( my $i = 0 ; $i < scalar @t ; $i++ ) {
            $t[$i] = fill_certificate( $t[$i]->{content}, include_pem => 0 );
        }
        push @chain, @t;
    }

    send_as JSON => { state => 'success', result => \@chain };
};

post '/cert/export/' => sub {
    #
    # Export certificates
    #
    my $type = body_parameters->get('type');
    if ( !$type ) { send_error( 'Unknown type.', HTTP_INTERNAL_SERVER_ERROR ); }
    my $what         = [ body_parameters->get_all('what') ];
    my $how          = body_parameters->get('how');
    my $pvk_password = body_parameters->get('password');
    my $chain        = body_parameters->get('full-chain') // 0;

    my $columns;
    if ( $how eq 'certificates-and-keys' ) {
        $columns = [qw/id friendly_name content keys/];
    }
    else { $columns = [qw/id friendly_name content/]; }

    my $certificates =
      load_certificates( type => $type, id => $what, columns => $columns );
    if ( scalar @{$certificates} ) {
        @{$certificates} = grep { not exists $_->{broken} } @{$certificates};
    }

    if ( !scalar @{$certificates} ) {
        send_error( 'Certificates not found.', HTTP_NOT_FOUND );
    }

    my $tar = prepare_tar_of_certificates(
        certificates => $certificates,
        pvk_password => $pvk_password,
        chain        => $chain
    );
    send_file(
        \$tar->write(),
        content_type => 'application/x-tar',
        filename     => 'certificates.tar',
    );
};

get '/cert/attribute/:attribute/:id/' => sub {
    #
    # Get some attribute of certificate
    #
    my $rv = database->quick_lookup(
        config->{tables}->{certificates},
        {
            owner => user->uid,
            id    => route_parameters->get('id')
        },
        route_parameters->get('attribute')
    );
    if (serve_json) {
        send_as JSON => { state => 'success', result => $rv };
    }
    else {
        send_as html => q{};
    }
};

patch '/cert/attribute/:attribute/:id/' => sub {
    #
    # Update attribute
    #
    my $a  = route_parameters->get('attribute');
    my $id = route_parameters->get('id');
    my $v  = body_parameters->get('value');
    if ( $UPDATABLE_ATTRS{$a} ) {
        my $f = database->quick_select(
            config->{tables}->{certificates},
            { owner   => user->uid, id => $id },
            { columns => [qw/id subject content/] }
        );
        if ($f) {
            if ( $a eq 'friendly_name' && !$v ) { $v = $f->{subject}; }

            database->quick_update(
                config->{tables}->{certificates},
                { owner => user->uid, id => $id },
                { $a    => $v }
            );
            send_as JSON => { state => 'success' };
        }
        else {
            send_error( 'Certificate not found.', HTTP_BAD_REQUEST );
        }
    }
    else {
        send_error( "Attribute $a cannot be updated.", HTTP_BAD_REQUEST );
    }
};

get '/cert/refill/' => sub {
    send_as JSON => refill_db_certificates();
};

#-----------------------------------------------------------------------------------------------------------------------
# Trusted Certificates
prefix '/cert/trusted';
get q{/} => sub {
    #
    # Main trusted certificates page
    #
    forward '/cert/trusted/page/0/';
};

post q{/} => sub {
    #
    # New trusted certificate uploaded
    #
    my $fmt = body_parameters->get('format') || q{};
    my $update => body_parameters->get('update_list') || 1;

    my ( $cert, $rv );
    if ( $fmt eq 'text' ) {
        $cert = body_parameters->get('trusted');
        $rv   = search_in_text( file => \$cert, type => 'trusted' );
    }
    elsif ( $fmt eq 'file' ) {
        $cert = upload('trusted');
        if ( !$cert ) {
            send_error( 'Certificate not specified', HTTP_BAD_REQUEST );
        }
        if ( $cert->basename =~ /[.](tar|tgz|tbz|zip|tar[.]gz)$/isxm ) {
            $rv = search_in_arch( file => $cert, type => 'trusted' );
        }
        elsif ( $cert->basename =~ /[.](pem|txt|log|out)$/isxm ) {
            $rv = search_in_text( file => $cert, type => 'trusted' );
        }
        elsif ( $cert->basename =~ /[.](cer|crt|der)$/isxm ) {
            save_certificate(
                type             => 'trusted',
                certificate_file => $cert,
                friendly_name    => q{},
                error_if_exists  => 1,
                error_if_expired => 1,
            );
            $rv = { state => 'success', found => 1 };
        }
        else {
            send_error( 'Unsupported file type.', HTTP_NOT_ACCEPTABLE );
        }
    }
    else {
        send_error( 'Unknown format.', HTTP_BAD_REQUEST );
    }

    if ($update) { $rv->{trusted} = load_trusted(); }

    send_as JSON => $rv;
};

del q{/} => sub {
    #
    # Delete trusted certificate
    #
    my $what = [ body_parameters->get_all('what') ];
    if ( !scalar @{$what} ) {
        send_error( 'Nothing to delete', HTTP_NOT_FOUND );
    }

    my $where = { owner => user->uid, type => 'trusted' };
    if ( $what->[0] eq 'not-root' ) {
        $where->{id} = [
            map { $_->{id} } database->quick_select(
                config->{tables}->{certificates},
                {
                    self_signed => 'FALSE',
                    type        => 'trusted',
                    owner       => user->uid
                },
                { columns => [qw/id/] }
            )
        ];
        if ( !scalar @{ $where->{id} } ) {
            send_as JSON => { state => 'success' };
        }
    }
    elsif ( $what->[0] ne 'all' ) {
        $where->{id} = $what;
    }

    delete_certificates($where);

    send_as JSON => { state => 'success', trusted => load_trusted() };
};

get '/nothing/' => sub {
    show_trusted( [] );
};

get '/**?' => sub {
    #
    # Default for pagination purposes
    #
    my ($r) = splat;
    my %add_params;

    # Parse additional parameters
    if ( scalar @{$r} ) {
        if ( scalar( @{$r} ) % 2 == 1 ) { pop @{$r}; }
        %add_params = @{$r};
        foreach my $key ( keys %add_params ) {
            delete $add_params{$key} if $add_params{$key} eq 'undefined';
        }
    }

    my $saved = load_pagination( where => 'certificates.trusted' );

    # And default them if anything
    $add_params{'page'} //= 0;
    $add_params{'per-page'} //= $saved->{'per-page'} || 25;
    $add_params{'sort'}  ||= $saved->{sort}  || 'friendly_name';
    $add_params{'order'} ||= $saved->{order} || 'desc';

    my %sort = (
        column => $add_params{'sort'},
        order  => $add_params{'order'} =~ /^(a|de)sc$/isxm
        ? uc scalar $add_params{'order'}
        : 'DESC',
        limit => (
                 $add_params{'per-page'}
              && $add_params{'per-page'} =~ /^(\d+|all)$/isxm
        ) ? scalar $add_params{'per-page'} : '50',
        offset =>
          ( $add_params{'offset'} && $add_params{'offset'} =~ /^\d+$/sxm )
        ? scalar $add_params{'offset'}
        : undef,
    );
    $sort{offset} //=
      (      $add_params{page}
          && $add_params{page} =~ /^\d+$/sxm
          && $sort{limit}      =~ /^\d+$/sxm )
      ? ( $add_params{page} - 1 ) * $sort{limit}
      : 0;

    my ( $trusted, $total ) = load_trusted( sort => \%sort );

    if ( !scalar @{$trusted} ) {
        my $rv = { type => 'info', message => 'No certificates found.' };
        forward '/cert/trusted/nothing/', { forwarded => 1, result => [$rv] };
    }

    $sort{total} = $total;
    $sort{pages} =
      ( $sort{limit} =~ /^\d+$/sxm && $sort{limit} > 0 )
      ? ceil( $sort{total} / $sort{limit} )
      : -1;
    var 'paging' => \%sort;

    save_pagination(
        where => 'certificates.trusted',
        what  => {
            'per-page' => $sort{limit},
            'sort'     => $sort{column},
            'order'    => $sort{order}
        }
    );

    show_trusted($trusted);
};

sub show_trusted {
    my $trusted = shift;
    if (serve_json) {
        body_parameters->set( 'no-content', 1 );
        send_as JSON => {
            state   => 'success',
            trusted => $trusted,
            paging  => vars->{paging} || undef,
        };
    }
    else {
        send_as
          html => template 'certificates-trusted.tt',
          {
            active    => 'cert-trusted',
            title     => 'Trusted Certificates',
            pageTitle => 'Trusted Certificates',
            trusted   => $trusted,
            forwarded => query_parameters->get('forwarded') // undef,
            messages  => query_parameters->get('result')    // undef,
            location  => '/cert/trusted/',
            paging    => vars->{paging} || undef,
          };
    }
    return;
}

#-----------------------------------------------------------------------------------------------------------------------
# SCEP
prefix '/cert/scep';
any [ 'get', 'post' ] => q{/} => sub {
    #
    # Show configured SCEP servers
    #
    if (serve_json) {
        send_as JSON => {
            state => 'success',
            scep  => body_parameters->get('scep_servers') ? load_scep() : undef,
            signers => body_parameters->get('signers') ? load_signers() : undef,
        };
    }
    else {
        send_as
          html => template 'certificates-scep.tt',
          {
            active       => 'cert-scep',
            title        => 'SCEP Servers',
            pageTitle    => 'SCEP Servers',
            scep_servers => load_scep(),
            signers      => load_signers(),
            forwarded    => query_parameters->get('forwarded') // undef,
            messages     => query_parameters->get('result')    // undef,
            location     => '/cert/scep/'
          };
    }
};

get '/server/**' => sub {
    forward '/cert/scep/';
    return;
};

get '/signers/' => sub {
    #
    # Get all signing certificates
    #
    my $signers = load_signers();

    send_as JSON => { state => 'success', result => $signers };
};

put q{/} => sub {
    #
    # Save SCEP server
    #
    my $scep_url        = body_parameters->get('href');
    my $name            = body_parameters->get('name');
    my $ca_certificates = [ body_parameters->get_all('certificates') ];
    my $signer          = body_parameters->get('signer');
    my $overwrite       = body_parameters->get('overwrite') // 0;

    my $id = database->quick_lookup( table('scep_servers'),
        { url => $scep_url, owner => user->uid }, 'id' );
    if ( !$overwrite && $id ) {
        send_error( qq/SCEP server with URL '$scep_url' already exists./,
            HTTP_CONFLICT );
    }

    $name ||= URI::URL->new($scep_url)->host;

    if ($id) {    # Update
        database->quick_update(
            table('scep_servers'),
            { id => $id },
            {
                url             => $scep_url || undef,
                name            => $name     || undef,
                ca_certificates =>
                  JSON::MaybeXS->new( utf8 => 1 )->encode($ca_certificates)
                  || undef,
                signer => $signer || undef
            }
        );
    }
    else {    # Insert
        database->quick_insert(
            table('scep_servers'),
            {
                id              => \'uuid_generate_v1()',
                owner           => user->uid,
                url             => $scep_url,
                name            => $name,
                ca_certificates =>
                  JSON::MaybeXS->new( utf8 => 1 )->encode($ca_certificates),
                signer => $signer || get_signer()->{id}
            }
        );
    }
    send_as JSON => { state => 'success', scep => load_scep() };
};

put q{/:scep_id/} => sub {
    #
    # Update SCEP server
    #
    my $id  = route_parameters->get('scep_id');
    my $url = database->quick_lookup( table('scep_servers'),
        { id => $id, owner => user->uid }, 'url' );

    if ( not $url ) {
        send_error( q/SCEP server not found./, HTTP_NOT_FOUND );
    }

    my $scep_url        = body_parameters->get('href');
    my $name            = body_parameters->get('name');
    my $ca_certificates = [ body_parameters->get_all('certificates') ];
    my $signer          = body_parameters->get('signer');

    database->quick_update(
        table('scep_servers'),
        { id => $id },
        {
            url             => $scep_url,
            name            => $name,
            ca_certificates =>
              JSON::MaybeXS->new( utf8 => 1 )->encode($ca_certificates),
            signer => $signer
        }
    );
    send_as JSON => { state => 'success', scep => load_scep() };
};

del '/**?' => sub {
    #
    # Delete something
    #
    var what => [ body_parameters->get_all('what') ];
    if ( !scalar @{ vars->{what} } ) {
        send_error( 'Nothing to delete', HTTP_NOT_FOUND );
    }
    else { pass; }
};

del q{/} => sub {
    #
    # Delete SCEP server
    #
    my $where = { owner => user->uid };
    if ( vars->{what}->[0] ne 'all' ) {
        $where->{id} = vars->{what};
    }

    database->quick_delete( table('scep_servers'), $where );

    send_as JSON => { state => 'success', scep => load_scep() };
};

post '/signer/' => sub {
    #
    # New signing certificate uploaded
    #
    my $pvk_file = upload('pvk');
    if ( !$pvk_file ) {
        send_error( 'Private Key not specified', HTTP_BAD_REQUEST );
    }

    my $certificate = upload('certificate');
    if ( !$certificate ) {
        send_error( 'Certificate not specified', HTTP_BAD_REQUEST );
    }

    save_certificate(
        type             => 'signer',
        certificate_file => $certificate,
        pvk_file         => $pvk_file,
        pvk_password     => body_parameters->get('pvk-password'),
        friendly_name    => body_parameters->get('signer-friendly-name'),
    );

    send_as JSON => { state => 'success', signers => load_signers() };
};

post '/signer/export/' => sub {
    body_parameters->set( 'type', 'signer' );
    forward '/cert/export/';
};

get '/signer/details/:cert-id/' => sub {
    if ( not serve_json ) {
        forward '/cert/scep/';
        return;
    }
    body_parameters->set( 'type', 'signer' );
    forward '/cert/details/' . route_parameters->get('cert-id') . q{/};
};

del '/signer/' => sub {
    #
    # Delete signing certificate
    #
    my $where = { owner => user->uid, type => 'signer' };
    if ( vars->{what}->[0] ne 'all' ) {
        $where->{id} = vars->{what};
    }

    delete_certificates($where);

    # database->quick_delete(config->{tables}->{certificates}, $where);

    send_as JSON => { state => 'success', signers => load_signers() };
};

get '/:scep_id/' => sub {
    #
    # Get info about saved SCEP server
    #
    my $id = route_parameters->get('scep_id');
    if ( $id eq 'new' ) {
        send_as JSON => {
            state  => 'success',
            result => {
                name            => q{},
                url             => q{},
                ca_certificates => [],
                signers         => load_signers(),
            }
        };
    }
    elsif (
        database->quick_count(
            table('scep_servers'), { owner => user->uid, id => $id }
        )
      )
    {
        my $scep = load_scep( route_parameters->get('scep_id') )->[0];
        $scep->{ca_certificates} =
          JSON::MaybeXS->new( utf8 => 1 )->decode( $scep->{ca_certificates} );
        foreach my $cert ( @{ $scep->{ca_certificates} } ) {
            my $x509 = Crypt::OpenSSL::X509->new_from_string($cert);
            $cert = fill_certificate($cert);
        }
        $scep->{signers} = load_signers();
        send_as JSON => { state => 'success', result => $scep };
    }
    else {
        send_error( qq/SCEP server '$id' not found./, HTTP_NOT_FOUND );
    }
};

post '/test-scep/' => sub {
    #
    # Test connectivity, perform GetCACert
    #
    my $scep_url    = body_parameters->get('href');
    my $scep_client = PRaGFrontend::scepclient->new(
        name       => body_parameters->get('name') // q{},
        scep_url   => $scep_url,
        logger     => logging,
        connect_to => config->{scep},
    );

    my $result = $scep_client->GetCACert();
    if ( $result->{state} eq 'error' ) {
        send_error( $result->{message}, HTTP_INTERNAL_SERVER_ERROR );
    }
    else {
        send_as JSON => $result;
    }
};

post '/test-scep-enroll/' => sub {
    #
    # Try to enroll test identty certificate
    #
    my $scep_url = body_parameters->get('href');
    my $signer   = get_signer( body_parameters->get('signer') );
    my $pvk =
      JSON::MaybeXS->new( utf8 => 1 )->decode( $signer->{keys} )->{private};

    my $scep_client = PRaGFrontend::scepclient->new(
        name       => body_parameters->get('name') // q{},
        scep_url   => $scep_url,
        logger     => logging,
        connect_to => config->{scep},
    );

    my $csr = fill_csr( body_parameters->get('csr') );

    my ( $csr_pem, $pvk_pem ) = generate_csr($csr);
    logging->debug( 'CSR: ' . to_dumper($csr_pem) );

    my $result = $scep_client->enroll(
        ca_certificates => [ body_parameters->get_all('certificates') ],

        # csr => fill_csr(body_parameters->get('csr')),
        csr => {
            pem => $csr_pem,
            pvk => $pvk_pem,
        },
        signer => {
            certificate => $signer->{content},
            pvk         => $pvk
        },
    );

    if ( $result->{state} eq 'error' ) {
        send_error( $result->{message}, HTTP_INTERNAL_SERVER_ERROR );
    }
    else {
        send_as JSON => $result;
    }
};

post '/enroll/' => sub {
    #
    # Enroll certificate based on CSR
    #
    my $scep_server = load_scep( body_parameters->get('scep-server') );
    if ( !$scep_server || !$scep_server->[0] ) {
        send_error( 'SCEP server not found.', HTTP_NOT_FOUND );
    }
    $scep_server = $scep_server->[0];

    my $signer = get_signer( $scep_server->{signer} );
    my $pvk =
      JSON::MaybeXS->new( utf8 => 1 )->decode( $signer->{keys} )->{private};

    my $scep_client = PRaGFrontend::scepclient->new(
        name       => $scep_server->{name} // q{},
        scep_url   => $scep_server->{url},
        logger     => logging,
        connect_to => config->{scep},
    );

    my ( $csr_pem, $pvk_pem ) =
      generate_csr( fill_csr( body_parameters->get('csr') ) );

    my $result = $scep_client->enroll(
        ca_certificates => JSON::MaybeXS->new( utf8 => 1 )
          ->decode( $scep_server->{ca_certificates} ),
        csr => {
            pem => $csr_pem,
            pvk => $pvk_pem,
        },
        signer => {
            certificate => $signer->{content},
            pvk         => $pvk
        },
    );

    if ( $result->{state} eq 'error' ) {
        send_error( $result->{message}, HTTP_INTERNAL_SERVER_ERROR );
    }
    else {
        $result->{result}->{keys}->{private} = $pvk_pem;
        send_as JSON => $result;
    }
};

#-----------------------------------------------------------------------------------------------------------------------
# Identity Certificates
prefix '/cert/identity';
get q{/} => sub {
    #
    # Main identity certificates page
    #
    forward '/cert/identity/page/0/';
};

post q{/} => sub {
    #
    # New indetity certificate uploaded
    #
    my $fmt = body_parameters->get('format') || q{};
    my ( $pvk, $cert );
    if ( $fmt eq 'text' ) {
        $pvk  = \body_parameters->get('pvk');
        $cert = \body_parameters->get('certificate');
    }
    elsif ( $fmt eq 'file' ) {
        $pvk = upload('pvk');
        if ( !$pvk ) {
            send_error( 'Private Key not specified', HTTP_BAD_REQUEST );
        }
        $cert = upload('certificate');
        if ( !$cert ) {
            send_error( 'Certificate not specified', HTTP_BAD_REQUEST );
        }
    }
    else {
        send_error( 'Unknown format.', HTTP_BAD_REQUEST );
    }

    save_certificate(
        type             => 'identity',
        certificate_file => $cert,
        pvk_file         => $pvk,
        pvk_password     => body_parameters->get('pvk-password'),
        friendly_name    => body_parameters->get('friendly-name'),
        as_file          => 1,
    );

    send_as JSON => { state => 'success', identity => load_identity() };
};

post '/export/' => sub {
    body_parameters->set( 'type', 'identity' );
    forward '/cert/export/';
};

del q{/} => sub {
    #
    # Delete identity certificate
    #
    my $what = [ body_parameters->get_all('what') ];
    if ( !scalar @{$what} ) {
        send_error( 'Nothing to delete', HTTP_FORBIDDEN );
    }

    my $where = { owner => user->uid, type => 'identity' };
    if ( $what->[0] ne 'all' ) {
        $where->{id} = $what;
    }

    delete_certificates($where);

    # database->quick_delete(config->{tables}->{certificates}, $where);

    send_as JSON => { state => 'success', identity => load_identity() };
};

get '/details/:cert-id/' => sub {
    body_parameters->set( 'type', 'identity' );
    forward '/cert/details/' . route_parameters->get('cert-id') . q{/};
};

get '/nothing/' => sub {
    show_identity( [] );
};

get '/**?' => sub {
    #
    # Default for pagination purposes
    #
    my ($r) = splat;
    my %add_params;

    # Parse additional parameters
    if ( scalar @{$r} ) {
        if ( scalar( @{$r} ) % 2 == 1 ) { pop @{$r}; }
        %add_params = @{$r};
        foreach my $key ( keys %add_params ) {
            delete $add_params{$key} if $add_params{$key} eq 'undefined';
        }
    }

    my $saved = load_pagination( where => 'certificates.identity' );

    # And default them if anything
    $add_params{'page'} //= 0;
    $add_params{'per-page'} //= $saved->{'per-page'} || 25;
    $add_params{'sort'}  ||= $saved->{sort}  || 'friendly_name';
    $add_params{'order'} ||= $saved->{order} || 'desc';

    my %sort = (
        column => $add_params{'sort'},
        order  => $add_params{'order'} =~ /^(a|de)sc$/isxm
        ? uc scalar $add_params{'order'}
        : 'DESC',
        limit => (
                 $add_params{'per-page'}
              && $add_params{'per-page'} =~ /^(\d+|all)$/isxm
        ) ? scalar $add_params{'per-page'} : '50',
        offset =>
          ( $add_params{'offset'} && $add_params{'offset'} =~ /^\d+$/sxm )
        ? scalar $add_params{'offset'}
        : undef,
    );
    $sort{offset} //=
      (      $add_params{page}
          && $add_params{page} =~ /^\d+$/sxm
          && $sort{limit}      =~ /^\d+$/sxm )
      ? ( $add_params{page} - 1 ) * $sort{limit}
      : 0;

    my ( $identity, $total ) = load_identity( sort => \%sort );

    if ( !scalar @{$identity} ) {
        my $rv = { type => 'info', message => 'No certificates found.' };
        forward '/cert/identity/nothing/', { forwarded => 1, result => [$rv] };
    }

    save_pagination(
        where => 'certificates.identity',
        what  => {
            'per-page' => $sort{limit},
            'sort'     => $sort{column},
            'order'    => $sort{order}
        }
    );

    $sort{total} = $total;
    $sort{pages} =
      ( $sort{limit} =~ /^\d+$/sxm && $sort{limit} > 0 )
      ? ceil( $sort{total} / $sort{limit} )
      : -1;
    var 'paging' => \%sort;

    if ( query_parameters->get('filter_broken') ) {
        $identity = [ grep { not exists $_->{broken} } @{$identity} ];
    }

    show_identity($identity);
};

sub show_identity {
    my $identity = shift;
    if (serve_json) {
        body_parameters->set( 'no-content', 1 );
        send_as JSON => {
            state    => 'success',
            identity => $identity,
            paging   => vars->{paging} || undef,
        };
    }
    else {
        send_as
          html => template 'certificates-identity.tt',
          {
            active    => 'cert-identity',
            title     => 'Identity Certificates',
            pageTitle => 'Identity Certificates',
            identity  => $identity,
            forwarded => query_parameters->get('forwarded') // undef,
            messages  => query_parameters->get('result')    // undef,
            location  => '/cert/identity/',
            paging    => vars->{paging} || undef,
          };
    }
    return;
}

#-----------------------------------------------------------------------------------------------------------------------
# Certificate Templates
prefix '/cert/templates';
get q{/} => sub {
    #
    # Main templates \page
    #
    if (serve_json) {
        send_as JSON => { state => 'success', result => load_templates() };
    }
    else {
        send_as
          html => template 'certificates-templates.tt',
          {
            active    => 'cert-templates',
            title     => 'Certificate Templates',
            pageTitle => 'Certificate Templates',
            templates => load_templates(),
            forwarded => query_parameters->get('forwarded') // undef,
            messages  => query_parameters->get('result')    // undef,
            location  => '/cert/templates/'
          };
    }
};

post q{/} => sub {
    #
    # Load templates
    #
    my $what = body_parameters->get('what');
    my $result;
    if ( $what && $what eq 'new' ) {
        $result = [
            {
                owner   => user->uid,
                content => {
                    subject => {
                        cn => '$USERNAME$',
                        ou => ['RADIUS Generator']
                    },
                    san => {
                        rfc822Name => ['$MAC$'],
                    },
                    key_type      => 'rsa',
                    key_length    => 1_024,
                    digest        => 'sha256',
                    ext_key_usage => {
                        clientAuth => true
                    },
                    key_usage => {}
                },
                id            => q{},
                friendly_name => q{},
            }
        ];
    }
    else {
        $result = load_templates( split => body_parameters->get('what') );
    }
    send_as JSON => {
        state  => 'success',
        result => $result
    };
};

put q{/} => sub {
    #
    # Save template
    #
    my $friendly_name = body_parameters->get('friendly-name');
    my $template      = body_parameters->get('template');
    $template->{key_length} ||= 1_024;

    $friendly_name ||=
      user->uid . ' template, ' . $template->{key_length} . ' bits key length';
    if ( !scalar keys %{ $template->{subject} } ) {
        send_error( 'Subject must be specified.', HTTP_BAD_REQUEST );
    }

    if ( body_parameters->get('overwrite') ) {
        database->quick_update(
            config->{tables}->{templates},
            {
                id    => body_parameters->get('overwrite'),
                owner => user->uid,
            },
            {
                friendly_name => $friendly_name,
                content => JSON::MaybeXS->new( utf8 => 1 )->encode($template),
                subject => scalar subject_to_string( $template->{subject} )
            }
        );
    }
    else {
        database->quick_insert(
            config->{tables}->{templates},
            {
                id            => \'uuid_generate_v1()',
                owner         => user->uid,
                friendly_name => $friendly_name,
                content => JSON::MaybeXS->new( utf8 => 1 )->encode($template),
                subject => scalar subject_to_string( $template->{subject} )
            }
        );
    }

    send_as JSON =>
      { state => 'success', templates => load_templates( names_only => 1 ) };
};

del q{/} => sub {
    #
    # Delete templates
    #
    my $what = [ body_parameters->get_all('what') ];
    if ( !scalar @{$what} ) {
        send_error( 'Nothing to delete', HTTP_NOT_FOUND );
    }

    my $where = { owner => user->uid };
    if ( $what->[0] ne 'all' ) {
        $where->{id} = $what;
    }

    database->quick_delete( config->{tables}->{templates}, $where );

    send_as JSON =>
      { state => 'success', templates => load_templates( names_only => 1 ) };
};

prefix q{/};

#-----------------------------------------------------------------------------------------------------------------------
# Subroutines
sub load_certificates {
    my %h      = @_;
    my $loaded = [
        database->quick_select(
            config->{tables}->{certificates},
            {
                owner => user->uid,
                type  => $h{type},
                id    => $h{id}
            },
            { columns => $h{columns} }
        )
    ];
    foreach my $cert ( @{$loaded} ) {
        if ( $cert->{keys} ) {
            $cert->{keys} =
              JSON::MaybeXS->new( utf8 => 1 )->decode( $cert->{keys} );
        }
        if ( $cert->{content} =~ /file:/sxm ) { load_certificates_file($cert); }
    }
    return $loaded;
}

sub load_certificates_file {
    my $cert = shift;
    my ( $where, $file ) = split /:/sxm, $cert->{content}, 2;
    my $fh = FileHandle->new( $file, 'r' );
    if ( !defined $fh ) {

        # send_error( "Unable to load certificate file: $ERRNO",
        #     HTTP_INTERNAL_SERVER_ERROR );
        $cert->{broken} = { file => $file, reason => $ERRNO };
        return;
    }
    { local $INPUT_RECORD_SEPARATOR = undef; $cert->{content} = <$fh>; }
    undef $fh;

    foreach my $k ( keys %{ $cert->{keys} } ) {
        next if ( $k ne 'public' && $k ne 'private' );
        ( $where, $file ) = split /:/sxm, $cert->{keys}->{$k}, 2;
        $fh = FileHandle->new( $file, 'r' );
        if ( !defined $fh ) {

            # send_error( "Unable to load certificate file: $ERRNO",
            #     HTTP_INTERNAL_SERVER_ERROR );
            $cert->{broken} = { file => $file, reason => $ERRNO };
            return;
        }
        { local $INPUT_RECORD_SEPARATOR = undef; $cert->{keys}->{$k} = <$fh>; }
        undef $fh;
    }
    return;
}

sub delete_certificates {
    my $where = shift;

    $where->{content} = { 'like' => 'file:%' };
    my $as_files =
      [ database->quick_select( config->{tables}->{certificates}, $where ) ];
    if ( $as_files && scalar @{$as_files} ) {
        my @files;
        foreach my $c ( @{$as_files} ) {
            my ( $d, $file ) = split /:/sxm, $c->{content}, 2;
            push @files, $file;
            if ( $c->{keys} ) {
                $c->{keys} =
                  JSON::MaybeXS->new( utf8 => 1 )->decode( $c->{keys} );
                foreach my $k ( keys %{ $c->{keys} } ) {
                    next if ( $k ne 'public' && $k ne 'private' );
                    ( $d, $file ) = split /:/sxm, $c->{keys}->{$k}, 2;
                    push @files, $file;
                }
            }
        }

        if ( scalar @files ) {
            try {
                unlink @files;
                rmdir dirname( $files[0] );
            }
            catch {
                logging->warn($EVAL_ERROR);
            };
        }
    }
    delete $where->{content};
    database->quick_delete( config->{tables}->{certificates}, $where );
    return;
}

sub load_scep {
    my $split = shift;
    my $where = $split ? { id => $split } : {};
    $where->{owner} = user->uid;
    my $columns = $split ? undef : [qw/id name url/];

    return [
        database->quick_select(
            table('scep_servers'), $where, { columns => $columns }
        )
    ];
}

sub load_by_type {
    my %h = @_;

    my $where      = $h{split} ? { id => $h{split} } : {};
    my $names_only = body_parameters->get('names-only') || $h{names_only} || 0;
    my $no_content = body_parameters->get('no-content') || $h{no_content} || 0;
    $where->{owner} = user->uid;
    $where->{type}  = $h{type};
    my $columns = $h{split} ? undef : [qw/id friendly_name content/];
    $columns = [qw/id friendly_name/] if $names_only;

    my $options = { columns => $columns };
    if ( $h{sort} ) {
        foreach my $key ( keys %{ $h{sort} } ) {
            delete $h{sort}->{$key} if ( $h{sort}->{$key} eq 'undefined' );
        }
        $options->{order_by} = {};
        $options->{order_by}->{ $h{sort}->{order} } = $h{sort}->{column}
          if ( $h{sort}->{column} );
        if ( $h{sort}->{limit} =~ /^\d+$/sxm ) {
            $options->{limit} = $h{sort}->{limit};
        }
        $options->{offset} = $h{sort}->{offset};
    }

    my $certificates = [
        database->quick_select(
            config->{tables}->{certificates},
            $where, $options
        )
    ];
    if ( !$names_only ) {
        foreach my $sign ( @{$certificates} ) {
            if ( $sign->{content} =~ /file:/sxm ) {
                load_certificates_file($sign);
                next if exists $sign->{broken};
            }
            my $x509 =
              Crypt::OpenSSL::X509->new_from_string( $sign->{content} );
            $sign->{subject}    = $x509->subject_name()->as_string();
            $sign->{issuer}     = $x509->issuer_name()->as_string();
            $sign->{not_after}  = $x509->notAfter();
            $sign->{not_before} = $x509->notBefore();
            $sign->{is_expired} = $x509->checkend(0);
        }
    }

    if ($no_content) {
        for ( my $i = 0 ; $i < scalar @{$certificates} ; $i++ ) {
            delete $certificates->[$i]->{content};
        }
    }

    return $certificates;
}

sub load_signers {
    my $split = shift;

    if (
        !database->quick_count(
            config->{tables}->{certificates},
            { owner => user->uid, type => 'signer' }
        )
      )
    {
        # No signer certificates found, create one
        add_self_signed_signer();
        $split = undef;
    }
    return load_by_type( split => $split, type => 'signer' );
}

sub load_identity {
    my %h = @_;
    my $loaded =
      load_by_type( split => $h{split}, type => 'identity', sort => $h{sort} );
    if (wantarray) {
        return (
            $loaded,
            database->quick_count(
                config->{tables}->{certificates},
                { owner => user->uid, type => 'identity' }
            )
        );
    }
    elsif ( defined wantarray ) {
        return $loaded;
    }
}

sub load_trusted {
    my %h      = @_;
    my $loaded = load_by_type(
        split => $h{split},
        type  => 'trusted',
        sort  => $h{sort} // undef
    );
    if (wantarray) {
        return (
            $loaded,
            database->quick_count(
                config->{tables}->{certificates},
                { owner => user->uid, type => 'trusted' }
            )
        );
    }
    elsif ( defined wantarray ) {
        return $loaded;
    }
}

sub get_signer {
    my $signer = shift;
    my $result;
    if ($signer) {
        if (
            !database->quick_count(
                config->{tables}->{certificates},
                { owner => user->uid, type => 'signer', id => $signer }
            )
          )
        {
            send_error( qq/Signer certificate '$signer' not found/,
                HTTP_NOT_FOUND );
        }
        $result = database->quick_select( config->{tables}->{certificates},
            { owner => user->uid, type => 'signer', id => $signer } );
    }
    else {
        $result = database->quick_select(
            config->{tables}->{certificates},
            { owner => user->uid, type     => 'signer' },
            { limit => 1,         order_by => 'id' }
        );
    }

    return $result;
}

sub add_self_signed_signer {
    my $key = KEY_create_rsa(2_048);
    my ( $cert, $k ) = CERT_create(
        subject => {
            commonName             => user->uid . '-SCEP-signer',
            organizationalUnitName => 'RADIUS Generator SCEP'
        },
        CA      => true,
        purpose => [
            qw/client server sslCA digitalSignature nonRepudiation keyEncipherment dataEncipherment keyAgreement keyCertSign/
        ],
        key       => $key,
        not_after => ( time + ( 5 * 31_536_000 ) )
    );

    my $pem = PEM_cert2string($cert);
    my $pvk = PEM_key2string($key);
    save_certificate(
        type             => 'signer',
        certificate_file => \$pem,
        pvk_file         => \$pvk,
        friendly_name    => user->uid . '-SCEP-signer',
        check_if_exists  => 1,
    );

    CERT_free($cert);
    KEY_free($key);

    return 1;
}

sub fill_certificate {
    my $pem = shift;
    my %h   = @_;
    $h{include_pem} //= 1;

    my $x509  = Crypt::OpenSSL::X509->new_from_string($pem);
    my $x509a = Crypt::X509->new( cert => pem_to_der($pem) );

    # debug(to_dumper($x509a->authority_serial));
    my $serial = $x509a->serial;
    if ( is_ref($serial) && $serial->isa('Math::BigInt') ) {
        $serial = uc join q{:}, $x509a->serial->to_hex =~ m/../gsxm;
    }
    else {
        $serial = sprintf '%X', $serial;
        if ( length($serial) % 2 != 0 ) { $serial = '0' . $serial; }
        $serial = join q{:}, $serial =~ m/../gsxm;
    }

    my $pk = create_key( $x509a->PubKeyAlg );
    $pk->import_key( \( $x509a->pubkey ) );

    my $result = {
        pem               => $h{include_pem} ? $pem : undef,
        subject           => $x509a->Subject,
        issuer            => $x509a->Issuer,
        notBefore         => gmtime( $x509a->not_before ) . ' GMT',
        notBefore_ISO8601 =>
          strftime( '%F %H:%M:%S', gmtime( $x509a->not_before ) ),
        notAfter         => gmtime( $x509a->not_after ) . ' GMT',
        notAfter_ISO8601 =>
          strftime( '%F %H:%M:%S', gmtime( $x509a->not_after ) ),
        serial => $serial,
        pubkey => {
            size => $pk->size * 8,
            alg  => $x509a->PubKeyAlg,
        },
        signature => {
            encalg  => $x509a->SigEncAlg,
            hashalg => $x509a->SigHashAlg,
        },
        keyusage    => $x509a->KeyUsage,
        extkeyusage => $x509a->ExtKeyUsage,

        # policies => $x509a->CertificatePolicies,
        basicconstraints => $x509a->BasicConstraints,
        ski              => $x509a->subject_keyidentifier ? uc join q{:},
          unpack( '(H2)*', $x509a->subject_keyidentifier )
        : q{},
        aki => $x509a->key_identifier ? uc join q{:},
          unpack( '(H2)*', $x509a->key_identifier )
        : q{},
        version => $x509a->version_string,
        san     => $x509a->SubjectAltName,
        root    => is_selfsigned($x509a),
    };

    if (wantarray) {
        return ( $result, $x509 );
    }
    elsif ( defined wantarray ) {
        return $result;
    }
}

sub is_selfsigned {
    my $x509 = shift;
    if ( $x509->isa('Crypt::X509') ) {
        return ( $x509->key_identifier
              && $x509->subject_keyidentifier ne $x509->key_identifier )
          ? 0
          : 1;
    }
    elsif ( $x509->isa('Crypt::OpenSSL::X509') ) {
        return $x509->is_selfsigned;
    }
    else {
        return;
    }
}

sub load_private_key {
    my ( $pvk, $pvk_password, $x509 ) = @_;
    my $pvk_data = ( is_scalarref($pvk) )      ? ${$pvk} : $pvk->content;
    my $pvk_form = ( $pvk_data =~ /BEGIN/sxm ) ? 'pem'   : 'der';

    my $private_key;
    my $openssl_arg;

    if ( $x509->key_alg_name =~ /rsaEncryption/isxm ) {
        $openssl_arg = 'rsa';
        $private_key = Crypt::PK::RSA->new();
    }
    elsif ( $x509->key_alg_name =~ /dsaEncryption/isxm ) {
        $openssl_arg = 'dsa';
        $private_key = Crypt::PK::DSA->new();
    }
    else {
        $openssl_arg = 'ec';
        $private_key = Crypt::PK::ECC->new();
    }

    my $tmp          = File::Temp->new();
    my $tmp_pvk_file = File::Temp->new();
    my $pvk_file;
    if ( is_scalarref($pvk) ) {
        print {$tmp_pvk_file} $pvk_data;
        $pvk_file = shell_quote( $tmp_pvk_file->filename );
    }
    else {
        $pvk_file = $pvk->tempname;
    }

    my $cmd =
        qq/openssl $openssl_arg -inform $pvk_form -in $pvk_file/
      . q/ -outform pem -out /
      . shell_quote( $tmp->filename )
      . q/ -passin pass:/
      . shell_quote( $pvk_password || 'none' );

    my $catch = qx[$cmd 2>&1 1>/dev/null];
    if ( $catch =~ /error/isxm ) {
        $catch =~ s/\n/<br>/gsxm;
        send_error( 'Error on decrypting PVK: ' . $catch,
            HTTP_INTERNAL_SERVER_ERROR );
    }

    $private_key->import_key( $tmp->filename );
    return $private_key;
}

sub prepare_tar_of_certificates {
    my %h   = @_;
    my $tar = Archive::Tar->new();
    foreach my $cert ( @{ $h{certificates} } ) {
        ( my $filename = $cert->{friendly_name} ) =~ s/[^A-Za-z0-9\-\.=]/_/gsxm;
        $filename = substr $filename, 0, 230;
        my $chain;
        if ( $h{chain} ) {
            $chain = [ load_chain( cert => $cert->{content} ) ];
        }

        my $folder = q{};
        if ( $h{chain} || ( $cert->{keys} && $cert->{keys}->{private} ) ) {
            my $i = 1;
            $folder = $filename;
            while ( $tar->contains_file("${folder}") ) {
                $folder = $filename . '_' . $i;
                $i++;
            }
            $folder .= q{/};
        }

        if ( is_plain_arrayref($chain) && scalar @{$chain} ) {
            foreach my $x ( @{$chain} ) {
                ( my $ca_name = $x->{friendly_name} ) =~
                  s/[^A-Za-z0-9\-\.=]/_/g;
                $ca_name = substr $ca_name, 0, 230;
                $tar->add_data( "${folder}${ca_name}.pem", $x->{content} );
            }
        }

        if ( $cert->{keys} && $cert->{keys}->{private} ) {
            my $pvk;
            my $type = $cert->{keys}->{type} || 'RSA';
            if ( $type eq 'DSA' ) {
                $pvk = Crypt::PK::DSA->new();
            }
            elsif ( $type eq 'ECC' ) {
                $pvk = Crypt::PK::ECC->new();
            }
            else {
                $pvk = Crypt::PK::RSA->new();
            }
            $pvk->import_key( \$cert->{keys}->{private} );

            $tar->add_data( "${folder}${filename}.pem", $cert->{content} );
            $tar->add_data( "${folder}${filename}.pvk",
                $pvk->export_key_pem( 'private', $h{pvk_password} || undef ) );
        }
        else {
            my $j        = 1;
            my $tmp_name = $filename;
            while ( $tar->contains_file("${folder}${tmp_name}.pem") ) {
                $tmp_name = $filename . '_' . $j;
                $j++;
            }
            $tar->add_data( "${folder}${tmp_name}.pem", $cert->{content} );
        }
    }
    return $tar;
}

sub unpack_certificate {
    my $c   = shift;
    my $asn = Convert::ASN1->new;
    $asn->prepare(
        q<
	SEQUENCE  {
		body		SEQUENCE,
		signatureAlgorithm	SEQUENCE,
		signature		BIT STRING
	}
	>
    );

    my $r = $asn->decode($c);
    debug( $asn->error() );
    return $r;
}

sub pack_cert_body {
    my $c_body = shift;
    my $asn    = Convert::ASN1->new;
    $asn->prepare(
        q<
	body SEQUENCE
	>
    );

    my $r = $asn->encode( body => $c_body );
    debug( $asn->error );
    return $r;
}

sub load_chain {
    my %h = @_;

    my @chain;
    my $x509_t = Crypt::OpenSSL::X509->new_from_string( $h{cert},
        Crypt::OpenSSL::X509::FORMAT_PEM() );
    if ( is_selfsigned($x509_t) ) { return @chain; }

    my $extensions = $x509_t->extensions_by_oid();
    my $aki        = $extensions->{'2.5.29.35'};

    my @issuers = database->quick_select(
        config->{tables}->{certificates},
        { subject => $x509_t->issuer, owner => user->uid },
        { columns => [qw/friendly_name content/] }
    );

    foreach my $issuer (@issuers) {
        my $i_x = Crypt::OpenSSL::X509->new_from_string( $issuer->{content},
            Crypt::OpenSSL::X509::FORMAT_PEM() );

        if ($aki) {
            my $i_x_ext = $i_x->extensions_by_oid();
            if (   $i_x_ext->{'2.5.29.14'}
                && $aki->to_string() =~ $i_x_ext->{'2.5.29.14'}->to_string() )
            {
                push @chain, $issuer;
                if ( !is_selfsigned($i_x) ) {
                    push @chain, load_chain( cert => $issuer->{content} );
                }
            }
        }
        else {
            push @chain, $issuer;
            if ( !is_selfsigned($i_x) ) {
                push @chain, load_chain( cert => $issuer->{content} );
            }
        }
    }

    return @chain;
}

sub fill_csr {
    my $from   = shift;
    my $result = {};
    $from->{subject} ||= {};
    $from->{subject}->{cn} ||= [ user->uid . '-SCEP-signer' ];
    $from->{ext_key_usage} //= {
        clientAuth      => 1,
        codeSigning     => 0,
        emailProtection => 0,
        serverAuth      => 0,
        timeStamping    => 0
    };
    $from->{ext_key_usage}->{name} = 'extKeyUsage';

    $from->{key_usage} //= {
        cRLSign          => 0,
        dataEncipherment => 0,
        decipherOnly     => 0,
        digitalSignature => 1,
        encipherOnly     => 0,
        keyAgreement     => 0,
        keyCertSign      => 0,
        keyEncipherment  => 1,
        nonRepudiation   => 0,
    };
    $from->{key_usage}->{name} = 'keyUsage';

    $result->{key_length} = $from->{key_length} || 1024;
    $result->{digest} =
      ( $from->{digest} && $DIGESTS{ $from->{digest} } )
      ? $from->{digest}
      : 'sha256';
    $result->{subject}    = [];
    $result->{extensions} = [];

    while ( my ( $key, $value ) = each %{ $from->{subject} } ) {
        if ( is_plain_arrayref($value) ) {
            foreach my $part ( @{$value} ) {
                push @{ $result->{subject} },
                  { shortName => uc($key), value => $part };
            }
        }
        else {
            push @{ $result->{subject} },
              { shortName => uc($key), value => $value };
        }
    }

    push @{ $result->{extensions} }, $from->{key_usage};
    push @{ $result->{extensions} }, $from->{ext_key_usage};
    if ( $from->{san} && scalar keys %{ $from->{san} } ) {
        my $san = {
            name     => 'subjectAltName',
            altNames => []
        };
        while ( my ( $key, $value ) = each %{ $from->{san} } ) {
            if ( my $type = $SAN_TYPES{$key} ) {
                foreach my $part ( @{$value} ) {
                    if ( $type == 7 ) {
                        push @{ $san->{altNames} },
                          { type => $type, ip => $part };
                    }
                    else {
                        push @{ $san->{altNames} },
                          { type => $type, value => $part };
                    }
                }
            }
        }
        push @{ $result->{extensions} }, $san;
    }

    return $result;
}

sub generate_csr {
    my $from = shift;

    my %san_convert = (
        1 => 'email',
        2 => 'DNS',
        4 => 'dirName',
        6 => 'URI',
        7 => 'IP',
    );

    my $rsa          = Crypt::OpenSSL::RSA->generate_key( $from->{key_length} );
    my $req          = Crypt::OpenSSL::PKCS10->new_from_rsa($rsa);
    my $subject_text = q{};
    foreach my $s ( @{ $from->{subject} } ) {
        my $t = $s->{value};
        $t =~ s?([=/])?\\$1?g;
        $subject_text .= q{/} . $s->{shortName} . q{=} . $t;
    }
    $req->set_subject( $subject_text, 1 );

    foreach my $ex ( @{ $from->{extensions} } ) {
        if ( $ex->{name} eq 'extKeyUsage' || $ex->{name} eq 'keyUsage' ) {
            my @t;
            while ( my ( $key, $value ) = each %{$ex} ) {
                next if ( $key eq 'name' );
                if ($value) {
                    push @t, $key;
                }
            }
            if ( scalar @t ) {
                if ( $ex->{name} eq 'extKeyUsage' ) {
                    logging->debug( 'Extended Key usage: ' . join( ',', @t ) );
                    $req->add_ext( Crypt::OpenSSL::PKCS10::NID_ext_key_usage,
                        join( ', ', @t ) );
                }
                else {
                    logging->debug( 'Key usage: ' . join( ',', @t ) );
                    $req->add_ext( Crypt::OpenSSL::PKCS10::NID_key_usage,
                        join( ',', @t ) );
                }
            }
        }
        elsif ( $ex->{name} eq 'subjectAltName' ) {
            my @t;
            foreach my $n ( @{ $ex->{altNames} } ) {
                if ( $san_convert{ $n->{type} } ) {
                    push @t, $san_convert{ $n->{type} } . q{:}
                      . ( $n->{value} // $n->{ip} );
                }
            }
            if ( scalar @t ) {
                logging->debug( 'Alt names: ' . join( ',', @t ) );
                $req->add_ext( Crypt::OpenSSL::PKCS10::NID_subject_alt_name,
                    join( ',', @t ) );
            }
        }
    }
    logging->debug('Finishing ext');
    $req->add_ext_final();
    logging->debug('Signing');
    $req->sign();

    if (wantarray) {
        return ( $req->get_pem_req(), $rsa->get_private_key_string() );
    }
    elsif ( defined wantarray ) {
        return $req->get_pem_req();
    }
}

sub save_certificate {
    my %args = @_;
    $args{'check_if_exists'}  //= 1;
    $args{'error_if_exists'}  //= 0;
    $args{'skip_expired'}     //= 1;
    $args{'error_if_expired'} //= 0;
    $args{'as_file'}          //= 0;

    my $cert_content =
      ( is_scalarref( $args{certificate_file} ) )
      ? ${ $args{certificate_file} }
      : $args{certificate_file}->content;
    my $x509;
    if ( $cert_content =~ /BEGIN/sxm ) {
        $x509 = Crypt::OpenSSL::X509->new_from_string( $cert_content,
            Crypt::OpenSSL::X509::FORMAT_PEM() );
    }
    else {
        $x509 = Crypt::OpenSSL::X509->new_from_string( $cert_content,
            Crypt::OpenSSL::X509::FORMAT_ASN1() );
    }

    if ( $args{'check_if_exists'}
        && is_cert_exists( x509 => $x509, type => $args{type} ) )
    {
        if ( $args{'error_if_exists'} ) {
            send_error(
                q/Certificate of / . $x509->subject . q/ is in DB already./,
                HTTP_CONFLICT );
        }
        else {
            return;
        }
    }

    if ( $args{'skip_expired'} && $x509->checkend(1) ) {
        if ( $args{'error_if_expired'} ) {
            send_error(
                q/Certificate of / . $x509->subject . q/ is expired already./,
                HTTP_BAD_REQUEST );
        }
        else {
            return;
        }
    }

    my $data = {
        id            => \'uuid_generate_v1()',
        owner         => user->uid,
        friendly_name => $args{friendly_name} || $x509->subject,
        type          => $args{type},
        content       => $x509->as_string(),
        subject       => $x509->subject,
        serial        => $x509->serial,
        thumbprint    => $x509->fingerprint_sha1(),
        issuer        => $x509->issuer(),
        valid_from    => $x509->notBefore(),
        valid_to      => $x509->notAfter(),
        self_signed   => is_selfsigned($x509) ? 'TRUE' : 'FALSE',
    };

    my $keys = { public => $x509->pubkey(), };

    if ( $args{pvk_file} ) {
        my $pvk =
          load_private_key( $args{pvk_file}, $args{pvk_password}, $x509 );
        my $pk_type;
        $pk_type = 'RSA' if ( ref $pvk eq 'Crypt::PK::RSA' );
        $pk_type = 'DSA' if ( ref $pvk eq 'Crypt::PK::DSA' );
        $pk_type = 'ECC' if ( ref $pvk eq 'Crypt::PK::ECC' );

        $keys->{private} = $pvk->export_key_pem('private');
        $keys->{type}    = $pk_type;
    }

    if ( $args{'as_file'} ) {
        save_certificate_file( $data, $keys );
    }

    $data->{keys} = JSON::MaybeXS->new( utf8 => 1 )->encode($keys);
    database->quick_insert( config->{tables}->{certificates}, $data );
    return 1;
}

sub save_certificate_file {
    my ( $data, $keys ) = @_;
    my $id = Data::GUID->guid_string;
    ( my $sanified_fn = $data->{friendly_name} ) =~ s/[^A-Za-z0-9\-\.=]/_/g;

    my $dir_name = replace_variables(
        config->{directory}->{certificates},
        id            => $id,
        type          => $data->{type},
        user          => user->uid,
        friendly_name => $sanified_fn
    );

    my $errs;
    my @files;
    my $dir_crtd = make_path(
        $dir_name,
        {
            # mode  => 0666,
            # owner => config->{directory}->{creator},
            error => \$errs
        }
    );

    my $file = qq[${dir_name}${sanified_fn}.pem];
    my $fh   = FileHandle->new( $file, 'w+' );
    if ( !defined $fh ) {
        send_error( qq/Couldn't create certificate file: $ERRNO/,
            HTTP_INTERNAL_SERVER_ERROR );
        return;
    }
    print {$fh} $data->{content};
    undef $fh;
    $data->{content} = qq[file:$file];
    push @files, $file;

    foreach my $k ( keys %{$keys} ) {
        next if ( $k ne 'public' && $k ne 'private' );
        my $pfile =
          $dir_name . $sanified_fn . q{.} . substr( $k, 0, 3 ) . q{.pem};
        $fh = FileHandle->new( $pfile, 'w+' );
        if ( !defined $fh ) {
            unlink @files;
            send_error( qq/Couldn't create certificate file: $ERRNO/,
                HTTP_INTERNAL_SERVER_ERROR );
            return;
        }
        print {$fh} $keys->{$k};
        undef $fh;
        $keys->{$k} = 'file:' . $pfile;
        push @files, $pfile;
    }

    my $uid = getpwnam 'nobody';
    chown $uid, -1, @files;
    return 1;
}

sub is_cert_exists {
    my %h = @_;

    my $c = database->quick_lookup(
        config->{tables}->{certificates},
        {
            owner      => user->uid,
            type       => $h{type},
            thumbprint => $h{x509}->fingerprint_sha1,
            serial     => $h{x509}->serial,
        },
        'content'
    );
    return ( $c ? 1 : 0 );
}

sub load_templates {
    my %h     = @_;
    my $where = { owner => user->uid, };
    if ( $h{split} ) { $where->{id} = $h{split}; }

    my $columns;
    if ( $h{names_only} ) { $columns = [qw/id friendly_name subject/]; }

    my @r = database->quick_select( config->{tables}->{templates},
        $where, { columns => $columns } );
    if ( !$h{names_only} ) {
        for ( my $i = 0 ; $i < scalar @r ; $i++ ) {
            $r[$i]->{content} =
              JSON::MaybeXS->new( utf8 => 1 )->decode( $r[$i]->{content} );
        }
    }
    return \@r;
}

sub subject_to_string {
    my $subject = shift;

    my @s;
    foreach my $element (@SUBJECT_ORDER) {
        next
          if ( !$subject->{$element} );
        foreach my $part ( @{ $subject->{$element} } ) {
            push @s, uc($element) . qq/=$part/;
        }
    }

    if (wantarray) {
        return @s;
    }
    elsif ( defined wantarray ) {
        return join ', ', @s;
    }
}

sub search_in_text {
    my %h = @_;
    my $cert_content =
      ( is_scalarref( $h{file} ) ) ? ${ $h{file} } : $h{file}->content;

    my @matches = $cert_content =~
m{(-----BEGIN CERTIFICATE-----[a-zA-Z0-9+=/\s]+-----END CERTIFICATE-----)}g;
    my $f = 0;
    if ( scalar @matches ) {
        foreach my $c (@matches) {
            $f++
              if save_certificate(
                type             => $h{type},
                certificate_file => \$c,
                friendly_name    => q{},
                check_if_exists  => 1,
              );
        }
    }
    return { state => 'success', found => $f };
}

sub search_in_arch {
    my %h = @_;
    if ( $h{file}->basename =~ /\.(tar|tgz|tbz|tar\.gz)$/i ) {
        return search_in_tar(%h);
    }
    else {
        return search_in_zip(%h);
    }
}

sub search_in_tar {
    my %h     = @_;
    my $tar   = Archive::Tar->new();
    my @files = $tar->read( $h{file}->tempname );
    my $total = 0;
    if ( scalar @files ) {
        foreach my $file (@files) {
            next if ( !$file->is_file || !$file->has_content );
            if ( $file->name =~ /[.](pem|txt)$/isxm ) {
                my $c  = $file->get_content;
                my $rv = search_in_text( file => \$c, type => $h{type} );
                $total += $rv->{found};
            }
            elsif ( $file->name =~ /[.](cer|crt|der)$/isxm ) {
                my $c = $file->get_content;
                $total++
                  if save_certificate(
                    type             => $h{type},
                    certificate_file => \$c,
                    friendly_name    => q{},
                    check_if_exists  => 1,
                  );
            }
        }
    }
    return { state => 'success', found => $total };
}

sub search_in_zip {
    my %h   = @_;
    my $zip = Archive::Zip->new();
    my $rv  = $zip->read( $h{file}->tempname );
    if ( $rv != AZ_OK ) {
        debug("Failed to open ZIP with $rv error code");
        return { state => 'error' };
    }
    my $total = 0;
    my @files = $zip->memberNames();
    if ( scalar @files ) {
        foreach my $file (@files) {
            if ( $file =~ /[.](pem|txt)$/isxm ) {
                my $c = $zip->contents($file);
                $rv = search_in_text( file => \$c, type => $h{type} );
                $total += $rv->{found};
            }
            elsif ( $file =~ /[.](cer|crt|der)$/isxm ) {
                my $c = $zip->contents($file);
                $total++
                  if save_certificate(
                    type             => $h{type},
                    certificate_file => \$c,
                    friendly_name    => q{},
                    check_if_exists  => 1,
                  );
            }
        }
    }
    return { state => 'success', found => $total };
}

sub create_key {
    my $alg = shift;
    my ( $pk, $openssl_arg );
    if ( $alg =~ /rsa/isxm ) {
        $openssl_arg = 'rsa';
        $pk          = Crypt::PK::RSA->new();
    }
    elsif ( $alg =~ /dsa/isxm ) {
        $openssl_arg = 'dsa';
        $pk          = Crypt::PK::DSA->new();
    }
    else {
        $openssl_arg = 'ec';
        $pk          = Crypt::PK::ECC->new();
    }

    return ( $pk, $openssl_arg ) if (wantarray);
    return $pk                   if ( defined wantarray );
    return;
}

sub refill_db_certificates {

    # 'SELECT * FROM certificates WHERE NOT (certificates IS NOT NULL);'
    my $where = q/NOT (/ . config->{tables}->{certificates} . q/ IS NOT NULL)/;
    my @certificates = database->quick_select( config->{tables}->{certificates},
        $where, { columns => [qw/id content/] } );

    foreach my $c (@certificates) {
        my ( $r, $x509 ) = fill_certificate( $c->{content}, include_pem => 0 );

        my $data = {
            subject    => join( ', ', @{ $r->{subject} } ),
            serial     => $r->{serial},
            issuer     => join( ', ', @{ $r->{issuer} } ),
            valid_from => \
              qq/TIMESTAMP '$r->{notBefore_ISO8601}' AT TIME ZONE 'UTC'/,
            valid_to => \
              qq/TIMESTAMP '$r->{notAfter_ISO8601}' AT TIME ZONE 'UTC'/,
            self_signed => $r->{root},
        };
        database->quick_update( config->{tables}->{certificates},
            { id => $c->{id} }, $data );
    }
    return { state => 'should be good' };
}

sub replace_variables {
    my ( $line, %vars ) = @_;

    while ( $line =~ / [{]{2} ([^{}]+) [}]{2} /gsxm ) {
        my $v = $vars{$1} // q{};
        $line =~ s/ [{]{2} $1 [}]{2} /$v/gsxm;
    }
    return $line;
}

1;
