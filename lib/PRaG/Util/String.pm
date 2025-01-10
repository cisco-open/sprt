package PRaG::Util::String;

use strict;
use warnings;

require Exporter;

use base qw(Exporter);

our @EXPORT_OK = qw/hex_to_ascii ascii_to_hex as_hex_string/;

# hex_to_ascii
sub hex_to_ascii {
    return pack 'H*', shift;
}

sub ascii_to_hex {
    return unpack 'H*', shift;
}

sub as_hex_string {
    my ( $s, %opts ) = @_;

    $opts{delimeter} //= q{ };
    return join $opts{delimeter},
      map { sprintf '%02X', $_ } unpack 'C' . length($s),
      $s;
}

1;
