import { Module } from "@nestjs/common";
import { EmailTemplateService } from "./email-template.service.js";
import { EmailWorkerService } from "./email-worker.service.js";

@Module({
  providers: [EmailTemplateService, EmailWorkerService],
  exports: [EmailTemplateService, EmailWorkerService],
})
export class EmailModule {}
