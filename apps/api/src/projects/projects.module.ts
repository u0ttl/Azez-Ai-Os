import { Module } from "@nestjs/common";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";
import { NotificationsModule } from "../notifications/notifications.module.js";

@Module({ imports: [NotificationsModule], controllers: [ProjectsController], providers: [ProjectsService] })
export class ProjectsModule {}
