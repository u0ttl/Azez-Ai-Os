import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const globalsPath = join(root, "app", "globals.css");
const mobileCssPath = join(root, "app", "mobile-ux-polish.css");
const layoutPath = join(root, "app", "layout.tsx");
const marker = "/* AZEZ_MOBILE_UX_POLISH";

if (!existsSync(globalsPath) || !existsSync(mobileCssPath)) {
  throw new Error("Mobile UX patch inputs are missing.");
}

let globals = readFileSync(globalsPath, "utf8");
if (!globals.includes(marker)) {
  globals = `${globals}\n\n${readFileSync(mobileCssPath, "utf8")}\n`;
  writeFileSync(globalsPath, globals);
  console.log("Applied true touch-device mobile composition and typography.");
} else {
  console.log("Touch-device mobile composition already applied.");
}

if (existsSync(layoutPath)) {
  let layout = readFileSync(layoutPath, "utf8");
  if (!layout.includes("export const viewport")) {
    layout = layout.replace(
      'import type { Metadata } from "next";',
      'import type { Metadata, Viewport } from "next";',
    );
    layout = layout.replace(
      "export default function RootLayout",
      `export const viewport: Viewport = {\n  width: "device-width",\n  initialScale: 1,\n  viewportFit: "cover",\n  themeColor: [\n    { media: "(prefers-color-scheme: dark)", color: "#030b13" },\n    { media: "(prefers-color-scheme: light)", color: "#edf3f8" },\n  ],\n};\n\nexport default function RootLayout`,
    );
  }
  layout = layout.replace(
    '<html lang="en" dir="ltr" translate="no">',
    '<html lang="ar" dir="rtl" translate="no">',
  );
  writeFileSync(layoutPath, layout);
  console.log("Applied device viewport, safe areas, and Arabic-first metadata.");
}
