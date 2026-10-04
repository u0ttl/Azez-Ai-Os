import { HttpException, HttpStatus, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { RedisService } from "../redis/redis.service.js";

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class SecurityRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly redis?: RedisService) {}

  async consume(key: string, limit: number, windowMs: number): Promise<void> {
    const distributed = await this.redis?.consumeRateLimit(key, windowMs);
    if (distributed) {
      if (distributed.count > limit) this.reject(distributed.ttlMs);
      return;
    }
    if (this.redis?.isRequired()) throw new ServiceUnavailableException({ code: "RATE_LIMITER_UNAVAILABLE" });
    const now = Date.now();
    if (this.buckets.size > 10_000) this.prune(now);
    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (current.count >= limit) {
      this.reject(current.resetAt - now);
    }
    current.count += 1;
  }

  async reset(key: string): Promise<void> {
    await this.redis?.deleteRateLimit(key);
    this.buckets.delete(key);
  }

  private reject(ttlMs: number): never {
    const retryAfterSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
    throw new HttpException({ code: "RATE_LIMITED", retryAfterSeconds }, HttpStatus.TOO_MANY_REQUESTS);
  }

  private prune(now: number): void {
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
  }
}
