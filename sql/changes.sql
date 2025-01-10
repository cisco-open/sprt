ALTER TABLE sessions ALTER COLUMN id SET DATA TYPE bigint;

ALTER TABLE ONLY public.sessions
    DROP CONSTRAINT IF EXISTS sessions_pkey;

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.servers
    DROP CONSTRAINT IF EXISTS full_server;

-- To 0.5.0
ALTER TABLE public.users 
    DROP COLUMN IF EXISTS sidebar;

CREATE INDEX IF NOT EXISTS logs_owner
    ON public.logs USING btree (owner);

-- To 0.6.0
CREATE TYPE public.protos AS ENUM
    ('radius', 'tacacs');

-- ALTER TYPE public.protos
--     OWNER TO isedb;

ALTER TABLE public.flows
    ADD COLUMN proto protos NOT NULL DEFAULT 'radius';