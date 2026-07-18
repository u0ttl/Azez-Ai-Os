import "./patch-mobile-ux.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const desktopPath = join(process.cwd(), "components", "azez-desktop.tsx");
let source = readFileSync(desktopPath, "utf8");

const oldState = `  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");
  const [accent, setAccent] = useState<Accent>("cyan");
  const [reducedMotion, setReducedMotion] = useState(false);`;
const newState = `  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const saved = window.localStorage.getItem("azez-theme-mode");
    return saved === "system" || saved === "dark" || saved === "light" ? saved : "system";
  });
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");
  const [accent, setAccent] = useState<Accent>(() => {
    if (typeof window === "undefined") return "cyan";
    const saved = window.localStorage.getItem("azez-accent");
    return ["cyan", "blue", "violet", "mint", "rose", "amber"].includes(saved ?? "") ? saved as Accent : "cyan";
  });
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("azez-reduced-motion") === "true");`;

if (source.includes(oldState)) source = source.replace(oldState, newState);
else if (!source.includes("const [themeMode, setThemeMode] = useState<ThemeMode>(() =>")) throw new Error("UI lint state target missing");

const loadingEffect = `
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("azez-theme-mode");
    const savedAccent = window.localStorage.getItem("azez-accent");
    const savedMotion = window.localStorage.getItem("azez-reduced-motion");
    if (savedTheme === "system" || savedTheme === "dark" || savedTheme === "light") setThemeMode(savedTheme);
    if (["cyan", "blue", "violet", "mint", "rose", "amber"].includes(savedAccent ?? "")) setAccent(savedAccent as Accent);
    setReducedMotion(savedMotion === "true");
  }, []);
`;
source = source.replace(loadingEffect, "\n");
writeFileSync(desktopPath, source);
console.log("Applied lint-safe appearance state initialization.");
