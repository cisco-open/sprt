#!/usr/bin/env perl

use strict;
use warnings;
no warnings 'experimental';

use Plack::Builder;
use Plack::Middleware::ConditionalGET;
use Plack::Middleware::ETag;
use Plack::App::File;

use FindBin;
use lib "$FindBin::Bin/../lib";

use plackGen;
use PRaGFrontend::auth;
use PRaGFrontend::generate;
use PRaGFrontend::tacacs;
use PRaGFrontend::manipulate;
use PRaGFrontend::manipulate_tacacs;
use PRaGFrontend::pxgrid;
use PRaGFrontend::cert;
use PRaGFrontend::servers;
use PRaGFrontend::preferences;
use PRaGFrontend::guest;
use PRaGFrontend::dictionaries;
use PRaGFrontend::jobs;
use PRaGFrontend::logs;
use PRaGFrontend::cleanup;
use PRaGFrontend::sms;
use PRaGFrontend::ui_api;
use PRaGFrontend::default;

# plackGen->to_app;
my $app     = plackGen->to_app;
my $builder = Plack::Builder->new();

# # static content paths
my $public_dir = plackGen->config->{public_dir};
for my $path (qw/css fonts images js img/) {
    $builder->mount(
        "/$path" => builder {
            enable 'Plack::Middleware::ConditionalGET';
            enable 'Plack::Middleware::ETag',
              file_etag     => [qw/inode mtime size/],
              cache_control => 1;
            Plack::App::File->new( root => "$public_dir/$path" )->to_app;
        }
    );
}

# # mount application itself at '/'
$builder->mount( q{/} => $app );

# # return the PSGI coderef
$builder->to_app;
