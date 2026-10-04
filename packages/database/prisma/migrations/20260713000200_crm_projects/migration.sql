CREATE TYPE "CompanyStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'INACTIVE');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST');
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE "companies" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "email" VARCHAR(320),
  "phone" VARCHAR(40),
  "website" VARCHAR(300),
  "status" "CompanyStatus" NOT NULL DEFAULT 'PROSPECT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contacts" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "email" VARCHAR(320),
  "phone" VARCHAR(40),
  "job_title" VARCHAR(120),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leads" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "company_id" UUID,
  "title" VARCHAR(180) NOT NULL,
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "value_minor" BIGINT,
  "currency" CHAR(3) NOT NULL DEFAULT 'USD',
  "owner_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activities" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "company_id" UUID,
  "type" VARCHAR(40) NOT NULL,
  "subject" VARCHAR(200) NOT NULL,
  "notes" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "description" TEXT,
  "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
  "starts_at" TIMESTAMP(3),
  "due_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tasks" (
  "id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "description" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "assignee_user_id" UUID,
  "due_at" TIMESTAMP(3),
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "companies_organization_id_status_created_at_idx" ON "companies"("organization_id", "status", "created_at");
CREATE INDEX "companies_organization_id_name_idx" ON "companies"("organization_id", "name");
CREATE INDEX "contacts_company_id_created_at_idx" ON "contacts"("company_id", "created_at");
CREATE INDEX "leads_organization_id_status_created_at_idx" ON "leads"("organization_id", "status", "created_at");
CREATE INDEX "leads_company_id_idx" ON "leads"("company_id");
CREATE INDEX "activities_organization_id_occurred_at_idx" ON "activities"("organization_id", "occurred_at");
CREATE INDEX "activities_company_id_occurred_at_idx" ON "activities"("company_id", "occurred_at");
CREATE INDEX "projects_organization_id_status_created_at_idx" ON "projects"("organization_id", "status", "created_at");
CREATE INDEX "tasks_project_id_status_position_idx" ON "tasks"("project_id", "status", "position");
CREATE INDEX "tasks_assignee_user_id_status_idx" ON "tasks"("assignee_user_id", "status");

ALTER TABLE "companies" ADD CONSTRAINT "companies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
