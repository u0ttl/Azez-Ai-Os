import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../auth/auth.types.js";
import { assertOrganizationPermission } from "../auth/organization-access.js";
import { BillingService } from "./billing.service.js";
import { SelectPlanDto } from "./billing.dto.js";

@Controller("organizations/:organizationId/billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("plans")
  plans(@Param("organizationId") organizationId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "billing.read");
    return this.billing.plans();
  }

  @Get("summary")
  summary(@Param("organizationId") organizationId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "billing.read");
    return this.billing.summary(organizationId);
  }

  @Post("select-plan")
  select(@Param("organizationId") organizationId: string, @Body() input: SelectPlanDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "billing.manage");
    return this.billing.selectPlan(organizationId, input.planCode);
  }
}
