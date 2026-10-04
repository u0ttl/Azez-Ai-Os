import { spawn } from "node:child_process";

const port = 4199;
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["apps/api/dist/src/main.js"], {
  env: {
    ...process.env,
    API_HOST: "127.0.0.1",
    API_PORT: String(port),
    API_LOGGER: "false",
    API_RATE_LIMIT_PER_MINUTE: "2",
    NODE_ENV: "development",
    SWAGGER_ENABLED: "true",
    REDIS_URL: "",
    REDIS_REQUIRED: "false",
    CLAMAV_HOST: "",
    MALWARE_SCAN_REQUIRED: "false",
    DATABASE_URL: "postgresql://azez:invalid@127.0.0.1:65432/azez_ai_os?connect_timeout=1",
    SESSION_SECRET: "runtime-probe-session-secret-32-characters",
  },
  stdio: ["ignore", "ignore", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`API exited before probing: ${stderr}`);
    try {
      const response = await fetch(`${baseUrl}/v1/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not start in time: ${stderr}`);
}

try {
  await waitForServer();
  const health = await fetch(`${baseUrl}/v1/health`).then((response) => response.json());
  if (health.status !== "ok" || health.version !== "0.11.0") throw new Error("Liveness response is invalid");
  const ready = await fetch(`${baseUrl}/v1/health/ready`);
  if (ready.status !== 503) throw new Error("Readiness must fail while PostgreSQL is unavailable");
  const firstLimitedRequest = await fetch(`${baseUrl}/v1/auth/csrf`);
  const secondLimitedRequest = await fetch(`${baseUrl}/v1/auth/csrf`);
  const blockedRequest = await fetch(`${baseUrl}/v1/auth/csrf`);
  if (!firstLimitedRequest.ok || !secondLimitedRequest.ok || blockedRequest.status !== 429) throw new Error("Global API rate limiting is not active");
  const openApi = await fetch(`${baseUrl}/docs/openapi.json`).then((response) => response.json());
  if (!openApi.openapi || !openApi.paths?.["/v1/health"]) throw new Error("OpenAPI document is incomplete");
  const metrics = await fetch(`${baseUrl}/v1/metrics`).then((response) => response.text());
  if (!metrics.includes("azez_http_requests_total")) throw new Error("Prometheus metrics are unavailable");
  process.stdout.write("Runtime probe passed: startup, liveness, failed readiness, rate limiting, OpenAPI, and metrics\n");
} finally {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
