import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const desktopPath = join(process.cwd(), "components", "azez-desktop.tsx");
let desktop = readFileSync(desktopPath, "utf8");

function replaceOnce(before, after, marker, label) {
  if (desktop.includes(marker)) return;
  if (!desktop.includes(before)) throw new Error(`Final desktop patch target missing: ${label}`);
  desktop = desktop.replace(before, after);
  console.log(`Applied final desktop patch: ${label}.`);
}

replaceOnce(
  `import { WorkflowsWorkspace } from "@/components/workflows-workspace";`,
  `import { WorkflowsWorkspace } from "@/components/workflows-workspace";\nimport { VisionWorkspace, VoiceWorkspace } from "@/components/browser-tools-workspace";`,
  `import { VisionWorkspace, VoiceWorkspace } from "@/components/browser-tools-workspace";`,
  "browser tools import",
);
replaceOnce(
  `      case "voice": return <BrowserCapability kind="voice" lang={lang} open={openWindow} />;\n      case "vision": return <BrowserCapability kind="vision" lang={lang} open={openWindow} />;`,
  `      case "voice": return <VoiceWorkspace lang={lang} />;\n      case "vision": return <VisionWorkspace lang={lang} />;`,
  `case "voice": return <VoiceWorkspace`,
  "functional voice and vision workspaces",
);
if (desktop.includes("\nfunction BrowserCapability(")) {
  const updated = desktop.replace(/\nfunction BrowserCapability\([\s\S]*?\n}\n\nexport function AzezDesktop/, "\nexport function AzezDesktop");
  if (updated === desktop) throw new Error("Final desktop patch target missing: browser placeholder removal");
  desktop = updated;
  console.log("Applied final desktop patch: browser placeholder removal.");
}
replaceOnce(
  `import { AIWorkspace } from "@/components/ai-workspace";`,
  `import { AIWorkspace } from "@/components/ai-workspace";\nimport { AccountWorkspace } from "@/components/auth-workspace";`,
  `import { AccountWorkspace } from "@/components/auth-workspace";`,
  "account workspace import",
);
replaceOnce(
  `import { AccountWorkspace } from "@/components/auth-workspace";`,
  `import { AccountWorkspace } from "@/components/auth-workspace";\nimport { HolographicAICore } from "@/components/holographic-ai-core";`,
  `import { HolographicAICore } from "@/components/holographic-ai-core";`,
  "WebGL holographic core import",
);
replaceOnce(
  `  | "home"\n  | "ai"`,
  `  | "home"\n  | "account"\n  | "ai"`,
  `  | "account"`,
  "account window id",
);
replaceOnce(
  `const EXTRA_ITEMS: NavItem[] = [\n  { id: "notifications"`,
  `const EXTRA_ITEMS: NavItem[] = [\n  { id: "account", en: "Account", ar: "الحساب", icon: "AZ", subtitleEn: "Sign in or create a workspace", subtitleAr: "تسجيل الدخول أو إنشاء مساحة عمل" },\n  { id: "notifications"`,
  `{ id: "account", en: "Account"`,
  "account navigation item",
);
replaceOnce(
  `        <button type="button" onClick={() => { window.location.href = signedIn ? "/security" : "/login"; }}>{signedIn ? (lang === "ar" ? "إدارة الأمان" : "Security") : (lang === "ar" ? "تسجيل الدخول" : "Sign in")}</button>`,
  `        <button type="button" onClick={() => open(signedIn ? "security" : "account")}>{signedIn ? (lang === "ar" ? "إدارة الأمان" : "Security") : (lang === "ar" ? "تسجيل أو إنشاء حساب" : "Sign in or create account")}</button>`,
  `open(signedIn ? "security" : "account")`,
  "inline account action",
);
replaceOnce(
  `  const [lang, setLang] = useState<Lang>("en");`,
  `  const [lang, setLang] = useState<Lang>("ar");`,
  `useState<Lang>("ar")`,
  "Arabic default language",
);
replaceOnce(
  `<button className="language-toggle" type="button" onClick={() => setLang((current) => current === "ar" ? "en" : "ar")}><span>{lang === "ar" ? "English" : "العربية"}</span></button>`,
  `<button className="language-toggle" type="button" onClick={() => setLang((current) => current === "ar" ? "en" : "ar")} aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"} title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}><span>{lang === "ar" ? "EN" : "ع"}</span></button>`,
  `lang === "ar" ? "EN" : "ع"`,
  "Arabic and English language badge",
);
replaceOnce(
  `      case "home": return <HomeWorkspace snapshot={snapshot} lang={lang} open={openWindow} refresh={() => void refresh()} />;\n      case "ai": return <AIWorkspace />;`,
  `      case "home": return <HomeWorkspace snapshot={snapshot} lang={lang} open={openWindow} refresh={() => void refresh()} />;\n      case "account": return <AccountWorkspace lang={lang} {...(snapshot.identity ? { identity: snapshot.identity } : {})} onSessionChanged={refresh} openSecurity={() => openWindow("security")} />;\n      case "ai": return <AIWorkspace />;`,
  `case "account": return <AccountWorkspace`,
  "account renderer",
);
replaceOnce(
  `        <button className="owner-card" type="button" onClick={() => openWindow(snapshot.identity ? "settings" : "security")}>`,
  `        <button className="owner-card" type="button" onClick={() => openWindow("account")}>`,
  `className="owner-card" type="button" onClick={() => openWindow("account")}`,
  "owner account launcher",
);
replaceOnce(
  `        <div className="holographic-scene" data-fallback="true"><div className="holo-grid" /><div className="holo-core"><span /><span /><span /></div></div>`,
  `        <HolographicAICore onActivate={() => openWindow("ai")} label={lang === "ar" ? "فتح مساعد AZEZ ثلاثي الأبعاد" : "Open the AZEZ 3D assistant"} />`,
  `<HolographicAICore onActivate={() => openWindow("ai")}`,
  "interactive WebGL holographic core",
);

writeFileSync(desktopPath, desktop);
console.log("Final AZEZ Desktop functionality, language, and WebGL holographic core patches are present.");

const webglCorePath = join(process.cwd(), "components", "holographic-ai-core.tsx");
let webglCore = readFileSync(webglCorePath, "utf8");

function replaceWebglOnce(before, after, marker, label) {
  if (webglCore.includes(marker)) return;
  if (!webglCore.includes(before)) throw new Error(`WebGL core patch target missing: ${label}`);
  webglCore = webglCore.replace(before, after);
  console.log(`Applied WebGL core patch: ${label}.`);
}

replaceWebglOnce(
  `    const gl = (canvas.getContext("webgl2", contextOptions) ?? canvas.getContext("webgl", contextOptions)) as WebGLRenderingContext | null;`,
  `    const gl = (canvas.getContext("webgl", contextOptions) ?? canvas.getContext("webgl2", contextOptions)) as WebGLRenderingContext | null;`,
  `canvas.getContext("webgl", contextOptions) ?? canvas.getContext("webgl2"`,
  "prefer GLSL-compatible WebGL 1 context",
);
replaceWebglOnce(
  `  vec2 grid = abs(fract(point.xz * 0.68) - 0.5) / max(fwidth(point.xz * 0.68), vec2(0.002));\n  float line = 1.0 - min(min(grid.x, grid.y), 1.0);`,
  `  vec2 grid = abs(fract(point.xz * 0.68) - 0.5);\n  float nearestLine = min(grid.x, grid.y);\n  float line = 1.0 - smoothstep(0.015, 0.045, nearestLine);`,
  `float nearestLine = min(grid.x, grid.y);`,
  "portable grid shader without derivative extension",
);
replaceWebglOnce(
  `      const render = (timestamp: number) => {`,
  `      let hasPresentedFrame = false;\n      const render = (timestamp: number) => {`,
  `let hasPresentedFrame = false;`,
  "track first presented WebGL frame",
);
replaceWebglOnce(
  `        gl.drawArrays(gl.TRIANGLES, 0, 3);\n        animationFrame = window.requestAnimationFrame(render);`,
  `        gl.drawArrays(gl.TRIANGLES, 0, 3);\n        if (!hasPresentedFrame) {\n          hasPresentedFrame = true;\n          setRenderer("webgl");\n        }\n        animationFrame = window.requestAnimationFrame(render);`,
  `if (!hasPresentedFrame) {`,
  "publish renderer state from the animation callback",
);
replaceWebglOnce(
  `      setRenderer("webgl");\n      animationFrame = window.requestAnimationFrame(render);`,
  `      animationFrame = window.requestAnimationFrame(render);`,
  `hasPresentedFrame = true;\n          setRenderer("webgl");`,
  "remove synchronous renderer state update",
);
replaceWebglOnce(
  `    if (!gl) {\n      setRenderer("fallback");\n      return;\n    }`,
  `    if (!gl) {\n      window.requestAnimationFrame(() => setRenderer("fallback"));\n      return;\n    }`,
  `window.requestAnimationFrame(() => setRenderer("fallback"));`,
  "defer unavailable-context fallback state",
);
replaceWebglOnce(
  `      console.warn("AZEZ holographic WebGL core fell back to CSS rendering.", error);\n      setRenderer("fallback");`,
  `      console.warn("AZEZ holographic WebGL core fell back to CSS rendering.", error);\n      window.requestAnimationFrame(() => setRenderer("fallback"));`,
  `console.warn("AZEZ holographic WebGL core fell back to CSS rendering.", error);\n      window.requestAnimationFrame`,
  "defer shader-error fallback state",
);

writeFileSync(webglCorePath, webglCore);
console.log("Final WebGL core lint, compatibility, and first-frame patches are present.");
