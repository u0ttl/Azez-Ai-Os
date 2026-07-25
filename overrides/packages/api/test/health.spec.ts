import { describe, expect, it } from "vitest";
import { HealthController } from "../src/health/health.controller.js";
import { HealthService } from "../src/health/health.service.js";

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    database: { client: { $queryRaw: async () => [{ "?column?": 1 }] } },
    redis: { ping: async () => "up", mode: () => "database", isRequired: () => false },
    scanner: { ping: async () => "disabled", isRequired: () => false },
    storage: { ping: async () => "up", mode: () => "database" },
    email: { ping: async () => "disabled", isRequired: () => false },
    ai: { healthStatus: () => ({ status: "disabled", provider: "local-retrieval", model: "extractive-v1" }), isRequired: () => false },
    ...overrides,
  };
}

function health(overrides: Record<string, unknown> = {}): HealthService {
  const deps = dependencies(overrides);
  return new HealthService(
    deps.database as never,
    deps.redis as never,
    deps.scanner as never,
    deps.storage as never,
    deps.email as never,
    deps.ai as never,
  );
}

describe("HealthController", () => {
  it("reports the service as healthy", () => {
    const result = new HealthController(health()).check();
    expect(result.status).toBe("ok");
    expect(result.service).toBe("azez-ai-os-api");
  });

  it("reports all production dependencies without exposing credentials", async () => {
    const result = await health({
      redis: { ping: async () => "up", mode: () => "redis", isRequired: () => true },
      scanner: { ping: async () => "up", isRequired: () => true },
      email: { ping: async () => "up", isRequired: () => true },
      ai: { healthStatus: () => ({ status: "up", provider: "openai", model: "configured-model" }), isRequired: () => true },
    }).readiness();
    expect(result.status).toBe("ready");
    expect(result.checks.database.status).toBe("up");
    expect(result.checks.redis.mode).toBe("redis");
    expect(result.checks.storage.status).toBe("up");
    expect(result.checks.email.status).toBe("up");
    expect(result.checks.ai.status).toBe("up");
    expect(JSON.stringify(result)).not.toContain("API_KEY");
  });

  it("accepts PostgreSQL as the distributed rate-limit backend", async () => {
    const result = await health({
      redis: { ping: async () => "up", mode: () => "database", isRequired: () => true },
    }).readiness();
    expect(result.status).toBe("ready");
    expect(result.checks.redis.mode).toBe("database");
  });

  it("is not ready when the required distributed limiter is unavailable", async () => {
    const result = await health({ redis: { ping: async () => "down", mode: () => "memory", isRequired: () => true } }).readiness();
    expect(result.status).toBe("not_ready");
  });

  it("is not ready when storage is unavailable", async () => {
    const result = await health({ storage: { ping: async () => "down", mode: () => "database" } }).readiness();
    expect(result.status).toBe("not_ready");
  });
});
