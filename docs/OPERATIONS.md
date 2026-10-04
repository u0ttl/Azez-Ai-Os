# Operations runbook

## Service endpoints

- `GET /v1/health` is the liveness probe. It proves that the Node process can answer requests and does not query dependencies.
- `GET /v1/health/ready` is the readiness probe. It checks PostgreSQL plus Redis and ClamAV when they are mandatory, and returns `503` while a required dependency is down.
- `GET /v1/health/version` reports the release, commit, and optional build timestamp.
- `GET /v1/metrics` exports Prometheus text. In production it is hidden unless `METRICS_TOKEN` is configured, then requires `Authorization: Bearer <token>`.
- `/docs` and `/docs/openapi.json` expose interactive and machine-readable API documentation when `SWAGGER_ENABLED=true`.

Readiness should control load-balancer traffic. Liveness should control process restarts. Do not use readiness as a liveness probe because a temporary database outage would create a restart loop.

## Production startup

1. Copy deployment variables to a secret manager or a non-committed `.env` file.
2. Generate long random values for `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `MINIO_ROOT_PASSWORD`, `SESSION_SECRET`, and `METRICS_TOKEN`.
3. Set `WEB_ORIGIN` to the exact HTTPS web origin and `PUBLIC_API_URL` to the public HTTPS API URL ending in `/v1`.
4. Run `docker compose -f docker-compose.production.yml config` and inspect the resolved configuration.
5. Run `docker compose -f docker-compose.production.yml up -d --build`.
6. Verify `/v1/health/ready`, run `API_BASE_URL=https://api.example.com/v1 pnpm e2e:smoke` against a staging environment, then inspect logs and metrics.

The production profile binds web and API to `127.0.0.1` by default. Put a TLS reverse proxy in front, or intentionally override the bind addresses when a secured external load balancer is present.

## Demo data

Demo data is opt-in and idempotent:

```bash
ALLOW_DEMO_SEED=true DEMO_EMAIL=demo@azez.local DEMO_PASSWORD='replace-with-a-strong-password' pnpm db:seed
```

Production seeding is blocked even with `ALLOW_DEMO_SEED=true`. Never enable the second production override on a customer database.

## Backup

The backup script creates a PostgreSQL custom-format dump and mirrors the private object bucket when the MinIO client is installed and S3 variables are present:

```bash
DATABASE_URL='postgresql://...' BACKUP_DIR=/secure/backups scripts/backup.sh
```

Encrypt backup storage, restrict access, copy it off the application host, define retention, and alert on missed backups. A backup is not considered valid until a restore drill succeeds.

## Restore drill

Use a disposable database first. The restore script intentionally refuses to run without explicit acknowledgement:

```bash
CONFIRM_RESTORE=YES DATABASE_URL='postgresql://disposable-target/...' scripts/restore.sh /secure/backups/20260714T120000Z
```

After restoration, run migrations, check row counts and tenant boundaries, validate several signed object downloads, and run the smoke test. Record recovery time and recovery point in the drill report.

## Rollback

Database migrations are forward-only. Before a release, take a verified backup and retain the previous container images. If application rollback is necessary, confirm the previous application can read the new schema. If not, restore the pre-release database into a new instance and switch traffic only after validation.

## Remaining production controls

- Configure centralized structured logs, alert rules, SMTP delivery monitoring, encrypted secrets, TLS, and scheduled restore drills.
- Disable Swagger in public production unless access is restricted at the network or reverse-proxy layer.
