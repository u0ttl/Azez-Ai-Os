import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { CsrfService } from "./csrf.service.js";

export const CSRF_COOKIE = process.env.NODE_ENV === "production" ? "__Host-azez_csrf" : "azez_csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrf: CsrfService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const header = request.headers["x-csrf-token"];
    const supplied = Array.isArray(header) ? header[0] : header;
    const cookie = request.cookies[CSRF_COOKIE];
    if (!this.csrf.matches(supplied, cookie)) {
      throw new ForbiddenException({ code: "CSRF_TOKEN_INVALID" });
    }
    return true;
  }
}
