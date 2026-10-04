const baseUrl = (process.env.API_BASE_URL ?? "http://localhost:4000/v1").replace(/\/$/, "");
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const cookies = new Map();

function captureCookies(response) {
  const headers = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  for (const header of headers) {
    const [pair] = header.split(";", 1);
    const separator = pair.indexOf("=");
    if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function cookieHeader() {
  return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  if (cookies.size > 0) headers.set("cookie", cookieHeader());
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  captureCookies(response);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const health = await request("/health/ready");
if (health.status !== "ready") throw new Error("API is not ready");
const { csrfToken } = await request("/auth/csrf");
const headers = { "content-type": "application/json", "x-csrf-token": csrfToken };
const user = await request("/auth/register", {
  method: "POST",
  headers,
  body: JSON.stringify({
    name: "Smoke Test",
    email: `smoke-${runId}@example.test`,
    password: `Smoke-Test-${runId}!`,
    organizationName: `Smoke ${runId}`,
    organizationSlug: `smoke-${runId}`,
    locale: "ar",
  }),
});
if (!user.id) throw new Error("Registration response did not include a user id");
const identity = await request("/auth/me");
if (identity.userId !== user.id) throw new Error("Authenticated identity does not match registration");
const organizations = await request("/organizations");
if (!Array.isArray(organizations) || organizations.length !== 1) throw new Error("Tenant-scoped organization lookup failed");
process.stdout.write(`Smoke E2E passed for ${user.email ?? user.id}\n`);
