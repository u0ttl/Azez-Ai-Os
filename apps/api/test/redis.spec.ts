import { afterEach, describe, expect, it } from "vitest";
import { RedisService } from "../src/redis/redis.service.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalRedisUrl = process.env.REDIS_URL;
const originalRequired = process.env.REDIS_REQUIRED;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv;
  if (originalRedisUrl === undefined) delete process.env.REDIS_URL; else process.env.REDIS_URL = originalRedisUrl;
  if (originalRequired === undefined) delete process.env.REDIS_REQUIRED; else process.env.REDIS_REQUIRED = originalRequired;
});

describe("RedisService safety mode", () => {
  it("allows an explicitly optional development fallback", async () => {
    process.env.NODE_ENV = "development";
    process.env.REDIS_REQUIRED = "false";
    delete process.env.REDIS_URL;
    const redis = new RedisService();
    await expect(redis.onModuleInit()).resolves.toBeUndefined();
    await expect(redis.ping()).resolves.toBe("disabled");
  });

  it("refuses production startup without Redis", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.REDIS_REQUIRED;
    delete process.env.REDIS_URL;
    await expect(new RedisService().onModuleInit()).rejects.toThrow("REDIS_URL is required");
  });
});
