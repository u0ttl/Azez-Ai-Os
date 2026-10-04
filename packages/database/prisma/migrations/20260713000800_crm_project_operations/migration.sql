ALTER TABLE "activities"
  ADD COLUMN "contact_id" UUID,
  ADD COLUMN "lead_id" UUID,
  ADD COLUMN "created_by_user_id" UUID;

ALTER TABLE "tasks"
  ADD COLUMN "completed_at" TIMESTAMP(3);

CREATE TABLE "project_members" (
  "id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" VARCHAR(40) NOT NULL DEFAULT 'MEMBER',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_comments" (
  "id" UUID NOT NULL,
  "task_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activities_contact_id_occurred_at_idx" ON "activities"("contact_id", "occurred_at");
CREATE INDEX "activities_lead_id_occurred_at_idx" ON "activities"("lead_id", "occurred_at");
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");
CREATE INDEX "project_members_user_id_created_at_idx" ON "project_members"("user_id", "created_at");
CREATE INDEX "task_comments_task_id_created_at_idx" ON "task_comments"("task_id", "created_at");
CREATE INDEX "task_comments_author_id_created_at_idx" ON "task_comments"("author_id", "created_at");

ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "project_members" ("id", "project_id", "user_id", "role")
SELECT gen_random_uuid(), project."id", membership."user_id", 'MANAGER'
FROM "projects" project
JOIN "memberships" membership ON membership."organization_id" = project."organization_id"
WHERE project."deleted_at" IS NULL
  AND membership."status" = 'ACTIVE'
  AND membership."role" = 'OWNER'
ON CONFLICT ("project_id", "user_id") DO NOTHING;

UPDATE "tasks" SET "completed_at" = "updated_at" WHERE "status" = 'DONE' AND "completed_at" IS NULL;
