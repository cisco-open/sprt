CREATE SEQUENCE public.tacacs_sessions_id;

CREATE TABLE public.tacacs_sessions
(
    id bigint NOT NULL DEFAULT nextval('tacacs_sessions_id'::regclass),
    server text COLLATE pg_catalog."default",
    "user" text COLLATE pg_catalog."default",
    ip_addr text COLLATE pg_catalog."default" DEFAULT '0.0.0.0'::text,
    shared text COLLATE pg_catalog."default",
    started timestamp without time zone DEFAULT to_timestamp((0)::double precision),
    changed timestamp without time zone DEFAULT to_timestamp((0)::double precision),
    proto_data jsonb,
    attributes jsonb,
    owner text COLLATE pg_catalog."default" NOT NULL,
    bulk text COLLATE pg_catalog."default" DEFAULT 'none'::text,
    CONSTRAINT tacacs_sessions_pkey PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
);