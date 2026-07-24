import "./patch-interface-quality.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const globalsPath = join(root, "app", "globals.css");
const polishPath = join(root, "app", "interface-polish.css");
const marker = "/* AZEZ_INTERFACE_QUALITY_V2 */";
const visualQaPath = join(root, "app", "visual-qa-final.css");
const visualQaMarker = "/* AZEZ_VISUAL_QA_FINAL */";
const premiumPath = join(root, "app", "premium-agency-pass.css");
const premiumMarker = "/* AZEZ_PREMIUM_AGENCY_PASS */";
const cohesionPath = join(root, "app", "premium-cohesion-fix.css");
const cohesionMarker = "/* AZEZ_PREMIUM_COHESION_FIX */";
const spatial3dPath = join(root, "app", "spatial-3d-repair.css");
const spatial3dMarker = "/* AZEZ_SPATIAL_3D_REPAIR */";

let globals = readFileSync(globalsPath, "utf8");
globals = globals
  .replaceAll(
    "@media (max-width:900px),(pointer:coarse),(any-pointer:coarse){",
    "@media (max-width:900px){",
  )
  .replaceAll(
    "@media (max-width:760px),(pointer:coarse),(any-pointer:coarse){",
    "@media (max-width:760px){",
  );

if (!globals.includes(marker)) {
  const polish = readFileSync(polishPath, "utf8");
  const qualityStart = polish.indexOf(marker);
  if (qualityStart < 0) throw new Error("Interface quality v2 block is missing.");
  globals += `\n\n${polish.slice(qualityStart)}\n`;
}

function refreshFinalLayer(path, layerMarker) {
  const layer = readFileSync(path, "utf8");
  const existing = globals.indexOf(layerMarker);
  if (existing >= 0) {
    globals = `${globals.slice(0, existing).trimEnd()}\n\n${layer}\n`;
  } else {
    globals += `\n\n${layer}\n`;
  }
}

refreshFinalLayer(visualQaPath, visualQaMarker);
refreshFinalLayer(premiumPath, premiumMarker);
refreshFinalLayer(cohesionPath, cohesionMarker);
refreshFinalLayer(spatial3dPath, spatial3dMarker);

if (
  globals.lastIndexOf(spatial3dMarker) < globals.lastIndexOf(cohesionMarker) ||
  globals.lastIndexOf(cohesionMarker) < globals.lastIndexOf(premiumMarker) ||
  globals.lastIndexOf(premiumMarker) < globals.lastIndexOf(visualQaMarker)
) {
  throw new Error("Spatial 3D repair must be the final stylesheet layer after cohesion, premium, and visual QA.");
}

writeFileSync(globalsPath, globals);
console.log("Finalized AZEZ interface quality, visual QA, premium agency, cohesion, and spatial 3D repair layers.");
