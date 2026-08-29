// Workstream REAL - run the SHIPPED rules stack + v4 metrics over an
// arbitrary sample file. Byte-identical logic to provider-eval/score_rules.mjs
// (same packages/core dist, no rule edits); only the paths are parameterised so
// the raw and stripped runs share one code path.
//
//   node score_rules.mjs stripped-set.jsonl rules-stripped.jsonl
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CORE = join(HERE, "..", "..", "..", "..", "packages", "core");
const require = createRequire(import.meta.url);
const core = require(join(CORE, "dist", "index.js"));
const v4 = require(join(CORE, "dist", "patterns", "en-signals-v4.js"));

const resolve = (p) => (isAbsolute(p) ? p : join(HERE, p));
const SRC = resolve(process.argv[2]);
const DST = resolve(process.argv[3]);

const SENT_SPLIT = /(?<=[.!?])\s+|\n+/;

function sentences(text) {
  return text
    .split(SENT_SPLIT)
    .map((s) => s.replace(/^[#>*\-\d.\s]+/, "").trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length >= 1);
}

function stylometrics(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const w = words.length;
  const em = (text.match(/—/g) || []).length;
  const en = (text.match(/–/g) || []).length;
  const spacedHyphen = (text.match(/ - /g) || []).length;
  const sents = sentences(text);
  const lens = sents.map((s) => s.split(/\s+/).filter(Boolean).length);
  const n = lens.length;
  const mean = n ? lens.reduce((a, b) => a + b, 0) / n : 0;
  const sd = n > 1 ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  const shortShare = n ? lens.filter((l) => l <= 7).length / n : 0;
  const fragShare = n ? lens.filter((l) => l <= 4).length / n : 0;
  const bullets = (text.match(/^\s*[-*•]\s+/gm) || []).length;
  const headings = (text.match(/^#+\s/gm) || []).length;
  const bold = (text.match(/\*\*[^*\n]+\*\*/g) || []).length;
  const paras = text.split(/\n\s*\n/).map((p) => p.split(/\s+/).filter(Boolean).length).filter((l) => l > 0);
  const pMean = paras.length ? paras.reduce((a, b) => a + b, 0) / paras.length : 0;
  const pSd = paras.length > 1
    ? Math.sqrt(paras.reduce((a, b) => a + (b - pMean) ** 2, 0) / (paras.length - 1)) : 0;
  const lines = text.split("\n").filter((l) => l.trim().length > 0).length;
  return {
    emDashPer1000: (em / w) * 1000,
    enDashPer1000: (en / w) * 1000,
    spacedHyphenPer1000: (spacedHyphen / w) * 1000,
    sentCount: n,
    sentMean: mean,
    sentSd: sd,
    sentCv: mean ? sd / mean : 0,
    shortSentShare: shortShare,
    fragmentShare: fragShare,
    bulletsPer1000: (bullets / w) * 1000,
    headingsPer1000: (headings / w) * 1000,
    boldPer1000: (bold / w) * 1000,
    paraCount: paras.length,
    paraMean: pMean,
    paraCv: pMean ? pSd / pMean : 0,
    lineCount: lines,
    linesPerPara: paras.length ? lines / paras.length : 0,
    words: w,
  };
}

const lines = readFileSync(SRC, "utf8").trim().split("\n");
const out = [];
let i = 0;
for (const line of lines) {
  const d = JSON.parse(line);
  const sig = core.computeEditorialSignals(d.text);
  let findings = [];
  let inspectError = null;
  try {
    findings = core.inspectSignalsV2(d.text);
  } catch (e) {
    inspectError = String(e && e.message ? e.message : e);
  }
  const ruleCounts = {};
  const catWeights = {};
  for (const f of findings) {
    ruleCounts[f.rule_id] = (ruleCounts[f.rule_id] || 0) + 1;
    const c = f.evidence?.category || "unknown";
    catWeights[c] = (catWeights[c] || 0) + (f.evidence?.weight || 0);
  }
  let v4m = null;
  try {
    v4m = v4.computeV4Metrics(d.text);
  } catch {}
  out.push({
    id: d.id,
    provider: d.provider,
    era: d.era,
    model: d.model,
    side: d.side,
    genre: d.genre ?? null,
    words: d.words,
    corpus_split: d.corpus_split ?? null,
    in_tier3_selection: d.in_tier3_selection ?? false,
    rules: {
      score: sig.score,
      classification: sig.classification,
      probabilities: sig.probabilities,
      confidence: sig.confidence,
      categoriesHit: sig.categoriesHit,
      findingCount: sig.findingCount,
      escalation: sig.escalation.applied,
      status: sig.status,
      ruleCounts,
      catWeights,
      inspectError,
    },
    v4: v4m,
    stylo: stylometrics(d.text),
  });
  i += 1;
  if (i % 200 === 0) console.log(`rules ${i}/${lines.length}`);
}
writeFileSync(DST, out.map((r) => JSON.stringify(r)).join("\n") + "\n");
console.log(`done ${out.length} -> ${DST}`);
