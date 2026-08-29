// Per-rule validation — stage 1: extract shipped-engine rule firings.
//
// Reads packages/core dist EXACTLY as shipped (no rule edits, no monkey
// patching) and records, for every eval sample, the deduplicated per-category
// issue counts that the scorer itself consumes, plus the shipped document
// score / classification.
//
// Usage:
//   node scripts/extract.mjs <in.jsonl> <out.jsonl>
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";

const HERE = dirname(dirname(fileURLToPath(import.meta.url)));
const CORE = join(HERE, "..", "..", "..", "..", "packages", "core");
const require = createRequire(import.meta.url);
const core = require(join(CORE, "dist", "index.js"));

const resolve = (p) => (isAbsolute(p) ? p : join(HERE, p));
const SRC = resolve(process.argv[2]);
const DST = resolve(process.argv[3]);

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
  // Deduplicated issue counts per category. inspectSignalsV2 returns exactly
  // `analysis.issues` (already deduped by category:key), which is the same
  // array computeEditorialSignals sums weights over — so these counts
  // reconstruct rawScore exactly. Verified in scripts/verify_reconstruction.mjs.
  const catCounts = {};
  for (const f of findings) {
    const c = f.evidence?.category ?? "unknown";
    catCounts[c] = (catCounts[c] || 0) + 1;
  }
  out.push({
    id: d.id,
    provider: d.provider,
    era: d.era,
    model: d.model,
    side: d.side,
    genre: d.genre ?? null,
    source: d.source ?? null,
    words: d.words,
    wordCount: sig.wordCount ?? null,
    status: sig.status,
    score: sig.score ?? null,
    classification: sig.classification ?? null,
    confidence: sig.confidence ?? null,
    findingCount: sig.findingCount ?? 0,
    categoriesHit: sig.categoriesHit ?? [],
    catCounts,
    inspectError,
  });
  if (++i % 250 === 0) console.error(`  ${i}/${lines.length}`);
}
writeFileSync(DST, out.map((r) => JSON.stringify(r)).join("\n") + "\n");
console.error(`done ${out.length} -> ${DST}`);
