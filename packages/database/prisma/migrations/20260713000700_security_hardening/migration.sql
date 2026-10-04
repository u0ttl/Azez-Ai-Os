CREATE TYPE "AccountTokenPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');
CREATE TYPE "EmailOutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "users"
  ADD COLUMN "email_verified_at" TIMESTAMP(3),
  ADD COLUMN "password_changed_at" TIMESTAMP(3);

ALTER TABLE "sessions"
  ADD COLUMN "ip_address" VARCHAR(64),
  ADD COLUMN "user_agent" VARCHAR(512),
  ADD COLUMN "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "revoke_reason" VARCHAR(80);

CREATE TABLE "account_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "purpose" "AccountTokenPurpose" NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_outbox" (
  "id" UUID NOT NULL,
  "recipient" VARCHAR(320) NOT NULL,
  "template" VARCHAR(80) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "EmailOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_tokens_token_hash_key" ON "account_tokens"("token_hash");
CREATE INDEX "account_tokens_user_id_purpose_expires_at_idx" ON "account_tokens"("user_id", "purpose", "expires_at");
CREATE INDEX "email_outbox_status_available_at_idx" ON "email_outbox"("status", "available_at");

ALTER TABLE "account_tokens"
  ADD CONSTRAINT "account_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
