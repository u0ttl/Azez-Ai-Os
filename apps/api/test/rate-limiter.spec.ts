import { describe, expect, it } from "vitest";
import { SecurityRateLimiter } from "../src/security/rate-limiter.service.js";

describe("security rate limiter", () => {
  it("blocks requests beyond the configured limit and supports reset", async () => {
    const limiter = new SecurityRateLimiter();
    await limiter.consume("login:test", 2, 60_000);
    await limiter.consume("login:test", 2, 60_000);
    await expect(limiter.consume("login:test", 2, 60_000)).rejects.toThrow();
    await limiter.reset("login:test");
    await expect(limiter.consume("login:test", 2, 60_000)).resolves.toBeUndefined();
  });

  it("uses the distributed counter and fails closed when required Redis is unavailable", async () => {
    const distributed = {
      consumeRateLimit: async () => ({ count: 3, ttlMs: 20_000 }),
      deleteRateLimit: async () => true,
      isRequired: () => true,
    };
    await expect(new SecurityRateLimiter(distributed as never).consume("login:test", 2, 60_000)).rejects.toThrow();
    distributed.consumeRateLimit = async () => null as never;
    await expect(new SecurityRateLimiter(distributed as never).consume("login:test", 2, 60_000)).rejects.toMatchObject({ status: 503 });
  });
});
