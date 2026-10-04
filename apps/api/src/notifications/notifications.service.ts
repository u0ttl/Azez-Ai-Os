import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";

export interface CreateNotificationInput {
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  dedupeKey?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateNotificationInput): Promise<void> {
    if (input.dedupeKey) {
      await this.database.client.notification.upsert({
        where: { organizationId_userId_dedupeKey: { organizationId: input.organizationId, userId: input.userId, dedupeKey: input.dedupeKey } },
        create: input,
        update: { title: input.title, body: input.body, link: input.link, readAt: null, createdAt: new Date() },
      });
      return;
    }
    await this.database.client.notification.create({ data: input });
  }

  async list(userId: string, unreadOnly: boolean) {
    return this.database.client.notification.findMany({
      where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
      include: { organization: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" }, take: 100,
    });
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    return { count: await this.database.client.notification.count({ where: { userId, readAt: null } }) };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const result = await this.database.client.notification.updateMany({ where: { id: notificationId, userId }, data: { readAt: new Date() } });
    if (!result.count) throw new NotFoundException({ code: "NOTIFICATION_NOT_FOUND" });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.database.client.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }
}
