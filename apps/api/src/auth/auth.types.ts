import type { FastifyRequest } from "fastify";

type MembershipRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "GUEST";

export interface AuthContext {
  userId: string;
  sessionId: string;
  email: string;
  emailVerified: boolean;
  memberships: Array<{
    organizationId: string;
    role: MembershipRole;
  }>;
}

export interface RequestMetadata {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  requestId?: string | undefined;
}

export interface AuthenticatedRequest extends FastifyRequest {
  auth: AuthContext;
}
