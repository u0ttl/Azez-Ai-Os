import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { AddProjectMemberDto, CreateProjectDto, CreateTaskCommentDto, CreateTaskDto, ListProjectsDto, UpdateTaskDto } from "./projects.dto.js";

@Injectable()
export class ProjectsService {
  constructor(private readonly database: DatabaseService, private readonly notifications: NotificationsService) {}

  list(organizationId: string, query: ListProjectsDto) {
    const search = query.search?.trim();
    return this.database.client.project.findMany({
      where: {
        organizationId, deletedAt: null, status: query.status,
        ...(search ? { OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ] } : {}),
      },
      include: { _count: { select: { tasks: true, members: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async details(organizationId: string, projectId: string) {
    const project = await this.database.client.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } },
        tasks: { where: { deletedAt: null }, include: { _count: { select: { comments: true } } }, orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "asc" }] },
      },
    });
    if (!project) throw new NotFoundException({ code: "PROJECT_NOT_FOUND" });
    const assigneeIds = [...new Set(project.tasks.map((task: (typeof project.tasks)[number]) => task.assigneeUserId).filter((id: string | null): id is string => Boolean(id)))];
    const assignees = assigneeIds.length ? await this.database.client.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true, email: true } }) : [];
    const byId = new Map(assignees.map((user: (typeof assignees)[number]) => [user.id, user]));
    return { ...project, tasks: project.tasks.map((task: (typeof project.tasks)[number]) => ({ ...task, assignee: task.assigneeUserId ? byId.get(task.assigneeUserId) ?? null : null })) };
  }

  async create(organizationId: string, userId: string, input: CreateProjectDto) {
    const projectId = randomUUID();
    const [project] = await this.database.client.$transaction([
      this.database.client.project.create({
        data: { id: projectId, organizationId, name: input.name.trim(), description: input.description, status: input.status, dueAt: input.dueAt ? new Date(input.dueAt) : undefined },
      }),
      this.database.client.projectMember.create({ data: { projectId, userId, role: "MANAGER" } }),
    ]);
    return project;
  }

  availableAssignees(organizationId: string) {
    return this.database.client.membership.findMany({
      where: { organizationId, status: "ACTIVE", user: { status: "ACTIVE" } },
      select: { role: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
  }

  async addMember(organizationId: string, projectId: string, input: AddProjectMemberDto) {
    await this.requireProject(organizationId, projectId);
    await this.requireOrganizationMember(organizationId, input.userId);
    return this.database.client.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: input.userId } },
      create: { projectId, userId: input.userId, role: input.role },
      update: { role: input.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async tasks(organizationId: string, projectId: string) {
    await this.requireProject(organizationId, projectId);
    return this.database.client.task.findMany({ where: { projectId, deletedAt: null }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  }

  async createTask(organizationId: string, projectId: string, input: CreateTaskDto) {
    await this.requireProject(organizationId, projectId);
    if (input.assigneeUserId) {
      await this.requireOrganizationMember(organizationId, input.assigneeUserId);
      await this.database.client.projectMember.upsert({
        where: { projectId_userId: { projectId, userId: input.assigneeUserId } },
        create: { projectId, userId: input.assigneeUserId, role: "MEMBER" }, update: {},
      });
    }
    const task = await this.database.client.task.create({
      data: { projectId, title: input.title.trim(), description: input.description, priority: input.priority, dueAt: input.dueAt ? new Date(input.dueAt) : undefined, assigneeUserId: input.assigneeUserId, position: input.position },
    });
    if (input.assigneeUserId) await this.notifications.create({ organizationId, userId: input.assigneeUserId, type: "TASK_ASSIGNED", title: "مهمة جديدة مسندة إليك", body: task.title, link: `/projects?project=${projectId}&task=${task.id}`, dedupeKey: `task-assigned:${task.id}:${input.assigneeUserId}` });
    return task;
  }

  async updateTask(organizationId: string, projectId: string, taskId: string, input: UpdateTaskDto) {
    await this.requireTask(organizationId, projectId, taskId);
    if (input.assigneeUserId) await this.requireOrganizationMember(organizationId, input.assigneeUserId);
    const previous = await this.database.client.task.findUnique({ where: { id: taskId }, select: { assigneeUserId: true } });
    const task = await this.database.client.task.update({
      where: { id: taskId },
      data: {
        ...input,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
        completedAt: input.status === "DONE" ? new Date() : input.status ? null : undefined,
      },
    });
    if (input.assigneeUserId && input.assigneeUserId !== previous?.assigneeUserId) await this.notifications.create({ organizationId, userId: input.assigneeUserId, type: "TASK_ASSIGNED", title: "تم إسناد مهمة إليك", body: task.title, link: `/projects?project=${projectId}&task=${task.id}`, dedupeKey: `task-assigned:${task.id}:${input.assigneeUserId}` });
    return task;
  }

  async comments(organizationId: string, projectId: string, taskId: string) {
    await this.requireTask(organizationId, projectId, taskId);
    return this.database.client.taskComment.findMany({
      where: { taskId, deletedAt: null }, include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" }, take: 200,
    });
  }

  async addComment(organizationId: string, projectId: string, taskId: string, userId: string, input: CreateTaskCommentDto) {
    await this.requireTask(organizationId, projectId, taskId);
    const comment = await this.database.client.taskComment.create({
      data: { taskId, authorId: userId, content: input.content.trim() }, include: { author: { select: { id: true, name: true } } },
    });
    const task = await this.database.client.task.findUnique({ where: { id: taskId }, select: { title: true, assigneeUserId: true } });
    if (task?.assigneeUserId && task.assigneeUserId !== userId) await this.notifications.create({ organizationId, userId: task.assigneeUserId, type: "TASK_COMMENT", title: "تعليق جديد على مهمة", body: `${comment.author.name}: ${input.content.trim().slice(0, 300)}`, link: `/projects?project=${projectId}&task=${taskId}` });
    return comment;
  }

  private async requireProject(organizationId: string, projectId: string): Promise<void> {
    const project = await this.database.client.project.findFirst({ where: { id: projectId, organizationId, deletedAt: null }, select: { id: true } });
    if (!project) throw new NotFoundException({ code: "PROJECT_NOT_FOUND" });
  }

  private async requireTask(organizationId: string, projectId: string, taskId: string): Promise<void> {
    const task = await this.database.client.task.findFirst({ where: { id: taskId, projectId, deletedAt: null, project: { organizationId, deletedAt: null } }, select: { id: true } });
    if (!task) throw new NotFoundException({ code: "TASK_NOT_FOUND" });
  }

  private async requireOrganizationMember(organizationId: string, userId: string): Promise<void> {
    const member = await this.database.client.membership.findFirst({ where: { organizationId, userId, status: "ACTIVE", user: { status: "ACTIVE" } }, select: { id: true } });
    if (!member) throw new BadRequestException({ code: "ASSIGNEE_NOT_IN_ORGANIZATION" });
  }
}
