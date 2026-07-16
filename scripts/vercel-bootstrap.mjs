import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const archive = join(root, "Azez_AI_OS_v0.11.0_Signed.zip");
const temp = join(root, ".azez-bootstrap");
const source = join(temp, "azez-ai-os");
const overrides = join(root, "overrides");

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
rmSync(temp, { recursive: true, force: true });
console.log("AZEZ AI OS 0.12.0 source and launch hardening overrides prepared for Vercel Preview.");
