ALTER TYPE "EmailOutboxStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
CREATE TYPE "FileScanStatus" AS ENUM ('PENDING', 'CLEAN', 'REJECTED', 'FAILED');

ALTER TABLE "email_outbox" ADD COLUMN "claimed_at" TIMESTAMP(3);

CREATE TABLE "file_assets" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "uploader_user_id" UUID NOT NULL,
  "storage_key" VARCHAR(500) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(160) NOT NULL,
  "size_bytes" BIGINT NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "scan_status" "FileScanStatus" NOT NULL DEFAULT 'PENDING',
  "scan_details" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_attachments" (
  "id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "file_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" VARCHAR(80) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "link" VARCHAR(500),
  "dedupe_key" VARCHAR(180),
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "file_assets_storage_key_key" ON "file_assets"("storage_key");
CREATE INDEX "file_assets_organization_id_created_at_idx" ON "file_assets"("organization_id", "created_at");
CREATE INDEX "file_assets_organization_id_checksum_idx" ON "file_assets"("organization_id", "checksum");
CREATE INDEX "file_assets_scan_status_created_at_idx" ON "file_assets"("scan_status", "created_at");
CREATE UNIQUE INDEX "task_attachments_file_id_key" ON "task_attachments"("file_id");
CREATE INDEX "task_attachments_task_id_created_at_idx" ON "task_attachments"("task_id", "created_at");
CREATE UNIQUE INDEX "notifications_organization_id_user_id_dedupe_key_key" ON "notifications"("organization_id", "user_id", "dedupe_key");
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");
CREATE INDEX "notifications_organization_id_created_at_idx" ON "notifications"("organization_id", "created_at");

ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_uploader_user_id_fkey" FOREIGN KEY ("uploader_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "email_outbox" SET "status" = 'PENDING', "claimed_at" = NULL WHERE "status" = 'FAILED' AND "attempts" < 5;
