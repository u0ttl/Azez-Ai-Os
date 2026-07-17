import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const archive = join(root, "Azez_AI_OS_v0.11.0_Signed.zip");
const temp = join(root, ".azez-bootstrap");
const source = join(temp, "azez-ai-os");
const overrides = join(root, "overrides");
const payloadDirectory = join(root, ".azez-payload");
const payloadSha256 = "45e7afd34871fcced93f145893b355e831d08a1266cf990bd5fd69b3eabf8123";

function replaceRequired(path, before, after, label) {
  const content = readFileSync(path, "utf8");
  if (!content.includes(before)) throw new Error(`Bootstrap patch target missing: ${label}`);
  writeFileSync(path, content.replace(before, after));
}

function replaceRequiredPattern(path, pattern, after, label) {
  const content = readFileSync(path, "utf8");
  const updated = content.replace(pattern, after);
  if (updated === content) throw new Error(`Bootstrap patch pattern missing: ${label}`);
  writeFileSync(path, updated);
}

if (!existsSync(archive)) throw new Error(`Missing archive: ${archive}`);
rmSync(temp, { recursive: true, force: true });
mkdirSync(temp, { recursive: true });
execFileSync("unzip", ["-q", archive, "-d", temp], { stdio: "inherit" });
if (!existsSync(join(source, "package.json")) || !existsSync(join(source, "apps", "web"))) throw new Error("Invalid AZEZ AI OS source archive.");
for (const legacyPath of ["index.html", "src", "README-old.md"]) rmSync(join(root, legacyPath), { recursive: true, force: true });
for (const entry of readdirSync(source)) cpSync(join(source, entry), join(root, entry), { recursive: true, force: true, dereference: true });

const payloadChunks = ["00", "01", "02", "03", "04", "05"].map((suffix) =>
  join(payloadDirectory, `desktop-overrides.b64.${suffix}`),
);
if (!payloadChunks.every(existsSync)) {
  throw new Error("Recovered AZEZ Desktop payload is incomplete.");
}
const payloadBase64 = payloadChunks.map((path) => readFileSync(path, "utf8").trim()).join("");
const payloadArchive = join(temp, "desktop-overrides.tar.xz");
const payloadBytes = Buffer.from(payloadBase64, "base64");
const payloadDigest = createHash("sha256").update(payloadBytes).digest("hex");
if (payloadDigest !== payloadSha256) {
  throw new Error(`Recovered AZEZ Desktop payload failed integrity verification: ${payloadDigest}`);
}
writeFileSync(payloadArchive, payloadBytes);
execFileSync("tar", ["-xJf", payloadArchive, "-C", root], { stdio: "inherit" });
console.log("Recovered AZEZ Desktop overrides with verified integrity.");

const recoveredDesktopPath = join(overrides, "components", "azez-desktop.tsx");
if (existsSync(recoveredDesktopPath)) {
  replaceRequired(
    recoveredDesktopPath,
    `    const clock = window.setInterval(() => setNow(new Date()), 1000);\n    setNow(new Date());\n    return () => { window.clearTimeout(timer); window.clearInterval(clock); };`,
    `    const clockStart = window.setTimeout(() => setNow(new Date()), 0);\n    const clock = window.setInterval(() => setNow(new Date()), 1000);\n    return () => { window.clearTimeout(timer); window.clearTimeout(clockStart); window.clearInterval(clock); };`,
    "deferred desktop clock initialization",
  );
}

if (existsSync(overrides)) {
  for (const entry of readdirSync(overrides)) cpSync(join(overrides, entry), join(root, entry), { recursive: true, force: true, dereference: true });
}

const desktopPath = join(root, "apps", "web", "components", "azez-desktop.tsx");
if (existsSync(desktopPath)) {
  replaceRequired(
    desktopPath,
    `import { WorkflowsWorkspace } from "@/components/workflows-workspace";`,
    `import { WorkflowsWorkspace } from "@/components/workflows-workspace";\nimport { VisionWorkspace, VoiceWorkspace } from "@/components/browser-tools-workspace";`,
    "desktop browser tools import",
  );
  replaceRequired(
    desktopPath,
    `      case "voice": return <BrowserCapability kind="voice" lang={lang} open={openWindow} />;\n      case "vision": return <BrowserCapability kind="vision" lang={lang} open={openWindow} />;`,
    `      case "voice": return <VoiceWorkspace lang={lang} />;\n      case "vision": return <VisionWorkspace lang={lang} />;`,
    "functional voice and vision workspaces",
  );
  replaceRequiredPattern(
    desktopPath,
    /\nfunction BrowserCapability\([\s\S]*?\n}\n\nexport function AzezDesktop/,
    "\nexport function AzezDesktop",
    "legacy browser capability placeholder",
  );
  replaceRequired(
    desktopPath,
    "          uptimeSeconds: health?.uptimeSeconds,",
    "          ...(health?.uptimeSeconds !== undefined ? { uptimeSeconds: health.uptimeSeconds } : {}),",
    "desktop optional uptime",
  );
  replaceRequired(
    desktopPath,
    "{[[\"PostgreSQL\",live.database],[\"Redis\",live.redis],[\"Malware Scanner\",live.scanner],[\"API Bridge\",live.api]].map(([name,status]) =>",
    "{([[\"PostgreSQL\",live.database],[\"Redis\",live.redis],[\"Malware Scanner\",live.scanner],[\"API Bridge\",live.api]] as const).map(([name,status]) =>",
    "desktop database status tuples",
  );
  replaceRequiredPattern(
    desktopPath,
    /\nfunction Sparkline\([\s\S]*?\n}\n\n/,
    "\n",
    "unused desktop Sparkline component",
  );
  console.log("Applied AZEZ Desktop functionality and compatibility patches.");
} else {
  console.log("Desktop compatibility patches skipped: source does not include azez-desktop.tsx.");
}

rmSync(temp, { recursive: true, force: true });
console.log("AZEZ AI OS 0.12.0 source and launch hardening overrides prepared for Vercel Preview.");
