import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "./auth/auth.guard.js";
import { AuthModule } from "./auth/auth.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { OrganizationsModule } from "./organizations/organizations.module.js";
import { CrmModule } from "./crm/crm.module.js";
import { ProjectsModule } from "./projects/projects.module.js";
import { KnowledgeModule } from "./knowledge/knowledge.module.js";
import { AIModule } from "./ai/ai.module.js";
import { WorkflowsModule } from "./workflows/workflows.module.js";
import { BillingModule } from "./billing/billing.module.js";
import { CsrfGuard } from "./security/csrf.guard.js";
import { SecurityModule } from "./security/security.module.js";
import { EmailModule } from "./email/email.module.js";
import { FilesModule } from "./files/files.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { MetricsModule } from "./metrics/metrics.module.js";
import { RedisModule } from "./redis/redis.module.js";

@Module({
  imports: [DatabaseModule, RedisModule, MetricsModule, HealthModule, SecurityModule, EmailModule, NotificationsModule, AuthModule, OrganizationsModule, CrmModule, ProjectsModule, FilesModule, KnowledgeModule, AIModule, WorkflowsModule, BillingModule],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
