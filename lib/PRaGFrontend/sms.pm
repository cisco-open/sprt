package PRaGFrontend::sms;

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::User;
use plackGen qw(load_user_attributes find_server_of_user start_process);

use Encode  qw(encode_utf8);
use English qw(-no_match_vars);
use HTML::Form;
use HTTP::Cookies;
use HTTP::Message;
use HTTP::Status   qw(:constants);
use HTML::Entities ();
use HTML::Strip;
use JSON::MaybeXS   ();
use List::MoreUtils qw(firstidx);
use LWP::UserAgent;
use MIME::Base64 qw(decode_base64 encode_base64);
use Readonly;
use URI;
use URI::QueryParam;

prefix '/sms';

any [ 'get', 'post' ] => '/:user/**?' => sub {
    var user        => undef;
    var sms_conf    => undef;
    var sms_uri     => undef;
    var phone       => undef;
    var message     => undef;
    var username    => undef;
    var password    => undef;
    var session     => undef;
    var need_reauth => undef;

    var user => route_parameters->get('user');
    my $sms = load_user_attributes( 'sms', user => var 'user' );

    if ( !$sms ) {
        send_error( 'No SMS server configuration', HTTP_PRECONDITION_FAILED );
        return;
    }

    set_log_owner var('user'), 1;

    if (   ( $sms->{method} eq 'get' && !request->is_get )
        || ( $sms->{method} eq 'post' && !request->is_post ) )
    {
        logging->error( 'Incorrect method, wanted ' . $sms->{method} );
        send_error( 'Incorrect method, wanted ' . $sms->{method},
            HTTP_METHOD_NOT_ALLOWED );
        return;
    }

    if ( $sms->{basic_auth} ) {
        my $authz = request->header('Authorization');
        if ( !$authz ) {
            logging->error('Authentication required to send SMS');
            response_header 'WWW-Authenticate' =>
              'Basic realm="Authentication required to send SMS"';
            send_error( 'Authentication required to send SMS',
                HTTP_UNAUTHORIZED );
            return;
        }

        my ( undef, $userpass ) = split /\s+/sxm, $authz, 2;
        my ( $user, $pass ) = split /:/sxm, decode_base64($userpass), 2;
        if ( lc $sms->{username} ne lc $user || $sms->{password} ne $pass ) {
            logging->error( 'Incorrect credentials. Wanted: '
                  . $sms->{username} . q{:}
                  . $sms->{password}
                  . " Got: ${user}:${pass}" );
            send_error( 'Incorrect credentials', HTTP_UNAUTHORIZED );
            return;
        }
    }

    if (   request->is_post
        && request->header('Content-Type') !~ /$sms->{content_type}/sxmi )
    {
        logging->error( 'Content-Type unsupported. Got: '
              . request->header('Content-Type')
              . '. Wanted: '
              . $sms->{content_type} );
        send_error(
            'Content-Type unsupported. Got: '
              . request->header('Content-Type')
              . '. Wanted: '
              . $sms->{content_type},
            HTTP_UNSUPPORTED_MEDIA_TYPE
        );
        return;
    }

    my $u    = URI->new( $sms->{url_postfix}, 'http' );
    my $path = $u->path;
    if ( request->path !~ /$path$/sxm ) {
        logging->error( 'Path not found. Got: '
              . request->path
              . '. Wanted: /sms/'
              . var('user') . q{/}
              . $path );
        send_error(
            'Path not found. Got: '
              . request->path
              . '. Wanted: /sms/'
              . var('user') . q{/}
              . $path,
            HTTP_NOT_FOUND
        );
        return;
    }

    var sms_conf => $sms;
    var sms_uri  => $u;

    parse_query_params();

    pass;
};

get '/:user/**?' => sub {
    parse_message_var();

    update_session();

    if (serve_json) {
        send_as JSON => { status => 'ok' };
    }

    send_as html => 'ok';
};

post '/:user/**?' => sub {
    parse_body();

    parse_message_var();

    update_session();

    if (serve_json) {
        send_as JSON => { status => 'ok' };
    }

    send_as html => 'ok';
};

Readonly my %PARSERS => (
    phone    => sub { return shift =~ s/\$phone\$/(?<phone>[^\\s]+)/rsxmg; },
    message  => sub { return shift =~ s/\$message\$/(?<message>.+)/rsxmg; },
    username =>
      sub { return shift =~ s/\$username\$/(?<username>[^\\s]+)/rsxmg; },
    password =>
      sub { return shift =~ s/\$password\$/(?<password>[^\\s]+)/rsxmg; },
    spaces => sub { return shift =~ s/\s+/\\s+/gsxmr; },
);

Readonly my $VARS_REGEX => '[\$<](' . join( q{|}, keys %PARSERS ) . ')[\$>]';

sub make_pattern {
    my %o = @_;

    my @m = ( $o{pattern} =~ /$VARS_REGEX/sxmg );
    return if ( !scalar @m );

    foreach my $vname ( ( @m, 'spaces' ) ) {
        $o{pattern} = $PARSERS{$vname}->( $o{pattern} );
    }
    return ( $o{pattern}, \@m );
}

sub parse_query_params {
    my @configed_params = var('sms_uri')->query_param;
    logging->debug('Parsing query params');

    foreach my $param (@configed_params) {
        my ( $pattern, $m ) =
          make_pattern( pattern => var('sms_uri')->query_param($param) );
        next if ( !$pattern );

        logging->debug(qq{Got sms_uri pattern: "$pattern"});
        find_vals_make_vars(
            what    => query_parameters->get($param),
            pattern => $pattern,
            matches => $m,
        );
    }

    return;
}

sub parse_message_var {
    logging->debug('Parsing SMS message vars');
    if ( var('message') && ( !var('password') || !var('username') ) ) {
        my ( $pattern, $m ) =
          make_pattern( pattern => var('sms_conf')->{message_template} );

        logging->debug(qq{Got message pattern: "$pattern"});

        if ($pattern) {
            find_vals_make_vars(
                what    => var('message'),
                pattern => $pattern,
                matches => $m,
            );
        }
    }

    return;
}

sub parse_body {
    logging->debug('Parsing SMS body');
    my ( $pattern, $m ) =
      make_pattern( pattern => var('sms_conf')->{body_template} );

    logging->debug(qq{Got body pattern: "$pattern"});

    if ($pattern) {
        find_vals_make_vars(
            what    => request->body,
            pattern => $pattern,
            matches => $m,
        );
    }

    return;
}

sub find_vals_make_vars {
    my %o = @_;

    my $hs = HTML::Strip->new();
    $o{what} = $hs->parse( $o{what} );    # no tags

    logging->debug( q(Looking for ")
          . HTML::Entities::encode( $o{pattern} ) . ' in '
          . HTML::Entities::encode( $o{what} ) );
    if ( $o{what} =~ /$o{pattern}/sxmg ) {
        foreach my $vname ( @{ $o{matches} } ) {
            if ( $LAST_PAREN_MATCH{$vname} ) {
                var $vname => $LAST_PAREN_MATCH{$vname};
            }
        }
    }
    return;
}

sub check_vars {
    foreach my $k (qw/phone username password/) {
        if ( !var($k) ) {
            logging->error( $k . ' not found' );
            send_error( $k . ' not found', HTTP_BAD_REQUEST );
            return;
        }
    }
    return 1;
}

sub update_session {
    return if ( !check_vars() );

    logging->debug(
        'Want to update session from SMS, number: ' . var('phone') );

    my $wh =
      sprintf
q{"attributes"->'snapshot'->'GUEST_FLOW'->>'PHONE_NUMBER_NUMBERS' = %s AND "owner" = %s},
      database->quote( var('phone') ), database->quote( var('user') );
    my $row = database->quick_select( config->{tables}->{sessions},
        $wh, { limit => 1 } );

    if ( !$row ) {
        send_error( 'Session not found', HTTP_NOT_FOUND );
        return;
    }

    logging->debug(
        'Session found: ' . $row->{sessid} . ' and ID: ' . $row->{id} );

    my $jo = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );
    $row->{attributes} //= undef;
    $row->{attributes} =
      !ref $row->{attributes}
      ? $jo->decode( encode_utf8( $row->{attributes} ) )
      : $row->{attributes};

    if (   !$row->{attributes}
        || !$row->{attributes}->{snapshot}
        || !$row->{attributes}->{snapshot}->{GUEST_FLOW} )
    {
        send_error( 'Session has no attributes', HTTP_PRECONDITION_FAILED );
        return;
    }

    var session => $row;
    my $snapshot = $row->{attributes}->{snapshot}->{GUEST_FLOW};

    my $started = $snapshot->{STARTED_TIMESTAMP} // time;
    $snapshot->{REAUTH_AFTER} //= 0;
    var need_reauth => defined $snapshot->{REAUTH_AFTER}
      && ( time - $started ) >= $snapshot->{REAUTH_AFTER} * 60 ? 1 : 0;

    my $query =
      sprintf q{jsonb_set("attributes", '{snapshot,GUEST_FLOW}',}
      . q{"attributes"->'snapshot'->'GUEST_FLOW' || %s)},
      database->quote(
        $jo->encode(
            {
                CREDENTIALS       => [ var('username'), var('password') ],
                FLOW_TYPE         => 'GUEST',
                SUCCESS_CONDITION => $snapshot->{LOGIN_SUCCESS_CONDITION}
                  // $snapshot->{SUCCESS_CONDITION},
                FIELDS => $snapshot->{LOGIN_FIELDS} // $snapshot->{FIELDS},
                var('need_reauth') ? ( REDIRECT_URL => q{} ) : (),
            }
        )
      );

    logging->debug( 'Got SET: ' . $query );

    database->quick_update(
        config->{tables}->{sessions},
        { id         => $row->{id} },
        { attributes => \$query }
    );

    authenticate_session();

    return 1;
}

sub authenticate_session {
    my @seq    = ();
    my $server = find_server_of_user(
        user    => var('user'),
        address => var('session')->{server},
        columns => ['id']
    );

    my $session_data = {
        sessid => var('session')->{sessid},
        server => var('session')->{server}
    };

    logging->debug( 'Would authenticate ' . to_dumper($session_data) );

    if ( var('need_reauth') ) {
        logging->debug('Would do full re-authentication');
        push @seq,
          json_drop(
            session_data => $session_data,
            more         => 1,
            server       => $server,
          );
        push @seq,
          json_reauth(
            session_data => $session_data,
            more         => 0,
            server       => $server,
          );
    }
    else {
        logging->debug('Would do HTTP auth only');
        push @seq,
          json_http_continue(
            server       => $server,
            session_data => $session_data
          );
    }

    my $jsondata = {
        owner    => var('user'),
        sequence => \@seq,
    };

    start_process(
        JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 )->encode($jsondata),
        {
            as_continue     => 1,
            count_processes => 0,
            user            => var('user'),
        }
    );

    return;
}

sub json_drop {
    my %o = @_;
    return {
        $o{server} ? ( server => $o{server} ) : (),
        protocol => 'accounting',
        count    => 1,
        radius   => {
            accounting => [
                {
                    name  => 'Acct-Terminate-Cause',
                    value => 'NAS-Request',
                },
                {
                    name  => 'Acct-Session-Time',
                    value => 'timeFromCreate',
                },
                { name => 'Acct-Delay-Time', value => 0 },
            ],
        },
        parameters => {
            'sessions'        => $o{session_data},
            'action'          => 'drop',
            'accounting_type' => 'drop',
            'save_sessions'   => 1,
            'keep_job_chunk'  => $o{more} // 0,
        },
    };
}

sub json_http_continue {
    my %o = @_;
    return {
        $o{server} ? ( server => $o{server} ) : (),
        protocol => 'http',
        count    => 1,
        radius   => {
            request    => undef,
            accounting => undef,
        },
        parameters => {
            'sessions' => $o{session_data},
            'action'   => 'continue',
        },
    };
}

sub json_reauth {
    my %o = @_;
    return {
        $o{server} ? ( server => $o{server} ) : (),
        protocol   => var('session')->{attributes}->{proto} || 'mab',
        count      => 1,
        radius     => {},
        parameters => {
            'sessions'        => $o{session_data},
            'reauth'          => var('session')->{attributes}->{proto} || 'mab',
            'same_session_id' => 1,
            'action'          => 'reauth',
            'download_dacl'   => 1,
            'save_sessions'   => 1,
            'keep_job_chunk'  => $o{more} // 0,
        }
    };
}

prefix q{/};

1;
