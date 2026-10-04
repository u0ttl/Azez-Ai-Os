CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "WorkflowTriggerType" AS ENUM ('MANUAL', 'SCHEDULE', 'EVENT');
CREATE TYPE "WorkflowActionType" AS ENUM ('CREATE_TASK', 'CREATE_LEAD', 'HUMAN_APPROVAL');
CREATE TYPE "WorkflowRunStatus" AS ENUM ('RUNNING', 'WAITING_APPROVAL', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "StepRunStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING_APPROVAL', 'SUCCEEDED', 'FAILED', 'SKIPPED');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "workflows" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "name" VARCHAR(180) NOT NULL,
  "description" TEXT, "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
  "trigger_type" "WorkflowTriggerType" NOT NULL DEFAULT 'MANUAL', "trigger_config" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, "deleted_at" TIMESTAMP(3), CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_steps" (
  "id" UUID NOT NULL, "workflow_id" UUID NOT NULL, "name" VARCHAR(180) NOT NULL,
  "position" INTEGER NOT NULL, "action_type" "WorkflowActionType" NOT NULL, "config" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_runs" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "workflow_id" UUID NOT NULL,
  "triggered_by_user_id" UUID, "status" "WorkflowRunStatus" NOT NULL DEFAULT 'RUNNING',
  "input" JSONB, "output" JSONB, "error_message" TEXT, "current_position" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "finished_at" TIMESTAMP(3),
  CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_step_runs" (
  "id" UUID NOT NULL, "run_id" UUID NOT NULL, "step_id" UUID NOT NULL,
  "status" "StepRunStatus" NOT NULL DEFAULT 'PENDING', "attempt" INTEGER NOT NULL DEFAULT 1,
  "input" JSONB, "output" JSONB, "error_message" TEXT, "started_at" TIMESTAMP(3), "finished_at" TIMESTAMP(3),
  CONSTRAINT "workflow_step_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_approvals" (
  "id" UUID NOT NULL, "run_id" UUID NOT NULL, "step_id" UUID NOT NULL,
  "requested_by_id" UUID, "decided_by_id" UUID, "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "summary" VARCHAR(500) NOT NULL, "decision_comment" VARCHAR(1000),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "decided_at" TIMESTAMP(3),
  CONSTRAINT "workflow_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workflows_organization_id_status_created_at_idx" ON "workflows"("organization_id", "status", "created_at");
CREATE UNIQUE INDEX "workflow_steps_workflow_id_position_key" ON "workflow_steps"("workflow_id", "position");
CREATE INDEX "workflow_steps_workflow_id_position_idx" ON "workflow_steps"("workflow_id", "position");
CREATE INDEX "workflow_runs_organization_id_status_started_at_idx" ON "workflow_runs"("organization_id", "status", "started_at");
CREATE INDEX "workflow_runs_workflow_id_started_at_idx" ON "workflow_runs"("workflow_id", "started_at");
CREATE UNIQUE INDEX "workflow_step_runs_run_id_step_id_attempt_key" ON "workflow_step_runs"("run_id", "step_id", "attempt");
CREATE INDEX "workflow_step_runs_run_id_status_idx" ON "workflow_step_runs"("run_id", "status");
CREATE INDEX "workflow_approvals_run_id_status_idx" ON "workflow_approvals"("run_id", "status");
CREATE INDEX "workflow_approvals_status_created_at_idx" ON "workflow_approvals"("status", "created_at");

ALTER TABLE "workflows" ADD CONSTRAINT "workflows_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "workflow_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "workflow_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
