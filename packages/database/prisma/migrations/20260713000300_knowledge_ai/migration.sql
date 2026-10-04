CREATE TYPE "DocumentStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED', 'ARCHIVED');
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');

CREATE TABLE "knowledge_bases" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_documents" (
  "id" UUID NOT NULL,
  "knowledge_base_id" UUID NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "source_type" VARCHAR(40) NOT NULL DEFAULT 'text',
  "checksum" VARCHAR(64) NOT NULL,
  "status" "DocumentStatus" NOT NULL DEFAULT 'PROCESSING',
  "version" INTEGER NOT NULL DEFAULT 1,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_chunks" (
  "id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "token_count" INTEGER,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversations" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "role" "MessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "provider" VARCHAR(60),
  "model" VARCHAR(100),
  "citations" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_usage" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "user_id" UUID,
  "provider" VARCHAR(60) NOT NULL,
  "model" VARCHAR(100) NOT NULL,
  "operation" VARCHAR(80) NOT NULL,
  "input_units" INTEGER NOT NULL DEFAULT 0,
  "output_units" INTEGER NOT NULL DEFAULT 0,
  "estimated_cost_minor" BIGINT NOT NULL DEFAULT 0,
  "currency" CHAR(3) NOT NULL DEFAULT 'USD',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "knowledge_bases_organization_id_created_at_idx" ON "knowledge_bases"("organization_id", "created_at");
CREATE UNIQUE INDEX "knowledge_documents_knowledge_base_id_checksum_version_key" ON "knowledge_documents"("knowledge_base_id", "checksum", "version");
CREATE INDEX "knowledge_documents_knowledge_base_id_status_created_at_idx" ON "knowledge_documents"("knowledge_base_id", "status", "created_at");
CREATE UNIQUE INDEX "document_chunks_document_id_position_key" ON "document_chunks"("document_id", "position");
CREATE INDEX "document_chunks_document_id_position_idx" ON "document_chunks"("document_id", "position");
CREATE INDEX "conversations_organization_id_user_id_updated_at_idx" ON "conversations"("organization_id", "user_id", "updated_at");
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
CREATE INDEX "ai_usage_organization_id_created_at_idx" ON "ai_usage"("organization_id", "created_at");

ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
