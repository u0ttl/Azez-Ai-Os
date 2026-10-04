import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";
import { DatabaseService } from "../database/database.service.js";
import { AuthenticatedRequest } from "./auth.types.js";
import { hashSessionToken } from "./auth.service.js";
import { IS_PUBLIC_KEY } from "./public.decorator.js";
import { ALLOW_UNVERIFIED_KEY } from "./allow-unverified.decorator.js";

export const SESSION_COOKIE = "azez_session";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = request.cookies[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException({ code: "AUTHENTICATION_REQUIRED" });

    const session = await this.database.client.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: {
        user: {
          include: {
            memberships: { where: { status: "ACTIVE" }, select: { organizationId: true, role: true } },
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
      throw new UnauthorizedException({ code: "SESSION_INVALID" });
    }

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED_KEY, [context.getHandler(), context.getClass()]);
    if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !session.user.emailVerifiedAt && !allowUnverified) {
      throw new ForbiddenException({ code: "EMAIL_VERIFICATION_REQUIRED" });
    }

    (request as AuthenticatedRequest).auth = {
      userId: session.user.id,
      sessionId: session.id,
      email: session.user.email,
      emailVerified: Boolean(session.user.emailVerifiedAt),
      memberships: session.user.memberships,
    };
    const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
    if (session.lastSeenAt < staleBefore) {
      await this.database.client.session.updateMany({
        where: { id: session.id, revokedAt: null, lastSeenAt: { lt: staleBefore } },
        data: { lastSeenAt: new Date() },
      });
    }
    return true;
  }
}
