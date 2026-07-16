import "dotenv/config";
import fastifyCookie from "@fastify/cookie";
import fastifyMultipart from "@fastify/multipart";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppModule } from "./app.module.js";
import { MetricsService } from "./metrics/metrics.service.js";
import { SecurityRateLimiter } from "./security/rate-limiter.service.js";

interface ApiApplicationOptions {
  serverless?: boolean;
}

function productionWebOrigin(): string {
  if (process.env.WEB_ORIGIN) return process.env.WEB_ORIGIN;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

function swaggerEnabled(): boolean {
  if (process.env.SWAGGER_ENABLED === "true") return true;
  return process.env.NODE_ENV !== "production" && process.env.SWAGGER_ENABLED !== "false";
}

export async function createApiApplication(
  options: ApiApplicationOptions = {},
): Promise<NestFastifyApplication> {
  if (process.env.NODE_ENV === "production" && (process.env.SESSION_SECRET?.length ?? 0) < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters in production");
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.API_LOGGER !== "false",
      bodyLimit: 12 * 1024 * 1024,
      trustProxy: process.env.TRUST_PROXY === "true" || Boolean(process.env.VERCEL),
    }),
  );

  await app.register(fastifyCookie);
  await app.register(fastifyMultipart, {
    limits: {
      files: 1,
      fileSize: Number(process.env.FILE_MAX_BYTES ?? 10 * 1024 * 1024),
      fields: 10,
    },
    throwFileSizeLimit: true,
  });

  app.setGlobalPrefix("v1");
  app.enableCors({ origin: productionWebOrigin(), credentials: true });

  const server = app.getHttpAdapter().getInstance() as FastifyInstance;
  const requestStartedAt = new WeakMap<FastifyRequest, bigint>();
  const metrics = app.get(MetricsService);
  const rateLimiter = app.get(SecurityRateLimiter);

  server.addHook("onRequest", async (request) => {
    requestStartedAt.set(request, process.hrtime.bigint());
  });
  server.addHook("onResponse", async (request, reply) => {
    const startedAt = requestStartedAt.get(request);
    const durationSeconds = startedAt
      ? Number(process.hrtime.bigint() - startedAt) / 1_000_000_000
      : 0;
    const route = request.routeOptions?.url ?? "unmatched";
    metrics.recordHttp(request.method, route, reply.statusCode, durationSeconds);
  });
  server.addHook("preHandler", async (request) => {
    const route = request.routeOptions?.url ?? request.url;
    if (route.startsWith("/v1/health") || route === "/v1/metrics" || route.startsWith("/docs")) return;
    await rateLimiter.consume(
      `api:${request.ip}`,
      Number(process.env.API_RATE_LIMIT_PER_MINUTE ?? 300),
      60_000,
    );
  });
  server.addHook("onSend", async (request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
    reply.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
    reply.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    reply.header("x-request-id", request.id);
    reply.header("cache-control", "no-store");
    if (process.env.NODE_ENV === "production") {
      reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");
    }
    return payload;
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  if (swaggerEnabled()) {
    const config = new DocumentBuilder()
      .setTitle("Azez AI OS API")
      .setDescription("واجهات منصة Azez AI OS متعددة المؤسسات")
      .setVersion(process.env.BUILD_VERSION ?? "0.11.0")
      .addCookieAuth("azez_session")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document, {
      jsonDocumentUrl: "docs/openapi.json",
      swaggerOptions: { persistAuthorization: false },
    });
  }

  if (!options.serverless) app.enableShutdownHooks();
  return app;
}
