#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required inside vercel env run}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f overrides/packages/database/prisma/migrations/20260725155430_production_readiness_file_storage/migration.sql

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f overrides/packages/database/prisma/migrations/20260725163150_database_rate_limiter/migration.sql

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -At <<'SQL'
select 'database=' || current_database();
select 'server_version=' || current_setting('server_version');
select 'file_objects=' || coalesce(to_regclass('public.file_objects')::text, 'missing');
select 'rate_limit_buckets=' || coalesce(to_regclass('public.rate_limit_buckets')::text, 'missing');
select 'file_objects_rls=' || coalesce((select relrowsecurity::text from pg_class where oid = 'public.file_objects'::regclass), 'missing');
select 'rate_limit_buckets_rls=' || coalesce((select relrowsecurity::text from pg_class where oid = 'public.rate_limit_buckets'::regclass), 'missing');
SQL
