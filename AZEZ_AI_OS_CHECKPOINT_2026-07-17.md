# AZEZ AI OS 0.12.0 — Preview Checkpoint

Date: 2026-07-17
Branch: `launch-hardening-0.12.0`
Production changes: none

## Completed

- Unified Next.js + NestJS production build passes on Node.js 24.
- GitHub Actions now runs the real AZEZ unified build instead of the default Webpack template.
- Preview PostgreSQL branch created in Neon: `preview-v0-12-0`.
- 35 application tables created and verified.
- 12 Prisma migrations recorded with matching SHA-256 checksums.
- pgvector enabled and vector distance query verified.
- Seeded billing plans and entitlements verified.
- Integration smoke test passed for users, organizations, memberships, CRM, projects, tasks, comments, knowledge, workflows, billing, and cascading cleanup.
- Supabase-specific privilege migration made portable for Neon and standard PostgreSQL.
- Provider-managed pgvector migration made safe when the application role cannot move the extension.

## Existing Preview

- Deployment: `dpl_2RZ9pB6NR8jH9YpFaZ3rcEsVfbGY`
- State: READY
- Target: Preview
- Version endpoints previously verified as `0.12.0`.
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
- no unexpected runtime 500 errors

Do not merge or promote to Production without explicit approval.
