import { Controller, Get, Headers, NotFoundException, Res, UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import type { FastifyReply } from "fastify";
import { Public } from "../auth/public.decorator.js";
import { MetricsService } from "./metrics.service.js";

function tokensMatch(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Public()
  collect(@Headers("authorization") authorization: string | undefined, @Res({ passthrough: true }) reply: FastifyReply): string {
    const expected = process.env.METRICS_TOKEN;
    if (!expected && process.env.NODE_ENV === "production") throw new NotFoundException();
    if (expected) {
      const provided = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
      if (!tokensMatch(provided, expected)) throw new UnauthorizedException();
    }
    reply.type("text/plain; version=0.0.4; charset=utf-8");
    return this.metrics.render();
  }
}
