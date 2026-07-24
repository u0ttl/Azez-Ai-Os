import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const globalsPath = join(root, "app", "globals.css");
const layoutPath = join(root, "app", "layout.tsx");
const styleLayers = [
  {
    path: join(root, "app", "mobile-ux-polish.css"),
    marker: "/* AZEZ_MOBILE_UX_POLISH",
    label: "true touch-device mobile composition and typography",
  },
  {
    path: join(root, "app", "mobile-workspace-polish.css"),
    marker: "/* AZEZ_MOBILE_WORKSPACE_POLISH",
    label: "unified authenticated mobile workspace design",
  },
  {
    path: join(root, "app", "mobile-visual-refinements.css"),
    marker: "/* AZEZ_MOBILE_VISUAL_REFINEMENTS",
    label: "screenshot-reviewed mobile contrast and controls",
  },
];

if (!existsSync(globalsPath)) throw new Error("Global stylesheet is missing.");
let globals = readFileSync(globalsPath, "utf8");
for (const layer of styleLayers) {
  if (!existsSync(layer.path)) throw new Error(`Mobile UX style layer is missing: ${layer.path}`);
  if (!globals.includes(layer.marker)) {
    globals = `${globals}\n\n${readFileSync(layer.path, "utf8")}\n`;
    console.log(`Applied ${layer.label}.`);
  } else {
    console.log(`${layer.label} already applied.`);
  }
}
writeFileSync(globalsPath, globals);

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
