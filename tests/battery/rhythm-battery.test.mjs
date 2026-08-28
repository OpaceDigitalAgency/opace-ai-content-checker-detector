// Rhythm battery — standing gate for the en-signals 2026.08.5 measured-
// stylometrics + owner-rhythm pack (research/CLEAN-PROSE-DETECTION-PLAN.md
// Tier 1; research/OWNER-RHYTHM-NOTES.md).
//
// Proves, against the BUILT engine: the AI-cadence fixture (including the
// owner's canonical mic-drop paragraph shape) fires the owner-rhythm rules;
// each measured-stylometric rule fires on its crafted positive; every human
// guard — fixture E, the SEO-template page, the non-native control and
// PROFESSIONAL MARKETING COPY with legitimate punchlines — stays silent on
// all seven rules and never escalates; rhythm rules alone can never escalate
// (they count as ONE combined breadth contribution); and, when the
// 40-sample genre-matched human corpus (human-corpus-v1.json) is present,
// ZERO of its samples escalate. Calibration details: calibrate.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FIXTURE_E } from "./fixtures.mjs";
import {
  AI_CADENCE_FIXTURE, CHAT_EXPORT_COMPRESSION_FIXTURE, FORMAL_REGISTER_FIXTURE,
  MARKETING_COPY_HUMAN, NON_NATIVE_CONTROL, RATIO_ABSTRACT_FIXTURE,
  RHYTHM_ONLY_STACK, SEO_TEMPLATE_PAGE, SPECTRAL_CADENCE_FIXTURE,
} from "./rhythm-fixtures.mjs";

const { inspectSignalsV2, computeEditorialSignals } =
  await import(new URL("../../packages/core/dist/index.js", import.meta.url).pathname);
const { V4_RHYTHM_CATEGORIES } =
  await import(new URL("../../packages/core/dist/patterns/en-signals-v4-data.js", import.meta.url).pathname);

const V4_RULE_IDS = [...V4_RHYTHM_CATEGORIES].map((c) => "signals." + c.replace(/-/g, "_"));
const firedV4 = (text) => inspectSignalsV2(text).map((f) => f.rule_id).filter((r) => V4_RULE_IDS.includes(r));

test("rhythm battery: the AI-cadence fixture fires the three owner-rhythm cadence rules", () => {
  const fired = new Set(firedV4(AI_CADENCE_FIXTURE));
  for (const rule of ["signals.punchline_fragment_density", "signals.mic_drop_paragraph", "signals.contrast_density"]) {
    assert.ok(fired.has(rule), `${rule} must fire on the AI-cadence fixture; fired: ${[...fired].join(", ") || "(none)"}`);
  }
});

test("rhythm battery: each measured-stylometric rule fires on its crafted positive", () => {
  const cases = [
    [SPECTRAL_CADENCE_FIXTURE, "signals.sentence_length_spectral_flatness"],
    [CHAT_EXPORT_COMPRESSION_FIXTURE, "signals.conditional_compression"],
    [FORMAL_REGISTER_FIXTURE, "signals.lexical_register_distance"],
    [RATIO_ABSTRACT_FIXTURE, "signals.rhetorical_procedural_ratio"],
  ];
  for (const [text, rule] of cases) {
    assert.ok(firedV4(text).includes(rule), `${rule} must fire on its positive fixture`);
  }
});

test("rhythm battery: every human guard is silent on all seven rules and never escalates", () => {
  const guards = {
    "fixture E": FIXTURE_E,
    "SEO-template page": SEO_TEMPLATE_PAGE,
    "non-native control": NON_NATIVE_CONTROL,
    "professional marketing copy (legitimate punchlines)": MARKETING_COPY_HUMAN,
  };
  for (const [name, text] of Object.entries(guards)) {
    const fired = firedV4(text);
    assert.equal(fired.length, 0, `${name} fired ${fired.join(", ")}`);
    const r = computeEditorialSignals(text);
    assert.equal(r.escalation.applied, null, `${name} escalated (${r.escalation.applied})`);
    assert.notEqual(r.classification, "ai_like", `${name} classified ai_like (score ${r.score})`);
  }
});

test("rhythm battery: rhythm rules alone never escalate and never reach ai_like (ONE combined contribution)", () => {
  const r = computeEditorialSignals(RHYTHM_ONLY_STACK);
  const v4Fired = r.categoriesHit.filter((c) => V4_RHYTHM_CATEGORIES.has(c));
  assert.ok(v4Fired.length >= 4, `stack must fire 4+ rhythm rules, got ${v4Fired.join(", ")}`);
  assert.equal(r.escalation.applied, null, `rhythm-only stack escalated: ${r.escalation.applied}`);
  assert.notEqual(r.classification, "ai_like", `rhythm-only stack reached ai_like (score ${r.score})`);
});

test("rhythm battery: ZERO human-corpus samples escalate (40-sample genre-matched corpus)", async (t) => {
  // human-corpus-v1.json is assembled by another workstream. When present,
  // every sample must pass with no escalation and no ai_like verdict — the
  // FP-first release gate for this pack. Until it lands, this test skips
  // (the provisional gate lives in the guards test above and calibrate.mjs).
  let raw;
  try {
    raw = JSON.parse(await readFile(new URL("./human-corpus-v1.json", import.meta.url), "utf8"));
  } catch {
    t.diagnostic("human-corpus-v1.json not present yet; run node tests/battery/calibrate.mjs when it lands");
    return;
  }
  const samples = Array.isArray(raw) ? raw : raw.samples;
  assert.ok(Array.isArray(samples) && samples.length >= 30, `expected 30+ corpus samples, got ${samples?.length}`);
  for (const s of samples) {
    const id = s.id ?? "(unnamed sample)";
    const r = computeEditorialSignals(s.text);
    assert.equal(r.escalation.applied, null, `human corpus sample ${id} escalated (${r.escalation.applied}, score ${r.score})`);
    assert.notEqual(r.classification, "ai_like", `human corpus sample ${id} classified ai_like (score ${r.score})`);
  }
});
