CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cert_type') THEN
        CREATE TYPE public.cert_type AS ENUM (
            'identity',
            'trusted',
            'signer'
        );
    END IF;
END$$;
