package PRaG::Vars;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Carp;
use Data::Dumper;
use File::Basename;
use Storable qw/dclone/;
use logger;
use Ref::Util qw/is_plain_arrayref is_plain_hashref/;
use PRaG::Vars::VarGenerator;

use Class::Load ':all';
use base qw/Exporter/;

use PRaG::Vars::GeneratorConst;
use PRaG::Vars::GeneratorCredentials;
use PRaG::Vars::GeneratorString;
use PRaG::Vars::GeneratorIP;
use PRaG::Vars::GeneratorVariableString;
use PRaG::Vars::GeneratorMAC;
use PRaG::Vars::GeneratorGuest;

use PRaG::Util::ByPath qw/get_by_path/;

our @EXPORT_OK = qw(vars_substitute);

has 'logger'          => ( is => 'ro', isa => 'logger', required => 1 );
has 'max_tries'       => ( is => 'rw', isa => 'Int',    default  => 10_000 );
has 'stop_if_no_more' => ( is => 'rw', isa => 'Bool',   default  => 1 );
has 'error' => (
    is      => 'ro',
    isa     => 'Str',
    writer  => '_set_error',
    clearer => '_no_error'
);
has 'parent' => ( is => 'ro', isa => 'Object', required => 1 );
has '_variables' =>
  ( is => 'ro', isa => 'HashRef', writer => '_set_variables' );
has '_aliases' => ( is => 'ro', isa => 'HashRef', writer => '_set_aliases' );
has '_no_next' => (
    is      => 'ro',
    isa     => 'Bool',
    writer  => '_set_no_next',
    clearer => '_have_next',
);
has '_order' => ( is => 'ro', isa => 'ArrayRef', writer => '_set_order' );

sub BUILD {
    my $self = shift;

    $self->_load_generators;
    $self->_no_error;
    $self->_set_variables( {} );
    $self->_set_aliases( {} );
    $self->_set_order( [] );
    $self->_have_next;
    return;
}

sub _load_generators {
    my $self = shift;

    my $dir = dirname(__FILE__) . '/Vars';
    $self->logger and $self->logger->debug("Modules dir: $dir");
    opendir( my $DH, $dir );
    my @files = grep { /^Generator.*[.]pm$/sxm } readdir($DH);
    closedir($DH);

    foreach my $d (@files) {
        my $m = 'PRaG::Vars::' . basename( $d, '.pm' );
        if ( !is_class_loaded($m) ) {
            $self->logger and $self->logger->debug("Loading generator: $m");
            load_class($m);
        }
        else {
            $self->logger
              and $self->logger->debug("Already loaded generator: $m");
        }
    }
    return;
}

sub add {
    my ( $self, %p ) = @_;

    my $cn = 'PRaG::Vars::Generator' . $p{type};
    if ( is_class_loaded($cn) ) {
        $self->_variables->{ $p{name} } = $cn->new(
            parameters => $p{parameters} || {},
            max_tries  => $p{max_tries}  || $self->max_tries,
            logger     => $self->logger,
            all_vars   => $self,
        );
    }
    else {
        croak "Generator $cn not loaded";
    }

    return $self->add_to_order( $p{name} );
}

sub add_to_order {
    my ( $self, $name ) = @_;
    if ( exists $self->_variables->{$name} ) {
        push @{ $self->_order }, $name;
        return 1;
    }
    return;
}

sub add_alias {
    my ( $self, %p ) = @_;

    $self->_aliases->{ $p{var} } = q{$} . $p{alias} . q{$};
    return;
}

sub is_added {
    my $self    = shift;
    my $varname = shift;
    return exists $self->_variables->{$varname};
}

sub snapshot {
    my $self = shift;
    my %r    = map { $_ => $self->latest_of($_) } keys %{ $self->_variables };

    foreach my $k ( keys %{ $self->_aliases } ) {
        $r{$k} = get_by_path( \%r, $self->_aliases->{$k} =~ s/^\$|\$$//r )
          // q{};
    }

    return dclone( \%r );
}

sub next_all {
    my $self = shift;
    $self->_no_next and $self->stop_if_no_more and return;
    my %r =
      map { $self->logger->debug("Next for $_\n"); $_ => $self->next_of($_) }
      @{ $self->_order };
    defined wantarray ? return \%r : undef %r;
    return;
}

sub substitute {
    my ( $self, $line, %o ) = @_;

    if ( $o{vars} && $self->logger ) {
        $self->logger->debug( 'Alternative snapshot: ' . Dumper( $o{vars} ) );
    }
    $o{next_before} and $self->next_all;
    $line = vars_substitute(
        $line,
        $o{vars}      // $self->snapshot,
        $o{aliases}   // undef,
        $o{d_type}    // undef,
        $o{functions} // undef
    );
    $o{next_after} and $self->next_all;

    return $line;
}

sub next_of {
    my $self    = shift;
    my $varname = shift;
    $self->_no_next and $self->stop_if_no_more and return;
    if ( exists $self->_variables->{$varname}
        && $self->_variables->{$varname}->can('get_next') )
    {
        my $v = $self->_variables->{$varname}->get_next;
        if ( $self->_variables->{$varname}->error ) {
            $self->_set_error( $self->_variables->{$varname}->error );
            $self->_set_no_next(1);
        }
        return $v;
    }
}

sub latest_of {
    my $self    = shift;
    my $varname = shift;
    return $self->_variables->{$varname}->latest
      if ( exists $self->_variables->{$varname} );
    return;
}

sub vars_substitute {
    my ( $line, $vars, $aliases, $d_type, $functions ) = @_;
    $d_type    ||= 'DOLLAR';
    $functions ||= 0;
    $d_type = 'DOLLAR' if ( $d_type ne 'DOLLAR' && $d_type ne 'BRACES' );
    defined $aliases and $line = vars_substitute( $line, $aliases );
    my $re =
        ( $d_type eq 'DOLLAR' ? '\$' : '\{\{' ) . '((?:'
      . join( '|', keys %{$vars} )
      . ')(?:\.[\w-]+)*)'
      . ( $d_type eq 'DOLLAR' ? '\$' : '\}\}' );
    while ( $line =~ /$re/g ) {

        # $1 has the variable name
        my $v = get_by_path( $vars, $1 ) // '';
        my $repl =
            ( $d_type eq 'DOLLAR' ? '\$' : '\{\{' )
          . $1
          . ( $d_type eq 'DOLLAR' ? '\$' : '\}\}' );
        $line =~ s/$repl/$v/g;
    }
    if ($functions) {
        while ( PRaG::Vars::VarGenerator->_find_function( \$line ) ) { }
    }

    return $line;
}

sub clear {
    my $self = shift;
    foreach my $key ( keys %{ $self->_variables } ) {
        delete $self->_variables->{$key};
    }
    return;
}

sub amount_of {
    my ( $self, $varname ) = @_;
    return -1 if !$self->is_added($varname);
    return $self->_variables->{$varname}->amount;
}

__PACKAGE__->meta->make_immutable;

1;
