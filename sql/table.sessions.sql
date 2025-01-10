CREATE TABLE IF NOT EXISTS public.sessions (
    server text NOT NULL,
    mac text NOT NULL,
    "user" text,
    sessid text NOT NULL,
    class text,
    "ipAddr" text DEFAULT '0.0.0.0'::text,
    shared text,
    "RADIUS" text,
    started integer DEFAULT 0,
    changed integer DEFAULT 0,
    id integer NOT NULL,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    bulk text DEFAULT 'none'::text NOT NULL,
    owner text DEFAULT 'superUser'::text
);

CREATE SEQUENCE IF NOT EXISTS public.sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (server, mac, sessid);