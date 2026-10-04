#!/usr/bin/env sh
set -eu

if [ "${CONFIRM_RESTORE:-}" != "YES" ]; then
  echo "Restore is destructive. Set CONFIRM_RESTORE=YES after verifying the target database." >&2
  exit 1
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi
if [ "$#" -ne 1 ] || [ ! -f "$1/database.dump" ]; then
  echo "Usage: CONFIRM_RESTORE=YES scripts/restore.sh <backup-directory>" >&2
  exit 1
fi

source_directory="$1"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "${source_directory}/database.dump"

if [ -d "${source_directory}/objects" ] && [ -n "${S3_ENDPOINT:-}" ] && [ -n "${S3_BUCKET:-}" ] && command -v mc >/dev/null 2>&1; then
  mc alias set azez-restore "$S3_ENDPOINT" "${S3_ACCESS_KEY:?S3_ACCESS_KEY is required}" "${S3_SECRET_KEY:?S3_SECRET_KEY is required}"
  mc mirror --overwrite "${source_directory}/objects" "azez-restore/${S3_BUCKET}"
fi

printf 'Restore completed from %s\n' "$source_directory"
