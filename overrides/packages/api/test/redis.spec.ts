import { afterEach, describe, expect, it, vi } from "vitest";
import { RedisService } from "../src/redis/redis.service.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalRedisUrl = process.env.REDIS_URL;
const originalRequired = process.env.REDIS_REQUIRED;

function database(options: { tableExists?: boolean; count?: number } = {}) {
  const tableExists = options.tableExists ?? true;
  const count = options.count ?? 1;
  return {
    client: {
      $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
        const sql = strings.join(" ");
        if (sql.includes("to_regclass")) {
          return [{ tableName: tableExists ? "rate_limit_buckets" : null }];
        }
        if (sql.includes("INSERT INTO \"rate_limit_buckets\"")) {
          return [{ count, resetAt: new Date(Date.now() + 60_000) }];
        }
        return [];
      }),
      $executeRaw: vi.fn(async () => 1),
    },
  };
}

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalRedisUrl === undefined) delete process.env.REDIS_URL;
  else process.env.REDIS_URL = originalRedisUrl;
  if (originalRequired === undefined) delete process.env.REDIS_REQUIRED;
  else process.env.REDIS_REQUIRED = originalRequired;
  vi.restoreAllMocks();
});

describe("RedisService distributed fallback", () => {
  it("uses PostgreSQL for distributed controls when Redis is absent", async () => {
    process.env.NODE_ENV = "production";
    process.env.REDIS_REQUIRED = "false";
    delete process.env.REDIS_URL;
    const redis = new RedisService(database() as never);

    await expect(redis.onModuleInit()).resolves.toBeUndefined();
    await expect(redis.ping()).resolves.toBe("up");
    expect(redis.mode()).toBe("database");
    expect(redis.isRequired()).toBe(false);
  });

  it("falls back to memory only when both distributed backends are unavailable", async () => {
    process.env.NODE_ENV = "development";
    process.env.REDIS_REQUIRED = "false";
    delete process.env.REDIS_URL;
    const redis = new RedisService(database({ tableExists: false }) as never);

    await expect(redis.onModuleInit()).resolves.toBeUndefined();
    await expect(redis.ping()).resolves.toBe("disabled");
    expect(redis.mode()).toBe("memory");
  });

  it("marks readiness down when a distributed limiter is required but unavailable", async () => {
    process.env.NODE_ENV = "production";
    process.env.REDIS_REQUIRED = "true";
    delete process.env.REDIS_URL;
    const redis = new RedisService(database({ tableExists: false }) as never);

    await expect(redis.onModuleInit()).resolves.toBeUndefined();
    await expect(redis.ping()).resolves.toBe("down");
    expect(redis.mode()).toBe("memory");
    expect(redis.isRequired()).toBe(true);
  });

  it("returns an atomic PostgreSQL counter and TTL", async () => {
    delete process.env.REDIS_URL;
    const redis = new RedisService(database({ count: 3 }) as never);
    await redis.onModuleInit();

    const result = await redis.consumeRateLimit("login:test", 60_000);
    expect(result?.count).toBe(3);
    expect(result?.ttlMs).toBeGreaterThan(0);
    expect(result?.ttlMs).toBeLessThanOrEqual(60_000);
  });
});
