CREATE TABLE public.servers (
    id uuid NOT NULL,
    owner text NOT NULL,
    address text NOT NULL,
    auth_port integer DEFAULT 1812,
    acct_port integer DEFAULT 1813,
    coa boolean DEFAULT true,
    attributes jsonb,
    "group" text
);

ALTER TABLE ONLY public.servers
    ADD CONSTRAINT servers_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS server_owner ON public.servers USING btree (owner);
