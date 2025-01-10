FROM perl:5.36-buster

RUN apt-get update && apt-get upgrade -y && apt-get install -y git \
 build-essential \
 gcc \
 jq \
 libexpat1 \
 libpq-dev \
 libssl-dev \
 libxml2 \
 libyaml-0-2 \
 libev-dev \
 libev-perl \
 linux-libc-dev \
 make \
 memcached \
 openssl \
 ucf \
 cron && \
 rm -rf /var/lib/apt/lists/*

RUN mkdir /usr/include/sys/
RUN ln -s /usr/include/bits/socket.h /usr/include/sys/socket.h
WORKDIR /usr/include
RUN ln -s x86_64-linux-gnu/gnu .
RUN ln -s x86_64-linux-gnu/bits .

RUN cpanm Net::Interface --notest
RUN cpanm Net::Ping --notest
RUN cpanm Net::Server --notest
RUN cpanm Net::Server::SS::PreFork --notest
RUN cpanm --notest \
    Archive::Tar \
    Archive::Zip \
    Carp \
    Class::Accessor::Fast \
    Class::Load \
    Class::Unload \
    Config::Any \
    Convert::ASN1 \
    Cpanel::JSON::XS \
    Crypt::Digest \
    Crypt::JWT \
    Crypt::Misc \
    Crypt::OpenSSL::PKCS10 \
    Crypt::OpenSSL::RSA \
    Crypt::OpenSSL::X509 \
    Crypt::PK::DSA \
    Crypt::PK::ECC \
    Crypt::PK::RSA \
    Crypt::X509 \
    Cwd \
    Dancer2 \
    Dancer2::Core::Request::Upload \
    Dancer2::Plugin::Database \
    Dancer2::Serializer::JSON \
    Dancer2::Session::Memcached \
    Dancer2::Template::TemplateToolkit \
    Data::Compare \
    Data::Dump::Streamer \
    Data::Dumper \
    Data::Fake \
    Data::GUID \
    Data::HexDump \
    DateTime \
    DateTime::Format::Pg \
    DBD::Pg \
    DBI \
    Devel::StackTrace \
    Digest::MD5 \
    Exporter \
    File::Basename \
    File::Find \
    File::Path \
    File::Temp \
    FileHandle \
    FindBin \
    Future::IO \
    Getopt::Long::Descriptive \
    HTTP::Cookies \
    HTML::Form \
    HTML::FormatText \
    HTML::Tree \
    HTML::Entities \
    HTML::Strip \
    IO::Interface::Simple \
    IO::Select \
    IO::Socket::SSL \
    IO::Socket::SSL::Utils \
    IO::Socket::UNIX \
    IO::Socket \
    IPC::Shareable \
    JSON::PP \
    JSON::MaybeXS \
    JSON \
    List::Compare \
    List::MoreUtils \
    Log::Log4perl \
    Log::Log4perl::Layout::JSON \
    Log::Log4perl::Layout::PatternLayout \
    Log::Log4perl::Level \
    LWP::Protocol::http::SocketUnixAlt \
    LWP::Protocol::https \
    LWP::UserAgent \
    Math::BigInt \
    Math::Random::Secure \
    Module::Install \
    Moose \
    Moose::Role \
    Moose::Util::TypeConstraints \
    MooseX::Daemonize \
    MooseX::Getopt \
    MooseX::Getopt::Meta::Attribute::Trait::NoGetopt \
    Net::DNS \
    Net::DNS::Nslookup \
    Net::IP \
    Net::MAC \
    Net::Ping \
    Net::Server \
    Net::Server::SS::PreFork \
    Net::Interface \
    PerlIO::utf8_strict \
    Parallel::ForkManager \
    Path::Tiny \
    Plack::App::File \
    Plack::Builder \
    Plack::Middleware::ConditionalGET \
    Plack::Middleware::ETag \
    POSIX \
    Proc::ProcessTable \
    Readonly \
    Redis \
    Redis::JobQueue \
    Regexp::Common \
    Regexp::Util \
    Server::Starter \
    Starman \
    Storable \
    String::Random \
    String::ShellQuote \
    Syntax::Keyword::Try \
    Term::ANSIScreen \
    Text::Autoformat \
    Text::Markdown \
    Template::Plugin::JSON \
    Template::Toolkit \
    threads \
    Tie::RegexpHash \
    Time::HiRes \
    URI::URL \
    URI::Split \
    YAML \
    YAML::XS

RUN cpanm EV 
RUN cpanm AnyEvent
RUN cpanm CryptX

RUN cpanm Coro \
    AnyEvent::Fork \
    AnyEvent::Fork::Pool

RUN cpanm CBOR::XS

RUN cpanm \ 
    Crypt::Random::Seed \
    DateTime::Event::Cron \
    Math::Random::ISAAC::XS \
    MooseX::XSAccessor \
    Text::ParseWords

RUN cpanm --notest Date::Parse

RUN cpanm Rex::Commands::Cron

RUN cpanm \
    Log::Syslog::Fast \
    Sys::Hostname