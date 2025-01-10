CREATE TABLE IF NOT EXISTS public.templates (
    id uuid NOT NULL,
    owner text,
    friendly_name text,
    content jsonb,
    subject text
);

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);