import { Injectable } from "@nestjs/common";
import { AIGatewayService } from "../ai/ai-gateway.service.js";
import { DatabaseService } from "../database/database.service.js";
import { EmailWorkerService } from "../email/email-worker.service.js";
import { MalwareScannerService } from "../files/malware-scanner.service.js";
import { ObjectStorageService } from "../files/object-storage.service.js";
import { RedisService } from "../redis/redis.service.js";

const SERVICE_NAME = "azez-ai-os-api";

function runtimeEnv(name: string): string | undefined {
  const value = globalThis.process?.env?.[name]?.trim();
  return value ? value : undefined;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    private readonly scanner: MalwareScannerService,
    private readonly storage: ObjectStorageService,
    private readonly email: EmailWorkerService,
    private readonly ai: AIGatewayService,
  ) {}

  liveness() {
    return {
      status: "ok" as const,
      service: SERVICE_NAME,
      version: runtimeEnv("BUILD_VERSION") ?? "0.12.0",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  version() {
    return {
      service: SERVICE_NAME,
      version: runtimeEnv("BUILD_VERSION") ?? "0.12.0",
      commit: runtimeEnv("BUILD_COMMIT") ?? runtimeEnv("VERCEL_GIT_COMMIT_SHA") ?? "development",
      branch: runtimeEnv("BUILD_BRANCH") ?? runtimeEnv("VERCEL_GIT_COMMIT_REF") ?? null,
      deployment: runtimeEnv("VERCEL_DEPLOYMENT_ID") ?? runtimeEnv("VERCEL_URL") ?? null,
      builtAt: runtimeEnv("BUILD_TIMESTAMP") ?? null,
    };
  }

  async readiness() {
    const databaseStartedAt = performance.now();
    let database: { status: "up" | "down"; latencyMs: number };
    try {
      await this.database.client.$queryRaw`SELECT 1`;
      database = { status: "up", latencyMs: Math.round(performance.now() - databaseStartedAt) };
    } catch {
      database = { status: "down", latencyMs: Math.round(performance.now() - databaseStartedAt) };
    }

    const redisStartedAt = performance.now();
    const redisStatus = await this.redis.ping();
    const redis = {
      status: redisStatus,
      mode: this.redis.mode(),
      required: this.redis.isRequired(),
      latencyMs: Math.round(performance.now() - redisStartedAt),
    };

    const scannerStartedAt = performance.now();
    const scannerStatus = await this.scanner.ping();
    const malwareScanner = { status: scannerStatus, required: this.scanner.isRequired(), latencyMs: Math.round(performance.now() - scannerStartedAt) };

    const storageStartedAt = performance.now();
    const storageStatus = await this.storage.ping();
    const storage = { status: storageStatus, mode: this.storage.mode(), required: true, latencyMs: Math.round(performance.now() - storageStartedAt) };

    const emailStartedAt = performance.now();
    const emailStatus = await this.email.ping();
    const email = { status: emailStatus, required: this.email.isRequired(), latencyMs: Math.round(performance.now() - emailStartedAt) };

    const aiStatus = this.ai.healthStatus();
    const ai = { ...aiStatus, required: this.ai.isRequired() };

    const ready =
      database.status === "up" &&
      (!redis.required || redis.status === "up") &&
      (!malwareScanner.required || malwareScanner.status === "up") &&
      storage.status === "up" &&
      (!email.required || email.status === "up") &&
      (!ai.required || ai.status === "up");

    return {
      status: ready ? ("ready" as const) : ("not_ready" as const),
      checks: { database, redis, malwareScanner, storage, email, ai },
      timestamp: new Date().toISOString(),
    };
  }
}
