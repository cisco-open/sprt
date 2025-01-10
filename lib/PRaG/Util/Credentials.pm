package PRaG::Util::Credentials;

use strict;
use warnings;
use utf8;

use Carp;
use Readonly;
use Ref::Util  qw/is_ref/;
use List::Util qw/min/;

require Exporter;

use base qw(Exporter);

our @EXPORT_OK = qw/parse_credentials/;

Readonly my %VARIANT_HANDLERS => (
    'list'       => \&_vh_list,
    'dictionary' => \&_vh_dictionary,
);

sub parse_credentials {
    my ( $vars, $specific, $e ) = @_;

    if ( defined $specific->{'credentials'} ) {
        _parse_credentials( $vars, $specific->{'credentials'}, $e );
    }
    if ( $specific->{'pap-count-as-creds'} ) {
        $e->_set_count(
            min(
                $vars->amount_of('CREDENTIALS'),
                $e->config->{processes}->{max_sessions},
            )
        );
    }
    return;
}

sub _parse_credentials {
    my ( $vars, $params, $e ) = @_;

    if ( is_ref($params) ) {
        if (   !exists $VARIANT_HANDLERS{ $params->{variant} }
            || !$VARIANT_HANDLERS{ $params->{variant} }->( $vars, $params, $e )
          )
        {
            carp 'Unsupported variant' . $params->{variant};
        }
    }
    else {
        $vars->add(
            type       => 'Credentials',
            name       => 'CREDENTIALS',
            parameters => {
                'variant'          => 'list',
                'list'             => $params,
                'how-to-follow'    => 'one-by-one',
                'disallow-repeats' => 0
            }
        );
    }

    $vars->add_alias( var => 'USERNAME', alias => 'CREDENTIALS.0' );
    $vars->add_alias( var => 'PASSWORD', alias => 'CREDENTIALS.1' );

    return;
}

sub _vh_list {
    my ( $vars, $params, $e ) = @_;
    $vars->add(
        type       => 'Credentials',
        name       => 'CREDENTIALS',
        parameters => {
            'variant'          => 'list',
            'list'             => $params->{'credentials-list'},
            'how-to-follow'    => 'one-by-one',
            'disallow-repeats' => 0
        }
    );
    return 1;
}

sub _vh_dictionary {
    my ( $vars, $params, $e ) = @_;

    my $lines = $e->load_user_dictionaries( $params->{dictionary} );

    $vars->add(
        type       => 'Credentials',
        name       => 'CREDENTIALS',
        parameters => {
            'variant'          => 'list',
            'list'             => $lines,
            'how-to-follow'    => $params->{'how-to-follow'}    // 'one-by-one',
            'disallow-repeats' => $params->{'disallow-repeats'} // 0
        }
    );
    return 1;
}

1;
