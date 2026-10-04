import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";
import { FilesModule } from "../files/files.module.js";

@Module({
  imports: [FilesModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
