package PRaG::Role::Logger;

use strict;
use utf8;

use Moose::Role;
use namespace::autoclean;

use Carp;
use Data::GUID;
use English qw/ -no_match_vars /;
use logger;

has 'logger' => (
    is     => 'ro',
    isa    => 'logger',
    writer => '_set_logger',
    traits => ['NoGetopt'],
);

# Create logger
sub _init_logger {
    my ( $self, $owner ) = @_;

    if ( $self->logger && $self->logger->{owner} eq $owner ) {
        $self->logger->debug('Logger already initialized.');
        return $self;
    }

    $self->_set_logger(
        logger->new(
            'log-parameters' => \scalar( $self->config->{log4perl} ),
            owner            => $owner,
            chunk            => Data::GUID->guid_string,
            debug            => $self->config->{debug},
            syslog           => $self->config->{syslog},
        )
    );

    $self->logger->debug('Verbose is enabled.');
    return $self;
}

1;
