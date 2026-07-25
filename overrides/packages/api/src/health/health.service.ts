import { Injectable } from "@nestjs/common";
import { AIGatewayService } from "../ai/ai-gateway.service.js";
import { DatabaseService } from "../database/database.service.js";
import { EmailWorkerService } from "../email/email-worker.service.js";
import { MalwareScannerService } from "../files/malware-scanner.service.js";
import { ObjectStorageService } from "../files/object-storage.service.js";
import { RedisService } from "../redis/redis.service.js";

const SERVICE_NAME = "azez-ai-os-api";

interface PreviewMigrationStateRow {
  fileObjects: string | null;
  fileObjectsRls: boolean | null;
  rateLimitBuckets: string | null;
  rateLimitBucketsRls: boolean | null;
}

interface DatabaseRoleRow {
  roleName: string;
}

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

  async applyPreviewMigrations() {
    const statements = [
      `CREATE TABLE IF NOT EXISTS public.file_objects (
        storage_key VARCHAR(500) PRIMARY KEY,
        content BYTEA NOT NULL,
        mime_type VARCHAR(160) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `ALTER TABLE public.file_objects ENABLE ROW LEVEL SECURITY`,
      `CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
        bucket_key VARCHAR(500) PRIMARY KEY,
        count INTEGER NOT NULL CHECK (count > 0),
        reset_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS rate_limit_buckets_reset_at_idx ON public.rate_limit_buckets (reset_at)`,
      `ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY`,
    ];

    for (const statement of statements) {
      await this.database.client.$executeRawUnsafe(statement);
    }

    const roles: DatabaseRoleRow[] = await this.database.client.$queryRaw<DatabaseRoleRow[]>`
      SELECT rolname AS "roleName"
      FROM pg_roles
      WHERE rolname IN ('anon', 'authenticated')
    `;
    for (const role of roles) {
      if (role.roleName !== "anon" && role.roleName !== "authenticated") continue;
      const quotedRole = `"${role.roleName}"`;
      await this.database.client.$executeRawUnsafe(`REVOKE ALL PRIVILEGES ON TABLE public.file_objects FROM ${quotedRole}`);
      await this.database.client.$executeRawUnsafe(`REVOKE ALL PRIVILEGES ON TABLE public.rate_limit_buckets FROM ${quotedRole}`);
    }

    const rows = await this.database.client.$queryRaw<PreviewMigrationStateRow[]>`
      SELECT
        to_regclass('public.file_objects')::text AS "fileObjects",
        (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.file_objects')) AS "fileObjectsRls",
        to_regclass('public.rate_limit_buckets')::text AS "rateLimitBuckets",
        (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.rate_limit_buckets')) AS "rateLimitBucketsRls"
    `;
    const state = rows[0];
    return {
      status: state?.fileObjects && state?.rateLimitBuckets && state.fileObjectsRls && state.rateLimitBucketsRls ? "ready" : "not_ready",
      fileObjects: { exists: Boolean(state?.fileObjects), rlsEnabled: Boolean(state?.fileObjectsRls) },
      rateLimitBuckets: { exists: Boolean(state?.rateLimitBuckets), rlsEnabled: Boolean(state?.rateLimitBucketsRls) },
      revokedRoles: roles.map((role: DatabaseRoleRow) => role.roleName),
      timestamp: new Date().toISOString(),
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
