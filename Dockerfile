FROM ghcr.io/cisco-open/sprt-base:latest AS modules

RUN sed -i 's/MinProtocol = .*$/MinProtocol = TLSv1.0/' /usr/lib/ssl/openssl.cnf
RUN sed -i 's/CipherString = DEFAULT@SECLEVEL=.*$/CipherString = DEFAULT@SECLEVEL=0/' /usr/lib/ssl/openssl.cnf
RUN echo 'SSLCipherSuite = HIGH:!aNULL:!MD5@SECLEVEL=0' >> /usr/lib/ssl/openssl.cnf

RUN mkdir -p /var/sprt
WORKDIR /var/sprt

COPY ./cpanfile /var/sprt/cpanfile
RUN cpanm --installdeps .
RUN cpanm Log::Syslog::Fast::PP
RUN cpanm Daemon::Control

FROM modules

COPY ./ /var/sprt
COPY ./dockerized/sprt_docker/config.yml /var/sprt/.

ENTRYPOINT bin/configurator.pl -ce; bin/docker_entry -p 80 -s