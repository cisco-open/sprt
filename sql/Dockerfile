FROM postgres:latest

COPY ./table.*.sql /docker-entrypoint-initdb.d/
COPY ./other.types.sql /docker-entrypoint-initdb.d/1_other.types.sql
COPY ./data.dictionaries.sql /docker-entrypoint-initdb.d/yyy_data.dictionaries.sql
COPY ./changes.sql /docker-entrypoint-initdb.d/zzz_changes.sql