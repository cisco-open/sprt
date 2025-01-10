package PRaG::Util::Folders;

use strict;
use warnings;
use File::Spec::Functions qw/no_upwards/;
use File::Basename;

require Exporter;

use base qw(Exporter);

our @EXPORT_OK = qw/remove_folder_if_empty/;

sub remove_folder_if_empty {
    my $folder = shift;
    if ( not( -e $folder and -d $folder ) ) {
        $folder = dirname($folder);
    }
    if ( is_folder_empty($folder) ) {
        unlink $folder;
    }
    return;
}

sub is_folder_empty {
    my $dirname = shift;
    opendir( my $dh, $dirname ) or return;
    return scalar( no_upwards( readdir $dh ) ) == 0;
}

1;
