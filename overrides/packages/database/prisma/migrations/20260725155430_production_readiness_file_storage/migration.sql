-- Provision database-backed object storage deterministically instead of creating
-- the table during an upload request.
CREATE TABLE IF NOT EXISTS public.file_objects (
  storage_key VARCHAR(500) PRIMARY KEY,
  content BYTEA NOT NULL,
  mime_type VARCHAR(160) NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.file_objects ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.file_objects IS 'Private API-only fallback object storage for AZEZ AI OS';

DO $migration$
DECLARE
  target_role text;
BEGIN
  FOREACH target_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.file_objects FROM %I', target_role);
      EXECUTE format('REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM %I', target_role);

      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres')
         AND pg_has_role(current_user, 'postgres', 'MEMBER') THEN
        EXECUTE format(
          'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM %I',
          target_role
        );
      END IF;
    END IF;
  END LOOP;
END
$migration$;
