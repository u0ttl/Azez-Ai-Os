import { Controller, NotFoundException, Post, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { Public } from "../auth/public.decorator.js";
import { HealthService } from "./health.service.js";

@Controller("health")
export class PreviewMaintenanceController {
  constructor(private readonly health: HealthService) {}

  @Post("preview-migrations")
  @Public()
  async applyPreviewMigrations(@Req() request: FastifyRequest) {
    const header = request.headers["x-azez-preview-e2e"];
    const supplied = Array.isArray(header) ? header[0] : header;
    if (process.env.VERCEL_ENV !== "preview" || supplied !== "1") {
      throw new NotFoundException();
    }
    return this.health.applyPreviewMigrations();
  }
}
