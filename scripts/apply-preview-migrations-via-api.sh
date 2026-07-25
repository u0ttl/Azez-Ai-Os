#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOYMENT_URL:?DEPLOYMENT_URL is required}"

workdir="$(mktemp -d)"
cookie_jar="$workdir/cookies.txt"
csrf_response="$workdir/csrf.response"
migration_response="$workdir/migrations.response"
output_file="${PREVIEW_MIGRATION_OUTPUT:-preview-database-migrations.json}"

cleanup() {
  rm -rf "$workdir"
}
trap cleanup EXIT

npx --yes vercel@latest curl "/api/v1/auth/csrf" \
  --deployment "$DEPLOYMENT_URL" \
  --silent --show-error --location \
  --cookie-jar "$cookie_jar" \
  --write-out $'\n__HTTP_STATUS__:%{http_code}\n' \
  > "$csrf_response"

csrf_status="$(sed -n 's/^__HTTP_STATUS__://p' "$csrf_response" | tail -n 1 | tr -d '\r')"
[[ "$csrf_status" == "200" ]]
sed '/^__HTTP_STATUS__:/d' "$csrf_response" > "$workdir/csrf.json"
csrf_token="$(jq -er '.csrfToken' "$workdir/csrf.json")"

npx --yes vercel@latest curl "/api/v1/health/preview-migrations" \
  --deployment "$DEPLOYMENT_URL" \
  --silent --show-error --location \
  --request POST \
  --cookie "$cookie_jar" --cookie-jar "$cookie_jar" \
  --header "accept: application/json" \
  --header "content-type: application/json" \
  --header "x-azez-preview-e2e: 1" \
  --header "x-csrf-token: $csrf_token" \
  --data '{}' \
  --write-out $'\n__HTTP_STATUS__:%{http_code}\n' \
  > "$migration_response"

migration_status="$(sed -n 's/^__HTTP_STATUS__://p' "$migration_response" | tail -n 1 | tr -d '\r')"
sed '/^__HTTP_STATUS__:/d' "$migration_response" > "$output_file"
if [[ ! "$migration_status" =~ ^2 ]]; then
  cat "$output_file" >&2
  exit 1
fi

jq -e '
  .status == "ready" and
  .fileObjects.exists == true and
  .fileObjects.rlsEnabled == true and
  .rateLimitBuckets.exists == true and
  .rateLimitBuckets.rlsEnabled == true
' "$output_file" >/dev/null

cat "$output_file"
