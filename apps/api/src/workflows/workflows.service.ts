import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { EntitlementsService } from "../billing/entitlements.service.js";
import { WorkflowExecutorService } from "./workflow-executor.service.js";
import { AddWorkflowStepDto, CreateWorkflowDto, DecideApprovalDto, RunWorkflowDto, UpdateWorkflowStatusDto } from "./workflows.dto.js";

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly executor: WorkflowExecutorService,
    private readonly entitlements: EntitlementsService,
  ) {}

  list(organizationId: string) {
    return this.database.client.workflow.findMany({
      where: { organizationId, deletedAt: null }, include: { _count: { select: { steps: true, runs: true } } }, orderBy: { createdAt: "desc" },
    });
  }

  create(organizationId: string, input: CreateWorkflowDto) {
    return this.database.client.workflow.create({ data: { organizationId, name: input.name.trim(), description: input.description } });
  }

  async addStep(organizationId: string, workflowId: string, input: AddWorkflowStepDto) {
    const workflow = await this.requireWorkflow(organizationId, workflowId);
    if (workflow.status !== "DRAFT") throw new ConflictException({ code: "ACTIVE_WORKFLOW_IMMUTABLE" });
    return this.database.client.workflowStep.create({ data: { workflowId, name: input.name.trim(), position: input.position, actionType: input.actionType, config: input.config } });
  }

  async updateStatus(organizationId: string, workflowId: string, input: UpdateWorkflowStatusDto) {
    const workflow = await this.requireWorkflow(organizationId, workflowId);
    if (input.status === "ACTIVE") {
      const steps = await this.database.client.workflowStep.count({ where: { workflowId } });
      if (steps === 0) throw new BadRequestException({ code: "WORKFLOW_REQUIRES_STEP" });
    }
    return this.database.client.workflow.update({ where: { id: workflow.id }, data: { status: input.status } });
  }

  async run(organizationId: string, workflowId: string, userId: string, input: RunWorkflowDto) {
    const workflow = await this.requireWorkflow(organizationId, workflowId);
    if (workflow.status !== "ACTIVE") throw new ConflictException({ code: "WORKFLOW_NOT_ACTIVE" });
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const [limit, used] = await Promise.all([
      this.entitlements.getLimit(organizationId, "workflow.monthly_runs"),
      this.database.client.workflowRun.count({ where: { organizationId, startedAt: { gte: monthStart } } }),
    ]);
    if (limit !== null && used >= limit) throw new ConflictException({ code: "WORKFLOW_LIMIT_EXCEEDED" });
    const run = await this.database.client.workflowRun.create({ data: { organizationId, workflowId, triggeredByUserId: userId, input: input.input } });
    await this.database.client.usageEvent.create({ data: { organizationId, metric: "workflow.run", quantity: 1, idempotencyKey: `workflow-run:${run.id}` } });
    await this.executor.execute(organizationId, run.id);
    return this.database.client.workflowRun.findUnique({ where: { id: run.id }, include: { stepRuns: true, approvals: true } });
  }

  runs(organizationId: string) {
    return this.database.client.workflowRun.findMany({ where: { organizationId }, include: { workflow: { select: { name: true } }, approvals: true, stepRuns: true }, orderBy: { startedAt: "desc" }, take: 100 });
  }

  approvals(organizationId: string) {
    return this.database.client.workflowApproval.findMany({ where: { run: { organizationId }, status: "PENDING" }, include: { run: { include: { workflow: { select: { name: true } } } }, step: { select: { name: true } } }, orderBy: { createdAt: "asc" } });
  }

  async decide(organizationId: string, approvalId: string, userId: string, input: DecideApprovalDto) {
    const approval = await this.database.client.workflowApproval.findFirst({ where: { id: approvalId, run: { organizationId } }, include: { run: true, step: true } });
    if (!approval) throw new NotFoundException({ code: "APPROVAL_NOT_FOUND" });
    if (approval.status !== "PENDING") throw new ConflictException({ code: "APPROVAL_ALREADY_DECIDED" });
    const now = new Date();
    if (input.decision === "REJECTED") {
      await this.database.client.$transaction([
        this.database.client.workflowApproval.update({ where: { id: approvalId }, data: { status: "REJECTED", decidedById: userId, decisionComment: input.comment, decidedAt: now } }),
        this.database.client.workflowStepRun.updateMany({ where: { runId: approval.runId, stepId: approval.stepId, status: "WAITING_APPROVAL" }, data: { status: "FAILED", errorMessage: "Approval rejected", finishedAt: now } }),
        this.database.client.workflowRun.update({ where: { id: approval.runId }, data: { status: "CANCELLED", errorMessage: "Approval rejected", finishedAt: now } }),
      ]);
      return { status: "REJECTED" };
    }
    await this.database.client.$transaction([
      this.database.client.workflowApproval.update({ where: { id: approvalId }, data: { status: "APPROVED", decidedById: userId, decisionComment: input.comment, decidedAt: now } }),
      this.database.client.workflowStepRun.updateMany({ where: { runId: approval.runId, stepId: approval.stepId, status: "WAITING_APPROVAL" }, data: { status: "SUCCEEDED", output: { approvedBy: userId }, finishedAt: now } }),
      this.database.client.workflowRun.update({ where: { id: approval.runId }, data: { status: "RUNNING", currentPosition: approval.step.position + 1 } }),
    ]);
    await this.executor.execute(organizationId, approval.runId);
    return { status: "APPROVED" };
  }

  private async requireWorkflow(organizationId: string, workflowId: string) {
    const workflow = await this.database.client.workflow.findFirst({ where: { id: workflowId, organizationId, deletedAt: null } });
    if (!workflow) throw new NotFoundException({ code: "WORKFLOW_NOT_FOUND" });
    return workflow;
  }
}
