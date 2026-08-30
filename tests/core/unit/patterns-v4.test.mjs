// en-signals 2026.08.5 measured-stylometrics + owner-rhythm tests.
//
// Covers the rules added from research/CLEAN-PROSE-DETECTION-PLAN.md Tier 1
// (window-corrected sentence-length spectral flatness, conditional
// compression against the shipped human reference corpus, lexical register
// distance) and research/OWNER-RHYTHM-NOTES.md (punchline-fragment density,
// mic-drop paragraph, contrast density, rhetorical/procedural ratio).
//
// Contract under test: every rule fires on a crafted positive and stays
// silent on every human guard (fixture E, the SEO-template page, the
// non-native control, professional marketing copy with legitimate
// punchlines); all findings are tier-B corroboration at low severity; the
// stylometric cap holds; the finding-breadth escalation counts the whole
// pack as ONE combined contribution; determinism and the perf budget hold.
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import {
  inspectSignalsV2, computeEditorialSignals, EN_SIGNALS_PATTERN_VERSION,
} from "../../../packages/core/dist/patterns/en-signals-v2.js";
import { V4_RHYTHM_CATEGORIES, V4_THRESHOLDS } from "../../../packages/core/dist/patterns/en-signals-v4-data.js";
import { REFERENCE_CORPUS } from "../../../packages/core/dist/patterns/en-signals-v4-corpus.js";
import { assertNoAuthorshipClaim } from "./claim-boundary.mjs";
import { computeV4Metrics } from "../../../packages/core/dist/patterns/en-signals-v4.js";
import {
  AI_CADENCE_FIXTURE, CHAT_EXPORT_COMPRESSION_FIXTURE, FORMAL_REGISTER_FIXTURE,
  MARKETING_COPY_HUMAN, NON_NATIVE_CONTROL, RATIO_ABSTRACT_FIXTURE,
  RHYTHM_ONLY_STACK, SEO_TEMPLATE_PAGE, SPECTRAL_CADENCE_FIXTURE,
} from "../../battery/rhythm-fixtures.mjs";

// Human control (fixture E) — byte-identical to the v0.1-REVIEW control.
const HUMAN_CONTROL =
  "We moved the printer to the back office on Tuesday because the hallway socket kept tripping. " +
  "Dave from accounts complained, obviously. The replacement toner arrives Thursday; until then use the one upstairs. " +
  "If the tray jams again, ring Sharon on extension 42 rather than forcing it.";

const V4_RULE_IDS = [...V4_RHYTHM_CATEGORIES].map((c) => "signals." + c.replace(/-/g, "_"));

// Crafted positive per rule. AI_CADENCE_FIXTURE carries the three
// owner-rhythm cadences at once (including the OWNER-RHYTHM-NOTES canonical
// mic-drop paragraph shape); the others isolate one measurement each.
const POSITIVE_FIXTURES = {
  "signals.sentence_length_spectral_flatness": SPECTRAL_CADENCE_FIXTURE,
  "signals.conditional_compression": CHAT_EXPORT_COMPRESSION_FIXTURE,
  "signals.lexical_register_distance": FORMAL_REGISTER_FIXTURE,
  "signals.punchline_fragment_density": AI_CADENCE_FIXTURE,
  "signals.mic_drop_paragraph": AI_CADENCE_FIXTURE,
  "signals.contrast_density": AI_CADENCE_FIXTURE,
  "signals.rhetorical_procedural_ratio": RATIO_ABSTRACT_FIXTURE,
};

const HUMAN_GUARDS = {
  "fixture E (verified-human control)": HUMAN_CONTROL,
  "SEO-template page": SEO_TEMPLATE_PAGE,
  "non-native control": NON_NATIVE_CONTROL,
  "professional marketing copy with legitimate punchlines": MARKETING_COPY_HUMAN,
};

const ALL_FIXTURES = [...new Set(Object.values(POSITIVE_FIXTURES)), ...Object.values(HUMAN_GUARDS), RHYTHM_ONLY_STACK];

test("every 2026.08.5 rule fires on its crafted positive fixture", () => {
  for (const [rule, text] of Object.entries(POSITIVE_FIXTURES)) {
    const ids = new Set(inspectSignalsV2(text).map((f) => f.rule_id));
    assert.ok(ids.has(rule), `${rule} did not fire on its fixture; got: ${[...ids].join(", ") || "(none)"}`);
  }
});

test("every 2026.08.5 rule stays silent on every human guard", () => {
  for (const [name, text] of Object.entries(HUMAN_GUARDS)) {
    const ids = new Set(inspectSignalsV2(text).map((f) => f.rule_id));
    for (const rule of V4_RULE_IDS) {
      assert.ok(!ids.has(rule), `${rule} false-positives on ${name}`);
    }
  }
});

test("human guards keep their classification and never escalate", () => {
  for (const [name, text] of Object.entries(HUMAN_GUARDS)) {
    const r = computeEditorialSignals(text);
    assert.equal(r.status, "scored", name);
    assert.notEqual(r.classification, "ai_like", `${name} must never read ai_like (score ${r.score})`);
    assert.equal(r.escalation.applied, null, `${name} triggered escalation ${r.escalation.applied}`);
    const high = inspectSignalsV2(text).filter((f) => f.severity === "high");
    assert.equal(high.length, 0, `${name} produced high findings: ${high.map((f) => f.rule_id).join(", ")}`);
  }
});

test("2026.08.5 findings are tier-B: low severity, corroboration metadata, evergreen era, claim boundary", () => {
  for (const text of ALL_FIXTURES) {
    for (const f of inspectSignalsV2(text)) {
      if (!V4_RULE_IDS.includes(f.rule_id)) continue;
      assert.ok(f.severity === "low" || f.severity === "note", `${f.rule_id} must stay low severity, got ${f.severity}`);
      assert.equal(f.evidence.corroboration, true, `${f.rule_id} must carry corroboration: true`);
      assert.equal(f.evidence.era, "evergreen", `${f.rule_id} era must be evergreen`);
      // Claim boundary, enforced negatively since 30 August 2026 — see
      // claim-boundary.mjs. The per-message caveat tail moved to the panel.
      assertNoAuthorshipClaim(assert, f.message, f.rule_id);
      assert.equal(f.rule_version, EN_SIGNALS_PATTERN_VERSION);
    }
  }
  // The register rule carries its genre caveat in the user-facing message.
  const reg = inspectSignalsV2(FORMAL_REGISTER_FIXTURE).find((f) => f.rule_id === "signals.lexical_register_distance");
  assert.ok(reg, "register fixture must fire");
  // The caveat is what matters, not the word "genre": the reference sample is
  // general writing, so specialised writing measures as distant quite fairly and
  // the message has to say so. Naming the kinds of writing it exempts is a
  // stricter check than the label, and it is what a reader can actually use.
  assert.match(reg.message, /academic|legal|technical/i,
    "the register message must name the kinds of writing that measure as distant without any AI involved");
});

test("each rule pushes at most one finding per document (density summaries, never per-instance flags)", () => {
  for (const text of ALL_FIXTURES) {
    const counts = new Map();
    for (const f of inspectSignalsV2(text)) {
      if (!V4_RULE_IDS.includes(f.rule_id)) continue;
      counts.set(f.rule_id, (counts.get(f.rule_id) ?? 0) + 1);
    }
    for (const [rule, n] of counts) assert.equal(n, 1, `${rule} pushed ${n} findings on one document`);
  }
});

test("single-instance guardrail: one mic-drop paragraph or one contrast never fires", () => {
  // One well-built mic-drop paragraph (legitimate human rhetoric) — below
  // the >=2 paragraph density gate.
  const oneMicDrop =
    "The committee spent four months reviewing every supplier contract the department had signed since the merger, and the file grew thicker each week. " +
    "Each review meeting surfaced another exception that someone had approved in a hurry and nobody had recorded in the register at the time. " +
    "The final report ran to ninety pages and recommended changes that will take most of next year to implement across the divisions. " +
    "It was never about the paperwork.";
  const m = computeV4Metrics(oneMicDrop);
  assert.equal(m.micDropParagraphs, 1, "fixture must contain exactly one mic-drop paragraph");
  const ids = new Set(inspectSignalsV2(oneMicDrop).map((f) => f.rule_id));
  assert.ok(!ids.has("signals.mic_drop_paragraph"), "a single mic-drop paragraph must not fire");
  assert.ok(!ids.has("signals.contrast_density"), "a single contrast must not fire the density rule");
});

test("stylometric cap: the 2026.08.5 pack alone cannot push a document to ai_like", () => {
  // RHYTHM_ONLY_STACK fires many rhythm rules at once with almost no other
  // evidence; the capped score must stay short of an ai_like verdict.
  const r = computeEditorialSignals(RHYTHM_ONLY_STACK);
  assert.equal(r.status, "scored");
  const v4Fired = r.categoriesHit.filter((c) => V4_RHYTHM_CATEGORIES.has(c));
  assert.ok(v4Fired.length >= 3, `stack fixture must fire 3+ rhythm rules, got: ${v4Fired.join(", ")}`);
  assert.notEqual(r.classification, "ai_like",
    `rhythm rules alone must not reach ai_like: score ${r.score}, categories ${r.categoriesHit.join(",")}`);
});

test("finding-breadth escalation counts the whole 2026.08.5 pack as ONE contribution", () => {
  // The stack fires 4+ rhythm categories; with the pack collapsed to one
  // combined contribution the non-rhythm evidence stays below the 8-finding
  // / 5-category breadth gate, so no escalation may fire.
  const r = computeEditorialSignals(RHYTHM_ONLY_STACK);
  const v4Fired = r.categoriesHit.filter((c) => V4_RHYTHM_CATEGORIES.has(c));
  const otherCats = r.categoriesHit.filter((c) => !V4_RHYTHM_CATEGORIES.has(c));
  assert.ok(v4Fired.length >= 4, `stack must fire 4+ rhythm categories, got ${v4Fired.length} (${v4Fired.join(", ")})`);
  assert.ok(otherCats.length + 1 < 5, `guard fixture drifted: non-rhythm categories ${otherCats.join(", ")} defeat the breadth check`);
  assert.equal(r.escalation.applied, null,
    `rhythm rules alone escalated (${r.escalation.applied}) — the pack must count as one combined contribution`);
});

test("reference corpus ships with usable size and pre-1929 provenance documented", () => {
  assert.ok(REFERENCE_CORPUS.length >= 40000 && REFERENCE_CORPUS.length <= 80000,
    `reference corpus size ${REFERENCE_CORPUS.length} outside the ~50KB design window`);
  // The corpus must be plain prose paragraphs, not markup.
  assert.ok(!/[<>{}]/.test(REFERENCE_CORPUS.slice(0, 5000)), "corpus must be plain text");
  assert.ok(REFERENCE_CORPUS.split("\n\n").length >= 50, "corpus must keep paragraph structure");
});

test("thresholds are wired from V4_THRESHOLDS (calibration script and engine agree)", () => {
  // The calibration harness prints V4_THRESHOLDS; these floors are the
  // never-single-instance guardrails and must not silently drift.
  assert.ok(V4_THRESHOLDS.micDropMinParagraphs >= 2, "mic-drop must never fire on one paragraph");
  assert.ok(V4_THRESHOLDS.contrastMinCount >= 3, "contrast density must never fire on a couple of uses");
  assert.ok(V4_THRESHOLDS.punchlineMinCount >= 3, "punchline density must never fire on a couple of fragments");
  assert.ok(V4_THRESHOLDS.spectralMinWindows >= 2, "spectral flatness needs 2+ fixed windows (length-artefact correction)");
});

test("version bumped to en-signals:2026.08.6", () => {
  // The rhythm pack shipped as 2026.08.5; the provider-eval calibration and the
  // surrogate-safe span fix carried the pack to 2026.08.6.
  assert.equal(EN_SIGNALS_PATTERN_VERSION, "en-signals:2026.08.6");
});

test("analysis is deterministic across the 2026.08.5 fixture set", () => {
  for (const text of ALL_FIXTURES) {
    assert.deepEqual(inspectSignalsV2(text), inspectSignalsV2(text));
    assert.deepEqual(computeEditorialSignals(text), computeEditorialSignals(text));
    assert.deepEqual(computeV4Metrics(text), computeV4Metrics(text));
  }
});

test("regression — fixture D still scores 63+ and classifies ai_like under the 2026.08.5 pack", () => {
  const FIXTURE_D =
    "Great question! Let's unpack what makes this framework so powerful. " +
    "This isn't just an update — it's a fundamental rethink of how teams operate. " +
    "The platform boasts robust integrations, seamless onboarding, and enhanced security. " +
    "Whether you're a startup founder, an enterprise architect, or a curious developer, there's something here for you. " +
    "The results stand as a testament to the team's dedication. " +
    "As of my last update, pricing details may have changed. " +
    "In the ever-changing world of software, staying ahead isn't optional — it's essential.";
  const r = computeEditorialSignals(FIXTURE_D);
  assert.equal(r.classification, "ai_like");
  assert.ok(r.score >= 63, `fixture D regressed: score ${r.score} (baseline 63)`);
});

test("performance — 50,000-character document completes under 450ms with the 2026.08.5 pack", () => {
  // Documented budget for the 2026.08.5 merge: 450ms per 50k characters
  // (up from the 2026.08.3 pack's 400ms; the conditional-compression rule
  // only runs inside its 250-900-word band, so the long-document path adds
  // just the spectral/rhythm passes). Measured runs sit far below.
  const seed = [
    "The migration finished on Thursday after the second dry run. Rollback stayed available throughout, and nobody needed it.",
    "In today's rapidly evolving landscape, teams must leverage robust, seamless tooling to deliver comprehensive results. Moreover, industry leaders agree that innovation is pivotal.",
    "Sharon checked the invoices twice. Two were wrong. She rang the supplier before lunch and had both corrected by four.",
    "Let's explore what makes this framework a game-changer. Whether you're a founder or an architect, the possibilities are endless — truly a testament to the team.",
    "Meanwhile the office kettle broke again, which mattered more to most of us than the quarterly numbers did, if we are honest about it.",
  ].join("\n\n");
  let doc = "";
  while (doc.length < 50000) doc += seed + "\n\n";
  doc = doc.slice(0, 50000);
  inspectSignalsV2(doc.slice(0, 5000)); // warm-up (JIT + regex compilation)
  const started = performance.now();
  const findings = inspectSignalsV2(doc);
  const scored = computeEditorialSignals(doc);
  const elapsed = performance.now() - started;
  assert.ok(findings.length > 0);
  assert.equal(scored.status, "scored");
  assert.ok(elapsed < 450, `50k-character analysis took ${elapsed.toFixed(1)}ms (budget 450ms)`);

  // The compression band's worst case: a ~900-word document runs the full
  // conditional-compression estimator against the 50KB corpus prior and must
  // stay inside the same budget on its own.
  let inBand = "";
  while ((inBand.match(/\S+/g) ?? []).length < 890) inBand += seed + "\n\n";
  const started2 = performance.now();
  const scored2 = computeEditorialSignals(inBand);
  const elapsed2 = performance.now() - started2;
  assert.equal(scored2.status, "scored");
  assert.ok(elapsed2 < 450, `in-band compression analysis took ${elapsed2.toFixed(1)}ms (budget 450ms)`);
  console.log(`METRIC patterns_v4_50k_ms=${elapsed.toFixed(1)} findings=${findings.length} score=${scored.score} in_band_ms=${elapsed2.toFixed(1)}`);
});
