import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../auth/auth.types.js";
import { assertOrganizationPermission } from "../auth/organization-access.js";
import { AddWorkflowStepDto, CreateWorkflowDto, DecideApprovalDto, RunWorkflowDto, UpdateWorkflowStatusDto } from "./workflows.dto.js";
import { WorkflowsService } from "./workflows.service.js";

@Controller("organizations/:organizationId/workflows")
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get() list(@Param("organizationId") organizationId: string, @Req() request: AuthenticatedRequest) { assertOrganizationPermission(request.auth, organizationId, "workflows.read"); return this.workflows.list(organizationId); }
  @Post() create(@Param("organizationId") organizationId: string, @Body() input: CreateWorkflowDto, @Req() request: AuthenticatedRequest) { assertOrganizationPermission(request.auth, organizationId, "workflows.manage"); return this.workflows.create(organizationId, input); }
  @Post(":workflowId/steps") addStep(@Param("organizationId") organizationId: string, @Param("workflowId") workflowId: string, @Body() input: AddWorkflowStepDto, @Req() request: AuthenticatedRequest) { assertOrganizationPermission(request.auth, organizationId, "workflows.manage"); return this.workflows.addStep(organizationId, workflowId, input); }
  @Patch(":workflowId/status") status(@Param("organizationId") organizationId: string, @Param("workflowId") workflowId: string, @Body() input: UpdateWorkflowStatusDto, @Req() request: AuthenticatedRequest) { assertOrganizationPermission(request.auth, organizationId, "workflows.manage"); return this.workflows.updateStatus(organizationId, workflowId, input); }
  @Post(":workflowId/runs") run(@Param("organizationId") organizationId: string, @Param("workflowId") workflowId: string, @Body() input: RunWorkflowDto, @Req() request: AuthenticatedRequest) { assertOrganizationPermission(request.auth, organizationId, "workflows.run"); return this.workflows.run(organizationId, workflowId, request.auth.userId, input); }
  @Get("runs/history") runs(@Param("organizationId") organizationId: string, @Req() request: AuthenticatedRequest) { assertOrganizationPermission(request.auth, organizationId, "workflows.read"); return this.workflows.runs(organizationId); }
  @Get("approvals/pending") approvals(@Param("organizationId") organizationId: string, @Req() request: AuthenticatedRequest) { assertOrganizationPermission(request.auth, organizationId, "workflows.approve"); return this.workflows.approvals(organizationId); }
  @Post("approvals/:approvalId/decision") decide(@Param("organizationId") organizationId: string, @Param("approvalId") approvalId: string, @Body() input: DecideApprovalDto, @Req() request: AuthenticatedRequest) { assertOrganizationPermission(request.auth, organizationId, "workflows.approve"); return this.workflows.decide(organizationId, approvalId, request.auth.userId, input); }
}
