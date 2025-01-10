#!/usr/bin/perl -w

use strict;
use warnings;

use LWP::UserAgent ();
use JSON::MaybeXS;
use Path::Tiny;
use File::Basename;
use Cwd 'abs_path';
use Getopt::Long;

my (undef, $DIR, undef) = fileparse(__FILE__);
my $PARENT = abs_path($DIR."../")."/";

my $save_to = '';	# option variable with default value (false)
GetOptions ('save:s' => \$save_to);

my $ua = LWP::UserAgent->new;
$ua->timeout(10);
$ua->ssl_opts(verify_hostname => 0);
$ua->env_proxy;
 
my $response = $ua->get('placeholder');
 
if ($response->is_success) {
    # print $response->decoded_content;
    my $v = decode_json($response->decoded_content);  # or whatever
    # print $v->{version};
    path("${PARENT}lib/plackGen.pm")->slurp_utf8 =~ /our\s+\$VERSION\s*=\s*'([\d.]+)';/;
    if ($1) {
        print ($1 eq $v->{version} ? 0 : 1);
    } else {
        die "Couldn't identify current version. Upgrade manually."
    }
} else {
    die $response->status_line;
}