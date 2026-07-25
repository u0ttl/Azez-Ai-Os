import { Module } from "@nestjs/common";
import { AIModule } from "../ai/ai.module.js";
import { EmailModule } from "../email/email.module.js";
import { FilesModule } from "../files/files.module.js";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";
import { PreviewMaintenanceController } from "./preview-maintenance.controller.js";

@Module({
  imports: [FilesModule, EmailModule, AIModule],
  controllers: [HealthController, PreviewMaintenanceController],
  providers: [HealthService],
})
export class HealthModule {}
