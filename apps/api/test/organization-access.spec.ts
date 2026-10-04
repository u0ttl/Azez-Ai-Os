import { describe, expect, it } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { assertOrganizationAccess, assertOrganizationPermission, assertOrganizationRole } from "../src/auth/organization-access.js";

describe("organization access", () => {
  const auth = { userId: "user-1", sessionId: "session-1", email: "owner@example.com", emailVerified: true, memberships: [{ organizationId: "org-1", role: "OWNER" as const }] };

  it("allows an active member and rejects another tenant", () => {
    expect(() => assertOrganizationAccess(auth, "org-1")).not.toThrow();
    expect(() => assertOrganizationAccess(auth, "org-2")).toThrow(ForbiddenException);
  });

  it("requires an allowed role for billing changes", () => {
    expect(() => assertOrganizationRole(auth, "org-1", ["OWNER", "ADMIN"])).not.toThrow();
    expect(() => assertOrganizationRole({ ...auth, memberships: [{ organizationId: "org-1", role: "MEMBER" }] }, "org-1", ["OWNER", "ADMIN"])).toThrow(ForbiddenException);
  });

  it("enforces module permissions by membership role", () => {
    const guest = { ...auth, memberships: [{ organizationId: "org-1", role: "GUEST" as const }] };
    expect(() => assertOrganizationPermission(guest, "org-1", "projects.read")).not.toThrow();
    expect(() => assertOrganizationPermission(guest, "org-1", "projects.write")).toThrow(ForbiddenException);
  });
});
