import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../auth/auth.types.js";
import { assertOrganizationPermission } from "../auth/organization-access.js";
import { AddProjectMemberDto, CreateProjectDto, CreateTaskCommentDto, CreateTaskDto, ListProjectsDto, UpdateTaskDto } from "./projects.dto.js";
import { ProjectsService } from "./projects.service.js";

@Controller("organizations/:organizationId/projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@Param("organizationId") organizationId: string, @Query() query: ListProjectsDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "projects.read");
    return this.projects.list(organizationId, query);
  }

  @Post()
  create(@Param("organizationId") organizationId: string, @Body() input: CreateProjectDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "projects.write");
    return this.projects.create(organizationId, request.auth.userId, input);
  }

  @Get("available-assignees")
  assignees(@Param("organizationId") organizationId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "projects.read");
    return this.projects.availableAssignees(organizationId);
  }

  @Get(":projectId")
  details(@Param("organizationId") organizationId: string, @Param("projectId") projectId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "projects.read");
    return this.projects.details(organizationId, projectId);
  }

  @Post(":projectId/members")
  addMember(@Param("organizationId") organizationId: string, @Param("projectId") projectId: string, @Body() input: AddProjectMemberDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "projects.write");
    return this.projects.addMember(organizationId, projectId, input);
  }

  @Get(":projectId/tasks")
  tasks(@Param("organizationId") organizationId: string, @Param("projectId") projectId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "projects.read");
    return this.projects.tasks(organizationId, projectId);
  }

  @Post(":projectId/tasks")
  createTask(@Param("organizationId") organizationId: string, @Param("projectId") projectId: string, @Body() input: CreateTaskDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "projects.write");
    return this.projects.createTask(organizationId, projectId, input);
  }

  @Patch(":projectId/tasks/:taskId")
  updateTask(@Param("organizationId") organizationId: string, @Param("projectId") projectId: string, @Param("taskId") taskId: string, @Body() input: UpdateTaskDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "projects.write");
    return this.projects.updateTask(organizationId, projectId, taskId, input);
  }

  @Get(":projectId/tasks/:taskId/comments")
  comments(@Param("organizationId") organizationId: string, @Param("projectId") projectId: string, @Param("taskId") taskId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "projects.read");
    return this.projects.comments(organizationId, projectId, taskId);
  }

  @Post(":projectId/tasks/:taskId/comments")
  addComment(@Param("organizationId") organizationId: string, @Param("projectId") projectId: string, @Param("taskId") taskId: string, @Body() input: CreateTaskCommentDto, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "projects.write");
    return this.projects.addComment(organizationId, projectId, taskId, request.auth.userId, input);
  }
}
