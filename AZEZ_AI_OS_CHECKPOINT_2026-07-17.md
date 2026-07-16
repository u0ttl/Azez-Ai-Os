# AZEZ AI OS 0.12.0 — Preview Checkpoint

Date: 2026-07-17
Branch: `launch-hardening-0.12.0`
Production changes: none

## Completed

- Unified Next.js + NestJS production build previously passed on Node.js 24.
- GitHub Actions runs the real AZEZ unified build instead of the default Webpack template.
- Preview PostgreSQL branch created in Neon: `preview-v0-12-0`.
- 35 application tables created and verified.
- 12 Prisma migrations recorded with matching SHA-256 checksums.
- pgvector enabled and vector distance query verified.
- Seeded billing plans and entitlements verified.
- Integration smoke test passed for users, organizations, memberships, CRM, projects, tasks, comments, knowledge, workflows, billing, and cascading cleanup.
- Supabase-specific privilege migration made portable for Neon and standard PostgreSQL.
- Provider-managed pgvector migration made safe when the application role cannot move the extension.

## Launch-hardening fixes added

- Preview CORS now allows the active Vercel Preview origin and configured web origins instead of preferring only the production domain.
- Fastify CORS uses the supported asynchronous origin function signature.
- The API function region is aligned with the Frankfurt Neon database region.
- API startup logging exposes a sanitized error name/message/code without leaking PostgreSQL or Redis credentials.
- Swagger and health fallbacks report version `0.12.0`.
- `/health/version` reports the actual Vercel commit, branch, and deployment when available.
- CSRF tokens are refreshed after expiration and reusable unsafe requests are retried exactly once.
- Email verification and password-reset links use the active Preview origin instead of falling back to localhost.
- Required Redis absence keeps liveness available, makes readiness fail closed, and keeps distributed operations unavailable.
- Two pre-existing `exactOptionalPropertyTypes` errors in the embedded desktop source are patched deterministically during bootstrap.

## Verified tests after the fixes

- Web TypeScript gate: passed locally after applying the bootstrap patches.
- Web unit tests: 3 files, 7 tests passed.
- API unit tests: 14 files, 28 tests passed.
- Bootstrap patch verification: both required desktop replacements were found and applied successfully.
- CORS TypeScript failure was reproduced locally, corrected, and no longer appears in the API type gate; the remaining local API type errors require Prisma-generated types.
- Full Prisma generation cannot be reproduced in the restricted local runner because `binaries.prisma.sh` is blocked; GitHub Actions remains the authoritative full-build gate.

## Existing Preview

- Deployment: `dpl_2RZ9pB6NR8jH9YpFaZ3rcEsVfbGY`
- State: READY
- Target: Preview
- Version endpoints previously verified as `0.12.0`.
- This deployment predates the newest launch-hardening commits.
- Readiness remains blocked until Preview runtime variables are connected.

## Remaining launch gate

The following values must be configured only in the Vercel Preview environment:

- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`

After configuration, create a new Preview deployment and verify:

- `/` = 200
- `/api/v1/health` = 200
- `/api/v1/health/version` = 200 and version `0.12.0`
- `/api/v1/health/ready` = 200
- registration, login, sessions, and CSRF
- projects, tasks, comments, and attachments
- CRM, knowledge, AI, workflows, billing, and notifications
- Arabic/English and RTL/LTR on mobile and desktop
- no unexpected runtime 500 errors

Do not merge or promote to Production without explicit approval.
