// Calibration harness for the en-signals 2026.08.5 measured-stylometrics +
// owner-rhythm pack. Run after building the core:
//
//   npm --prefix packages/core run build   # or npm run test:core
//   node tests/battery/calibrate.mjs
//
// Prints every fixture's measured 2026.08.5 metrics against the shipped
// thresholds (packages/core/src/patterns/en-signals-v4-data.ts
// V4_THRESHOLDS) and exits non-zero if ANY human sample would fire any
// 2026.08.5 rule — the FP-first calibration contract from
// research/CLEAN-PROSE-DETECTION-PLAN.md §5.2.
//
// Human samples come from, in order:
// 1. tests/battery/human-corpus-v1.json when present (the 30-50-sample
//    genre-matched corpus another workstream is assembling; format:
//    [{ id, text, ... }] or { samples: [...] }). Its arrival upgrades this
//    calibration from provisional to corpus-backed — re-run this script and
//    tighten thresholds only with it green.
// 2. Otherwise: every human fixture in the repository (fixture E, the SEO
//    template page, the non-native control, the professional marketing-copy
//    guard) — the PROVISIONAL calibration set — plus, when present on this
//    machine, the human controls from the quarantined evaluation corpus
//    (used as an FP regression check only, never for TPR tuning:
//    CLEAN-PROSE-DETECTION-PLAN.md §5.1).
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dist = (p) => fileURLToPath(new URL(`../../packages/core/dist/patterns/${p}`, import.meta.url));
const { computeV4Metrics } = await import(dist("en-signals-v4.js"));
const { V4_THRESHOLDS: T, V4_RHYTHM_CATEGORIES } = await import(dist("en-signals-v4-data.js"));
const { inspectSignalsV2, computeEditorialSignals } = await import(dist("en-signals-v2.js"));
const { FIXTURE_C, FIXTURE_D, FIXTURE_E, ARTICLE_EXCERPT } = await import(new URL("./fixtures.mjs", import.meta.url));
const rf = await import(new URL("./rhythm-fixtures.mjs", import.meta.url));

const V4_RULE_IDS = new Set([...V4_RHYTHM_CATEGORIES].map((c) => "signals." + c.replace(/-/g, "_")));

/** Which 2026.08.5 rules fire for a text, via the real engine. */
function firedRules(text) {
  return inspectSignalsV2(text).map((f) => f.rule_id).filter((r) => V4_RULE_IDS.has(r));
}

function row(id, label, text) {
  const m = computeV4Metrics(text);
  const fired = firedRules(text);
  const esc = computeEditorialSignals(text);
  return { id, label, m, fired, classification: esc.classification, escalated: esc.escalation.applied };
}

const samples = [];

// 1. The genre-matched human corpus, when it exists.
let corpusLoaded = false;
try {
  const raw = JSON.parse(await readFile(new URL("./human-corpus-v1.json", import.meta.url), "utf8"));
  const list = Array.isArray(raw) ? raw : raw.samples;
  for (const s of list) samples.push(row(s.id ?? `corpus-${samples.length}`, "human", s.text));
  corpusLoaded = true;
  console.log(`human-corpus-v1.json loaded: ${list.length} samples — corpus-backed calibration`);
} catch {
  console.log("human-corpus-v1.json not present — PROVISIONAL calibration against repository human fixtures");
}

// 2. Repository human fixtures (always included).
samples.push(row("fixture-E", "human", FIXTURE_E));
samples.push(row("seo-template", "human", rf.SEO_TEMPLATE_PAGE));
samples.push(row("non-native", "human", rf.NON_NATIVE_CONTROL));
samples.push(row("marketing-copy", "human", rf.MARKETING_COPY_HUMAN));

// 3. Quarantined-eval human controls, FP check only (session-local path; the
// texts are third-party and are not stored in the repository).
if (!corpusLoaded) {
  const evalPath =
    "/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins/1fc732d4-98d7-4177-8945-5a9833d4621d/scratchpad/eval-samples.json";
  try {
    const evalSamples = JSON.parse(await readFile(evalPath, "utf8"));
    for (const s of evalSamples.filter((s) => s.label === "human")) samples.push(row(s.id, "human", s.text));
    console.log("eval-corpus human controls included (FP regression check only)");
  } catch {
    console.log("eval corpus not present on this machine; skipped");
  }
}

// 4. AI positives — reported for context, never used to fit thresholds.
samples.push(row("fixture-C", "ai", FIXTURE_C));
samples.push(row("fixture-D", "ai", FIXTURE_D));
samples.push(row("article-excerpt", "ai", ARTICLE_EXCERPT));
samples.push(row("ai-cadence", "ai-crafted", rf.AI_CADENCE_FIXTURE));
samples.push(row("ratio-abstract", "ai-crafted", rf.RATIO_ABSTRACT_FIXTURE));
samples.push(row("spectral-cadence", "ai-crafted", rf.SPECTRAL_CADENCE_FIXTURE));
samples.push(row("chat-export-compression", "ai-crafted", rf.CHAT_EXPORT_COMPRESSION_FIXTURE));
samples.push(row("formal-register", "ai-crafted", rf.FORMAL_REGISTER_FIXTURE));

const fmt = (v, dp = 3) => (v === null || v === undefined ? "  --" : (+v).toFixed(dp));
console.log("\nThresholds:", JSON.stringify(T));
console.log(
  "\nid                              label       words sents  flat   gain  funcL1 longΔ  punch rate  final mic contr /1k  abs conc share  fired");
for (const s of samples) {
  const m = s.m;
  console.log(
    `${s.id.padEnd(32)}${s.label.padEnd(11)}${String(m.wordCount).padStart(6)}${String(m.sentenceCount).padStart(6)}` +
    ` ${fmt(m.spectralFlatness, 2)} ${fmt(m.compressionGain, 3)} ${fmt(m.registerFuncL1, 3)} ${fmt(m.registerLongWordDelta, 3)}` +
    ` ${String(m.punchlineCount).padStart(5)} ${fmt(m.punchlineRate, 2)} ${String(m.punchlineParagraphFinal).padStart(5)}` +
    ` ${String(m.micDropParagraphs).padStart(3)} ${String(m.contrastCount).padStart(5)} ${fmt(m.contrastPer1000, 1)}` +
    ` ${String(m.ratioAbstract).padStart(4)} ${String(m.ratioConcrete).padStart(4)} ${fmt(m.ratioAbstractShare, 2)}` +
    `  ${s.fired.length ? s.fired.map((r) => r.replace("signals.", "")).join(",") : "-"}` +
    `${s.escalated ? ` [escalated:${s.escalated}]` : ""}`,
  );
}

const humanViolations = samples.filter((s) => s.label === "human" && s.fired.length > 0);
const humanEscalations = samples.filter((s) => s.label === "human" && s.escalated !== null);
console.log("");
if (humanViolations.length > 0 || humanEscalations.length > 0) {
  for (const v of humanViolations) console.error(`CALIBRATION FAILURE: human sample ${v.id} fires ${v.fired.join(", ")}`);
  for (const v of humanEscalations) console.error(`CALIBRATION FAILURE: human sample ${v.id} escalated (${v.escalated})`);
  process.exit(1);
}
console.log(`Calibration OK: 0/${samples.filter((s) => s.label === "human").length} human samples fire any 2026.08.5 rule.`);
