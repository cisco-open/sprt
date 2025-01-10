CREATE TABLE IF NOT EXISTS public.scep_servers (
    id uuid NOT NULL,
    owner text NOT NULL,
    name text,
    ca_certificates jsonb NOT NULL,
    url text NOT NULL,
    signer uuid
);

ALTER TABLE ONLY public.scep_servers
    ADD CONSTRAINT scep_servers_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS id_owner ON public.scep_servers USING btree (id, owner);