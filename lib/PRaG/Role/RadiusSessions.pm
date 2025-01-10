package PRaG::Role::RadiusSessions;

use strict;
use utf8;

use Moose::Role;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Carp;
use Data::Dumper;
use English qw( -no_match_vars );
use Readonly;
use Ref::Util       qw/is_plain_arrayref is_plain_hashref is_ref/;
use List::MoreUtils qw/indexes/;
use Syntax::Keyword::Try;

use PRaG::Vars qw/vars_substitute/;

Readonly my $OWNER_POSTFIX           => '__generator';
Readonly my $MAX_PER_SQL_TRANSACTION => 65_535;
Readonly my $RAD_AUTH_PORT           => 1812;
Readonly my $RAD_ACCT_PORT           => 1813;

sub _update_session {
    my $self = shift;
    my $h    = {@_};

    if (   $h->{status} eq 'DROPPED'
        && !$self->parameters->{'save_sessions'}
        && $self->parameters->{accounting_type} eq 'drop' )
    {
        # Remove session
        $self->_remove_session( $h->{snapshot} );
        return;
    }
    my $id = $h->{snapshot}->{ID};

    if ( exists $h->{session_data}->{attributes}->{StatesHistory}
        && is_plain_arrayref(
            $h->{session_data}->{attributes}->{StatesHistory} ) )
    {
        $self->logger->debug('Updating StatesHistory');
        my $history =
          $self->_get_session_attribute( $id, 'StatesHistory' ) || '[]';
        $history = $self->json->decode($history);
        if (   scalar @{$history}
            && scalar @{ $h->{session_data}->{attributes}->{StatesHistory} }
            && $history->[-1]->{code} eq
            $h->{session_data}->{attributes}->{StatesHistory}->[0]->{code} )
        {
            shift @{ $h->{session_data}->{attributes}->{StatesHistory} };
        }

        push @{$history},
          @{ $h->{session_data}->{attributes}->{StatesHistory} };
        $h->{session_data}->{attributes}->{StatesHistory} = $history;
    }
    else {
        delete $h->{session_data}->{attributes}->{StatesHistory};
    }

    if ( exists $h->{snapshot}->{_updated} && $h->{snapshot}->{_updated} ) {
        foreach my $to_del (
            qw/LOADED START_STATE ID CHANGED CLASS STARTED RADIUS USERNAME/)
        {
            delete $h->{snapshot}->{$to_del};
        }
        $h->{session_data}->{attributes}->{snapshot} =
          $self->_save_snap( $h->{snapshot} );
    }

    # Update attributes
    $self->_set_session_attribute(
        $id,
        {
            %{ $h->{session_data}->{attributes} // {} },
            (
                State   => $h->{status},
                Dropped => $h->{status} eq 'DROPPED' ? 1 : 0,
            )
        }
    );

    if ( $h->{session_data}->{user} ) {
        $self->_set_session_column( $id, 'user', $h->{session_data}->{user} );
    }

    if ( exists $h->{session_data}->{RADIUS}->{_updated}
        && $h->{session_data}->{RADIUS}->{_updated} )
    {
        delete $h->{session_data}->{RADIUS}->{_updated};
        $self->_set_session_column( $id, 'RADIUS',
            $self->json->encode( $h->{session_data}->{RADIUS} ) );
    }

    # Unblock session
    if ( !$self->parameters->{'keep_job_chunk'} ) {
        $self->logger->debug('Unblocking session');
        if ( $self->parameters->{sessions}->{chunk} ) {
            $self->_remove_session_attribute( $id, 'job-chunk',
                $self->parameters->{sessions}->{chunk} // undef );
        }
    }

    if ( $h->{should_continue} ) {
        $self->start_new_process( $h->{should_continue}, cmd => 'CONTINUE' );
    }

    return $id;
}

sub _save_session {

    # Save new session in DB
    my $self = shift;
    my $h    = {@_};
    if ( !$self->parameters->{'save_sessions'} || !$self->db ) {
        $self->_add_statistics( id => 0, statistics => $h->{statistics} );
        return;
    }

    $h->{session_data}->{bulk} //= $self->parameters->{bulk};
    $h->{session_data}->{owner} = $self->owner;

    if ( my $i = $self->_get_id_by_sessid( $h->{session_data}->{sessid} ) ) {
        $self->logger->debug('Sessions exists, hence update.');
        $h->{snapshot}->{ID} = $i;
        return $self->_update_session(
            session_data => $h->{session_data},
            status       => $h->{status},
            snapshot     => $h->{snapshot}
        );
    }

    my $add_attributes;
    if ( $h->{session_data}->{attributes} ) {
        $add_attributes = $h->{session_data}->{attributes};
    }
    if ( exists $h->{session_data}->{attributes} ) {
        delete $h->{session_data}->{attributes};
    }

    # TODO: add different attributes handlers
    if ( $add_attributes->{certificate} ) {
        $add_attributes->{certificate} =
          $self->_save_certificate( $add_attributes->{certificate} );
    }

    if ( $self->parameters->{coa} ) {
        $add_attributes->{snapshot} = $self->_save_snap( $h->{snapshot} );
        $add_attributes->{coa}      = $self->parameters->{coa};
    }

    $add_attributes->{proto} = $self->protocol;

    my @bind;
    $self->logger->debug( 'Saving: ' . Dumper( $h->{session_data} ) );
    foreach my $val ( values %{ $h->{session_data} } ) {
        if ( is_plain_hashref($val) || is_plain_arrayref($val) ) {
            push @bind, $self->json->encode($val);
        }
        else { push @bind, $val // q{}; }
    }

    my $query = sprintf 'INSERT INTO "%s" (%s) VALUES (%s)',
      $self->config->{tables}->{sessions},
      join( q{,},
        map { $self->db->quote_identifier($_) } keys %{ $h->{session_data} } ),
      join( q{,}, (q{?}) x scalar @bind );

    $self->logger->debug( "Executing $query with params " . join q{,}, @bind );

    if ( !defined $self->db->do( $query, undef, @bind ) ) {
        $self->logger->error( 'SQL exception: ' . $self->db->errstr );
        return;
    }

    my $id = $self->db->last_insert_id( undef, undef, undef, undef,
        { sequence => 'sessions_id_seq' } );
    $self->logger->debug(
        "Session saved in DB with ID $id, updating attributes");

    $self->_set_session_attribute(
        $id,
        {
            (
                Rfc3579MessageAuth => $h->{is_message_auth} ? 1 : 0,
                AuthPort           => $self->server->auth_port,
                AcctPort           => $self->server->acct_port,
                localAddr          => $self->server->local_addr,
                localPort          => $self->server->local_port,
                dns                => $self->server->dns,
                State              => $h->{status},
                DACL               => $h->{dacl} || undef,
                Dropped            => $h->{is_successful} ? undef : 1,
                proto              => $self->protocol,
                jid                => lc $self->parameters->{job_id}
            ),
            %{$add_attributes}
        }
    );

    if ( $h->{should_continue} ) {
        $self->start_new_process( $h->{should_continue}, cmd => 'CONTINUE' );
    }

    if ( $h->{statistics} ) {
        $self->_add_statistics( id => $id, statistics => $h->{statistics} );
    }

    return $id;
}

sub _remove_session {
    my $self = shift;
    my $snap = shift;

    # $snap = {
    # 	MAC
    # 	IP
    # 	SESSIONID
    # 	OWNER
    # 	USERNAME
    # 	CLASS
    # 	STARTED
    # 	CHANGED
    # 	SERVER
    # 		address
    # 		acct_port
    # 		auth_port
    # 		secret
    # 		timeout
    # 		local_addr
    # 	),
    # 	START_STATE
    # 	ID
    # 	LOADED
    # }

    my $where = q/"owner" = $1 AND "id" = $2/;
    my @bind  = ( $snap->{OWNER}, $snap->{ID} );

    my $sql =
        q/SELECT "id" FROM /
      . $self->config->{tables}->{sessions}
      . qq/ WHERE $where/;
    $self->logger->debug( "Executing $sql with parameters " . join q{,},
        @bind );
    my $found;
    my $rv = $self->db->selectall_arrayref( $sql, { Slice => [0] }, @bind );
    if ( defined $rv && is_plain_arrayref($rv) && scalar @{$rv} ) {
        $found = [ map { $_->[0]; } @{$rv} ];
        $self->logger->debug( 'Found sessions: ' . join q{,}, @{$found} );
    }
    elsif ( !defined $rv ) {
        $self->logger->error( 'SQL exception: ' . $self->db->errstr );
        return;
    }
    else {
        # Nothing found
        $self->logger->debug('No sessions found');
        return;
    }

    while ( scalar @{$found} ) {
        my @tmp;
        if ( scalar @{$found} > $MAX_PER_SQL_TRANSACTION ) {
            @tmp = splice @{$found}, 0, $MAX_PER_SQL_TRANSACTION;
        }
        else {
            @tmp = splice @{$found}, 0, scalar @{$found};
        }

        $sql =
            q/DELETE FROM /
          . $self->config->{tables}->{flows}
          . q/ WHERE "session_id" IN (/
          . join( q{,}, (q{?}) x scalar @tmp ) . q{)};
        $self->logger->debug( "Executing $sql with parameters " . join q{,},
            @tmp );
        $rv = $self->db->do( $sql, undef, @tmp );

        $self->logger->debug( 'Removed flows ' . $rv );
    }

    $sql =
      q/DELETE FROM / . $self->config->{tables}->{sessions} . qq/ WHERE $where/;
    $self->logger->debug( "Executing $sql with parameters " . join q{,},
        @bind );
    $rv = $self->db->do( $sql, undef, @bind );
    $self->logger->debug( 'Removed sessions ' . $rv );

    return;
}

# Find DB ID by Session ID
sub _get_id_by_sessid {
    my ( $self, $sessid ) = @_;

    my $query =
      sprintf 'SELECT "id" FROM "%s" WHERE "server" = ? AND "sessid" = ?',
      $self->config->{tables}->{sessions};

    $self->logger->debug( "About to execute SQL: $query with parameters "
          . $self->server->address . q{, }
          . $sessid );
    my $sth = $self->db->prepare($query);
    if ( !defined $sth->execute( $self->server->address, $sessid ) ) {
        $self->logger->error( 'Error while execution: ' . $sth->errstr );
        return;
    }

    my $rv = $sth->fetchrow_hashref;
    $self->logger->debug( 'Session ID: ' . ( $rv->{'id'} // 'undef' ) );
    return ( $rv && exists $rv->{id} ? $rv->{'id'} : undef );
}

sub _get_session_attribute {
    my ( $self, $id, $attribute ) = @_;
    $self->logger->debug(
        'Reading attribute ' . $attribute . ' of session ' . $id );

    my $query =
      sprintf q/SELECT "attributes"->>%s AS "r" FROM %s WHERE "id" = %s/,
      $self->db->quote($attribute),
      $self->db->quote_identifier( $self->config->{tables}->{sessions} ),
      $self->db->quote($id);
    $self->logger->debug("About to execute SQL: $query");

    my $sth = $self->db->prepare($query);
    if ( !defined $sth->execute() ) {
        $self->logger->error( 'Error while execution: ' . $sth->errstr );
        return;
    }

    my $rv = $sth->fetchrow_hashref;
    $self->logger->debug( 'Result: ' . ( $rv->{'r'} // 'undef' ) );
    return $rv->{r} // undef;
}

sub _set_session_attribute {
    my ( $self, $id, $data ) = @_;

    my $json = $self->json->encode($data);

    # $self->logger->debug("Updating session $id with '$json'");
    $self->logger->debug("Updating session $id");

    my $query =
      sprintf
'UPDATE "%s" SET attributes = attributes || ?::jsonb, "changed" = ? WHERE "id" = ?',
      $self->config->{tables}->{sessions};

    $self->logger->debug("About to execute SQL: $query");
    if ( !defined $self->db->do( $query, undef, ( $json, time, $id ) ) ) {
        $self->logger->error( 'Error while execution: ' . $self->db->errstr );
        return;
    }
    return 1;
}

sub _set_session_column {
    my ( $self, $id, $column, $value ) = @_;
    $self->logger->debug("Updating session $id with $column = $value");

    my $query = sprintf 'UPDATE "%s" SET %s = %s WHERE "id" = %s',
      $self->config->{tables}->{sessions},
      $self->db->quote_identifier($column),
      $self->db->quote($value),
      $self->db->quote($id);

    $self->logger->debug("About to execute SQL: $query");
    if ( !defined $self->db->do($query) ) {
        $self->logger->error( 'Error while execution: ' . $self->db->errstr );
        return;
    }
    return 1;
}

sub _remove_session_attribute {
    my ( $self, $id, $attribute, $compare ) = @_;

    $compare //= undef;

    $self->logger->debug("Removing $attribute from session $id ");

    my $query =
      sprintf 'UPDATE "%s" SET attributes = attributes - ? WHERE "id" = ?',
      $self->config->{tables}->{sessions};

    if ($compare) {
        $query .= sprintf ' AND attributes->>%s = %s',
          $self->db->quote($attribute), $self->db->quote($compare);
    }

    $self->logger->debug("About to execute SQL: $query");

    if ( !defined $self->db->do( $query, undef, ( $attribute, $id ) ) ) {
        $self->logger->debug( 'Error while execution: ' . $self->db->errstr );
        return;
    }
    return 1;
}

# Search for sessions, return arrayref with sessions found.
# $counter is a reference, if defined, will be set ot the count of found elements
sub _find_sessions {
    my ( $self, $id, $counter ) = @_;

    if ( !defined wantarray && !defined $counter && !is_ref($counter) ) {
        $self->logger->warn('_find_sessions function called in void context');
        return;
    }

    $self->logger->debug( 'Searching sessions for owner '
          . $self->owner
          . ' parameters: '
          . Dumper($id) );
    my $where = q/owner IN (?,?)/;
    my @bind  = ( $self->owner, $self->owner . '__api' );

    if ( is_plain_hashref($id) ) {
        if ( defined $id->{id} ) {
            $self->logger->debug( 'Trying to find session ' . $id->{id} );
            $where .= q/ AND "id" = ?/;
            push @bind, $id->{id};
        }

        if ( defined $id->{sessid} && defined $id->{server} ) {
            $self->logger->debug( 'Trying to find session ' . $id->{sessid} );
            $where .= q/ AND "sessid" = ? AND "server" = ?/;
            push @bind, ( $id->{sessid}, $id->{server} );
        }

        if ( defined $id->{chunk} && $id->{chunk} ) {
            $self->logger->debug(
                q{Getting sessions of chunk '} . $id->{chunk} . q{'} );
            $where .= qq/ AND "attributes" @> ?::jsonb/;
            push @bind, $self->json->encode( { 'job-chunk' => $id->{chunk} } );
        }

        if ( defined $id->{bulk} && $id->{bulk} ) {
            $self->logger->debug( 'Getting sessions of bulk ' . $id->{bulk} );
            $where .= q/ AND "bulk" = ? AND "server" = ?/;
            push @bind, ( $id->{bulk}, $self->server->address );
        }

        if ( defined $id->{array} && is_plain_arrayref( $id->{array} ) ) {
            $self->logger->debug( q{Getting sessions in [}
                  . join( q{,}, @{ $id->{array} } )
                  . q{]} );
            $where .= q/ AND "id" IN (/
              . join( q{,}, (q{?}) x scalar @{ $id->{array} } ) . q/)/;
            push @bind, @{ $id->{array} };
        }

        if ( defined $id->{all} ) {
            $self->logger->debug('Getting list of all saved sessions');
            $where .= q/ AND "server" = ?/;
            push @bind, $self->server->address;
        }
    }
    elsif ( is_plain_arrayref($id) ) {
        $self->logger->debug(
            q{Getting sessions in [} . join( q{,}, @{$id} ) . q{]} );
        $where .=
          q/ AND "id" IN (/ . join( q{,}, (q{?}) x scalar @{$id} ) . q/)/;
        push @bind, @{$id};
    }
    elsif ( !is_ref($id) ) {
        $self->logger->debug("Trying to find session '$id'");

        my @clmns = qw/id mac user sessid class/;
        $where .= q/ AND (/
          . join( ' OR ',
            map { $self->db->quote_identifier($_) . ' = ?' } @clmns ) . q/)/;
        push @bind, ($1) x scalar @clmns;
    }

    my $sth;
    my $sql;
    if ( defined $counter && is_ref($counter) && ${$counter} ) {
        $sql =
            q/SELECT COUNT(id) as counter FROM /
          . $self->config->{tables}->{sessions}
          . qq/ WHERE $where/;
        $self->logger->debug(
            "About to execute $sql with parameters " . join q{,}, @bind );
        $sth = $self->db->prepare($sql);
        if ( !defined $sth->execute(@bind) ) {
            $self->logger->error(
                "Error while '${sql}' execution: " . $sth->errstr );
            return;
        }
        ${$counter} = $sth->fetchrow_hashref()->{'counter'};
        $self->logger->debug("Sessions found: ${$counter}");
    }

    return if ( !defined wantarray );    # void context, result not expected

    $sql =
        q/SELECT * FROM /
      . $self->config->{tables}->{sessions}
      . qq/ WHERE $where/;
    $self->logger->debug("About to execute: $sql");
    $sth = $self->db->prepare($sql);
    if ( !defined $sth->execute(@bind) ) {
        $self->logger->error(
            "Error while '${sql}' execution: " . $sth->errstr );
        return;
    }

    return $sth->fetchall_arrayref( {} );
}

sub _session_server {
    my ( $self, $snap ) = @_;

    return $snap->{SERVER} if ( $snap->{SERVER} );
    return $self->server;
}

sub _snapshot_from_data {
    my $self = shift;

    $self->logger->debug('Getting snapshot for session');
    my $sr = $self->_sessions->[ $self->{counter} ];
    return if ( !$sr );
    if ( !is_plain_hashref( $sr->{attributes} ) ) {
        $sr->{attributes} = $self->json->decode( $sr->{attributes} );
    }

    if ( $sr->{attributes}->{snapshot}
        && !is_ref( $sr->{attributes}->{snapshot} ) )
    {
        $sr->{attributes}->{snapshot} =
          $self->json->decode( $sr->{attributes}->{snapshot} );
    }

    my $r;
    if ( $self->parameters->{action} eq 'reauth' ) {
        $self->logger->debug('Doing re-auth');
        $r = $sr->{attributes}->{snapshot} // undef;
        $self->logger->debug( 'Raw snapshot: ' . Dumper($r) );
        return if ( !$r );
        $r->{RADIUS} = $self->json->decode( $sr->{RADIUS} );
        if ( $self->radius ) {
            $r->{RADIUS}->{request} = [
                @{ $r->{RADIUS}->{request}  // [] },
                @{ $self->radius->{request} // [] },
            ];

            my @idxs = indexes {
                ( $_->{name} eq 'Cisco-AVPair'
                      and index( $_->{value}, 'audit-session-id=' ) >= 0 )
                  ? 1
                  : undef
            }
            @{ $r->{RADIUS}->{request} };
            if ( scalar @idxs > 1 ) {    # Remove oldest audit-session-id
                $self->logger->debug(
                    'Multiple audit-session-id found in request, removing');
                pop @idxs;
                for my $idx ( reverse @idxs ) {
                    splice @{ $r->{RADIUS}->{request} }, $idx, 1;
                }
            }

            $r->{RADIUS}->{accounting} = [
                @{ $r->{RADIUS}->{accounting}  // [] },
                @{ $self->radius->{accounting} // [] },
            ];
            @idxs = indexes {
                {
                    $_->{name} eq 'Cisco-AVPair'
                      && index( $_->{value}, 'audit-session-id=' ) >= 0
                }
            }
            @{ $r->{RADIUS}->{accounting} };
            if ( scalar @idxs > 1 ) {    # Remove oldest audit-session-id
                $self->logger->debug(
                    'Multiple audit-session-id found in accounting, removing');
                pop @idxs;
                for my $idx ( reverse @idxs ) {
                    splice @{ $r->{RADIUS}->{accounting} }, $idx, 1;
                }
            }

            $r->{RADIUS}->{_updated} = 1;
        }
        $r->{BULK} = $sr->{bulk};
        if ( !$self->parameters->{same_session_id} )
        {    # new session ID if NOT same_session_id
            delete $r->{SESSIONID};
            $r->{SESSIONID} = vars_substitute(
                $self->config->{generator}->{patterns}->{session_id},
                $r, undef, undef, 1 );
        }
        else {
            $r->{ID}     = $sr->{id};
            $r->{LOADED} = 1;
        }
        $self->parameters->{coa} = $sr->{attributes}->{coa};
        $self->radius( $r->{RADIUS} );
    }
    else {
        $r = {
            (
                MAC       => $sr->{mac},
                IP        => $sr->{ipAddr},
                SESSIONID => $sr->{sessid},
                OWNER     => $sr->{owner},
                USERNAME  => $sr->{user},
                CLASS     => $sr->{class},
                STARTED   => $sr->{started},
                CHANGED   => $sr->{changed},
                RADIUS    => $sr->{RADIUS}
                ? $self->json->decode( $sr->{RADIUS} )
                : undef,
                START_STATE => $sr->{attributes}->{State} || 'INIT',
                ID          => $sr->{id},
                LOADED      => 1,
            ),
            %{ $sr->{attributes}->{snapshot} // {} }
        };
    }

    if ( !$self->server->address ) {
        $r->{SERVER} = PRaG::RadiusServer->new(
            address   => $sr->{server},
            acct_port => $sr->{attributes}->{AcctPort} // $RAD_ACCT_PORT,
            auth_port => $sr->{attributes}->{AuthPort} // $RAD_AUTH_PORT,
            secret    => $sr->{shared},
            timeout   => $sr->{attributes}->{timeout} // $self->server->timeout,
            retransmits => $sr->{attributes}->{retransmits}
              // $self->server->retransmits,
            local_addr => $sr->{attributes}->{localAddr}
              // $self->server->local_addr,
            local_port => $sr->{attributes}->{localPort}
              // $self->server->local_port,
            dns => $sr->{attributes}->{dns} // $self->server->dns,
        );
    }

    return $r;
}

sub _save_snap {
    my ( $self, $s ) = @_;

    if ( exists $s->{_updated} ) { delete $s->{_updated}; }
    if ( exists $s->{SERVER} )   { delete $s->{SERVER}; }
    $self->logger->debug( 'Saving snapshot ' . Dumper($s) );

    return $s;
}

1;
