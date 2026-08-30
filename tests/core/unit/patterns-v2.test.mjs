import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { inspectSignalsV2, computeEditorialSignals, EN_SIGNALS_PATTERN_VERSION } from "../../../packages/core/dist/patterns/en-signals-v2.js";
import { inspectPatterns } from "../../../packages/core/dist/patterns/en-gb-v1.js";
import { prefixedSha256 } from "../../../packages/core/dist/source/utf8.js";
import { CATEGORY_META } from "../../../packages/core/dist/patterns/en-signals-v2-data.js";
import { V3_CATEGORY_META } from "../../../packages/core/dist/patterns/en-signals-v3-data.js";
import { V4_CATEGORY_META } from "../../../packages/core/dist/patterns/en-signals-v4-data.js";
import { AUTHORSHIP_ASSERTIONS, assertNoAuthorshipClaim } from "./claim-boundary.mjs";

// Fixture D from v0.1-REVIEW.md §3 — current-generation AI slop that the v0.1
// five-phrase list scored as a clean pass.
const FIXTURE_D = "Great question! Let's unpack what makes this framework so powerful. This isn't just an update — it's a fundamental rethink of how teams operate. The platform boasts robust integrations, seamless onboarding, and enhanced security. Whether you're a startup founder, an enterprise architect, or a curious developer, there's something here for you. The results stand as a testament to the team's dedication. As of my last update, pricing details may have changed. In the ever-changing world of software, staying ahead isn't optional — it's essential.";

// Fixture C shape — classic 2023-era clichés.
const FIXTURE_C = "In today's rapidly evolving landscape, businesses must delve into new strategies. It is important to note that change is constant. Moreover, leaders should embrace innovation. In conclusion, the game-changer is adaptability. In conclusion, nothing else matters.";

// Fixture E — human control (mundane office memo).
const HUMAN_CONTROL = "We moved the printer to the back office on Tuesday because the hallway socket kept tripping. Dave from accounts complained, obviously. The replacement toner arrives Thursday; until then use the one upstairs. If the tray jams again, ring Sharon on extension 42 rather than forcing it.";

test("fixture D (modern AI slop) produces at least 5 findings and is not classified human_like", () => {
  const findings = inspectSignalsV2(FIXTURE_D);
  assert.ok(findings.length >= 5, `expected >=5 findings, got ${findings.length}: ${findings.map((f) => f.rule_id).join(", ")}`);
  const rules = new Set(findings.map((f) => f.rule_id));
  assert.ok(rules.has("signals.chatbot"), "Great question! should fire signals.chatbot");
  assert.ok(rules.has("signals.cutoff_disclaimer"), "As of my last update should fire signals.cutoff_disclaimer");
  assert.ok(rules.has("signals.formulaic_opener"), "In the ever-changing world of should fire signals.formulaic_opener");
  const result = computeEditorialSignals(FIXTURE_D);
  assert.equal(result.status, "scored");
  assert.notEqual(result.classification, "human_like");
  assert.ok(result.score > 15, `expected score above 15, got ${result.score}`);
  assert.ok(result.categoriesHit.length >= 4);
  // Claim boundary wording discipline (BRIEF.md §5).
  assert.match(result.description, /stylistic evidence/i);
  assert.match(result.description, /not proof/i);
  // Claim boundary, enforced negatively — see claim-boundary.mjs for why the
  // per-message "not evidence of authorship" tail was removed and what replaced it.
  for (const f of findings) assertNoAuthorshipClaim(assert, f.message, f.rule_id);
});

test("fixture C (classic cliches) still fires through the combined inspectPatterns entry point", () => {
  const combined = inspectPatterns(FIXTURE_C);
  assert.ok(combined.length >= 5, `expected >=5 combined findings, got ${combined.length}`);
  const rules = new Set(combined.map((f) => f.rule_id));
  assert.ok(rules.has("style.overused_phrase"), "v1 rules must keep working");
  assert.ok([...rules].some((r) => r.startsWith("signals.")), "v2 rules must contribute");
  const v2 = inspectSignalsV2(FIXTURE_C);
  const v2Rules = new Set(v2.map((f) => f.rule_id));
  assert.ok(v2Rules.has("signals.transition"), "moreover / in conclusion should fire signals.transition");
  assert.ok(v2Rules.has("signals.tier1"), "delve / embrace should fire signals.tier1");
  const result = computeEditorialSignals(FIXTURE_C);
  assert.ok(result.score > 0);
  assert.notEqual(result.classification, "human_like");
});

test("human control text produces zero high-severity findings and classifies human_like", () => {
  const findings = inspectSignalsV2(HUMAN_CONTROL);
  const high = findings.filter((f) => f.severity === "high");
  assert.equal(high.length, 0, `unexpected high-severity findings: ${high.map((f) => f.rule_id).join(", ")}`);
  const result = computeEditorialSignals(HUMAN_CONTROL);
  assert.equal(result.status, "scored");
  assert.equal(result.classification, "human_like");
  const combined = inspectPatterns(HUMAN_CONTROL);
  assert.equal(combined.filter((f) => f.severity === "high").length, 0);
});

test("analysis is deterministic — identical input yields identical output", () => {
  for (const fixture of [FIXTURE_C, FIXTURE_D, HUMAN_CONTROL]) {
    assert.deepEqual(inspectSignalsV2(fixture), inspectSignalsV2(fixture));
    assert.deepEqual(computeEditorialSignals(fixture), computeEditorialSignals(fixture));
    assert.deepEqual(inspectPatterns(fixture), inspectPatterns(fixture));
  }
});

test("span integrity — every span slice matches the reported match and its hash", () => {
  const samples = [
    FIXTURE_C,
    FIXTURE_D,
    HUMAN_CONTROL,
    // Homoglyph + zero-width sample: normalisation must not corrupt spans.
    "We dеlve into the tаpestry of ideas.​ Moreover, experts believe this is a robust and seamless paradigm.",
    "## Benefits And Strategic Considerations\n\nIn conclusion, only time will tell. #growth #ai #hustle #mindset #startup #winning",
  ];
  for (const text of samples) {
    for (const finding of inspectSignalsV2(text)) {
      const slice = text.slice(finding.span.start_utf16, finding.span.end_utf16);
      assert.equal(slice, finding.evidence.matched, `${finding.rule_id}: slice ${JSON.stringify(slice)} != matched ${JSON.stringify(finding.evidence.matched)}`);
      assert.equal(finding.matched_text_hash, prefixedSha256(slice), `${finding.rule_id}: hash mismatch`);
      assert.ok(finding.span.end_utf16 > finding.span.start_utf16);
      assert.equal(finding.rule_version, EN_SIGNALS_PATTERN_VERSION);
    }
  }
});

test("normalisation catches obfuscated tier1 vocabulary and flags bypass characters", () => {
  const text = "We dеlve into the tаpestry of ideas.​ Moreover, experts believe this is a robust and seamless paradigm.";
  const rules = new Set(inspectSignalsV2(text).map((f) => f.rule_id));
  assert.ok(rules.has("signals.tier1"), "homoglyph-obfuscated tier1 words should still be caught");
  assert.ok(rules.has("signals.normalization_flag"), "zero-width character should raise signals.normalization_flag");
});

test("empty and too-short inputs refuse to score without claiming signals", () => {
  assert.equal(inspectSignalsV2("").length, 0);
  const empty = computeEditorialSignals("");
  assert.equal(empty.status, "empty");
  assert.equal(empty.score, 0);
  const short = computeEditorialSignals("Robust seamless delve.");
  assert.equal(short.status, "too_short");
  assert.equal(short.score, 0);
  assert.match(short.description, /outside the scoring window/);
});

test("structural uniformity — five near-identical FAQ answers fire signals.uniform_sections", () => {
  const answer = "Open the account settings page, choose the billing tab, and follow the steps shown. The change takes effect immediately and you will receive a confirmation email shortly afterwards.";
  const faq = [
    "## How do I update my payment card?", answer,
    "## How do I change my billing address?", answer.replace("billing tab", "address tab"),
    "## How do I cancel my subscription?", answer.replace("billing tab", "plans tab"),
    "## How do I download an invoice?", answer.replace("billing tab", "invoices tab"),
    "## How do I add a team member?", answer.replace("billing tab", "team tab"),
  ].join("\n\n");
  const findings = inspectSignalsV2(faq);
  const uniform = findings.find((f) => f.rule_id === "signals.uniform_sections");
  assert.ok(uniform, `expected signals.uniform_sections, got: ${findings.map((f) => f.rule_id).join(", ")}`);
  assert.equal(uniform.evidence.section_count, 5);
  assert.ok(typeof uniform.evidence.cv === "number" && uniform.evidence.cv < 0.15);
  assert.match(uniform.message, /same length|uniform/i, "the message must describe what was measured");
  assertNoAuthorshipClaim(assert, uniform.message, uniform.rule_id);
});

test("structural uniformity — a run of same-length list items fires signals.uniform_list_items", () => {
  const text = "The rollout plan covers the following streams of work for next quarter.\n\n" +
    "- Migrate the customer database to the new cluster\n" +
    "- Update the billing service to the new gateway\n" +
    "- Rewrite the reporting layer for the new schema\n" +
    "- Extend the audit logging to the new services\n" +
    "- Refresh the onboarding emails for the new plans\n";
  const findings = inspectSignalsV2(text);
  const uniform = findings.find((f) => f.rule_id === "signals.uniform_list_items");
  assert.ok(uniform, `expected signals.uniform_list_items, got: ${findings.map((f) => f.rule_id).join(", ")}`);
  assert.equal(uniform.evidence.item_count, 5);
});

test("em-dash density — dash-every-sentence prose fires signals.em_dash_density; sparse human copy does not", () => {
  const heavy = "The launch went well — better than expected. The team shipped early — a rare thing here. Costs stayed flat — procurement helped. The client signed off — twice, in fact. Next quarter looks similar — perhaps busier.";
  const findings = inspectSignalsV2(heavy);
  const dash = findings.find((f) => f.rule_id === "signals.em_dash_density");
  assert.ok(dash, `expected signals.em_dash_density, got: ${findings.map((f) => f.rule_id).join(", ")}`);
  assert.equal(dash.severity, "medium");
  assert.equal(dash.evidence.em_dash_count, 5);
  assert.ok(typeof dash.evidence.rate_per_1000_words === "number" && dash.evidence.rate_per_1000_words > 6);
  const sparse = "The launch went well - better than we expected, frankly. Procurement kept costs flat and the client signed off on Tuesday without any changes. Next quarter looks a little busier for the support team.";
  assert.equal(inspectSignalsV2(sparse).filter((f) => f.rule_id === "signals.em_dash_density").length, 0);
});

test("contrast template — \"isn't just X — it's Y\" fires signals.not_just_contrast on fixture D", () => {
  const hits = inspectSignalsV2(FIXTURE_D).filter((f) => f.rule_id === "signals.not_just_contrast");
  assert.ok(hits.length >= 2, `expected both contrast constructions in fixture D, got ${hits.length}`);
});

test("structural uniformity rules stay silent on the human control text", () => {
  const rules = new Set(inspectSignalsV2(HUMAN_CONTROL).map((f) => f.rule_id));
  for (const rule of ["signals.uniform_sections", "signals.uniform_list_items", "signals.em_dash_density", "signals.sentence_flatline", "signals.not_just_contrast"]) {
    assert.ok(!rules.has(rule), `${rule} must not fire on the human control text`);
  }
});

test("invisible carriers never hard-override the classification (regression: incoherent ai_like at 68.6% human)", () => {
  const repro = "Watermark‌carriers‍ include narrow spaces, tag\u{E0041}\u{E0042}chars and CGJ͏joins in Opa​ce Ltd text written by Dr Sarah Chen.";
  const result = computeEditorialSignals(repro);
  assert.equal(result.classification, "human_like", "classification must follow argmax(probabilities), not the normalization flag");
  assert.ok(result.probabilities.human_like > result.probabilities.ai_like);
  assert.ok(result.probabilities.human_like > result.probabilities.mixed_signals);
  assert.equal(result.score, 9, "scoring logic must be unchanged by the classification fix");
  // The invisible characters must still be reported as a finding — they are
  // just no longer allowed to dictate the document verdict.
  const rules = new Set(inspectSignalsV2(repro).map((f) => f.rule_id));
  assert.ok(rules.has("signals.normalization_flag"));
});

test("invariant — classification always equals argmax(probabilities) with cautious tie-breaking", () => {
  const heavyDash = "The launch went well — better than expected. The team shipped early — a rare thing here. Costs stayed flat — procurement helped. The client signed off — twice, in fact. Next quarter looks similar — perhaps busier.";
  const homoglyph = "We dеlve into the tаpestry of ideas.​ Moreover, experts believe this is a robust and seamless paradigm.";
  const repro = "Watermark‌carriers‍ include narrow spaces, tag\u{E0041}\u{E0042}chars and CGJ͏joins in Opa​ce Ltd text written by Dr Sarah Chen.";
  const samples = [FIXTURE_C, FIXTURE_D, HUMAN_CONTROL, heavyDash, homoglyph, repro, FIXTURE_D + "\n\n" + FIXTURE_C, ""];
  for (const text of samples) {
    const r = computeEditorialSignals(text);
    const p = r.probabilities;
    const argmax = p.human_like >= p.mixed_signals && p.human_like >= p.ai_like
      ? "human_like"
      : p.mixed_signals >= p.ai_like ? "mixed_signals" : "ai_like";
    assert.equal(r.classification, argmax,
      `classification ${r.classification} contradicts probabilities ${JSON.stringify(p)} for: ${text.slice(0, 60)}`);
  }
});

test("performance — full analysis of a 50,000-character document completes under 300ms", () => {
  // Realistic mixed prose: paragraphs of varying length with a scattering of
  // pattern vocabulary, repeated until the buffer passes 50k characters.
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
  // Warm-up outside the measured window (JIT + regex compilation).
  inspectSignalsV2(doc.slice(0, 5000));
  const started = performance.now();
  const findings = inspectSignalsV2(doc);
  const scored = computeEditorialSignals(doc);
  const elapsed = performance.now() - started;
  assert.ok(findings.length > 0);
  assert.equal(scored.status, "scored");
  assert.ok(elapsed < 300, `50k-character analysis took ${elapsed.toFixed(1)}ms (budget 300ms)`);
  console.log(`METRIC patterns_v2_50k_ms=${elapsed.toFixed(1)} findings=${findings.length} score=${scored.score}`);
});

// ─── The claim-boundary control, tested in both directions ───────────
//
// Added 30 August 2026 with the plain-language rewrite. The presence check it
// replaced could not fail on a message that carried the caveat AND asserted
// authorship; this one can. A control nobody has seen fail is not known to
// work, so each pattern is fired on its own probe, and then the whole shipped
// message set is asserted clean.
test("claim boundary — every authorship pattern fires on its own probe", () => {
  for (const rule of AUTHORSHIP_ASSERTIONS) {
    assert.match(rule.probe, rule.pattern, `pattern ${rule.id} failed to match its own probe: ${rule.probe}`);
  }
});

test("claim boundary — no rule message or suggestion asserts authorship", () => {
  const metas = { ...CATEGORY_META, ...V3_CATEGORY_META, ...V4_CATEGORY_META };
  const ids = Object.keys(metas);
  assert.equal(ids.length, 113, `expected 113 rule categories, found ${ids.length}`);
  for (const [id, meta] of Object.entries(metas)) {
    assertNoAuthorshipClaim(assert, meta.message, `${id} message`);
    assertNoAuthorshipClaim(assert, meta.suggestion, `${id} suggestion`);
    // The plain-language rewrite's own floor: a reader must get a sentence, and
    // an action. An empty or one-word field is a rule that explains nothing.
    assert.ok(meta.message.length > 20, `${id} message is too short to explain anything`);
    // "Cut it." is 7 characters and is exactly the register asked for, so the
    // floor only catches an empty or truncated field, not a short one.
    assert.ok(meta.suggestion.length > 5, `${id} suggestion must tell the reader what to do`);
  }
});

test("claim boundary — the removed caveat tail has not crept back", () => {
  // It was printed once per finding, 113 times in a full report. The display
  // layer states it once per panel now. If it reappears here, that decision was
  // reverted by accident rather than on purpose.
  const metas = { ...CATEGORY_META, ...V3_CATEGORY_META, ...V4_CATEGORY_META };
  for (const [id, meta] of Object.entries(metas)) {
    assert.doesNotMatch(meta.message, /stylistic hint|not evidence of authorship|not proof of authorship/i,
      `${id} re-adds the per-rule caveat the display layer states once per panel`);
  }
});

// Vocabulary the owner ruled out on 30 August 2026: words a non-technical
// reader does not use. The rewrite exists because one message said "prose".
test("plain language — no rule message uses the banned vocabulary", () => {
  const BANNED_WORDS = /\b(?:prose|stylistic|deliberation|artefacts?|corroborat\w*|lexical|syntactic|cadence|heuristics?|characteristic of|indicative of)\b/i;
  const metas = { ...CATEGORY_META, ...V3_CATEGORY_META, ...V4_CATEGORY_META };
  const offenders = [];
  for (const [id, meta] of Object.entries(metas)) {
    for (const [field, text] of [["message", meta.message], ["suggestion", meta.suggestion]]) {
      const hit = BANNED_WORDS.exec(text);
      if (hit) offenders.push(`${id}.${field}: ${JSON.stringify(hit[0])}`);
    }
  }
  assert.deepEqual(offenders, [], `these read as jargon to the people who use this tool:\n  ${offenders.join("\n  ")}`);
});
