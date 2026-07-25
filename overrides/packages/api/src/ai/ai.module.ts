import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module.js";
import { KnowledgeModule } from "../knowledge/knowledge.module.js";
import { AIGatewayService } from "./ai-gateway.service.js";
import { AIController } from "./ai.controller.js";
import { AIService } from "./ai.service.js";

@Module({
  imports: [KnowledgeModule, BillingModule],
  controllers: [AIController],
  providers: [AIService, AIGatewayService],
  exports: [AIGatewayService],
})
export class AIModule {}
