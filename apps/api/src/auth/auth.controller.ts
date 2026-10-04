import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { CSRF_COOKIE, cookieSameSite, cookieSecure } from "../security/csrf.guard.js";
import { CsrfService } from "../security/csrf.service.js";
import { AllowUnverified } from "./allow-unverified.decorator.js";
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, VerifyEmailDto } from "./auth.dto.js";
import { SESSION_COOKIE } from "./auth.guard.js";
import { AuthService, SessionResult } from "./auth.service.js";
import { AuthenticatedRequest, RequestMetadata } from "./auth.types.js";
import { Public } from "./public.decorator.js";

@Controller("auth")
@AllowUnverified()
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly csrf: CsrfService) {}

  @Get("csrf")
  @Public()
  csrfToken(@Res({ passthrough: true }) reply: FastifyReply): { csrfToken: string } {
    const csrfToken = this.csrf.issue();
    reply.setCookie(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      sameSite: cookieSameSite(),
      secure: cookieSecure(),
      path: "/",
      maxAge: 60 * 60,
    });
    return { csrfToken };
  }

  @Post("register")
  @Public()
  async register(@Body() input: RegisterDto, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<SessionResult["user"]> {
    const session = await this.auth.register(input, this.metadata(request));
    this.setSessionCookie(reply, session);
    return session.user;
  }

  @Post("login")
  @Public()
  async login(@Body() input: LoginDto, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<SessionResult["user"]> {
    const session = await this.auth.login(input, this.metadata(request));
    this.setSessionCookie(reply, session);
    return session.user;
  }

  @Get("me")
  me(@Req() request: AuthenticatedRequest): AuthenticatedRequest["auth"] {
    return request.auth;
  }

  @Get("sessions")
  sessions(@Req() request: AuthenticatedRequest) {
    return this.auth.listSessions(request.auth.userId, request.auth.sessionId);
  }

  @Delete("sessions/:sessionId")
  async revokeSession(@Param("sessionId", new ParseUUIDPipe()) sessionId: string, @Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<{ success: true }> {
    await this.auth.revokeSession(request.auth.userId, sessionId, this.metadata(request));
    if (sessionId === request.auth.sessionId) reply.clearCookie(SESSION_COOKIE, { path: "/", sameSite: cookieSameSite(), secure: cookieSecure() });
    return { success: true };
  }

  @Post("logout")
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<{ success: true }> {
    await this.auth.logout(request.cookies[SESSION_COOKIE], this.metadata(request));
    reply.clearCookie(SESSION_COOKIE, { path: "/", sameSite: cookieSameSite(), secure: cookieSecure() });
    return { success: true };
  }

  @Post("logout-all")
  async logoutAll(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<{ success: true }> {
    await this.auth.revokeAllSessions(request.auth.userId, this.metadata(request));
    reply.clearCookie(SESSION_COOKIE, { path: "/", sameSite: cookieSameSite(), secure: cookieSecure() });
    return { success: true };
  }

  @Post("change-password")
  async changePassword(@Body() input: ChangePasswordDto, @Req() request: AuthenticatedRequest): Promise<{ success: true }> {
    await this.auth.changePassword(request.auth.userId, request.auth.sessionId, input, this.metadata(request));
    return { success: true };
  }

  @Post("resend-verification")
  async resendVerification(@Req() request: AuthenticatedRequest): Promise<{ success: true }> {
    await this.auth.resendVerification(request.auth.userId, this.metadata(request));
    return { success: true };
  }

  @Post("verify-email")
  @Public()
  async verifyEmail(@Body() input: VerifyEmailDto, @Req() request: FastifyRequest): Promise<{ success: true }> {
    await this.auth.verifyEmail(input.token, this.metadata(request));
    return { success: true };
  }

  @Post("forgot-password")
  @Public()
  async forgotPassword(@Body() input: ForgotPasswordDto, @Req() request: FastifyRequest): Promise<{ success: true }> {
    await this.auth.forgotPassword(input, this.metadata(request));
    return { success: true };
  }

  @Post("reset-password")
  @Public()
  async resetPassword(@Body() input: ResetPasswordDto, @Req() request: FastifyRequest): Promise<{ success: true }> {
    await this.auth.resetPassword(input, this.metadata(request));
    return { success: true };
  }

  private metadata(request: FastifyRequest): RequestMetadata {
    return { ipAddress: request.ip, userAgent: request.headers["user-agent"], requestId: request.id };
  }

  private setSessionCookie(reply: FastifyReply, session: SessionResult): void {
    reply.setCookie(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: cookieSameSite(),
      secure: cookieSecure(),
      path: "/",
      expires: session.expiresAt,
    });
  }
}
