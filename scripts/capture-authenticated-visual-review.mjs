import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const [chromePath, origin, requestedOutput] = process.argv.slice(2);
if (!chromePath || !origin || !requestedOutput) {
  throw new Error("Usage: capture-authenticated-visual-review.mjs <chrome> <origin> <output-dir>");
}

const outputDirectory = resolve(requestedOutput);
const profile = mkdtempSync(join(tmpdir(), "azez-authenticated-review-"));
const browser = spawn(chromePath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--hide-scrollbars",
  "--force-device-scale-factor=1",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

let browserErrors = "";
browser.stderr.on("data", (chunk) => { browserErrors += chunk.toString(); });

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
const activePortPath = join(profile, "DevToolsActivePort");

try {
  for (let attempt = 0; attempt < 100 && !existsSync(activePortPath); attempt += 1) await delay(100);
  if (!existsSync(activePortPath)) throw new Error(`Chrome DevTools did not start. ${browserErrors.slice(-1200)}`);

  const [port, browserPath] = readFileSync(activePortPath, "utf8").trim().split("\n");
  const socket = new WebSocket(`ws://127.0.0.1:${port}${browserPath}`);
  await new Promise((resolveSocket, rejectSocket) => {
    socket.addEventListener("open", resolveSocket, { once: true });
    socket.addEventListener("error", rejectSocket, { once: true });
  });

  let commandId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(`${waiter.method}: ${message.error.message}`));
    else waiter.resolve(message.result ?? {});
  });

  const send = (method, params = {}, sessionId) => new Promise((resolveCommand, rejectCommand) => {
    const id = ++commandId;
    pending.set(id, { resolve: resolveCommand, reject: rejectCommand, method });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844,
  }, sessionId);

  const navigate = async (path) => {
    await send("Page.navigate", { url: `${origin}${path}` }, sessionId);
    await delay(3200);
    await send("Runtime.evaluate", {
      expression: "window.scrollTo(0,0); document.fonts?.ready",
      awaitPromise: true,
    }, sessionId);
    await delay(500);
  };

  await navigate("/");
  const login = await send("Runtime.evaluate", {
    expression: `(async () => {
      const csrfResponse = await fetch("/api/v1/auth/csrf", { credentials: "include", cache: "no-store" });
      const csrf = await csrfResponse.json();
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "x-csrf-token": csrf.csrfToken },
        body: JSON.stringify({
          email: "visual-review@example.test",
          password: "VisualReview!2026#Safe"
        })
      });
      return { ok: response.ok, status: response.status, body: await response.text() };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  const loginResult = login.result?.value;
  if (!loginResult?.ok) throw new Error(`Visual review login failed: ${JSON.stringify(loginResult)}`);

  const captures = [
    ["home-authenticated-mobile", "/"],
    ["account-mobile", "/?visual-review=account"],
    ["ai-mobile", "/?visual-review=ai"],
    ["projects-mobile", "/?visual-review=projects"],
    ["crm-mobile", "/?visual-review=crm"],
    ["knowledge-mobile", "/?visual-review=knowledge"],
    ["workflows-mobile", "/?visual-review=workflows"],
    ["billing-mobile", "/?visual-review=billing"],
    ["terminal-mobile", "/?visual-review=terminal"],
    ["settings-mobile", "/?visual-review=settings"],
  ];

  for (const [name, path] of captures) {
    await navigate(path);
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    }, sessionId);
    writeFileSync(join(outputDirectory, `${name}.png`), Buffer.from(screenshot.data, "base64"));
  }

  socket.close();
  console.log(`Captured ${captures.length} authenticated visual-review snapshots.`);
} finally {
  browser.kill("SIGTERM");
  rmSync(profile, { recursive: true, force: true });
}
