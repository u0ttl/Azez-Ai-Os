-- Some managed PostgreSQL providers own the vector extension and do not allow
-- application roles to move it. Keep the migration idempotent and provider-safe.
CREATE SCHEMA IF NOT EXISTS extensions;

DO $migration$
DECLARE
  extension_schema text;
  extension_owner oid;
  current_role_oid oid;
BEGIN
  SELECT namespace.nspname, extension.extowner
  INTO extension_schema, extension_owner
  FROM pg_extension AS extension
  JOIN pg_namespace AS namespace ON namespace.oid = extension.extnamespace
  WHERE extension.extname = 'vector';

  IF NOT FOUND OR extension_schema = 'extensions' THEN
    RETURN;
  END IF;

  SELECT oid INTO current_role_oid
  FROM pg_roles
  WHERE rolname = current_user;

  IF extension_owner = current_role_oid
     OR pg_has_role(current_user, extension_owner, 'MEMBER') THEN
    BEGIN
      ALTER EXTENSION vector SET SCHEMA extensions;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'vector is provider-managed; keeping it in schema %', extension_schema;
    END;
  ELSE
    RAISE NOTICE 'vector is provider-managed; keeping it in schema %', extension_schema;
  END IF;
END
$migration$;
