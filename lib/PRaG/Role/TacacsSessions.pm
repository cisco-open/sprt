package PRaG::Role::TacacsSessions;

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

Readonly my $OWNER_POSTFIX           => '__generator';
Readonly my $MAX_PER_SQL_TRANSACTION => 65_535;
Readonly my $RAD_AUTH_PORT           => 1812;
Readonly my $RAD_ACCT_PORT           => 1813;

sub _update_session {

    # FIXME:
    my $self = shift;
    my $h    = {@_};

    $self->logger->debug('Want to update T+ session');

    # if (   $h->{status} eq 'DROPPED'
    #     && !$self->parameters->{'save_sessions'}
    #     && $self->parameters->{accounting_type} eq 'drop' )
    # {
    #     # Remove session
    #     $self->_remove_session( $h->{snapshot} );
    #     return;
    # }
    # my $json_obj = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );
    # my $id = $h->{snapshot}->{ID};

    # if ( exists $h->{session_data}->{attributes}->{StatesHistory}
    #     && is_plain_arrayref(
    #         $h->{session_data}->{attributes}->{StatesHistory} ) )
    # {
    #     $self->logger->debug('Updating StatesHistory');
    #     my $history =
    #       $self->_get_session_attribute( $id, 'StatesHistory' ) || '[]';
    #     $history = $json_obj->decode($history);
    #     if (   scalar @{$history}
    #         && scalar @{ $h->{session_data}->{attributes}->{StatesHistory} }
    #         && $history->[-1]->{code} eq
    #         $h->{session_data}->{attributes}->{StatesHistory}->[0]->{code} )
    #     {
    #         shift @{ $h->{session_data}->{attributes}->{StatesHistory} };
    #     }

    #     push @{$history},
    #       @{ $h->{session_data}->{attributes}->{StatesHistory} };
    #     $h->{session_data}->{attributes}->{StatesHistory} = $history;
    # }
    # else {
    #     delete $h->{session_data}->{attributes}->{StatesHistory};
    # }

    # if ( exists $h->{snapshot}->{_updated} && $h->{snapshot}->{_updated} ) {
    #     foreach my $to_del (
    #         qw/LOADED START_STATE ID CHANGED CLASS STARTED RADIUS USERNAME/)
    #     {
    #         delete $h->{snapshot}->{$to_del};
    #     }
    #     $h->{session_data}->{attributes}->{snapshot} =
    #       $self->_save_snap( $h->{snapshot} );
    # }

    # # Update attributes
    # $self->_set_session_attribute(
    #     $id,
    #     {
    #         %{ $h->{session_data}->{attributes} // {} },
    #         (
    #             State   => $h->{status},
    #             Dropped => $h->{status} eq 'DROPPED' ? 1 : 0,
    #         )
    #     }
    # );

    # if ( $h->{session_data}->{user} ) {
    #     $self->_set_session_column( $id, 'user', $h->{session_data}->{user} );
    # }

    # if ( exists $h->{session_data}->{RADIUS}->{_updated}
    #     && $h->{session_data}->{RADIUS}->{_updated} )
    # {
    #     delete $h->{session_data}->{RADIUS}->{_updated};
    #     $self->_set_session_column( $id, 'RADIUS',
    #         $json_obj->encode( $h->{session_data}->{RADIUS} ) );
    # }

    # # Unblock session
    # if ( !$self->parameters->{'keep_job_chunk'} ) {
    #     $self->logger->debug('Unblocking session');
    #     if ( $self->parameters->{sessions}->{chunk} ) {
    #         $self->_remove_session_attribute( $id, 'job-chunk',
    #             $self->parameters->{sessions}->{chunk} // undef );
    #     }
    # }

    # if ( $h->{should_continue} ) {
    #     $self->start_new_process( $h->{should_continue},
    #         { cmd => 'CONTINUE' } );
    # }

    # return $id;
}

sub _save_session {

    # Save new session in DB
    my $self = shift;
    my $h    = {@_};

    $self->logger->debug( 'Want to save T+ session: ' . Dumper($h) );

    if ( not $self->parameters->{'save_sessions'} or not $self->db ) {
        $self->_add_statistics( id => 0, statistics => $h->{statistics} );
        return;
    }

    delete $h->{session_data}->{proto};
    $h->{session_data}->{bulk} //= $self->parameters->{bulk};
    $h->{session_data}->{owner} = $self->owner;

    $h->{session_data}->{changed} =
      \"to_timestamp($h->{session_data}->{changed})";
    $h->{session_data}->{started} =
      \"to_timestamp($h->{session_data}->{started})";

    my $json_obj = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );

    $h->{session_data}->{attributes}->{proto}    = $self->protocol;
    $h->{session_data}->{attributes}->{snapshot} = $h->{snapshot};
    $h->{session_data}->{attributes}             = {
        %{ $h->{session_data}->{attributes} },
        (
            ports     => $self->server->ports,
            localAddr => $self->server->local_addr,
            localPort => $self->server->local_port,
            dns       => $self->server->dns,
            state     => $h->{status},
            Dropped   => $h->{is_successful} ? undef : 1,
            jid       => lc $self->parameters->{job_id}
        )
    };

    my @bind;
    $self->logger->debug( 'Saving: ' . Dumper( $h->{session_data} ) );
    foreach my $val ( values %{ $h->{session_data} } ) {
        if ( is_plain_hashref($val) || is_plain_arrayref($val) ) {
            push @bind, $json_obj->encode($val);
        }
        else { push @bind, $val; }
    }

    my $query = sprintf 'INSERT INTO "%s" (%s) VALUES (%s)',
      $self->config->{tables}->{tacacs_sessions},
      join( q{,},
        map { $self->db->quote_identifier($_) } keys %{ $h->{session_data} } ),
      join q{,}, map { is_ref($_) ? ${$_} : $self->db->quote($_) } @bind;

    $self->logger->debug("Executing $query");

    if ( !defined $self->db->do($query) ) {
        $self->logger->error( 'SQL exception: ' . $self->db->errstr );
        return;
    }

    my $id = $self->db->last_insert_id( undef, undef, undef, undef,
        { sequence => 'tacacs_sessions_id' } );
    $self->logger->debug(
        "Session saved in DB with ID $id, updating attributes");

    if ( $h->{should_continue} ) {
        $self->start_new_process( $h->{should_continue}, cmd => 'CONTINUE' );
    }

    if ( $h->{statistics} ) {
        $self->_add_statistics( id => $id, statistics => $h->{statistics} );
    }

    return $id;
}

sub _remove_session {
    my ( $self, $snap ) = @_;

    my $where = q/"owner" = $1 AND "id" = $2/;
    my @bind  = ( $snap->{OWNER}, $snap->{ID} );

    my $sql =
        q/SELECT "id" FROM /
      . $self->config->{tables}->{tacacs_sessions}
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
        my @tmp =
          splice @{$found}, 0,
          scalar @{$found} > $MAX_PER_SQL_TRANSACTION
          ? $MAX_PER_SQL_TRANSACTION
          : scalar @{$found};

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
        q/DELETE FROM /
      . $self->config->{tables}->{tacacs_sessions}
      . qq/ WHERE $where/;
    $self->logger->debug( "Executing $sql with parameters " . join q{,},
        @bind );
    $rv = $self->db->do( $sql, undef, @bind );
    $self->logger->debug( 'Removed sessions ' . $rv );

    return;
}

sub _get_session_attribute {
    my ( $self, $id, $attribute ) = @_;
    $self->logger->debug(
        'Reading attribute ' . $attribute . ' of session ' . $id );

    my $query =
      sprintf q/SELECT "attributes"->>%s AS "r" FROM %s WHERE "id" = %s/,
      $self->db->quote($attribute),
      $self->db->quote_identifier( $self->config->{tables}->{tacacs_sessions} ),
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

    my $json_obj =
      JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1, allow_blessed => 1 );
    my $json = $json_obj->encode($data);
    $self->logger->debug("Updating session $id with '$json'");

    my $query =
        sprintf 'UPDATE %s '
      . 'SET attributes = attributes || ?::jsonb, "changed" = ? '
      . 'WHERE "id" = ?',
      $self->db->quote_identifier( $self->config->{tables}->{tacacs_sessions} );

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

    my $query = sprintf 'UPDATE %s SET %s = %s WHERE "id" = %s',
      $self->db->quote_identifier( $self->config->{tables}->{tacacs_sessions} ),
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
      $self->config->{tables}->{tacacs_sessions};

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

# Search for sessions
# return arrayref with sessions found.
# $counter is a reference,
# if defined, will be set ot the count of found elements
sub _find_sessions {
    my ( $self, $id, $counter ) = @_;

    if (    not defined wantarray
        and not is_ref($counter) )
    {
        $self->logger->warn('_find_sessions function called in void context');
        return;
    }

    $self->logger->debug( 'Searching sessions for owner '
          . $self->owner
          . ' parameters: '
          . Dumper($id) );
    my $where    = q/owner IN (?,?)/;
    my @bind     = ( $self->owner, $self->owner . '__api' );
    my $json_obj = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );

    if ( is_plain_hashref($id) ) {
        if ( defined $id->{id} ) {
            $self->logger->debug( 'Trying to find session ' . $id->{id} );
            $where .= q/ AND "id" = ?/;
            push @bind, $id->{id};
        }

        if ( defined $id->{chunk} && $id->{chunk} ) {
            $self->logger->debug(
                q{Getting sessions of chunk '} . $id->{chunk} . q{'} );
            $where .= qq/ AND "attributes" @> ?::jsonb/;
            push @bind, $json_obj->encode( { 'job-chunk' => $id->{chunk} } );
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

        my @clmns = qw/id id_addr user/;
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
          . $self->config->{tables}->{tacacs_sessions}
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
      . $self->config->{tables}->{tacacs_sessions}
      . qq/ WHERE $where/;
    $self->logger->debug( "About to execute $sql with parameters " . join q{,},
        @bind );
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

    # FIXME:
    my $self = shift;

    # $self->logger->debug('Getting snapshot for session');
    # my $sr = $self->_sessions->[ $self->{counter} ];
    # return if ( !$sr );
    # my $json_obj = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );
    # if ( not is_plain_hashref( $sr->{attributes} ) ) {
    #     $sr->{attributes} = $json_obj->decode( $sr->{attributes} );
    # }

    # if ( $sr->{attributes}->{snapshot}
    #     and not is_ref( $sr->{attributes}->{snapshot} ) )
    # {
    #     $sr->{attributes}->{snapshot} =
    #       $json_obj->decode( $sr->{attributes}->{snapshot} );
    # }

    # my $r;
    # if ( $self->parameters->{action} eq 'reauth' ) {
    #     $self->logger->debug('Doing re-auth');
    #     $r = $sr->{attributes}->{snapshot} // undef;
    #     $self->logger->debug( 'Raw snapshot: ' . Dumper($r) );
    #     return if not $r;
    #     $r->{RADIUS} = $json_obj->decode( $sr->{RADIUS} );
    #     if ( $self->radius ) {
    #         $r->{RADIUS}->{request} = [
    #             @{ $r->{RADIUS}->{request} //  [] },
    #             @{ $self->radius->{request} // [] },
    #         ];

    #         my @idxs = indexes {
    #             {
    #                 $_->{name} eq 'Cisco-AVPair'
    #                   && index( $_->{value}, 'audit-session-id=' ) >= 0
    #             }
    #         }
    #         @{ $r->{RADIUS}->{request} };
    #         if ( scalar @idxs > 1 ) {    # Remove oldest audit-session-id
    #             $self->logger->debug(
    #                 'Multiple audit-session-id found in request, removing');
    #             pop @idxs;
    #             for my $idx ( reverse @idxs ) {
    #                 splice @{ $r->{RADIUS}->{request} }, $idx, 1;
    #             }
    #         }

   #         $r->{RADIUS}->{accounting} = [
   #             @{ $r->{RADIUS}->{accounting} //  [] },
   #             @{ $self->radius->{accounting} // [] },
   #         ];
   #         @idxs = indexes {
   #             {
   #                 $_->{name} eq 'Cisco-AVPair'
   #                   && index( $_->{value}, 'audit-session-id=' ) >= 0
   #             }
   #         }
   #         @{ $r->{RADIUS}->{accounting} };
   #         if ( scalar @idxs > 1 ) {    # Remove oldest audit-session-id
   #             $self->logger->debug(
   #                 'Multiple audit-session-id found in accounting, removing');
   #             pop @idxs;
   #             for my $idx ( reverse @idxs ) {
   #                 splice @{ $r->{RADIUS}->{accounting} }, $idx, 1;
   #             }
   #         }

    #         $r->{RADIUS}->{_updated} = 1;
    #     }
    #     $r->{BULK} = $sr->{bulk};
    #     if ( !$self->parameters->{same_session_id} )
    #     {    # new session ID if NOT same_session_id
    #         delete $r->{SESSIONID};
    #         $r->{SESSIONID} = vars_substitute(
    #             $self->config->{generator}->{patterns}->{session_id},
    #             $r, undef, undef, 1 );
    #     }
    #     else {
    #         $r->{ID}     = $sr->{id};
    #         $r->{LOADED} = 1;
    #     }
    #     $self->parameters->{coa} = $sr->{attributes}->{coa};
    #     $self->radius( $r->{RADIUS} );
    # }
    # else {
    #     $r = {
    #         (
    #             MAC       => $sr->{mac},
    #             IP        => $sr->{ipAddr},
    #             SESSIONID => $sr->{sessid},
    #             OWNER     => $sr->{owner},
    #             USERNAME  => $sr->{user},
    #             CLASS     => $sr->{class},
    #             STARTED   => $sr->{started},
    #             CHANGED   => $sr->{changed},
    #             RADIUS    => $sr->{RADIUS}
    #             ? $json_obj->decode( $sr->{RADIUS} )
    #             : undef,
    #             START_STATE => $sr->{attributes}->{State} || 'INIT',
    #             ID          => $sr->{id},
    #             LOADED      => 1,
    #         ),
    #         %{ $sr->{attributes}->{snapshot} // {} }
    #     };
    # }

  # if ( !$self->server->id ) {
  #     $r->{SERVER} = PRaG::RadiusServer->new(
  #         address   => $sr->{server},
  #         acct_port => $sr->{attributes}->{AcctPort} // $RAD_ACCT_PORT,
  #         auth_port => $sr->{attributes}->{AuthPort} // $RAD_AUTH_PORT,
  #         secret    => $sr->{shared},
  #         timeout   => $sr->{attributes}->{timeout} // $self->server->timeout,
  #         retransmits => $sr->{attributes}->{retransmits}
  #           // $self->server->retransmits,
  #         local_addr => $sr->{attributes}->{localAddr}
  #           // $self->server->local_addr,
  #         local_port => $sr->{attributes}->{localPort}
  #           // $self->server->local_port,
  #     );
  # }

    # undef $json_obj;
    # return $r;
}

sub _save_snap {
    my ( $self, $s ) = @_;

    if ( exists $s->{_updated} ) { delete $s->{_updated}; }
    if ( exists $s->{SERVER} )   { delete $s->{SERVER}; }
    $self->logger->debug( 'Saving snapshot ' . Dumper($s) );

    return $s;
}

1;
