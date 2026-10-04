CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'ARCHIVED');
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
CREATE TYPE "BillingEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

CREATE TABLE "plans" (
  "id" UUID NOT NULL, "code" VARCHAR(40) NOT NULL, "name" VARCHAR(120) NOT NULL,
  "description" TEXT, "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plan_prices" (
  "id" UUID NOT NULL, "plan_id" UUID NOT NULL, "amount_minor" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'USD', "interval" "BillingInterval" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plan_entitlements" (
  "id" UUID NOT NULL, "plan_id" UUID NOT NULL, "key" VARCHAR(100) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true, "limit_value" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "plan_id" UUID NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE', "provider" VARCHAR(40) NOT NULL DEFAULT 'internal',
  "provider_customer_id" VARCHAR(180), "provider_reference" VARCHAR(180),
  "current_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "current_period_end" TIMESTAMP(3),
  "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usage_events" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "metric" VARCHAR(100) NOT NULL,
  "quantity" BIGINT NOT NULL DEFAULT 1, "idempotency_key" VARCHAR(180) NOT NULL,
  "metadata" JSONB, "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_webhook_events" (
  "id" UUID NOT NULL, "provider" VARCHAR(40) NOT NULL, "external_id" VARCHAR(180) NOT NULL,
  "status" "BillingEventStatus" NOT NULL DEFAULT 'RECEIVED', "payload_checksum" VARCHAR(64) NOT NULL,
  "error_message" TEXT, "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "processed_at" TIMESTAMP(3),
  CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");
CREATE UNIQUE INDEX "plan_prices_plan_id_currency_interval_key" ON "plan_prices"("plan_id", "currency", "interval");
CREATE UNIQUE INDEX "plan_entitlements_plan_id_key_key" ON "plan_entitlements"("plan_id", "key");
CREATE INDEX "subscriptions_organization_id_status_created_at_idx" ON "subscriptions"("organization_id", "status", "created_at");
CREATE INDEX "subscriptions_provider_provider_reference_idx" ON "subscriptions"("provider", "provider_reference");
CREATE UNIQUE INDEX "usage_events_idempotency_key_key" ON "usage_events"("idempotency_key");
CREATE INDEX "usage_events_organization_id_metric_occurred_at_idx" ON "usage_events"("organization_id", "metric", "occurred_at");
CREATE UNIQUE INDEX "billing_webhook_events_provider_external_id_key" ON "billing_webhook_events"("provider", "external_id");
CREATE INDEX "billing_webhook_events_status_received_at_idx" ON "billing_webhook_events"("status", "received_at");

ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_entitlements" ADD CONSTRAINT "plan_entitlements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "plans" ("id", "code", "name", "description", "status", "updated_at") VALUES
('00000000-0000-4000-8000-00000000f001', 'FREE', 'مجاني', 'لبدء تجربة مساحة العمل والميزات الأساسية.', 'ACTIVE', CURRENT_TIMESTAMP),
('00000000-0000-4000-8000-00000000f002', 'GROWTH', 'النمو', 'للشركات التي تحتاج حدودًا أكبر وأتمتة موسعة.', 'ACTIVE', CURRENT_TIMESTAMP),
('00000000-0000-4000-8000-00000000f003', 'ENTERPRISE', 'المؤسسات', 'حدود واتفاقيات ونشر مخصص بعد المراجعة.', 'ACTIVE', CURRENT_TIMESTAMP);

INSERT INTO "plan_prices" ("id", "plan_id", "amount_minor", "currency", "interval") VALUES
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f001', 0, 'USD', 'MONTH'),
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f001', 0, 'USD', 'YEAR');

INSERT INTO "plan_entitlements" ("id", "plan_id", "key", "limit_value", "updated_at") VALUES
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f001', 'seats', 3, CURRENT_TIMESTAMP),
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f001', 'ai.daily_requests', 20, CURRENT_TIMESTAMP),
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f001', 'workflow.monthly_runs', 100, CURRENT_TIMESTAMP),
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f001', 'storage.mb', 500, CURRENT_TIMESTAMP),
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f002', 'seats', 25, CURRENT_TIMESTAMP),
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f002', 'ai.daily_requests', 500, CURRENT_TIMESTAMP),
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f002', 'workflow.monthly_runs', 5000, CURRENT_TIMESTAMP),
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f002', 'storage.mb', 10000, CURRENT_TIMESTAMP),
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f003', 'seats', NULL, CURRENT_TIMESTAMP),
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f003', 'ai.daily_requests', NULL, CURRENT_TIMESTAMP),
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f003', 'workflow.monthly_runs', NULL, CURRENT_TIMESTAMP),
(gen_random_uuid(), '00000000-0000-4000-8000-00000000f003', 'storage.mb', NULL, CURRENT_TIMESTAMP);
