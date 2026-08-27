// Slop battery (v0.1-REVIEW §6.3). Fixture D (modern AI slop) must fire hard;
// fixture C (classic clichés) must fire and never read as human; fixture E
// (verified-human control) must stay clean. The GPT-5.6 article excerpt — the
// known-hard clean-AI-prose case — is scored and PRINTED, never asserted:
// honest detection of that class awaits the Tier C trained model
// (BRIEF.md §21, v0.1-REVIEW §8.4). The battery documents current behaviour.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_C, FIXTURE_D, FIXTURE_E, ARTICLE_EXCERPT, buildRequest, detOptions } from "./fixtures.mjs";

const { inspect, inspectSignalsV2, computeEditorialSignals } =
  await import(new URL("../../packages/core/dist/index.js", import.meta.url).pathname);

test("fixture D (modern AI slop) yields at least 5 findings and classifies ai_like", () => {
  const findings = inspectSignalsV2(FIXTURE_D);
  assert.ok(findings.length >= 5, `expected >=5 findings on fixture D, got ${findings.length}`);
  const signals = computeEditorialSignals(FIXTURE_D);
  assert.equal(signals.status, "scored");
  assert.equal(signals.classification, "ai_like",
    `fixture D must classify ai_like, got ${signals.classification} (score ${signals.score})`);
});

test("fixture D through inspect() reports attention, never a green pass", async () => {
  const result = await inspect(buildRequest("req_battery_slop_d", FIXTURE_D, ["style.patterns"]), detOptions());
  const method = result.methods.find((m) => m.id === "style.patterns");
  assert.equal(method.status, "attention", "the v0.1 failure mode was a green pass on fixture D");
  assert.ok(result.pattern_findings.length >= 5, `expected >=5 pattern findings, got ${result.pattern_findings.length}`);
});

test("fixture C (classic clichés) yields findings and is not classified human_like", () => {
  const findings = inspectSignalsV2(FIXTURE_C);
  assert.ok(findings.length > 0, "fixture C must produce findings");
  const signals = computeEditorialSignals(FIXTURE_C);
  assert.equal(signals.status, "scored");
  assert.notEqual(signals.classification, "human_like",
    `fixture C must not read as human, got ${signals.classification} (score ${signals.score})`);
});

test("fixture E (verified-human control) has zero high-severity findings and classifies human_like", async () => {
  const findings = inspectSignalsV2(FIXTURE_E);
  const high = findings.filter((f) => f.severity === "high");
  assert.equal(high.length, 0, `human control produced high-severity findings: ${high.map((f) => f.rule_id).join(", ")}`);
  const signals = computeEditorialSignals(FIXTURE_E);
  assert.equal(signals.status, "scored");
  assert.equal(signals.classification, "human_like",
    `false positive on the human control: ${signals.classification} (score ${signals.score})`);
  const result = await inspect(buildRequest("req_battery_slop_e", FIXTURE_E, ["style.patterns", "unicode.invisible"]), detOptions());
  const highAll = result.pattern_findings.filter((f) => f.severity === "high");
  assert.equal(highAll.length, 0, "inspect() must report no high-severity findings on the human control");
});

// Known-hard case: recorded and printed, never asserted. Clean, well-prompted
// AI prose (100% AI at Copyleaks/Originality) carries few surface tells; the
// rule/stylometric tiers document what they currently see, and closing this
// gap is the Tier C trained-model milestone — do not turn this into a
// pass/fail assertion before that model exists.
test("GPT-5.6 article excerpt: record and print current behaviour (no pass/fail)", () => {
  const signals = computeEditorialSignals(ARTICLE_EXCERPT);
  const findings = inspectSignalsV2(ARTICLE_EXCERPT);
  console.log("\n[battery] GPT-5.6 UK eCommerce article excerpt (known-hard clean AI prose):");
  console.log(`[battery]   score=${signals.score} classification=${signals.classification} confidence=${signals.confidence}`);
  console.log(`[battery]   findings=${findings.length} categories=${signals.categoriesHit.join(", ") || "(none)"}`);
  console.log("[battery]   Reference: Copyleaks and Originality both score the full article 100% AI (PAID-TOOLS.md).");
  console.log("[battery]   Detection of this class awaits the Tier C trained model; this entry documents, it does not gate.");
  assert.equal(signals.status, "scored", "the excerpt must at least be scoreable");
});

// ── 2026.08.3 artefact battery (harvest merge) ──────────────────────────────
// Exposed AI-tool residue: near-zero-FP, model-attributing tokens from
// tells-seed:2026.08.1 art-citation-tokens / art-placeholders /
// pun-unicode-decoration. Each must fire at high severity with the correct
// attribution, and the human control must stay silent on all of them.

const ARTEFACT_CASES = [
  ["DeepSeek bracket ref", "【12†L34-L38】", "signals.ai_citation_token", "deepseek"],
  ["Grok citation card", "grok_render_citation_card_json", "signals.ai_citation_token", "grok"],
  ["Perplexity upload URL", "https://ppl-ai-file-upload.s3.amazonaws.com/report.pdf", "signals.ai_citation_token", "perplexity"],
  ["Gemini cite marker", "[cite: 3]", "signals.ai_citation_token", "gemini"],
  ["ChatGPT citeturn token", "citeturn0search1", "signals.ai_citation_token", "chatgpt"],
];

for (const [label, token, rule, attribution] of ARTEFACT_CASES) {
  test(`artefact battery: ${label} fires ${rule} at high severity, attributed to ${attribution}`, () => {
    const text = `The published article still carries the leaked marker ${token} in the middle of an otherwise ordinary paragraph about the product launch.`;
    const hits = inspectSignalsV2(text).filter((f) => f.rule_id === rule);
    assert.ok(hits.length >= 1, `${label}: expected ${rule}`);
    assert.equal(hits[0].severity, "high");
    assert.equal(hits[0].evidence.attribution, attribution);
  });
}

test("artefact battery: math-bold Unicode text fires signals.math_alphanumeric at high severity", () => {
  const text = "Our launch note used \u{1D5E7}\u{1D5F2}\u{1D605}\u{1D601} styled letters pasted straight from the chat window into the article body last week.";
  const hits = inspectSignalsV2(text).filter((f) => f.rule_id === "signals.math_alphanumeric");
  assert.ok(hits.length >= 1, "expected signals.math_alphanumeric");
  assert.equal(hits[0].severity, "high");
});

test("artefact battery: [Your Name] placeholder fires signals.ai_placeholder at high severity", () => {
  const text = "Dear [Your Name], thank you for subscribing to the newsletter this month and welcome aboard the programme for local members.";
  const hits = inspectSignalsV2(text).filter((f) => f.rule_id === "signals.ai_placeholder");
  assert.ok(hits.length >= 1, "expected signals.ai_placeholder");
  assert.equal(hits[0].severity, "high");
});

test("artefact battery: the human control fires no artefact-forensics rule", () => {
  const artefactRules = new Set([
    "signals.ai_citation_token", "signals.ai_citation_markup", "signals.reasoning_leak",
    "signals.placeholder_token", "signals.ai_placeholder", "signals.pua_character",
    "signals.math_alphanumeric", "signals.arrow_decoration", "signals.ai_utm_source",
  ]);
  for (const f of inspectSignalsV2(FIXTURE_E)) {
    assert.ok(!artefactRules.has(f.rule_id), `artefact rule ${f.rule_id} fired on the human control`);
  }
});
