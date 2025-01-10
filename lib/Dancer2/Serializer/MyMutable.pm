package Dancer2::Serializer::MyMutable;

# ABSTRACT: Serialize and deserialize content based on HTTP header
$Dancer2::Serializer::MyMutable::VERSION = '0.208001';
use Moo;
use Carp 'croak';
use Encode;
use Syntax::Keyword::Try;
use Data::Dumper;

with 'Dancer2::Core::Role::Serializer';

use constant DEFAULT_CONTENT_TYPE => 'application/json';

has '+content_type' => ( default => DEFAULT_CONTENT_TYPE() );

my $serializer = {
    'YAML' => {
        to   => sub { Dancer2::Core::DSL::to_yaml(@_) },
        from => sub { Dancer2::Core::DSL::from_yaml(@_) },
    },
    'Dumper' => {
        to   => sub { Dancer2::Core::DSL::to_dumper(@_) },
        from => sub { Dancer2::Core::DSL::from_dumper(@_) },
    },
    'JSON' => {
        to   => sub { Dancer2::Core::DSL::to_json(@_) },
        from => sub { Dancer2::Core::DSL::from_json(@_) },
    },
};

has mapping => (
    is      => 'ro',
    lazy    => 1,
    default => sub {
        my $self = shift;

        if ( my $mapping = $self->config->{mapping} ) {

            # initialize non-default serializers
            for my $s ( values %$mapping ) {

                # TODO allow for arguments via the config
                next if $serializer->{$s};
                my $serializer_object = ( 'Dancer2::Serializer::' . $s )->new;
                $serializer->{$s} = {
                    from => sub { shift; $serializer_object->deserialize(@_) },
                    to   => sub { shift; $serializer_object->serialize(@_) },
                };
            }

            return $mapping;
        }

        return {
            'text/x-yaml'        => 'YAML',
            'text/html'          => 'YAML',
            'text/x-data-dumper' => 'Dumper',
            'text/x-json'        => 'JSON',
            'application/json'   => 'JSON',
        };
    },
);

sub serialize {
    my ( $self, $entity ) = @_;

    # Look for valid format in the headers
    my $format = $self->_get_content_type('accept');

    # Match format with a serializer and return
    $format and return $serializer->{$format}{'to'}->( $self, $entity );

    # If none is found then just return the entity without change
    return $entity;
}

sub deserialize {
    my ( $self, $content ) = @_;

    try {
        my $format = $self->_get_content_type('content_type');
        $format and return $serializer->{$format}{'from'}->( $self, $content );
    }
    catch {
        $self->{request}->{_body_params} = undef;
        return $self->{request}->body_parameters;
    }

    return $content;
}

sub _get_content_type {
    my ( $self, $header ) = @_;

    if ( $self->has_request ) {

        # Search for the first HTTP header variable which specifies
        # supported content. Both content_type and accept are checked
        # for backwards compatibility.
        foreach my $method ( $header, qw<content_type accept> ) {
            if ( my $value = $self->request->header($method) ) {
                if ( my $serializer = $self->mapping->{$value} ) {
                    $self->set_content_type($value);
                    return $serializer;
                }
            }
        }
    }

    # If none if found, return the default, 'JSON'.
    $self->set_content_type( DEFAULT_CONTENT_TYPE() );
    return 'JSON';
}

1;

__END__
