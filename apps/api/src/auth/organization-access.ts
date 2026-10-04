import { ForbiddenException } from "@nestjs/common";
import { AuthContext } from "./auth.types.js";

export function assertOrganizationAccess(auth: AuthContext, organizationId: string): void {
  if (!auth.memberships.some((membership) => membership.organizationId === organizationId)) {
    throw new ForbiddenException({ code: "ORGANIZATION_ACCESS_DENIED" });
  }
}

export function assertOrganizationRole(
  auth: AuthContext,
  organizationId: string,
  allowed: Array<AuthContext["memberships"][number]["role"]>,
): void {
  const membership = auth.memberships.find((item) => item.organizationId === organizationId);
  if (!membership || !allowed.includes(membership.role)) {
    throw new ForbiddenException({ code: "ORGANIZATION_ROLE_REQUIRED" });
  }
}

export type OrganizationPermission =
  | "billing.read" | "billing.manage"
  | "crm.read" | "crm.write"
  | "projects.read" | "projects.write"
  | "knowledge.read" | "knowledge.write"
  | "ai.use"
  | "workflows.read" | "workflows.manage" | "workflows.run" | "workflows.approve";

const rolePermissions: Record<AuthContext["memberships"][number]["role"], ReadonlySet<OrganizationPermission>> = {
  OWNER: new Set(["billing.read", "billing.manage", "crm.read", "crm.write", "projects.read", "projects.write", "knowledge.read", "knowledge.write", "ai.use", "workflows.read", "workflows.manage", "workflows.run", "workflows.approve"]),
  ADMIN: new Set(["billing.read", "billing.manage", "crm.read", "crm.write", "projects.read", "projects.write", "knowledge.read", "knowledge.write", "ai.use", "workflows.read", "workflows.manage", "workflows.run", "workflows.approve"]),
  MANAGER: new Set(["billing.read", "crm.read", "crm.write", "projects.read", "projects.write", "knowledge.read", "knowledge.write", "ai.use", "workflows.read", "workflows.manage", "workflows.run", "workflows.approve"]),
  MEMBER: new Set(["crm.read", "projects.read", "projects.write", "knowledge.read", "ai.use", "workflows.read", "workflows.run"]),
  GUEST: new Set(["crm.read", "projects.read", "knowledge.read", "workflows.read"]),
};

export function assertOrganizationPermission(auth: AuthContext, organizationId: string, permission: OrganizationPermission): void {
  const membership = auth.memberships.find((item) => item.organizationId === organizationId);
  if (!membership || !rolePermissions[membership.role].has(permission)) {
    throw new ForbiddenException({ code: "ORGANIZATION_PERMISSION_REQUIRED", permission });
  }
}
