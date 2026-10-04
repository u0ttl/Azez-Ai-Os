import { BadRequestException, Controller, Delete, Get, Param, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../auth/auth.types.js";
import { assertOrganizationPermission } from "../auth/organization-access.js";
import { FilesService } from "./files.service.js";

@Controller("organizations/:organizationId/projects/:projectId/tasks/:taskId/attachments")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  async upload(@Param("organizationId") organizationId: string, @Param("projectId") projectId: string, @Param("taskId") taskId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "projects.write");
    const part = await request.file();
    if (!part) throw new BadRequestException({ code: "FILE_REQUIRED" });
    return this.files.uploadTaskAttachment(organizationId, projectId, taskId, request.auth.userId, part);
  }

  @Get()
  list(@Param("organizationId") organizationId: string, @Param("projectId") projectId: string, @Param("taskId") taskId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "projects.read");
    return this.files.listTaskAttachments(organizationId, projectId, taskId);
  }

  @Get(":attachmentId/download")
  download(@Param("organizationId") organizationId: string, @Param("projectId") projectId: string, @Param("taskId") taskId: string, @Param("attachmentId") attachmentId: string, @Req() request: AuthenticatedRequest) {
    assertOrganizationPermission(request.auth, organizationId, "projects.read");
    return this.files.downloadTaskAttachment(organizationId, projectId, taskId, attachmentId);
  }

  @Delete(":attachmentId")
  async remove(@Param("organizationId") organizationId: string, @Param("projectId") projectId: string, @Param("taskId") taskId: string, @Param("attachmentId") attachmentId: string, @Req() request: AuthenticatedRequest): Promise<{ success: true }> {
    assertOrganizationPermission(request.auth, organizationId, "projects.write");
    await this.files.deleteTaskAttachment(organizationId, projectId, taskId, attachmentId);
    return { success: true };
  }
}
