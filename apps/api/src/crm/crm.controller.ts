import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../auth/auth.types.js";
import { assertOrganizationPermission } from "../auth/organization-access.js";
import { CreateActivityDto, CreateCompanyDto, CreateContactDto, CreateLeadDto, ListCompaniesDto, UpdateCompanyDto, UpdateLeadStatusDto } from "./crm.dto.js";
import { CrmService } from "./crm.service.js";

@Controller("organizations/:organizationId/crm")
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get("companies")
  listCompanies(@Param("organizationId") organizationId: string, @Query() query: ListCompaniesDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "crm.read");
    return this.crm.listCompanies(organizationId, query);
  }

  @Get("companies/:companyId")
  companyDetails(@Param("organizationId") organizationId: string, @Param("companyId") companyId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "crm.read");
    return this.crm.companyDetails(organizationId, companyId);
  }

  @Post("companies")
  createCompany(@Param("organizationId") organizationId: string, @Body() input: CreateCompanyDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "crm.write");
    return this.crm.createCompany(organizationId, input);
  }

  @Patch("companies/:companyId")
  updateCompany(@Param("organizationId") organizationId: string, @Param("companyId") companyId: string, @Body() input: UpdateCompanyDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "crm.write");
    return this.crm.updateCompany(organizationId, companyId, input);
  }

  @Post("companies/:companyId/contacts")
  createContact(@Param("organizationId") organizationId: string, @Param("companyId") companyId: string, @Body() input: CreateContactDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "crm.write");
    return this.crm.createContact(organizationId, companyId, input);
  }

  @Post("companies/:companyId/activities")
  createActivity(@Param("organizationId") organizationId: string, @Param("companyId") companyId: string, @Body() input: CreateActivityDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "crm.write");
    return this.crm.createActivity(organizationId, companyId, request.auth.userId, input);
  }

  @Get("leads")
  listLeads(@Param("organizationId") organizationId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "crm.read");
    return this.crm.listLeads(organizationId);
  }

  @Post("leads")
  createLead(@Param("organizationId") organizationId: string, @Body() input: CreateLeadDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "crm.write");
    return this.crm.createLead(organizationId, request.auth.userId, input);
  }

  @Patch("leads/:leadId/status")
  updateLeadStatus(@Param("organizationId") organizationId: string, @Param("leadId") leadId: string, @Body() input: UpdateLeadStatusDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "crm.write");
    return this.crm.updateLeadStatus(organizationId, leadId, input);
  }
}
