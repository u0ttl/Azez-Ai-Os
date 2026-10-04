import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { KnowledgeService } from "../knowledge/knowledge.service.js";
import { AIGatewayService } from "./ai-gateway.service.js";
import { CreateConversationDto, SendMessageDto } from "./ai.dto.js";

@Injectable()
export class AIService {
  constructor(
    private readonly database: DatabaseService,
    private readonly knowledge: KnowledgeService,
    private readonly gateway: AIGatewayService,
  ) {}

  listConversations(organizationId: string, userId: string) {
    return this.database.client.conversation.findMany({
      where: { organizationId, userId, deletedAt: null },
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: "desc" }, take: 50,
    });
  }

  createConversation(organizationId: string, userId: string, input: CreateConversationDto) {
    return this.database.client.conversation.create({ data: { organizationId, userId, title: input.title.trim() } });
  }

  status(organizationId: string) {
    return this.gateway.status(organizationId);
  }

  async messages(organizationId: string, userId: string, conversationId: string) {
    await this.requireConversation(organizationId, userId, conversationId);
    return this.database.client.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" }, take: 200 });
  }

  async send(organizationId: string, userId: string, conversationId: string, input: SendMessageDto) {
    await this.requireConversation(organizationId, userId, conversationId);
    const context = input.knowledgeBaseId
      ? await this.knowledge.search(organizationId, input.knowledgeBaseId, input.content)
      : [];
    const completion = await this.gateway.answer(organizationId, input.content, context);
    const citations = context.map((item) => ({ chunkId: item.chunkId, documentId: item.document.id, title: item.document.title, score: item.score }));
    const [, assistant] = await this.database.client.$transaction([
      this.database.client.message.create({ data: { conversationId, role: "USER", content: input.content } }),
      this.database.client.message.create({ data: { conversationId, role: "ASSISTANT", content: completion.content, provider: completion.provider, model: completion.model, citations } }),
      this.database.client.aIUsage.create({ data: { organizationId, userId, provider: completion.provider, model: completion.model, operation: "chat", inputUnits: completion.inputUnits, outputUnits: completion.outputUnits } }),
      this.database.client.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
    ]);
    return assistant;
  }

  private async requireConversation(organizationId: string, userId: string, conversationId: string): Promise<void> {
    const conversation = await this.database.client.conversation.findFirst({ where: { id: conversationId, organizationId, userId, deletedAt: null }, select: { id: true } });
    if (!conversation) throw new NotFoundException({ code: "CONVERSATION_NOT_FOUND" });
  }
}
