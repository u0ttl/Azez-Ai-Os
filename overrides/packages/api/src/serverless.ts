import type { FastifyInstance, InjectOptions } from "fastify";
import { createApiApplication } from "./application.js";

const globalApi = globalThis as typeof globalThis & {
  __azezApiFastify?: Promise<FastifyInstance>;
};

async function initializeApi(): Promise<FastifyInstance> {
  const app = await createApiApplication({ serverless: true });
  await app.init();
  const fastify = app.getHttpAdapter().getInstance() as FastifyInstance;
  await fastify.ready();
  return fastify;
}

function getAzezApiFastify(): Promise<FastifyInstance> {
  globalApi.__azezApiFastify ??= initializeApi().catch((error: unknown) => {
    delete globalApi.__azezApiFastify;
    const details = error instanceof Error
      ? { name: error.name, message: error.message, code: (error as Error & { code?: unknown }).code }
      : { name: "UnknownError", message: String(error) };
    console.error("AZEZ API initialization failed", details);
    throw error;
  });
  return globalApi.__azezApiFastify;
}

export interface AzezApiInjectionRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  payload?: Uint8Array;
}

export interface AzezApiInjectionResponse {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: ArrayBuffer;
}

export async function injectAzezApi(
  request: AzezApiInjectionRequest,
): Promise<AzezApiInjectionResponse> {
  const api = await getAzezApiFastify();
  const options: InjectOptions = {
    method: request.method.toUpperCase() as NonNullable<InjectOptions["method"]>,
    url: request.url,
    headers: request.headers,
    ...(request.payload ? { payload: Buffer.from(request.payload) } : {}),
  };
  const result = await api.inject(options);

  const headers: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(result.headers)) {
    if (value === undefined) continue;
    headers[key] = Array.isArray(value) ? value.map(String) : String(value);
  }

  const bytes = Uint8Array.from(result.rawPayload);
  return {
    statusCode: result.statusCode,
    headers,
    body: bytes.buffer,
  };
}
