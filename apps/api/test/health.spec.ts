import { describe, expect, it } from "vitest";
import { HealthController } from "../src/health/health.controller.js";
import { HealthService } from "../src/health/health.service.js";

describe("HealthController", () => {
  it("reports the service as healthy", () => {
    const database = { client: { $queryRaw: async () => [{ "?column?": 1 }] } };
    const redis = { ping: async () => "disabled", isRequired: () => false };
    const scanner = { ping: async () => "disabled", isRequired: () => false };
    const service = new HealthService(database as never, redis as never, scanner as never);
    const result = new HealthController(service).check();
    expect(result.status).toBe("ok");
    expect(result.service).toBe("azez-ai-os-api");
  });

  it("reports database readiness without exposing connection details", async () => {
    const database = { client: { $queryRaw: async () => [{ "?column?": 1 }] } };
    const redis = { ping: async () => "up", isRequired: () => true };
    const scanner = { ping: async () => "up", isRequired: () => true };
    const result = await new HealthService(database as never, redis as never, scanner as never).readiness();
    expect(result.status).toBe("ready");
    expect(result.checks.database.status).toBe("up");
    expect(result.checks.redis.status).toBe("up");
  });

  it("is not ready when required Redis is down", async () => {
    const database = { client: { $queryRaw: async () => [{ "?column?": 1 }] } };
    const redis = { ping: async () => "down", isRequired: () => true };
    const scanner = { ping: async () => "up", isRequired: () => true };
    const result = await new HealthService(database as never, redis as never, scanner as never).readiness();
    expect(result.status).toBe("not_ready");
  });
});
