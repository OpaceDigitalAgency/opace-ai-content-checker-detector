// Dump the shipped weight tables and category sets to JSON so the Python
// analysis can reconstruct the scorer without re-running the engine.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const HERE = dirname(dirname(fileURLToPath(import.meta.url)));
const P = join(HERE, "..", "..", "..", "..", "packages", "core", "dist", "patterns");
const d2 = await import(join(P, "en-signals-v2-data.js"));
const d3 = await import(join(P, "en-signals-v3-data.js"));
const d4 = await import(join(P, "en-signals-v4-data.js"));
const cfg = {
  weights: { ...d2.ISSUE_WEIGHTS, ...d3.V3_ISSUE_WEIGHTS, ...d4.V4_ISSUE_WEIGHTS },
  v2Weights: { ...d2.ISSUE_WEIGHTS },
  v3Weights: { ...d3.V3_ISSUE_WEIGHTS },
  v4Weights: { ...d4.V4_ISSUE_WEIGHTS },
  stylometric: [...d3.STYLOMETRIC_CATEGORIES],
  v4Rhythm: [...d4.V4_RHYTHM_CATEGORIES],
  corroboration: [...d3.CORROBORATION_CATEGORIES],
  artefactCore: [...d3.ARTEFACT_CORE_CATEGORIES],
  artefactSupport: [...d3.ARTEFACT_SUPPORT_CATEGORIES],
  formattingCluster: [...d3.FORMATTING_CLUSTER_CATEGORIES],
  era: d3.RULE_ERA,
};
writeFileSync(join(HERE, "data", "engine-config.json"), JSON.stringify(cfg, null, 2));
console.error("categories:", Object.keys(cfg.weights).length);
