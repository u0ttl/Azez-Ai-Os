import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service.js";
import { EntitlementsService } from "../billing/entitlements.service.js";
import { validateFile } from "./file-validation.js";
import { ObjectStorageService } from "./object-storage.service.js";
import { MalwareScannerService } from "./malware-scanner.service.js";

@Injectable()
export class FilesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: ObjectStorageService,
    private readonly entitlements: EntitlementsService,
    private readonly scanner: MalwareScannerService,
  ) {}

  async uploadTaskAttachment(
    organizationId: string,
    projectId: string,
    taskId: string,
    userId: string,
    part: MultipartFile,
  ) {
    await this.requireTask(organizationId, projectId, taskId);
    const buffer = await part.toBuffer();
    const validated = validateFile(
      buffer,
      part.filename,
      part.mimetype,
      Number(process.env.FILE_MAX_BYTES ?? 10 * 1024 * 1024),
    );
    const scan = await this.scanner.scan(buffer);
    const limitMb = await this.entitlements.getLimit(organizationId, "storage.mb");
    if (limitMb !== null) {
      const usage = await this.database.client.fileAsset.aggregate({
        where: { organizationId, deletedAt: null },
        _sum: { sizeBytes: true },
      });
      if ((usage._sum.sizeBytes ?? 0n) + BigInt(validated.sizeBytes) > BigInt(limitMb) * 1024n * 1024n) {
        throw new ForbiddenException({ code: "STORAGE_LIMIT_EXCEEDED", limitMb });
      }
    }

    const fileId = randomUUID();
    const storageKey = `${organizationId}/tasks/${taskId}/${fileId}/${validated.fileName}`;
    await this.storage.put(storageKey, buffer, validated.mimeType, validated.checksum);
    try {
      const [file] = await this.database.client.$transaction([
        this.database.client.fileAsset.create({
          data: {
            id: fileId,
            organizationId,
            uploaderUserId: userId,
            storageKey,
            fileName: validated.fileName,
            mimeType: validated.mimeType,
            sizeBytes: BigInt(validated.sizeBytes),
            checksum: validated.checksum,
            scanStatus: "CLEAN",
            scanDetails: scan.scanDetails,
          },
        }),
        this.database.client.taskAttachment.create({ data: { taskId, fileId } }),
      ]);
      return this.serialize(file);
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async listTaskAttachments(organizationId: string, projectId: string, taskId: string) {
    await this.requireTask(organizationId, projectId, taskId);
    const attachments = await this.database.client.taskAttachment.findMany({
      where: {
        taskId,
        file: { organizationId, deletedAt: null, scanStatus: "CLEAN" },
      },
      include: {
        file: { include: { uploader: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return attachments.map((attachment: (typeof attachments)[number]) => ({
      id: attachment.id,
      createdAt: attachment.createdAt,
      file: this.serialize(attachment.file),
    }));
  }

  async downloadTaskAttachment(
    organizationId: string,
    projectId: string,
    taskId: string,
    attachmentId: string,
  ) {
    const attachment = await this.findAttachment(organizationId, projectId, taskId, attachmentId);
    if (this.storage.usesDatabaseFallback()) {
      return {
        url: `/api/v1/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}/content`,
        expiresInSeconds: 300,
      };
    }
    return {
      url: await this.storage.signedDownload(attachment.file.storageKey, attachment.file.fileName),
      expiresInSeconds: 300,
    };
  }

  async readTaskAttachment(
    organizationId: string,
    projectId: string,
    taskId: string,
    attachmentId: string,
  ): Promise<{ body: Buffer; fileName: string; mimeType: string }> {
    const attachment = await this.findAttachment(organizationId, projectId, taskId, attachmentId);
    const stored = await this.storage.read(attachment.file.storageKey);
    if (!stored) throw new NotFoundException({ code: "ATTACHMENT_CONTENT_NOT_FOUND" });
    return {
      body: stored.body,
      fileName: attachment.file.fileName,
      mimeType: stored.mimeType || attachment.file.mimeType,
    };
  }

  async deleteTaskAttachment(
    organizationId: string,
    projectId: string,
    taskId: string,
    attachmentId: string,
  ): Promise<void> {
    const attachment = await this.findAttachment(organizationId, projectId, taskId, attachmentId, false);
    await this.database.client.fileAsset.update({
      where: { id: attachment.fileId },
      data: { deletedAt: new Date() },
    });
    await this.storage.delete(attachment.file.storageKey);
  }

  private serialize<T extends { sizeBytes: bigint }>(file: T): Omit<T, "sizeBytes"> & { sizeBytes: string } {
    return { ...file, sizeBytes: file.sizeBytes.toString() };
  }

  private async findAttachment(
    organizationId: string,
    projectId: string,
    taskId: string,
    attachmentId: string,
    requireClean = true,
  ) {
    await this.requireTask(organizationId, projectId, taskId);
    const attachment = await this.database.client.taskAttachment.findFirst({
      where: {
        id: attachmentId,
        taskId,
        file: {
          organizationId,
          deletedAt: null,
          ...(requireClean ? { scanStatus: "CLEAN" as const } : {}),
        },
      },
      include: { file: true },
    });
    if (!attachment) throw new NotFoundException({ code: "ATTACHMENT_NOT_FOUND" });
    return attachment;
  }

  private async requireTask(organizationId: string, projectId: string, taskId: string): Promise<void> {
    const task = await this.database.client.task.findFirst({
      where: {
        id: taskId,
        projectId,
        deletedAt: null,
        project: { organizationId, deletedAt: null },
      },
      select: { id: true },
    });
    if (!task) throw new BadRequestException({ code: "TASK_NOT_FOUND" });
  }
}
