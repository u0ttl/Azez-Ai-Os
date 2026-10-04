import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../auth/auth.types.js";
import { assertOrganizationPermission } from "../auth/organization-access.js";
import { AddTextDocumentDto, CreateKnowledgeBaseDto, SearchKnowledgeDto } from "./knowledge.dto.js";
import { KnowledgeService } from "./knowledge.service.js";

@Controller("organizations/:organizationId/knowledge")
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get("bases")
  listBases(@Param("organizationId") organizationId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "knowledge.read");
    return this.knowledge.listBases(organizationId);
  }

  @Post("bases")
  createBase(@Param("organizationId") organizationId: string, @Body() input: CreateKnowledgeBaseDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "knowledge.write");
    return this.knowledge.createBase(organizationId, input);
  }

  @Get("bases/:baseId/documents")
  documents(@Param("organizationId") organizationId: string, @Param("baseId") baseId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "knowledge.read");
    return this.knowledge.listDocuments(organizationId, baseId);
  }

  @Post("bases/:baseId/documents/text")
  addText(@Param("organizationId") organizationId: string, @Param("baseId") baseId: string, @Body() input: AddTextDocumentDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "knowledge.write");
    return this.knowledge.addTextDocument(organizationId, baseId, input);
  }

  @Post("bases/:baseId/search")
  search(@Param("organizationId") organizationId: string, @Param("baseId") baseId: string, @Body() input: SearchKnowledgeDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "knowledge.read");
    return this.knowledge.search(organizationId, baseId, input.query);
  }
}
