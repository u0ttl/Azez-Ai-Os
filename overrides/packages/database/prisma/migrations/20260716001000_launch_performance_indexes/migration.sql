CREATE INDEX IF NOT EXISTS "conversations_user_id_idx" ON "conversations" ("user_id");
CREATE INDEX IF NOT EXISTS "file_assets_uploader_user_id_idx" ON "file_assets" ("uploader_user_id");
CREATE INDEX IF NOT EXISTS "subscriptions_plan_id_idx" ON "subscriptions" ("plan_id");
CREATE INDEX IF NOT EXISTS "workflow_approvals_step_id_idx" ON "workflow_approvals" ("step_id");
CREATE INDEX IF NOT EXISTS "workflow_step_runs_step_id_idx" ON "workflow_step_runs" ("step_id");
