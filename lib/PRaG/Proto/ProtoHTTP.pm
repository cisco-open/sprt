package PRaG::Proto::ProtoHTTP;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use Carp;
use Data::Dumper;
use Encode         qw(encode_utf8);
use English        qw(-no_match_vars);
use HTML::Entities ();
use HTML::Form;
use HTML::Tree;
use HTTP::Cookies;
use HTTP::Message;
use JSON::MaybeXS   ();
use List::MoreUtils qw/firstidx/;
use LWP::UserAgent;
use Net::DNS;
use Net::SSLeay;
use Readonly;
use Regexp::Common qw/net balanced delimited/;
use Time::HiRes    qw/gettimeofday/;
use URI;

use PRaG::Vars qw/vars_substitute/;

extends 'PRaG::Proto::ProtoRadius';

Readonly my $SELF_REG_FLOW => 'SELFREG';
Readonly my $GUEST_FLOW    => 'GUEST';
Readonly my $HOTSPOT_FLOW  => 'HOTSPOT';
Readonly my $DNS_TIMEOUT   => 5;
Readonly my $MAX_REDIRECTS => 10;

Readonly my $HTTP_REQUEST  => 'HTTP_REQUEST';
Readonly my $HTTP_RESPONSE => 'HTTP_RESPONSE';

enum 'PRaG::GuestFlowType', [ $SELF_REG_FLOW, $GUEST_FLOW, $HOTSPOT_FLOW ];

Readonly my %STATUS_CODES => (
    _S_GUEST_SUCCESS    => 'GUEST_SUCCESS',
    _S_GUEST_FAILURE    => 'GUEST_FAILURE',
    _S_GUEST_REGISTERED => 'GUEST_REGISTERED',
);

Readonly my @SELF_REG_FIELDS => qw/guestUser.fieldValues.ui_user_name
  guestUser.fieldValues.ui_first_name
  guestUser.fieldValues.ui_last_name
  guestUser.fieldValues.ui_email_address
  guestUser.fieldValues.ui_phone_number
  guestUser.fieldValues.ui_company
  guestUser.fieldValues.ui_location
  guestUser.fieldValues.ui_sms_provider
  guestUser.fieldValues.ui_person_visited
  guestUser.fieldValues.ui_reason_visit/;

for my $k ( keys %STATUS_CODES ) {
    has $k => ( is => 'ro', isa => 'Str', default => $STATUS_CODES{$k} );
}

has 'success_code' => (
    is      => 'rw',
    isa     => 'Str',
    default => $STATUS_CODES{_S_GUEST_REGISTERED},
);

has 'success_message' => (
    is      => 'ro',
    isa     => 'Str',
    writer  => '_got_success_message',
    default => q{},
    trigger => \&_log_success,
);

has 'failure_message' => (
    is      => 'ro',
    isa     => 'Str',
    writer  => '_got_failure_message',
    default => q{},
    trigger => \&_log_failure,
);

# User Agent
has '_ua' =>
  ( is => 'ro', isa => 'Maybe[LWP::UserAgent]', writer => '_set_ua', );

# Cookies JAR
has '_jar' =>
  ( is => 'ro', isa => 'Maybe[HTTP::Cookies]', writer => '_set_jar', );

# Preserved host name
has '_preserved_host' =>
  ( is => 'ro', isa => 'Str', writer => '_preserve_host', );
has '_preserved_scheme' =>
  ( is => 'ro', isa => 'Str', writer => '_preserve_scheme', );

# Referer
has '_referer' =>
  ( is => 'ro', isa => 'Str', writer => '_save_referer', default => q{}, );

has '_redirects' => (
    traits  => ['Counter'],
    is      => 'ro',
    isa     => 'Num',
    default => 0,
    handles => {
        redirected      => 'inc',
        less_redirects  => 'dec',
        reset_redirects => 'reset',
    },
);

sub BUILD {
    my $self = shift;
    $self->_set_protocol('HTTP');
    $self->_set_method('HTTP');
    return $self;
}

sub do {
    my $self = shift;

    if ( !ref $self->vars->{GUEST_FLOW} ) {
        $self->logger->fatal('No guest flow parameters');
        return;
    }

    if (   !exists $self->vars->{GUEST_FLOW}->{REDIRECT_URL}
        || !$self->vars->{GUEST_FLOW}->{REDIRECT_URL} )
    {
        $self->logger->fatal('No redirect URL found');
        return;
    }

    $self->_set_redirect_url( $self->vars->{GUEST_FLOW}->{REDIRECT_URL} );
    $self->_create_ua;
    $self->_set_jar( HTTP::Cookies->new );

    $self->_start_guest_flow;
    return;
}

sub _create_ua {
    my $self = shift;
    my $ua   = LWP::UserAgent->new(
        agent    => $self->vars->{GUEST_FLOW}->{USER_AGENT},
        ssl_opts => {
            verify_hostname => 0,
            SSL_verify_mode => &Net::SSLeay::VERIFY_NONE
        }
    );

    $ua->default_header( 'Accept'          => 'text/html, */*; q=0.01' );
    $ua->default_header( 'Accept-Language' => 'en' );
    $ua->default_header(
        'Accept-Encoding' => scalar HTTP::Message::decodable() );

    $ua->add_handler(
        response_header => sub {
            my $inner_resp = shift;
            my $msg        = $inner_resp->status_line;
            if ( $inner_resp->is_redirect
                && ( my $l = $inner_resp->header('Location') ) )
            {
                $msg .= "\n" . 'Location: ' . $l;
            }
            if ( $inner_resp->header('Content-Length') ) {
                $msg .=
                    "\n"
                  . 'Content-Length: '
                  . $inner_resp->header('Content-Length');
            }
            $self->_store_http_resp($msg);
        }
    );

    $self->_set_ua($ua);
    return;
}

sub _replace_with_ip {
    my ( $self, $url ) = @_;

    my $u = URI->new($url);
    if (   !$u->has_recognized_scheme
        || ( lc $u->scheme ne 'http' && lc $u->scheme ne 'https' )
        || !$u->host )
    {
        croak q{Incorrect URL scheme or URL is not parsable.};
    }

    $self->logger->debug( 'Trying to resolve hostname' . $u->host . ' to IP' );
    if ( $u->host =~ /$RE{net}{IPv4}/sxm || $u->host =~ /$RE{net}{IPv6}/sxm ) {
        $self->logger->debug('Host is IP already, no need to resolve');
        return $u->canonical, $u->host;
    }

    my $resolver;
    if ( $self->server->dns ) {
        $resolver =
          Net::DNS::Resolver->new(
            nameservers => [ split /,/sxm, $self->server->dns ] );
    }
    else { $resolver = Net::DNS::Resolver->new(); }
    $resolver->udp_timeout($DNS_TIMEOUT);
    $resolver->tcp_timeout($DNS_TIMEOUT);

    my $handle;
    if ( $self->server->family eq 'v4' ) {
        $self->logger->debug( 'Searching A record for ' . $u->host );
        $handle = $resolver->bgsend( $u->host, 'A' );
    }
    else {
        $self->logger->debug( 'Searching AAAA record for ' . $u->host );
        $handle = $resolver->bgsend( $u->host, 'AAAA' );
    }

    while ( $resolver->bgbusy($handle) ) {

        # just wait
    }

    $self->logger->debug('Got something');
    my $reply = $resolver->bgread($handle);
    if ($reply) {
        my $rr = $reply->pop('pre');
        if ( $rr && $rr->can('address') ) {
            my $tmp = $u->host;
            $u->host( $rr->address );
            return $u, $tmp;
        }
        else {
            $self->_set_error(
                'DNS query failed: no address found for ' . $u->host );
        }
    }
    else {
        $self->_set_error( 'DNS query failed: ' . $resolver->errorstring );
    }
    return;
}

sub _start_guest_flow {
    my $self = shift;

    my $handlers = {
        $SELF_REG_FLOW => \&_self_reg,
        $GUEST_FLOW    => \&_usual_guest,
        $HOTSPOT_FLOW  => \&_hotspot,
    };

    my $cn = $handlers->{ $self->vars->{GUEST_FLOW}->{FLOW_TYPE} } // undef;
    if ($cn) {
        $self->$cn();
    }
    else {
        $self->logger->fatal(
            'Unknown flow type: ' . $self->vars->{GUEST_FLOW}->{FLOW_TYPE} );
    }

    return;
}

sub _self_reg {
    my $self = shift;
    my $url  = $self->redirect_url;

    $self->logger->debug('Doing self-reg');
    $self->logger->debug( 'Got URL: ' . $url );
    my $forms = $self->_first_redirect_grab;

    $self->less_redirects;
    $self->success_code( $self->_S_GUEST_REGISTERED );
    return $self->_register_user( $forms, undef );
}

sub _register_user {
    my ( $self, $forms, $response ) = @_;

    return if ( !$self->_redirection_check );

    my $f;
    my %options = (
        check_success   => 1,
        check_failure   => 1,
        extract_cookies => 0,
        debug_response  => 0,
        debug_forms     => 1,
        callback        => '_register_user'
    );

    if (
        ref $forms eq 'ARRAY'
        && (
            $f = $self->_find_form(
                name  => $self->vars->{GUEST_FLOW}->{SELF_REG_FORM},
                forms => $forms,
            )
        )
      )
    {
        $self->logger->debug('Self-Reg form found, checking');

        if (   $f->find_input( $self->_field('user_name') )
            || $f->find_input( $self->_field('phone_number') ) )
        {
            $self->_fill_selfreg( $f,
                $self->_get_page_js( $response->decoded_content, undef, 1 ),
                \%options );
        }
    }

    return $self->_send_receive( ( form => $f ), %options, );
}

sub _fill_selfreg {
    my ( $self, $f, $init_js, $o ) = @_;
    $self->logger->debug('Filling self-reg form');

    foreach my $inp ( $f->inputs ) {
        my $v = $self->_find_field( $inp->name );
        next if ( !$v );

        if ( $v eq 'accessCode' ) {
            $v = 'registration_code';
        }

        $self->logger->debug( 'Filling '
              . $inp->name
              . ' with '
              . $self->vars->{GUEST_FLOW}->{ uc $v } // q{} );
        $f->value( $inp->name, $self->vars->{GUEST_FLOW}->{ uc $v } // q{} );
    }

    my $selector = {
        location => sub {
            return $self->vars->{GUEST_FLOW}->{LOCATION}
              if ( $self->vars->{GUEST_FLOW}->{LOCATION} );
            return $init_js->{selectedLocation}
              || ( $init_js->{locations}->[0]->{locationName} // q{} );
        },
        sms_provider => sub {
            return $self->vars->{GUEST_FLOW}->{SMS_PROVIDER}
              if ( $self->vars->{GUEST_FLOW}->{SMS_PROVIDER} );
            return $init_js->{selectedSmsProvider}
              || ( $init_js->{smsProviders}->[0] // q{} );
        },
    };

    foreach my $field (qw/location sms_provider/) {
        $f->value( $self->_field($field), $selector->{$field}->() );
    }

    $o->{check_failure} =
      \'<[^>]+class="[^"]*(?<id>cisco-ise-error)[^"]*"[^>]*>(?<message>[^<]+)';

    return;
}

sub _usual_guest {
    my $self = shift;

    $self->logger->debug('Doing guest login');
    $self->success_code( $self->_S_GUEST_SUCCESS );

    my $forms = $self->_first_redirect_grab( check_success => 1 );
    return $forms if ( ref $forms ne 'ARRAY' );

    $self->logger->debug( 'New forms: ' . join qq{\n},
        map { $_->dump } @{$forms} );

    my $f = $self->_find_form(
        name  => $self->vars->{GUEST_FLOW}->{LOGIN_FORM},
        forms => $forms,
    );
    if ( !$f ) {
        $self->_set_error('Login form not found');
        return;
    }

    $f->value( $self->_field('username'),
        $self->vars->{GUEST_FLOW}->{CREDENTIALS}->[0] );
    $f->value( $self->_field('password'),
        $self->vars->{GUEST_FLOW}->{CREDENTIALS}->[1] );
    if ( $f->find_input( $self->_field('accessCode') ) ) {
        $f->value( $self->_field('accessCode'),
            $self->vars->{GUEST_FLOW}->{ACCESS_CODE} );
    }
    if ( $f->find_input('aupAccepted') ) {
        $f->value( 'aupAccepted', 'true' );
    }

    return $self->_send_receive(
        form            => $f,
        check_success   => 1,
        check_failure   => 1,
        extract_cookies => 0,
        debug_response  => 0,
        debug_forms     => 1,
        callback        => '_user_logged_in',
    );
}

sub _user_logged_in {
    my ( $self, $forms, $response ) = @_;
    my $f;

    return if ( !$self->_redirection_check );

    if (
        ref $forms eq 'ARRAY'
        && (
            $f = $self->_find_form(
                name  => $self->vars->{GUEST_FLOW}->{AUP_FORM},
                forms => $forms,
            )
        )
      )
    {
        $self->logger->debug('AUP form, accepting');
        $f->value( 'aupAccepted', 'true' );
    }

    if (
           !$f
        && ref $forms eq 'ARRAY'
        && (
            $f = $self->_find_form(
                has_field => '#ui_post_access_continue_button',
                forms     => $forms,
            )
        )
      )
    {
        $self->logger->debug('Continue Access found');
    }

    if (
           !$f
        && ref $forms eq 'ARRAY'
        && (
            $f = $self->_find_form(
                action => 'Continue[.]action',
                forms  => $forms,
            )
        )
      )
    {
        $self->logger->debug('Continue action found');
    }

    if ($f) {
        return $self->_send_receive(
            form            => $f,
            check_success   => 1,
            check_failure   => 1,
            extract_cookies => 0,
            debug_response  => 0,
            callback        => '_user_logged_in',
        );
    }
    $self->logger->warn(q{Don't know how to proceed});
    $self->logger->debug(
        q{Response: } . HTML::Entities::encode( $response->as_string ) );
    return;
}

sub _hotspot {
    my $self = shift;

    $self->logger->debug('Doing hotspot');
    $self->success_code( $self->_S_GUEST_SUCCESS );

    my $forms = $self->_first_redirect_grab( check_success => 1 );
    return $forms if ( ref $forms ne 'ARRAY' );

    $self->logger->debug( 'New forms: ' . join qq{\n},
        map { $_->dump } @{$forms} );

    my $f = $self->_find_form(
        name  => $self->vars->{GUEST_FLOW}->{FORM_NAME},
        forms => $forms,
    );
    if ( !$f ) {
        $self->_set_error('Hotspot form not found');
        return;
    }

    $f->value( $self->_field('accessCode'),
        $self->vars->{GUEST_FLOW}->{ACCESS_CODE} );
    $f->value( 'aupAccepted', 'true' );

    return $self->_send_receive(
        form            => $f,
        check_success   => 1,
        extract_cookies => 0,
        debug_response  => 1,
    );
}

sub _first_redirect_grab {
    my ( $self, %o ) = @_;

    $o{check_success} //= 0;

    my $url = $self->redirect_url;
    if ( !ref $url ) {
        my $host;

        ( $url, $host ) = $self->_replace_with_ip( $self->redirect_url );
        if ( !$url ) { return; }

        $self->_preserve_host($host);
        $self->_preserve_scheme( $url->scheme );
    }

    return $self->_send_receive(
        ref $url
          && $url->isa('HTML::Form') ? ( form => $url ) : ( url => $url ),
        check_success   => $o{check_success},
        extract_cookies => 1,
    );
}

sub _find_form {
    my ( $self, %o ) = @_;

    return if ( !$o{forms} || ref $o{forms} ne 'ARRAY' );

    if ( $o{name} ) {
        my $form_idx = firstidx {
            $_->attr('name') eq $o{name}
              || $_->attr('id') eq $o{name}
        }
        @{ $o{forms} };
        if ( $form_idx >= 0 ) {
            return $o{forms}->[$form_idx];
        }
    }

    if ( $o{has_field} ) {
        foreach my $form ( @{ $o{forms} } ) {
            return $form if ( $form->find_input( $o{has_field} ) );
        }
    }

    if ( $o{action} ) {
        foreach my $form ( @{ $o{forms} } ) {
            return $form if ( $form->action =~ /$o{action}/sxm );
        }
    }

    return;
}

sub _check_success {
    my ( $self, $r ) = @_;

    # TODO: condition is a subject to change
    my $condition = $self->vars->{GUEST_FLOW}->{SUCCESS_CONDITION}
      // '<[^>]+id="(?<id>ui_success_message)"[^>]*>(?<message>[^<]+)';

    if ( $r->decoded_content =~ m/$condition/sxm ) {
        $self->_set_successful(1);

        my $parsed_code =
          $self->_parse_success( $LAST_PAREN_MATCH{id}, $r->decoded_content );

        my $msg = $LAST_PAREN_MATCH{message};
        if ( $LAST_PAREN_MATCH{id} ) {
            $msg =
              $self->_html_get_inner_text( $r->decoded_content,
                $LAST_PAREN_MATCH{id} );
        }
        $msg = HTML::Entities::encode($msg);

        $self->_got_success_message( $msg
              || 'Successfully authenticated on the network.' );

        $self->_check_success_js($r);

        if ( ref $parsed_code eq 'CODE' ) {
            return $self->$parsed_code($r);
        }

        return 1;
    }
    return 0;
}

sub _check_failure {
    my ( $self, $r, $condition ) = @_;

    $condition //=
      '<[^>]+id="(?<id>ui_login_failed_error)"[^>]*>(?<message>[^<]+)';

    if ( $r->decoded_content =~ m/$condition/sxm ) {
        my $msg = $LAST_PAREN_MATCH{message};
        if ( $LAST_PAREN_MATCH{id} ) {
            $msg =
              $self->_html_get_inner_text( $r->decoded_content,
                $LAST_PAREN_MATCH{id} );
        }

        $msg = HTML::Entities::encode($msg);

        $self->_got_failure_message( $msg || 'Authentication failed.' );

        return 1;
    }
    return 0;
}

sub _send_receive {
    my ( $self, %o ) = @_;

    $o{check_success}   //= 0;
    $o{check_failure}   //= 0;
    $o{extract_cookies} //= 1;
    $o{debug_response}  //= 0;
    $o{debug_forms}     //= 0;
    my $response;

    if ( $o{form} ) {
        my $request = $o{form}->make_request;

        $request = $self->_ua->prepare_request($request);

        $self->_jar->add_cookie_header($request);
        $request->{_headers}->remove_header('Cookie2');

        $request->header( 'Referer'          => $self->_referer );
        $request->header( 'X-Requested-With' => 'XMLHttpRequest' );
        $request->header( 'Host'             => $self->_preserved_host );
        $request->header( 'Origin' => $self->_preserved_scheme . '://'
              . $self->_preserved_host );
        $request->header( 'Content-Type' => $request->header('Content-Type')
              . '; charset=UTF-8' );
        $request->content( encode_utf8( $request->content ) );

        $self->logger->debug( 'About to perform: ' . $request->as_string );

        $self->_store_http_req( $request->as_string );

        $response = $self->_ua->request($request);
    }
    elsif ( $o{url} ) {
        $self->logger->debug( 'Grabbing it ' . $o{url}->canonical );

        $self->_ua->add_handler(
            request_send => sub {
                $self->_store_http_req( shift->as_string );
            }
        );

        $response = $self->_ua->get( $o{url}->canonical );

        $self->_ua->remove_handler('request_send');
    }
    else {
        $self->_set_error('Nothing to grab');
        return;
    }

    if ( $o{debug_response} ) {
        $self->logger->debug( HTML::Entities::encode( $response->as_string ) );
    }

    if ( !$response->is_success ) {
        $self->_set_error( q{Couldn't grab: } . $response->status_line );
        return;
    }

    return 1 if ( $o{check_success} && $self->_check_success($response) );
    return 1
      if (
        $o{check_failure}
        && $self->_check_failure(
            $response, ref $o{check_failure} ? ${ $o{check_failure} } : undef
        )
      );

    $self->_save_referer( $response->base->as_string );

    if ( $o{extract_cookies} ) {
        $self->_jar->extract_cookies($response);
        $self->logger->debug( 'Cookies: ' . $self->_jar->as_string );
    }

    my @forms = HTML::Form->parse(
        $response->decoded_content,
        base    => $response->base,
        charset => $response->content_charset,
    );

    if ( $o{debug_forms} ) {
        $self->logger->debug(
            scalar @forms
            ? 'Got forms: ' . join qq{\n},
              map { $_->dump } @forms
            : 'No forms in response'
        );
    }

    if ( $o{callback} && ( my $code = $self->can( $o{callback} ) ) ) {
        $self->logger->debug( 'Callback: ' . $o{callback} );
        return $self->$code( scalar @forms ? \@forms : undef, $response );
    }
    return scalar @forms ? \@forms : $response;
}

sub _log_success {
    my ( $self, $new_msg ) = @_;
    $self->logger->info( 'Successful message received: ' . $new_msg );
    $self->_status( $self->success_code );
    $self->session_attributes->{GuestResult} =
      $self->_guest_result( $self->success_code );

    $self->_new_packet(
        type   => $self->PKT_RCVD,
        packet => [ { 'value' => $new_msg, 'name' => $self->success_code } ],
        code   => $self->success_code,
        time   => scalar gettimeofday()
    );

    return;
}

sub _log_failure {
    my ( $self, $new_msg ) = @_;
    $self->logger->warn( 'Fail message received: ' . $new_msg );
    $self->_status( $self->_S_GUEST_FAILURE );
    $self->session_attributes->{GuestResult} =
      $self->_guest_result( $self->_S_GUEST_FAILURE );

    $self->_new_packet(
        type   => $self->PKT_RCVD,
        packet =>
          [ { 'value' => $new_msg, 'name' => $self->_S_GUEST_FAILURE } ],
        code => $self->_S_GUEST_FAILURE,
        time => scalar gettimeofday()
    );

    return;
}

sub _guest_result {
    my ( $self, $code ) = @_;

    my $c = {
        GUEST_SUCCESS    => 'success',
        GUEST_FAILURE    => 'fail',
        GUEST_REGISTERED => 'registered',
    };

    return $c->{$code} // undef;
}

sub _check_success_js {
    my ( $self, $response ) = @_;

    my $json = JSON::MaybeXS->new(
        allow_barekey     => 1,
        allow_nonref      => 1,
        allow_singlequote => 1,
        relaxed           => 1,
        utf8              => 1,
    );

    my $page_init = $self->_get_page_js( $response->decoded_content );
    if ( !$page_init->{coaType} ) {
        $self->logger->debug('No COA in page.init, hence not requesting');
        return 1;
    }

    my $portal_session = $self->_get_page_js( $response->decoded_content,
        'portalSession.setParams', 1 );

    my $f = $self->_find_form(
        name  => $self->vars->{GUEST_FLOW}->{TOKEN_FORM_NAME},
        forms => [
            HTML::Form->parse(
                $response->decoded_content,
                base    => $response->base,
                charset => $response->content_charset,
            )
        ],
    );

    if ( !$f ) {
        $self->logger->warn('No tokenForm found... Tryin with field name');
        return;
    }

    $self->logger->debug('Requesting CoA');

    $f->action( URI->new_abs( $page_init->{coaUrl}, $response->base ) );
    $f->value( 'delayToCoA',      0 );
    $f->value( 'coaType',         $page_init->{coaType}   // 'Reauth' );
    $f->value( 'coaSource',       $page_init->{coaSource} // 'GUEST' );
    $f->value( 'coaReason',       $page_init->{coaReason} // 'Guest' );
    $f->value( 'waitForCoA',      'true' );
    $f->value( 'portalSessionId', $portal_session->{sessionId} // q{} );

    $self->logger->debug( 'Form: ' . $f->dump );

    $self->_send_receive(
        check_success   => 0,
        extract_cookies => 0,
        debug_response  => 1,
        form            => $f,
    );

    return 1;
}

sub _redirection_check {
    my $self = shift;

    $self->redirected;
    if ( $self->_redirects > $MAX_REDIRECTS ) {
        $self->logger->error('Reached maximum redirects');
        return;
    }
    return 1;
}

sub _get_page_js {
    my ( $self, $c, $what, $clean ) = @_;
    $what //= 'page.init';
    my $what_re = $what =~ s/[.]/\\s*[.]/rgsxm;
    $clean //= 0;

    my $json = JSON::MaybeXS->new(
        allow_barekey     => 1,
        allow_nonref      => 1,
        allow_singlequote => 1,
        relaxed           => 1,
        utf8              => 1,
    );

    $self->logger->debug( 'Searching ' . $what . ' with RE: ' . $what_re );

    my $r = $RE{balanced}{ -parens => '()' }{-keep};
    if ( my @m = $c =~ /${what_re}${r}/sxm ) {
        my $js = $1 =~ s/^[(](.*)[)]$/$1/sxmgr;
        if ($clean) {
            my $str = $js;
            my @clean_jsons;

            # Get strings only
            $str = $self->_clean_strings( $str, \@clean_jsons, $json );

            # Get arrays and objects if there are any
            $str = $self->_clean_objects( $str, \@clean_jsons, $json );
            $js  = '{' . join( q{,}, @clean_jsons ) . '}';
        }
        $self->logger->debug( 'Unparsed: ' . $js );
        return $json->decode( encode_utf8($js) );
    }
    return;
}

sub _clean_strings {
    my ( $self, $str, $clean_jsons, $json ) = @_;

    my $qre = $RE{delimited}{ -delim => q{'"} }{-keep};
    while ( $str =~ /([\w\d_'"-]+)\s*:\s*$qre,?/sxm ) {
        $self->logger->debug( 'Cleaning string ' . $1 );
        substr $str, $LAST_MATCH_START[2],
          $LAST_MATCH_END[2] - $LAST_MATCH_START[2], '*STRING*';

        my ( $name, $quoted, $unquoted ) = ( $1, $2, $4 );
        if ( $unquoted =~ /^[\[{].*[}\]]$/sxm ) {
            push @{$clean_jsons}, $name . q{:} . $unquoted;
        }
        else { push @{$clean_jsons}, $name . q{:} . $quoted; }
    }

    return $str;
}

sub _clean_objects {
    my ( $self, $str, $clean_jsons, $json ) = @_;

    my $qre = $RE{balanced}{ -parens => '[]{}' };
    while ( $str =~ /([\w\d_'"-]+)\s*:\s*$qre,?/sxm ) {
        $self->logger->debug( 'Cleaning object ' . $1 );
        substr $str, $LAST_MATCH_START[2],
          $LAST_MATCH_END[2] - $LAST_MATCH_START[2], '*OBJECT*';

        my ( $name, $object ) = ( $1, $2 );
        push @{$clean_jsons}, $name . q{:} . $object;
    }

    return $str;
}

sub _field {
    my ( $self, $field ) = @_;
    return $self->vars->{GUEST_FLOW}->{FIELDS}->{$field} // undef;
}

sub _find_field {
    my ( $self, $field ) = @_;
    return if ( !$field );

    $self->logger->debug( 'Searching field "' . $field . q{"} );
    foreach my $key ( keys %{ $self->vars->{GUEST_FLOW}->{FIELDS} } ) {
        return $key
          if ( $self->vars->{GUEST_FLOW}->{FIELDS}->{$key} eq $field
            || $key eq $field );
    }

    $self->logger->debug('Not found');
    return;
}

sub _store_http_req {
    my ( $self, $data ) = @_;

    $self->_new_packet(
        type   => $self->PKT_SENT,
        packet => [ { 'value' => $data, 'name' => 'HTTP REQUEST' } ],
        code   => $HTTP_REQUEST,
        time   => scalar gettimeofday()
    );

    return;
}

sub _store_http_resp {
    my ( $self, $data ) = @_;

    $self->_new_packet(
        type   => $self->PKT_RCVD,
        packet => [ { 'value' => $data, 'name' => 'HTTP RESPONSE' } ],
        code   => $HTTP_RESPONSE,
        time   => scalar gettimeofday()
    );

    return;
}

sub _parse_success {
    my ( $self, $id, $content ) = @_;

    return if ( $id ne 'ui_self_reg_results_instruction_message' );
    $self->logger->info(
'Found ui_self_reg_results_instruction_message, would try to parse response for creds'
    );

    my $tree = HTML::Tree->new_from_content($content)->elementify;

    my $creds = {
        username => undef,
        password => undef,
    };

    foreach my $k ( keys %{$creds} ) {
        my $cl = 'ui_self_reg_results_' . $k . '_label';
        $creds->{$k} = $tree->look_down(
            _tag => 'div',
            sub { $_[0]->attr('class') =~ /$cl/sxm }
        );
        if ( !$creds->{$k} ) {
            $self->logger->warn( $cl . ' not found, not parsing further' );
            return;
        }

        $creds->{$k} = $creds->{$k}->look_down(
            _tag => 'div',
            sub { $_[0]->attr('class') =~ /ui-block-b/sxm }
        );
        if ( !$creds->{$k} ) {
            $self->logger->warn(
                'ui-block-b of ' . $cl . ' not found, not parsing further' );
            return;
        }
        $creds->{$k} = $creds->{$k}->as_text;
    }

    $self->logger->info( 'Got new credentials. Username: '
          . $creds->{username}
          . ', password: '
          . $creds->{password} );

    $self->vars->{GUEST_FLOW}->{CREDENTIALS} =
      [ $creds->{username}, $creds->{password} ];

    return \&_prepare_for_login;
}

sub _prepare_for_login {
    my ( $self, $r ) = @_;

    $self->vars->{_updated} = 1;
    $self->vars->{GUEST_FLOW}->{FLOW_TYPE} = $GUEST_FLOW;
    $self->vars->{GUEST_FLOW}->{FIELDS} =
      $self->vars->{GUEST_FLOW}->{LOGIN_FIELDS};
    $self->vars->{GUEST_FLOW}->{SUCCESS_CONDITION} =
      $self->vars->{GUEST_FLOW}->{LOGIN_SUCCESS_CONDITION};

    my @forms = HTML::Form->parse(
        $r->decoded_content,
        base    => $r->base,
        charset => $r->content_charset,
    );

    if (
        my $f = $self->_find_form(
            name  => $self->vars->{GUEST_FLOW}->{SELF_REG_SUCCESS_FORM},
            forms => \@forms,
        )
      )
    {
        $self->logger->debug('Found success form, trying to login.');
        $self->_set_redirect_url($f);
        return $self->_usual_guest;
    }

    return;
}

sub _html_get_inner_text {
    my ( $self, $content, $filter ) = @_;

    my $tree = HTML::Tree->new_from_content($content)->elementify;

    my $msg = $tree->look_down(
        sub {
            $_[0]->attr('class')   =~ /$filter/sxm
              || $_[0]->attr('id') =~ /$filter/sxm;
        }
    );

    return $msg ? $msg->as_trimmed_text : q{};
}

__PACKAGE__->meta->make_immutable( inline_constructor => 0 );

1;
