CREATE TABLE IF NOT EXISTS public.cli (
    id uuid NOT NULL,
    owner text,
    line text
);

ALTER TABLE ONLY public.cli
    ADD CONSTRAINT cli_pkey PRIMARY KEY (id);