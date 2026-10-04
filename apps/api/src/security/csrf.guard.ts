import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { CsrfService } from "./csrf.service.js";

export const CSRF_COOKIE = "azez_csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Cross-site cookie policy: frontend (Vercel) and API (Render) live on different domains,
 *  so production cookies must use SameSite=None; Secure or the browser will not send them. */
export function cookieSameSite(): "none" | "lax" | "strict" {
  const configured = process.env.COOKIE_SAME_SITE;
  if (configured === "none" || configured === "lax" || configured === "strict") return configured;
  return process.env.NODE_ENV === "production" ? "none" : "lax";
}

export function cookieSecure(): boolean {
  return cookieSameSite() === "none" || process.env.NODE_ENV === "production";
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrf: CsrfService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const header = request.headers["x-csrf-token"];
    const supplied = Array.isArray(header) ? header[0] : header;
    const cookie = request.cookies[CSRF_COOKIE];
    if (!supplied || supplied !== cookie || !this.csrf.verify(supplied)) {
      throw new ForbiddenException({ code: "CSRF_TOKEN_INVALID" });
    }
    return true;
  }
}
