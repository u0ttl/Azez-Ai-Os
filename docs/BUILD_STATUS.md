# Build status — 0.11.0

## Completed

- All capabilities from 0.9.0, including secure files, notifications, SMTP delivery, CRM/project operations, knowledge/RAG, workflow, AI provider, SaaS, and security controls.
- Private MinIO/S3 object storage adapter using path-style access.
- Docker Compose bucket initialization with anonymous access disabled.
- Tenant-isolated task attachment upload, listing, download, and deletion.
- PDF, DOCX, TXT, PNG, and JPEG allowlist with a configurable 10 MB default limit.
- MIME/signature matching, filename normalization, checksum, and executable-signature rejection.
- Plan-level `storage.mb` enforcement before upload.
- AES-256 server-side object encryption by default.
- Five-minute signed download URLs; object keys are never exposed as public links.
- File metadata, scan status, checksums, uploader, soft deletion, and task linkage.
- Arabic task attachment interface with size/type guidance.
- In-app notifications for task assignments and new task comments.
- Notification inbox, unread filtering, mark-one, and mark-all operations.
- Transactional SMTP worker for the existing email outbox.
- Atomic message claiming, stale-claim recovery, exponential retry, and terminal failure after five attempts.
- Escaped Arabic templates for verification and password recovery.
- Separate liveness, PostgreSQL readiness, and build-version endpoints.
- Bounded in-memory HTTP metrics in Prometheus format with production bearer-token protection.
- Swagger UI and OpenAPI JSON generated from the running NestJS application.
- Explicit, idempotent demo seed with a production safety interlock.
- Multi-stage API and standalone Next.js production images running as an unprivileged user.
- Production Compose profile with migration job, dependency health ordering, required secrets, and loopback bindings.
- GitHub Actions verification and independent API/web container builds.
- Database/object backup and guarded restore scripts with an operations runbook.
- Staging smoke E2E covering readiness, CSRF, registration, session authentication, and tenant lookup.
- Strict TypeScript, Prisma validation, ESLint, 28 automated tests, production builds, peer-dependency checks, and a real compiled-server runtime probe verified.
- Atomic Redis rate limiting shared by multiple API replicas.
- Global per-IP API throttling plus tighter authentication operation limits.
- Fail-closed production behavior when Redis-backed security controls are unavailable.
- ClamAV INSTREAM scanning before any uploaded object reaches MinIO/S3.
- Fail-closed upload behavior when mandatory malware scanning is unavailable.
- Readiness checks for PostgreSQL, required Redis, and required ClamAV.
- Optional local ClamAV Compose profile and mandatory production ClamAV service.

## Deployment blockers

- Run all nine migrations, container builds, smoke E2E, and upload/email scenarios on a Docker-capable host.
- Configure and test a real SMTP account before requiring email verification.
- Configure production secrets, TLS, backups, monitoring, lifecycle retention, and incident alerts.

## Next milestone

Docker staging validation and launch hardening: centralized telemetry/alerts, real SMTP, automated encrypted backups with restore drills, TLS/reverse proxy, and security/load testing.

## Not yet implemented

MFA/passkeys, CSV import/export, payment checkout/webhooks, richer AI agents, Claude/Gemini adapters, external integrations, hosted production infrastructure, and automated deployment promotion.
