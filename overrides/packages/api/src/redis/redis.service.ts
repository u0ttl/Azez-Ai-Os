import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createClient } from "redis";

const RATE_LIMIT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`;

type RedisClient = ReturnType<typeof createClient>;

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

  async onModuleInit(): Promise<void> {
    if (!this.url) {
      if (this.required) {
        this.logger.error("Redis is required but REDIS_URL is not configured; readiness remains unavailable");
      } else {
        this.logger.warn("Redis is not configured; distributed controls use the development fallback");
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
      const message = error instanceof Error ? error.message : "unknown";
      if (this.required) {
        this.logger.error(`Required Redis connection failed; readiness remains unavailable: ${message}`);
      } else {
        this.logger.warn("Redis connection failed; distributed controls use the development fallback");
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

  async ping(): Promise<"up" | "down" | "disabled"> {
    if (!this.url) return "disabled";
    if (!this.client || !this.ready) return "down";
    try {
      return (await this.client.ping()) === "PONG" ? "up" : "down";
    } catch {
      return "down";
    }
  }

  async consumeRateLimit(
    key: string,
    windowMs: number,
  ): Promise<{ count: number; ttlMs: number } | null> {
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

  async deleteRateLimit(key: string): Promise<boolean> {
    if (!this.client || !this.ready) return false;
    try {
      await this.client.del(`azez:rate-limit:${key}`);
      return true;
    } catch {
      return false;
    }
  }
}
