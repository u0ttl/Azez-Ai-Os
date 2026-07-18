import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const css = readFileSync(join(root, "app", "globals.css"), "utf8");
const layout = readFileSync(join(root, "app", "layout.tsx"), "utf8");

const checks = [
  ["touch devices force mobile composition", css.includes("(pointer:coarse),(any-pointer:coarse)")],
  ["desktop telemetry is removed from phone home", css.includes(".azez-desktop>.bottom-console,.azez-desktop>.left-status-panel,.azez-desktop>.command-orb{display:none!important}")],
  ["phone navigation is fixed and scrollable", css.includes("scroll-snap-type:x proximity") && css.includes("height:72px!important")],
  ["phone windows use the real dynamic viewport", css.includes("height:100dvh!important") && css.includes("z-index:240!important")],
  ["phone hero hides floating desktop cards", css.includes(".scene-shell .floating-stack{display:none!important}")],
  ["mobile app bar has bounded columns", css.includes("grid-template-columns:42px minmax(0,1fr) 42px 42px")],
  ["safe-area viewport metadata is installed", layout.includes("viewportFit: \"cover\"") && layout.includes("width: \"device-width\"")],
  ["Arabic document direction is the default", layout.includes('<html lang="ar" dir="rtl" translate="no">')],
];

const failures = checks.filter(([, ok]) => !ok).map(([label]) => label);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
if (failures.length) throw new Error(`Touch mobile validation failed: ${failures.join(", ")}`);
