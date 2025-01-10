package PRaG::Cleaner;

use strict;
use warnings;
use utf8;

$PRaG::Cleaner::VERSION = '1.0';

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

with 'MooseX::Getopt';
with 'MooseX::Getopt::GLD' => { getopt_conf => ['pass_through'] };

use Carp;
use English qw/ -no_match_vars /;
use Readonly;
use Syntax::Keyword::Try;

Readonly my $OWNER                 => '_cleaner';
Readonly my $MAX_SESSIONS_ONE_GO   => 65_535;
Readonly my $MAX_SESSIONS_IN_CLEAN => 20_000;
Readonly my $SECS_IN_DAY           => 86_400;
Readonly my $PROTO_RADIUS          => 'radius';
Readonly my $PROTO_TACACS          => 'tacacs';

with 'PRaG::Role::Config', 'PRaG::Role::Logger', 'PRaG::Role::DB';

has 'days' => (
    is            => 'rw',
    isa           => 'Int',
    traits        => ['Getopt'],
    cmd_aliases   => [qw/ d /],
    required      => 1,
    documentation =>
      'Amount of days to keep. Sessions older than that will be removed.',
);

has 'proto' => (
    is            => 'rw',
    isa           => 'ArrayRef',
    required      => 0,
    traits        => ['Getopt'],
    cmd_aliases   => [qw/ p /],
    default       => sub { [qw/radius tacacs/] },
    documentation => 'Protocols to check.',
);

sub BUILD {
    my ($self) = @_;

    $self->_init_config;
    $self->_init_logger($OWNER);

    return;
}

sub start {
    my $self = shift;

    $self->logger->info('Cleaner started');

    $self->db_connect();

    $self->logger->debug(
        'Looking for sessions older than ' . $self->days . ' days' );

    foreach my $proto ( @{ $self->proto } ) {
        my $sessions =
          $self->sessions_older_than( proto => $proto, all_ids => 1 );
        $self->logger->info( 'Found '
              . scalar @{$sessions} . q{ }
              . $proto
              . ' outdated sessions.' );

        @{$sessions} = map { $_->{id} } @{$sessions};

        while ( scalar @{$sessions} > 0 ) {
            my @tmp = splice @{$sessions}, 0, $MAX_SESSIONS_IN_CLEAN;

            $self->logger->info( q/Removing /
                  . scalar @tmp
                  . qq/ sessions of ${proto}. Left: /
                  . scalar @{$sessions} );

            my $sql =
                q/DELETE FROM /
              . $self->_db->quote_identifier( $self->table('flows') )
              . q/ WHERE /
              . $self->_db->quote_identifier('session_id')
              . q/ IN (/
              . join( q{,}, @tmp )
              . q/) AND/
              . $self->_db->quote_identifier('proto') . q/ = /
              . $self->_db->quote($proto);
            $self->logger->debug("Executing $sql");
            my $flows_removed = $self->_db->do($sql);

            $sql =
                q/DELETE FROM /
              . $self->_db->quote_identifier( $self->sessions_table($proto) )
              . q/ WHERE /
              . $self->_db->quote_identifier('id')
              . q/ IN (/
              . join( q{,}, @tmp ) . q/)/;
            $self->logger->debug("Executing $sql");
            my $sessions_removed = $self->_db->do($sql);

            $self->logger->info( qq/Removed $sessions_removed sessions /
                  . qq/and $flows_removed flows records./ );
        }
    }

    return 1;
}

sub sessions_older_than {
    my ( $self, %h ) = @_;
    $h{proto}   //= $PROTO_RADIUS;
    $h{lookup}  //= 0;
    $h{all_ids} //= 0;

    my $secs = time - ( $self->days * $SECS_IN_DAY );
    my ( $sql, $time_compare );
    my $table = $self->sessions_table( $h{proto} );

    $time_compare =
      is_radius( $h{proto} )
      ? qq/"changed" < $secs/
      : qq/EXTRACT(EPOCH FROM "changed") < $secs/;

    if ( $h{lookup} || $h{all_ids} ) {
        $sql =
            q/select "id" from /
          . $self->_db->quote_identifier($table)
          . qq/ where $time_compare/;
        if ( $h{lookup} ) { $sql .= ' limit 1'; }
    }
    else {
        $sql =
            q/select "owner", count(id) as "count" from /
          . $self->_db->quote_identifier($table)
          . qq/ where $time_compare group by "owner" order by "count" desc/;
    }

    $self->logger->debug("Executing $sql");
    my $result;
    try {
        $result = $self->_db->selectall_arrayref( $sql, { Slice => {} } );
    }
    catch {
        $self->logger->fatal( 'SQL exception: ' . $EVAL_ERROR );
        croak $EVAL_ERROR;
    };

    return $h{lookup} ? scalar @{$result} : $result;
}

sub sessions_table {
    my ( $self, $proto ) = @_;
    return $self->table('sessions')        if is_radius($proto);
    return $self->table('tacacs_sessions') if is_tacacs($proto);

    croak qq/Unknown proto '$proto'./;
}

sub is_radius {
    return shift eq $PROTO_RADIUS ? 1 : undef;
}

sub is_tacacs {
    return shift eq $PROTO_TACACS ? 1 : undef;
}

__PACKAGE__->meta->make_immutable;

1;
