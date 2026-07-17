import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const archive = join(root, "Azez_AI_OS_v0.11.0_Signed.zip");
const temp = join(root, ".azez-bootstrap");
const source = join(temp, "azez-ai-os");
const overrides = join(root, "overrides");

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
if (existsSync(overrides)) {
  for (const entry of readdirSync(overrides)) cpSync(join(overrides, entry), join(root, entry), { recursive: true, force: true, dereference: true });
}

const desktopPath = join(root, "apps", "web", "components", "azez-desktop.tsx");
if (existsSync(desktopPath)) {
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
  console.log("Applied optional desktop compatibility patches.");
} else {
  console.log("Desktop compatibility patches skipped: source does not include azez-desktop.tsx.");
}

rmSync(temp, { recursive: true, force: true });
console.log("AZEZ AI OS 0.12.0 source and launch hardening overrides prepared for Vercel Preview.");
