package PRaG::Proto::RoleMSCHAP;

use strict;
use utf8;

use Moose::Role;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Carp;
use Crypt::Digest::MD4;
use Crypt::Digest::SHA1;
use Crypt::Mode::ECB;
use Crypt::Stream::RC4;
use English qw/-no_match_vars/;
use Encode  qw/from_to/;
use Encode::Guess;
use Math::Random::Secure qw/irand/;
use Readonly;

use PRaG::Util::String qw/as_hex_string hex_to_ascii/;

our $CHALLENGE_OPCODE;
our $CHALLENGE_RESPONSE_OPCODE;
our $SUCCESS_RESPONSE_OPCODE;
our $FAILURE_RESPONSE_OPCODE;
our $PASSWORD_CHANGE_OPCODE;

our $CHALLENGE_SIZE;
our $MS_HEADER_SIZE;
our $RESPONSE_VALUE_SIZE;
our $HASH_SIZE_8;
our $HASH_SIZE_16;
our $OCTET_7;

Readonly $CHALLENGE_OPCODE          => 0x01;
Readonly $CHALLENGE_RESPONSE_OPCODE => 0x02;
Readonly $SUCCESS_RESPONSE_OPCODE   => 0x03;
Readonly $FAILURE_RESPONSE_OPCODE   => 0x04;
Readonly $PASSWORD_CHANGE_OPCODE    => 0x07;

Readonly $CHALLENGE_SIZE      => 16;
Readonly $HASH_SIZE_8         => 8;
Readonly $HASH_SIZE_16        => 16;
Readonly $OCTET_7             => 7;
Readonly $MS_HEADER_SIZE      => 4;
Readonly $RESPONSE_VALUE_SIZE => 49;

Readonly my %OPCODE_STRINGS => (
    $CHALLENGE_OPCODE          => 'CHALLENGE',
    $CHALLENGE_RESPONSE_OPCODE => 'CHALLANGE_RESPONSE',
    $SUCCESS_RESPONSE_OPCODE   => 'SUCCESS_RESPONSE',
    $FAILURE_RESPONSE_OPCODE   => 'FAILURE_RESPONSE',
    $PASSWORD_CHANGE_OPCODE    => 'PASSWORD_CHANGE',
);

our $ERROR_RESTRICTED_LOGON_HOURS;
our $ERROR_ACCT_DISABLED;
our $ERROR_PASSWD_EXPIRED;
our $ERROR_NO_DIALIN_PERMISSION;
our $ERROR_AUTHENTICATION_FAILURE;
our $ERROR_CHANGING_PASSWORD;

Readonly $ERROR_RESTRICTED_LOGON_HOURS => 646;
Readonly $ERROR_ACCT_DISABLED          => 647;
Readonly $ERROR_PASSWD_EXPIRED         => 648;
Readonly $ERROR_NO_DIALIN_PERMISSION   => 649;
Readonly $ERROR_AUTHENTICATION_FAILURE => 691;
Readonly $ERROR_CHANGING_PASSWORD      => 709;

Readonly my %ERROR_STRINGS => (
    $ERROR_RESTRICTED_LOGON_HOURS => 'ERROR_RESTRICTED_LOGON_HOURS',
    $ERROR_ACCT_DISABLED          => 'ERROR_ACCT_DISABLED',
    $ERROR_PASSWD_EXPIRED         => 'ERROR_PASSWD_EXPIRED',
    $ERROR_NO_DIALIN_PERMISSION   => 'ERROR_NO_DIALIN_PERMISSION',
    $ERROR_AUTHENTICATION_FAILURE => 'ERROR_AUTHENTICATION_FAILURE',
    $ERROR_CHANGING_PASSWORD      => 'ERROR_CHANGING_PASSWORD',
);

Readonly my $BYTE_MAX  => 256;
Readonly my $BITS_BYTE => 8;

Readonly my $MAGICS => {
    1 => [
        0x54, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x74, 0x68,
        0x65, 0x20, 0x4d, 0x50, 0x50, 0x45, 0x20, 0x4d, 0x61, 0x73,
        0x74, 0x65, 0x72, 0x20, 0x4b, 0x65, 0x79,
    ],
    2 => [
        0x4f, 0x6e, 0x20, 0x74, 0x68, 0x65, 0x20, 0x63, 0x6c, 0x69,
        0x65, 0x6e, 0x74, 0x20, 0x73, 0x69, 0x64, 0x65, 0x2c, 0x20,
        0x74, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x74, 0x68,
        0x65, 0x20, 0x73, 0x65, 0x6e, 0x64, 0x20, 0x6b, 0x65, 0x79,
        0x3b, 0x20, 0x6f, 0x6e, 0x20, 0x74, 0x68, 0x65, 0x20, 0x73,
        0x65, 0x72, 0x76, 0x65, 0x72, 0x20, 0x73, 0x69, 0x64, 0x65,
        0x2c, 0x20, 0x69, 0x74, 0x20, 0x69, 0x73, 0x20, 0x74, 0x68,
        0x65, 0x20, 0x72, 0x65, 0x63, 0x65, 0x69, 0x76, 0x65, 0x20,
        0x6b, 0x65, 0x79, 0x2e,
    ],
    3 => [
        0x4f, 0x6e, 0x20, 0x74, 0x68, 0x65, 0x20, 0x63, 0x6c, 0x69,
        0x65, 0x6e, 0x74, 0x20, 0x73, 0x69, 0x64, 0x65, 0x2c, 0x20,
        0x74, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x74, 0x68,
        0x65, 0x20, 0x72, 0x65, 0x63, 0x65, 0x69, 0x76, 0x65, 0x20,
        0x6b, 0x65, 0x79, 0x3b, 0x20, 0x6f, 0x6e, 0x20, 0x74, 0x68,
        0x65, 0x20, 0x73, 0x65, 0x72, 0x76, 0x65, 0x72, 0x20, 0x73,
        0x69, 0x64, 0x65, 0x2c, 0x20, 0x69, 0x74, 0x20, 0x69, 0x73,
        0x20, 0x74, 0x68, 0x65, 0x20, 0x73, 0x65, 0x6e, 0x64, 0x20,
        0x6b, 0x65, 0x79, 0x2e,
    ],
    4 => [
        0x4D, 0x61, 0x67, 0x69, 0x63, 0x20, 0x73, 0x65, 0x72, 0x76,
        0x65, 0x72, 0x20, 0x74, 0x6F, 0x20, 0x63, 0x6C, 0x69, 0x65,
        0x6E, 0x74, 0x20, 0x73, 0x69, 0x67, 0x6E, 0x69, 0x6E, 0x67,
        0x20, 0x63, 0x6F, 0x6E, 0x73, 0x74, 0x61, 0x6E, 0x74,
    ],
    5 => [
        0x50, 0x61, 0x64, 0x20, 0x74, 0x6F, 0x20, 0x6D, 0x61, 0x6B,
        0x65, 0x20, 0x69, 0x74, 0x20, 0x64, 0x6F, 0x20, 0x6D, 0x6F,
        0x72, 0x65, 0x20, 0x74, 0x68, 0x61, 0x6E, 0x20, 0x6F, 0x6E,
        0x65, 0x20, 0x69, 0x74, 0x65, 0x72, 0x61, 0x74, 0x69, 0x6F,
        0x6E,
    ]
};

require Exporter;

use base qw(Exporter);

Readonly my @CONST_NAMES => qw/
  $CHALLENGE_OPCODE
  $CHALLENGE_RESPONSE_OPCODE
  $SUCCESS_RESPONSE_OPCODE
  $FAILURE_RESPONSE_OPCODE
  $PASSWORD_CHANGE_OPCODE
  $CHALLENGE_SIZE
  $MS_HEADER_SIZE
  $RESPONSE_VALUE_SIZE
  /;

Readonly my @ERR_NAMES => qw/
  $ERROR_RESTRICTED_LOGON_HOURS
  $ERROR_ACCT_DISABLED
  $ERROR_PASSWD_EXPIRED
  $ERROR_NO_DIALIN_PERMISSION
  $ERROR_AUTHENTICATION_FAILURE
  $ERROR_CHANGING_PASSWORD
  /;

our %EXPORT_TAGS = ( const => \@CONST_NAMES, errors => \@ERR_NAMES );
Exporter::export_ok_tags( 'const', 'errors' );

for my $k ( keys %{$MAGICS} ) {
    has "magic$k" => (
        is      => 'ro',
        isa     => 'Str',
        default => sub {
            join q{}, map { chr } @{ $MAGICS->{$k} };
        },
    );
}

sub random_buffer {
    my ( $self, $length ) = @_;

    my @buf = map { chr irand($BYTE_MAX) } ( 1 .. $length );
    return @buf if wantarray;
    return join q{}, @buf;
}

Readonly my %H2B => (
    '0' => '0000',
    '1' => '0001',
    '2' => '0010',
    '3' => '0011',
    '4' => '0100',
    '5' => '0101',
    '6' => '0110',
    '7' => '0111',
    '8' => '1000',
    '9' => '1001',
    'a' => '1010',
    'b' => '1011',
    'c' => '1100',
    'd' => '1101',
    'e' => '1110',
    'f' => '1111',
);

sub set_parity {
    my ( $self, $key ) = @_;

    my $hexstr = lc unpack 'H*', $key;

    my $bin_string;
    ( $bin_string = $hexstr ) =~ s/(.)/$H2B{lc $1}/gsxm;

    my $bin_output = q{};
    my $parity     = 0;
    my $count      = 0;

    for my $i ( split //sxm, $bin_string ) {
        if ( $i eq '1' ) {
            $parity = !$parity;
        }

        $bin_output .= $i;
        $count++;
        if ( $count == $OCTET_7 ) {
            $bin_output .= $parity ? '0' : '1';
            $parity = 0;
            $count  = 0;
        }
    }

    my $chars  = length $bin_output;
    my @output = pack "B$chars", $bin_output;

    return join q{}, @output;
}

sub raw_bytes_for_nt_pass {
    my ( $self, $password ) = @_;

    my $from = Encode::Guess->guess($password)->name;

    my $enc = $password;
    if ( utf8::is_utf8($enc) ) {
        utf8::encode($enc);
    }
    from_to( $enc, $from, 'UTF-16le' );

    return $enc;
}

sub nt_password_hash {
    my ( $self, $password ) = @_;

    my $md4 = Crypt::Digest::MD4->new;
    $md4->add( $self->raw_bytes_for_nt_pass($password) );
    return $md4->digest;
}

sub challenge_hash {
    my ( $self, $client_challenge, $server_challenge, $user_name ) = @_;

    my @username_parts = split /\\/sxm, $user_name;
    my $u_name;
    if ( @username_parts == 2 ) {
        $u_name = $username_parts[1]
          ; # calculate hash-value using username only -- without the domain name prefix
    }
    else {
        $u_name = $username_parts[0]
          ; # calculate hash-value using the entire username, as originally received
    }

    my $sha1 = Crypt::Digest::SHA1->new();
    $sha1->add( substr $client_challenge, 0, $CHALLENGE_SIZE );
    $sha1->add( substr $server_challenge, 0, $CHALLENGE_SIZE );
    $sha1->add($u_name);

    return substr $sha1->digest(), 0, $HASH_SIZE_8;
}

sub nt_encrypt_password {
    my ( $self, $new_password, $old_password_hash ) = @_;

    Readonly my $MAX_SIZE => 512;

    my $raw_pass    = $self->raw_bytes_for_nt_pass($new_password);
    my $pass_size   = length $raw_pass;
    my $pass_offset = $MAX_SIZE - $pass_size;
    my $pass_block  = $self->random_buffer($pass_offset) . $raw_pass;

    my $block = pack qq{a$MAX_SIZE L}, $pass_block, $pass_size;

    my $stream = Crypt::Stream::RC4->new($old_password_hash);
    my $result = $stream->crypt($block);

    return $result;
}

sub challenge_response {
    my ( $self, $challenge, $password_hash ) = @_;
    my $z_password_hash = pack 'Z21', $password_hash;

    Readonly my $FIRST  => 0;
    Readonly my $SECOND => 7;
    Readonly my $THIRD  => 14;

    my $res1 =
      $self->des_encrypt( $challenge,
        substr( $z_password_hash, $FIRST, $OCTET_7 ) )
      ;    #   1st 7 octets of z_password_hash as key.
    my $res2 =
      $self->des_encrypt( $challenge,
        substr( $z_password_hash, $SECOND, $OCTET_7 ) )
      ;    #  2nd 7 octets of z_password_hash as key.
    my $res3 =
      $self->des_encrypt( $challenge,
        substr( $z_password_hash, $THIRD, $OCTET_7 ) )
      ;    # 3rd 7 octets of z_password_hash as key.

    my $res_buffer =
        substr( $res1, 0, $HASH_SIZE_8 )
      . substr( $res2, 0, $HASH_SIZE_8 )
      . substr( $res3, 0, $HASH_SIZE_8 );
    return $res_buffer;
}

sub challenge_response_v2 {
    my ( $self, $challenge, $password_hash ) = @_;
    return $self->challenge_response(
        substr( $challenge,     0, $HASH_SIZE_8 ),
        substr( $password_hash, 0, $HASH_SIZE_16 )
    );
}

sub generate_nt_response {
    my ( $self, $peer_challenge, $auth_challenge, $username, $password ) = @_;

    my $challenge =
      $self->challenge_hash( $peer_challenge, $auth_challenge, $username );
    my $password_hash = $self->nt_password_hash($password);

    return $self->challenge_response_v2( $challenge, $password_hash );
}

sub old_nt_password_hash_encrypted_with_new_nt_password_hash {
    my ( $self, $new_password, $old_password ) = @_;
    my $old_password_hash = $self->nt_password_hash($old_password);
    my $new_password_hash = $self->nt_password_hash($new_password);

    return $self->nt_password_hash_encrypted_with_block( $old_password_hash,
        $new_password_hash );
}

sub nt_password_hash_encrypted_with_block {
    my ( $self, $password_hash, $block ) = @_;

    my $cypher = q{};
    for my $i ( 0 .. 1 ) {
        my $pw_hash_part = substr $password_hash, $i * $HASH_SIZE_8,
          $HASH_SIZE_8;
        my $block_part = substr $block, $i * $OCTET_7, $OCTET_7;

        $cypher .= $self->des_encrypt( $pw_hash_part, $block_part );
    }

    return $cypher;
}

sub nt_password_hash_hash {
    my ( $self, $password ) = @_;

    my $md4 = Crypt::Digest::MD4->new;
    $md4->add( $self->raw_bytes_for_nt_pass($password) );
    my $bytes = $md4->digest;
    $md4->reset;
    $md4->add($bytes);

    return $md4->digest;
}

sub get_session_key {
    my ( $self, $password, $nt_response ) = @_;
    my $password_hash_hash = $self->nt_password_hash_hash($password);

    Readonly my $KEY_LENGTH => 16;
    my $master_key =
      substr sha1( $password_hash_hash, $nt_response, $self->magic1 ), 0,
      $KEY_LENGTH;

    Readonly my $PAD_LENGTH => 40;
    Readonly my $SHSPAD1    => chr(0x00) x $PAD_LENGTH;
    Readonly my $SHSPAD2    => chr(0xf2) x $PAD_LENGTH;

    #client send key uses Magic2, client recv key use Magic3
    my $client_send_key =
      substr sha1( $master_key, $SHSPAD1, $self->magic2, $SHSPAD2 ), 0,
      $KEY_LENGTH;
    my $client_recv_key =
      substr sha1( $master_key, $SHSPAD1, $self->magic3, $SHSPAD2 ), 0,
      $KEY_LENGTH;

    return $client_recv_key . $client_send_key;
}

sub des_encrypt {
    my ( $self, $clear, $key ) = @_;

    my $parity = $self->set_parity($key);
    my $m      = Crypt::Mode::ECB->new( 'DES', 0 );
    $m->start_encrypt($parity);
    return $m->add($clear) . $m->finish;
}

sub parse_mschapv2_packet {
    my ( $self, $data ) = @_;
    my ( $opcode, $identifier, $ms_len, $value ) = unpack 'CCna*', $data;

    return ( $opcode, $identifier, $ms_len, $value ) if wantarray;
    return {
        opcode => $opcode,
        id     => $identifier,
        length => $ms_len,
        data   => $value,
      }
      if defined wantarray;
    return;
}

sub parse_mschapv2_challenge {
    my ( $self, $data ) = @_;
    my ( $vs, $challenge, $name ) = unpack 'C a16 a*', $data;

    return ( $vs, $challenge, $name ) if wantarray;
    return {
        value_size => $vs,
        challenge  => $challenge,
        name       => $name,
      }
      if defined wantarray;
    return;
}

sub parse_mschapv2_failure {
    my ( $self, $data ) = @_;

    my $email_r     = 'E=(?<Error_Code>\d{1,10})\s+';
    my $retry_r     = 'R=(?<Retry_Flag>[01])\s+';
    my $challenge_r = '(C=(?<Challenge>[0-9A-F]{32})\s+){0,1}';
    my $version_r   = 'V=(?<Version>3)';
    my $regexp      = qr{$email_r $retry_r $challenge_r $version_r}sxm;

    if ( $data =~ $regexp ) {
        return (
            $LAST_PAREN_MATCH{Error_Code}, $LAST_PAREN_MATCH{Retry_Flag},
            $LAST_PAREN_MATCH{Challenge},  $LAST_PAREN_MATCH{Version}
        ) if wantarray;
        return {
            error_code => $LAST_PAREN_MATCH{Error_Code},
            retry_flag => int( $LAST_PAREN_MATCH{Retry_Flag} ),
            challenge  => $LAST_PAREN_MATCH{Challenge},
            version    => $LAST_PAREN_MATCH{Version}
          }
          if defined wantarray;
    }

    return;
}

sub parse_mschapv2_success {
    my ( $self, $data ) = @_;

    my $auth_str_r = 'S=(?<Auth_String>[0-9A-F]{40})';
    my $message_r  = '(\s+M=(?<Message>.+))?$';
    my $regexp     = qr{$auth_str_r $message_r}sxm;

    if ( $data =~ $regexp ) {
        return ( $LAST_PAREN_MATCH{Auth_String}, $LAST_PAREN_MATCH{Message}, )
          if wantarray;
        return {
            auth_string => $LAST_PAREN_MATCH{Auth_String},
            message     => $LAST_PAREN_MATCH{Message},
          }
          if defined wantarray;
    }

    return;
}

sub opcode_string {
    my ( $self, $opcode ) = @_;
    return $OPCODE_STRINGS{$opcode} // 'Unknown opcode';
}

sub mschap_error_string {
    my ( $self, $error ) = @_;
    return $ERROR_STRINGS{$error} // 'Unknown error';
}

sub is_challenge_opcode {
    my ( $self, $opcode ) = @_;
    return $opcode == $CHALLENGE_OPCODE;
}

sub is_response_opcode {
    my ( $self, $opcode ) = @_;
    return $opcode == $CHALLENGE_RESPONSE_OPCODE;
}

sub is_success_opcode {
    my ( $self, $opcode ) = @_;
    return $opcode == $SUCCESS_RESPONSE_OPCODE;
}

sub is_failure_opcode {
    my ( $self, $opcode ) = @_;
    return $opcode == $FAILURE_RESPONSE_OPCODE;
}

sub is_password_change_opcode {
    my ( $self, $opcode ) = @_;
    return $opcode == $PASSWORD_CHANGE_OPCODE;
}

1;
