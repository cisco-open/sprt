package PRaG::Role::Config;

use strict;
use utf8;

use Moose::Role;
use namespace::autoclean;

use Carp;
use Cwd 'abs_path';
use English qw/ -no_match_vars /;
use FindBin;
use YAML qw/LoadFile/;

use PRaG::Util::ENVConfig qw/apply_env_cfg/;

has 'configfile' => (
    is            => 'rw',
    isa           => 'Str',
    required      => 0,
    documentation => 'SPRT configuration file.',
);

has 'config' => (
    is     => 'ro',
    isa    => 'HashRef',
    writer => '_set_config',
    traits => ['NoGetopt'],
);

sub _init_config {
    my $self = shift;

    if ( !$self->configfile
        || ( $self->configfile && !-e $self->configfile ) )
    {
        print "Trying default config file.\n";
        my $DIR = abs_path( $FindBin::Bin . '/../' ) . q{/};
        $self->configfile("${DIR}config.yml");
    }

    if ( not -e $self->configfile ) { croak 'Config file not found!' }

    $self->_set_config( LoadFile( $self->configfile ) );

    apply_env_cfg( $self->config );

    return $self;
}

sub config_at {
    my ( $self, $path, $default ) = @_;
    $default //= undef;
    if ( not is_plain_arrayref($path) ) {
        $path = [ split /[.]/sxm, $path ];
    }

    return $default if not scalar @{$path};

    my $found = $self->config;
    for ( 0 .. $#{$path} ) {
        if ( exists $found->{ $path->[$_] } ) {
            $found = $found->{ $path->[$_] };
        }
        else { return $default; }
    }

    return $found;
}

1;
