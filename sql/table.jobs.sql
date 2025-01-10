CREATE TABLE IF NOT EXISTS public.jobs (
    id uuid NOT NULL,
    name character varying(120),
    percentage smallint,
    sessions character varying(120),
    attributes jsonb DEFAULT '{}'::jsonb,
    owner character varying(20) DEFAULT 'superUser'::character varying,
    pid integer DEFAULT 0 NOT NULL,
    cli uuid
);