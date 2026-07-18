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

writeFileSync(desktopPath, desktop);
console.log("Final AZEZ Desktop functionality and language patches are present.");
