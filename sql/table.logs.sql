CREATE TABLE IF NOT EXISTS public.logs (
    id uuid NOT NULL,
    "timestamp" timestamp without time zone DEFAULT '1970-01-01 00:00:00'::timestamp without time zone,
    loglevel character varying(10),
    owner character varying(20),
    message text,
    chunk uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
);

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);
