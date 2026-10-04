import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";

type Step = { id: string; position: number; name: string; actionType: "CREATE_TASK" | "CREATE_LEAD" | "HUMAN_APPROVAL"; config: unknown };

function objectConfig(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException({ code: "INVALID_STEP_CONFIG" });
  return value as Record<string, unknown>;
}

function requiredString(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== "string" || !value.trim()) throw new BadRequestException({ code: "MISSING_STEP_CONFIG", field: key });
  return value.trim();
}

export function validateWorkflowConfig(actionType: Step["actionType"], value: unknown): Record<string, unknown> {
  const config = objectConfig(value);
  if (actionType === "CREATE_TASK") {
    requiredString(config, "projectId");
    requiredString(config, "title");
  } else if (actionType === "CREATE_LEAD") {
    requiredString(config, "title");
  } else {
    requiredString(config, "summary");
  }
  return config;
}

@Injectable()
export class WorkflowExecutorService {
  constructor(private readonly database: DatabaseService) {}

  async execute(organizationId: string, runId: string): Promise<void> {
    const run = await this.database.client.workflowRun.findFirst({
      where: { id: runId, organizationId },
      include: { workflow: { include: { steps: { orderBy: { position: "asc" } } } } },
    });
    if (!run) throw new NotFoundException({ code: "WORKFLOW_RUN_NOT_FOUND" });
    const steps = run.workflow.steps as Step[];

    for (const step of steps.filter((item) => item.position >= run.currentPosition)) {
      const stepRun = await this.database.client.workflowStepRun.create({
        data: { runId, stepId: step.id, status: "RUNNING", input: objectConfig(step.config), startedAt: new Date() },
      });
      try {
        if (step.actionType === "HUMAN_APPROVAL") {
          const config = validateWorkflowConfig(step.actionType, step.config);
          await this.database.client.$transaction([
            this.database.client.workflowApproval.create({ data: { runId, stepId: step.id, requestedById: run.triggeredByUserId, summary: requiredString(config, "summary") } }),
            this.database.client.workflowStepRun.update({ where: { id: stepRun.id }, data: { status: "WAITING_APPROVAL" } }),
            this.database.client.workflowRun.update({ where: { id: runId }, data: { status: "WAITING_APPROVAL", currentPosition: step.position } }),
          ]);
          return;
        }

        const output = await this.executeAction(organizationId, step);
        await this.database.client.$transaction([
          this.database.client.workflowStepRun.update({ where: { id: stepRun.id }, data: { status: "SUCCEEDED", output, finishedAt: new Date() } }),
          this.database.client.workflowRun.update({ where: { id: runId }, data: { currentPosition: step.position + 1 } }),
        ]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown workflow error";
        await this.database.client.$transaction([
          this.database.client.workflowStepRun.update({ where: { id: stepRun.id }, data: { status: "FAILED", errorMessage: message, finishedAt: new Date() } }),
          this.database.client.workflowRun.update({ where: { id: runId }, data: { status: "FAILED", errorMessage: message, finishedAt: new Date() } }),
        ]);
        return;
      }
    }

    await this.database.client.workflowRun.update({ where: { id: runId }, data: { status: "SUCCEEDED", finishedAt: new Date() } });
  }

  private async executeAction(organizationId: string, step: Step): Promise<Record<string, string>> {
    const config = validateWorkflowConfig(step.actionType, step.config);
    if (step.actionType === "CREATE_TASK") {
      const projectId = requiredString(config, "projectId");
      const project = await this.database.client.project.findFirst({ where: { id: projectId, organizationId, deletedAt: null }, select: { id: true } });
      if (!project) throw new NotFoundException({ code: "PROJECT_NOT_FOUND" });
      const task = await this.database.client.task.create({ data: { projectId, title: requiredString(config, "title"), priority: "MEDIUM" } });
      return { taskId: task.id };
    }
    if (step.actionType === "CREATE_LEAD") {
      const lead = await this.database.client.lead.create({ data: { organizationId, title: requiredString(config, "title"), status: "NEW" } });
      return { leadId: lead.id };
    }
    throw new BadRequestException({ code: "UNSUPPORTED_WORKFLOW_ACTION" });
  }
}
