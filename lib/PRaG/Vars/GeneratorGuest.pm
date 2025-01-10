package PRaG::Vars::GeneratorGuest;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

use PRaG::Vars::GeneratorConst;
use PRaG::Vars::GeneratorCredentials;
use PRaG::Vars::GeneratorString;

use Data::Dumper;
use Readonly;
use Ref::Util qw/is_ref/;
extends 'PRaG::Vars::VarGenerator';

has '_internal_vars' => ( is => 'rw', isa => 'HashRef' );

Readonly my %VARIANTS_DISPATCHER => (
    none    => '_vh_none',
    hotspot => '_vh_hotspot',
    guest   => '_vh_guest',
    selfreg => '_vh_selfreg',
);
Readonly my $SELF_REG_FLOW => 'SELFREG';
Readonly my $GUEST_FLOW    => 'GUEST';
Readonly my $HOTSPOT_FLOW  => 'HOTSPOT';

after '_fill' => sub {
    my $self = shift;

    if (
        exists $VARIANTS_DISPATCHER{ $self->parameters->{'variant'} }
        && (
            my $code = $self->can(
                $VARIANTS_DISPATCHER{ $self->parameters->{'variant'} }
            )
        )
      )
    {
        $self->_internal_vars( {} );
        if ( $self->$code() ) {
            $self->_get_user_agents;
            $self->_all_flows_params;
        }
    }
    else {
        $self->_set_error('Unsupported variant');
    }
};

###############################################################################

sub _all_flows_params {
    my $self = shift;

    $self->_internal_vars->{TOKEN_FORM_NAME} =
      $self->parameters->{'tokenform-name'} // 'tokenForm';
    $self->_internal_vars->{ACCESS_CODE} = $self->parameters->{'access-code'}
      // q{};
    $self->_internal_vars->{SUCCESS_CONDITION} =
      $self->parameters->{'success-condition'} || undef;

    delete $self->parameters->{'tokenform-name'};
    delete $self->parameters->{'access-code'};
    delete $self->parameters->{'success-condition'};

    return;
}

sub _vh_none {
    my $self = shift;
    $self->_set_sub_next('_next_none');
    return;
}

sub _vh_hotspot {
    my $self = shift;

    $self->_internal_vars->{FLOW_TYPE} = $HOTSPOT_FLOW;

    $self->_internal_vars->{FORM_NAME} = $self->parameters->{'form-name'}
      // 'aupForm';
    delete $self->parameters->{'form-name'};

    $self->_add_hotspot_fields('FIELDS');

    $self->_set_sub_next('_next_guest_snap');
    return 1;
}

sub _vh_guest {
    my $self = shift;

    $self->_internal_vars->{FLOW_TYPE} = $GUEST_FLOW;

    $self->_internal_vars->{LOGIN_FORM} =
      $self->parameters->{'login-form-name'} // 'loginForm';
    $self->_internal_vars->{AUP_FORM} = $self->parameters->{'aup-form-name'}
      // 'aupForm';

    delete $self->parameters->{'login-form-name'};
    delete $self->parameters->{'aup-form-name'};

    my $lines;
    if ( $self->parameters->{'credentials'}->{'variant'} eq 'dictionary' ) {
        $lines =
          $self->all_vars->parent->load_user_dictionaries(
            $self->parameters->{'credentials'}->{'dictionary'} );
    }
    else {
        $lines = $self->parameters->{'credentials'}->{'credentials-list'};
    }

    $self->_internal_vars->{CREDENTIALS} =
      PRaG::Vars::GeneratorCredentials->new(
        parameters => {
            'variant'       => 'list',
            'list'          => $lines,
            'how-to-follow' =>
              $self->parameters->{'credentials'}->{'how-to-follow'}
              // 'one-by-one',
            'disallow-repeats' =>
              $self->parameters->{'credentials'}->{'disallow-repeats'} // 0,
        },
        $self->_def_gen_params,
      );

    delete $self->parameters->{'credentials'};

    $self->_add_login_fields('FIELDS');

    $self->_set_sub_next('_next_guest_snap');
    return 1;
}

sub _vh_selfreg {
    my $self = shift;

    $self->_internal_vars->{FLOW_TYPE} = $SELF_REG_FLOW;

    $self->_internal_vars->{LOGIN_FORM} =
      $self->parameters->{'login-form-name'} // 'loginForm';
    $self->_internal_vars->{SELF_REG_FORM} =
      $self->parameters->{'self-reg-form'} // 'selfRegForm';
    $self->_internal_vars->{SELF_REG_SUCCESS_FORM} =
      $self->parameters->{'self-reg-success-form'} // 'selfRegSuccessForm';
    $self->_internal_vars->{AUP_FORM} = $self->parameters->{'aup-form-name'}
      // 'aupForm';
    $self->_internal_vars->{REGISTRATION_CODE} =
      $self->parameters->{'registration-code'} // q{};

    delete $self->parameters->{'self-reg-success-form'};
    delete $self->parameters->{'aup-form-name'};
    delete $self->parameters->{'login-form-name'};
    delete $self->parameters->{'self-reg-form'};

    $self->_internal_vars->{LOGIN_SUCCESS_CONDITION} =
      $self->parameters->{'login-success-condition'} || undef;
    delete $self->parameters->{'login-success-condition'};

    $self->_add_selfreg_fields('FIELDS');
    $self->_add_login_fields('LOGIN_FIELDS');

    $self->_internal_vars->{REAUTH_AFTER} =
      $self->parameters->{'reauth_after_timeout'};
    $self->_internal_vars->{STARTED_TIMESTAMP} = time;

    delete $self->parameters->{'reauth_after_timeout'};

    $self->_set_sub_next('_next_guest_snap');
    return 1;
}

sub _add_hotspot_fields {
    my ( $self, $varname ) = @_;

    $self->parameters->{hotspot_fields} //= {};
    $self->parameters->{hotspot_fields}->{accessCode} ||= 'accessCode';

    $self->_internal_vars->{$varname} = PRaG::Vars::GeneratorConst->new(
        parameters => {
            value => $self->parameters->{hotspot_fields},
        },
        $self->_def_gen_params,
    );

    delete $self->parameters->{hotspot_fields};
    return;
}

sub _add_login_fields {
    my ( $self, $varname ) = @_;

    $self->parameters->{login_fields} //= {};
    $self->parameters->{login_fields}->{username}   ||= 'user.username';
    $self->parameters->{login_fields}->{password}   ||= 'user.password';
    $self->parameters->{login_fields}->{accessCode} ||= 'user.accessCode';

    $self->_internal_vars->{$varname} = PRaG::Vars::GeneratorConst->new(
        parameters => {
            value => $self->parameters->{login_fields},
        },
        $self->_def_gen_params,
    );

    delete $self->parameters->{login_fields};
    return;
}

sub _add_selfreg_fields {
    my ( $self, $varname ) = @_;

    $self->parameters->{self_reg_fields} //= {};
    foreach my $field (
        qw/accessCode
        user_name first_name last_name
        email_address phone_number company
        location sms_provider
        person_visited reason_visit/
      )
    {
        $self->parameters->{self_reg_fields}->{$field} ||= (
            $field eq 'accessCode'
            ? 'guestUser.'
            : 'guestUser.fieldValues.ui_'
        ) . $field;
        next if ( $field eq 'phone_number' );

        my $rule = $field . '_rule';
        my $name = uc $field;

        next if ( !exists $self->parameters->{$rule} );
        my $rule_ref = $self->parameters->{$rule};

        if ( $rule_ref->{'variant'} eq 'dictionary' ) {
            my $lines =
              $self->all_vars->parent->load_user_dictionaries(
                $rule_ref->{'dictionary'} );

            $self->_internal_vars->{$name} = PRaG::Vars::GeneratorString->new(
                parameters => {
                    'variant'       => 'list',
                    'list'          => $lines,
                    'how-to-follow' => $rule_ref->{'how-to-follow'}
                      // 'one-by-one',
                    'disallow-repeats' => $rule_ref->{'disallow-repeats'} // 0,
                },
                $self->_def_gen_params,
            );
        }
        elsif ( $rule_ref->{'variant'} eq 'keep-empty' ) {
            $self->_internal_vars->{$name} = q{};
        }
        else {
            if (   $field eq 'user_name'
                && $rule_ref->{variant} eq 'others' )
            {
                $rule_ref->{variant} = 'pattern';
                $rule_ref->{pattern} =
                  $self->_replace_vars_username( $rule_ref->{pattern} );
                if ( $self->logger ) {
                    $self->logger->debug(
                        'Username parameters: ' . Dumper($rule_ref) );
                }
                $self->_internal_vars->{$name} =
                  PRaG::Vars::GeneratorVariableString->new(
                    parameters => $rule_ref,
                    $self->_def_gen_params,
                  );
                next;
            }

            $self->_internal_vars->{$name} = PRaG::Vars::GeneratorString->new(
                parameters => $rule_ref,
                $self->_def_gen_params,
            );
            if ( $self->_internal_vars->{$name}->error ) {
                $self->_set_error( $self->_internal_vars->{$name}->error );
            }
        }
        delete $self->parameters->{$rule};
    }

    $self->_internal_vars->{$varname} = PRaG::Vars::GeneratorConst->new(
        parameters => {
            value => $self->parameters->{self_reg_fields},
        },
        $self->_def_gen_params,
    );
    delete $self->parameters->{self_reg_fields};

    $self->_internal_vars->{PHONE_NUMBER} = PRaG::Vars::GeneratorString->new(
        parameters => {
            variant => 'faker',
            what    => 'phone',
        },
        $self->_def_gen_params,
    );
    if ( $self->_internal_vars->{PHONE_NUMBER}->error ) {
        $self->_set_error( $self->_internal_vars->{PHONE_NUMBER}->error );
    }

    return;
}

sub _replace_vars_username {
    my ( $self, $str ) = @_;
    foreach my $field (qw/first_name last_name email_address phone_number/) {
        my $t = uc $field;
        $str =~ s/\$${field}\$/\$${t}\$/sxmg;
    }
    return $str;
}

sub _def_gen_params {
    my $self = shift;
    return (
        max_tries => $self->max_tries,
        logger    => $self->logger,
        all_vars  => $self->all_vars,
    );
}

sub _get_user_agents {
    my $self = shift;

    my $lines =
      $self->all_vars->parent->load_user_dictionaries(
        $self->parameters->{'user-agents'}->{dictionary} );

    $self->_internal_vars->{USER_AGENT} = PRaG::Vars::GeneratorString->new(
        parameters => {
            'variant'       => 'list',
            'list'          => $lines,
            'how-to-follow' =>
              $self->parameters->{'user-agents'}->{'how-to-follow'} // 'random',
            'disallow-repeats' =>
              $self->parameters->{'user-agents'}->{'disallow-repeats'} // 0,
        },
        $self->_def_gen_params,
    );
    delete $self->parameters->{'user-agents'};

    return;
}

###############################################################################

sub _next_none {
    my $self = shift;
    return { code => 'OK', value => 'no-flow' };
}

sub _next_guest_snap {
    my $self = shift;

    my $r           = { code => 'OK', value => {} };
    my $u_generated = 0;
    while ( my ( $name, $ref ) = each %{ $self->_internal_vars } ) {
        if ( $self->logger ) {
            $self->logger->debug( 'GUEST. Next for: ' . $name );
        }
        if ( is_ref($ref) ) {
            next
              if ( $name eq 'USER_NAME'
                && $ref->isa('PRaG::Vars::GeneratorVariableString') );
            my $t = $ref->get_next();
            if ( $ref->error ) {
                $self->_no_next;
                return;
            }

            if ( $name eq 'USER_NAME' ) { $u_generated = 1; }
            if ( $name eq 'PHONE_NUMBER' ) {
                $t =~ s/\s+x\d+$//sxm;
                $t =~ s/[.]/-/sxmg;
                $r->{value}->{PHONE_NUMBER_NUMBERS} = $t =~ s/[^\d]//sxmgr;
            }
            $r->{value}->{$name} = $t;
        }
        else {
            if ( $name eq 'USER_NAME' ) { $u_generated = 1; }
            $r->{value}->{$name} = $ref;
        }
    }

    if ( $self->_internal_vars->{FLOW_TYPE} eq $SELF_REG_FLOW && !$u_generated )
    {
        if ( $self->logger ) {
            $self->logger->debug('GUEST. Next for: USER_NAME (latest)');
        }
        my @keys =
          map { uc } qw/first_name last_name email_address phone_number/;
        @keys = grep { exists $r->{value}->{$_} } @keys;
        my %filtered_hash =
          map { exists $r->{value}->{$_} ? ( $_ => $r->{value}->{$_} ) : () }
          @keys;

        $r->{value}->{USER_NAME} =
          $self->_internal_vars->{USER_NAME}->get_next( \%filtered_hash );
    }

    return $r;
}

__PACKAGE__->meta->make_immutable;

1;
