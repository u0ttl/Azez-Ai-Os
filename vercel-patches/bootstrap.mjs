import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const archive = join(root, "Azez_AI_OS_v0.11.0_Signed.zip");
const archiveUrl = "https://raw.githubusercontent.com/u0ttl/Azez-Ai-Os/main/Azez_AI_OS_v0.11.0_Signed.zip";
const expectedGitBlobSha = "19a02df4e0e9b6c5660445fdea2a29cb9a473e3b";
const patchCommit = "8d13cd06a0a09b48cc26ef9bf6e6b109581cf676";
const patchBase = `https://raw.githubusercontent.com/u0ttl/Azez-Ai-Os/${patchCommit}/vercel-patches`;
const temp = join(root, ".azez-bootstrap");
const source = join(temp, "azez-ai-os");
const patches = {
  "application.ts": "apps/api/src/application.ts",
  "serverless.ts": "apps/api/src/serverless.ts",
  "route.ts": "apps/web/app/api/v1/[...path]/route.ts",
  "next.config.ts": "apps/web/next.config.ts",
  "api-smoke.mjs": "scripts/api-smoke.mjs"
};

const archiveResponse = await fetch(archiveUrl, { redirect: "follow" });
if (!archiveResponse.ok) throw new Error(`archive_download_failed_${archiveResponse.status}`);
const bytes = Buffer.from(await archiveResponse.arrayBuffer());
const blobSha = crypto.createHash("sha1").update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex");
if (blobSha !== expectedGitBlobSha) throw new Error("archive_integrity_failed");
writeFileSync(archive, bytes);

rmSync(temp, { recursive: true, force: true });
mkdirSync(temp, { recursive: true });
execFileSync("unzip", ["-q", archive, "-d", temp], { stdio: "inherit" });
if (!existsSync(join(source, "apps", "api", "src", "app.module.ts"))) throw new Error("unexpected_archive_structure");

for (const [patchName, destination] of Object.entries(patches)) {
  const response = await fetch(`${patchBase}/${patchName}`, { redirect: "follow" });
  if (!response.ok) throw new Error(`patch_download_failed_${patchName}_${response.status}`);
  const target = join(source, destination);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
}
for (const obsolete of ["next.config.js", "next.config.mjs", "next.config.cjs"]) {
  rmSync(join(source, "apps", "web", obsolete), { force: true });
}

const apiTsconfigPath = join(source, "apps", "api", "tsconfig.json");
const apiTsconfig = JSON.parse(readFileSync(apiTsconfigPath, "utf8"));
apiTsconfig.compilerOptions ??= {};
Object.assign(apiTsconfig.compilerOptions, {
  rootDir: ".",
  outDir: "./dist",
  module: "NodeNext",
  moduleResolution: "NodeNext"
});
apiTsconfig.include = ["src/**/*.ts", "test/**/*.ts"];
writeFileSync(apiTsconfigPath, `${JSON.stringify(apiTsconfig, null, 2)}\n`);

const apiPackagePath = join(source, "apps", "api", "package.json");
const apiPackage = JSON.parse(readFileSync(apiPackagePath, "utf8"));
apiPackage.exports ??= {};
apiPackage.exports["./serverless"] = {
  types: "./dist/src/serverless.d.ts",
  import: "./dist/src/serverless.js"
};
apiPackage.scripts ??= {};
apiPackage.scripts.build = "nest build";
writeFileSync(apiPackagePath, `${JSON.stringify(apiPackage, null, 2)}\n`);

const webPackagePath = join(source, "apps", "web", "package.json");
const webPackage = JSON.parse(readFileSync(webPackagePath, "utf8"));
webPackage.dependencies ??= {};
webPackage.dependencies["@azez/api"] = "workspace:*";
writeFileSync(webPackagePath, `${JSON.stringify(webPackage, null, 2)}\n`);

const separationPath = join(source, "docs", "PROJECT_SEPARATION.md");
mkdirSync(dirname(separationPath), { recursive: true });
writeFileSync(separationPath, "# AZEZ AI OS — Project Boundary\n\nAZEZ AI OS is standalone. AZEZ LAB AI is outside this repository and deployment.\n");

for (const legacy of ["index.html", "src", "README-old.md"]) {
  rmSync(join(root, legacy), { recursive: true, force: true });
}
for (const entry of readdirSync(source)) {
  cpSync(join(source, entry), join(root, entry), {
    recursive: true,
    force: true,
    dereference: true
  });
}
rmSync(temp, { recursive: true, force: true });
console.log("AZEZ AI OS source and service tests prepared for Vercel Preview.");
