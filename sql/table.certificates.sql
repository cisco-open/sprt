CREATE TABLE IF NOT EXISTS public.certificates (
    id uuid NOT NULL,
    owner text NOT NULL,
    friendly_name text,
    type public.cert_type NOT NULL,
    content text NOT NULL,
    keys jsonb,
    subject text,
    serial text,
    thumbprint text,
    issuer text,
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    self_signed boolean
);

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS owner_type 
    ON public.certificates USING btree (owner, type);

