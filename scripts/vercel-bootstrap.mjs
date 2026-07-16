import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const archive = join(root, "Azez_AI_OS_v0.11.0_Signed.zip");
const temp = join(root, ".azez-bootstrap");
const source = join(temp, "azez-ai-os");

if (!existsSync(archive)) {
  throw new Error(`Missing archive: ${archive}`);
}

rmSync(temp, { recursive: true, force: true });
mkdirSync(temp, { recursive: true });
execFileSync("unzip", ["-q", archive, "-d", temp], { stdio: "inherit" });

if (!existsSync(join(source, "package.json")) || !existsSync(join(source, "apps", "web"))) {
  throw new Error("The signed archive does not contain the expected Azez AI OS project structure.");
}

const apiTsconfigPath = join(source, "apps", "api", "tsconfig.json");
const apiPackagePath = join(source, "apps", "api", "package.json");
const serverlessSourcePath = join(source, "apps", "api", "src", "serverless.ts");
const apiRoutePath = join(source, "apps", "web", "app", "api", "v1", "[...path]", "route.ts");
const desktopCopyPath = join(source, "apps", "web", "lib", "desktop-copy.ts");

for (const requiredPath of [
  apiTsconfigPath,
  apiPackagePath,
  serverlessSourcePath,
  apiRoutePath,
  desktopCopyPath,
]) {
  if (!existsSync(requiredPath)) {
    throw new Error(`Required unified-service file is missing: ${requiredPath}`);
  }
}

const apiTsconfig = JSON.parse(readFileSync(apiTsconfigPath, "utf8"));
apiTsconfig.compilerOptions ??= {};
apiTsconfig.compilerOptions.rootDir = ".";
apiTsconfig.compilerOptions.outDir = "./dist";
writeFileSync(apiTsconfigPath, `${JSON.stringify(apiTsconfig, null, 2)}\n`);

const apiPackage = JSON.parse(readFileSync(apiPackagePath, "utf8"));
apiPackage.exports ??= {};
apiPackage.exports["./serverless"] = {
  types: "./dist/src/serverless.d.ts",
  import: "./dist/src/serverless.js",
};
writeFileSync(apiPackagePath, `${JSON.stringify(apiPackage, null, 2)}\n`);

const desktopCopy = readFileSync(desktopCopyPath, "utf8")
  .replace("AZEZ Medical AI", "AI Agent Studio")
  .replace("AZEZ للذكاء الطبي", "استوديو الوكلاء الذكية");
writeFileSync(desktopCopyPath, desktopCopy);

const separationPath = join(source, "docs", "PROJECT_SEPARATION.md");
mkdirSync(dirname(separationPath), { recursive: true });
writeFileSync(
  separationPath,
  `# AZEZ AI OS — Project Boundary\n\nAZEZ AI OS is a standalone general-purpose AI operating system.\n\nAZEZ LAB AI and all medical laboratory workflows are outside this repository and deployment. They must use a separate repository, database, environment configuration, security policy, and Vercel project.\n`,
);

for (const legacyPath of ["index.html", "src", "README-old.md"]) {
  rmSync(join(root, legacyPath), { recursive: true, force: true });
}

for (const entry of readdirSync(source)) {
  cpSync(join(source, entry), join(root, entry), {
    recursive: true,
    force: true,
    dereference: true,
  });
}

rmSync(temp, { recursive: true, force: true });
console.log("Azez AI OS full-services source extracted and verified for Vercel Preview.");
