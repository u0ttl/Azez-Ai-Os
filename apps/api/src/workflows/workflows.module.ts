import { Module } from "@nestjs/common";
import { WorkflowExecutorService } from "./workflow-executor.service.js";
import { WorkflowsController } from "./workflows.controller.js";
import { WorkflowsService } from "./workflows.service.js";
import { BillingModule } from "../billing/billing.module.js";

@Module({ imports: [BillingModule], controllers: [WorkflowsController], providers: [WorkflowsService, WorkflowExecutorService] })
export class WorkflowsModule {}
