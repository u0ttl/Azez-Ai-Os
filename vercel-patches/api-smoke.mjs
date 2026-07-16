import { injectAzezApi } from "../apps/api/dist/src/serverless.js";

async function probe(url) {
  const result = await injectAzezApi({
    method: "GET",
    url,
    headers: { accept: "application/json" },
  });
  const body = Buffer.from(result.body).toString("utf8");
  console.log(`[API_SMOKE] ${url} status=${result.statusCode} body=${body.slice(0, 1200)}`);
  return result.statusCode;
}

try {
  const health = await probe("/v1/health");
  const ready = await probe("/v1/health/ready");
  if (health !== 200 || ready !== 200) process.exitCode = 1;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[API_SMOKE] startup_failed ${message}`);
  process.exitCode = 1;
}
