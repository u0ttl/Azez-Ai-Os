import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/auth/password.js";

describe("password hashing", () => {
  it("verifies the correct password and rejects an incorrect one", async () => {
    const hash = await hashPassword("a-long-development-password");
    expect(hash).not.toContain("a-long-development-password");
    await expect(verifyPassword("a-long-development-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
