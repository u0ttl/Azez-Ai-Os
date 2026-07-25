import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createClient } from "redis";
import { DatabaseService } from "../database/database.service.js";

const RATE_LIMIT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`;

type RedisClient = ReturnType<typeof createClient>;

interface DatabaseRateLimitRow {
  count: number;
  resetAt: Date;
}

interface DatabaseTableRow {
  tableName: string | null;
}

function runtimeEnv(name: string): string | undefined {
  return globalThis.process?.env?.[name];
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly required = runtimeEnv("REDIS_REQUIRED") === "true";
  private readonly url = runtimeEnv("REDIS_URL");
  private client: RedisClient | null = null;
  private ready = false;
  private databaseFallbackReady = false;
  private operations = 0;

  constructor(private readonly database: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    if (!this.url) {
      this.databaseFallbackReady = await this.checkDatabaseFallback();
      if (this.databaseFallbackReady) {
        this.logger.log("Redis is not configured; distributed rate limits use the PostgreSQL backend");
      } else if (this.required) {
        this.logger.error("Distributed rate limiting is required but neither Redis nor the PostgreSQL fallback is available");
      } else {
        this.logger.warn("Distributed rate limiting is unavailable; requests use the in-memory fallback");
      }
      return;
    }

    const client = createClient({
      url: this.url,
      socket: {
        connectTimeout: Number(runtimeEnv("REDIS_CONNECT_TIMEOUT_MS") ?? 2000),
        reconnectStrategy: false,
      },
    });
    client.on("error", (error) =>
      this.logger.warn(`Redis error: ${error instanceof Error ? error.message : "unknown"}`),
    );
    client.on("ready", () => {
      this.ready = true;
    });
    client.on("end", () => {
      this.ready = false;
    });
    this.client = client as unknown as RedisClient;

    try {
      await client.connect();
      this.ready = true;
    } catch (error) {
      this.client = null;
      this.ready = false;
      if (client.isOpen) client.destroy();
      this.databaseFallbackReady = await this.checkDatabaseFallback();
      const message = error instanceof Error ? error.message : "unknown";
      if (this.databaseFallbackReady) {
        this.logger.warn(`Redis connection did not complete; distributed rate limits use PostgreSQL: ${message}`);
      } else if (this.required) {
        this.logger.error(`Distributed rate limiting remains unavailable: ${message}`);
      } else {
        this.logger.warn("Redis and the PostgreSQL distributed fallback are unavailable; requests use the in-memory fallback");
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client?.isOpen) return;
    await this.client.quit().catch(() => this.client?.destroy());
  }

  isRequired(): boolean {
    return this.required;
  }

  mode(): "redis" | "database" | "memory" {
    if (this.client && this.ready) return "redis";
    if (this.databaseFallbackReady) return "database";
    return "memory";
  }

  async ping(): Promise<"up" | "down" | "disabled"> {
    if (this.client && this.ready) {
      try {
        return (await this.client.ping()) === "PONG" ? "up" : "down";
      } catch {
        this.databaseFallbackReady = await this.checkDatabaseFallback();
        return this.databaseFallbackReady ? "up" : "down";
      }
    }
    this.databaseFallbackReady = await this.checkDatabaseFallback();
    if (this.databaseFallbackReady) return "up";
    return this.required ? "down" : "disabled";
  }

  async consumeRateLimit(
    key: string,
    windowMs: number,
  ): Promise<{ count: number; ttlMs: number } | null> {
    const redis = await this.consumeRedisRateLimit(key, windowMs);
    if (redis) return redis;

    try {
      const resetAt = new Date(Date.now() + windowMs);
      const rows = await this.database.client.$queryRaw<DatabaseRateLimitRow[]>`
        INSERT INTO "rate_limit_buckets" ("bucket_key", "count", "reset_at", "updated_at")
        VALUES (${key}, 1, ${resetAt}, NOW())
        ON CONFLICT ("bucket_key") DO UPDATE SET
          "count" = CASE
            WHEN "rate_limit_buckets"."reset_at" <= NOW() THEN 1
            ELSE "rate_limit_buckets"."count" + 1
          END,
          "reset_at" = CASE
            WHEN "rate_limit_buckets"."reset_at" <= NOW() THEN ${resetAt}
            ELSE "rate_limit_buckets"."reset_at"
          END,
          "updated_at" = NOW()
        RETURNING "count", "reset_at" AS "resetAt"
      `;
      const row = rows[0];
      if (!row) return null;
      this.databaseFallbackReady = true;
      this.operations += 1;
      if (this.operations % 250 === 0) void this.pruneDatabaseBuckets();
      return { count: Number(row.count), ttlMs: Math.max(1, row.resetAt.getTime() - Date.now()) };
    } catch (error) {
      this.databaseFallbackReady = false;
      this.logger.warn(`PostgreSQL rate-limit operation did not complete: ${error instanceof Error ? error.message : "unknown"}`);
      return null;
    }
  }

  async deleteRateLimit(key: string): Promise<boolean> {
    let deleted = false;
    if (this.client && this.ready) {
      try {
        await this.client.del(`azez:rate-limit:${key}`);
        deleted = true;
      } catch {
        deleted = false;
      }
    }
    try {
      await this.database.client.$executeRaw`
        DELETE FROM "rate_limit_buckets" WHERE "bucket_key" = ${key}
      `;
      this.databaseFallbackReady = true;
      return true;
    } catch {
      return deleted;
    }
  }

  private async consumeRedisRateLimit(key: string, windowMs: number): Promise<{ count: number; ttlMs: number } | null> {
    if (!this.client || !this.ready) return null;
    try {
      const result = await this.client.eval(RATE_LIMIT_SCRIPT, {
        keys: [`azez:rate-limit:${key}`],
        arguments: [String(windowMs)],
      });
      if (!Array.isArray(result)) return null;
      const count = Number(result[0]);
      const ttlMs = Number(result[1]);
      return Number.isFinite(count) && Number.isFinite(ttlMs) ? { count, ttlMs } : null;
    } catch {
      return null;
    }
  }

  private async checkDatabaseFallback(): Promise<boolean> {
    try {
      const rows = await this.database.client.$queryRaw<DatabaseTableRow[]>`
        SELECT to_regclass('public.rate_limit_buckets')::text AS "tableName"
      `;
      return Boolean(rows[0]?.tableName);
    } catch {
      return false;
    }
  }

  private async pruneDatabaseBuckets(): Promise<void> {
    try {
      await this.database.client.$executeRaw`
        DELETE FROM "rate_limit_buckets" WHERE "reset_at" < NOW() - INTERVAL '1 day'
      `;
    } catch {
      // Best-effort maintenance only; the atomic limiter remains available.
    }
  }
}
