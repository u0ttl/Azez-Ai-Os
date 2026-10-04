import { describe, expect, it } from "vitest";
import { CsrfService } from "../src/security/csrf.service.js";

describe("CSRF tokens", () => {
  it("accepts a signed token and rejects tampering", () => {
    const service = new CsrfService();
    const token = service.issue();
    expect(service.verify(token)).toBe(true);
    expect(service.verify(`${token}x`)).toBe(false);
    expect(service.verify(undefined)).toBe(false);
  });
});
