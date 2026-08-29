// Threshold headroom for the three v4 rhythm rules that never fire on the
// eval corpus. A synthetic probe would prove little (they are whole-document
// rhythm thresholds), so instead: how close does the corpus actually get?
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const HERE = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const P = join(HERE, "..", "..", "..", "..", "packages", "core", "dist", "patterns");
const v4 = require(join(P, "en-signals-v4.js"));
const T = require(join(P, "en-signals-v4-data.js")).V4_THRESHOLDS;

const METRICS = {
  "punchline-fragment-density": ["punchlineCount", "punchlineRate", "punchlineParagraphFinal"],
  "mic-drop-paragraph": ["micDropParagraphs"],
  "contrast-density": ["contrastCount", "contrastPer1000"],
};
const out = { thresholds: T, observed: {} };
for (const src of ["../provider-eval/eval-set.jsonl", "../stripped-eval/stripped-set.jsonl"]) {
  const view = src.includes("stripped") ? "stripped" : "raw";
  const rows = readFileSync(join(HERE, src), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const acc = {};
  for (const r of rows) {
    let m; try { m = v4.computeV4Metrics(r.text); } catch { continue; }
    for (const keys of Object.values(METRICS)) for (const k of keys) {
      (acc[k] ||= { ai: [], human: [] })[r.side === "ai" ? "ai" : "human"].push(m[k]);
    }
  }
  const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  out.observed[view] = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, {
    ai_p50: q(v.ai, 0.5), ai_p99: q(v.ai, 0.99), ai_max: Math.max(...v.ai),
    human_p50: q(v.human, 0.5), human_max: Math.max(...v.human),
  }]));
}
writeFileSync(join(HERE, "data", "v4-headroom.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
