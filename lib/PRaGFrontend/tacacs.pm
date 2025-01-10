package PRaGFrontend::tacacs;

use utf8;

use Dancer2 appname => 'plackGen';
use Dancer2::Plugin::Database;
use PRaGFrontend::Plugins::Serve;
use PRaGFrontend::Plugins::Logger;
use PRaGFrontend::Plugins::User;
use PRaGFrontend::Plugins::Menu;
use plackGen
  qw/load_servers start_process check_processes collect_nad_ips save_cli/;

use Readonly;
use String::ShellQuote qw/shell_quote/;
use HTTP::Status       qw/:constants/;
use PerlX::Maybe;

Readonly my $PREFIX => '/tacacs';

hook 'plugin.pragfrontend_plugins_menu.menu_collect' => sub {
    add_menu
      name  => 'generate',
      icon  => 'icon-add-outline',
      title => 'Generate';

    add_submenu 'generate',
      {
        name  => 'generate-tacacs',
        title => 'TACACS+',
        link  => $PREFIX . q{/},
      };
};

prefix $PREFIX;

get q{/?} => sub {
    if (serve_json) {
        send_as JSON => {
            nad  => { %{ config->{nad} }, ( ips => collect_nad_ips() ), },
            auth => {
                methods => [ 'ascii', 'pap' ]
            }
        };
    }
    else {
        send_as
          html => template 'react.tt',
          {
            active    => 'generate-tacacs',
            ui        => 'tacacs',
            title     => 'TACACS+',
            pageTitle => 'Generate New TACACS+ Sessions',
          };
    }
};

any [ 'get', 'post', 'patch', 'del' ] => '/**?' => sub {
    if ( !serve_json ) { forward $PREFIX. q{/}, { forwarded => 1 }; }

    pass;
};

post q{/?} => sub {
    return if !check_processes();

    my $original = body_parameters->as_hashref;

    if (   $original->{generation}->{amount} !~ /^\d+$/sxm
        || $original->{generation}->{amount} < 1
        || $original->{generation}->{amount} >
        config->{processes}->{max_sessions} )
    {
        send_error(
            q{Amount should be an integer between 1 and }
              . config->{processes}->{max_sessions} . q{.},
            HTTP_NOT_ACCEPTABLE
        );
    }

    if ( !length $original->{server}->{secret} ) {
        send_error( q{Shared secret should be specified.},
            HTTP_NOT_ACCEPTABLE );
    }

    if ( $original->{generation}->{save} && $original->{generation}->{bulk} ) {
        $original->{generation}->{save_bulk} = 1;
        my $bn =
          shell_quote( $original->{generation}->{bulk} =~ s/[\/\\\s]/_/rg );
        logging->debug("Sanified bulk name: $bn");
        $original->{generation}->{bulk} = $bn;
    }
    else {
        $original->{generation}->{save_bulk} = 0;
        $original->{generation}->{bulk}      = 'none';
    }

    logging->debug( q{Save bulk: } . $original->{save_bulk} );

    if (   $original->{generation}->{latency} !~ /^\d+(?:[.]{2}\d+)?$/sxm
        || $original->{generation}->{latency} < 0 )
    {
        $original->{generation}->{latency} = 0;
    }

    if (   $original->{generation}->{job_name}
        && $original->{generation}->{job_name} !~ /^[[:lower:]\d_]+$/isxm )
    {
        send_error(
q{Only the following symbols are allowed for job name:<br>Latin letters (a-z)<br>Numbers (0-9)<br>Underscore (_)},
            HTTP_NOT_ACCEPTABLE
        );
    }

    if ( config->{nad}->{no_local_addr} ) {
        delete $original->{nad}->{ip};
    }

    my $jsondata = {
        %{$original},
        (
            owner      => user->real_uid,
            protocol   => 'tacacs',
            count      => $original->{generation}->{amount},
            async      => $original->{generation}->{async} ? 1 : undef,
            parameters => {
                latency         => $original->{generation}->{latency},
                bulk            => $original->{generation}->{bulk} || undef,
                job_name        => $original->{generation}->{job_name},
                action          => 'generate',
                save_sessions   => $original->{generation}->{save} // '0',
                saved_cli       => undef,
                maybe scheduler => $original->{'scheduler'},
            }
        )
    };

    $jsondata->{parameters}->{saved_cli} =
      save_cli( JSON::MaybeXS->new( utf8 => 1 )->encode($jsondata) );

    my $encoded_json = JSON::MaybeXS->new( utf8 => 1 )->encode($jsondata);

    my $result = start_process(
        $encoded_json,
        {
            proc    => $original->{generation}->{job_name},
            verbose => $original->{debug} ? 1 : 0,
        }
    );

    if ( $result->{type} eq 'error' ) {
        send_error( $result->{message}, HTTP_INTERNAL_SERVER_ERROR );
    }
    else {
        send_as
          JSON => {
            status  => 'ok',
            success => 'Process started.',
          },
          { content_type => 'application/json; charset=UTF-8' };
    }
};

prefix q{/};

1;
