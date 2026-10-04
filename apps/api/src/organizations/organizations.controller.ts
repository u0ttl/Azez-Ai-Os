import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { Organization } from "@azez/database";
import { AuthenticatedRequest } from "../auth/auth.types.js";
import { CreateOrganizationDto } from "./create-organization.dto.js";
import { OrganizationsService } from "./organizations.service.js";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<Organization[]> {
    return this.organizations.list(request.auth.userId);
  }

  @Post()
  create(@Body() input: CreateOrganizationDto, @Req() request: AuthenticatedRequest): Promise<Organization> {
    return this.organizations.create(input, request.auth.userId);
  }
}
