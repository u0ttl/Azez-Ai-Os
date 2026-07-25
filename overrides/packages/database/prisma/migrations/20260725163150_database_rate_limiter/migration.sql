CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key VARCHAR(500) PRIMARY KEY,
  count INTEGER NOT NULL CHECK (count > 0),
  reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_limit_buckets_reset_at_idx
  ON public.rate_limit_buckets (reset_at);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.rate_limit_buckets IS 'Private API-only distributed rate limit counters for AZEZ AI OS';

DO $migration$
DECLARE
  target_role text;
BEGIN
  FOREACH target_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.rate_limit_buckets FROM %I', target_role);
    END IF;
  END LOOP;
END
$migration$;
