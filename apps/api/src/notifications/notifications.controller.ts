import { Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../auth/auth.types.js";
import { NotificationsService } from "./notifications.service.js";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Query("unread") unread: string | undefined, @Req() request: AuthenticatedRequest) {
    return this.notifications.list(request.auth.userId, unread === "true");
  }

  @Get("unread-count")
  unreadCount(@Req() request: AuthenticatedRequest) { return this.notifications.unreadCount(request.auth.userId); }

  @Patch(":notificationId/read")
  async markRead(@Param("notificationId") notificationId: string, @Req() request: AuthenticatedRequest): Promise<{ success: true }> {
    await this.notifications.markRead(request.auth.userId, notificationId); return { success: true };
  }

  @Post("read-all")
  async readAll(@Req() request: AuthenticatedRequest): Promise<{ success: true }> {
    await this.notifications.markAllRead(request.auth.userId); return { success: true };
  }
}
