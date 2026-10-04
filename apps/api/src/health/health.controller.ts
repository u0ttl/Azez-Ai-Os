import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../auth/public.decorator.js";
import { HealthService } from "./health.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Public()
  check() {
    return this.health.liveness();
  }

  @Get("ready")
  @Public()
  @HttpCode(HttpStatus.OK)
  async ready() {
    const result = await this.health.readiness();
    if (result.status !== "ready") {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }

  @Get("version")
  @Public()
  version() {
    return this.health.version();
  }
}
