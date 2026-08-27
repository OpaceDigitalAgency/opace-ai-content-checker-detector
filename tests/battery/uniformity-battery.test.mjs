// Uniformity battery. Structural rhythm signals: near-identical FAQ answer
// lengths must fire signals.uniform_sections, Claude-style em-dash density must
// fire signals.em_dash_density, and naturally varied human prose must fire
// neither. These are the stylometric signals v0.1 lacked entirely.
import { test } from "node:test";
import assert from "node:assert/strict";

const { inspectSignalsV2, computeEditorialSignals } = await import(new URL("../../packages/core/dist/index.js", import.meta.url).pathname);

const ruleIds = (text) => inspectSignalsV2(text).map((f) => f.rule_id);

// Five FAQ answers of near-identical length (36 words each under 5 headings).
const FAQ_TEXT = [
  ["What does the checker do?",
    "It inspects pasted text for invisible Unicode characters, mixed-script lookalikes and documented writing-pattern signals, then lists every finding with its exact position, severity and suggested next step so an editor can review each one deliberately."],
  ["Does it send my text anywhere?",
    "No, the analysis runs entirely in the browser on this device, nothing is uploaded to a server, and the receipt records only content hashes rather than the text itself, which stays private to the current session."],
  ["Can it prove who wrote something?",
    "No, authorship cannot be proved from these checks, and the tool says so on every result, because stylistic evidence and character-level findings describe how text reads rather than establishing who or what actually produced it."],
  ["What should I do with a finding?",
    "Read the highlighted span in context first, then decide whether the flagged character or phrase belongs there, and only apply the previewed fix once you are satisfied the change cannot alter any protected fact."],
  ["How often are the rules updated?",
    "The rule tables are versioned data rather than code, each release notes its rule versions in the receipt, and new carriers, lookalikes and writing signals are added through the same review and battery process."],
].map(([q, a]) => `## ${q}\n\n${a}`).join("\n\n");

test("five near-identical-length FAQ answers fire signals.uniform_sections", () => {
  const ids = ruleIds(FAQ_TEXT);
  assert.ok(ids.includes("signals.uniform_sections"),
    `expected signals.uniform_sections, got: ${ids.join(", ") || "(none)"}`);
});

// Em-dash-dense Claude-style paragraph: 7 em dashes in ~60 words.
const DASHY_TEXT =
  "The launch went well — better than expected. The team shipped early — a rare thing. " +
  "Metrics climbed — slowly at first — then sharply. Customers noticed — and said so. " +
  "We should write this up — properly — before the details fade from memory.";

test("an em-dash-dense paragraph fires signals.em_dash_density", () => {
  const ids = ruleIds(DASHY_TEXT);
  assert.ok(ids.includes("signals.em_dash_density"),
    `expected signals.em_dash_density, got: ${ids.join(", ") || "(none)"}`);
});

// Naturally varied human passage: mixed sentence lengths, one incidental dash,
// paragraphs of clearly different sizes.
const HUMAN_TEXT =
  "Rain delayed the delivery until Friday. Sharon rang the depot twice; nobody answered.\n\n" +
  "In the end Dave drove over himself and found the parcel sitting behind the gate, soaked through, " +
  "which explains why the courier's tracking page had insisted for two days that it was out for delivery. " +
  "The invoice had already been paid, so we are chasing a refund for the damaged stock rather than a replacement.\n\n" +
  "Lesson learned. Next time we collect.";

test("naturally varied human prose fires neither uniformity signal", () => {
  const ids = ruleIds(HUMAN_TEXT);
  assert.ok(!ids.includes("signals.uniform_sections"),
    "false positive: signals.uniform_sections fired on varied human prose");
  assert.ok(!ids.includes("signals.em_dash_density"),
    "false positive: signals.em_dash_density fired on varied human prose");
});

// ── 2026.08.3 structural additions (harvest merge) ──────────────────────────

// Structural fixture 1: bold-label bullet scaffolding ("- **Term:** body").
const BOLD_LABEL_TEXT =
  "The review covered three areas in the sprint notes this week.\n\n" +
  "- **Speed:** loads fast on rural connections\n" +
  "- **Cost:** cheap to run month to month\n" +
  "- **Support:** answered quickly by real people\n";

test("a run of bold-label bullets fires signals.bold_label_bullets at corroboration weight", () => {
  const findings = inspectSignalsV2(BOLD_LABEL_TEXT);
  const hit = findings.find((f) => f.rule_id === "signals.bold_label_bullets");
  assert.ok(hit, `expected signals.bold_label_bullets, got: ${findings.map((f) => f.rule_id).join(", ") || "(none)"}`);
  assert.equal(hit.severity, "low", "tier B structural rule must stay low severity");
  assert.equal(hit.evidence.corroboration, true);
});

// Structural fixture 2: transition stacking — consecutive paragraphs opening
// with formal connectives.
const TRANSITION_STACK_TEXT =
  "Moreover, the quarterly results improved beyond the original forecast.\n\n" +
  "Furthermore, operating costs fell for the third consecutive period.\n\n" +
  "Additionally, the support team grew by four new hires in March.";

test("consecutive connective-opening paragraphs fire signals.transition_stacking", () => {
  const ids = ruleIds(TRANSITION_STACK_TEXT);
  assert.ok(ids.includes("signals.transition_stacking"),
    `expected signals.transition_stacking, got: ${ids.join(", ") || "(none)"}`);
});

// Structural fixture 3: sentence-final participial significance tails at the
// flagged rate (three in one short passage).
const PARTICIPIAL_TEXT =
  "Sales rose in March, highlighting the strength of the brand. " +
  "The team expanded to Leeds, underscoring its ambition for growth. " +
  "Costs fell again, reflecting tighter procurement discipline across the group.";

test("repeated participial significance tails fire signals.participial_tail", () => {
  const ids = ruleIds(PARTICIPIAL_TEXT);
  assert.ok(ids.includes("signals.participial_tail"),
    `expected signals.participial_tail, got: ${ids.join(", ") || "(none)"}`);
});

// SEO/AEO guard (binding correction): question headings plus uniform FAQ
// answers are taught to human SEO writers — the shape may fire uniformity
// measurements, but must never produce a high-severity finding or an
// ai_like classification on structure alone.
const SEO_FAQ_PAGE = [
  ["## What does the service cost?",
    "The standard plan costs forty pounds each month and covers two shops, and every extra shop after that adds ten pounds to the monthly invoice you receive."],
  ["## How long does setup take?",
    "Most shops finish setup in under an hour with the guided checklist, and the longest recorded case took an afternoon because of an unusual stock format."],
  ["## Can I cancel at any time?",
    "Yes, you can cancel from the billing page whenever you like, and the service stays active until the end of the month you have already paid for."],
  ["## Does it work with my till?",
    "The service connects to the four most common till systems sold in Britain, and the support team maintains a current list of tested models on the site."],
  ["## Who do I call for help?",
    "Support answers the phone from eight until six on weekdays, and outside those hours the answering service logs the call for the first agent free next morning."],
].map(([q, a]) => `${q}\n\n${a}`).join("\n\n");

test("SEO-template FAQ page never reaches ai_like or high severity on structure alone", () => {
  const findings = inspectSignalsV2(SEO_FAQ_PAGE);
  assert.equal(findings.filter((f) => f.severity === "high").length, 0,
    "structure-only SEO page must produce no high-severity findings");
  const result = computeEditorialSignals(SEO_FAQ_PAGE);
  assert.notEqual(result.classification, "ai_like",
    `SEO-taught structure must not read as AI: ${result.classification} (score ${result.score})`);
});
