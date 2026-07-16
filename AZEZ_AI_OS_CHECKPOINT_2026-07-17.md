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
- The unused desktop Sparkline component is removed deterministically during bootstrap.
- Operations Workspace was rewritten with strict types and React 19-safe asynchronous initialization.
- Production dependency overrides pin patched `postcss` and `@hono/node-server` releases.

## Verified quality gates after the fixes

- Web TypeScript gate: passed with the same API-route exclusion used by the unified build.
- Web ESLint gate: passed with zero warnings.
- Web unit tests: 3 files, 7 tests passed.
- API ESLint gate: passed with zero warnings.
- API unit tests: 14 files, 28 tests passed.
- Production dependency audit: no known vulnerabilities found at moderate-or-higher threshold.
- Bootstrap patch verification: all required desktop replacements and cleanup patterns were found and applied successfully.
- Fastify CORS TypeScript failure was reproduced locally and corrected.
- Full Prisma binary generation cannot be reproduced in the restricted local runner because `binaries.prisma.sh` is blocked; GitHub Actions remains the authoritative full unified-build gate.
- GitHub Actions status reads are temporarily unavailable through the connected GitHub service because it is returning upstream `502` responses; no success is claimed for the newest commit until that service recovers.

## CI requirements

Preview CI now requires all of the following:

- unified production build
- production dependency audit with moderate-or-higher failures blocked
- web ESLint with zero warnings
- API ESLint with zero warnings
- API unit tests
- web unit tests including CSRF lifecycle tests

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
