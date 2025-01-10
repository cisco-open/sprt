package PRaG::Proto::ProtoAccounting;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

extends 'PRaG::Proto::ProtoRadius';

sub BUILD {
    my $self = shift;
    $self->_set_method('ACCOUNTING');
    return $self;
}

sub do {
    my $self = shift;
    $self->_prepare_accounting;
    $self->do_accounting;
    return;
}

sub _prepare_accounting {
    my $self = shift;

    $self->parameters->{accounting_type} ||= 'update';
    $self->parameters->{starting_accounting} = 0;

    my @DEFAULT = (
        { name => 'NAS-Port-Type',      value => 'Copy Latest Value' },
        { name => 'NAS-IP-Address',     value => 'Copy Latest Value' },
        { name => 'User-Name',          value => 'Copy From Response' },
        { name => 'Class',              value => 'Copy Latest Value' },
        { name => 'Calling-Station-Id', value => '$MAC$' },
        { name => 'Called-Station-Id',  value => 'Copy Latest Value' },
        { name => 'Acct-Session-Id',    value => 'Copy Latest Value' },
        { name => 'Acct-Authentic',     value => 'RADIUS' },
    );

    for my $d (@DEFAULT) {
        if ( not $self->_find_by_name( $d->{name}, 'accounting' ) ) {
            unshift @{ $self->radius->{accounting} }, $d;
        }
    }

    if ( $self->parameters->{accounting_type} eq 'update' ) {
      SEARCHTYPE: foreach my $x ( @{ $self->radius->{accounting} } ) {
            if ( $x->{name} eq 'Acct-Status-Type' ) {
                $self->parameters->{starting_accounting} =
                  ( $x->{value} =~ /^1$/sxm || $x->{value} eq 'Start' );
                $self->parameters->{starting_accounting}
                  and $self->logger->debug('Found Accounting-Start');
                last SEARCHTYPE;
            }
        }
    }
    elsif ( $self->parameters->{accounting_type} eq 'drop' ) {
        unshift @{ $self->radius->{accounting} },
          { name => 'Acct-Status-Type', value => 'Stop' };
    }

    return;
}

__PACKAGE__->meta->make_immutable( inline_constructor => 0 );

1;
