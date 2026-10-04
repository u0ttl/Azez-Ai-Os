# Security operations

## Required production settings

- Set `NODE_ENV=production`.
- Generate a unique `SESSION_SECRET` of at least 32 random characters.
- Set `WEB_ORIGIN` to the exact HTTPS web origin; never use a wildcard with credentialed CORS.
- Set `TRUST_PROXY=true` only behind a trusted reverse proxy that overwrites forwarded headers.
- Configure and test `SMTP_HOST`, credentials, and `EMAIL_FROM`, then set `REQUIRE_EMAIL_VERIFICATION=true`.
- Require `REDIS_URL` and `REDIS_REQUIRED=true` for distributed rate limiting.
- Require ClamAV with `MALWARE_SCAN_REQUIRED=true` before accepting untrusted uploads.
- Store database, object storage, AI, and email credentials in a secret manager.

## Authentication behavior

- Session tokens and account tokens are stored only as SHA-256 hashes.
- Session cookies are HttpOnly, Secure in production, SameSite=Lax, and scoped to `/`.
- Mutating API requests also require a signed CSRF cookie/header pair.
- Password reset tokens expire after 30 minutes and verification tokens after 24 hours.
- Resetting a password revokes all sessions; changing it revokes every session except the current one.
- Login failures use a generic response and are recorded without storing the submitted email in plain text.

## Distributed rate limiting

`SecurityRateLimiter` uses an atomic Redis script so counters are shared by every API replica. It applies a configurable global per-IP limit and tighter registration, login, verification, and password-recovery limits. Production fails closed if Redis is unavailable; development can use a bounded in-memory fallback. Apply limits at the reverse proxy as an additional layer, not as a replacement for application checks.

## Email outbox

The API transactionally creates a queued email payload alongside each account token. The built-in SMTP worker atomically claims pending rows, recovers stale claims, retries transient errors with backoff, and stops after five failures. Restrict database access because a pending payload contains the one-time link needed by the recipient.
