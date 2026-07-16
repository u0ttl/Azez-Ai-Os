import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service.js";
import { SecurityRateLimiter } from "../security/rate-limiter.service.js";
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from "./auth.dto.js";
import { RequestMetadata } from "./auth.types.js";
import { hashPassword, verifyPassword } from "./password.js";

const SESSION_DAYS = 30;
const VERIFY_HOURS = 24;
const RESET_MINUTES = 30;

function runtimeWebOrigin(): string {
  const configured = process.env.WEB_ORIGIN?.split(",")[0]?.trim();
  const candidate = configured || process.env.VERCEL_URL || process.env.VERCEL_BRANCH_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!candidate) return "http://localhost:3000";
  try {
    return new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export interface SessionResult {
  token: string;
  expiresAt: Date;
  user: { id: string; name: string; email: string; emailVerified: boolean };
}

export const hashSessionToken = (token: string): string => createHash("sha256").update(token).digest("hex");
const fingerprint = (value: string): string => createHash("sha256").update(value).digest("hex").slice(0, 20);

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService, private readonly limiter: SecurityRateLimiter) {}

  async register(input: RegisterDto, metadata: RequestMetadata): Promise<SessionResult> {
    await this.limiter.consume(`register:${metadata.ipAddress ?? "unknown"}`, 5, 60 * 60 * 1000);
    const email = input.email.trim().toLowerCase();
    const duplicate = await this.database.client.user.findUnique({ where: { email } });
    if (duplicate) throw new ConflictException({ code: "EMAIL_ALREADY_USED" });

    const slugTaken = await this.database.client.organization.findUnique({ where: { slug: input.organizationSlug } });
    if (slugTaken) throw new ConflictException({ code: "ORGANIZATION_SLUG_TAKEN" });

    const passwordHash = await hashPassword(input.password);
    const userId = randomUUID();
    const organizationId = randomUUID();
    const verification = this.newToken(VERIFY_HOURS * 60 * 60 * 1000);
    const verificationUrl = `${runtimeWebOrigin()}/verify-email?token=${encodeURIComponent(verification.raw)}`;
    const [user] = await this.database.client.$transaction([
      this.database.client.user.create({
        data: { id: userId, email, name: input.name.trim(), passwordHash, locale: input.locale },
      }),
      this.database.client.organization.create({
        data: { id: organizationId, name: input.organizationName.trim(), slug: input.organizationSlug, locale: input.locale },
      }),
      this.database.client.membership.create({ data: { userId, organizationId, role: "OWNER", status: "ACTIVE" } }),
      this.database.client.accountToken.create({
        data: { userId, purpose: "VERIFY_EMAIL", tokenHash: verification.hash, expiresAt: verification.expiresAt },
      }),
      this.database.client.emailOutbox.create({
        data: { recipient: email, template: "verify-email", payload: { name: input.name.trim(), verificationUrl } },
      }),
      this.database.client.auditEvent.create({
        data: {
          organizationId,
          actorId: userId,
          actorType: "USER",
          action: "organization.created",
          resourceType: "organization",
          resourceId: organizationId,
          requestId: metadata.requestId,
        },
      }),
      this.database.client.subscription.create({
        data: { organizationId, planId: "00000000-0000-4000-8000-00000000f001", status: "ACTIVE", provider: "internal" },
      }),
    ]);

    await this.audit("auth.registered", user.id, "user", user.id, metadata);
    return this.createSession(user.id, user.name, user.email, false, metadata);
  }

  async login(input: LoginDto, metadata: RequestMetadata): Promise<SessionResult> {
    const email = input.email.trim().toLowerCase();
    const limitKey = `login:${metadata.ipAddress ?? "unknown"}:${fingerprint(email)}`;
    await this.limiter.consume(limitKey, 5, 15 * 60 * 1000);
    const user = await this.database.client.user.findUnique({ where: { email } });
    if (!user?.passwordHash || user.status !== "ACTIVE" || !(await verifyPassword(input.password, user.passwordHash))) {
      await this.audit("auth.login_failed", user?.id, "user", user?.id, metadata, { emailFingerprint: fingerprint(email) });
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS" });
    }
    await this.limiter.reset(limitKey);
    await this.audit("auth.login_succeeded", user.id, "user", user.id, metadata);
    return this.createSession(user.id, user.name, user.email, Boolean(user.emailVerifiedAt), metadata);
  }

  async logout(token: string | undefined, metadata: RequestMetadata): Promise<void> {
    if (!token) return;
    const session = await this.database.client.session.findUnique({ where: { tokenHash: hashSessionToken(token) } });
    if (!session || session.revokedAt) return;
    await this.database.client.session.update({ where: { id: session.id }, data: { revokedAt: new Date(), revokeReason: "LOGOUT" } });
    await this.audit("auth.logout", session.userId, "session", session.id, metadata);
  }

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await this.database.client.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
      take: 50,
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, lastSeenAt: true, expiresAt: true },
    });
    return sessions.map((session: (typeof sessions)[number]) => ({ ...session, current: session.id === currentSessionId }));
  }

  async revokeSession(userId: string, sessionId: string, metadata: RequestMetadata): Promise<boolean> {
    const result = await this.database.client.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: "USER_REVOKED" },
    });
    if (!result.count) throw new NotFoundException({ code: "SESSION_NOT_FOUND" });
    await this.audit("auth.session_revoked", userId, "session", sessionId, metadata);
    return true;
  }

  async revokeAllSessions(userId: string, metadata: RequestMetadata): Promise<void> {
    await this.database.client.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: "LOGOUT_ALL" },
    });
    await this.audit("auth.sessions_revoked_all", userId, "user", userId, metadata);
  }

  async changePassword(userId: string, currentSessionId: string, input: ChangePasswordDto, metadata: RequestMetadata): Promise<void> {
    const user = await this.database.client.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException({ code: "CURRENT_PASSWORD_INVALID" });
    }
    const passwordHash = await hashPassword(input.newPassword);
    await this.database.client.$transaction([
      this.database.client.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: new Date() } }),
      this.database.client.session.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: "PASSWORD_CHANGED" },
      }),
    ]);
    await this.audit("auth.password_changed", userId, "user", userId, metadata);
  }

  async resendVerification(userId: string, metadata: RequestMetadata): Promise<void> {
    await this.limiter.consume(`verify:${userId}`, 3, 60 * 60 * 1000);
    const user = await this.database.client.user.findUnique({ where: { id: userId } });
    if (!user || user.emailVerifiedAt) return;
    await this.issueAccountToken(user.id, user.email, user.name, "VERIFY_EMAIL", VERIFY_HOURS * 60 * 60 * 1000);
    await this.audit("auth.verification_resent", userId, "user", userId, metadata);
  }

  async verifyEmail(rawToken: string, metadata: RequestMetadata): Promise<void> {
    const token = await this.database.client.accountToken.findFirst({
      where: { tokenHash: hashSessionToken(rawToken), purpose: "VERIFY_EMAIL", consumedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!token) throw new BadRequestException({ code: "VERIFICATION_TOKEN_INVALID" });
    await this.database.client.$transaction([
      this.database.client.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } }),
      this.database.client.accountToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
    ]);
    await this.audit("auth.email_verified", token.userId, "user", token.userId, metadata);
  }

  async forgotPassword(input: ForgotPasswordDto, metadata: RequestMetadata): Promise<void> {
    const email = input.email.trim().toLowerCase();
    await this.limiter.consume(`forgot:${metadata.ipAddress ?? "unknown"}:${fingerprint(email)}`, 3, 15 * 60 * 1000);
    const user = await this.database.client.user.findUnique({ where: { email } });
    if (!user || user.status !== "ACTIVE") return;
    await this.issueAccountToken(user.id, user.email, user.name, "RESET_PASSWORD", RESET_MINUTES * 60 * 1000);
    await this.audit("auth.password_reset_requested", user.id, "user", user.id, metadata);
  }

  async resetPassword(input: ResetPasswordDto, metadata: RequestMetadata): Promise<void> {
    const token = await this.database.client.accountToken.findFirst({
      where: { tokenHash: hashSessionToken(input.token), purpose: "RESET_PASSWORD", consumedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!token) throw new BadRequestException({ code: "RESET_TOKEN_INVALID" });
    const passwordHash = await hashPassword(input.password);
    await this.database.client.$transaction([
      this.database.client.user.update({ where: { id: token.userId }, data: { passwordHash, passwordChangedAt: new Date() } }),
      this.database.client.accountToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
      this.database.client.session.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: "PASSWORD_RESET" },
      }),
    ]);
    await this.audit("auth.password_reset_completed", token.userId, "user", token.userId, metadata);
  }

  private async issueAccountToken(userId: string, email: string, name: string, purpose: "VERIFY_EMAIL" | "RESET_PASSWORD", ttlMs: number): Promise<void> {
    const token = this.newToken(ttlMs);
    const route = purpose === "VERIFY_EMAIL" ? "verify-email" : "reset-password";
    const template = purpose === "VERIFY_EMAIL" ? "verify-email" : "reset-password";
    const url = `${runtimeWebOrigin()}/${route}?token=${encodeURIComponent(token.raw)}`;
    await this.database.client.$transaction([
      this.database.client.accountToken.updateMany({ where: { userId, purpose, consumedAt: null }, data: { consumedAt: new Date() } }),
      this.database.client.accountToken.create({ data: { userId, purpose, tokenHash: token.hash, expiresAt: token.expiresAt } }),
      this.database.client.emailOutbox.create({ data: { recipient: email, template, payload: { name, url } } }),
    ]);
  }

  private newToken(ttlMs: number): { raw: string; hash: string; expiresAt: Date } {
    const raw = randomBytes(32).toString("base64url");
    return { raw, hash: hashSessionToken(raw), expiresAt: new Date(Date.now() + ttlMs) };
  }

  private async createSession(userId: string, name: string, email: string, emailVerified: boolean, metadata: RequestMetadata): Promise<SessionResult> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await this.database.client.session.create({
      data: {
        userId,
        tokenHash: hashSessionToken(token),
        expiresAt,
        ipAddress: metadata.ipAddress?.slice(0, 64),
        userAgent: metadata.userAgent?.slice(0, 512),
      },
    });
    return { token, expiresAt, user: { id: userId, name, email, emailVerified } };
  }

  private async audit(action: string, actorId: string | undefined, resourceType: string, resourceId: string | undefined, metadata: RequestMetadata, extra: Record<string, string> = {}): Promise<void> {
    const details = Object.fromEntries(Object.entries({ ipAddress: metadata.ipAddress, userAgent: metadata.userAgent?.slice(0, 200), ...extra }).filter((entry) => entry[1] !== undefined));
    await this.database.client.auditEvent.create({
      data: { actorId, actorType: "USER", action, resourceType, resourceId, requestId: metadata.requestId, metadata: details },
    });
  }
}
