package PRaG::Util::TLS;

use strict;
use warnings;
use utf8;

use Carp;
use Crypt::X509;
use Crypt::OpenSSL::X509;
use JSON::MaybeXS;
use Readonly;
use FileHandle;
use English   qw/-no_match_vars/;
use Ref::Util qw/is_ref/;

require Exporter;

use base qw(Exporter);

our @EXPORT_OK = qw/
  parse_tls_options
  parse_validation
  parse_indentity_certs
  parse_tls_usernames
  /;

our $CHAIN_LENGTH;
our $ALERT_CONTENT_TYPE;
our $ALERT_LEVEL_FATAL;
our $SSL_REASONS;
our $KEY_LENGTH;
our $LENGTH_BIT;
our $MORE_BIT;
our $START_BIT;
our $NO_BIT;

Readonly $CHAIN_LENGTH => 10;
Readonly $KEY_LENGTH   => 1_024;

Readonly $LENGTH_BIT => 0x80;
Readonly $MORE_BIT   => 0x40;
Readonly $START_BIT  => 0x20;
Readonly $NO_BIT     => 0x00;

Readonly $ALERT_CONTENT_TYPE => 21;
Readonly $ALERT_LEVEL_FATAL  => 2;
Readonly $SSL_REASONS => {
    0   => 'Close notify',
    10  => 'Unexpected message',
    20  => 'Bad record mac',
    21  => 'Decryption failed',
    22  => 'Record overflow',
    30  => 'Decompression failure',
    40  => 'Handshake failure',
    41  => 'No certificate',
    42  => 'Bad certificate',
    43  => 'Unsupported certificate',
    44  => 'Certificate revoked',
    45  => 'Certificate expired',
    46  => 'Certificate unknown',
    47  => 'Illegal parameter',
    48  => 'Unknown CA',
    49  => 'Access denied',
    50  => 'Decode error',
    51  => 'Decrypt error',
    60  => 'Export restriction',
    70  => 'Protocol version',
    71  => 'Insufficient security',
    80  => 'Internal error',
    90  => 'User canceled',
    100 => 'No renegotiation',
};

our %EXPORT_TAGS = (
    const => [
        qw/
          $CHAIN_LENGTH
          $KEY_LENGTH
          $ALERT_CONTENT_TYPE
          $ALERT_LEVEL_FATAL
          $SSL_REASONS
          $LENGTH_BIT
          $MORE_BIT
          $START_BIT
          $NO_BIT
          /
    ]
);
Exporter::export_ok_tags('const');

sub parse_tls_options {
    my ( $vars, $specific, $e ) = @_;
    my $opts = {
        versions => $specific->{'tls-version'} // 'TLSv1_2',
        ciphers  => $specific->{'allowed-ciphers'},
        chain    => $specific->{'chain-send'} // 'but-root',
    };
    $vars->add(
        type       => 'Const',
        name       => 'TLS_OPTIONS',
        parameters => { value => $opts }
    );
    return 1;
}

sub _load_file {
    my ( $file, $e ) = @_;

    if ( !-e $file ) {
        $e->logger and $e->logger->error("File $file doesn't exist.");
        return;
    }

    my $fh = FileHandle->new( $file, 'r' );
    if ( defined $fh ) {
        my $r = join q{}, $fh->getlines;
        undef $fh;
        return $r;
    }
    else {
        $e->logger and $e->logger->error("Couldn't open file: $ERRNO");
        return;
    }
}

# Load certificates from the DB
sub _load_certs {
    my ( $ids, $type, $e ) = @_;

    my $query =
        sprintf q/SELECT "content", "keys", "id" /
      . q/FROM "%s" /
      . q/WHERE "id" IN (%s) AND "type" = ?/,
      $e->config->{tables}->{certificates},
      join( q{,}, (q{?}) x scalar @{$ids} );
    my @bind = ( @{$ids}, $type );
    $e->logger
      and $e->logger->debug(
        "About to execute SQL: $query with attributes " . join q{,}, @bind );
    my $sth = $e->db->prepare($query);
    if ( !defined $sth->execute(@bind) ) {
        $e->logger
          and $e->logger->fatal( 'Error while execution: ' . $sth->errstr );
        croak 'DB error: ' . $sth->errstr;
    }

    my $certs = $sth->fetchall_arrayref( {} );
    foreach my $c ( @{$certs} ) {
        if ( $c->{content} =~ /^file:(.+)/sxm && -e $1 ) {
            $c->{content} = _load_file( $1, $e );
        }
        $c->{keys} = decode_json( $c->{keys} );

        if (   $c->{keys}->{private}
            && $c->{keys}->{private} =~ /^file:(.+)/sxm
            && -e $1 )
        {
            $c->{keys}->{private} = _load_file( $1, $e );
        }
        if (   $c->{keys}->{public}
            && $c->{keys}->{public} =~ /^file:(.+)/sxm
            && -e $1 )
        {
            $c->{keys}->{public} = _load_file( $1, $e );
        }
    }

    return $certs;
}

# Load trusted certificates by their IDs
sub _load_trusted {
    my ( $trusted, $e ) = @_;

    my @ids = split /,/sxm, $trusted;
    if ( scalar @ids > $CHAIN_LENGTH ) {    # Max 10 allowed, trimming
        @ids = splice @ids, 0, $CHAIN_LENGTH;
    }

    return _load_certs( \@ids, 'trusted', $e );
}

sub _is_selfsigned {
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

sub _load_chain {
    my ( $pem, $e ) = @_;

    my @chain;
    my $x509_t = Crypt::OpenSSL::X509->new_from_string( $pem,
        Crypt::OpenSSL::X509::FORMAT_PEM() );
    return @chain if ( _is_selfsigned($x509_t) );

    my $extensions = $x509_t->extensions_by_oid();
    my $aki        = $extensions->{'2.5.29.35'};

    my $q =
        sprintf q/SELECT "friendly_name", "content" /
      . q/FROM "%s" /
      . q/WHERE "subject" = ? AND "owner" = ?/,
      $e->config->{tables}->{certificates};
    my @bind = ( $x509_t->issuer, $e->owner );

    $e->logger
      and $e->logger->debug(
        "About to execute SQL: $q with parameters " . join q{,}, @bind );

    my $issuers = $e->db->selectall_arrayref( $q, { Slice => {} }, @bind );
    if ( !defined $issuers ) {
        $e->logger
          and $e->logger->fatal( 'Error while execution: ' . $e->db->errstr );
        croak 'DB error: ' . $e->db->errstr;
    }

    $e->logger
      and $e->logger->debug( 'Got ' . scalar( @{$issuers} ) . ' issuers.' );

    foreach my $issuer ( @{$issuers} ) {
        my $i_x = Crypt::OpenSSL::X509->new_from_string( $issuer->{content},
            Crypt::OpenSSL::X509::FORMAT_PEM() );

        if ($aki) {
            my $i_x_ext = $i_x->extensions_by_oid();
            if (   $i_x_ext->{'2.5.29.14'}
                && $aki->to_string() =~ $i_x_ext->{'2.5.29.14'}->to_string() )
            {
                push @chain, $issuer;
                if ( not _is_selfsigned($i_x) ) {
                    push @chain, _load_chain( $issuer->{content}, $e );
                }
            }
        }
        else {
            push @chain, $issuer;
            if ( not _is_selfsigned($i_x) ) {
                push @chain, _load_chain( $issuer->{content}, $e );
            }
        }
    }

    return @chain;
}

sub parse_validation {
    my ( $vars, $specific, $e ) = @_;

    my %actions = (
        'inform' => 1,
        'drop'   => 1,
    );

    my $opts = { validate => $specific->{'validate-server'} // 0 };
    if ( $opts->{validate} ) {
        $opts->{action} =
          exists $actions{ $specific->{'validate-fail-action'} }
          ? $specific->{'validate-fail-action'}
          : 'inform';
        $opts->{trusted} =
          _load_trusted( $specific->{'trusted-certificates'}, $e );
    }

    $vars->add(
        type       => 'Const',
        name       => 'SERVER_VALIDATE',
        parameters => { value => $opts }
    );
    return 1;
}

# Load Identity Certificates with the full chains from the DB
sub _load_identity_certs {
    my ( $id_certs, $e ) = @_;

    my $certificates =
      _load_certs( [ split /,/sxm, $id_certs ], 'identity', $e );
    $e->logger
      and $e->logger->debug(
        'Got ' . scalar( @{$certificates} ) . ' certificates' );
    foreach my $cert ( @{$certificates} ) {
        $cert->{chain} = [ _load_chain( $cert->{content}, $e ) ];
    }

    return $certificates;
}

# Load SCEP server parameters from DB
sub _load_scep {
    my ( $scep_id, $e ) = @_;

    my $query =
        sprintf q/SELECT /
      . q/"%1$s"."ca_certificates" AS "ca", "%1$s"."name" AS "scep_name", /
      . q/"%1$s"."url" AS "url", "%2$s"."content" AS "signer_cert", /
      . q/"%2$s"."keys" AS "signer_keys" /
      . q/FROM "%1$s", "%2$s" /
      . q/WHERE "%1$s"."id" = ? AND "%1$s"."signer" = "%2$s"."id"/,
      $e->config->{tables}->{scep_servers},
      $e->config->{tables}->{certificates};
    $e->logger and $e->logger->debug("About to execute: $query");
    my $scep_data = $e->db->selectrow_hashref( $query, undef, $scep_id );
    if ( !defined $scep_data ) {
        $e->logger
          and $e->logger->fatal( 'Error while execution: ' . $e->db->errstr );
        croak 'DB error: ' . $e->db->errstr;
    }
    elsif ( !$scep_data ) {
        $e->logger and $e->logger->fatal('SCEP server not found');
        croak 'SCEP server not found';
    }

    # scep_data object: {
    # 	ca             - array of CA certificates
    # 	scep_name      - name of SCEP server
    # 	url            - URL of SCEP server
    # 	signer_cert    - signing certificate
    # 	signer_keys    - keys for signing
    #   connect_to     - populated from config
    # }

    $scep_data->{ca}          = decode_json( $scep_data->{ca} );
    $scep_data->{signer_keys} = decode_json( $scep_data->{signer_keys} );
    $scep_data->{connect_to}  = $e->config->{scep};

    return $scep_data;
}

# Load CSR template from DB
sub _load_template {
    my ( $tmpl_id, $e ) = @_;

    my $query =
      sprintf q/SELECT "friendly_name","content" FROM "%s" WHERE "id" = ?/,
      $e->config->{tables}->{templates};
    $e->logger and $e->logger->debug("About to execute: $query");
    my $tmpl_data = $e->db->selectrow_hashref( $query, undef, $tmpl_id );
    if ( !defined $tmpl_data ) {
        $e->logger
          and $e->logger->fatal( 'Error while execution: ' . $e->db->errstr );
        croak 'DB error: ' . $e->db->errstr;
    }
    elsif ( !$tmpl_data ) {
        $e->logger and $e->logger->fatal('CSR Template not found.');
        croak 'CSR Template not found.';
    }

    # tmpl_data object: {
    # 	friendly_name - Friendly name of the template, for logs...
    # 	content       - Content of the template
    # }

    $tmpl_data->{content} = decode_json( $tmpl_data->{content} );

    return $tmpl_data;
}

sub parse_indentity_certs {
    my ( $vars, $params, $e ) = @_;

    if ( $params->{variant} eq 'selected' ) {
        $vars->add(
            type       => 'String',
            name       => 'CERTIFICATE',
            parameters => {
                'variant' => 'list',
                'list' => _load_identity_certs( $params->{'certificates'}, $e ),
                'how-to-follow'    => 'one-by-one',
                'disallow-repeats' => $params->{'disallow-repeats'} // 0
            }
        );
    }
    elsif ( $params->{variant} eq 'scep' ) {
        $vars->add(
            type       => 'Const',
            name       => 'SCEP_OPTIONS',
            parameters =>
              { value => _load_scep( $params->{'scep-server'}, $e ) }
        );
        $vars->add(
            type       => 'Const',
            name       => 'CSR_TEMPLATE',
            parameters =>
              { value => _load_template( $params->{'template'}, $e ) }
        );
        $vars->add(
            type       => 'Const',
            name       => 'SAVE_CERTIFICATES',
            parameters => { value => $params->{'save-id-certificates'} ? 1 : 0 }
        );
    }
    return 1;
}

sub _unh_random {
    my ( $vars, $params, $e ) = @_;
    $vars->add(
        type       => 'String',
        name       => 'USERNAME',
        parameters => {
            'variant'          => 'random',
            'min-length'       => int( $params->{'min-length'} ),
            'max-length'       => int( $params->{'max-length'} ),
            'disallow-repeats' => $params->{'disallow-repeats'} // 0
        }
    );
    return 1;
}

sub _unh_specified {
    my ( $vars, $params, $e ) = @_;
    $vars->add(
        type       => 'String',
        name       => 'USERNAME',
        parameters => {
            'variant'          => 'list',
            'list'             => $params->{'specified-usernames'},
            'how-to-follow'    => 'one-by-one',
            'disallow-repeats' => $params->{'disallow-repeats'} // 0
        }
    );
    return 1;
}

sub _unh_dictionary {
    my ( $vars, $params, $e ) = @_;

    my $lines = $e->load_user_dictionaries( $params->{dictionary} );

    $vars->add(
        type       => 'String',
        name       => 'USERNAME',
        parameters => {
            'variant'          => 'list',
            'list'             => $lines,
            'how-to-follow'    => $params->{'how-to-follow'}    // 'one-by-one',
            'disallow-repeats' => $params->{'disallow-repeats'} // 0
        }
    );
    return 1;
}

sub _unh_as_mac {
    my ( $vars, $params, $e ) = @_;
    $vars->add(
        type       => 'VariableString',
        name       => 'USERNAME',
        parameters => {
            variant => 'pattern',
            pattern => $params->{'remove-delimiters'}
            ? 'no_delimeters($MAC$)'
            : '$MAC$',
        }
    );
    return 1;
}

sub _unh_fc_san_dns {
    my ( $vars, $params, $e ) = @_;
    $vars->add(
        type       => 'Const',
        name       => 'USERNAME',
        parameters => {
            value => {
                from  => 'cert',
                where => '_FIRST_SAN_DNS'
            }
        }
    );
    return 1;
}

sub _unh_fc_cn {
    my ( $vars, $params, $e ) = @_;
    $vars->add(
        type       => 'Const',
        name       => 'USERNAME',
        parameters => {
            value => {
                from  => 'cert',
                where => '_CN'
            }
        }
    );
    return 1;
}

sub _unh_fc_san_pattern {
    my ( $vars, $params, $e ) = @_;
    $vars->add(
        type       => 'Const',
        name       => 'USERNAME',
        parameters => {
            value => {
                from    => 'cert',
                where   => '_ANY_SAN',
                pattern => $params->{'san-pattern'},
                allowed => $params->{'san-types-allowed'},
            }
        }
    );
    return 1;
}

Readonly my %UNAME_HANDLERS => (
    'random'                => \&_unh_random,
    'specified'             => \&_unh_specified,
    'dictionary'            => \&_unh_dictionary,
    'same-as-mac'           => \&_unh_as_mac,
    'from-cert-san-dns'     => \&_unh_fc_san_dns,
    'from-cert-cn'          => \&_unh_fc_cn,
    'from-cert-san-pattern' => \&_unh_fc_san_pattern,
);

sub parse_tls_usernames {
    my ( $vars, $params, $e ) = @_;

    return 1
      if ( exists $UNAME_HANDLERS{ $params->{variant} }
        && $UNAME_HANDLERS{ $params->{variant} }->( $vars, $params, $e ) );

    carp 'Unsupported variant' . $params->{variant};
    return;
}

1;
