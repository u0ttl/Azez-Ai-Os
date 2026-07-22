import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const desktopPath = join(root, "components", "azez-desktop.tsx");
const globalsPath = join(root, "app", "globals.css");

function replaceOnce(before, after, marker, label) {
  const source = readFileSync(desktopPath, "utf8");
  if (source.includes(marker)) return;
  if (!source.includes(before))
    throw new Error(`UI polish target missing: ${label}`);
  writeFileSync(desktopPath, source.replace(before, after));
  console.log(`Applied UI polish: ${label}.`);
}

replaceOnce(
  `type Lang = "en" | "ar";\n`,
  `type Lang = "en" | "ar";\ntype ThemeMode = "system" | "dark" | "light";\ntype Accent = "cyan" | "blue" | "violet" | "mint" | "rose" | "amber";\n`,
  `type ThemeMode = "system"`,
  "appearance types",
);

replaceOnce(
  `  const [paletteOpen, setPaletteOpen] = useState(false);\n  const [query, setQuery] = useState("");`,
  `  const [paletteOpen, setPaletteOpen] = useState(false);\n  const [appearanceOpen, setAppearanceOpen] = useState(false);\n  const [themeMode, setThemeMode] = useState<ThemeMode>("system");\n  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");\n  const [accent, setAccent] = useState<Accent>("cyan");\n  const [reducedMotion, setReducedMotion] = useState(false);\n  const [query, setQuery] = useState("");`,
  `const [appearanceOpen, setAppearanceOpen]`,
  "appearance state",
);

replaceOnce(
  `  useEffect(() => {\n    const timer = window.setTimeout(() => void refresh(), 0);\n    const clockStart = window.setTimeout(() => setNow(new Date()), 0);\n    const clock = window.setInterval(() => setNow(new Date()), 1000);\n    return () => { window.clearTimeout(timer); window.clearTimeout(clockStart); window.clearInterval(clock); };\n  }, [refresh]);\n`,
  `  useEffect(() => {\n    const timer = window.setTimeout(() => void refresh(), 0);\n    const clockStart = window.setTimeout(() => setNow(new Date()), 0);\n    const clock = window.setInterval(() => setNow(new Date()), 1000);\n    return () => { window.clearTimeout(timer); window.clearTimeout(clockStart); window.clearInterval(clock); };\n  }, [refresh]);\n\n  useEffect(() => {\n    const savedTheme = window.localStorage.getItem("azez-theme-mode");\n    const savedAccent = window.localStorage.getItem("azez-accent");\n    const savedMotion = window.localStorage.getItem("azez-reduced-motion");\n    if (savedTheme === "system" || savedTheme === "dark" || savedTheme === "light") setThemeMode(savedTheme);\n    if (["cyan", "blue", "violet", "mint", "rose", "amber"].includes(savedAccent ?? "")) setAccent(savedAccent as Accent);\n    setReducedMotion(savedMotion === "true");\n  }, []);\n\n  useEffect(() => {\n    const media = window.matchMedia("(prefers-color-scheme: dark)");\n    const applyTheme = () => {\n      const next = themeMode === "system" ? (media.matches ? "dark" : "light") : themeMode;\n      setResolvedTheme(next);\n      document.documentElement.dataset.theme = next;\n      document.documentElement.style.colorScheme = next;\n    };\n    applyTheme();\n    media.addEventListener("change", applyTheme);\n    window.localStorage.setItem("azez-theme-mode", themeMode);\n    return () => media.removeEventListener("change", applyTheme);\n  }, [themeMode]);\n\n  useEffect(() => {\n    document.documentElement.dataset.accent = accent;\n    window.localStorage.setItem("azez-accent", accent);\n  }, [accent]);\n\n  useEffect(() => {\n    document.documentElement.dataset.reducedMotion = String(reducedMotion);\n    window.localStorage.setItem("azez-reduced-motion", String(reducedMotion));\n  }, [reducedMotion]);\n`,
  `azez-theme-mode`,
  "appearance persistence",
);

replaceOnce(
  `      if (event.key === "Escape") {\n        setPaletteOpen(false);\n        if (active) setActive(null);\n      }\n    }\n    window.addEventListener("keydown", onKeyDown);\n    return () => window.removeEventListener("keydown", onKeyDown);\n  }, [active]);`,
  `      if (event.key === "Escape") {\n        if (appearanceOpen) { setAppearanceOpen(false); return; }\n        if (paletteOpen) { setPaletteOpen(false); return; }\n        if (active) setActive(null);\n      }\n    }\n    window.addEventListener("keydown", onKeyDown);\n    return () => window.removeEventListener("keydown", onKeyDown);\n  }, [active, appearanceOpen, paletteOpen]);`,
  `[active, appearanceOpen, paletteOpen]`,
  "Escape behavior",
);

replaceOnce(
  `  const activeItem = useMemo(() => ALL_ITEMS.find((item) => item.id === active), [active]);`,
  `  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get("visual-review");
    if (!requestedView) return;
    const revealRequestedView = window.setTimeout(() => {
      if (requestedView === "appearance") {
        setAppearanceOpen(true);
        return;
      }
      const requestedItem = ALL_ITEMS.find((item) => item.id === requestedView);
      if (requestedItem) {
        setActive(requestedItem.id);
        setMaximized(false);
        setMinimized(false);
      }
    }, 0);
    return () => window.clearTimeout(revealRequestedView);
  }, []);

  const activeItem = useMemo(() => ALL_ITEMS.find((item) => item.id === active), [active]);`,
  `get("visual-review")`,
  "deterministic visual-review routes",
);

replaceOnce(
  `    setPaletteOpen(false);\n    const item`,
  `    setPaletteOpen(false);\n    setAppearanceOpen(false);\n    const item`,
  `setAppearanceOpen(false);\n    const item`,
  "window opening closes overlays",
);

replaceOnce(
  `  return (\n    <main className={lang === "ar" ? "azez-desktop arabic" : "azez-desktop english"} dir={lang === "ar" ? "rtl" : "ltr"}>`,
  `  const appearanceCopy = lang === "ar" ? {\n    title: "المظهر", subtitle: "خصّص الوضع واللون والحركة", system: "النظام", dark: "داكن", light: "فاتح", accent: "اللون الرئيسي", motion: "تقليل الحركة", settings: "فتح إعدادات المظهر", close: "إغلاق إعدادات المظهر"\n  } : {\n    title: "Appearance", subtitle: "Customize mode, accent, and motion", system: "System", dark: "Dark", light: "Light", accent: "Accent color", motion: "Reduce motion", settings: "Open appearance settings", close: "Close appearance settings"\n  };\n  const accents: Array<{ id: Accent; ar: string; en: string }> = [\n    { id: "cyan", ar: "سماوي", en: "Cyan" }, { id: "blue", ar: "أزرق", en: "Blue" }, { id: "violet", ar: "بنفسجي", en: "Violet" },\n    { id: "mint", ar: "نعناعي", en: "Mint" }, { id: "rose", ar: "وردي", en: "Rose" }, { id: "amber", ar: "كهرماني", en: "Amber" },\n  ];\n\n  return (\n    <main className={lang === "ar" ? "azez-desktop arabic" : "azez-desktop english"} dir={lang === "ar" ? "rtl" : "ltr"} data-theme={resolvedTheme} data-accent={accent} data-reduced-motion={reducedMotion ? "true" : "false"}>`,
  `data-reduced-motion={reducedMotion ? "true" : "false"}`,
  "appearance copy and shell attributes",
);

replaceOnce(
  `        <time className="clock-block"><strong>{timeText}</strong><small>{dateText}</small></time>\n        <button className="top-round" type="button" onClick={() => openWindow("notifications")}><span>◉</span></button>\n        <button className="top-round pulse" type="button" onClick={() => openWindow("analytics")}><ServiceDot state={snapshot.api} /></button>`,
  `        <time className="clock-block"><strong>{timeText}</strong><small>{dateText}</small></time>\n        <button className={appearanceOpen ? "top-round appearance-trigger active" : "top-round appearance-trigger"} type="button" onClick={() => { setAppearanceOpen((current) => !current); setPaletteOpen(false); }} aria-label={appearanceCopy.title} aria-expanded={appearanceOpen} title={appearanceCopy.title}><span aria-hidden="true">◐</span></button>\n        <button className="top-round" type="button" onClick={() => openWindow("notifications")} aria-label={lang === "ar" ? "الإشعارات" : "Notifications"} title={lang === "ar" ? "الإشعارات" : "Notifications"}><span aria-hidden="true">◉</span></button>\n        <button className="top-round pulse" type="button" onClick={() => openWindow("analytics")} aria-label={lang === "ar" ? "حالة النظام" : "System status"} title={lang === "ar" ? "حالة النظام" : "System status"}><ServiceDot state={snapshot.api} /></button>`,
  `appearance-trigger active`,
  "appearance trigger and top controls",
);

replaceOnce(
  `      {notice && <div className="desktop-toast">{notice}</div>}\n\n      {paletteOpen &&`,
  `      {notice && <div className="desktop-toast">{notice}</div>}\n\n      {appearanceOpen && <>\n        <button className="appearance-backdrop" type="button" onClick={() => setAppearanceOpen(false)} aria-label={appearanceCopy.close} />\n        <section className="appearance-panel" role="dialog" aria-modal="true" aria-label={appearanceCopy.title} dir={lang === "ar" ? "rtl" : "ltr"}>\n          <header><div><strong>{appearanceCopy.title}</strong><small>{appearanceCopy.subtitle}</small></div><button type="button" onClick={() => setAppearanceOpen(false)} aria-label={appearanceCopy.close}>×</button></header>\n          <div className="appearance-section">\n            <span className="appearance-label">{lang === "ar" ? "الوضع" : "Mode"}</span>\n            <div className="theme-segment" role="group" aria-label={lang === "ar" ? "اختيار الوضع" : "Choose mode"}>\n              {([ ["system", "◫", appearanceCopy.system], ["dark", "☾", appearanceCopy.dark], ["light", "☀", appearanceCopy.light] ] as const).map(([id, icon, text]) => <button key={id} type="button" className={themeMode === id ? "active" : ""} onClick={() => setThemeMode(id)} aria-pressed={themeMode === id}><span aria-hidden="true">{icon}</span><b>{text}</b></button>)}\n            </div>\n          </div>\n          <div className="appearance-section">\n            <span className="appearance-label">{appearanceCopy.accent}</span>\n            <div className="accent-grid">{accents.map((option) => <button key={option.id} type="button" className={accent === option.id ? "accent-option active" : "accent-option"} data-color={option.id} onClick={() => setAccent(option.id)} aria-pressed={accent === option.id}><i aria-hidden="true"/><span>{lang === "ar" ? option.ar : option.en}</span>{accent === option.id && <b aria-hidden="true">✓</b>}</button>)}</div>\n          </div>\n          <label className="motion-setting"><span><strong>{appearanceCopy.motion}</strong><small>{lang === "ar" ? "مناسب للأجهزة الضعيفة ولتجربة أكثر هدوءًا" : "Better for low-power devices and a calmer experience"}</small></span><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /><i aria-hidden="true" /></label>\n          <button className="appearance-settings-link" type="button" onClick={() => { setAppearanceOpen(false); openWindow("settings"); }}>{appearanceCopy.settings}<b aria-hidden="true">›</b></button>\n        </section>\n      </>}\n\n      {paletteOpen &&`,
  `className="appearance-panel"`,
  "appearance panel",
);

const polishMarker = "AZEZ AI OS — interface polish and responsive usability pass";
const polishCssPath = join(root, "app", "interface-polish.css");
const polishCss = readFileSync(polishCssPath, "utf8");
let globals = readFileSync(globalsPath, "utf8");
if (!globals.includes(polishMarker)) {
  globals = `${globals}\n\n${polishCss}\n`;
  writeFileSync(globalsPath, globals);
  console.log("Applied UI polish: responsive visual system.");
} else {
  console.log("UI polish CSS already present.");
}
