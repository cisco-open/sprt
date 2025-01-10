use strict;
use warnings;

use Carp;
use YAML qw/LoadFile DumpFile/;
use Data::Dumper;
use Term::ANSIColor;
use DBI;
use English qw( -no_match_vars );
use Syntax::Keyword::Try;
use Path::Tiny;
use File::Basename;
use File::Find;
use Cwd 'abs_path';

my ( undef, $DIR, undef ) = fileparse(__FILE__);
my $PARENT      = abs_path( $DIR . '../' ) . q{/};
my $CFG_FILE    = "${PARENT}config.yml";
my $CFG_FILE_EX = "${PARENT}config.example.yml";

croak q{Config file not found! Try 'control.sh config' first} if ( !-e $CFG_FILE );
my $CONFIG    = LoadFile($CFG_FILE);
my $CONFIG_EX = LoadFile($CFG_FILE_EX);
post_upgrade();
dumpYAML($PARENT);

sub post_upgrade {
    try {
        my $dbh = DBI->connect(
            'DBI:Pg:dbname='
              . $CONFIG->{plugins}->{Database}->{database}
              . ';host='
              . $CONFIG->{plugins}->{Database}->{host}
              . ';port='
              . $CONFIG->{plugins}->{Database}->{port},
            $CONFIG->{plugins}->{Database}->{username},
            $CONFIG->{plugins}->{Database}->{password}
        ) or croak $DBI::errstr;

        checkSQL($dbh);
        compareCfgs();

        $dbh->disconnect or croak $dbh->errstr;
        print colored( ['green'], "All looks fine\n" );
    }
    catch {
        print colored( ['red'], $EVAL_ERROR . "\n" );
    }
}

sub dumpYAML {
    DumpFile( $CFG_FILE, $CONFIG );
    print colored( ['green'],  "Configuration saved in $CFG_FILE, bye!\n" );
    print colored( ['yellow'], "Please re-run configuration!\n" );
    return;
}

sub compareCfgs {
    for my $k ( keys %{ $CONFIG_EX->{tables} } ) {
        $CONFIG->{tables}->{$k} //= $CONFIG_EX->{tables}->{$k};
    }
    $CONFIG->{debug} = 0;
    return;
}

sub checkSQL {
    my $dbh = shift;
    print "Checking SQL stuff, please wait...\n";
    my $user = $CONFIG->{plugins}->{Database}->{username};

    return if ( !checkTables($dbh) );

    if ( -e $PARENT . 'sql/changes.sql' ) {
        my $query = path( $PARENT . 'sql/changes.sql' )->slurp_utf8;
        $dbh->do($query) or croak $dbh->errstr;
        print 'Changes applied - ' . OK() . "\n";
    }

    return 1;
}

sub checkTables {
    my $dbh = shift;
    print "Checking tables, please wait...\n";
    my $success = 1;

    my @tables =
      qw/cli scep_servers jobs servers certificates templates logs flows sessions users dictionaries tacacs_sessions/;
    my $query;
    foreach my $tname (@tables) {
        print tab() . "Checking '$tname' - ";
        $query =
'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = ?)';
        my $res = $dbh->selectrow_arrayref( $query, undef, ($tname) )
          or die $dbh->errstr;
        if ( $res->[0] ) { print OK() . "\n"; }
        else {
            print NOK() . ', creating - ';
            $query = path( $PARENT . "sql/table.${tname}.sql" )->slurp_utf8;
            $dbh->do($query) or die $dbh->errstr;
            print OK() . "\n";
            if (
                confirm(
                        tab()
                      . "Change owner of the '$tname' to "
                      . $CONFIG->{plugins}->{Database}->{username}
                )
              )
            {
                $query = "ALTER TABLE public.$tname OWNER TO "
                  . $CONFIG->{plugins}->{Database}->{username};
                $dbh->do($query) or die $dbh->errstr;
            }

            if ( -e $PARENT . "sql/data.${tname}.sql" ) {
                print 'Populating... ';
                $query = path( $PARENT . "sql/table.${tname}.sql" )->slurp_utf8;
                $dbh->do($query) or die $dbh->errstr;
                print OK() . "\n";
            }
        }
    }
    return $success;
}

sub confirm {
    my $question = shift;
    my $reply    = q{};

    do {    # allow for pedants who reply "yes" or "no"
        print "$question? (y/n) ";
        chomp( $reply = <STDIN> );
    } while ( $reply !~ m/^[yn]/isxm );
    return $reply =~ m/^y/isxm ? 1 : undef;
}

sub OK {
    return colored( ['green'], 'OK' );
}

sub NOK {
    return colored( ['red'], 'NOT OK' );
}

sub header {
    print colored( ['white bold'], shift ) . "\n";
}

sub tab {
    my $c = shift;
    $c //= 1;
    return q{ } x ( 2 * $c );
}

1;
