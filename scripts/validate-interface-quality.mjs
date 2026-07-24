import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => {
  const full = join(root, path);
  if (!existsSync(full)) throw new Error(`Missing quality input: ${path}`);
  return readFileSync(full, "utf8");
};

const css = read("app/globals.css");
const layout = read("app/layout.tsx");
const premiumMarker = "/* AZEZ_PREMIUM_AGENCY_PASS */";
const visualQaMarker = "/* AZEZ_VISUAL_QA_FINAL */";

const checks = [
  ["mobile UX stylesheet is applied", css.includes("/* AZEZ_MOBILE_UX_POLISH")],
  ["authenticated mobile workspace stylesheet is applied", css.includes("/* AZEZ_MOBILE_WORKSPACE_POLISH")],
  ["quality v2 stylesheet is applied", css.includes("/* AZEZ_INTERFACE_QUALITY_V2 */")],
  ["final visual QA stylesheet is applied", css.includes(visualQaMarker)],
  [
    "premium agency layer is applied last",
    css.includes(premiumMarker) && css.lastIndexOf(premiumMarker) > css.lastIndexOf(visualQaMarker),
  ],
  [
    "touch laptops are not forced into phone composition",
    !css.includes("@media (max-width:760px),(pointer:coarse),(any-pointer:coarse)") &&
      !css.includes("@media (max-width:900px),(pointer:coarse),(any-pointer:coarse)"),
  ],
  ["phone composition remains width bounded", css.includes("@media (max-width:760px)")],
  ["operational text has an explicit 11px floor", css.includes("font-size:11px!important")],
  ["mobile controls meet a 44px target", css.includes("min-width:44px!important; min-height:44px!important")],
  ["dynamic mobile viewport is used", css.includes("height:100dvh!important")],
  ["authenticated fields prevent browser auto zoom", css.includes("font-size:16px!important") && css.includes(".desktop-module-host :is(input,textarea,select)")],
  ["authenticated grids collapse to one column", css.includes(".dashboard-grid,.metric-grid,.project-grid,.usage-grid,.plans-grid") && css.includes("grid-template-columns:1fr!important")],
  ["AI chat receives a dedicated mobile layout", css.includes(".chat-surface{min-height:260px!important") && css.includes(".chat-input{grid-template-columns:1fr auto!important")],
  ["CRM pipeline stays usable with horizontal snapping", css.includes(".pipeline{display:flex!important") && css.includes("scroll-snap-type:x proximity!important")],
  ["project kanban stays usable with horizontal snapping", css.includes(".kanban-board{display:flex!important") && css.includes(".kanban-column{flex:0 0 min(84vw,320px)!important")],
  ["account and registration use a single mobile column", css.includes(".auth-visual-panel{display:none!important") && css.includes(".auth-field-row{grid-template-columns:1fr!important")],
  ["mobile navigation reserves a non-overlapping content gutter", css.includes("padding-bottom:calc(116px + env(safe-area-inset-bottom))!important")],
  ["five readable mobile navigation slots fit without edge clipping", css.includes("flex:0 0 20%!important") && css.includes("scroll-snap-type:x mandatory!important") && css.includes("scroll-snap-align:start!important")],
  ["registration account type has an explicit active state", css.includes('.account-type-button[aria-pressed="true"]') && css.includes("color:#fff!important")],
  ["mobile selection cards preserve readable contrast", css.includes(".project-card.selected,.company-item.active,.base-item.active,.workflow-item.active") && css.includes("border-color:#3285ad!important")],
  ["mobile headings and tool labels have explicit contrast", css.includes(".right-heading h2") && css.includes(".tool-group .icon-action small") && css.includes("color:#f2f9fd!important")],
  ["dark desktop monitoring widgets stay inside the visual system", css.includes('.azez-desktop:not([data-theme="light"]) .bottom-widget') && css.includes("--az-premium-surface")],
  ["mobile home removes secondary monitoring stack", css.includes(".azez-desktop .bottom-console{display:none!important")],
  ["mobile scene uses a bounded premium composition", css.includes("height:min(430px,calc(100dvh - 208px))!important") && css.includes("border-radius:22px!important")],
  ["authentication avoids generic purple primary actions", css.includes("linear-gradient(115deg,#086f92,#0c9aba)!important")],
  ["premium interactions use transform-based motion", css.includes("cubic-bezier(.2,.8,.2,1)") && !css.includes("transition:top") && !css.includes("transition:left")],
  ["system reduced-motion preference is supported", css.includes("@media (prefers-reduced-motion:reduce)")],
  ["forced-colors accessibility is supported", css.includes("@media (forced-colors:active)")],
  [
    "safe-area viewport metadata is installed",
    layout.includes('viewportFit: "cover"') && layout.includes('width: "device-width"'),
  ],
  ["Arabic-first document metadata is installed", layout.includes('<html lang="ar" dir="rtl" translate="no">')],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);
for (const [label, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
if (failures.length) throw new Error(`Interface quality validation failed: ${failures.join(", ")}`);

console.log("PASS AZEZ premium interface quality regression gate");
