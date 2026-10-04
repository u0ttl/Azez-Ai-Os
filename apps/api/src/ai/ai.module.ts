import { Module } from "@nestjs/common";
import { KnowledgeModule } from "../knowledge/knowledge.module.js";
import { AIGatewayService } from "./ai-gateway.service.js";
import { AIController } from "./ai.controller.js";
import { AIService } from "./ai.service.js";
import { BillingModule } from "../billing/billing.module.js";

@Module({ imports: [KnowledgeModule, BillingModule], controllers: [AIController], providers: [AIService, AIGatewayService] })
export class AIModule {}
