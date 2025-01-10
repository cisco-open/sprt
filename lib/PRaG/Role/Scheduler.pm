package PRaG::Role::Scheduler;

use strict;
use utf8;

use Moose::Role;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use FindBin;
use Carp;
use Data::Dumper;
use English  qw/-no_match_vars/;
use Storable qw/dclone/;
use Syntax::Keyword::Try;
use Ref::Util          qw/is_ref is_plain_hashref is_plain_arrayref/;
use String::ShellQuote qw/shell_quote/;
use Rex::Commands::Cron;
use Readonly;
use Text::ParseWords qw/shellwords/;

use PRaG::Util::Brew;

Readonly my $CRON_USER     => 'root';
Readonly my $MAX_PER_USER  => 4;
Readonly my $SCHEDULER_BIN => "$FindBin::Bin/scheduler";

# Scheduler parameters
has '_scheduler' => (
    is      => 'ro',
    isa     => 'Maybe[HashRef]',
    writer  => '_set_scheduler',
    default => undef,
);

after '_roles_init' => sub {
    my $self = shift;

    $self->_parse_scheduler;
    return 1;
};

after 'do' => sub {
    my $self = shift;

    $self->_schedule;
    return 1;
};

sub _parse_scheduler {
    my ($self) = @_;
    $self->debug and $self->logger->debug('Parsing schedule');

    if ( is_plain_hashref( $self->parameters->{scheduler} ) ) {
        $self->_set_scheduler( dclone( $self->parameters->{scheduler} ) );
        delete $self->parameters->{scheduler};
    }

    return;
}

sub cron_filter {
    my ( $command, $rgx, $user ) = @_;
    return if $command !~ /$rgx/smx;

    my $args = parse_tokens( shellwords($command) );
    return if not $args->{owner} eq $user;

    return 1;
}

sub _user_can_add_cron {
    my ($self) = @_;

    my @crons = cron list => $self->config_at( 'cron.user', $CRON_USER );
    my $rgx   = q{^} . $SCHEDULER_BIN;
    @crons = grep { cron_filter( $_->{command}, $rgx, $self->owner ) } @crons;

    $self->logger->debug( 'User crons: ' . Dumper( \@crons ) );

    if (
        scalar @crons > $self->config_at( 'cron.max_per_user', $MAX_PER_USER ) )
    {
        $self->logger->warn('User already have maximum cron jobs created.');
        return;
    }

    return 1;
}

sub _schedule {
    my ($self) = @_;
    $self->debug
      and $self->logger->debug('Setting schedule');

    return if not $self->_scheduler or not $self->_user_can_add_cron;

    if ( $self->_scheduler->{variant} eq 'job' ) {
        $self->_schedule_job;
    }
    elsif ( $self->_scheduler->{variant} eq 'updates' ) {
        $self->_scheduler_by_cron('updates');
    }

    return;
}

sub _schedule_job {
    my ($self) = @_;

    Readonly my $DISPATCH => {
        repeat  => \&_scheduler_repeat_job,
        cron    => sub { $_[0]->_scheduler_by_cron('job') },
        default => sub {
            $_[0]->logger->warn('Unknown variant for job schedule');
            return;
        }
    };

    my $r = $DISPATCH->{ $self->_scheduler->{job}->{variant} }
      // $DISPATCH->{default};

    $self->$r();

    return;
}

sub _scheduler_repeat_job {
    my ($self) = @_;
    $self->debug and $self->logger->debug('Repeat job');

    if ( not $self->_scheduler->{job}->{jid} ) {
        $self->debug and $self->logger->debug('Repeating self');
        $self->_update_job(
            {
                attributes => {
                    scheduler => {
                        repeat => {
                            times => $self->_scheduler->{job}->{times},
                            units => $self->_scheduler->{job}->{units},
                            wait  => $self->_scheduler->{job}->{wait},
                        }
                    }
                }
            }
        );
    }
    else {
        $self->debug
          and $self->logger->debug(
            'Repeat another job: ' . $self->_scheduler->{job}->{jid} );
    }

    system $self->_scheduler_base_cmd( $self->_scheduler->{job}->{jid}
          || undef ) . ' --repeat &';
    return;
}

sub _scheduler_by_cron {
    my ( $self, $what ) = @_;
    if ( $what ne 'job' and $what ne 'updates' ) {
        $self->logger->warn('Nothing to schedule');
        return;
    }

    $self->debug
      and $self->logger->debug( 'Scheduling ' . $what . ' with cron' );

    my $cron_parsed = $self->_make_cron( $self->_scheduler->{$what}->{cron} );
    $self->debug
      and $self->logger->debug( 'Got parsed cron: ' . Dumper($cron_parsed) );

    cron
      add => $self->config_at( 'cron.user', $CRON_USER ),
      {
        %{$cron_parsed},
        (
            command => $self->_scheduler_base_cmd
              . ( $what eq 'updates' ? ' --updates' : q{} )
        )
      };

    return;
}

Readonly my $WEEKDAY_TO_NUM => {
    SUN => 0,
    MON => 1,
    TUE => 2,
    WED => 3,
    THU => 4,
    FRI => 5,
    SAT => 6
};

sub prepare_weekday {
    my $wd = uc shift;
    return $WEEKDAY_TO_NUM->{$wd};
}

Readonly my $CRON_DISPATCH => {
    minutes => sub { { minute => q{*/} . $_[0]->{minutes} } },
    hours   => sub {
        $_[0]->{how} eq 'every'
          ? {
            minute       => $_[1],
            hour         => q{*/} . $_[0]->{hours},
            day_of_month => q{*/1},
          }
          : {
            minute       => $_[0]->{minute},
            hour         => $_[0]->{hour},
            day_of_month => q{*/1},
          };
    },
    days => sub {
        {
            minute       => $_[0]->{minute},
            hour         => $_[0]->{hour},
            day_of_month => q{*/} . $_[0]->{days},
        }
    },
    weeks => sub {
        my $cron = shift;
        return {
            minute      => $cron->{minute},
            hour        => $cron->{hour},
            day_of_week => join( q{,},
                map  { prepare_weekday($_) }
                grep { $cron->{weekdays}->{$_} } keys %{ $cron->{weekdays} } )
        };
    },
    default => sub { q{}; }
};

sub _make_cron {
    my ( $self, $cron ) = @_;
    my ( undef, $min, $hour, $day ) = localtime time;

    my $r = $CRON_DISPATCH->{ $cron->{variant} } || $CRON_DISPATCH->{default};

    return $r->( $cron, $min, $hour, $day );
}

sub parse_tokens {
    my @tokens = @_;

    my %data;
    my @keys;
    my $key = '_unknown';
    foreach my $token (@tokens) {
        if ( $token =~ s/^[-]{1,2}//sxm ) {
            $key = $token;
            push @keys, $key;
            next;
        }

        if ( is_ref( $data{$key} ) ) {
            push @{ $data{$key} }, $token;
        }
        elsif ( defined $data{$key} ) {
            $data{$key} = [ $data{$key}, $token ];
        }
        else {
            $data{$key} = $token;
        }
    }

    foreach my $key (@keys) {
        next if defined $data{$key};
        $data{$key} = 1;
    }

    return \%data;
}

sub _scheduler_base_cmd {
    my ( $self, $jid ) = @_;

    return
        brewcron_with()
      . $SCHEDULER_BIN
      . ' --owner '
      . shell_quote( $self->owner )
      . ' --jid '
      . shell_quote( $jid || $self->parameters->{job_id} );
}

sub _jobs_for_repeat {
    my ($self) = @_;

    my $sql =

      # q/SELECT "id", "name", "attributes"#>>'{scheduler,repeat}' repeat FROM /
      q/SELECT COUNT("id") c FROM /
      . $self->db->quote_identifier( $self->config->{tables}->{jobs} )
      . q/WHERE "owner" = /
      . $self->db->quote( $self->owner )
      . q/ AND "attributes"#>'{scheduler,repeat,times}' IS NOT NULL/;

    my $result = $self->db->selectall_arrayref( $sql, { Slice => {} } );
    return scalar $result->[0]->{c};
}

1;
