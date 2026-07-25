#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOYMENT_URL:?DEPLOYMENT_URL is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"

workdir="$(mktemp -d)"
cookie_jar="$workdir/cookies.txt"
summary_file="${E2E_SUMMARY_FILE:-e2e-summary.txt}"
run_id="${GITHUB_RUN_ID:-local}"
run_attempt="${GITHUB_RUN_ATTEMPT:-1}"
email="azez-e2e-${run_id}-${run_attempt}@example.com"
password="AzezE2E!2026-Strong"
organization_slug="azez-e2e-${run_id}-${run_attempt}"
csrf_token=""

cleanup() {
  set +e
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v e2e_email="$email" <<'SQL' >/dev/null
CREATE TEMP TABLE e2e_users ON COMMIT DROP AS
SELECT id FROM public.users WHERE email = :'e2e_email';
CREATE TEMP TABLE e2e_organizations ON COMMIT DROP AS
SELECT organization_id AS id FROM public.memberships WHERE user_id IN (SELECT id FROM e2e_users);
DELETE FROM public.file_objects
WHERE split_part(storage_key, '/', 1) IN (SELECT id::text FROM e2e_organizations);
DELETE FROM public.audit_events
WHERE organization_id IN (SELECT id FROM e2e_organizations)
   OR actor_id IN (SELECT id FROM e2e_users);
DELETE FROM public.email_outbox WHERE recipient = :'e2e_email';
DELETE FROM public.organizations WHERE id IN (SELECT id FROM e2e_organizations);
DELETE FROM public.users WHERE id IN (SELECT id FROM e2e_users);
SQL
  fi
  rm -rf "$workdir"
}
trap cleanup EXIT

vcurl() {
  local path="$1"
  shift
  npx --yes vercel@latest curl "$path" \
    --deployment "$DEPLOYMENT_URL" \
    --silent --show-error --location \
    --cookie "$cookie_jar" --cookie-jar "$cookie_jar" \
    "$@"
}

request_json() {
  local label="$1"
  local method="$2"
  local path="$3"
  local data="${4:-}"
  local response_file="$workdir/${label}.response"
  local body_file="$workdir/${label}.json"
  local status
  local args=(--request "$method" --header "accept: application/json" --write-out $'\n__HTTP_STATUS__:%{http_code}\n')
  if [[ "$method" != "GET" && "$method" != "HEAD" ]]; then
    args+=(--header "x-csrf-token: $csrf_token")
  fi
  if [[ -n "$data" ]]; then
    args+=(--header "content-type: application/json" --data "$data")
  fi
  vcurl "$path" "${args[@]}" > "$response_file"
  status="$(sed -n 's/^__HTTP_STATUS__://p' "$response_file" | tail -n 1 | tr -d '\r')"
  sed '/^__HTTP_STATUS__:/d' "$response_file" > "$body_file"
  if [[ ! "$status" =~ ^2 ]]; then
    echo "E2E ${label} returned HTTP ${status}" >&2
    cat "$body_file" >&2
    return 1
  fi
  jq -e . "$body_file" >/dev/null
  cat "$body_file"
}

csrf_json="$(request_json csrf GET /api/v1/auth/csrf)"
csrf_token="$(jq -er '.csrfToken' <<<"$csrf_json")"

register_json="$(request_json register POST /api/v1/auth/register "$(jq -nc \
  --arg name "AZEZ E2E" \
  --arg email "$email" \
  --arg password "$password" \
  --arg organizationName "AZEZ E2E ${run_id}" \
  --arg organizationSlug "$organization_slug" \
  '{name:$name,email:$email,password:$password,organizationName:$organizationName,organizationSlug:$organizationSlug,locale:"ar"}')")"
jq -e --arg email "$email" '.email == $email' <<<"$register_json" >/dev/null

verification_url="$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -v e2e_email="$email" -c "select coalesce(payload->>'verificationUrl', payload->>'url') from public.email_outbox where recipient = :'e2e_email' order by created_at desc limit 1")"
[[ -n "$verification_url" ]]
verification_token="$(python3 - "$verification_url" <<'PY'
import sys
from urllib.parse import parse_qs, urlparse
print(parse_qs(urlparse(sys.argv[1]).query)["token"][0])
PY
)"
request_json verify_email POST /api/v1/auth/verify-email "$(jq -nc --arg token "$verification_token" '{token:$token}')" >/dev/null

me_json="$(request_json me GET /api/v1/auth/me)"
user_id="$(jq -er '.userId' <<<"$me_json")"

organizations_json="$(request_json organizations GET /api/v1/organizations)"
organization_id="$(jq -er --arg slug "$organization_slug" '.[] | select(.slug == $slug) | .id' <<<"$organizations_json")"

project_json="$(request_json project_create POST "/api/v1/organizations/${organization_id}/projects" '{"name":"E2E Production Readiness","description":"Full-system preview verification","status":"ACTIVE"}')"
project_id="$(jq -er '.id' <<<"$project_json")"

task_json="$(request_json task_create POST "/api/v1/organizations/${organization_id}/projects/${project_id}/tasks" "$(jq -nc --arg userId "$user_id" '{title:"E2E task",description:"Attachment and notification verification",priority:"HIGH",assigneeUserId:$userId}')")"
task_id="$(jq -er '.id' <<<"$task_json")"
request_json task_update PATCH "/api/v1/organizations/${organization_id}/projects/${project_id}/tasks/${task_id}" '{"status":"DONE"}' >/dev/null

company_json="$(request_json crm_company POST "/api/v1/organizations/${organization_id}/crm/companies" '{"name":"E2E Company","email":"crm-e2e@example.com","status":"PROSPECT"}')"
company_id="$(jq -er '.id' <<<"$company_json")"
request_json crm_contact POST "/api/v1/organizations/${organization_id}/crm/companies/${company_id}/contacts" '{"name":"E2E Contact","email":"contact-e2e@example.com","jobTitle":"QA"}' >/dev/null
lead_json="$(request_json crm_lead POST "/api/v1/organizations/${organization_id}/crm/leads" "$(jq -nc --arg companyId "$company_id" '{title:"E2E Lead",companyId:$companyId,status:"QUALIFIED",valueMinor:10000,currency:"USD"}')")"
lead_id="$(jq -er '.id' <<<"$lead_json")"
request_json crm_activity POST "/api/v1/organizations/${organization_id}/crm/companies/${company_id}/activities" "$(jq -nc --arg leadId "$lead_id" '{type:"NOTE",subject:"E2E activity",notes:"CRM end-to-end verification",leadId:$leadId}')" >/dev/null

base_json="$(request_json knowledge_base POST "/api/v1/organizations/${organization_id}/knowledge/bases" '{"name":"E2E Knowledge","description":"RAG verification data"}')"
base_id="$(jq -er '.id' <<<"$base_json")"
request_json knowledge_document POST "/api/v1/organizations/${organization_id}/knowledge/bases/${base_id}/documents/text" '{"title":"سياسة الاختبار","content":"سياسة AZEZ للاختبار تؤكد أن رمز التحقق الداخلي هو AZEZ-E2E-2026 وأن جميع مسارات النظام يجب أن تعمل من الواجهة حتى قاعدة البيانات."}' >/dev/null
search_json="$(request_json knowledge_search POST "/api/v1/organizations/${organization_id}/knowledge/bases/${base_id}/search" '{"query":"ما رمز التحقق الداخلي؟"}')"
jq -e 'length > 0 and .[0].content != null' <<<"$search_json" >/dev/null

ai_status_json="$(request_json ai_status GET "/api/v1/organizations/${organization_id}/ai/status")"
ai_provider="$(jq -er '.provider' <<<"$ai_status_json")"
conversation_json="$(request_json ai_conversation POST "/api/v1/organizations/${organization_id}/ai/conversations" '{"title":"E2E AI"}')"
conversation_id="$(jq -er '.id' <<<"$conversation_json")"
ai_message_json="$(request_json ai_message POST "/api/v1/organizations/${organization_id}/ai/conversations/${conversation_id}/messages" "$(jq -nc --arg baseId "$base_id" '{content:"ما رمز التحقق الداخلي؟",knowledgeBaseId:$baseId}')")"
jq -e '.role == "ASSISTANT" and (.content | length) > 0 and (.provider | length) > 0' <<<"$ai_message_json" >/dev/null
if [[ "${AI_REQUIRED:-false}" == "true" ]]; then
  jq -e '.provider != "local-retrieval" and .provider != "local-fallback"' <<<"$ai_message_json" >/dev/null
fi

workflow_json="$(request_json workflow_create POST "/api/v1/organizations/${organization_id}/workflows" '{"name":"E2E Workflow","description":"Workflow execution verification"}')"
workflow_id="$(jq -er '.id' <<<"$workflow_json")"
request_json workflow_step POST "/api/v1/organizations/${organization_id}/workflows/${workflow_id}/steps" '{"name":"Create verified lead","position":0,"actionType":"CREATE_LEAD","config":{"title":"E2E Workflow Lead"}}' >/dev/null
request_json workflow_activate PATCH "/api/v1/organizations/${organization_id}/workflows/${workflow_id}/status" '{"status":"ACTIVE"}' >/dev/null
workflow_run_json="$(request_json workflow_run POST "/api/v1/organizations/${organization_id}/workflows/${workflow_id}/runs" '{"input":{"source":"preview-e2e"}}')"
jq -e '.status == "SUCCEEDED" and (.stepRuns | length) == 1' <<<"$workflow_run_json" >/dev/null

printf 'AZEZ E2E attachment %s\n' "$run_id" > "$workdir/attachment.txt"
upload_response="$workdir/file_upload.response"
vcurl "/api/v1/organizations/${organization_id}/projects/${project_id}/tasks/${task_id}/attachments" \
  --request POST \
  --header "accept: application/json" \
  --header "x-csrf-token: $csrf_token" \
  --form "file=@${workdir}/attachment.txt;type=text/plain" \
  --write-out $'\n__HTTP_STATUS__:%{http_code}\n' > "$upload_response"
upload_status="$(sed -n 's/^__HTTP_STATUS__://p' "$upload_response" | tail -n 1 | tr -d '\r')"
[[ "$upload_status" =~ ^2 ]]
sed '/^__HTTP_STATUS__:/d' "$upload_response" > "$workdir/file_upload.json"
attachment_file_id="$(jq -er '.id' "$workdir/file_upload.json")"
attachments_json="$(request_json file_list GET "/api/v1/organizations/${organization_id}/projects/${project_id}/tasks/${task_id}/attachments")"
attachment_id="$(jq -er --arg fileId "$attachment_file_id" '.[] | select(.file.id == $fileId) | .id' <<<"$attachments_json")"
download_json="$(request_json file_download GET "/api/v1/organizations/${organization_id}/projects/${project_id}/tasks/${task_id}/attachments/${attachment_id}/download")"
download_url="$(jq -er '.url' <<<"$download_json")"
if [[ "$download_url" == /api/* ]]; then
  downloaded="$(vcurl "$download_url" --request GET)"
  grep -q "AZEZ E2E attachment" <<<"$downloaded"
fi

notification_count_json="$(request_json notification_count GET /api/v1/notifications/unread-count)"
jq -e '.count >= 1' <<<"$notification_count_json" >/dev/null
notifications_json="$(request_json notifications GET '/api/v1/notifications?unread=true')"
notification_id="$(jq -er '.[] | select(.type == "TASK_ASSIGNED") | .id' <<<"$notifications_json" | head -n 1)"
request_json notification_read PATCH "/api/v1/notifications/${notification_id}/read" '{}' >/dev/null

sessions_json="$(request_json sessions GET /api/v1/auth/sessions)"
jq -e 'length >= 1 and any(.current == true)' <<<"$sessions_json" >/dev/null
request_json logout POST /api/v1/auth/logout '{}' >/dev/null
csrf_json="$(request_json csrf_after_logout GET /api/v1/auth/csrf)"
csrf_token="$(jq -er '.csrfToken' <<<"$csrf_json")"
request_json login POST /api/v1/auth/login "$(jq -nc --arg email "$email" --arg password "$password" '{email:$email,password:$password}')" >/dev/null
request_json me_after_login GET /api/v1/auth/me >/dev/null

email_status="$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -v e2e_email="$email" -c "select status::text from public.email_outbox where recipient = :'e2e_email' order by created_at desc limit 1")"
health_json="$(request_json final_ready GET /api/v1/health/ready)"
jq -e '.status == "ready" and .checks.database.status == "up" and .checks.storage.status == "up"' <<<"$health_json" >/dev/null

{
  echo "auth=passed"
  echo "projects=passed"
  echo "crm=passed"
  echo "knowledge_rag=passed"
  echo "ai=passed provider=${ai_provider}"
  echo "workflows=passed"
  echo "files=passed"
  echo "notifications=passed"
  echo "email_outbox=passed status=${email_status}"
  echo "database=passed"
  echo "api_health=passed"
  echo "deployment=${DEPLOYMENT_URL}"
} | tee "$summary_file"
