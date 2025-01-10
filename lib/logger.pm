package logger;

use Log::Log4perl;
use Log::Log4perl::Level;
use Log::Log4perl::Appender;
use Log::Log4perl::Layout::PatternLayout;
use Log::Log4perl::Layout::JSON;

$Log::Log4perl::Config::CONFIG_INTEGRITY_CHECK = 0;

use JSON::MaybeXS;
use Path::Tiny;
use Time::HiRes qw/gettimeofday usleep/;
use POSIX       qw/strftime/;
use File::Basename;
use Sys::Hostname;
use English qw( -no_match_vars );

use Log::Syslog::Constants qw/:functions/;
use Log::Syslog::Fast::PP  qw/:all/;
use Syntax::Keyword::Try;

use strict;

sub new {
    my $class = shift;
    my $h     = {@_};
    my $self  = bless {}, $class;

    if (
        (
               !defined $h->{'log-parameters'}
            || !defined $h->{'owner'}
            || !defined $h->{'chunk'}
        )
        && !Log::Log4perl->initialized()
      )
    {
        return;
    }

    defined $h->{'log-parameters'}
      && Log::Log4perl->init( $h->{'log-parameters'} );

    my $ln = $h->{'logger-name'} // 'main';
    $self->{logger}      = Log::Log4perl->get_logger($ln);
    $self->{inits}       = $h->{'log-parameters'} // q{};
    $self->{chunk}       = $h->{chunk};
    $self->{owner}       = $h->{owner};
    $self->{to_file}     = 0;
    $self->{additionals} = [ $self->{owner}, $self->{chunk} ];

    $self->_with_json_encoder();
    $self->_with_syslog( $h->{syslog} );

    $h->{debug} ? $self->set_level('DEBUG') : $self->set_level('INFO');

    return $self;
}

sub new_file_logger {
    my $class = shift;
    my $h     = {@_};
    my $self  = bless {}, $class;

    $self->{to_file} = 1;
    return
      if ( !defined $h->{'filename'}
        || !defined $h->{'owner'}
        || !defined $h->{'chunk'} );

    $self->{chunk} = $h->{chunk};
    $self->{owner} = $h->{owner};
    $self->{fn}    = $h->{filename};

    $self->{fn} = path( $self->{fn} )->touchpath;

    $self->_with_json_encoder();
    $self->_with_syslog( $h->{syslog} );

    $h->{debug} ? $self->set_level('DEBUG') : $self->set_level('INFO');
    return $self;
}

sub _with_syslog {
    my ( $self, $params ) = @_;
    if ( !$params )             { return; }
    if ( !$params->{hostname} ) { return; }

    $params->{proto} = lc $params->{proto};
    if ( $params->{proto} ne "udp" && $params->{proto} ne "tcp" ) { return; }

    try {
        $self->{syslog} = Log::Syslog::Fast::PP->new(
            $params->{proto} eq "udp" ? LOG_UDP : LOG_TCP,
            $params->{hostname},
            $params->{port},
            get_facility( $params->{facility} ),
            get_severity( $params->{severity} ),
            $params->{sender} || hostname,
            $params->{name}
        );

        $self->{_syslog_proto} = $params->{proto} eq "udp" ? LOG_UDP : LOG_TCP;
        $self->{_syslog_host}  = $params->{hostname};
        $self->{_syslog_port}  = $params->{port};
    }
    catch {
        $self->error( "Failed to connect to syslog: $EVAL_ERROR",
            no_syslog => 1 );
    };

    return $self;
}

sub _ensure_syslog_sock {
    my $self = shift;

    try {
        $self->debug(
"Connecting to syslog: $self->{_syslog_proto}://$self->{_syslog_host}:$self->{_syslog_port}",
            no_syslog => 1
        );
        $self->{syslog}->set_receiver( $self->{_syslog_proto},
            $self->{_syslog_host}, $self->{_syslog_port} );

        my $s = $self->{syslog}->_get_sock();
        $self->debug( "Syslog socket: $s", no_syslog => 1 );
    }
    catch {
        $self->error( "Failed to connect to syslog: $EVAL_ERROR",
            no_syslog => 1 );

        return 0;
    };

    return 1;
}

sub _with_json_encoder {
    my $self = shift;

    $self->{jenc} = JSON::MaybeXS->new( utf8 => 1, allow_nonref => 1 );

    return $self;
}

sub _to_syslog {
    my ( $self, %p ) = @_;
    if ( !$self->{syslog} ) { return; }
    if ( $p{no_syslog} )    { return; }

    my $encoded = '';
    try {
        $encoded = $self->{jenc}->encode( \%p );
    }
    catch {
        $self->error( "Failed to encode message: $EVAL_ERROR", no_syslog => 1 );
        return;
    };

    if ( !$self->_ensure_syslog_sock() ) {
        return;
    }

    try {
        if ( $p{level} ) {
            $self->{syslog}->set_severity(
                $self->level_to_syslog_severity( delete( $p{level} ) ) );
        }

        $self->{syslog}->send($encoded);
    }
    catch {
        $self->error(
            "Failed to send message to syslog: $EVAL_ERROR. Message: $encoded",
            no_syslog => 1
        );
    };

    return;
}

sub filename {
    my $self = shift;
    return $self->{fn} ? $self->{fn}->stringify : undef;
}

sub set_level {
    my ( $self, $level ) = @_;
    if ( $self->log_level_to_int($level) >= 0 ) {
        $self->{level}     = $level;
        $self->{level_int} = $self->log_level_to_int($level);
        defined $self->{logger} && $self->{logger}->level($level);
    }
    return;
}

sub get_level {
    my $self = shift;
    return $self->{level};
}

sub debug {
    my ( $self, $message, %additionals ) = @_;

    return if ( $self->{level_int} > $self->log_level_to_int('DEBUG') );

    my ( $package, $filename, $line ) = caller;
    $filename = fileparse($filename);
    $message  = qq/${filename}:${line}: $message/;
    if ( $self->{to_file} ) {
        $self->_append_file( message => $message, level => 'DEBUG' );
    }
    else {
        $self->{logger}->debug( $message, @{ $self->{additionals} } );
    }

    $self->_to_syslog( message => $message, %additionals, level => 'debug' );

    return;
}

sub info {
    my ( $self, $message, %additionals ) = @_;

    return if ( $self->{level_int} > $self->log_level_to_int('INFO') );

    if ( $self->{to_file} ) {
        $self->_append_file( message => $message, level => 'INFO' );
    }
    else {
        $self->{logger}->info( $message, @{ $self->{additionals} } );
    }

    $self->_to_syslog( message => $message, %additionals, level => 'info' );

    return;
}

sub warn {
    my ( $self, $message, %additionals ) = @_;

    return if ( $self->{level_int} > $self->log_level_to_int('WARN') );

    my ( $package, $filename, $line ) = caller;
    $filename = fileparse($filename);
    $message  = qq/${filename}:${line}: $message/;
    if ( $self->{to_file} ) {
        $self->_append_file( message => $message, level => 'WARN' );
    }
    else {
        $self->{logger}->warn( $message, @{ $self->{additionals} } );
    }

    $self->_to_syslog( message => $message, %additionals, level => 'warn' );

    return;
}

sub error {
    my ( $self, $message, %additionals ) = @_;

    return if ( $self->{level_int} > $self->log_level_to_int('ERROR') );

    my ( $package, $filename, $line ) = caller;
    $filename = fileparse($filename);
    $message  = qq/${filename}:${line}: $message/;
    if ( $self->{to_file} ) {
        $self->_append_file( message => $message, level => 'ERROR' );
    }
    else {
        $self->{logger}->error( $message, @{ $self->{additionals} } );
    }

    $self->_to_syslog( message => $message, %additionals, level => 'error' );

    return;
}

sub fatal {
    my ( $self, $message, %additionals ) = @_;

    return if ( $self->{level_int} > $self->log_level_to_int('FATAL') );

    my ( $package, $filename, $line ) = caller;
    $filename = fileparse($filename);
    $message  = qq/${filename}:${line}: $message/;
    if ( $self->{to_file} ) {
        $self->_append_file( message => $message, level => 'FATAL' );
    }
    else {
        $self->{logger}->fatal( $message, @{ $self->{additionals} } );
    }

    $self->_to_syslog( message => $message, %additionals, level => 'fatal' );

    return;
}

sub _append_file {
    my $self = shift;
    my $h    = {@_};

    my $t    = gettimeofday();
    my $date = strftime '%Y-%m-%d %H:%M:%S', localtime $t;
    $date .= sprintf '.%03d', ( $t - int $t ) * 1000;

    my $field = {
        message   => $h->{message},
        owner     => $self->{owner},
        timestamp => $date,
        loglevel  => $h->{level},
        chunk     => $self->{chunk},
    };

    $self->{fn}->append_utf8( '@cee:' . $self->{jenc}->encode($field) . "\n" );
    return;
}

sub log_level_to_int {
    my $self   = shift;
    my $level  = uc shift;
    my $levels = {
        TRACE => 0,
        DEBUG => 1,
        INFO  => 2,
        WARN  => 3,
        ERROR => 4,
        FATAL => 5,
    };
    return $levels->{$level} // -1;
}

sub int_to_log_level {
    my ( $self, $level ) = @_;
    my $levels = {
        '0' => 'TRACE',
        '1' => 'DEBUG',
        '2' => 'INFO',
        '3' => 'WARN',
        '4' => 'ERROR',
        '5' => 'FATAL',
    };
    return $levels->{$level} // $level;
}

sub log {
    my $self = shift;
    my %h    = @_;

    $h{type} = $self->int_to_log_level( $h{type} );

    my %dispatcher = (
        TRACE => \&debug,
        DEBUG => \&debug,
        INFO  => \&info,
        WARN  => \&warn,
        ERROR => \&error,
        FATAL => \&fatal,
    );

    if ( exists $dispatcher{ uc $h{type} } ) {
        $dispatcher{ uc $h{type} }->( $self, $h{message} );
    }
    return;
}

my %_level_to_syslog_by_name = (
    trace => "debug",
    debug => "debug",
    info  => "info",
    warn  => "warning",
    error => "err",
    fatal => "emerg",
);

sub level_to_syslog_severity {
    my $level = lc $_[1];

    my $sev = get_severity($level);
    if ($sev) { return $sev }

    return get_severity( $_level_to_syslog_by_name{$level} );
}

1;
