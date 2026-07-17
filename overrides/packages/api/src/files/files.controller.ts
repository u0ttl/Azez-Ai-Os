import { BadRequestException, Controller, Delete, Get, Param, Post, Req, Res, StreamableFile } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { assertOrganizationPermission } from "../auth/organization-access.js";
import { FilesService } from "./files.service.js";

@Controller("organizations/:organizationId/projects/:projectId/tasks/:taskId/attachments")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  async upload(
    @Param("organizationId") organizationId: string,
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    assertOrganizationPermission(request.auth, organizationId, "projects.write");
    const part = await request.file();
    if (!part) throw new BadRequestException({ code: "FILE_REQUIRED" });
    return this.files.uploadTaskAttachment(organizationId, projectId, taskId, request.auth.userId, part);
  }

  @Get()
  list(
    @Param("organizationId") organizationId: string,
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    assertOrganizationPermission(request.auth, organizationId, "projects.read");
    return this.files.listTaskAttachments(organizationId, projectId, taskId);
  }

  @Get(":attachmentId/download")
  download(
    @Param("organizationId") organizationId: string,
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @Param("attachmentId") attachmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    assertOrganizationPermission(request.auth, organizationId, "projects.read");
    return this.files.downloadTaskAttachment(organizationId, projectId, taskId, attachmentId);
  }

  @Get(":attachmentId/content")
  async content(
    @Param("organizationId") organizationId: string,
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @Param("attachmentId") attachmentId: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<StreamableFile> {
    assertOrganizationPermission(request.auth, organizationId, "projects.read");
    const stored = await this.files.readTaskAttachment(organizationId, projectId, taskId, attachmentId);
    reply.header("content-type", stored.mimeType);
    reply.header("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(stored.fileName)}`);
    reply.header("cache-control", "private, no-store");
    return new StreamableFile(stored.body);
  }

  @Delete(":attachmentId")
  async remove(
    @Param("organizationId") organizationId: string,
    @Param("projectId") projectId: string,
    @Param("taskId") taskId: string,
    @Param("attachmentId") attachmentId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ success: true }> {
    assertOrganizationPermission(request.auth, organizationId, "projects.write");
    await this.files.deleteTaskAttachment(organizationId, projectId, taskId, attachmentId);
    return { success: true };
  }
}
