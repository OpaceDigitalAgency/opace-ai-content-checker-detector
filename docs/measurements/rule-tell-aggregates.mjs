// Rule-tell merged-panel aggregates — the measurement behind MERGED_ROW_COUNTS.
//
// The checker's merged evidence panel (opace-website/astro-latest,
// src/lib/content-integrity/rule-tells.ts) publishes union rates: how many
// documents carry at least one phrase row or qualifying rule-tell row. The
// per-rule counts come from tests/battery/rule-liveness.json; the union cannot
// be derived from that register because it needs a per-document reading. This
// script produces it, on the same four corpora, with the same matching code
// paths the site ships:
//
//  - phrase rows: a port of findPhrasesIn/normaliseSpelling from
//    src/lib/content-integrity/phrase-ratios.ts, run over the shipped
//    phrase table (content-integrity-phrase-ratios.json);
//  - rule rows: packages/core/dist inspectPatterns, findings filtered to the
//    qualifying tells (same interval gate, FORMAT_DEPENDENT and CANNOT_QUOTE
//    exclusions as rule-tells.ts) that carry a quotable passage span
//    (not document_level, span width >= 2 UTF-16 units).
//
// Usage, from the repository root after `npm run build` in packages/core:
//   node docs/measurements/rule-tell-aggregates.mjs
// The phrase table is read from the website checkout by default; override with
//   PHRASE_TABLE=/path/to/content-integrity-phrase-ratios.json
//
// Output: the per-side counts (documents, withPhraseRow, withRuleRow,
// withAnyRow, withBoth) and the derived rates, plus the sha256 of the phrase
// table used, so the run is checkable against
// docs/measurements/RULE-TELL-AGGREGATES-2026-08-31.md and against
// MERGED_ROW_COUNTS in the website repository.
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import readline from "node:readline";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const require = createRequire(import.meta.url);
const D = join(ROOT, "packages", "core", "dist");
const { inspectPatterns } = require(join(D, "patterns", "en-gb-v1.js"));

const PHRASE_TABLE_PATH = process.env.PHRASE_TABLE ?? resolve(
  ROOT, "..", "..", "..", "opace-website", "astro-latest",
  "src", "data", "content-integrity-phrase-ratios.json");
const LIVENESS_PATH = join(ROOT, "tests", "battery", "rule-liveness.json");
const RESEARCH = join(ROOT, "services", "local-engine", "research");

// ── The qualifying-tell gate, as rule-tells.ts defines it ────────────────────
const DISCRIMINATION_BAR = 2;
const FORMAT_DEPENDENT = new Set([
  "signals.markdown_bold", "signals.markdown_heading", "signals.markdown_furniture",
  "signals.formatting", "signals.bold_label_bullets", "signals.heading_inflation",
  "signals.bullet_np_list", "signals.emoji_decoration", "signals.arrow_decoration",
  "signals.directive_colon_bullets", "signals.escaped_markup_literal",
  "signals.title_case_header", "signals.hashtag_stuff", "signals.uniform_list_items",
  "signals.smart_punct_signature", "signals.em_dash_density"
]);
const CANNOT_QUOTE = new Set([
  "signals.setup_expansion_cadence", "signals.uniform_sections", "signals.low_ttr",
  "signals.cross_para_burstiness", "signals.adjacent_lemma_repeat", "signals.low_specificity",
  "signals.passive_ratio", "signals.lexical_register_distance", "signals.contrast_density",
  "signals.quote_inconsistency", "signals.conditional_compression", "signals.mic_drop_paragraph",
  "signals.sentence_length_spectral_flatness", "signals.punct_distribution",
  "signals.sentence_flatline", "signals.normalization_flag", "signals.uniformity",
  "signals.fnword_trigram_entropy", "signals.focal_density", "signals.proximity_cluster",
  "signals.emotional_flatline"
]);

const intervalLow = (aiFired, humanFired, ai, human) => {
  const ratio = ((aiFired + 0.5) / (ai + 1)) / ((humanFired + 0.5) / (human + 1));
  const se = Math.sqrt(1 / (aiFired + 0.5) - 1 / (ai + 1) + 1 / (humanFired + 0.5) - 1 / (human + 1));
  return Math.exp(Math.log(ratio) - 1.96 * se);
};

const qualifyingTells = (liveness) => {
  const { ai_documents: ai, human_documents: human } = liveness.denominators;
  const nonFiring = new Set(Object.keys(liveness.inactive).filter((k) => k !== "_note"));
  return new Set(Object.entries(liveness.rules)
    .filter(([id]) => !nonFiring.has(id) && !FORMAT_DEPENDENT.has(id) && !CANNOT_QUOTE.has(id))
    .filter(([, r]) => intervalLow(r.ai_documents_fired, r.human_documents_fired, ai, human) >= DISCRIMINATION_BAR)
    .map(([id]) => id));
};

// ── Phrase matching, ported from phrase-ratios.ts ────────────────────────────
const WORDS = {
  colour: "color", colours: "colors", coloured: "colored",
  behaviour: "behavior", behaviours: "behaviors", behavioural: "behavioral",
  favour: "favor", favours: "favors", favoured: "favored", favourable: "favorable",
  labour: "labor", honour: "honor", neighbour: "neighbor", neighbours: "neighbors",
  centre: "center", centres: "centers", theatre: "theater", metre: "meter",
  metres: "meters", fibre: "fiber", litre: "liter",
  defence: "defense", offence: "offense", licence: "license", practise: "practice",
  programme: "program", programmes: "programs",
  analyse: "analyze", analysed: "analyzed", analysing: "analyzing",
  catalogue: "catalog", dialogue: "dialog",
  travelled: "traveled", travelling: "traveling", modelled: "modeled",
  modelling: "modeling", labelled: "labeled", labelling: "labeling",
  whilst: "while", amongst: "among", towards: "toward",
  learnt: "learned", spelt: "spelled", burnt: "burned",
  sceptical: "skeptical", sceptic: "skeptic",
  grey: "gray", storey: "story", kerb: "curb"
};
const WORD_RE = new RegExp(`\\b(${Object.keys(WORDS).sort((a, b) => b.length - a.length).join("|")})\\b`, "g");
const normaliseSpelling = (text) => text
  .replace(/\bper cent\b/gi, "percent")
  .replace(WORD_RE, (m) => WORDS[m] ?? m)
  .replace(/\b(\w+?)isation\b/g, "$1ization")
  .replace(/\b(\w+?)ise\b/g, "$1ize")
  .replace(/\b(\w+?)ised\b/g, "$1ized")
  .replace(/\b(\w+?)ising\b/g, "$1izing")
  .replace(/\b(\w+?)iser\b/g, "$1izer");

const hasPhraseRow = (table, draft) => {
  if (!draft.trim()) return false;
  const wanted = new Set(table.phrases.map((row) => row.phrase));
  const longest = Math.max(0, ...table.phrases.map((p) => p.phrase.split(" ").length));
  const tokens = [];
  const re = /\S+/gu;
  for (let m = re.exec(draft); m !== null; m = re.exec(draft)) {
    const raw = m[0];
    const lead = raw.length - raw.replace(/^["“”‘’([{«]+/, "").length;
    const trail = raw.length - raw.replace(/["“”‘’)\]}»]+$/, "").length;
    const body = raw.slice(lead, raw.length - trail);
    if (body) tokens.push(normaliseSpelling(body.toLowerCase()));
  }
  for (let i = 0; i < tokens.length; i++) {
    for (let n = 1; n <= longest && i + n <= tokens.length; n++) {
      if (wanted.has(tokens.slice(i, i + n).join(" "))) return true;
    }
  }
  return false;
};

// ── Rule rows: a qualifying tell with a quotable passage span ────────────────
const hasRuleRow = (tells, findings) => findings.some((f) =>
  tells.has(f.rule_id) &&
  f.evidence?.document_level !== true &&
  typeof f.span?.start_utf16 === "number" && typeof f.span?.end_utf16 === "number" &&
  f.span.end_utf16 - f.span.start_utf16 >= 2);

// ── The same four corpora, in the same order, as rule-liveness.mjs ───────────
const jsonlReader = (pick) => async function* (path) {
  const rl = readline.createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let d;
    try { d = JSON.parse(line); } catch { continue; }
    const text = pick(d);
    if (typeof text === "string" && text.length > 0) yield text;
  }
};
async function* jsonArrayReader(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const rows = Array.isArray(parsed) ? parsed : parsed.samples ?? [];
  for (const d of rows) {
    const text = typeof d === "string" ? d : d.text;
    if (typeof text === "string" && text.length > 0) yield text;
  }
}
const CORPORA = [
  { id: "generated-2026-08", side: "ai", path: join(RESEARCH, "generated-corpus", "generated.jsonl"),
    read: jsonlReader((d) => (d.usable === false ? null : d.text)) },
  { id: "provider-eval-ai", side: "ai", path: join(RESEARCH, "provider-eval", "eval-set.jsonl"),
    read: jsonlReader((d) => (d.side === "ai" ? d.text : null)) },
  { id: "provider-eval-human", side: "human", path: join(RESEARCH, "provider-eval", "eval-set.jsonl"),
    read: jsonlReader((d) => (d.side === "ai" ? null : d.text)) },
  { id: "human-corpus-v2", side: "human", path: join(ROOT, "tests", "battery", "human-corpus-v2.json"),
    read: jsonArrayReader },
  { id: "human-corpus-v1", side: "human", path: join(ROOT, "tests", "battery", "human-corpus-v1.json"),
    read: jsonArrayReader },
];

async function main() {
  if (!existsSync(PHRASE_TABLE_PATH)) throw new Error(`phrase table not found: ${PHRASE_TABLE_PATH}`);
  const tableBytes = readFileSync(PHRASE_TABLE_PATH);
  const table = JSON.parse(tableBytes.toString("utf8"));
  const liveness = JSON.parse(readFileSync(LIVENESS_PATH, "utf8"));
  const tells = qualifyingTells(liveness);
  process.stderr.write(`qualifying tells: ${[...tells].sort().join(", ")}\n`);

  const sides = {
    ai: { documents: 0, withPhraseRow: 0, withRuleRow: 0, withAnyRow: 0, withBoth: 0 },
    human: { documents: 0, withPhraseRow: 0, withRuleRow: 0, withAnyRow: 0, withBoth: 0 },
  };
  const perCorpus = {};
  for (const c of CORPORA) {
    if (!existsSync(c.path)) throw new Error(`missing corpus: ${c.path}`);
    const tally = { documents: 0, withPhraseRow: 0, withRuleRow: 0, withAnyRow: 0, withBoth: 0 };
    for await (const text of c.read(c.path)) {
      tally.documents += 1;
      const phrase = hasPhraseRow(table, text);
      const rule = hasRuleRow(tells, inspectPatterns(text));
      if (phrase) tally.withPhraseRow += 1;
      if (rule) tally.withRuleRow += 1;
      if (phrase || rule) tally.withAnyRow += 1;
      if (phrase && rule) tally.withBoth += 1;
      if (tally.documents % 500 === 0) process.stderr.write(`${c.id}: ${tally.documents}\n`);
    }
    perCorpus[c.id] = tally;
    for (const k of Object.keys(tally)) sides[c.side][k] += tally[k];
    process.stderr.write(`${c.id}: done, ${tally.documents} documents\n`);
  }

  const pct = (part, whole) => `${(part / whole * 100).toFixed(1)}%`;
  const out = {
    generated_by: "docs/measurements/rule-tell-aggregates.mjs",
    measured_utc: new Date().toISOString().slice(0, 10),
    phrase_table: { version: table.version, sha256: createHash("sha256").update(tableBytes).digest("hex") },
    qualifying_tells: [...tells].sort(),
    per_corpus: perCorpus,
    counts: sides,
    rates: {
      ai_with_any_row: pct(sides.ai.withAnyRow, sides.ai.documents),
      human_with_any_row: pct(sides.human.withAnyRow, sides.human.documents),
      phrases_alone_ai: pct(sides.ai.withPhraseRow, sides.ai.documents),
      phrases_alone_human: pct(sides.human.withPhraseRow, sides.human.documents),
    },
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}

await main();
