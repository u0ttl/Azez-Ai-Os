#!/usr/bin/env bash
set -Eeuo pipefail

diagnostic="${E2E_DIAGNOSTIC_FILE:-e2e-diagnostic.txt}"
stdout_file="e2e-run.stdout"
stderr_file="e2e-run.stderr"

{
  echo "deployment_url_present=$([[ -n "${DEPLOYMENT_URL:-}" ]] && echo true || echo false)"
  echo "credential_free_e2e=true"
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
  tail -n 160 "$stderr_file" || true
  echo "stderr_tail_end"
  echo "stdout_tail_begin"
  tail -n 160 "$stdout_file" || true
  echo "stdout_tail_end"
} >> "$diagnostic"

cat "$stdout_file"
cat "$stderr_file" >&2
exit "$status"
