import { injectAzezApi } from "@azez-api-source/serverless";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const preferredRegion = "syd1";

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);
const HOP_BY_HOP_HEADERS = new Set(["connection", "content-length", "transfer-encoding"]);

async function handle(request: NextRequest): Promise<Response> {
  try {
    const targetUrl = `${request.nextUrl.pathname.replace(/^\/api/, "")}${request.nextUrl.search}`;
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) headers[key] = value;
    });
    const payload = BODYLESS_METHODS.has(request.method) ? undefined : new Uint8Array(await request.arrayBuffer());
    const result = await injectAzezApi({
      method: request.method,
      url: targetUrl,
      headers,
      ...(payload ? { payload } : {}),
    });
    const responseHeaders = new Headers();
    for (const [key, value] of Object.entries(result.headers)) {
      if (value === undefined || HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
      if (Array.isArray(value)) for (const item of value) responseHeaders.append(key, String(item));
      else responseHeaders.append(key, String(value));
    }
    return new Response(request.method === "HEAD" ? null : result.body, {
      status: result.statusCode,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error("AZEZ API request unavailable", { name });
    return Response.json(
      { status: "unavailable", code: "API_CONFIGURATION_OR_STARTUP_FAILED" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
