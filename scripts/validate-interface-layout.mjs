import "./validate-touch-mobile.mjs";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) throw new Error(`Missing interface file: ${path}`);
  return readFileSync(fullPath, "utf8");
};

const css = read("app/globals.css");
const desktop = read("components/azez-desktop.tsx");
const loginPage = read("app/login/page.tsx");
const registerPage = read("app/register/page.tsx");
const authPage = read("components/auth-page-client.tsx");

const checks = [
  [
    "desktop navigation has readable touch height",
    css.includes(".nav-button{min-height:44px"),
  ],
  [
    "feature cards have enlarged desktop height",
    css.includes(".feature-grid button{min-height:116px"),
  ],
  ["phone breakpoint exists", css.includes("@media(max-width:640px)")],
  [
    "phone navigation uses large scrollable items",
    css.includes("flex:0 0 74px") && css.includes("min-height:60px"),
  ],
  [
    "phone feature cards use two columns",
    css.includes(".feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))"),
  ],
  [
    "small phones collapse feature cards",
    css.includes("@media(max-width:380px)") &&
      css.includes(".feature-grid{grid-template-columns:1fr}"),
  ],
  [
    "mobile system windows respect viewport",
    css.includes("height:calc(100svh - 16px)") &&
      css.includes("width:calc(100vw - 16px)"),
  ],
  [
    "desktop positioning is restored after hardening",
    css.lastIndexOf(".azez-desktop>.desktop-noise") >
      css.lastIndexOf(".azez-desktop>*{position:relative"),
  ],
  [
    "mobile panels return to document flow",
    css.lastIndexOf(
      ".azez-desktop>.right-console,.azez-desktop>.bottom-console,.azez-desktop>.left-status-panel{position:relative}",
    ) > css.lastIndexOf(".azez-desktop>*{position:relative"),
  ],
  [
    "Chinese language badge is overridden",
    css.lastIndexOf("content:none!important") >
      css.lastIndexOf('content:\"文\"'),
  ],
  [
    "desktop language badge uses Arabic and English labels",
    desktop.includes('lang === "ar" ? "EN" : "ع"'),
  ],
  [
    "login route uses shared auth experience",
    loginPage.includes('<AuthPageClient mode="login" />'),
  ],
  [
    "register route uses shared auth experience",
    registerPage.includes('<AuthPageClient mode="register" />'),
  ],
  [
    "shared auth experience supports both themes",
    authPage.includes('type Theme = "dark" | "light"'),
  ],
  [
    "shared auth experience supports RTL and LTR",
    authPage.includes('lang === "ar" ? "rtl" : "ltr"'),
  ],
  [
    "professional Arabic and English font stacks are present",
    css.includes("--az-font-ar") && css.includes("--az-font-en"),
  ],
  [
    "mobile hero hides overlapping floating cards",
    css.includes(".floating-stack { display:none!important; }"),
  ],
  [
    "windows use dynamic viewport height",
    css.includes("calc(100dvh - 24px)") && css.includes("calc(100dvh - 16px)"),
  ],
  [
    "embedded registration workspace scrolls inside window",
    css.includes(".desktop-module-host > .auth-experience") &&
      css.includes("overflow-y:auto!important"),
  ],
  [
    "mobile registration removes oversized visual panel",
    css.includes(
      ".desktop-module-host .auth-visual-panel { display:none!important; }",
    ),
  ],
  [
    "appearance panel uses compact segmented modes",
    css.includes(".theme-segment") && css.includes(".accent-grid"),
  ],
  [
    "desktop exposes system, dark, and light modes",
    desktop.includes('["system", "◫"') &&
      desktop.includes('["dark", "☾"') &&
      desktop.includes('["light", "☀"'),
  ],
  [
    "appearance choices persist locally",
    desktop.includes("azez-theme-mode") && desktop.includes("azez-accent"),
  ],
  [
    "phone top bar uses a bounded grid",
    css.includes("grid-template-columns:40px minmax(42px,1fr) repeat(4,40px)"),
  ],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);
for (const [label, passed] of checks)
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
if (failures.length)
  throw new Error(`Interface validation failed: ${failures.join(", ")}`);

const authenticatedFeatures = [
  "components/ai-workspace.tsx",
  "components/billing-workspace.tsx",
  "components/crm-workspace.tsx",
  "components/knowledge-workspace.tsx",
  "components/projects-workspace.tsx",
  "components/workflows-workspace.tsx",
];
for (const path of authenticatedFeatures) {
  const source = read(path);
  if (!source.includes("/login"))
    throw new Error(`${path} does not use the unified login route.`);
}
console.log("PASS authenticated features use the unified login experience");
