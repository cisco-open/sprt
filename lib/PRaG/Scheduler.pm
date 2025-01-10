package PRaG::Scheduler;

use strict;
use warnings;
use utf8;

$PRaG::Scheduler::VERSION = '1.0';

use Moose;
use MooseX::XSAccessor;
use namespace::autoclean;

with 'MooseX::Getopt';
with 'MooseX::Getopt::GLD' => { getopt_conf => ['pass_through'] };

use AnyEvent;
use EV;
use Carp;
use Data::Dumper;
use Data::GUID;
use English qw/ -no_match_vars /;
use Readonly;
use JSON::MaybeXS ();
use Ref::Util     qw/is_ref is_plain_hashref is_plain_arrayref/;
use Syntax::Keyword::Try;

use PRaG::Util::ByPath qw/get_by_path/;

Readonly my $OWNER       => '_scheduler';
Readonly my $SECS_IN_MIN => 60;
Readonly my $SECS_IN_HR  => 60 * $SECS_IN_MIN;
Readonly my $SECS_IN_DAY => 24 * $SECS_IN_HR;

with 'PRaG::Role::Config', 'PRaG::Role::Logger', 'PRaG::Role::DB',
  'PRaG::Role::ProcessWork';

has 'owner' => (
    is            => 'rw',
    isa           => 'Str',
    traits        => ['Getopt'],
    cmd_aliases   => [qw/ o /],
    required      => 1,
    documentation => 'Owner of the cron and job.',
);
has 'jid' => (
    is            => 'rw',
    isa           => 'Str',
    traits        => ['Getopt'],
    cmd_aliases   => [qw/ j /],
    required      => 1,
    documentation => 'Job UUID.',
);
has 'updates' => (
    is            => 'rw',
    isa           => 'Bool',
    traits        => ['Getopt'],
    cmd_aliases   => [qw/ u /],
    documentation => 'Perform updates only flag.',
);
has 'repeat' => (
    is            => 'rw',
    isa           => 'Bool',
    traits        => ['Getopt'],
    cmd_aliases   => [qw/ r /],
    documentation => 'Repeater flag.',
);

has 'json' => (
    is      => 'ro',
    lazy    => 1,
    default => sub {
        return JSON::MaybeXS->new(
            utf8            => 1,
            allow_nonref    => 1,
            allow_blessed   => 1,
            convert_blessed => 1,
        );
    },
    traits => ['NoGetopt'],
);

has '_job_data' => (
    is  => 'rw',
    isa => 'HashRef',
);
has '_cli_data' => (
    is  => 'rw',
    isa => 'HashRef',
);
has '_scheduler_data' => (
    is  => 'rw',
    isa => 'HashRef',
);

sub BUILD {
    my ($self) = @_;

    $self->_init_config;
    $self->_init_logger($OWNER);

    return;
}

sub start {
    my $self = shift;

    $self->db_connect;

    $self->logger->info('Scheduler started');
    $self->logger->debug( 'Owner: '
          . $self->owner
          . ', JID: '
          . $self->jid
          . ', updates: '
          . ( $self->updates ? 'true' : 'false' )
          . ', repeat: '
          . ( $self->repeat ? 'true' : 'false' ) );

    return if not $self->_load_job;
    return if not $self->_load_cli;

    return $self->do_updates if $self->updates;
    return $self->do_repeat  if $self->repeat;
    return $self->do_scheduled;
}

sub _load_job {
    my ($self) = @_;

    $self->logger->debug( 'Loading job ' . $self->jid );

    try {
        my $sql =
            q/SELECT * FROM /
          . $self->_db->quote_identifier( $self->table('jobs') )
          . q/ WHERE /
          . $self->_db->quote_identifier('id') . q/ = /
          . $self->_db->quote( $self->jid )
          . q/ AND /
          . $self->compose_owner_condition( $self->owner );
        my $j = $self->_db->selectall_arrayref( $sql, { Slice => {} } );
        croak 'Job not found' if not scalar @{$j};

        $j = $j->[0];

        if ( not is_plain_hashref( $j->{attributes} ) ) {
            $j->{attributes} = $self->json->decode( $j->{attributes} );
        }

        $j->{attributes}->{protocol} =
          $j->{attributes}->{protocol} eq 'tacacs'
          ? 'tacacs'
          : 'radius';

        $self->_job_data($j);
        $self->logger->debug( 'Got job data: ' . Dumper( $self->_job_data ) );
    }
    catch {
        $self->logger->error( q/Couldn't load the job: / . $EVAL_ERROR );
        return;
    };

    return 1;
}

sub _load_cli {
    my ($self) = @_;

    $self->logger->debug( 'Loading CLI ' . $self->_job_data->{cli} );

    try {
        my $sql =
            q/SELECT "line" FROM /
          . $self->_db->quote_identifier( $self->table('cli') )
          . q/ WHERE /
          . $self->_db->quote_identifier('id') . q/ = /
          . $self->_db->quote( $self->_job_data->{cli} )
          . q/ AND /
          . $self->compose_owner_condition( $self->owner );
        my $j = $self->_db->selectall_arrayref( $sql, { Slice => {} } );
        croak 'Job not found' if not scalar @{$j};

        $j = $j->[0]->{line};
        if ( not is_plain_hashref($j) ) {
            $j = $self->json->decode($j);
        }

        $self->_cli_data($j);
        $self->logger->debug( 'Got CLI data: ' . Dumper( $self->_cli_data ) );
        $self->_scheduler_data( $j->{parameters}->{scheduler} );
    }
    catch {
        $self->logger->error( q/Couldn't load the CLI: / . $EVAL_ERROR );
        return;
    };

    return 1;
}

sub do_updates {
    my ($self) = @_;
    $self->logger->debug('Doing updates for the job');

    # my $attributes =
    #   grep {
    #     $_->{name} ne 'Acct-Session-Id' and $_->{name} ne 'Calling-Station-Id'
    #   } @{ $self->_scheduler_data->{updates}->{attributes} };

    my $attributes = $self->_scheduler_data->{updates}->{attributes};

    my $chunk = $self->block_sessions(
        proto => $self->_job_data->{attributes}->{protocol} eq 'tacacs'
        ? 'tacacs'
        : 'radius',
        jid => $self->jid
    );
    return if not $chunk;

    my $jsondata = {
        owner    => $self->owner,
        protocol => 'accounting',
        count    => 1,
        radius   => {
            request    => undef,
            accounting => $attributes,
        },
        async      => 1,
        parameters => {
            'sessions'        => { chunk => $chunk },
            'action'          => 'update',
            'job_chunk'       => $chunk,
            'accounting_type' => 'update',
            'save_sessions'   => 1,
        }
    };

    $self->start_new_process( $self->json->encode($jsondata),
        cmd => 'CONTINUE' );

    return 1;
}

sub do_repeat {
    my ($self) = @_;
    $self->logger->debug('Repeating the job');

    my $repeat = get_by_path( $self->_job_data, 'attributes.scheduler.repeat' );
    if ( not $repeat ) {
        $self->logger->warn('No repeat options for the job. Quit');
        return;
    }

    $repeat->{times} = int( $repeat->{times} ) // 0;
    $repeat->{wait}  = int( $repeat->{wait} )  // 0;

    if ( $repeat->{times} == 0 ) {
        $self->logger->warn('Zero counter for the job, no more repeats. Quit');
        $self->_remove_job_scheduler;
        return;
    }

    if ( $repeat->{times} > 0 ) { $repeat->{times}--; }

    delete $self->_cli_data->{parameters}->{scheduler};
    delete $self->_cli_data->{parameters}->{saved_cli};

    if ( $repeat->{wait} ) {
        $self->wait_seconds(
            $repeat->{wait} * $self->seconds_in( $repeat->{units} ) );
    }

    $self->_update_job(
        { attributes => { scheduler => { repeat => $repeat } } } );

    $self->_cli_data->{parameters}->{scheduler} = {
        variant => 'job',
        job     => { jid => $self->jid, variant => 'repeat' }
    };

    $self->start_new_process( $self->json->encode( $self->_cli_data ),
        cmd => 'CONTINUE' );

    return 1;
}

sub do_scheduled {
    my ($self) = @_;
    $self->logger->debug('Job was scheduled');

    delete $self->_cli_data->{parameters}->{scheduler};
    delete $self->_cli_data->{parameters}->{saved_cli};

    $self->start_new_process( $self->json->encode( $self->_cli_data ),
        cmd => 'CONTINUE' );

    return 1;
}

sub block_sessions {
    #
    # Block sessions for some job
    #
    my ( $self, %opts ) = @_;
    $opts{proto} //= 'radius';
    my $chunk = Data::GUID->guid_string;

    my @bind;
    push @bind, $self->owner;
    my $where = q/"owner" = $/ . scalar @bind;

    if ( $opts{bulk} ) {
        push @bind, $opts{bulk};
        $where .= q/ AND "bulk" = $/ . scalar @bind;
    }
    elsif ( $opts{array} and is_plain_arrayref( $opts{array} ) ) {
        $where .= q/ AND "id" IN (/ . join( q{,}, @{ $opts{array} } ) . q/)/;
    }
    elsif ( $opts{id} ) {
        push @bind, $opts{id};
        $where .= q/ AND "id" = $/ . scalar @bind;
    }
    elsif ( $opts{jid} ) {
        $where .=
          q/ AND "attributes"->>'jid' = / . $self->_db->quote( lc $self->jid );
    }

    if ( $opts{server} ) {
        push @bind, $opts{server};
        $where .= q/ AND "server" = $/ . scalar @bind;
    }

    $where .= q/ AND NOT "attributes" ? 'job-chunk'/;

    my $query = qq/'{"job-chunk"}','"$chunk"'::jsonb,true/;
    my $sql =
        q/UPDATE /
      . $self->_db->quote_identifier( $self->sessions_table( $opts{proto} ) )
      . qq/ SET attributes = jsonb_set(attributes, $query) WHERE $where/;

    try {
        my $sth =
          $self->_db->prepare( $sql, { pg_placeholder_dollaronly => 1 } );
        $self->logger->debug( "Executing $sql  with params " . join q{,},
            @bind );
        $sth->execute(@bind);
    }
    catch {
        $self->logger->fatal( q/Couldn't block sessions: / . $EVAL_ERROR );
        return;
    };

    return $chunk;
}

sub wait_seconds {
    my ( $self, $seconds ) = @_;

    return if not $seconds;

    $self->logger->debug( 'Waiting ' . $seconds . ' seconds while proceeding' );

    my $cv     = AE::cv;
    my $w_time = AE::timer $seconds, 0, sub { $cv->send(0) };
    my $w_term = AE::signal TERM => sub { $cv->send('Got TERM'); };
    my $w_int  = AE::signal INT  => sub { $cv->send('Got INT'); };

    my $result = $cv->recv;
    undef $cv;

    if ($result) {
        $self->logger->warn( $result . '. Exit' );
        exit 0;
    }

    return;
}

sub seconds_in {
    my ( $self, $units ) = @_;

    Readonly my $UNITS => {
        seconds => 1,
        minutes => $SECS_IN_MIN,
        hours   => $SECS_IN_HR,
        days    => $SECS_IN_DAY,
        default => 0
    };

    return exists $UNITS->{$units} ? $UNITS->{$units} : $UNITS->{default};
}

sub _update_job {
    my ( $self, $attributes ) = @_;

    $self->logger->debug(
        'Updating job ' . $self->jid . ' with ' . Dumper($attributes) );

    my @values;
    while ( my ( $key, $v ) = each %{$attributes} ) {
        if ( $key eq 'attributes' ) {
            push @values,
                'attributes = attributes || '
              . $self->_db->quote( $self->json->encode($v) )
              . '::jsonb';
        }
        else {
            push @values,
              $self->_db->quote_identifier($key) . ' = '
              . $self->_db->quote($v);
        }
    }
    my $update = join q{,}, @values;

    my $sql = sprintf 'UPDATE "%s" SET %s WHERE "id" = ? AND "owner" = ?',
      $self->table('jobs'), $update;
    my @bind = ( $self->jid, $self->owner );

    $self->logger->debug(qq/About to execute query: $sql/);

    if ( !defined $self->_db->do( $sql, undef, @bind ) ) {
        $self->logger->debug( 'Error while execution: ' . $self->_db->errstr );
        return;
    }

    return 1;
}

sub _remove_job_scheduler {
    my ($self) = @_;

    my $sql =
        q/UPDATE /
      . $self->_db->quote_identifier( $self->table('jobs') ) . q/ /
      . q/SET "attributes" = "attributes" #- '{scheduler}' /
      . q/WHERE "owner" = /
      . $self->_db->quote( $self->owner )
      . q/ AND /
      . q/"id" = /
      . $self->_db->quote( $self->jid ) . q/ /
      . q/"attributes"#>'{scheduler}' IS NOT NULL/;

    $self->logger->debug( 'Executing: ' . $sql );

    return $self->_db->do($sql);
}

sub user_pack {
    my $user = shift;

    my $API_POSTFIX = '__api';

    if ( index( $user, $API_POSTFIX ) >= 0 ) {

        # API postfix, return user and user without API_POSTFIX
        return $user, substr( $user, 0, -length($API_POSTFIX) );
    }

    # no API postfix, return user and user + API_POSTFIX
    return $user, $user . $API_POSTFIX;
}

sub compose_owner_condition {
    my ( $self, $owner ) = @_;

    my @owners = user_pack($owner);

    return
        $self->_db->quote_identifier('owner')
      . q/ IN (/
      . join( q{,}, map { $self->_db->quote($_) } @owners ) . q/)/;

}

__PACKAGE__->meta->make_immutable;

1;
