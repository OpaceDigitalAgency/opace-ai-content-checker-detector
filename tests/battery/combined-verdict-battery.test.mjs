// Combined-verdict battery (2026.08.8). Additive to the existing batteries.
//
// Every carrier the engine claims is enumerated from the core's own data tables
// and pushed through the verdict layer, so that the evidence tiering is a
// property of the whole table rather than of the handful of code points a unit
// test happens to name. Three contracts are enforced here:
//
//   1. Every carrier with a documented legitimate use — every rule that carries
//      a `limitation` about typography, multilingual text or encoding — is
//      graded supporting or excluded and CANNOT raise the text-integrity status
//      on its own.
//   2. Zero human false positives. No sample in the 40-text human corpus, and
//      no human fixture in this repository, may produce deliberate-tier
//      evidence or any integrity finding.
//   3. Axis independence. Character forensics land on the text-integrity axis
//      and NEVER produce an AI reading, whatever the carrier and however many
//      of them there are. A hidden character proves text manipulation, not AI
//      origin; only the trained model gives an authorship reading, and no model
//      runs in this deterministic core.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const core = await import(new URL("../../packages/core/dist/index.js", import.meta.url).pathname);
const { CARRIER_RULES, CARRIER_RANGE_RULES, CONFUSABLES } =
  await import(new URL("../../packages/core/dist/unicode/data.js", import.meta.url).pathname);
const { FIXTURE_E } = await import(new URL("./fixtures.mjs", import.meta.url));
const rf = await import(new URL("./rhythm-fixtures.mjs", import.meta.url));

const { computeCombinedVerdict, computeEditorialSignals, inspectUnicode } = core;
const RANK = { clean: 0, attention: 1, manipulated: 2 };

const verdict = (text) =>
  computeCombinedVerdict({ signals: computeEditorialSignals(text), unicodeFindings: inspectUnicode(text), text });

/** Character evidence for a single code point embedded in ordinary prose. */
const tierOf = (codePoint) => {
  const text = `plain text${String.fromCodePoint(codePoint)}here in an ordinary English sentence.`;
  const v = computeCombinedVerdict({ unicodeFindings: inspectUnicode(text), text });
  const label = `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
  const evidence = v.text_integrity.character_evidence;
  const found = [...evidence.deliberate, ...evidence.supporting, ...evidence.excluded]
    .find((x) => x.code_point === label);
  return { tier: found?.tier, verdict: v };
};

const representatives = [];
for (const rule of [...CARRIER_RULES, ...CARRIER_RANGE_RULES]) {
  const points = rule.to !== undefined && rule.to !== rule.from ? [rule.from, rule.to] : [rule.from];
  for (const cp of points) representatives.push({ cp, rule });
}

test("every carrier in the table is assigned exactly one evidence tier", () => {
  assert.ok(representatives.length >= 40, `expected the full carrier table, got ${representatives.length}`);
  for (const { cp } of representatives) {
    const { tier } = tierOf(cp);
    assert.ok(["deliberate", "supporting", "excluded"].includes(tier),
      `U+${cp.toString(16).toUpperCase()} was reported but never tiered (got ${tier})`);
  }
});

test("a carrier graded supporting or excluded can never raise the integrity status on its own", () => {
  for (const { cp } of representatives) {
    const { tier, verdict: v } = tierOf(cp);
    if (tier === "deliberate") continue;
    assert.equal(v.text_integrity.status, "clean",
      `U+${cp.toString(16).toUpperCase()} is tier ${tier} but raised the status to ${v.text_integrity.status}`);
    assert.equal(v.text_integrity.applied, null);
  }
});

test("a deliberate carrier raises the integrity status on its own and names the finding", () => {
  const deliberate = representatives.filter(({ cp }) => tierOf(cp).tier === "deliberate");
  assert.ok(deliberate.length >= 6, `expected a real deliberate class, got ${deliberate.length}`);
  for (const { cp } of deliberate) {
    const { verdict: v } = tierOf(cp);
    assert.ok(RANK[v.text_integrity.status] >= RANK.attention, `U+${cp.toString(16).toUpperCase()} did not raise`);
    assert.ok(v.text_integrity.applied, "a raised status must name the finding that raised it");
    assert.ok(v.text_integrity.reason.length > 40);
  }
});

test("AXIS INDEPENDENCE: no carrier in the whole table ever produces an AI reading", () => {
  for (const { cp } of representatives) {
    const { verdict: v } = tierOf(cp);
    assert.equal(v.ai_probability.reading, "not_assessed",
      `U+${cp.toString(16).toUpperCase()} produced an AI reading from character evidence alone`);
    assert.equal(v.ai_probability.value, null);
    assert.equal(v.ai_probability.source, null);
  }
});

test("every confusable is reported, and at a token boundary none of them raise the integrity status", () => {
  for (const [cp, entry] of CONFUSABLES) {
    // Token-boundary form: the shape genuinely multilingual and scientific text
    // produces, as in alpha-hydroxylation.
    const text = `The route features ${String.fromCodePoint(cp)}-substitution of Latin text in this sentence.`;
    const v = computeCombinedVerdict({ unicodeFindings: inspectUnicode(text), text });
    assert.equal(v.text_integrity.character_evidence.interior_homoglyph_count, 0,
      `${entry.name} at a token boundary was graded as an interior substitution`);
    assert.equal(v.text_integrity.status, "clean");
  }
});

test("every confusable substituted inside a Latin word does raise the integrity status, and only that", () => {
  for (const [cp, entry] of CONFUSABLES) {
    const text = `The committee reviewed the pro${String.fromCodePoint(cp)}posal at length this morning.`;
    const v = computeCombinedVerdict({ unicodeFindings: inspectUnicode(text), text });
    assert.equal(v.text_integrity.character_evidence.interior_homoglyph_count, 1, `${entry.name} was not graded as interior`);
    assert.equal(v.text_integrity.applied, "homoglyph_substitution");
    assert.equal(v.text_integrity.status, "attention");
    assert.equal(v.ai_probability.reading, "not_assessed",
      `${entry.name} produced an AI reading; a homoglyph is a manipulation finding, not an authorship one`);
  }
});

test("ZERO HUMAN FALSE POSITIVES: the 40-text human corpus produces no integrity finding", async () => {
  const raw = JSON.parse(await readFile(new URL("./human-corpus-v1.json", import.meta.url), "utf8"));
  const samples = Array.isArray(raw) ? raw : raw.samples;
  assert.ok(samples.length >= 40, `expected 40 human texts, got ${samples.length}`);
  const offenders = [];
  for (const sample of samples) {
    const v = verdict(sample.text);
    if (v.text_integrity.character_evidence.deliberate.length > 0 || v.text_integrity.findings.length > 0) {
      offenders.push(sample.id);
    }
    assert.equal(v.ai_probability.reading, "not_assessed", `${sample.id} produced an AI reading`);
  }
  assert.deepEqual(offenders, [], `human corpus produced integrity evidence: ${offenders.join(", ")}`);
});

test("ZERO HUMAN FALSE POSITIVES: the repository human fixtures produce no integrity finding", () => {
  const fixtures = {
    "fixture-E": FIXTURE_E,
    "seo-template": rf.SEO_TEMPLATE_PAGE,
    "non-native": rf.NON_NATIVE_CONTROL,
    "marketing-copy": rf.MARKETING_COPY_HUMAN,
  };
  for (const [id, text] of Object.entries(fixtures)) {
    const v = verdict(text);
    assert.equal(v.text_integrity.character_evidence.deliberate.length, 0, `${id} produced deliberate evidence`);
    assert.deepEqual(v.text_integrity.findings, [], `${id} produced an integrity finding`);
    assert.equal(v.ai_probability.reading, "not_assessed", `${id} produced an AI reading`);
  }
});

test("realistic typography and multilingual passages never produce an integrity finding", () => {
  const passages = [
    // French typographic spacing.
    "Le rapport est clair : 47 % des répondants — soit 1 200 personnes — ont choisi la première option. Il faut donc revoir le calendrier avant la fin du trimestre, puis publier les résultats.",
    // Arabic and Hebrew with the bidirectional controls a correct renderer needs.
    "The heading reads ‏مرحبا بالعالم‎ and the footnote reads ‏שלום עולם‎ in the printed edition, which the typesetter marked up by hand last spring.",
    // Persian ZWNJ and Devanagari conjunct control, both standard orthography.
    "The Persian phrase می‌رود and the Hindi form क्‍ष appear throughout the primary source, which the translator has kept unmodified for the appendix.",
    // Emoji ZWJ sequences, skin tones and presentation selectors.
    "The team channel is full of 👩‍💻 and 👨‍👩‍👧‍👦 and ❤️ and 👍🏽 reactions, which is how we know the release actually shipped on Friday afternoon.",
    // CJK with an ideographic space and a variation selector on a Han base.
    "The sign read 東京　都庁 and the older form 邊󠄀 appears in the 1932 register, which the archivist photographed before the building was demolished.",
    // Scientific notation with Greek letters at token boundaries.
    "Reactions include α-hydroxylation of enolates, β-elimination under mild base, and Δ-9 reduction, each of which the group has reported since 2019 in separate papers.",
  ];
  for (const text of passages) {
    const v = verdict(text);
    assert.equal(v.text_integrity.character_evidence.deliberate.length, 0, `deliberate evidence in: ${text.slice(0, 50)}`);
    assert.deepEqual(v.text_integrity.findings, [], `integrity finding fired on: ${text.slice(0, 50)}`);
  }
});
