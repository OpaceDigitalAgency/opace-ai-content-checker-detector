// Calibration workbench — precompute step.
//
// Runs the SHIPPED packages/core rules stack over every eval sample in both the
// raw and the stripped (markdown-removed) view, and records per sample:
//   - every individual trigger that fired, as a (category, key) pair, so the
//     owner can see and switch off single words and phrases inside a category
//   - a 43-dimension raw measurement vector, plus function-word and
//     content-word frequencies, so NEW signals can be invented and tested
//     without touching the engine
//   - the engine's own score and classification (the shipped baseline)
//   - the tier-3 neural probability for that view
//   - the text itself, so phrase and regex signals can be scored in the browser
//
// It then re-derives score and classification from the recorded hits alone,
// using scorer.mjs — the same source the browser runs — and asserts that it
// reproduces the engine exactly on all 3,792 sample-views.
//
// Reads only. Writes only workbench/data.json.
//
//   node precompute.mjs

import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GROUPS, CATEGORY_INFO } from "./categories.mjs";
import { createScorer } from "./scorer.mjs";
import { computeFeatures, FEATURE_DEFS, FEATURE_IDS, FUNCTION_WORDS } from "./features.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RESEARCH = join(HERE, "..");
const CORE = join(RESEARCH, "..", "..", "..", "packages", "core");
const require = createRequire(import.meta.url);

const core = require(join(CORE, "dist", "index.js"));
const v2d = require(join(CORE, "dist", "patterns", "en-signals-v2-data.js"));
const v3d = require(join(CORE, "dist", "patterns", "en-signals-v3-data.js"));
const v4d = require(join(CORE, "dist", "patterns", "en-signals-v4-data.js"));

const SHIPPED_WEIGHTS = { ...v2d.ISSUE_WEIGHTS, ...v3d.V3_ISSUE_WEIGHTS, ...v4d.V4_ISSUE_WEIGHTS };
const CATS = Object.keys(SHIPPED_WEIGHTS);
const CAT_INDEX = new Map(CATS.map((c, i) => [c, i]));
const WEIGHTS_BY_INDEX = CATS.map((c) => SHIPPED_WEIGHTS[c]);

const setOf = (x) => new Set([...(x || [])]);
const STYLOMETRIC = setOf(v3d.STYLOMETRIC_CATEGORIES);
const V4_RHYTHM = setOf(v4d.V4_RHYTHM_CATEGORIES);
const ARTEFACT_CORE = setOf(v3d.ARTEFACT_CORE_CATEGORIES);
const ARTEFACT_SUPPORT = setOf(v3d.ARTEFACT_SUPPORT_CATEGORIES);
const FORMATTING_CLUSTER = setOf(v3d.FORMATTING_CLUSTER_CATEGORIES);
const FURNITURE = new Set(["markdown-bold", "markdown-heading", "markdown-furniture"]);

// Categories that are a COMPUTED MEASURE rather than a list of triggers. Their
// per-finding key is a description of the measurement ("3 dash separators in
// 144 words"), so enumerating keys would be meaningless. Each is linked to the
// closest raw feature so the owner can inspect the underlying distribution.
const MEASURE_FEATURE = {
  "em-dash-density": "emDashPer1000", "uniform-sections": "paraCv", "uniform-list-items": "listItemCv",
  "sentence-flatline": "sentCv", uniformity: "paraCv", "cross-para-burstiness": "sentCv",
  "punct-distribution": "commasPerSentence", "fnword-trigram-entropy": "fnwordShare",
  "low-ttr": "ttr", "smart-punct-signature": "curlyQuotePer1000", "heading-inflation": "headingPer1000",
  "staccato-fragments": "sentCv", "tricolon-density": "tricolonPer1000",
  "setup-expansion-cadence": "sentCv", "passive-ratio": "passivePer1000",
  "low-specificity": "numeralPer1000", "adjacent-lemma-repeat": "ttr",
  "copula-avoidance": null, "transition-stacking": null, "token-cutoff": null,
  "proximity-cluster": null, "markdown-bold": "boldPer1000", "markdown-heading": "headingPer1000",
  "markdown-furniture": "bulletPer1000", formatting: "boldPer1000", "bullet-np-list": "bulletPer1000",
  "bold-label-bullets": "boldPer1000", "directive-colon-bullets": "colonPer1000",
  "emoji-decoration": null, "title-case-header": "headingPer1000", "hashtag-stuff": null,
  "quote-inconsistency": "mixedQuotes", "normalization-flag": null,
  "sentence-length-spectral-flatness": "sentCv", "conditional-compression": "ttr",
  "lexical-register-distance": "fnwordShare", "punchline-fragment-density": "sentCv",
  "mic-drop-paragraph": "paraCv", "contrast-density": null, "rhetorical-procedural-ratio": "numeralPer1000",
};

const ixSet = (names) => new Set([...names].map((n) => CAT_INDEX.get(n)).filter((i) => i !== undefined));
const scoreFromHits = createScorer({
  index: CAT_INDEX,
  stylo: ixSet([...STYLOMETRIC, ...V4_RHYTHM]),
  v4: ixSet(V4_RHYTHM),
  artCore: ixSet(ARTEFACT_CORE),
  artSup: ixSet(ARTEFACT_SUPPORT),
  fmtCluster: ixSet(FORMATTING_CLUSTER),
  furniture: ixSet(FURNITURE),
});

const readJsonl = (p) => readFileSync(p, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const VIEWS = [
  { key: "raw", samples: join(RESEARCH, "provider-eval", "eval-set.jsonl"), tier3: join(RESEARCH, "provider-eval", "tier3-scores.jsonl") },
  { key: "stripped", samples: join(RESEARCH, "stripped-eval", "stripped-set.jsonl"), tier3: join(RESEARCH, "stripped-eval", "tier3-stripped.jsonl") },
];

const genreById = new Map();
for (const v of VIEWS) for (const r of readJsonl(v.tier3)) if (r.genre) genreById.set(r.id, r.genre);

const NORM_DETAIL = /^(\d+) zero-width \+ (\d+) homoglyph/;
const TIER3_KEY = /^"(.+)" x\d+$/;
const MEASURE_KEY = "(computed measure)";

// Normalise a finding key into a stable trigger label.
function normaliseKey(cat, detail) {
  if (cat in MEASURE_FEATURE) return MEASURE_KEY;
  const d = String(detail ?? "").trim();
  if (!d) return "(unlabelled)";
  const m = TIER3_KEY.exec(d);
  if (m) return m[1].toLowerCase();
  return (d.length > 120 ? d.slice(0, 120) + "…" : d).toLowerCase();
}

const r5 = (x) => (Number.isFinite(x) ? +x.toPrecision(5) : 0);
const FW_INDEX = new Map(FUNCTION_WORDS.map((w, i) => [w, i]));

// ── pass 1: engine + features, collecting the key vocabulary ─────────
const keyVocab = CATS.map(() => new Map()); // catIdx -> Map(key -> idx)
const keyIdxOf = (cat, key) => {
  const m = keyVocab[cat];
  let i = m.get(key);
  if (i === undefined) { i = m.size; m.set(key, i); }
  return i;
};

const perView = {};
const identity = new Map();
const docFreq = new Map();
let mismatches = 0;
const mismatchExamples = [];
let inspectErrors = 0;

for (const view of VIEWS) {
  const rows = readJsonl(view.samples);
  const t3 = new Map(readJsonl(view.tier3).map((r) => [r.id, r.tier3_int8pc]));
  const out = [];
  let i = 0;
  for (const d of rows) {
    const sig = core.computeEditorialSignals(d.text);
    let findings = [];
    try { findings = core.inspectSignalsV2(d.text); } catch { inspectErrors += 1; }

    const hits = [];
    const measureSeq = new Map();
    let zeroWidth = 0, homoglyph = 0;
    for (const f of findings) {
      const c = f.evidence?.category;
      if (!c || !CAT_INDEX.has(c)) continue;
      const ci = CAT_INDEX.get(c);
      // The engine has already deduplicated by category:key, so every finding
      // is one issue and must stay one issue. Trigger-list categories key on
      // the trigger itself. Computed measures have a different descriptive key
      // every time, so they key on an ordinal within the sample instead — the
      // vocabulary stays at one row while the issue count is preserved.
      let ki;
      if (c in MEASURE_FEATURE) {
        ki = measureSeq.get(ci) ?? 0;
        measureSeq.set(ci, ki + 1);
        keyIdxOf(ci, MEASURE_KEY);
      } else {
        ki = keyIdxOf(ci, normaliseKey(c, f.evidence?.detail));
      }
      hits.push([ci, ki]);
      if (c === "normalization-flag") {
        const m = NORM_DETAIL.exec(String(f.evidence?.detail ?? ""));
        if (m) { zeroWidth = Math.max(zeroWidth, +m[1]); homoglyph = Math.max(homoglyph, +m[2]); }
      }
    }
    hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    // Solve for tier2ClustersGE2 (not recoverable from findings) by matching
    // the engine's own output. Where both values agree, the flag is inert.
    let solved = false, chosen = false;
    for (const guess of [false, true]) {
      const s = { w: sig.wordCount, zw: zeroWidth, hg: homoglyph, t2: guess ? 1 : 0, h: hits };
      const r = scoreFromHits(s, WEIGHTS_BY_INDEX, null, null, null);
      if (r.score === sig.score && r.classification === sig.classification && r.confidence === sig.confidence) {
        solved = true; chosen = guess; break;
      }
    }
    if (!solved) {
      mismatches += 1;
      if (mismatchExamples.length < 5) {
        const r = scoreFromHits({ w: sig.wordCount, zw: zeroWidth, hg: homoglyph, t2: 0, h: hits }, WEIGHTS_BY_INDEX, null, null, null);
        mismatchExamples.push({ id: d.id, view: view.key,
          engine: { score: sig.score, cls: sig.classification, conf: sig.confidence },
          port: { score: r.score, cls: r.classification, conf: r.confidence } });
      }
    }

    const { vector, freq } = computeFeatures(d.text);
    const fw = new Array(FUNCTION_WORDS.length).fill(0);
    for (const [w, c] of freq) { const fi = FW_INDEX.get(w); if (fi !== undefined) fw[fi] = c; }
    if (view.key === "raw") for (const w of freq.keys()) if (!FW_INDEX.has(w) && w.length >= 4) docFreq.set(w, (docFreq.get(w) ?? 0) + 1);

    out.push({ id: d.id, w: sig.wordCount, zw: zeroWidth, hg: homoglyph, t2: chosen ? 1 : 0,
      h: hits, p: t3.has(d.id) ? +t3.get(d.id).toFixed(6) : null,
      es: sig.score, ec: sig.classification, f: vector.map(r5), fw, freq, text: d.text });

    if (!identity.has(d.id)) {
      identity.set(d.id, { id: d.id, side: d.side, provider: d.provider, era: d.era,
        model: d.model, genre: genreById.get(d.id) ?? d.genre ?? null });
    }
    i += 1;
    if (i % 400 === 0) console.log(`  ${view.key} ${i}/${rows.length}`);
  }
  perView[view.key] = out;
  console.log(`${view.key}: ${out.length} samples`);
}

console.log(`\nport-vs-engine mismatches: ${mismatches} / ${perView.raw.length + perView.stripped.length}`);
if (mismatchExamples.length) console.log(JSON.stringify(mismatchExamples, null, 2));
console.log(`inspectSignalsV2 throws: ${inspectErrors}`);

// Safety net: a "list" category that turns out to have runaway key cardinality
// is not a trigger list at all. Report it rather than rendering 500 rows.
const runaway = CATS.map((c, i) => (!(c in MEASURE_FEATURE) && keyVocab[i].size > 120 ? `${c} (${keyVocab[i].size})` : null)).filter(Boolean);
if (runaway.length) console.log(`\nWARNING high-cardinality list categories: ${runaway.join(", ")}`);

// ── top-200 content words by document frequency ──────────────────────
const CONTENT_WORDS = [...docFreq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, 200).map(([w]) => w);
const CW_INDEX = new Map(CONTENT_WORDS.map((w, i) => [w, i]));

// ── assemble ─────────────────────────────────────────────────────────
const ids = [...identity.keys()];
const providers = [...new Set([...identity.values()].map((s) => (s.side === "ai" ? `${s.provider} ${s.era}` : "human")))].sort();
const models = [...new Set([...identity.values()].map((s) => s.model))].sort();
const genres = [...new Set([...identity.values()].map((s) => s.genre).filter(Boolean))].sort();

const samples = ids.map((id) => {
  const s = identity.get(id);
  return { a: s.side === "ai" ? 1 : 0,
    p: providers.indexOf(s.side === "ai" ? `${s.provider} ${s.era}` : "human"),
    m: models.indexOf(s.model), g: s.genre ? genres.indexOf(s.genre) : -1 };
});

const orderView = (key) => {
  const byId = new Map(perView[key].map((r) => [r.id, r]));
  const rows = [], texts = [];
  for (const id of ids) {
    const r = byId.get(id);
    if (!r) throw new Error(`missing ${id} in view ${key}`);
    const cw = [];
    for (const [w, c] of r.freq) { const ci = CW_INDEX.get(w); if (ci !== undefined) cw.push([ci, c]); }
    cw.sort((a, b) => a[0] - b[0]);
    rows.push({ w: r.w, zw: r.zw, hg: r.hg, t2: r.t2, h: r.h, p: r.p, es: r.es,
      ec: r.ec === "human_like" ? 0 : r.ec === "mixed_signals" ? 1 : 2, f: r.f, fw: r.fw, cw });
    texts.push(r.text);
  }
  return { rows, texts };
};

const categories = CATS.map((c, i) => {
  const info = CATEGORY_INFO[c];
  if (!info) throw new Error(`no group/description for category ${c}`);
  const isMeasure = c in MEASURE_FEATURE;
  return { id: c, w: SHIPPED_WEIGHTS[c], grp: info[0], desc: info[1],
    sty: STYLOMETRIC.has(c) || V4_RHYTHM.has(c) ? 1 : 0, v4: V4_RHYTHM.has(c) ? 1 : 0,
    ac: ARTEFACT_CORE.has(c) ? 1 : 0, as: ARTEFACT_SUPPORT.has(c) ? 1 : 0,
    fc: FORMATTING_CLUSTER.has(c) ? 1 : 0, fu: FURNITURE.has(c) ? 1 : 0,
    measure: isMeasure ? 1 : 0, feat: isMeasure ? MEASURE_FEATURE[c] : null,
    keys: [...keyVocab[i].keys()] };
});

const raw = orderView("raw"), stripped = orderView("stripped");
const data = {
  generated: new Date().toISOString().slice(0, 10),
  engineVersion: core.EN_SIGNALS_PATTERN_VERSION,
  groups: GROUPS, categories, providers, models, genres, samples,
  features: FEATURE_DEFS.map(([id, label, grp, desc]) => ({ id, label, grp, desc })),
  functionWords: FUNCTION_WORDS, contentWords: CONTENT_WORDS,
  views: { raw: raw.rows, stripped: stripped.rows },
  texts: { raw: raw.texts, stripped: stripped.texts },
  portMismatches: mismatches,
};

const dst = join(HERE, "data.json");
writeFileSync(dst, JSON.stringify(data));
console.log(`\nwrote ${dst} (${(readFileSync(dst).length / 1e6).toFixed(2)} MB)`);
console.log(`${categories.length} categories, ${samples.length} samples, ${FEATURE_IDS.length} features`);
console.log(`${categories.filter((c) => !c.measure).length} trigger-list categories, ${categories.filter((c) => c.measure).length} computed measures`);
console.log(`${categories.reduce((a, c) => a + (c.measure ? 0 : c.keys.length), 0)} distinct individual triggers`);
