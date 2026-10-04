import { Module } from "@nestjs/common";
import { KnowledgeController } from "./knowledge.controller.js";
import { KnowledgeService } from "./knowledge.service.js";
import { EmbeddingService } from "../ai/embedding.service.js";

@Module({ controllers: [KnowledgeController], providers: [KnowledgeService, EmbeddingService], exports: [KnowledgeService, EmbeddingService] })
export class KnowledgeModule {}
