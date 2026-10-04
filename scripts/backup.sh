#!/usr/bin/env sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

backup_root="${BACKUP_DIR:-./backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="${backup_root}/${timestamp}"
mkdir -p "$destination"

pg_dump --format=custom --no-owner --no-privileges --file="${destination}/database.dump" "$DATABASE_URL"

if [ -n "${S3_ENDPOINT:-}" ] && [ -n "${S3_BUCKET:-}" ] && command -v mc >/dev/null 2>&1; then
  mc alias set azez-backup "$S3_ENDPOINT" "${S3_ACCESS_KEY:?S3_ACCESS_KEY is required}" "${S3_SECRET_KEY:?S3_SECRET_KEY is required}"
  mc mirror --overwrite "azez-backup/${S3_BUCKET}" "${destination}/objects"
fi

printf '%s\n' "$timestamp" > "${destination}/BACKUP_ID"
printf 'Backup created at %s\n' "$destination"
