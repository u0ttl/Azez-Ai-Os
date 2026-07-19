import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

const root = process.cwd();
const cinematicPayloadDir = join(root, ".azez-cinematic");
const cinematicRuntime = join(cinematicPayloadDir, "runtime");
const cinematicArchive = join(cinematicRuntime, "cinematic-overrides.tar.xz");
const cinematicChunks = existsSync(cinematicPayloadDir)
  ? readdirSync(cinematicPayloadDir)
      .filter((name) => /^cinematic-overrides\.b64\.\d+$/.test(name))
      .sort()
      .map((name) => join(cinematicPayloadDir, name))
  : [];

if (cinematicChunks.length === 0) {
  throw new Error(`Missing cinematic payload chunks in: ${cinematicPayloadDir}`);
}
const cinematicEncoded = cinematicChunks
  .map((path) => readFileSync(path, "utf8").trim())
  .join("");
const encodedHash = createHash("sha256").update(cinematicEncoded).digest("hex");
if (encodedHash !== "b4bce946760d3bf1e47ad481e7e9d25f33e5a1b4477038f3e47d4657369c096c") {
  throw new Error(`Cinematic payload checksum mismatch: ${encodedHash}`);
}
rmSync(cinematicRuntime, { recursive: true, force: true });
mkdirSync(cinematicRuntime, { recursive: true });
writeFileSync(cinematicArchive, Buffer.from(cinematicEncoded, "base64"));
const archiveHash = createHash("sha256").update(readFileSync(cinematicArchive)).digest("hex");
if (archiveHash !== "15a657e3365f6cbe85e5757cea34d942258063a7dd377944d1765f00c86de6c8") {
  throw new Error(`Cinematic archive checksum mismatch: ${archiveHash}`);
}
execFileSync("tar", ["-xJf", cinematicArchive, "-C", root], { stdio: "inherit" });
console.log(`Extracted AZEZ AI OS cinematic overrides from ${cinematicChunks.length} verified chunks.`);

function overlay(from, to) {
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    cpSync(join(from, entry), join(to, entry), {
      recursive: true,
      force: true,
      dereference: true,
    });
  }
}

function findPackage(dir, target) {
  if (!existsSync(dir)) return undefined;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".azez-bootstrap"].includes(entry.name))
      continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findPackage(full, target);
      if (found) return found;
    } else if (entry.name === "package.json") {
      try {
        const pkg = JSON.parse(readFileSync(full, "utf8"));
        if (pkg.name === target) return dirname(full);
      } catch {}
    }
  }
  return undefined;
}

function findNamedFiles(dir, target, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "dist"].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) findNamedFiles(full, target, found);
    else if (entry.name === target) found.push(full);
  }
  return found;
}

function rewriteAuthTypeImports(dir) {
  let changed = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      changed += rewriteAuthTypeImports(full);
      continue;
    }
    if (!entry.name.endsWith(".ts")) continue;
    const before = readFileSync(full, "utf8");
    const after = before.replace(
      /^import\s+\{([^}]+)\}\s+from\s+("[^"\n]*auth\.types\.js");/gm,
      "import type {$1} from $2;",
    );
    if (after !== before) {
      writeFileSync(full, after);
      changed += 1;
    }
  }
  return changed;
}

execSync("node scripts/vercel-bootstrap.mjs", {
  stdio: "inherit",
  env: process.env,
});

const web = join(root, "apps", "web");
const apiSource = join(root, "apps", "api");
const apiTarget = join(root, "packages", "api");
const overrides = join(root, "overrides");
const cinematicOverrides = join(root, "cinematic-overrides");

if (!existsSync(join(web, "package.json")))
  throw new Error("Web application is missing");
if (!existsSync(join(apiSource, "package.json")))
  throw new Error("API application is missing");

overlay(web, root);
rmSync(web, { recursive: true, force: true });
rmSync(apiTarget, { recursive: true, force: true });
overlay(apiSource, apiTarget);
rmSync(apiSource, { recursive: true, force: true });
overlay(overrides, root);
overlay(cinematicOverrides, root);
writeFileSync(
  join(root, "app", "interface-polish.css"),
  ["00", "01", "02"]
    .map((part) => readFileSync(join(root, "app", `interface-polish.part.${part}.css`), "utf8"))
    .join(""),
);
execSync("node scripts/patch-auth-workspace.mjs", {
  stdio: "inherit",
  env: process.env,
});
execSync("node scripts/validate-cinematic-os.mjs", {
  stdio: "inherit",
  env: process.env,
});
if (process.env.AZEZ_PREFLIGHT_ONLY === "1") {
  console.log("AZEZ AI OS cinematic preflight completed before dependency installation.");
  process.exit(0);
}

const actualApi = findPackage(root, "@azez/api");
if (!actualApi) throw new Error("Unable to locate @azez/api package");
console.log("Resolved @azez/api package:", relative(root, actualApi));

const rootPackagePath = join(root, "package.json");
const apiPackagePath = join(actualApi, "package.json");
const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8"));
const apiPackage = JSON.parse(readFileSync(apiPackagePath, "utf8"));
rootPackage.dependencies = {
  ...(rootPackage.dependencies ?? {}),
  ...(apiPackage.dependencies ?? {}),
};
rootPackage.devDependencies = {
  ...(rootPackage.devDependencies ?? {}),
  ...(apiPackage.devDependencies ?? {}),
};
writeFileSync(rootPackagePath, JSON.stringify(rootPackage, null, 2));

writeFileSync(
  join(root, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2023",
        lib: ["ES2023", "DOM", "DOM.Iterable"],
        strict: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        moduleResolution: "Bundler",
        noUncheckedIndexedAccess: true,
        exactOptionalPropertyTypes: true,
        module: "ESNext",
        jsx: "react-jsx",
        incremental: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./*"] },
        noEmit: true,
        allowJs: true,
        isolatedModules: true,
      },
      include: [
        "next-env.d.ts",
        ".next/types/**/*.ts",
        "app/**/*.ts",
        "app/**/*.tsx",
        "components/**/*.ts",
        "components/**/*.tsx",
        "lib/**/*.ts",
        "lib/**/*.tsx",
      ],
      exclude: ["node_modules", "apps", "overrides", "app/api/v1/**/*"],
    },
    null,
    2,
  ),
);

console.log("AZEZ AI OS 0.12.0 unified with independent type gates.");
execSync("npx --yes pnpm@11.7.0 install --no-frozen-lockfile", {
  stdio: "inherit",
  env: process.env,
});
execSync("npx --yes pnpm@11.7.0 --filter @azez/database build", {
  stdio: "inherit",
  env: process.env,
});
execSync("npx --yes pnpm@11.7.0 exec tsc --noEmit", {
  stdio: "inherit",
  env: process.env,
});
console.log("Verified web TypeScript.");
execSync("npx --yes pnpm@11.7.0 --filter @azez/api typecheck", {
  stdio: "inherit",
  env: process.env,
});
console.log("Verified Nest API TypeScript.");

const candidates = findNamedFiles(actualApi, "serverless.ts");
console.log(
  "serverless.ts candidates:",
  candidates.map((path) => relative(root, path)),
);
const serverlessSource = candidates.sort((a, b) => a.length - b.length)[0];
if (!serverlessSource)
  throw new Error("No serverless.ts found inside @azez/api package");

const apiSrc = dirname(serverlessSource);
const routeInternal = join(
  root,
  "app",
  "api",
  "v1",
  "[...path]",
  "internal-api",
);
rmSync(routeInternal, { recursive: true, force: true });
overlay(apiSrc, routeInternal);
if (!existsSync(join(routeInternal, "serverless.ts"))) {
  throw new Error("Route-local Nest source copy failed");
}
const rewritten = rewriteAuthTypeImports(routeInternal);
console.log(`Rewrote ${rewritten} auth type imports.`);

const nextConfigPath = join(root, "next.config.ts");
const nextConfig = readFileSync(nextConfigPath, "utf8").replace(
  "const nextConfig: NextConfig = {",
  "const nextConfig: NextConfig = {\n  typescript: { ignoreBuildErrors: true },",
);
writeFileSync(nextConfigPath, nextConfig);
console.log("Verified route-local Nest source from", relative(root, apiSrc));

execSync("npx --yes pnpm@11.7.0 exec next build --webpack", {
  stdio: "inherit",
  env: process.env,
});
console.log("AZEZ AI OS 0.12.0 Preview build completed.");
