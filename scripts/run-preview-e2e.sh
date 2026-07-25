#!/usr/bin/env bash
set -Eeuo pipefail

diagnostic="${E2E_DIAGNOSTIC_FILE:-e2e-diagnostic.txt}"
stdout_file="e2e-run.stdout"
stderr_file="e2e-run.stderr"

{
  echo "deployment_url_present=$([[ -n "${DEPLOYMENT_URL:-}" ]] && echo true || echo false)"
  echo "database_url_present=$([[ -n "${DATABASE_URL:-}" ]] && echo true || echo false)"
  echo "database_url_scheme=$(printf '%s' "${DATABASE_URL:-missing}" | sed -E 's#^([^:]+):.*#\1#')"
  echo "smtp_configured=$([[ -n "${SMTP_HOST:-}" ]] && echo true || echo false)"
  echo "ai_gateway_configured=$([[ -n "${AI_GATEWAY_API_KEY:-}" || -n "${VERCEL_OIDC_TOKEN:-}" ]] && echo true || echo false)"
  echo "openai_configured=$([[ -n "${OPENAI_API_KEY:-}" ]] && echo true || echo false)"
  echo "started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$diagnostic"

set +e
bash scripts/verify-preview-e2e.sh >"$stdout_file" 2>"$stderr_file"
status=$?
set -e

{
  echo "exit_code=$status"
  echo "finished_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "stderr_tail_begin"
  tail -n 120 "$stderr_file" || true
  echo "stderr_tail_end"
  echo "stdout_tail_begin"
  tail -n 120 "$stdout_file" || true
  echo "stdout_tail_end"
} >> "$diagnostic"

cat "$stdout_file"
cat "$stderr_file" >&2
exit "$status"
