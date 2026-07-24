import { describe, expect, it } from "vitest";
import { normalizeDatabaseConnectionString } from "../src/database/database.service.js";

describe("database connection SSL normalization", () => {
  it.each(["prefer", "require", "verify-ca"])(
    "upgrades legacy sslmode=%s aliases to verify-full",
    (sslmode) => {
      const result = normalizeDatabaseConnectionString(
        `postgresql://user:pass@example.com:5432/app?schema=public&sslmode=${sslmode}`,
      );
      const normalized = new URL(result);
      expect(normalized.searchParams.get("sslmode")).toBe("verify-full");
      expect(normalized.searchParams.get("schema")).toBe("public");
    },
  );

  it("preserves an explicit verify-full mode", () => {
    const input = "postgresql://user:pass@example.com:5432/app?sslmode=verify-full";
    expect(normalizeDatabaseConnectionString(input)).toBe(input);
  });

  it("does not add SSL parameters when none were configured", () => {
    const input = "postgresql://user:pass@example.com:5432/app?schema=public";
    expect(normalizeDatabaseConnectionString(input)).toBe(input);
  });
});
