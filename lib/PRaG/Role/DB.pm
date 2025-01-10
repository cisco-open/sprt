package PRaG::Role::DB;

use strict;
use utf8;

use Moose::Role;
use namespace::autoclean;

use Carp;
use DBI;
use English qw( -no_match_vars );
use Syntax::Keyword::Try;

has '_db' => ( is => 'ro', isa => 'Maybe[DBI::db]', writer => '_set_db' );

# Connect to DB
sub db_connect {
    my $self = shift;
    my $dbh  = DBI->connect(
        'DBI:Pg:dbname='
          . $self->config->{plugins}->{Database}->{database}
          . ';host='
          . $self->config->{plugins}->{Database}->{host}
          . ';port='
          . $self->config->{plugins}->{Database}->{port},
        $self->config->{plugins}->{Database}->{username},
        $self->config->{plugins}->{Database}->{password},
        $self->config->{plugins}->{Database}->{dbi_params}
    );
    $dbh->{AutoInactiveDestroy} = 1;

    if ( !defined $dbh ) {
        $self->logger->error($DBI::errstr);
        croak 'Cannot connect to DB: ' . $DBI::errstr;
    }

    $self->_set_db($dbh);

    return $self;
}

sub check_db {
    my $self = shift;
    if ( $self->_db->pg_ping < 0 ) { $self->db_connect; }
    return 1;
}

sub load_user_dictionaries {
    my ( $self, $id_string ) = @_;
    my @ids = split /,/sxm, $id_string;

    $self->logger->debug( 'Loading dictionaries. IDS: ' . $id_string );

    my $sql = sprintf 'SELECT content FROM %s WHERE id IN (%s)',
      $self->_db->quote_identifier( $self->config->{tables}->{dictionaries} ),
      join q{,}, map { $self->_db->quote($_) } @ids;

    $self->logger->debug( 'Loading dictionaries. SQL: ' . $sql );

    my @r;
    try {
        my $values = $self->_db->selectall_arrayref( $sql, { Slice => {} } );
        if ( !scalar @{$values} ) { return; }

        $values = [ map { $_->{content} } @{$values} ];
        foreach my $d ( @{$values} ) {
            push @r, split( /\R/sxm, $d );
        }
    }
    catch {
        $self->logger->error( 'Error on loading dictionaries: ' . $EVAL_ERROR );
        return;
    };

    return \@r;
}

sub table {
    my ( $self, $wanted ) = @_;

    if ( exists $self->config->{tables}->{$wanted} ) {
        return $self->config->{tables}->{$wanted};
    }

    croak qq/No mapping for '$wanted' exists./;
}

sub sessions_table {
    my ( $self, $proto ) = @_;
    return $self->table('sessions')        if $proto eq 'radius';
    return $self->table('tacacs_sessions') if $proto eq 'tacacs';

    croak qq/Unknown proto '$proto'./;
}

1;
