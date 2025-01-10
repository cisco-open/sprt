package PRaGFrontend::variables;

use Data::Dumper;
use Data::Fake qw/Core Company Internet Names Text/;
use Text::Autoformat;
use Readonly;
use Ref::Util    qw/is_ref/;
use PerlX::Maybe qw/maybe provided/;

BEGIN {
    use Exporter ();
    use vars     qw(@ISA @EXPORT @EXPORT_OK %EXPORT_TAGS);
    @ISA       = qw(Exporter);
    @EXPORT    = qw();
    @EXPORT_OK = qw(proto_parameters);

    %EXPORT_TAGS = (
        definitions => [qw($fieldsDefinitions)],
        proto       => [
            qw/$eap_tls $eap_tls_radius $ciphers
              $pap_parameters $pap_radius
              $eap_mschapv2_radius $eap_mschapv2_parameters/
        ],
    );
    Exporter::export_ok_tags(qw/definitions proto/);
}

use vars qw/$fieldsDefinitions $variables $mac
  $eap_tls $eap_tls_radius $ciphers $pap_parameters $pap_radius
  $eap_mschapv2_radius $eap_mschapv2_parameters/;

################################################################################
# Elements
################################################################################
sub span {
    my ( $content, %o ) = @_;
    return {
        name  => $o{name} // 'head',
        type  => 'span',
        value => $content,
    };
}

sub div {
    my %o = @_;
    return {
        type => 'div',
        maybe( class => $o{class} ),
        maybe( style => $o{style} ),
        maybe( value => $o{value} ),
    };
}

sub text {
    my %o = @_;
    return {
        name  => $o{name} // 'text',
        type  => 'text',
        label => $o{label} // 'Label',
        value => $o{value} // q{},
        maybe( buttons     => $o{buttons} ),
        maybe( validate    => $o{validate} ),
        maybe( group       => $o{group} ),
        maybe( placeholder => $o{placeholder} ),
    };
}

sub number {
    my %o = @_;
    return {
        name  => $o{name} // 'number',
        type  => 'number',
        label => $o{label} // 'Number',
        value => $o{value} // 1,
        maybe( min => $o{min} ),
        maybe( max => $o{max} ),
    };
}

sub dictionary_field {
    my %o = @_;
    return {
        name            => $o{name} // 'dictionary',
        type            => 'dictionary',
        label           => $o{label} // 'Dictionaries',
        dictionary_type => $o{type}  // ['unclassified'],
        value           => $o{value} // undef,
    };
}

sub divider {
    my %o = @_;
    return {
        type => 'divider',
        maybe( accent  => $o{accent} ),
        maybe( grouper => $o{grouper} ),
    };
}

sub grouper {
    my %o = @_;
    return divider(
        grouper => $o{title},
        accent  => $o{accent},
    );
}

sub textarea_field {
    my %o = @_;
    return {
        name         => $o{name} // 'textarea',
        type         => 'textarea',
        label        => $o{title}    // 'Textarea',
        'label-hint' => $o{hint}     // q{},
        'from-file'  => $o{file}     // 0,
        validate     => $o{validate} // 1,
        buttons      => $o{buttons}  // [],
    };
}

sub variants {
    my (%o) = @_;
    $o{top_head} //= 1;

    return {
        type  => 'variants',
        title => $o{title},
        name  => $o{name},
        value => $o{value},
        maybe( selected => $o{selected} ),
        maybe( inline   => $o{inline} ),
        provided( $o{top_head}, top_head => $o{top_head} ),
    };
}

sub ivariants {
    return variants( @_, inline => 1, top_head => 0 );
}

sub credentials_field {
    my %o = @_;
    return variants(
        title => $o{title} // 'Credentials',
        name  => $o{name}  // 'credentials',
        value => [
            {
                short  => 'From list',
                name   => 'list',
                desc   => 'Credentials from the list',
                fields => [
                    span('Credentials will be selected from the list below'),
                    textarea_field(
                        name  => 'credentials-list',
                        title => 'Credentials',
                        hint  => 'Format user:password<br>'
                          . 'One record per line<br>'
                          . 'Count: $counter$',
                        file => 1
                    ),
                ]
            },
            {
                short  => 'From dictionary',
                name   => 'dictionary',
                desc   => 'Value taken from a dictionary',
                fields => [ dictionary_field( type => ['credentials'], ), ],
            },
        ],
    );
}

sub dd_val {
    my %o = @_;

    return {
        val   => $o{val},
        title => '<span>'
          . '<span class="'
          . ( $o{mono} ? 'monospace ' : q{} )
          . 'half-margin-right">'
          . ${ $o{mono} }
          . '</span>'
          . ( $o{title} // $o{val} )
          . '</span>'
      }
      if ( is_ref( $o{mono} ) );

    return {
        val   => $o{val},
        title => '<span class="'
          . ( $o{mono} ? 'monospace ' : q{} )
          . 'half-margin-right">'
          . ( $o{title} // $o{val} )
          . '</span>'
    };
}

sub ddm_val {
    return dd_val( @_, mono => 1 );
}

sub checkbox {
    my %o = @_;
    return {
        name  => $o{name} // 'checkbox',
        type  => 'checkbox',
        label => $o{label} // 'Checkbox',
        value => $o{value} // 0,
        maybe( dependants      => $o{dependants} ),
        maybe( show_if_checked => $o{show_if_checked} ),
    };
}

sub radio {
    my %o = @_;
    return {
        type     => 'radio',
        label    => $o{label} // 'Radio',
        name     => $o{name}  // 'radio',
        variants => $o{variants},
        maybe( update_on_change => $o{update_on_change} ),
        maybe( advanced         => $o{advanced} ),
    };
}

sub disallow_repeats {
    my ( $label, $name ) = @_;
    return checkbox(
        name  => $name // 'disallow-repeats',
        label => $label,
    );
}

sub columns {
    return {
        type  => 'columns',
        value => \@_
    };
}

sub select_field {
    my %o = @_;
    return {
        name  => $o{name} // 'select',
        type  => 'select',
        label => $o{label} // 'Select',
        maybe( load_values => $o{load_values} ),
        maybe( inline      => $o{inline} ),
        maybe( value       => $o{value} ),
    };
}

sub alert {
    my ( $value, %o ) = @_;
    return {
        type     => 'alert',
        value    => $value,
        severity => $o{severity} // 'warning',
    };
}

sub drawer {
    my %o = @_;
    return {
        type   => 'drawer',
        title  => $o{title},
        opened => $o{opened} // 0,
        fields => $o{fields},
    };
}

sub dd_btn {
    my %o = @_;
    return {
        title => $o{title},
        type  => 'dropdown',
        maybe( name        => $o{name} ),
        maybe( values      => $o{values} ),
        maybe( icon        => $o{icon} ),
        maybe( load_values => $o{load_values} ),
    };
}

sub hidden {
    my ( $name, %o ) = @_;
    return {
        name  => $name,
        type  => 'hidden',
        value => $o{value},
    };
}

sub rad_attribute {
    my ( $id, $value, $overwrite ) = @_;
    return {
        id        => $id,
        value     => $value,
        overwrite => $overwrite // 1,
    };
}

################################## Definitions

################################################################################
# MAB Start
################################################################################
sub mac_block {
    my $times = shift;
    $times ||= 1;

    return join q{:}, (q/[A-F0-9]{2}/) x $times;
}

Readonly my @VENDOR_OUIS => (
    [ '00:09:43', 'Cisco' ],
    [ '00:0B:CD', 'Hewlett-Packard' ],
    [ '00:0B:DB', 'Dell' ],
    [ '14:8F:C6', 'Apple' ],
    [ 'A4:8C:DB', 'Lenovo' ],
);

sub vendor_ouis {
    return map {
        dd_val(
            val   => $_->[0] . q{:} . mac_block(3),
            mono  => \$_->[0],
            title => $_->[1]
        )
    } @VENDOR_OUIS;
}

$mac = {
    variants => [
        {
            short  => 'Random',
            name   => 'random',
            desc   => 'Random MAC address',
            fields => [
                span('Random MAC address will be generated for each session'),
                disallow_repeats('Disallow reuse of MAC addresses'),
            ]
        },
        {
            short  => 'Pattern based',
            name   => 'random-pattern',
            desc   => 'Pattern based MAC addresses generation',
            fields => [
                span(
                        'Random MAC address will be generated '
                      . 'for each session according to the pattern'
                ),
                text(
                    name    => 'pattern',
                    label   => 'Pattern',
                    value   => mac_block(6),
                    buttons => [
                        dd_btn(
                            title  => 'Samples',
                            values => [
                                vendor_ouis(),
                                'divider',
                                {
                                    val   => mac_block(6),
                                    title => 'Random'
                                },
                            ]
                        ),
                    ]
                ),
                disallow_repeats('Disallow reuse of MAC addresses'),
                div(
                    class => 'panel panel--light panel--bordered panel--well',
                    style => 'margin-top: 10.5px; margin-bottom: 0;',
                    value => <<'EO_VALUE'
The following regular expression elements are supported:<br>
<pre class="monospace">
  \w    Alphanumeric + "_"
  \d    Digits
  \W    Printable characters other than those in \w
  \D    Printable characters other than those in \d
  .     Printable characters
  []    Character classes
  {}    Repetition
  *     Same as {0,}
  ?     Same as {0,1}
  +     Same as {1,}
</pre>
EO_VALUE
                ),
            ]
        },
        {
            short  => 'From list',
            name   => 'list',
            desc   => 'MAC address from the list',
            fields => [
                span('MAC address will be selected from the list below'),
                textarea_field(
                    name  => 'mac-list',
                    title => 'MACs',
                    hint  => 'One per line<br>'
                      . 'No format requirements<br>'
                      . 'Everything will be used<br>'
                      . 'Count: $counter$',
                    file    => 1,
                    buttons => [
                        dd_btn(
                            title       => 'Load from a previous bulk',
                            icon        => 'icon-link',
                            name        => 'bulk-load',
                            load_values => {
                                link => '/get-attribute-values/bulks/'
                            }
                        ),
                    ],
                ),
                radio(
                    name     => 'how-to-follow',
                    label    => 'How to follow the list',
                    variants => [
                        {
                            value    => 'random',
                            label    => 'Select random from the list',
                            selected => 1
                        },
                        {
                            value => 'one-by-one',
                            label =>
                              'Follow one-by-one (round robin if reuse allowed)'
                        }
                    ]
                ),
                disallow_repeats('Disallow reuse of MAC addresses'),
            ]
        },
        {
            short  => 'Incrementing',
            name   => 'one-by-one',
            desc   => 'Incrementing MAC addresses',
            fields => [
                span('MAC address will be generated one-by-one, incrementing'),
                columns(
                    [
                        text(
                            name     => 'first-mac',
                            label    => 'MAC address to start from',
                            value    => '00:01:42:00:00:01',
                            validate => '(^([a-f0-9]{2}[:-]){5}[a-f0-9]{2}$)|'
                              . '(^([a-f0-9]{4}\.){2}[a-f0-9]{4}$)|'
                              . '(^[a-f0-9]{12}$)'
                        )
                    ],
                    [
                        text(
                            name     => 'last-mac',
                            label    => 'Last MAC address',
                            value    => '00:01:42:FF:FF:FF',
                            validate => '(^([a-f0-9]{2}[:-]){5}[a-f0-9]{2}$)|'
                              . '(^([a-f0-9]{4}\.){2}[a-f0-9]{4}$)|'
                              . '(^[a-f0-9]{12}$)'
                        ),
                    ]
                ),
                number(
                    name  => 'step',
                    label => 'Increment step',
                    value => '1'
                ),
                checkbox(
                    name  => 'round-robin',
                    label =>
                      'Start from beginning once last MAC address reached',
                    value => 1
                ),
                div(
                    class => 'panel panel--light panel--bordered panel--well',
                    style => 'margin-top: 10.5px; margin-bottom: 0;',
                    value => <<'EO_VALUE'
Supported formats:
<pre>
  AA:BB:CC:DD:EE:FF
  AA-BB-CC-DD-EE-FF
  AAAA.BBBB.CCCC
  AABBCCDDEEFF
</pre>
EO_VALUE
                )
            ]
        },
        {
            short  => 'From dictionary',
            name   => 'dictionary',
            desc   => 'Value taken from a dictionary',
            fields =>
              [ dictionary_field( type => [ 'mac', 'unclassified' ], ), ],
        }
    ]
};

my $mac_wrapp = {
    parameters => [
        variants(
            title => 'MAC address generation rule',
            name  => 'MAC',
            value => $mac->{variants},
        )
    ],
};

my $ip_var = {
    variants => [
        {
            short  => 'Random',
            name   => 'random',
            desc   => 'Random IP address',
            fields => [
                span('Random IP address will be generated for each session'),
                disallow_repeats('Disallow reuse of IP addresses'),
            ]
        },
        {
            short  => 'Random from range',
            name   => 'range-random',
            desc   => 'Random IP address from range',
            fields => [
                span(
                        'Random IP address from a range '
                      . 'will be generated for each session'
                ),
                text(
                    name    => 'range',
                    label   => 'Range',
                    value   => '10.0.0.0/8',
                    buttons => [
                        dd_btn(
                            title  => 'Samples',
                            values => [
                                ddm_val( val => '10.0.0.0/8' ),
                                ddm_val( val => '172.16.0.0/12' ),
                                ddm_val( val => '192.168.0.0/16' ),
                                ddm_val( val => '10.10.0.0 - 10.10.255.255' ),
                                ddm_val(
                                    val => '192.168.10.1 - 192.168.10.254'
                                ),
                            ]
                        )
                    ]
                ),
                disallow_repeats('Disallow reuse of IP addresses'),
            ]
        },
        {
            short  => 'Incrementing',
            name   => 'range',
            desc   => 'Incrementing IP address from range',
            fields => [
                span(
                        'Incrementing IP address from a range '
                      . 'will be generated for each session'
                ),
                text(
                    name    => 'range',
                    label   => 'Range',
                    value   => '10.0.0.0/8',
                    buttons => [
                        dd_btn(
                            title  => 'Samples',
                            values => [
                                ddm_val( val => '10.0.0.0/8' ),
                                ddm_val( val => '172.16.0.0/12' ),
                                ddm_val( val => '192.168.0.0/16' ),
                                ddm_val( val => '10.10.0.0 - 10.10.255.255' ),
                                ddm_val(
                                    val => '192.168.10.1 - 192.168.10.254'
                                ),
                            ]
                        ),
                    ],
                ),
                hidden( 'how', value => 'increment' ),
                number(
                    name  => 'increment',
                    label => 'Increment step',
                    value => '1'
                ),
                disallow_repeats('Disallow reuse of IP addresses'),
            ]
        },
        {
            short  => 'From dictionary',
            name   => 'dictionary',
            desc   => 'Value taken from a dictionary',
            fields =>
              [ dictionary_field( type => [ 'ip', 'unclassified' ], ), ],
        },
    ]
};

my $ip_wrapp = {
    parameters => [
        variants(
            title => 'IP address generation rule',
            name  => 'IP',
            value => $ip_var->{variants},
        )
    ],
};

################################################################################
# PAP Start
################################################################################
$pap_parameters = [
    checkbox(
        name  => 'chap',
        label => 'Use CHAP',
    ),
    checkbox(
        name  => 'pap-count-as-creds',
        label => 'Amount of sessions equals to amount of credentials',
    ),
    credentials_field(
        title => 'Credentials',
        name  => 'credentials',
    ),
];

$pap_radius = [
    rad_attribute( 'Service-Type',  'Framed-User' ),
    rad_attribute( 'User-Name',     'From the crenedtials list' ),
    rad_attribute( 'User-Password', 'From the crenedtials list' ),
];
################################################################################
# PAP End
################################################################################

################################################################################
# EAP TLS Start
################################################################################
my @tls_options = (
    radio(
        label            => 'Allowed TLS versions',
        name             => 'tls-version',
        update_on_change => 'allowed-ciphers',
        variants         => [
            {
                name  => 'tls_10',
                value => 'TLSv1',
                label => 'TLS v1.0',
            },
            {
                name  => 'tls_11',
                value => 'TLSv1_1',
                label => 'TLS v1.1',
            },
            {
                name     => 'tls_12',
                value    => 'TLSv1_2',
                label    => 'TLS v1.2',
                selected => 1
            }
        ]
    ),
    {
        type        => 'multiple',
        name        => 'allowed-ciphers',
        label       => 'Allowed ciphers',
        advanced    => 1,
        load_values => {
            link   => '/generate/get-ciphers/{{tls-version}}/',
            method => 'GET',
            result => {
                type      => 'groups',
                paging    => 0,
                attribute => 'ciphers',
                fields    => {
                    name => 'name',
                    id   => 'id',
                }
            }
        }
    },
    checkbox(
        name       => 'validate-server',
        label      => 'Validate server',
        dependants =>
          [qw/trusted-certificates validate-fail-action fail-start-new/],
        show_if_checked => 1,
    ),
    {
        type        => 'multiple',
        name        => 'trusted-certificates',
        label       => 'Trusted CA/Root certificates',
        load_values => {
            link   => '/cert/trusted/',
            method => 'GET',
            result => {
                type      => 'table',
                paging    => 1,
                attribute => 'trusted',
                fields    => {
                    name => 'friendly_name',
                    id   => 'id',
                },
                columns => [
                    {
                        title => 'Friendly Name',
                        field => 'friendly_name'
                    },
                    { title => 'Subject', field => 'subject' },
                ]
            }
        }
    },
    radio(
        name     => 'validate-fail-action',
        label    => q/Action if failed to validate server's certificate/,
        variants => [
            {
                value => 'drop',
                label => 'Drop session'
            },
            {
                value    => 'inform',
                label    => 'Sent TLS alert to the server',
                selected => 1,
            }
        ]
    ),
);

$eap_tls = [
    columns(
        [
            variants(
                name  => 'identity-certificates',
                title => 'Identity certificates',
                value => [
                    {
                        short => 'Selected',
                        name  => 'selected',
                        desc  => 'Select pre-uploaded identity certificates',
                        dependants => [
                            { 'usernames' => 'from-cert-cn' },
                            { 'usernames' => 'from-cert-san-dns' },
                            { 'usernames' => 'from-cert-san-pattern' },
                        ],
                        select_dependant => { 'usernames' => 'from-cert-cn' },
                        show_if_checked  => 1,
                        fields           => [
                            span(
                                    'Selected certificates will '
                                  . 'be used for authentication'
                            ),
                            {
                                name        => 'certificates',
                                type        => 'multiple',
                                label       => 'Certificates',
                                load_values => {
                                    link   => '/cert/identity/?filter_broken=1',
                                    method => 'GET',
                                    result => {
                                        type      => 'table',
                                        paging    => 1,
                                        attribute => 'identity',
                                        fields    => {
                                            name => 'friendly_name',
                                            id   => 'id',
                                        },
                                        columns => [
                                            {
                                                title => 'Friendly Name',
                                                field => 'friendly_name'
                                            },
                                            {
                                                title => 'Subject',
                                                field => 'subject'
                                            },
                                            {
                                                title => 'Issuer',
                                                field => 'issuer'
                                            },
                                        ]
                                    }
                                }
                            }
                        ]
                    },    # Variant selected
                    {
                        short            => 'SCEP',
                        name             => 'scep',
                        desc             => 'Request from SCEP server',
                        dependants       => [ { 'usernames' => 'random' } ],
                        select_dependant => { 'usernames' => 'random' },
                        show_if_checked  => 1,
                        fields           => [
                            span(
                                    'Request a session '
                                  . 'certificate from SCEP server'
                            ),
                            select_field(
                                name        => 'scep-server',
                                label       => 'SCEP server',
                                load_values => {
                                    link    => '/cert/scep/',
                                    method  => 'POST',
                                    request => { scep_servers => 1 },
                                    result  => {
                                        attribute => 'scep',
                                        fields    => {
                                            name => 'name',
                                            id   => 'id',
                                        }
                                    }
                                }
                            ),
                            select_field(
                                name        => 'template',
                                label       => 'CSR template',
                                load_values => {
                                    link    => '/cert/templates/',
                                    method  => 'GET',
                                    request => undef,
                                    result  => {
                                        attribute => 'result',
                                        fields    => {
                                            name => 'friendly_name',
                                            id   => 'id',
                                        }
                                    }
                                }
                            ),
                            checkbox(
                                name  => 'save-id-certificates',
                                label => 'Save generated certificates '
                                  . 'in "Identity Certificates"',
                            )
                        ]
                    },    # Variant SCEP end
                ]
            ),
            variants(
                name  => 'usernames',
                title => 'EAP Session usernames',
                value => [
                    {
                        short  => 'Certificate - CN',
                        name   => 'from-cert-cn',
                        desc   => 'Use CN part of Subject',
                        fields => [
                            span(
                                    'CN part of Subject field will be used. '
                                  . 'If CN not found - session '
                                  . 'will be unsuccessful'
                            ),
                        ]
                    },
                    {
                        short  => 'Certificate - SAN DNS',
                        name   => 'from-cert-san-dns',
                        desc   => 'Use first found DNS name of SAN',
                        fields =>
                          [ span('First found DNS name of SAN will be used'), ]
                    },
                    {
                        short  => 'Certificate - Any SAN',
                        name   => 'from-cert-san-pattern',
                        desc   => 'Search for SAN matching pattern',
                        fields => [
                            span(
                                    'Every SAN will be checked with pattern, '
                                  . 'first matched will be used.'
                            ),
                            {
                                type     => 'checkboxes',
                                label    => 'Search in SAN field of types',
                                name     => 'san-types-allowed',
                                variants => [
                                    {
                                        name  => 'otherName',
                                        label => 'Other Name',
                                        value => 1
                                    },
                                    {
                                        name  => 'rfc822Name',
                                        label => 'RFC822 Name',
                                        value => 1
                                    },
                                    {
                                        name  => 'dNSName',
                                        label => 'DNS Name',
                                        value => 1
                                    },
                                    {
                                        name  => 'iPAddress',
                                        label => 'IP Address',
                                        value => 1
                                    },
                                ]
                            },
                            text(
                                name  => 'san-pattern',
                                label => 'Pattern <small>(RegEx)</small>',
                                value => q{.*}
                            ),
                        ]
                    },
                    {
                        short    => 'Same as MAC',
                        name     => 'same-as-mac',
                        desc     => 'Same as MAC',
                        selected => 1,
                        fields   => [
                            span(
                                    '$USERNAME$ variable will be replaced '
                                  . 'with value of $MAC$ variable'
                            ),
                            checkbox(
                                name  => 'remove-delimiters',
                                label => 'Remove delimiter-characters (-:.) '
                                  . 'from MAC address to use as username',
                                value => 1
                            ),
                        ]
                    },
                    {
                        short  => 'Specified',
                        name   => 'specified',
                        desc   => 'Specify usernames manually',
                        fields => [
                            span('Only specified usernames will be used'),
                            textarea_field(
                                name     => 'specified-usernames',
                                title    => 'Usernames',
                                hint     => 'List of usernames<br>One per line',
                                validate => 0
                            )
                        ]
                    },
                    {
                        short  => 'Dictionaries',
                        name   => 'dictionary',
                        desc   => 'Get usernames from dictionaries',
                        fields => [ dictionary_field() ],
                    },
                    {
                        short  => 'Random',
                        name   => 'random',
                        desc   => 'Random username',
                        fields => [
                            span(
                                    'Random username will be created '
                                  . 'for each session'
                            ),
                            columns(
                                [
                                    number(
                                        name  => 'min-length',
                                        label => 'Minimal username length',
                                        value => 5
                                    ),
                                ],
                                [
                                    number(
                                        name  => 'max-length',
                                        label => 'Maximal username length',
                                        value => 20
                                    ),
                                ]
                            ),
                        ]
                    },
                ]
            ),
            radio(
                name     => 'chain-send',
                label    => 'What certificates should be sent',
                advanced => 1,
                variants => [
                    {
                        value => 'full',
                        label => 'Full chain'
                    },
                    {
                        value    => 'but-root',
                        label    => 'Full chain w/out root',
                        selected => 1
                    },
                    {
                        value => 'only-identity',
                        label => 'Only identity certificate'
                    }
                ]
            ),
        ],    # End of first column
        \@tls_options,    #End of second column
    ),                    # Columns end here
];

$eap_tls_radius = [
    rad_attribute( 'Service-Type', 'Framed-User' ),
    rad_attribute( 'User-Name',    '$USERNAME$' ),
    rad_attribute( 'EAP-Message',  'EAP and TLS data' ),
];
################################################################################
# EAP TLS End
################################################################################

################################################################################
# TLS Start
################################################################################
my %spec_name = (
    'NULL-MD5'                    => 'SSL_RSA_WITH_NULL_MD5',
    'NULL-SHA'                    => 'SSL_RSA_WITH_NULL_SHA',
    'RC4-MD5'                     => 'SSL_RSA_WITH_RC4_128_MD5',
    'RC4-SHA'                     => 'SSL_RSA_WITH_RC4_128_SHA',
    'IDEA-CBC-SHA'                => 'SSL_RSA_WITH_IDEA_CBC_SHA',
    'DES-CBC3-SHA'                => 'SSL_RSA_WITH_3DES_EDE_CBC_SHA',
    'DH-DSS-DES-CBC3-SHA'         => 'SSL_DH_DSS_WITH_3DES_EDE_CBC_SHA',
    'DH-RSA-DES-CBC3-SHA'         => 'SSL_DH_RSA_WITH_3DES_EDE_CBC_SHA',
    'DHE-DSS-DES-CBC3-SHA'        => 'SSL_DHE_DSS_WITH_3DES_EDE_CBC_SHA',
    'DHE-RSA-DES-CBC3-SHA'        => 'SSL_DHE_RSA_WITH_3DES_EDE_CBC_SHA',
    'ADH-RC4-MD5'                 => 'SSL_DH_anon_WITH_RC4_128_MD5',
    'ADH-DES-CBC3-SHA'            => 'SSL_DH_anon_WITH_3DES_EDE_CBC_SHA',
    'NULL-MD5'                    => 'TLS_RSA_WITH_NULL_MD5',
    'NULL-SHA'                    => 'TLS_RSA_WITH_NULL_SHA',
    'RC4-MD5'                     => 'TLS_RSA_WITH_RC4_128_MD5',
    'RC4-SHA'                     => 'TLS_RSA_WITH_RC4_128_SHA',
    'IDEA-CBC-SHA'                => 'TLS_RSA_WITH_IDEA_CBC_SHA',
    'DES-CBC3-SHA'                => 'TLS_RSA_WITH_3DES_EDE_CBC_SHA',
    'DHE-DSS-DES-CBC3-SHA'        => 'TLS_DHE_DSS_WITH_3DES_EDE_CBC_SHA',
    'DHE-RSA-DES-CBC3-SHA'        => 'TLS_DHE_RSA_WITH_3DES_EDE_CBC_SHA',
    'ADH-RC4-MD5'                 => 'TLS_DH_anon_WITH_RC4_128_MD5',
    'ADH-DES-CBC3-SHA'            => 'TLS_DH_anon_WITH_3DES_EDE_CBC_SHA',
    'AES128-SHA'                  => 'TLS_RSA_WITH_AES_128_CBC_SHA',
    'AES256-SHA'                  => 'TLS_RSA_WITH_AES_256_CBC_SHA',
    'DH-DSS-AES128-SHA'           => 'TLS_DH_DSS_WITH_AES_128_CBC_SHA',
    'DH-DSS-AES256-SHA'           => 'TLS_DH_DSS_WITH_AES_256_CBC_SHA',
    'DH-RSA-AES128-SHA'           => 'TLS_DH_RSA_WITH_AES_128_CBC_SHA',
    'DH-RSA-AES256-SHA'           => 'TLS_DH_RSA_WITH_AES_256_CBC_SHA',
    'DHE-DSS-AES128-SHA'          => 'TLS_DHE_DSS_WITH_AES_128_CBC_SHA',
    'DHE-DSS-AES256-SHA'          => 'TLS_DHE_DSS_WITH_AES_256_CBC_SHA',
    'DHE-RSA-AES128-SHA'          => 'TLS_DHE_RSA_WITH_AES_128_CBC_SHA',
    'DHE-RSA-AES256-SHA'          => 'TLS_DHE_RSA_WITH_AES_256_CBC_SHA',
    'ADH-AES128-SHA'              => 'TLS_DH_anon_WITH_AES_128_CBC_SHA',
    'ADH-AES256-SHA'              => 'TLS_DH_anon_WITH_AES_256_CBC_SHA',
    'CAMELLIA128-SHA'             => 'TLS_RSA_WITH_CAMELLIA_128_CBC_SHA',
    'CAMELLIA256-SHA'             => 'TLS_RSA_WITH_CAMELLIA_256_CBC_SHA',
    'DH-DSS-CAMELLIA128-SHA'      => 'TLS_DH_DSS_WITH_CAMELLIA_128_CBC_SHA',
    'DH-DSS-CAMELLIA256-SHA'      => 'TLS_DH_DSS_WITH_CAMELLIA_256_CBC_SHA',
    'DH-RSA-CAMELLIA128-SHA'      => 'TLS_DH_RSA_WITH_CAMELLIA_128_CBC_SHA',
    'DH-RSA-CAMELLIA256-SHA'      => 'TLS_DH_RSA_WITH_CAMELLIA_256_CBC_SHA',
    'DHE-DSS-CAMELLIA128-SHA'     => 'TLS_DHE_DSS_WITH_CAMELLIA_128_CBC_SHA',
    'DHE-DSS-CAMELLIA256-SHA'     => 'TLS_DHE_DSS_WITH_CAMELLIA_256_CBC_SHA',
    'DHE-RSA-CAMELLIA128-SHA'     => 'TLS_DHE_RSA_WITH_CAMELLIA_128_CBC_SHA',
    'DHE-RSA-CAMELLIA256-SHA'     => 'TLS_DHE_RSA_WITH_CAMELLIA_256_CBC_SHA',
    'ADH-CAMELLIA128-SHA'         => 'TLS_DH_anon_WITH_CAMELLIA_128_CBC_SHA',
    'ADH-CAMELLIA256-SHA'         => 'TLS_DH_anon_WITH_CAMELLIA_256_CBC_SHA',
    'SEED-SHA'                    => 'TLS_RSA_WITH_SEED_CBC_SHA',
    'DH-DSS-SEED-SHA'             => 'TLS_DH_DSS_WITH_SEED_CBC_SHA',
    'DH-RSA-SEED-SHA'             => 'TLS_DH_RSA_WITH_SEED_CBC_SHA',
    'DHE-DSS-SEED-SHA'            => 'TLS_DHE_DSS_WITH_SEED_CBC_SHA',
    'DHE-RSA-SEED-SHA'            => 'TLS_DHE_RSA_WITH_SEED_CBC_SHA',
    'ADH-SEED-SHA'                => 'TLS_DH_anon_WITH_SEED_CBC_SHA',
    'DHE-DSS-RC4-SHA'             => 'TLS_DHE_DSS_WITH_RC4_128_SHA',
    'ECDHE-RSA-NULL-SHA'          => 'TLS_ECDHE_RSA_WITH_NULL_SHA',
    'ECDHE-RSA-RC4-SHA'           => 'TLS_ECDHE_RSA_WITH_RC4_128_SHA',
    'ECDHE-RSA-DES-CBC3-SHA'      => 'TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA',
    'ECDHE-RSA-AES128-SHA'        => 'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA',
    'ECDHE-RSA-AES256-SHA'        => 'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA',
    'ECDHE-ECDSA-NULL-SHA'        => 'TLS_ECDHE_ECDSA_WITH_NULL_SHA',
    'ECDHE-ECDSA-RC4-SHA'         => 'TLS_ECDHE_ECDSA_WITH_RC4_128_SHA',
    'ECDHE-ECDSA-DES-CBC3-SHA'    => 'TLS_ECDHE_ECDSA_WITH_3DES_EDE_CBC_SHA',
    'ECDHE-ECDSA-AES128-SHA'      => 'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA',
    'ECDHE-ECDSA-AES256-SHA'      => 'TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA',
    'AECDH-NULL-SHA'              => 'TLS_ECDH_anon_WITH_NULL_SHA',
    'AECDH-RC4-SHA'               => 'TLS_ECDH_anon_WITH_RC4_128_SHA',
    'AECDH-DES-CBC3-SHA'          => 'TLS_ECDH_anon_WITH_3DES_EDE_CBC_SHA',
    'AECDH-AES128-SHA'            => 'TLS_ECDH_anon_WITH_AES_128_CBC_SHA',
    'AECDH-AES256-SHA'            => 'TLS_ECDH_anon_WITH_AES_256_CBC_SHA',
    'NULL-SHA256'                 => 'TLS_RSA_WITH_NULL_SHA256',
    'AES128-SHA256'               => 'TLS_RSA_WITH_AES_128_CBC_SHA256',
    'AES256-SHA256'               => 'TLS_RSA_WITH_AES_256_CBC_SHA256',
    'AES128-GCM-SHA256'           => 'TLS_RSA_WITH_AES_128_GCM_SHA256',
    'AES256-GCM-SHA384'           => 'TLS_RSA_WITH_AES_256_GCM_SHA384',
    'DH-RSA-AES128-SHA256'        => 'TLS_DH_RSA_WITH_AES_128_CBC_SHA256',
    'DH-RSA-AES256-SHA256'        => 'TLS_DH_RSA_WITH_AES_256_CBC_SHA256',
    'DH-RSA-AES128-GCM-SHA256'    => 'TLS_DH_RSA_WITH_AES_128_GCM_SHA256',
    'DH-RSA-AES256-GCM-SHA384'    => 'TLS_DH_RSA_WITH_AES_256_GCM_SHA384',
    'DH-DSS-AES128-SHA256'        => 'TLS_DH_DSS_WITH_AES_128_CBC_SHA256',
    'DH-DSS-AES256-SHA256'        => 'TLS_DH_DSS_WITH_AES_256_CBC_SHA256',
    'DH-DSS-AES128-GCM-SHA256'    => 'TLS_DH_DSS_WITH_AES_128_GCM_SHA256',
    'DH-DSS-AES256-GCM-SHA384'    => 'TLS_DH_DSS_WITH_AES_256_GCM_SHA384',
    'DHE-RSA-AES128-SHA256'       => 'TLS_DHE_RSA_WITH_AES_128_CBC_SHA256',
    'DHE-RSA-AES256-SHA256'       => 'TLS_DHE_RSA_WITH_AES_256_CBC_SHA256',
    'DHE-RSA-AES128-GCM-SHA256'   => 'TLS_DHE_RSA_WITH_AES_128_GCM_SHA256',
    'DHE-RSA-AES256-GCM-SHA384'   => 'TLS_DHE_RSA_WITH_AES_256_GCM_SHA384',
    'DHE-DSS-AES128-SHA256'       => 'TLS_DHE_DSS_WITH_AES_128_CBC_SHA256',
    'DHE-DSS-AES256-SHA256'       => 'TLS_DHE_DSS_WITH_AES_256_CBC_SHA256',
    'DHE-DSS-AES128-GCM-SHA256'   => 'TLS_DHE_DSS_WITH_AES_128_GCM_SHA256',
    'DHE-DSS-AES256-GCM-SHA384'   => 'TLS_DHE_DSS_WITH_AES_256_GCM_SHA384',
    'ECDHE-RSA-AES128-SHA256'     => 'TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256',
    'ECDHE-RSA-AES256-SHA384'     => 'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256' => 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384' => 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
    'ECDHE-ECDSA-AES128-SHA256'   => 'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256',
    'ECDHE-ECDSA-AES256-SHA384'   => 'TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA384',
    'ECDHE-ECDSA-AES128-GCM-SHA256' =>
      'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384' =>
      'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
    'ADH-AES128-SHA256'              => 'TLS_DH_anon_WITH_AES_128_CBC_SHA256',
    'ADH-AES256-SHA256'              => 'TLS_DH_anon_WITH_AES_256_CBC_SHA256',
    'ADH-AES128-GCM-SHA256'          => 'TLS_DH_anon_WITH_AES_128_GCM_SHA256',
    'ADH-AES256-GCM-SHA384'          => 'TLS_DH_anon_WITH_AES_256_GCM_SHA384',
    'AES128-CCM'                     => 'RSA_WITH_AES_128_CCM',
    'AES256-CCM'                     => 'RSA_WITH_AES_256_CCM',
    'DHE-RSA-AES128-CCM'             => 'DHE_RSA_WITH_AES_128_CCM',
    'DHE-RSA-AES256-CCM'             => 'DHE_RSA_WITH_AES_256_CCM',
    'AES128-CCM8'                    => 'RSA_WITH_AES_128_CCM_8',
    'AES256-CCM8'                    => 'RSA_WITH_AES_256_CCM_8',
    'DHE-RSA-AES128-CCM8'            => 'DHE_RSA_WITH_AES_128_CCM_8',
    'DHE-RSA-AES256-CCM8'            => 'DHE_RSA_WITH_AES_256_CCM_8',
    'ECDHE-ECDSA-AES128-CCM'         => 'ECDHE_ECDSA_WITH_AES_128_CCM',
    'ECDHE-ECDSA-AES256-CCM'         => 'ECDHE_ECDSA_WITH_AES_256_CCM',
    'ECDHE-ECDSA-AES128-CCM8'        => 'ECDHE_ECDSA_WITH_AES_128_CCM_8',
    'ECDHE-ECDSA-AES256-CCM8'        => 'ECDHE_ECDSA_WITH_AES_256_CCM_8',
    'ARIA128-GCM-SHA256'             => 'TLS_RSA_WITH_ARIA_128_GCM_SHA256',
    'ARIA256-GCM-SHA384'             => 'TLS_RSA_WITH_ARIA_256_GCM_SHA384',
    'DHE-RSA-ARIA128-GCM-SHA256'     => 'TLS_DHE_RSA_WITH_ARIA_128_GCM_SHA256',
    'DHE-RSA-ARIA256-GCM-SHA384'     => 'TLS_DHE_RSA_WITH_ARIA_256_GCM_SHA384',
    'DHE-DSS-ARIA128-GCM-SHA256'     => 'TLS_DHE_DSS_WITH_ARIA_128_GCM_SHA256',
    'DHE-DSS-ARIA256-GCM-SHA384'     => 'TLS_DHE_DSS_WITH_ARIA_256_GCM_SHA384',
    'ECDHE-ECDSA-ARIA128-GCM-SHA256' =>
      'TLS_ECDHE_ECDSA_WITH_ARIA_128_GCM_SHA256',
    'ECDHE-ECDSA-ARIA256-GCM-SHA384' =>
      'TLS_ECDHE_ECDSA_WITH_ARIA_256_GCM_SHA384',
    'ECDHE-ARIA128-GCM-SHA256'   => 'TLS_ECDHE_RSA_WITH_ARIA_128_GCM_SHA256',
    'ECDHE-ARIA256-GCM-SHA384'   => 'TLS_ECDHE_RSA_WITH_ARIA_256_GCM_SHA384',
    'PSK-ARIA128-GCM-SHA256'     => 'TLS_PSK_WITH_ARIA_128_GCM_SHA256',
    'PSK-ARIA256-GCM-SHA384'     => 'TLS_PSK_WITH_ARIA_256_GCM_SHA384',
    'DHE-PSK-ARIA128-GCM-SHA256' => 'TLS_DHE_PSK_WITH_ARIA_128_GCM_SHA256',
    'DHE-PSK-ARIA256-GCM-SHA384' => 'TLS_DHE_PSK_WITH_ARIA_256_GCM_SHA384',
    'RSA-PSK-ARIA128-GCM-SHA256' => 'TLS_RSA_PSK_WITH_ARIA_128_GCM_SHA256',
    'RSA-PSK-ARIA256-GCM-SHA384' => 'TLS_RSA_PSK_WITH_ARIA_256_GCM_SHA384',
    'ECDHE-ECDSA-CAMELLIA128-SHA256' =>
      'TLS_ECDHE_ECDSA_WITH_CAMELLIA_128_CBC_SHA256',
    'ECDHE-ECDSA-CAMELLIA256-SHA384' =>
      'TLS_ECDHE_ECDSA_WITH_CAMELLIA_256_CBC_SHA384',
    'ECDHE-RSA-CAMELLIA128-SHA256' =>
      'TLS_ECDHE_RSA_WITH_CAMELLIA_128_CBC_SHA256',
    'ECDHE-RSA-CAMELLIA256-SHA384' =>
      'TLS_ECDHE_RSA_WITH_CAMELLIA_256_CBC_SHA384',
    'PSK-NULL-SHA'                 => 'PSK_WITH_NULL_SHA',
    'DHE-PSK-NULL-SHA'             => 'DHE_PSK_WITH_NULL_SHA',
    'RSA-PSK-NULL-SHA'             => 'RSA_PSK_WITH_NULL_SHA',
    'PSK-RC4-SHA'                  => 'PSK_WITH_RC4_128_SHA',
    'PSK-3DES-EDE-CBC-SHA'         => 'PSK_WITH_3DES_EDE_CBC_SHA',
    'PSK-AES128-CBC-SHA'           => 'PSK_WITH_AES_128_CBC_SHA',
    'PSK-AES256-CBC-SHA'           => 'PSK_WITH_AES_256_CBC_SHA',
    'DHE-PSK-RC4-SHA'              => 'DHE_PSK_WITH_RC4_128_SHA',
    'DHE-PSK-3DES-EDE-CBC-SHA'     => 'DHE_PSK_WITH_3DES_EDE_CBC_SHA',
    'DHE-PSK-AES128-CBC-SHA'       => 'DHE_PSK_WITH_AES_128_CBC_SHA',
    'DHE-PSK-AES256-CBC-SHA'       => 'DHE_PSK_WITH_AES_256_CBC_SHA',
    'RSA-PSK-RC4-SHA'              => 'RSA_PSK_WITH_RC4_128_SHA',
    'RSA-PSK-3DES-EDE-CBC-SHA'     => 'RSA_PSK_WITH_3DES_EDE_CBC_SHA',
    'RSA-PSK-AES128-CBC-SHA'       => 'RSA_PSK_WITH_AES_128_CBC_SHA',
    'RSA-PSK-AES256-CBC-SHA'       => 'RSA_PSK_WITH_AES_256_CBC_SHA',
    'PSK-AES128-GCM-SHA256'        => 'PSK_WITH_AES_128_GCM_SHA256',
    'PSK-AES256-GCM-SHA384'        => 'PSK_WITH_AES_256_GCM_SHA384',
    'DHE-PSK-AES128-GCM-SHA256'    => 'DHE_PSK_WITH_AES_128_GCM_SHA256',
    'DHE-PSK-AES256-GCM-SHA384'    => 'DHE_PSK_WITH_AES_256_GCM_SHA384',
    'RSA-PSK-AES128-GCM-SHA256'    => 'RSA_PSK_WITH_AES_128_GCM_SHA256',
    'RSA-PSK-AES256-GCM-SHA384'    => 'RSA_PSK_WITH_AES_256_GCM_SHA384',
    'PSK-AES128-CBC-SHA256'        => 'PSK_WITH_AES_128_CBC_SHA256',
    'PSK-AES256-CBC-SHA384'        => 'PSK_WITH_AES_256_CBC_SHA384',
    'PSK-NULL-SHA256'              => 'PSK_WITH_NULL_SHA256',
    'PSK-NULL-SHA384'              => 'PSK_WITH_NULL_SHA384',
    'DHE-PSK-AES128-CBC-SHA256'    => 'DHE_PSK_WITH_AES_128_CBC_SHA256',
    'DHE-PSK-AES256-CBC-SHA384'    => 'DHE_PSK_WITH_AES_256_CBC_SHA384',
    'DHE-PSK-NULL-SHA256'          => 'DHE_PSK_WITH_NULL_SHA256',
    'DHE-PSK-NULL-SHA384'          => 'DHE_PSK_WITH_NULL_SHA384',
    'RSA-PSK-AES128-CBC-SHA256'    => 'RSA_PSK_WITH_AES_128_CBC_SHA256',
    'RSA-PSK-AES256-CBC-SHA384'    => 'RSA_PSK_WITH_AES_256_CBC_SHA384',
    'RSA-PSK-NULL-SHA256'          => 'RSA_PSK_WITH_NULL_SHA256',
    'RSA-PSK-NULL-SHA384'          => 'RSA_PSK_WITH_NULL_SHA384',
    'PSK-AES128-GCM-SHA256'        => 'PSK_WITH_AES_128_GCM_SHA256',
    'PSK-AES256-GCM-SHA384'        => 'PSK_WITH_AES_256_GCM_SHA384',
    'ECDHE-PSK-RC4-SHA'            => 'ECDHE_PSK_WITH_RC4_128_SHA',
    'ECDHE-PSK-3DES-EDE-CBC-SHA'   => 'ECDHE_PSK_WITH_3DES_EDE_CBC_SHA',
    'ECDHE-PSK-AES128-CBC-SHA'     => 'ECDHE_PSK_WITH_AES_128_CBC_SHA',
    'ECDHE-PSK-AES256-CBC-SHA'     => 'ECDHE_PSK_WITH_AES_256_CBC_SHA',
    'ECDHE-PSK-AES128-CBC-SHA256'  => 'ECDHE_PSK_WITH_AES_128_CBC_SHA256',
    'ECDHE-PSK-AES256-CBC-SHA384'  => 'ECDHE_PSK_WITH_AES_256_CBC_SHA384',
    'ECDHE-PSK-NULL-SHA'           => 'ECDHE_PSK_WITH_NULL_SHA',
    'ECDHE-PSK-NULL-SHA256'        => 'ECDHE_PSK_WITH_NULL_SHA256',
    'ECDHE-PSK-NULL-SHA384'        => 'ECDHE_PSK_WITH_NULL_SHA384',
    'PSK-CAMELLIA128-SHA256'       => 'PSK_WITH_CAMELLIA_128_CBC_SHA256',
    'PSK-CAMELLIA256-SHA384'       => 'PSK_WITH_CAMELLIA_256_CBC_SHA384',
    'DHE-PSK-CAMELLIA128-SHA256'   => 'DHE_PSK_WITH_CAMELLIA_128_CBC_SHA256',
    'DHE-PSK-CAMELLIA256-SHA384'   => 'DHE_PSK_WITH_CAMELLIA_256_CBC_SHA384',
    'RSA-PSK-CAMELLIA128-SHA256'   => 'RSA_PSK_WITH_CAMELLIA_128_CBC_SHA256',
    'RSA-PSK-CAMELLIA256-SHA384'   => 'RSA_PSK_WITH_CAMELLIA_256_CBC_SHA384',
    'ECDHE-PSK-CAMELLIA128-SHA256' => 'ECDHE_PSK_WITH_CAMELLIA_128_CBC_SHA256',
    'ECDHE-PSK-CAMELLIA256-SHA384' => 'ECDHE_PSK_WITH_CAMELLIA_256_CBC_SHA384',
    'PSK-AES128-CCM'               => 'PSK_WITH_AES_128_CCM',
    'PSK-AES256-CCM'               => 'PSK_WITH_AES_256_CCM',
    'DHE-PSK-AES128-CCM'           => 'DHE_PSK_WITH_AES_128_CCM',
    'DHE-PSK-AES256-CCM'           => 'DHE_PSK_WITH_AES_256_CCM',
    'PSK-AES128-CCM8'              => 'PSK_WITH_AES_128_CCM_8',
    'PSK-AES256-CCM8'              => 'PSK_WITH_AES_256_CCM_8',
    'DHE-PSK-AES128-CCM8'          => 'DHE_PSK_WITH_AES_128_CCM_8',
    'DHE-PSK-AES256-CCM8'          => 'DHE_PSK_WITH_AES_256_CCM_8',
    'ECDHE-RSA-CHACHA20-POLY1305'  =>
      'TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
    'ECDHE-ECDSA-CHACHA20-POLY1305' =>
      'TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256',
    'DHE-RSA-CHACHA20-POLY1305' => 'TLS_DHE_RSA_WITH_CHACHA20_POLY1305_SHA256',
    'PSK-CHACHA20-POLY1305'     => 'TLS_PSK_WITH_CHACHA20_POLY1305_SHA256',
    'ECDHE-PSK-CHACHA20-POLY1305' =>
      'TLS_ECDHE_PSK_WITH_CHACHA20_POLY1305_SHA256',
    'DHE-PSK-CHACHA20-POLY1305' => 'TLS_DHE_PSK_WITH_CHACHA20_POLY1305_SHA256',
    'RSA-PSK-CHACHA20-POLY1305' => 'TLS_RSA_PSK_WITH_CHACHA20_POLY1305_SHA256',
);

sub ossl_to_o {
    my $h = shift;
    return checkbox(
        label => $spec_name{$h},
        name  => $h,
        value => 1,
    );
}

my $tls1_aes = [
    ossl_to_o('DHE-RSA-AES256-SHA'), ossl_to_o('DHE-RSA-AES128-SHA'),
    ossl_to_o('AES256-SHA'),         ossl_to_o('AES128-SHA'),
];

my $tls1_ec = [
    ossl_to_o('ECDHE-ECDSA-AES256-SHA'), ossl_to_o('ECDHE-RSA-AES256-SHA'),
    ossl_to_o('ECDHE-ECDSA-AES128-SHA'), ossl_to_o('ECDHE-RSA-AES128-SHA'),
];

my $tls1_ciphers = [
    {
        type  => 'group',
        name  => 'tls1-aes-ciphers',
        label => 'TLSv1.0/1.1 AES cipher suites (RFC3268)',
        value => $tls1_aes,
    },
    {
        type  => 'group',
        name  => 'tls1-ec-ciphers',
        label => 'TLSv1.0/1.1 Elliptic curve cipher suites',
        value => $tls1_ec,
    }
];

my $tls2_specific = [
    ossl_to_o('ECDHE-ECDSA-AES256-GCM-SHA384'),
    ossl_to_o('ECDHE-RSA-AES256-GCM-SHA384'),
    ossl_to_o('DHE-RSA-AES256-GCM-SHA384'),
    ossl_to_o('ECDHE-ECDSA-CHACHA20-POLY1305'),
    ossl_to_o('ECDHE-RSA-CHACHA20-POLY1305'),
    ossl_to_o('DHE-RSA-CHACHA20-POLY1305'),
    ossl_to_o('ECDHE-ECDSA-AES128-GCM-SHA256'),
    ossl_to_o('ECDHE-RSA-AES128-GCM-SHA256'),
    ossl_to_o('DHE-RSA-AES128-GCM-SHA256'),
    ossl_to_o('ECDHE-ECDSA-AES256-SHA384'),
    ossl_to_o('ECDHE-RSA-AES256-SHA384'),
    ossl_to_o('DHE-RSA-AES256-SHA256'),
    ossl_to_o('ECDHE-ECDSA-AES128-SHA256'),
    ossl_to_o('ECDHE-RSA-AES128-SHA256'),
    ossl_to_o('DHE-RSA-AES128-SHA256'),
    ossl_to_o('AES256-GCM-SHA384'),
    ossl_to_o('AES128-GCM-SHA256'),
    ossl_to_o('AES256-SHA256'),
    ossl_to_o('AES128-SHA256'),
];

my @tls12_ciphers = @{$tls1_ciphers};
push @tls12_ciphers,
  {
    type  => 'group',
    name  => 'tls12-ciphers',
    label => 'TLSv1.2 specific',
    value => $tls2_specific,
  };

$ciphers = {
    TLSv1   => $tls1_ciphers,
    TLSv1_1 => $tls1_ciphers,
    TLSv1_2 => \@tls12_ciphers,
};
################################################################################
# TLS End
################################################################################

################################################################################
# PEAP Start
################################################################################
$peap_parameters = [
    columns(
        [
            div(
                value => 'Inner method: MSCHAPv2',
                class => 'qtr-margin-bottom'
            ),
            checkbox(
                name  => 'pap-count-as-creds',
                label => 'Amount of sessions equals to amount of credentials',
            ),
            credentials_field(),
            variants(
                name  => 'outer-identity',
                title => 'Outer identity',
                value => [
                    {
                        short  => 'Same as username',
                        name   => 'same',
                        desc   => 'Use username as outer identity',
                        fields => []
                    },
                    {
                        short  => 'Specified',
                        name   => 'specified',
                        desc   => 'Use specified outer identity',
                        fields => [
                            span('Specified identity will be used for PEAP'),
                            text(
                                name  => 'identity',
                                label => 'Identity',
                                value => 'Anonymous',
                            ),
                        ]
                    },
                ]
            ),
            variants(
                name  => 'change-password',
                title => 'If server requested password change',
                value => [
                    {
                        short  => 'Send EAP fail',
                        name   => 'drop',
                        desc   => 'Send EAP failure',
                        fields =>
                          [ span('Send EAP failure and drop connection'), ]
                    },
                    {
                        short  => 'Change password',
                        name   => 'change',
                        desc   => 'Change password',
                        fields => [
                            span(
                                'Will try to change password to specified one'),
                            text(
                                name  => 'new-password',
                                label => 'Password',
                                value => q{},
                            ),
                        ]
                    },
                ]
            ),
            hidden( 'inner-method', value => 'mschapv2' ),
        ],
        \@tls_options
    )
];

$peap_radius = [
    rad_attribute( 'Service-Type', 'Framed-User' ),
    rad_attribute( 'User-Name',    '$USERNAME$' ),
    rad_attribute( 'EAP-Message',  'EAP and TLS data' ),
];
################################################################################
# PEAP End
################################################################################

################################################################################
# EAP MSCHAPv2 Start
################################################################################
$eap_mschapv2_parameters = [
    checkbox(
        name  => 'pap-count-as-creds',
        label => 'Amount of sessions equals to amount of credentials',
    ),
    credentials_field(
        title => 'Credentials',
        name  => 'credentials',
    ),
];

$eap_mschapv2_radius = [
    rad_attribute( 'Service-Type', 'Framed-User' ),
    rad_attribute( 'User-Name',    '$USERNAME$' ),
    rad_attribute( 'EAP-Message',  'EAP and TLS data' ),
];
################################################################################
#EAP MSCHAPv2 End
################################################################################

sub action_after_coa {
    my $s = shift || 'reauth';
    return [
        {
            label    => 'Re-authenticate using same method',
            value    => 'reauth',
            selected => $s eq 'reauth',
        },
        {
            label    => 'Re-authenticate using MAB',
            value    => 'reauth-mab',
            selected => $s eq 'reauth-mab',
        },
        {
            label    => 'Do nothing',
            value    => 'nothing',
            selected => $s eq 'nothing',
        }
    ];
}

sub ec_val {
    my ( $val, $label, $selected ) = @_;
    return {
        value          => $val,
        label          => $label,
        maybe selected => $selected,
    };
}

sub coa_var {
    my %o = @_;
    return [
        {
            short  => 'Send CoA-ACK',
            name   => 'ack',
            desc   => 'Send CoA-ACK',
            fields => [
                select_field(
                    name   => 'action-after',
                    inline => 1,
                    label  => 'Action after CoA-ACK',
                    value  => action_after_coa( $o{after_ack} // undef ),
                ),
                checkbox(
                    name  => 'new-session-id',
                    label => 'Generate new session ID for re-authentication',
                    value => $o{new_after_ack} // 1,
                ),
                checkbox(
                    name  => 'drop-old',
                    label => 'Drop previous session',
                    value => $o{drop_old_ack} // 1,
                )
            ]
        },
        {
            short  => 'Send CoA-NAK',
            name   => 'nak',
            desc   => 'Send CoA-NAK',
            fields => [
                select_field(
                    name   => 'error-cause',
                    inline => 1,
                    label  => 'Error-Cause',
                    value  => [
                        ec_val(
                            '201', '201 - Residual Session Context Removed'
                        ),
                        ec_val( '202', '202 - Invalid EAP Packet (Ignored)' ),
                        ec_val( '401', '401 - Unsupported Attribute' ),
                        ec_val( '402', '402 - Missing Attribute' ),
                        ec_val( '403', '403 - NAS Identification Mismatch' ),
                        ec_val( '404', '404 - Invalid Request' ),
                        ec_val( '405', '405 - Unsupported Service' ),
                        ec_val( '406', '406 - Unsupported Extension' ),
                        ec_val( '407', '407 - Invalid Attribute Value' ),
                        ec_val( '501', '501 - Administratively Prohibited' ),
                        ec_val( '502', '502 - Request Not Routable (Proxy)' ),
                        ec_val( '503', '503 - Session Context Not Found', 1 ),
                        ec_val( '504', '504 - Session Context Not Removable' ),
                        ec_val( '505', '505 - Other Proxy Processing Error' ),
                        ec_val( '506', '506 - Resources Unavailable' ),
                        ec_val( '507', '507 - Request Initiated' ),
                        ec_val(
                            '508',
                            '508 - Multiple Session Selection Unsupported'
                        ),
                        ec_val( '000', 'No Error-Cause' ),
                    ]
                ),
                select_field(
                    name   => 'action-after',
                    inline => 1,
                    label  => 'Action after CoA-NAK',
                    value  => action_after_coa( $o{after_nak} // 'nothing' ),
                ),
                checkbox(
                    name  => 'new-session-id',
                    label => 'Generate new session ID for re-authentication',
                    value => $o{new_after_nak} // 1,
                ),
                checkbox(
                    name  => 'drop-old',
                    label => 'Drop previous session',
                    value => $o{drop_old_nak} // 1,
                ),
            ]
        },
        {
            short  => 'Do nothing',
            name   => 'nothing',
            desc   => 'Do nothing',
            fields => []
        }
    ];
}

my $coa_wrapp = {
    parameters => [
        columns(
            [
                variants(
                    title => 'If <span class="text-info text-bold">'
                      . 'bounce-host-port'
                      . '</span> received',
                    name  => 'bounce',
                    value => coa_var(),
                ),
                divider(),
                variants(
                    title => 'If <span class="text-info text-bold">'
                      . 'disable-host-port'
                      . '</span> received',
                    name  => 'disable',
                    value => coa_var(),
                ),
                divider(),
                variants(
                    title => 'Default CoA action',
                    name  => 'default',
                    value => coa_var(),
                ),
            ],
            [
                variants(
                    title => 'If <span class="text-info text-bold">'
                      . 'reauthenticate'
                      . '</span> '
                      . 'of type <span class="text-info text-bold">'
                      . 'rerun'
                      . '</span> received',
                    name  => 'reauthenticate-rerun',
                    value => coa_var(
                        after_ack     => 'reauth-mab',
                        new_after_ack => 0,
                        drop_old_ack  => 0,
                    ),
                ),
                divider(),
                variants(
                    title => 'If <span class="text-info text-bold">'
                      . 'reauthenticate'
                      . '</span> of type <span class="text-info text-bold">'
                      . 'last'
                      . '</span> received',
                    name  => 'reauthenticate-last',
                    value => coa_var( new_after_ack => 0, drop_old_ack => 0, ),
                ),
                divider(),
                variants(
                    title => 'If <span class="text-info text-bold">'
                      . 'reauthenticate'
                      . '</span> w/out type received',
                    name  => 'reauthenticate-default',
                    value => coa_var(
                        after_ack     => 'reauth-mab',
                        new_after_ack => 0,
                        drop_old_ack  => 0,
                    ),
                ),
            ]
        )
    ],
};

my $divider = div(
    class => 'divider',
    value => q{},
);

sub user_agents {
    return dictionary_field(
        name                => 'user-agents',
        label               => 'User Agents',
        type                => [ 'ua', 'unclassified' ],
        value               => 'all-by-type:ua',
        update_same_of_type => 1,
    );
}

sub guest_rnd {
    my %o = @_;
    return {
        short  => 'Random string',
        name   => 'random',
        desc   => 'Fully random string',
        fields => [
            columns(
                [
                    number(
                        name  => 'min-length',
                        label => 'Min length',
                        value => $o{min} // 5
                    ),
                ],
                [
                    number(
                        name  => 'max-length',
                        label => 'Max length',
                        value => $o{max} // 10
                    ),
                ]
            )
        ]
    };
}

sub guest_pattern {
    return {
        short  => 'Pattern-based',
        name   => 'random-pattern',
        desc   => 'String based on a pattern',
        fields => [
            text(
                name  => 'pattern',
                label => 'Pattern',
                value => shift // '\w{5,10}',
            ),
        ],
    };
}

sub guest_email_pattern {
    return guest_pattern('\w{5,10}@example[.]com');
}

sub guest_dictionary {
    return {
        short  => 'From dictionary',
        name   => 'dictionary',
        desc   => 'Value taken from a dictionary',
        fields => [
            dictionary_field(
                type  => [ 'form', 'unclassified' ],
                value => shift // undef,
            ),
        ],
    };
}

sub guest_empty {
    return {
        short  => 'Do not fill',
        name   => 'keep-empty',
        desc   => 'Do not fill the field',
        fields => [],
    };
}

Readonly my @FUNCTIONS => (
    [ 'rand()',    'Random number' ],
    [ 'randstr()', 'Random string' ],
    [ 'hex()',     'Convert to HEX' ],
    [ 'oct()',     'Conver to OCT' ],
    [ 'uc()',      'To UPPER case' ],
    [ 'lc()',      'To lower case' ],
);

Readonly my @VARIABLES => (
    [ q{$} . 'first_name$',    'First Name' ],
    [ q{$} . 'last_name$',     'Last Name' ],
    [ q{$} . 'email_address$', 'Email Address' ],
    [ q{$} . 'phone_number$',  'Phone Number' ],
);

sub insert_dd {
    return map {
        { value => $_->[0], title => $_->[1], insert => 1, type => 'value', }
    } @_;
}

sub guest_fun_based {
    my %o = @_;
    return {
        short  => 'Functions-based',
        name   => $o{name} // 'others',
        desc   => 'String based on a pattern',
        fields => [
            text(
                name    => 'pattern',
                label   => 'Pattern',
                value   => $o{pattern} // q{},
                buttons => [
                    dd_btn(
                        title  => 'Insert',
                        values => [
                            {
                                type   => 'group',
                                title  => 'Functions',
                                values => [ insert_dd(@FUNCTIONS) ]
                            },
                            {
                                type   => 'group',
                                title  => 'Variables',
                                values => [ insert_dd(@VARIABLES) ],
                            },
                        ]
                    ),
                ],
            ),
        ],
    };
}

Readonly my %FAKERS => (
    first_name => sub { return fake_first_name()->(); },
    last_name  => sub { return fake_surname()->(); },
    email      => sub { return fake_email()->(); },
    company    => sub { return fake_company()->(); },
    sentence   => sub { return fake_sentences(1)->(); },
    phone      => sub {
        my $format = fake_pick(
            '###-###-####',  '(###)###-####',
            '# ### #######', '############',
            '#-###-###-####'
        );
        return fake_digits( $format->() )->();
    },
);

sub guest_faker {
    my %o = @_;
    return {
        short  => 'Fake data',
        name   => $o{name} // 'faker',
        desc   => 'Fake data',
        fields => [
            hidden( 'what', value => $o{what} ),
            div(
                class => 'text-italic text-muted',
                value => 'Example: ' . $FAKERS{ $o{what} }->(),
            ),
        ],
    };
}

sub guest_flow_ss_rules {
    my %o = @_;
    $o{email} //= 0;

    return [
        guest_rnd(),
        $o{email}
        ? guest_email_pattern()
        : guest_pattern( $o{pattern} // undef ),
        guest_dictionary( $o{dictionary} // undef ),
        $o{username} ? guest_fun_based(
            pattern => 'lc($first_name$).lc($last_name$)',
            name    => 'others'
        ) : (),
        $o{faker} ? guest_faker( what => $o{faker} ) : (),
        guest_empty(),
    ];
}

sub guest_success_condition {
    my ( $t, %o ) = @_;

    my $c = '(?<id>ui_success_message)';
    $o{title} //=
        'If a response contains the following string,'
      . ' authentication considered as successful';
    $o{name}    //= 'success-condition';
    $o{postfix} //= q{};
    $o{prefix}  //= q{};

    if ( $t eq 'self-reg' ) {
        $c =
            '(?<id>ui_login_instruction_message'
          . '|ui_success_message'
          . '|ui_self_reg_results_instruction_message)';
    }

    $o{condition} //= qq{<[^>]+id="${c}"[^>]*>(?<message>[^<]+)};

    return text(
        name  => $o{prefix} . $o{name} . $o{postfix},
        label => $o{title},
        value => $o{condition},
    );
}

sub guest_token_form {
    return text(
        name  => 'tokenform-name',
        label => 'Token Form name',
        value => 'tokenForm',
    );
}

sub guest_self_reg_names {
    my @r;
    foreach my $n (
        qw/guestUser.accessCode
        guestUser.fieldValues.ui_user_name
        guestUser.fieldValues.ui_first_name
        guestUser.fieldValues.ui_last_name
        guestUser.fieldValues.ui_email_address
        guestUser.fieldValues.ui_phone_number
        guestUser.fieldValues.ui_company
        guestUser.fieldValues.ui_location
        guestUser.fieldValues.ui_sms_provider
        guestUser.fieldValues.ui_person_visited
        guestUser.fieldValues.ui_reason_visit/
      )
    {
        my $field_name = $n =~ s/guestUser[.](fieldValues[.]ui_)?//sxmir;
        my $name       = autoformat $field_name, { case => 'title' };
        $name =~ s/_/ /sxmg;

        push @r,
          text(
            name  => $field_name,
            label => $name . ' field name',
            value => $n,
            group => 'self_reg_fields',
          );
    }

    return @r;
}

sub guest_login_names {
    my @r;
    foreach my $n (qw/user.username user.password user.accessCode/) {
        my $field_name = $n               =~ s/user[.]//sxmir;
        my $name = autoformat $field_name =~ s/_/ /sxmigr, { case => 'title' };
        push @r,
          text(
            name  => $field_name,
            label => $name . ' field name',
            value => $n,
            group => 'login_fields',
          );
    }
    return @r;
}

sub guest_hotspot_names {
    return text(
        name  => 'accessCode',
        label => 'Access Code field name',
        value => 'accessCode',
        group => 'hotspot_fields',
    );
}

my $guest_flows_var = [
    {
        short           => 'None',
        name            => 'none',
        desc            => 'Do not perform guest login',
        fields          => [],
        dependants      => ['user-agents'],
        show_if_checked => 0,
    },
    {
        short  => 'Hotspot',
        name   => 'hotspot',
        desc   => 'Hotspot login',
        fields => [
            span('Hotspot page is expected'),
            text(
                name  => 'access-code',
                label => 'Access code (leave empty if not needed)',
                value => q{},
            ),
            drawer(
                title  => 'Fine-tune',
                fields => [
                    columns(
                        [
                            grouper( title => 'Conditions', accent => 1 ),
                            guest_success_condition('hotspot'),
                            grouper( title => 'Forms', accent => 1 ),
                            text(
                                name  => 'form-name',
                                label => 'Form name',
                                value => 'aupForm',
                            ),
                            guest_token_form(),
                        ],
                        [
                            grouper(
                                title  => 'Hotspot fields',
                                accent => 1
                            ),
                            guest_hotspot_names(),
                        ]
                    ),
                ],
            ),
            alert(
                    'Do not forget to switch from Guest Flow '
                  . 'check to GuestEndpoints check. '
                  . 'Otherwise you can end up in infinite loop.'
            ),
        ]
    },
    {
        short  => 'Provided credentials',
        name   => 'guest',
        desc   => 'Login on a guest portal with provided credentials',
        fields => [
            span('Login with provided credentials'),
            variants(
                title => 'Credentials',
                name  => 'credentials',
                value => [
                    {
                        short  => 'From list',
                        name   => 'list',
                        desc   => 'Credentials from the list',
                        fields => [
                            textarea_field(
                                name  => 'credentials-list',
                                title => 'Credentials',
                                hint  => 'Format user:password<br>'
                                  . 'One record per line<br>'
                                  . 'Count: $counter$',
                                file    => 1,
                                buttons => []
                            ),
                        ]
                    },
                    {
                        short  => 'From dictionary',
                        name   => 'dictionary',
                        desc   => 'Value taken from a dictionary',
                        fields =>
                          [ dictionary_field( type => ['credentials'], ), ],
                    },
                ],
            ),
            text(
                name  => 'access-code',
                label => 'Access code (leave empty if not needed)',
                value => q{},
            ),
            drawer(
                title  => 'Fine-tune',
                fields => [
                    columns(
                        [
                            grouper( title => 'Conditions', accent => 1 ),
                            guest_success_condition('login'),
                            grouper( title => 'Forms', accent => 1 ),
                            text(
                                name  => 'login-form-name',
                                label => 'Login form name',
                                value => 'loginForm',
                            ),
                            text(
                                name  => 'aup-form-name',
                                label => 'AUP form name',
                                value => 'aupForm',
                            ),
                            guest_token_form(),
                        ],
                        [
                            grouper( title => 'Login fields', accent => 1 ),
                            guest_login_names(),
                        ]
                    ),
                ]
            ),
        ]
    },
    {
        short  => 'Self-registration',
        name   => 'selfreg',
        desc   => 'Perform self-registration',
        fields => [
            span(
                    'Perform self-registration and login '
                  . 'with received credentials'
            ),
            ivariants(
                title    => '<span class="text-info text-bold">Username</span>',
                name     => 'user_name_rule',
                value    => guest_flow_ss_rules( username => 1 ),
                selected => 'others',
            ),
            ivariants(
                title => '<span class="text-info text-bold">First name</span>',
                name  => 'first_name_rule',
                value => guest_flow_ss_rules(
                    dictionary => 'by-name:First Names',
                    faker      => 'first_name'
                ),
                selected => 'faker',
            ),
            ivariants(
                title => '<span class="text-info text-bold">Last name</span>',
                name  => 'last_name_rule',
                value => guest_flow_ss_rules(
                    dictionary => 'by-name:Last Names',
                    faker      => 'last_name'
                ),
                selected => 'faker',
            ),
            ivariants(
                title    => '<span class="text-info text-bold">Email</span>',
                name     => 'email_address_rule',
                value    => guest_flow_ss_rules( email => 1, faker => 'email' ),
                selected => 'faker',
            ),
            ivariants(
                title => '<span class="text-info text-bold">Company</span>',
                name  => 'company_rule',
                value => guest_flow_ss_rules(
                    dictionary => 'by-name:Companies',
                    faker      => 'company'
                ),
                selected => 'faker',
            ),
            ivariants(
                title => '<span class="text-info text-bold">Location</span>',
                name  => 'location_rule',
                value => [
                    {
                        short  => 'Specify',
                        name   => 'static',
                        desc   => 'Specified name',
                        fields => [
                            text(
                                name        => 'value',
                                label       => 'Name',
                                value       => q{},
                                placeholder => 'First found will be used if '
                                  . 'nothing specified here',
                            ),
                        ],
                    }
                ],
            ),
            ivariants(
                title =>
                  '<span class="text-info text-bold">SMS Provider</span>',
                name  => 'sms_provider_rule',
                value => [
                    {
                        short  => 'Specify',
                        name   => 'static',
                        desc   => 'Specified name',
                        fields => [
                            text(
                                name        => 'value',
                                label       => 'Name',
                                value       => q{},
                                placeholder => 'First found will be used '
                                  . 'if nothing specified here',
                            ),
                        ],
                    }
                ],
            ),
            ivariants(
                title =>
                  '<span class="text-info text-bold">Person visited</span>',
                name     => 'person_visited_rule',
                value    => guest_flow_ss_rules( email => 1, faker => 'email' ),
                selected => 'faker',
            ),
            ivariants(
                title =>
                  '<span class="text-info text-bold">Visit reason</span>',
                name     => 'reason_visit_rule',
                value    => guest_flow_ss_rules( faker => 'sentence' ),
                selected => 'faker',
            ),
            text(
                name  => 'registration-code',
                label => 'Registration Code (leave empty if not needed)',
                value => q{},
            ),
            text(
                name  => 'access-code',
                label => 'Access code (leave empty if not needed)',
                value => q{},
            ),
            drawer(
                title  => 'Fine-tune',
                fields => [
                    columns(
                        [
                            number(
                                name  => 'reauth_after_timeout',
                                label => 'Perform full re-authentication '
                                  . 'if SMS is received after N minutes',
                                value => 5,
                                min   => 0,
                            ),
                            grouper( title => 'Conditions', accent => 1 ),
                            guest_success_condition(
                                'self-reg',
                                title => 'Success condition of registration'
                            ),
                            guest_success_condition(
                                'login',
                                title  => 'Success condition of login',
                                prefix => 'login-'
                            ),
                            grouper( title => 'Forms', accent => 1 ),
                            text(
                                name  => 'self-reg-form',
                                label => 'Self Registration form name',
                                value => 'selfRegForm',
                            ),
                            text(
                                name  => 'self-reg-success-form',
                                label => 'Self Registration success form name',
                                value => 'selfRegSuccessForm',
                            ),
                            text(
                                name  => 'login-form-name',
                                label => 'Login form name',
                                value => 'loginForm',
                            ),
                            text(
                                name  => 'aup-form-name',
                                label => 'AUP form name',
                                value => 'aupForm',
                            ),
                            guest_token_form(),
                        ],
                        [
                            grouper(
                                title  => 'Self Reg fields',
                                accent => 1
                            ),
                            guest_self_reg_names(),
                            grouper( title => 'Login fields', accent => 1 ),
                            guest_login_names(),
                        ]
                    ),
                ]
            ),
            alert(
                    'Do not forget to configure SMS Gateway on ISE. '
                  . 'Check the details at <a href="/guest/sms/">'
                  . 'SMS Configuration page' . '</a>'
            ),
        ]
    },
];

my $guest_flows_wrapp = {
    parameters => [
        variants(
            title => 'Expected guest flow',
            name  => 'GUEST_FLOW',
            value => $guest_flows_var,
        ),
        user_agents(),
    ],
};

$fieldsDefinitions = {
    'Calling-Station-Id' => $mac_wrapp,
    'mac'                => $mac_wrapp,
    'ip'                 => $ip_wrapp,
    'coa'                => $coa_wrapp,
    'guest'              => $guest_flows_wrapp,
};

################################## Definitions-end

Readonly my %PROTO_SPECIFIC => (
    'eap-tls' => {
        parameters => $eap_tls,
        radius     => $eap_tls_radius,
    },
    'pap' => {
        parameters => $pap_parameters,
        radius     => $pap_radius,
    },
    'eap-mschapv2' => {
        parameters => $eap_mschapv2_parameters,
        radius     => $eap_mschapv2_radius,
    },
    'peap' => {
        parameters => $peap_parameters,
        radius     => $peap_radius,
    },
);

sub proto_parameters {
    my $pd =
      exists $PROTO_SPECIFIC{ $_[0] }
      ? $PROTO_SPECIFIC{ $_[0] }
      : {
        parameters => undef,
        radius     => undef
      };

    return %{$pd};
}

1;
