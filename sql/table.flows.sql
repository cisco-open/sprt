CREATE TABLE IF NOT EXISTS public.flows (
    session_id integer NOT NULL,
    "order" integer NOT NULL,
    radius text,
    packet_type integer
);

CREATE SEQUENCE IF NOT EXISTS public.flows_order_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.flows_order_seq OWNED BY public.flows."order";

ALTER TABLE ONLY public.flows ALTER COLUMN "order" SET DEFAULT nextval('public.flows_order_seq'::regclass);

ALTER TABLE ONLY public.flows
    ADD CONSTRAINT flows_pkey PRIMARY KEY (session_id, "order");

