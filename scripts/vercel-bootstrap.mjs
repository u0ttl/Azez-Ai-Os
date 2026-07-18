import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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

const interfaceHardeningPath = join(overrides, "app", "interface-hardening.css");
const globalStylesPath = join(root, "app", "globals.css");
if (existsSync(interfaceHardeningPath) && existsSync(globalStylesPath)) {
  appendFileSync(globalStylesPath, `\n\n${readFileSync(interfaceHardeningPath, "utf8")}\n`);
  console.log("Applied responsive menu, card, contrast, and overlap hardening.");
}

const desktopPath = join(root, "components", "azez-desktop.tsx");
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
    `import { AIWorkspace } from "@/components/ai-workspace";`,
    `import { AIWorkspace } from "@/components/ai-workspace";\nimport { AccountWorkspace } from "@/components/auth-workspace";`,
    "desktop account workspace import",
  );
  replaceRequired(
    desktopPath,
    `  | "home"\n  | "ai"`,
    `  | "home"\n  | "account"\n  | "ai"`,
    "desktop account window id",
  );
  replaceRequired(
    desktopPath,
    `const EXTRA_ITEMS: NavItem[] = [\n  { id: "notifications"`,
    `const EXTRA_ITEMS: NavItem[] = [\n  { id: "account", en: "Account", ar: "الحساب", icon: "AZ", subtitleEn: "Sign in or create a workspace", subtitleAr: "تسجيل الدخول أو إنشاء مساحة عمل" },\n  { id: "notifications"`,
    "desktop account navigation item",
  );
  replaceRequired(
    desktopPath,
    `        <button type="button" onClick={() => { window.location.href = signedIn ? "/security" : "/login"; }}>{signedIn ? (lang === "ar" ? "إدارة الأمان" : "Security") : (lang === "ar" ? "تسجيل الدخول" : "Sign in")}</button>`,
    `        <button type="button" onClick={() => open(signedIn ? "security" : "account")}>{signedIn ? (lang === "ar" ? "إدارة الأمان" : "Security") : (lang === "ar" ? "تسجيل أو إنشاء حساب" : "Sign in or create account")}</button>`,
    "desktop inline account action",
  );
  replaceRequired(
    desktopPath,
    `  const [lang, setLang] = useState<Lang>("en");`,
    `  const [lang, setLang] = useState<Lang>("ar");`,
    "desktop Arabic default",
  );
  replaceRequired(
    desktopPath,
    `<button className="language-toggle" type="button" onClick={() => setLang((current) => current === "ar" ? "en" : "ar")}><span>{lang === "ar" ? "English" : "العربية"}</span></button>`,
    `<button className="language-toggle" type="button" onClick={() => setLang((current) => current === "ar" ? "en" : "ar")} aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"} title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}><span>{lang === "ar" ? "EN" : "ع"}</span></button>`,
    "desktop language badge",
  );
  replaceRequired(
    desktopPath,
    `      case "home": return <HomeWorkspace snapshot={snapshot} lang={lang} open={openWindow} refresh={() => void refresh()} />;\n      case "ai": return <AIWorkspace />;`,
    `      case "home": return <HomeWorkspace snapshot={snapshot} lang={lang} open={openWindow} refresh={() => void refresh()} />;\n      case "account": return <AccountWorkspace lang={lang} identity={snapshot.identity} onSessionChanged={refresh} openSecurity={() => openWindow("security")} />;\n      case "ai": return <AIWorkspace />;`,
    "desktop account renderer",
  );
  replaceRequired(
    desktopPath,
    `        <button className="owner-card" type="button" onClick={() => openWindow(snapshot.identity ? "settings" : "security")}>`,
    `        <button className="owner-card" type="button" onClick={() => openWindow("account")}>`,
    "desktop owner account launcher",
  );
  console.log("Applied AZEZ Desktop functionality, inline account access, and compatibility patches.");
} else {
  console.log("Desktop compatibility patches skipped: source does not include azez-desktop.tsx.");
}

const browserToolsPath = join(overrides, "components", "browser-tools-workspace.tsx");
if (existsSync(browserToolsPath)) {
  replaceRequired(
    browserToolsPath,
    `import { useEffect, useRef, useState } from "react";`,
    `import { useEffect, useRef, useState, useSyncExternalStore } from "react";`,
    "browser tools external-store import",
  );
  replaceRequired(
    browserToolsPath,
    `  const [supported, setSupported] = useState(false);`,
    `  const supported = useSyncExternalStore(\n    () => () => undefined,\n    () => Boolean(recognitionConstructor()),\n    () => false,\n  );`,
    "browser voice support snapshot",
  );
  replaceRequired(
    browserToolsPath,
    `  useEffect(() => {\n    setSupported(Boolean(recognitionConstructor()));\n    return () => recognizer.current?.abort();\n  }, []);`,
    `  useEffect(() => () => recognizer.current?.abort(), []);`,
    "browser voice cleanup effect",
  );
  console.log("Applied SSR-safe browser capability detection.");
}

rmSync(temp, { recursive: true, force: true });
console.log("AZEZ AI OS 0.12.0 source and launch hardening overrides prepared for Vercel Preview.");
