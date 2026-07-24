import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const mobilePath = join(root, "app", "mobile-ux-polish.css");
const polishPath = join(root, "app", "interface-polish.css");
const marker = "/* AZEZ_INTERFACE_QUALITY_V2 */";

if (!existsSync(mobilePath) || !existsSync(polishPath)) {
  throw new Error("Interface quality patch inputs are missing.");
}

let mobile = readFileSync(mobilePath, "utf8");
const responsiveFixes = [
  [
    "@media (max-width:900px),(pointer:coarse),(any-pointer:coarse){",
    "@media (max-width:900px){",
  ],
  [
    "@media (max-width:760px),(pointer:coarse),(any-pointer:coarse){",
    "@media (max-width:760px){",
  ],
];

for (const [before, after] of responsiveFixes) {
  if (mobile.includes(before)) mobile = mobile.replace(before, after);
  else if (!mobile.includes(after)) {
    throw new Error(`Responsive quality target missing: ${before}`);
  }
}
writeFileSync(mobilePath, mobile);

let polish = readFileSync(polishPath, "utf8");
if (!polish.includes(marker)) {
  polish += `\n\n${marker}
:root {
  --az-text-primary:#f3f9fc;
  --az-text-secondary:#aec3cf;
  --az-surface-deep:#03101a;
  --az-surface-raised:#092131;
  --az-border-readable:rgba(103,198,239,.28);
}

.azez-desktop {
  color-scheme:dark;
  text-underline-offset:.18em;
}
.azez-desktop[data-theme="light"] {
  color-scheme:light;
  --az-text-primary:#10293a;
  --az-text-secondary:#526f80;
  --az-surface-deep:#eef5f8;
  --az-surface-raised:#ffffff;
  --az-border-readable:rgba(43,105,141,.26);
}

.azez-desktop button,
.azez-desktop [role="button"] { touch-action:manipulation; }

/* Final readability floor: no operational text should require zooming. */
.azez-desktop .floating-stack small,
.azez-desktop .feature-grid button small,
.azez-desktop .icon-action small,
.azez-desktop .bottom-widget header span,
.azez-desktop .bottom-widget header b,
.azez-desktop .bottom-widget button,
.azez-desktop .bottom-widget p,
.azez-desktop .appearance-panel > header small,
.azez-desktop .motion-setting small {
  font-size:11px!important;
  line-height:1.55!important;
}
.azez-desktop .window-identity small,
.azez-desktop .clock-block small {
  font-size:10.5px!important;
  line-height:1.45!important;
}
.azez-desktop .left-status-panel small,
.azez-desktop .left-status-panel span,
.azez-desktop .left-status-panel p,
.azez-desktop .left-status-panel b,
.azez-desktop .left-status-panel em,
.azez-desktop .terminal-widget > div,
.azez-desktop .agents-widget button > i,
.azez-desktop .database-widget button > i,
.azez-desktop .projects-widget button > i,
.azez-desktop .agents-widget button > span,
.azez-desktop .database-widget button > span,
.azez-desktop .projects-widget button > span,
.azez-desktop .agents-widget button > small,
.azez-desktop .database-widget button > small,
.azez-desktop .projects-widget button > span small,
.azez-desktop .monitoring-widget button strong,
.azez-desktop .monitoring-widget button small,
.azez-desktop .desktop-module-host .project-state,
.azez-desktop .desktop-module-host .priority,
.azez-desktop .desktop-module-host .workflow-item b,
.azez-desktop .desktop-module-host .current-plan,
.azez-desktop .desktop-module-host .activity-row > span {
  font-size:11px!important;
  line-height:1.5!important;
}

.azez-desktop[data-theme="light"] .system-window,
.azez-desktop[data-theme="light"] .right-console,
.azez-desktop[data-theme="light"] .bottom-widget,
.azez-desktop[data-theme="light"] .left-status-panel {
  color:var(--az-text-primary);
  border-color:var(--az-border-readable);
}
.azez-desktop[data-theme="light"] small,
.azez-desktop[data-theme="light"] .window-identity small,
.azez-desktop[data-theme="light"] .right-heading span {
  color:var(--az-text-secondary);
}

@media (max-width:760px) {
  .azez-desktop .feature-grid button small { font-size:11.5px!important; }
  .azez-desktop .icon-action small,
  .azez-desktop .nav-button span,
  .azez-desktop .system-window .window-identity small { font-size:10.5px!important; }
  .azez-desktop .top-control button,
  .azez-desktop .language-toggle,
  .azez-desktop .center-dock button,
  .azez-desktop .window-controls button { min-width:44px!important; min-height:44px!important; }
}

@media (prefers-reduced-motion:reduce) {
  .azez-desktop *,
  .azez-desktop *::before,
  .azez-desktop *::after {
    animation-duration:.01ms!important;
    animation-iteration-count:1!important;
    transition-duration:.01ms!important;
    scroll-behavior:auto!important;
  }
}

@media (forced-colors:active) {
  .azez-desktop button,
  .azez-desktop input,
  .azez-desktop textarea,
  .azez-desktop select,
  .system-window,
  .appearance-panel { border:1px solid CanvasText!important; }
  .azez-desktop :focus-visible { outline:3px solid Highlight!important; box-shadow:none!important; }
}
`;
  writeFileSync(polishPath, polish);
}

console.log("Applied AZEZ interface quality v2: responsive breakpoints, readable typography, contrast, and accessibility.");
