package PRaG::Role::Certificates;

use strict;
use utf8;

use Moose::Role;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Data::Dumper;
use Data::GUID;
use Crypt::OpenSSL::X509;
use Crypt::OpenSSL::PKCS10;
use Crypt::OpenSSL::RSA;
use Crypt::X509;
use File::Path qw/make_path/;
use JSON::MaybeXS;
use Ref::Util qw/is_ref/;

sub _save_certificate {
    my $self        = shift;
    my $certificate = shift;

    return $certificate if ( !is_ref($certificate) );  # Nothing to save, return

    my $x509;
    if ( $certificate->{content} =~ /BEGIN/sm ) {
        $x509 = Crypt::OpenSSL::X509->new_from_string( $certificate->{content},
            Crypt::OpenSSL::X509::FORMAT_PEM() );
    }
    else {
        $x509 = Crypt::OpenSSL::X509->new_from_string( $certificate->{content},
            Crypt::OpenSSL::X509::FORMAT_ASN1() );
    }

    my $id   = Data::GUID->guid_string;
    my $data = {
        id            => $id,
        owner         => $self->owner,
        friendly_name => $x509->subject,
        type          => $certificate->{type},
        content       => $x509->as_string(),
        subject       => $x509->subject,
        serial        => $x509->serial,
        thumbprint    => $x509->fingerprint_sha1(),
        issuer        => $x509->issuer(),
        valid_from    => $x509->notBefore(),
        valid_to      => $x509->notAfter(),
        self_signed   => $self->_is_selfsigned($x509) ? 'TRUE' : 'FALSE',
    };

    my $keys = {
        public  => $x509->pubkey(),
        private => $certificate->{pvk},
        type    => 'RSA',
    };

    $self->_save_certificate_file( $data, $keys );

    my $json_obj = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );
    $data->{keys} = $json_obj->encode($keys);
    undef $json_obj;

    my $query = sprintf
      'INSERT INTO "%s" (%s) VALUES (%s)',
      $self->config->{tables}->{certificates},
      join( q{,}, map { $self->db->quote_identifier($_) } keys %{$data} ),
      join( q{,}, (q{?}) x scalar( keys %{$data} ) );
    $self->logger
      and $self->logger->debug(
        "Executing $query with params " . join( q{,}, values %{$data} ) );

    if ( !defined $self->db->do( $query, undef, values %{$data} ) ) {
        $self->logger
          and $self->logger->error( 'SQL exception: ' . $self->db->errstr );
        return;
    }

    $self->logger
      and $self->logger->debug("Certificate saved in DB with ID $id");

    return $id;
}

sub _save_certificate_file {
    my $self = shift;
    my ( $data, $keys ) = @_;
    my $id = Data::GUID->guid_string;
    ( my $sanified_fn = $data->{friendly_name} ) =~ s/[^A-Za-z0-9\-\.=]/_/g;

    my $dir_name = replace_variables(
        $self->config->{directory}->{certificates},
        id            => $id,
        type          => $data->{type},
        user          => $self->owner,
        friendly_name => $sanified_fn
    );

    my $errs;
    my @files;
    my $dir_crtd = make_path(
        $dir_name,
        {
            # mode  => 0664,
            # owner => $self->config->{directory}->{creator},
            error => \$errs
        }
    );

    my $file = qq[${dir_name}${sanified_fn}.pem];
    my $fh   = FileHandle->new( $file, 'w+' );
    if ( !defined $fh ) {
        send_error( qq/Couldn't create certificate file: $!/, 500 );
        return;
    }
    print $fh $data->{content};
    undef $fh;
    $data->{content} = qq[file:$file];
    push @files, $file;

    foreach my $k ( keys %{$keys} ) {
        next if ( $k ne 'public' && $k ne 'private' );
        my $pfile =
          $dir_name . $sanified_fn . q{.} . substr( $k, 0, 3 ) . qq[.pem];
        $fh = FileHandle->new( $pfile, 'w+' );
        if ( !defined $fh ) {
            unlink @files;
            send_error( qq/Couldn't create certificate file: $!/, 500 );
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

sub _is_selfsigned {
    my $self = shift;
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

sub replace_variables {
    my $line = shift;
    my %vars = @_;

    while ( $line =~ /\{\{([^{}]+)\}\}/g ) {
        my $v = $vars{$1} // q{};
        $line =~ s/\{\{$1\}\}/$v/g;
    }
    return $line;
}

1;
