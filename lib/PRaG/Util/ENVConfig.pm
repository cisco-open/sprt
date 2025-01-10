package PRaG::Util::ENVConfig;

use strict;
use warnings;
use Data::PathSimple qw/set/;
use Ref::Util        qw/is_ref is_arrayref is_hashref/;
use Cpanel::JSON::XS;

require Exporter;

use base qw(Exporter);

our @EXPORT_OK = qw/apply_env_cfg/;

use constant DEFAULT_PREFIX => "SPRTCFG";

sub _is_env_decl {
    return exists $_[0]->{_env};
}

sub _traverse_hashref {
    my $hRef = shift;

    if ( !is_hashref($hRef) ) {
        return;
    }

    while ( my ( $key, $value ) = each %$hRef ) {
        my $ref = is_ref($value) ? $value : \$value;
        if ( is_hashref($ref) ) {
            if ( _is_env_decl($ref) ) {
                $hRef->{$key} = _get_env_var($ref);
                next;
            }

            $hRef->{$key} = _traverse_hashref($ref);
        }
        elsif ( is_arrayref($ref) ) {
            $hRef->{$key} = _traverse_arrayref($ref);
            next;
        }
    }

    return $hRef;
}

sub _traverse_arrayref {
    my $aRef = shift;

    if ( !is_arrayref($aRef) ) {
        return;
    }

    for ( my $i = 0 ; $i <= $#$aRef ; $i++ ) {
        my $value = $aRef->[$i];
        my $ref   = is_ref($value) ? $value : \$value;
        if ( is_hashref($ref) ) {
            if ( _is_env_decl($ref) ) {
                $aRef->[$i] = _get_env_var($ref);
                next;
            }

            $aRef->[$i] = _traverse_hashref($ref);
        }
        elsif ( is_arrayref($ref) ) {
            $aRef->[$i] = _traverse_arrayref($ref);
            next;
        }
    }

    return $aRef;
}

sub _get_env_var {
    my $envDecl = shift;

    my $val = $ENV{ $envDecl->{_env} } // $envDecl->{_default};

    if ( exists $envDecl->{_type} ) {
        $envDecl->{_type} = lc $envDecl->{_type};
        if ( $envDecl->{_type} eq "int" ) {
            $val = int( $val + 0 );
        }
        elsif ( $envDecl->{_type} eq "number" ) {
            $val = $val + 0;
        }
        elsif ( $envDecl->{_type} eq "bool" ) {
            if ( $val =~ /^(?:y|yes|true|1|on)$/i ) {
                $val = Cpanel::JSON::XS::true;
            }
            else {
                $val = Cpanel::JSON::XS::false;
            }
        }
    }

    return $val;
}

sub apply_env_cfg {
    my ( $cfg, $prefix ) = @_;
    $prefix //= DEFAULT_PREFIX;
    $prefix = "${prefix}_";

    while ( my ( $env_name, $env_value ) = each %ENV ) {
        if ( rindex( $env_name, $prefix, 0 ) != 0 ) { next; }
        my @parts = split( /_/, $env_name );
        shift(@parts);
        my $path = "/" . lc join( "/", @parts );
        set( $cfg, $path, $env_value );
    }

    _traverse_hashref($cfg);

    return;
}

1;
