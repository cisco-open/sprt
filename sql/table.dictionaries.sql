CREATE TABLE IF NOT EXISTS dictionaries (
    id uuid NOT NULL,
    name text NOT NULL,
    owner text NOT NULL,
    type text NOT NULL,
    content text,
    CONSTRAINT dictionaries_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS dictionary_name_owner
    ON public.dictionaries USING btree (name, owner);