package PRaG::Types;

use strict;
use utf8;

use Moose;
use Moose::Util::TypeConstraints;
use namespace::autoclean;

subtype 'PortNumber', as 'Int',
  where { $_ > 0 && $_ < 65536 },
  message { "The number you provided, $_, was not a port number" };

subtype 'PositiveInt', as 'Int',
  where { $_ >= 0 },
  message { "The number you provided, $_, was not a positive number" };

__PACKAGE__->meta->make_immutable;

1;
