// Combined verdict regression suite (2026.08.8) — three independent axes.
//
// The original defect: character-forensics findings were rendered in their own
// rows and then discarded at verdict time, so a draft carrying a pasted
// chat-export citation token or a zero-width character could still present as
// "No strong AI-style signals".
//
// The 2026.08.7 fix over-corrected and introduced a worse defect, which the
// independent audit caught: those same findings could escalate the published
// verdict to `ai_like`. A hidden zero-width character proves text MANIPULATION,
// not AI ORIGIN, and OBJECTIVE.md records the binding decision that only the
// trained model gives an authorship reading.
//
// So this suite now enforces three things at once:
//   1. character evidence is still carried into the verdict rather than
//      discarded — the original defect stays fixed;
//   2. character evidence lands on the text-integrity axis and NEVER produces
//      an AI reading — the audit finding stays fixed;
//   3. every documented legitimate use of a reportable character still cannot
//      raise anything at all. The negative tests are the ones that must never
//      be relaxed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const core = await import(new URL("../../../packages/core/dist/index.js", import.meta.url).pathname);
const { computeCombinedVerdict, computeEditorialSignals, inspectUnicode, inspect } = core;
const { FIXTURE_C, FIXTURE_D, FIXTURE_E } = await import(new URL("../../battery/fixtures.mjs", import.meta.url));

const INTEGRITY_RANK = { clean: 0, attention: 1, manipulated: 2 };

/** Run the whole stack the way inspect() does, on one text. */
const verdict = (text, watermark, model) =>
  computeCombinedVerdict({
    signals: computeEditorialSignals(text),
    unicodeFindings: inspectUnicode(text),
    text,
    ...(watermark ? { watermark } : {}),
    ...(model ? { model } : {}),
  });

const CLEAN =
  "The council published the revised parking scheme on Tuesday. Residents in the three affected " +
  "streets get permits at the old rate until March, and everyone else pays the new charge from " +
  "the first of next month. Two of the six consultation meetings were cancelled for lack of " +
  "attendance, which the cabinet member put down to the timing rather than to indifference. " +
  "The scheme was drafted in 2023 and has been redrafted twice since. Nobody I spoke to on " +
  "Wilton Road had heard of it before the letters arrived last week.";

const cp = (n) => String.fromCodePoint(n);

// ─── Axis independence: the audit finding ────────────────────────────

test("AUDIT: no character finding, however strong, ever produces an AI reading", () => {
  const carriers = [
    ["single zero-width space", CLEAN.replace("Tuesday", "Tues​day")],
    ["carrier payload run", `${CLEAN}${cp(0x200b)}${cp(0x200b)}${cp(0x2060)}`],
    ["tag run outside a flag", `${CLEAN}${cp(0xe0048)}${cp(0xe0049)}`],
    ["interior homoglyph", CLEAN.replace("council", "couсil")],
    ["eight deliberate carriers", CLEAN + cp(0x200b).repeat(4) + " x " + cp(0x2060).repeat(4)],
    ["private-use cluster", `${CLEAN} logo ${cp(0xf8ff)} and ${cp(0xf8fe)} here.`],
  ];
  for (const [label, text] of carriers) {
    const v = verdict(text);
    assert.equal(v.ai_probability.reading, "not_assessed", `${label} produced an AI reading`);
    assert.equal(v.ai_probability.value, null, `${label} produced an AI probability`);
    assert.equal(v.ai_probability.source, null, `${label} named an AI source`);
    assert.ok(INTEGRITY_RANK[v.text_integrity.status] >= 1, `${label} was not carried onto the integrity axis`);
  }
});

test("AUDIT: a detected watermark is provenance, not an AI reading", () => {
  const v = verdict(CLEAN, { outcome: "detected" });
  assert.equal(v.text_integrity.status, "manipulated");
  assert.equal(v.text_integrity.applied, "watermark_signal");
  assert.equal(v.text_integrity.confidence, "high");
  assert.equal(v.text_integrity.watermark.counted_as_evidence, true);
  assert.equal(v.ai_probability.reading, "not_assessed", "a watermark must not set the AI axis");
  assert.ok(v.inputs_considered.includes("watermark"));
});

test("AUDIT: character evidence plus non-human-looking writing signals still gives no AI reading", () => {
  // This is the old `carrier_corroborates_signals` path, which combined axis B
  // and axis C into an `ai_like` verdict. It is deleted: two weak, differently
  // shaped signals do not make an authorship judgement between them.
  const text = `${FIXTURE_C} tail${cp(0xfe01)}end.`;
  const base = computeEditorialSignals(text);
  assert.equal(base.classification, "mixed_signals", "the fixture must sit at mixed_signals on the rules alone");
  const v = verdict(text);
  assert.equal(v.ai_probability.reading, "not_assessed");
  assert.equal(v.editorial.suggestion_level, "some");
  assert.equal(v.text_integrity.status, "attention");
  assert.equal(v.text_integrity.applied, "carrier_deliberate");
  assert.ok(!v.text_integrity.findings.some((f) => f.applied === "carrier_corroborates_signals"),
    "the cross-axis corroboration path must not exist");
});

test("AUDIT: no integrity or editorial string uses the vocabulary of AI authorship", () => {
  const texts = [
    CLEAN,
    CLEAN + cp(0x200b),
    `${CLEAN}${cp(0x200b)}${cp(0x200b)}${cp(0x2060)}`,
    CLEAN.replace("council", "couсil"),
    FIXTURE_C,
    FIXTURE_D,
  ];
  const banned = /\b(?:ai[-\s]?(?:like|generated|written|authored)|likely\s+ai|machine[-\s]written|human[-\s]?(?:like|written|authored))\b/i;
  for (const text of texts) {
    const v = verdict(text, { outcome: "detected" });
    const strings = [v.text_integrity.reason, v.editorial.reason, ...v.text_integrity.findings.map((f) => f.reason)];
    for (const line of strings) assert.doesNotMatch(line, banned, `authorship vocabulary leaked: ${line.slice(0, 70)}`);
  }
});

test("AUDIT: the rules tier never reaches the AI axis, whatever it says", () => {
  for (const text of [FIXTURE_C, FIXTURE_D]) {
    const v = verdict(text);
    assert.equal(v.ai_probability.reading, "not_assessed");
    assert.ok(["some", "many"].includes(v.editorial.suggestion_level), "the rules must still produce suggestions");
    // The rules' own three-way distribution is published verbatim for
    // transparency, but it is labelled as a rules artefact, not a probability.
    assert.ok(v.editorial.rule_probabilities, "the rules distribution is published for transparency");
    assert.equal(v.ai_probability.value, null, "the rules distribution is not an AI probability");
  }
});

// ─── Axis A: only a trained model may set it ─────────────────────────

test("a trained model is the only thing that sets the AI axis", () => {
  const model = { name: "local-signals", version: "cycle2", probability: 0.994, threshold: 0.984 };
  const v = verdict(CLEAN, undefined, model);
  assert.equal(v.ai_probability.reading, "ai_like");
  assert.equal(v.ai_probability.value, 0.994);
  assert.equal(v.ai_probability.threshold, 0.984);
  assert.equal(v.ai_probability.source, "local-signals@cycle2");
  assert.ok(v.inputs_considered.includes("model"));
  assert.match(v.ai_probability.reason, /only AI reading the engine publishes/);
  // The model reading must not disturb the other two axes.
  assert.equal(v.text_integrity.status, "clean");
  assert.equal(v.editorial.suggestion_level, "none");
});

test("a model score below its operating point reads human_like or uncertain, never silently AI", () => {
  const below = verdict(CLEAN, undefined, { name: "local-signals", probability: 0.02, threshold: 0.984 });
  assert.equal(below.ai_probability.reading, "human_like");
  const middle = verdict(CLEAN, undefined, { name: "local-signals", probability: 0.6, threshold: 0.984 });
  assert.equal(middle.ai_probability.reading, "uncertain");
});

test("a model outside its reliable length range publishes no reading at all", () => {
  const v = verdict("Short note.", undefined,
    { name: "local-signals", probability: 0.97, threshold: 0.984, below_reliable_range: true });
  assert.equal(v.ai_probability.reading, "not_assessed");
  assert.equal(v.ai_probability.confidence, "not_assessed");
  // The 67/50/19 truncation study was withdrawn on 30 August 2026 — no per-length
  // AI denominator, scored at a retired threshold — and the runtime string now
  // carries the re-measurement. Pinning the old figure here is what would put it back.
  assert.ok(v.limitations.some((l) => /29 of 172/.test(l) && /16\.9%/.test(l)),
    `the short-text limitation must carry the re-measured figures with their denominators: ${v.limitations.join(" | ")}`);
});

test("model confidence is distance from the operating point, not the raw score", () => {
  const onThreshold = verdict(CLEAN, undefined, { name: "m", probability: 0.984, threshold: 0.984 });
  assert.equal(onThreshold.ai_probability.confidence, "low", "a score sitting on the threshold is the least confident reading");
  const far = verdict(CLEAN, undefined, { name: "m", probability: 0.02, threshold: 0.984 });
  assert.equal(far.ai_probability.confidence, "high");
});

test("with no model the AI axis is not_assessed, and not_assessed is not human", () => {
  const v = verdict(CLEAN);
  assert.equal(v.ai_probability.reading, "not_assessed");
  assert.notEqual(v.ai_probability.reading, "human_like");
  assert.ok(v.limitations.some((l) => /not assessed does not mean human/.test(l)));
  assert.ok(!v.inputs_considered.includes("model"));
});

// ─── Baseline and invariants ─────────────────────────────────────────

test("clean human prose carries no character evidence and no integrity finding", () => {
  const v = verdict(CLEAN);
  assert.equal(v.text_integrity.status, "clean");
  assert.equal(v.text_integrity.applied, null);
  assert.deepEqual(v.text_integrity.findings, []);
  assert.equal(v.text_integrity.character_evidence.deliberate.length, 0);
  assert.equal(v.editorial.suggestion_level, "none");
});

test("the integrity status is never raised without character or watermark evidence", () => {
  for (const text of [CLEAN, FIXTURE_C, FIXTURE_D, FIXTURE_E]) {
    const v = verdict(text);
    if (v.text_integrity.status !== "clean") {
      assert.ok(v.text_integrity.character_evidence.deliberate.length > 0 || v.text_integrity.watermark.counted_as_evidence,
        `integrity raised without evidence for: ${text.slice(0, 40)}`);
      assert.ok(v.text_integrity.applied, "a raised status must name the finding that raised it");
      assert.ok(v.text_integrity.reason.length > 40, "a raised status must carry a plain-English reason");
    }
  }
});

test("every path carries its own limitation and never claims authorship", () => {
  for (const text of [CLEAN + cp(0x200b), CLEAN.replace("council", "couсil"), CLEAN + cp(0xe0041) + cp(0xe0042)]) {
    const v = verdict(text);
    assert.ok(v.limitations.length >= 5, "a raised verdict must add its own limitation text");
    assert.ok(v.limitations.some((l) => /Authorship cannot be proved/.test(l)));
    assert.ok(v.limitations.some((l) => /Absence of carrier characters is not evidence/.test(l)));
    assert.ok(v.limitations.some((l) => /never combined into a single verdict/.test(l)));
    for (const line of v.limitations) assert.doesNotMatch(line, /prove[sd]? (?:that )?(?:this|the) text was written/i);
  }
  const detected = verdict(CLEAN, { outcome: "detected" });
  assert.ok(detected.limitations.some((l) => /identifies the generator/.test(l)));
});

// ─── Axis B: deliberate invisible carriers ───────────────────────────

test("carrier_deliberate: a single zero-width space puts clean prose on attention", () => {
  const v = verdict(CLEAN.replace("Tuesday", "Tues​day"));
  assert.equal(v.text_integrity.status, "attention");
  assert.equal(v.text_integrity.applied, "carrier_deliberate");
  assert.match(v.text_integrity.reason, /This text contains an invisible character/);
  assert.equal(v.text_integrity.character_evidence.deliberate.length, 1);
  assert.equal(v.editorial.suggestion_level, "none", "the editorial axis is untouched by a character finding");
  assert.ok(v.inputs_considered.includes("invisible_unicode"));
});

test("carrier_deliberate fires for each deliberate class on its own", () => {
  for (const point of [0x200b, 0x2060, 0x206a, 0xfe01, 0xe0001, 0xe0100]) {
    const v = verdict(`${CLEAN}${cp(point)} tail`);
    assert.ok(INTEGRITY_RANK[v.text_integrity.status] >= 1, `U+${point.toString(16)} did not raise the integrity status`);
    assert.ok(v.text_integrity.character_evidence.deliberate.length >= 1);
    assert.equal(v.ai_probability.reading, "not_assessed");
  }
});

test("carrier_payload: adjacent carriers are an encoded payload, not a stray character", () => {
  const v = verdict(`${CLEAN}${cp(0x200b)}${cp(0x200b)}${cp(0x2060)}`);
  assert.equal(v.text_integrity.status, "manipulated");
  assert.equal(v.text_integrity.applied, "carrier_payload");
  assert.equal(v.text_integrity.character_evidence.longest_carrier_run, 3);
  assert.match(v.text_integrity.reason, /shows the text was written into, not who composed it/);
});

test("carrier_payload: a tag run outside a flag sequence reaches manipulated", () => {
  const v = verdict(`${CLEAN}${cp(0xe0048)}${cp(0xe0049)}`);
  assert.equal(v.text_integrity.status, "manipulated");
  assert.equal(v.text_integrity.applied, "carrier_payload");
});

// ─── Axis B: homoglyphs and private-use ──────────────────────────────

test("homoglyph_substitution: a Cyrillic lookalike inside a Latin word raises the integrity status", () => {
  const v = verdict(CLEAN.replace("council", "couсil"));
  assert.equal(v.text_integrity.status, "attention");
  assert.equal(v.text_integrity.applied, "homoglyph_substitution");
  assert.equal(v.text_integrity.character_evidence.interior_homoglyph_count, 1);
  assert.ok(v.inputs_considered.includes("homoglyphs"));
});

test("private_use_cluster: one private-use character only corroborates, two are a private encoding", () => {
  const one = verdict(`${CLEAN} logo ${cp(0xf8ff)} here.`);
  assert.equal(one.text_integrity.character_evidence.supporting.length, 1);
  assert.equal(one.text_integrity.character_evidence.deliberate.length, 0);
  assert.ok(!one.text_integrity.findings.some((x) => x.applied === "private_use_cluster"));
  assert.equal(one.text_integrity.status, "clean");

  const two = verdict(`${CLEAN} logo ${cp(0xf8ff)} and ${cp(0xf8fe)} here.`);
  assert.equal(two.text_integrity.character_evidence.supporting.length, 2);
  const cluster = two.text_integrity.findings.find((x) => x.applied === "private_use_cluster");
  assert.ok(cluster, "two private-use characters must contribute the cluster finding");
  assert.equal(cluster.status, "attention");
  assert.equal(two.text_integrity.status, "attention");
});

// ─── Axis B: the watermark scan ──────────────────────────────────────

test("an unavailable or negative watermark scan is never treated as evidence", () => {
  for (const outcome of ["not_available", "not_supported", "not_detected"]) {
    const v = verdict(CLEAN, { outcome });
    assert.equal(v.text_integrity.status, "clean");
    assert.equal(v.text_integrity.watermark.counted_as_evidence, false);
    assert.ok(!v.inputs_considered.includes("watermark"));
  }
});

// ─── Negative paths: legitimate typography and multilingual text ─────

test("NEGATIVE: typographic spaces never raise anything", () => {
  // Non-breaking, narrow no-break, thin, em, hair, figure and ideographic spaces
  // in the shape French and general typesetting practice produces them.
  // Built from explicit escapes so the fixture cannot be silently normalised
  // away by an editor: NBSP, NNBSP, THIN, EM, HAIR, FIGURE and IDEOGRAPHIC SPACE.
  const NBSP = cp(0x00a0), NNBSP = cp(0x202f), THIN = cp(0x2009), EM = cp(0x2003);
  const HAIR = cp(0x200a), FIGURE = cp(0x2007), IDEO = cp(0x3000);
  const typeset =
    `${CLEAN} Le total${NNBSP}: 47${NBSP}%, soit 1${THIN}200 euros.` +
    `${EM}Column one and${HAIR}column two, 12${FIGURE}345 and ${IDEO}ideographic lead-in.`;
  const v = verdict(typeset);
  assert.ok(inspectUnicode(typeset).length >= 6, "the typographic spaces must still be reported");
  assert.equal(v.text_integrity.status, "clean");
  assert.equal(v.text_integrity.applied, null);
  assert.equal(v.text_integrity.character_evidence.deliberate.length, 0);
  assert.ok(v.text_integrity.character_evidence.excluded.length >= 6);
});

test("NEGATIVE: bidirectional controls and script format marks never raise anything", () => {
  const rtl = `${CLEAN} ‏العربية‎ and ⁦mixed⁩ direction, ؜more Arabic.`;
  const v = verdict(rtl);
  assert.ok(inspectUnicode(rtl).length >= 4);
  assert.equal(v.text_integrity.status, "clean");
  assert.equal(v.text_integrity.character_evidence.deliberate.length, 0);
});

test("NEGATIVE: emoji joiners, variation selectors and complex scripts never raise anything", () => {
  const multilingual = `${CLEAN} 👩‍💻 and 👨‍👩‍👧 with ❤️ plus می‌رود and क्‍ष in context.`;
  const v = verdict(multilingual);
  assert.equal(v.text_integrity.status, "clean");
  assert.equal(v.text_integrity.character_evidence.deliberate.length, 0);
});

test("NEGATIVE: a subdivision flag emoji tag run is exempt", () => {
  const flag = `${CLEAN} The match is in 🏴󠁧󠁢󠁳󠁣󠁴󠁿 this weekend.`;
  const v = verdict(flag);
  assert.ok(inspectUnicode(flag).some((f) => /TAG/.test(f.name)), "flag tag characters are still reported");
  assert.equal(v.text_integrity.status, "clean");
  assert.equal(v.text_integrity.character_evidence.deliberate.length, 0);
  assert.ok(v.text_integrity.character_evidence.excluded.length >= 6);
});

test("NEGATIVE: edge homoglyphs in scientific and multilingual text never raise anything", () => {
  // The shape genuinely multilingual text produces: the non-Latin letter sits at
  // a token boundary, not substituted inside a Latin word. Measured on the
  // held-out human corpus, where a chemistry paper uses exactly this form.
  const science = `${CLEAN} The route features α-hydroxylation of enolates and β-elimination, then Δ-9 reduction.`;
  const v = verdict(science);
  assert.ok(inspectUnicode(science).some((f) => f.id.includes("_homoglyph_")), "the homoglyph must still be reported");
  assert.equal(v.text_integrity.character_evidence.interior_homoglyph_count, 0);
  assert.equal(v.text_integrity.status, "clean");
});

test("NEGATIVE: soft hyphens and a byte-order mark from a word-processor export never raise anything", () => {
  const exported = `﻿${CLEAN.replace("consultation", "con­sul­tation")}`;
  const v = verdict(exported);
  assert.ok(inspectUnicode(exported).length >= 3);
  assert.equal(v.text_integrity.status, "clean");
  assert.ok(v.text_integrity.character_evidence.supporting.length >= 3);
});

test("NEGATIVE: no human sample in the battery corpus produces deliberate evidence or an integrity finding", async () => {
  const raw = JSON.parse(await readFile(new URL("../../battery/human-corpus-v1.json", import.meta.url), "utf8"));
  const samples = Array.isArray(raw) ? raw : raw.samples;
  assert.ok(samples.length >= 40, `expected the 40-sample human corpus, got ${samples.length}`);
  for (const sample of samples) {
    const v = verdict(sample.text);
    assert.equal(v.text_integrity.character_evidence.deliberate.length, 0, `${sample.id} produced deliberate evidence`);
    assert.equal(v.text_integrity.status, "clean", `${sample.id} was raised above clean`);
    assert.equal(v.ai_probability.reading, "not_assessed", `${sample.id} produced an AI reading`);
  }
});

// ─── Envelope and backwards compatibility ────────────────────────────

const request = (content) => ({
  schema_version: "1.0",
  contract_version: "1.0.0",
  request_id: "req_combined0001",
  created_at: "2026-08-28T12:00:00Z",
  source: { content, content_type: "plain_text", language: "en-GB" },
  checks: ["unicode.invisible", "unicode.homoglyph", "style.patterns", "watermark.anthropic"],
  privacy: { allowed_routes: ["browser"], save_receipt: false, retain_content: false },
});

test("inspect() publishes the three axes additively without changing the existing envelope", async () => {
  const result = await inspect(request(CLEAN));
  for (const key of ["schema_version", "contract_version", "request_id", "analysis_id", "source", "protected_spans", "pattern_findings", "methods", "summary", "limitations", "started_at", "completed_at"]) {
    assert.ok(key in result, `existing envelope key ${key} disappeared`);
  }
  assert.ok(result.combined_verdict, "combined_verdict must be published");
  assert.equal(result.combined_verdict.ai_probability.reading, "not_assessed",
    "the deterministic core runs no model, so it must publish no AI reading");
  assert.equal(result.combined_verdict.text_integrity.status, "clean");
  assert.equal(result.combined_verdict.editorial.suggestion_level, "none");
  assert.equal(result.combined_verdict.version.startsWith("combined:"), true);
  assert.ok(Object.isFrozen(result.combined_verdict));
  assert.ok(!("classification" in result.combined_verdict),
    "the collapsed single classification must not come back");
});

test("inspect() reports a carrier the writing rules alone would miss, without calling it AI", async () => {
  const result = await inspect(request(CLEAN.replace("Tuesday", "Tues​day")));
  const style = result.methods.find((m) => m.id === "style.patterns");
  const signals = style.evidence.find((e) => e.type === "editorial_signals");
  assert.equal(signals.classification, "human_like", "the writing-rules row is unchanged");
  assert.equal(result.combined_verdict.text_integrity.status, "attention");
  assert.equal(result.combined_verdict.text_integrity.applied, "carrier_deliberate");
  assert.equal(result.combined_verdict.ai_probability.reading, "not_assessed");
  assert.ok(result.limitations.some((l) => /Absence of carrier characters/.test(l)));
});

test("protected spans are never evidence: they are excluded from every axis", async () => {
  const withFacts =
    CLEAN + " See the 2024 report at example.invalid/report and call 0121 ниже 555 0000 on 14 March 2024. [7]";
  const result = await inspect(request(withFacts));
  assert.ok(result.protected_spans.length >= 1, "the fixture must actually contain protected spans");
  assert.equal(result.combined_verdict.text_integrity.status, "clean");
  assert.equal(result.combined_verdict.text_integrity.applied, null);
  assert.ok(result.combined_verdict.limitations.some((l) => /Protected spans are excluded/.test(l)));
  assert.ok(!("protected_spans" in result.combined_verdict));
});

test("computeCombinedVerdict works without writing signals and says so", () => {
  const v = computeCombinedVerdict({ unicodeFindings: inspectUnicode(`x${cp(0x200b)}y`), text: `x${cp(0x200b)}y` });
  assert.equal(v.text_integrity.status, "attention");
  assert.ok(!v.inputs_considered.includes("writing_signals"));
  assert.equal(v.editorial.suggestion_level, "none");
  assert.equal(v.editorial.rule_probabilities, null);
  assert.match(v.editorial.reason, /were not requested/);
});

test("computeEditorialSignals is unchanged: same shape, same verdict, no new inputs", () => {
  const before = computeEditorialSignals(CLEAN);
  assert.equal(before.classification, "human_like");
  assert.equal(computeEditorialSignals(`${CLEAN}​`).classification, "human_like",
    "the writing-rules score must stay a pure text measure; the axes are assembled in the verdict layer");
  assert.deepEqual(Object.keys(before).sort(), [
    "categoriesHit", "classification", "confidence", "description", "escalation",
    "findingCount", "probabilities", "score", "status", "version", "wordCount",
  ]);
});
