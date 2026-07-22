import "./patch-interface-quality.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const globalsPath = join(root, "app", "globals.css");
const polishPath = join(root, "app", "interface-polish.css");
const marker = "/* AZEZ_INTERFACE_QUALITY_V2 */";
const visualQaPath = join(root, "app", "visual-qa-final.css");
const visualQaMarker = "/* AZEZ_VISUAL_QA_FINAL */";

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

const visualQa = readFileSync(visualQaPath, "utf8");
const existingVisualQa = globals.indexOf(visualQaMarker);
if (existingVisualQa >= 0) {
  // The generated workspace can be finalized more than once locally. Refresh
  // the terminal QA layer so a later correction is never hidden by an older
  // marker-bearing copy.
  globals = `${globals.slice(0, existingVisualQa).trimEnd()}\n\n${visualQa}\n`;
} else {
  globals += `\n\n${visualQa}\n`;
}

writeFileSync(globalsPath, globals);
console.log("Finalized AZEZ interface quality v2 and visual QA fixes in generated global styles.");
