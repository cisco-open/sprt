CREATE TABLE public.users (
    uid text NOT NULL,
    pages jsonb,
    attributes jsonb
);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (uid);