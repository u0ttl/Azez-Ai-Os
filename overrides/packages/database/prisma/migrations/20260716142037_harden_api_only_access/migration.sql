-- AZEZ AI OS uses its authenticated server API for application data access.
-- Apply Supabase-specific revocations only when the managed roles/functions exist.
DO $migration$
DECLARE
  target_role text;
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
    FOREACH target_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
        EXECUTE format(
          'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM %I',
          target_role
        );
      END IF;
    END LOOP;
  END IF;

  FOREACH target_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I',
        target_role
      );
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I',
        target_role
      );
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres')
     AND pg_has_role(current_user, 'postgres', 'MEMBER') THEN
    FOREACH target_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
        EXECUTE format(
          'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %I',
          target_role
        );
        EXECUTE format(
          'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I',
          target_role
        );
      END IF;
    END LOOP;
  END IF;
END
$migration$;
