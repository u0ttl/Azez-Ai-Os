import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const workspacePath = join(root, "components", "auth-workspace.tsx");
let workspace = readFileSync(workspacePath, "utf8");

const oldThemeCode = 'const [theme,setTheme]=useState<ThemeMode>("dark"); const [busy,setBusy]=useState(false); const [error,setError]=useState<string>(); const [notice,setNotice]=useState<string>();\n  useEffect(()=>{const saved=window.localStorage.getItem("azez-theme");setTheme(saved==="light"||saved==="dark"?saved:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")},[]);';
const newThemeCode = 'const [theme,setTheme]=useState<ThemeMode>(()=>{if(typeof window==="undefined")return "dark";const saved=window.localStorage.getItem("azez-theme");return saved==="light"||saved==="dark"?saved:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}); const [busy,setBusy]=useState(false); const [error,setError]=useState<string>(); const [notice,setNotice]=useState<string>();';

if (workspace.includes(oldThemeCode)) {
  workspace = workspace.replace(oldThemeCode, newThemeCode);
  console.log("Applied lint-safe auth theme initializer.");
} else if (workspace.includes(newThemeCode)) {
  console.log("Auth theme initializer already lint-safe.");
} else {
  throw new Error("Auth theme patch target was not found.");
}

const reducedMotionRule = '@media(prefers-reduced-motion:reduce){.auth-ambient:before,.auth-ambient i,.auth-ambient b,.auth-core,.auth-core:before,.auth-core:after,.tech-grid span{animation:none!important}}';
const mobilePerformanceRule = '@media(max-width:800px),(hover:none) and (pointer:coarse){.auth-experience{contain:layout paint;overflow-x:hidden}.auth-shell{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:0 12px 32px color-mix(in srgb,var(--ax) 62%,transparent)}.auth-ambient:before,.auth-ambient i,.auth-ambient b,.auth-core,.auth-core:before,.auth-core:after,.auth-visual-panel:after,.tech-grid span{animation:none!important}.auth-ambient i:nth-child(n+2),.auth-ambient b{display:none!important}.auth-core{filter:none!important;opacity:.28!important}.auth-visual-panel:after{display:none!important}.auth-experience button,.auth-experience input{touch-action:manipulation;-webkit-tap-highlight-color:transparent}.auth-experience input{font-size:16px!important}}';

if (!workspace.includes(mobilePerformanceRule)) {
  if (!workspace.includes(reducedMotionRule)) throw new Error("Reduced-motion auth rule was not found.");
  workspace = workspace.replace(reducedMotionRule, `${reducedMotionRule}\n${mobilePerformanceRule}`);
  console.log("Applied lightweight mobile auth animation profile.");
} else {
  console.log("Mobile auth animation profile already applied.");
}
writeFileSync(workspacePath, workspace);

const globalsPath = join(root, "app", "globals.css");
const styleLayers = [
  {
    path: join(root, "app", "auth-mobile-performance.css"),
    marker: "/* AZEZ_AUTH_MOBILE_PERFORMANCE */",
    label: "mobile authentication performance CSS",
  },
  {
    path: join(root, "app", "interface-hardening.css"),
    marker: "/* AZEZ_INTERFACE_HARDENING */",
    label: "responsive menu and card hardening CSS",
  },
  {
    path: join(root, "app", "interface-order-fix.css"),
    marker: "/* AZEZ_INTERFACE_ORDER_FIX */",
    label: "responsive positioning correction CSS",
  },
];

if (existsSync(globalsPath)) {
  let globals = readFileSync(globalsPath, "utf8");
  for (const layer of styleLayers) {
    if (!existsSync(layer.path) || globals.includes(layer.marker)) continue;
    globals = `${globals}\n${layer.marker}\n${readFileSync(layer.path, "utf8")}\n`;
    console.log(`Appended ${layer.label}.`);
  }
  writeFileSync(globalsPath, globals);
}
