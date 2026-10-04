import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../auth/auth.types.js";
import { assertOrganizationPermission } from "../auth/organization-access.js";
import { CreateConversationDto, SendMessageDto } from "./ai.dto.js";
import { AIService } from "./ai.service.js";

@Controller("organizations/:organizationId/ai")
export class AIController {
  constructor(private readonly ai: AIService) {}

  @Get("status")
  status(@Param("organizationId") organizationId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "ai.use");
    return this.ai.status(organizationId);
  }

  @Get("conversations")
  list(@Param("organizationId") organizationId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "ai.use");
    return this.ai.listConversations(organizationId, request.auth.userId);
  }

  @Post("conversations")
  create(@Param("organizationId") organizationId: string, @Body() input: CreateConversationDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "ai.use");
    return this.ai.createConversation(organizationId, request.auth.userId, input);
  }

  @Get("conversations/:conversationId/messages")
  messages(@Param("organizationId") organizationId: string, @Param("conversationId") conversationId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "ai.use");
    return this.ai.messages(organizationId, request.auth.userId, conversationId);
  }

  @Post("conversations/:conversationId/messages")
  send(@Param("organizationId") organizationId: string, @Param("conversationId") conversationId: string, @Body() input: SendMessageDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "ai.use");
    return this.ai.send(organizationId, request.auth.userId, conversationId, input);
  }
}
