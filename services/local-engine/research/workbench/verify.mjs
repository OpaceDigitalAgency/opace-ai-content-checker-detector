// Calibration workbench — independent verification.
//
// Deliberately does NOT trust data.json for the text-based checks: phrase,
// regex and feature figures are recomputed from the original evaluation JSONL
// so that a bug in the precompute cannot hide behind itself.
//
//   node verify.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createScorer, ALL_RULES_ON } from "./scorer.mjs";
import { computeFeatures, FEATURE_IDS } from "./features.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RESEARCH = join(HERE, "..");
const D = JSON.parse(readFileSync(join(HERE, "data.json"), "utf8"));
const readJsonl = (p) => readFileSync(p, "utf8").trim().split("\n").map((l) => JSON.parse(l));

const SRC = {
  raw: join(RESEARCH, "provider-eval", "eval-set.jsonl"),
  stripped: join(RESEARCH, "stripped-eval", "stripped-set.jsonl"),
};

const CATS = D.categories;
const catIndex = new Map(CATS.map((c, i) => [c.id, i]));
const pick = (f) => new Set(CATS.map((c, i) => (c[f] ? i : -1)).filter((i) => i >= 0));
const score = createScorer({ index: catIndex, stylo: pick("sty"), v4: pick("v4"),
  artCore: pick("ac"), artSup: pick("as"), fmtCluster: pick("fc"), furniture: pick("fu") });
const SHIPPED_W = CATS.map((c) => c.w);

const AI = [], HU = [];
D.samples.forEach((s, i) => (s.a ? AI : HU).push(i));
const pctS = (n, d) => `${((100 * n) / d).toFixed(1)}% (${n}/${d})`;
let failures = 0;
const check = (label, got, want) => {
  const ok = got === want;
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}\n        got ${got}${ok ? "" : `\n        want ${want}`}`);
};

// ── 1. shipped baselines ─────────────────────────────────────────────
console.log("\n1. Shipped-default baselines (scorer over data.json hits)");
const evalRules = (view, mode, nthr = 0.8533) => {
  const rows = D.views[view];
  let det = 0, fp = 0;
  rows.forEach((r, i) => {
    const rf = score(r, SHIPPED_W, null, null, ALL_RULES_ON).classification !== "human_like";
    const mf = r.p !== null && r.p >= nthr;
    const flag = mode === "rules" ? rf : mode === "model" ? mf : mode === "either" ? rf || mf : rf && mf;
    if (D.samples[i].a) { if (flag) det++; } else if (flag) fp++;
  });
  return `${pctS(det, AI.length)} det, ${fp}/${HU.length} FP`;
};
check("raw / rules only", evalRules("raw", "rules"), "66.7% (1152/1727) det, 0/169 FP");
check("stripped / rules only", evalRules("stripped", "rules"), "5.5% (95/1727) det, 0/169 FP");
check("stripped / model @0.8533", evalRules("stripped", "model"), "56.9% (983/1727) det, 3/169 FP");
check("raw / model @0.8533", evalRules("raw", "model"), "53.7% (927/1727) det, 3/169 FP");

// ── 2. stored feature vectors match a fresh computation ──────────────
console.log("\n2. Stored feature vectors vs fresh computation from the source JSONL");
for (const view of ["raw", "stripped"]) {
  const rows = readJsonl(SRC[view]);
  const byId = new Map(rows.map((r) => [r.id, r.text]));
  const ids = [];
  for (const r of rows) ids.push(r.id);
  let worst = 0, n = 0;
  // data.json rows are in the shared id order; rebuild that order from raw
  const order = readJsonl(SRC.raw).map((r) => r.id);
  order.forEach((id, i) => {
    if (i % 7 !== 0) return; // every 7th sample keeps the check quick but broad
    const text = byId.get(id);
    if (text === undefined) return;
    const fresh = computeFeatures(text).vector;
    const stored = D.views[view][i].f;
    for (let k = 0; k < fresh.length; k++) {
      const a = +fresh[k].toPrecision(5), b = stored[k];
      const d = Math.abs(a - b) / (Math.abs(b) || 1);
      if (d > worst) worst = d;
    }
    n++;
  });
  check(`${view}: ${n} sampled documents, max relative deviation`, worst < 1e-9, true);
}

// ── 3. single-feature detection matches a scripted check ─────────────
console.log("\n3. Single-feature rules, recomputed from source text");
function featureRule(view, featId, op, thr) {
  const rows = readJsonl(SRC[view]);
  const order = readJsonl(SRC.raw).map((r) => r.id);
  const byId = new Map(rows.map((r) => [r.id, r.text]));
  const k = FEATURE_IDS.indexOf(featId);
  let det = 0, fp = 0;
  order.forEach((id, i) => {
    const v = computeFeatures(byId.get(id)).vector[k];
    const hit = op === "ge" ? v >= thr : v <= thr;
    if (D.samples[i].a) { if (hit) det++; } else if (hit) fp++;
  });
  return { det, fp };
}
function featureRuleStored(view, featId, op, thr) {
  const k = FEATURE_IDS.indexOf(featId);
  let det = 0, fp = 0;
  D.views[view].forEach((r, i) => {
    const hit = op === "ge" ? r.f[k] >= thr : r.f[k] <= thr;
    if (D.samples[i].a) { if (hit) det++; } else if (hit) fp++;
  });
  return { det, fp };
}
for (const [view, featId, op, thr] of [
  ["stripped", "sentCv", "le", 0.45],
  ["stripped", "bulletPer1000", "ge", 10],
  ["raw", "boldPer1000", "ge", 5],
  ["stripped", "hedgePer1000", "ge", 8],
]) {
  const a = featureRule(view, featId, op, thr);
  const b = featureRuleStored(view, featId, op, thr);
  check(`${view} ${featId} ${op} ${thr}: source vs stored`,
    `${a.det}/${AI.length} det, ${a.fp}/${HU.length} FP`,
    `${b.det}/${AI.length} det, ${b.fp}/${HU.length} FP`);
}

// ── 4. custom signals, recomputed from source text ───────────────────
console.log("\n4. Custom signals, recomputed from source text");
function signalFromSource(view, kind, spec, op, val) {
  const rows = readJsonl(SRC[view]);
  const order = readJsonl(SRC.raw).map((r) => r.id);
  const byId = new Map(rows.map((r) => [r.id, r.text]));
  const re = kind === "phrases"
    ? new RegExp(spec.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gi")
    : new RegExp(spec, "gi");
  let det = 0, fp = 0;
  const genre = {};
  order.forEach((id, i) => {
    const t = byId.get(id);
    const words = (t.toLowerCase().match(/[a-z']+/g) ?? []).length || 1;
    re.lastIndex = 0;
    let c = 0;
    while (re.exec(t) !== null) { c++; if (re.lastIndex === 0) break; }
    const rate = (c / words) * 1000;
    const hit = op === "ge" ? rate >= val : rate <= val;
    if (D.samples[i].a) { if (hit) det++; }
    else { const g = D.genres[D.samples[i].g]; genre[g] = genre[g] || { n: 0, d: 0 }; genre[g].d++;
      if (hit) { genre[g].n++; fp++; } }
  });
  return { det, fp, genre };
}
export const SIGNALS = [
  ["stripped", "phrases", ["delve", "tapestry", "it is important to note", "in today's"], "ge", 1],
  ["stripped", "regex", "\\bnot only\\b[^.]{0,60}\\bbut\\b", "ge", 1],
  ["raw", "phrases", ["furthermore", "moreover", "additionally"], "ge", 2],
];
for (const [view, kind, spec, op, val] of SIGNALS) {
  const r = signalFromSource(view, kind, spec, op, val);
  const label = kind === "phrases" ? `phrases[${spec.length}]` : `/${spec}/`;
  console.log(`  ${view} ${label} ${op} ${val} per 1000w  ->  det ${pctS(r.det, AI.length)}, FP ${r.fp}/${HU.length}`);
  console.log(`        genre FPs: ${Object.entries(r.genre).filter(([, v]) => v.n).map(([g, v]) => `${g} ${v.n}/${v.d}`).join(", ") || "none"}`);
}

console.log(`\n${failures ? `${failures} CHECK(S) FAILED` : "all checks passed"}`);
