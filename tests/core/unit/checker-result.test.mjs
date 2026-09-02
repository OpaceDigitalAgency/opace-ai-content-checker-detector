import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CHECKER_HONESTY_LINE,
  CHECKER_RESULT_RUNTIME_VERSION,
  CHECKER_SCORE_SCALE,
  CYCLE5_MODEL_IDENTITY,
  assertCheckerResultInvariants,
  buildContentFreeSharePayload,
  composeCheckerAxes,
  computeCombinedVerdict,
  formatCheckerScoreTexts,
  levelForCycle5Score,
  notAssessedAiPattern,
  presentCycle5Result
} from "../../../packages/core/dist/bundle.js";

const presentation = () => presentCycle5Result({
  source: "tier3-cycle5-v1",
  rawScore: 0.9685,
  rawMargin: 3.6,
  bandId: "very_likely_ai",
  primaryDisplayThreshold: 0.9679444972866822,
  secondaryDisplayThreshold: 0.956196,
  flagged: true,
  flagReason: "primary",
  sections: [
    {
      index: 0,
      startUtf16: 0,
      endUtf16: 57,
      wordCount: 58,
      rawScore: 0.9655,
      rawMargin: 3.49,
      bandId: "uncertain",
      passage: "The first complete scored passage remains available to the report.",
      evidence: [{ id: "section-0", kind: "trained_model", summary: "Likely AI section." }]
    },
    {
      index: 1,
      startUtf16: 58,
      endUtf16: 120,
      wordCount: 62,
      rawScore: 0.9685,
      rawMargin: 3.6,
      bandId: "very_likely_ai",
      passage: "The second complete passage is the strongest section in source order.",
      evidence: [{ id: "section-1", kind: "trained_model", summary: "Strongest section." }]
    }
  ]
});

test("the portable result runtime freezes the current Cycle-5 identities and five level ids", () => {
  assert.equal(CHECKER_RESULT_RUNTIME_VERSION, "checker-result:2026.09.1");
  assert.deepEqual(CYCLE5_MODEL_IDENTITY.flagRule, {
    expression: "max(m1, m2 + 0.34) >= 3.570935",
    primaryMargin: 3.570935,
    secondaryGap: 0.34
  });
  assert.equal(CYCLE5_MODEL_IDENTITY.segmentationContract, "segments-v3");
  assert.equal(CYCLE5_MODEL_IDENTITY.inputContract, "raw-v1");
  assert.equal(CYCLE5_MODEL_IDENTITY.featuresContract, "features-v1");
  assert.equal(CYCLE5_MODEL_IDENTITY.scoringContract, "margin-v1");
  assert.equal(levelForCycle5Score(0.99, "very_likely_ai", 0.956196), "signal-strongly-ai");
  assert.equal(levelForCycle5Score(0.96, "uncertain", 0.956196), "signal-likely-ai");
  assert.equal(levelForCycle5Score(0.95, "uncertain", 0.956196), "signal-potentially-ai");
  assert.equal(levelForCycle5Score(0.7, "likely_human", 0.956196), "signal-unclear");
  assert.equal(levelForCycle5Score(0.2, "very_likely_human", 0.956196), "signal-likely-human");
});

test("one run-wide formatter resolves the 0.9655/0.9685 Likely/Strongly collision", () => {
  assert.deepEqual(formatCheckerScoreTexts([
    { rawScore: 0.9655, level: "signal-likely-ai" },
    { rawScore: 0.9685, level: "signal-strongly-ai" }
  ]), ["0.966", "0.969"]);
  const result = presentation();
  assert.equal(result.ai_pattern.display_score, "0.969");
  assert.deepEqual(result.sections.map((section) => section.display_score), ["0.966", "0.969"]);
  assert.deepEqual(result.sections.map((section) => section.level), ["signal-likely-ai", "signal-strongly-ai"]);
  assert.equal(result.ai_pattern.strongest_section_index, 1);
  assert.equal(result.ai_pattern.score_scale, CHECKER_SCORE_SCALE);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.sections[0]), true);
});

test("content-free share output reuses presented scores and cannot inherit passages or evidence", () => {
  const shared = buildContentFreeSharePayload({
    resultId: "result_cycle5_fixture_001",
    generatedAt: "2026-09-02T10:00:00Z",
    wordCount: 120,
    modelVersion: "tier3-cycle5-v1",
    presented: presentation()
  });
  assert.equal(shared.contains_content, false);
  assert.equal(shared.honesty_line, CHECKER_HONESTY_LINE);
  assert.equal(shared.display_score, "0.969");
  assert.deepEqual(shared.sections.map((section) => section.display_score), ["0.966", "0.969"]);
  assert.equal(JSON.stringify(shared).includes("passage"), false);
  assert.equal(JSON.stringify(shared).includes("evidence"), false);
  assert.equal(JSON.stringify(shared).includes("complete scored"), false);
});

test("three-axis composition cannot turn deterministic, character or watermark evidence into an AI reading", () => {
  const deterministic = computeCombinedVerdict({ watermark: { outcome: "detected" } });
  const axes = composeCheckerAxes(deterministic);
  assert.equal(axes.ai_pattern.assessment_status, "not_assessed");
  assert.equal(axes.ai_pattern.raw_score, null);
  assert.equal(axes.ai_pattern.level, null);
  assert.equal(axes.text_integrity.reading, "manipulated");
  assert.equal(notAssessedAiPattern().reason.includes("No trained model ran"), true);

  const model = computeCombinedVerdict({ model: { name: "tier3-cycle5-v1", probability: 0.9685, threshold: 0.9679444972866822 } });
  const assessed = composeCheckerAxes(model, presentation());
  assert.equal(assessed.ai_pattern.level, "signal-strongly-ai");
  assert.equal(assessed.text_integrity.reading, "clean");
  assert.throws(() => composeCheckerAxes(model), /cannot be discarded/);
});

test("the full checker fixture passes producer invariants; contradictions fail closed", async () => {
  const fixture = JSON.parse(await readFile(new URL("../../../fixtures/contracts/valid/checker-result.json", import.meta.url), "utf8")).data;
  assert.doesNotThrow(() => assertCheckerResultInvariants(fixture));
  assert.throws(() => assertCheckerResultInvariants({ ...fixture, route: { ...fixture.route, model: null } }), /Only a trained model/);
  assert.throws(() => assertCheckerResultInvariants({ ...fixture, axes: { ...fixture.axes, ai_pattern: { ...fixture.axes.ai_pattern, raw_score: 0.5 } } }), /strongest section/);
  assert.throws(() => assertCheckerResultInvariants({ ...fixture, sections: [...fixture.sections].reverse() }), /source order/);
  assert.throws(() => assertCheckerResultInvariants({
    ...fixture,
    axes: { ...fixture.axes, ai_pattern: { ...fixture.axes.ai_pattern, level: "signal-likely-human" } }
  }), /strongest section/);
  assert.throws(() => assertCheckerResultInvariants({
    ...fixture,
    axes: { ...fixture.axes, ai_pattern: { ...fixture.axes.ai_pattern, source: "another-model" } }
  }), /executed model/);
  assert.throws(() => assertCheckerResultInvariants({
    ...fixture,
    axes: { ...fixture.axes, ai_pattern: { ...fixture.axes.ai_pattern, method_status: "pass" } }
  }), /flag state/);
  assert.throws(() => assertCheckerResultInvariants({
    ...fixture,
    axes: { ...fixture.axes, ai_pattern: { ...fixture.axes.ai_pattern, flagged: false, flag_reason: null, method_status: "pass" } }
  }), /recorded Cycle-5 margins/);
  assert.throws(() => assertCheckerResultInvariants({ ...fixture, source: { ...fixture.source, section_count: 3 } }), /section count/);
  assert.throws(() => assertCheckerResultInvariants({
    ...fixture,
    provenance: { ...fixture.provenance, safe_fixes: { ...fixture.provenance.safe_fixes, automatic_homoglyph_replacement: true } }
  }), /Safe-fix/);
});

test("the presentation builder rejects missing evidence locators and model/section drift", () => {
  assert.throws(() => presentCycle5Result({
    source: "tier3-cycle5-v1",
    rawScore: 0.5,
    rawMargin: 0,
    bandId: "likely_human",
    primaryDisplayThreshold: 0.9679444972866822,
    secondaryDisplayThreshold: 0.956196,
    flagged: false,
    flagReason: null,
    sections: [{ index: 0, startUtf16: 0, endUtf16: 4, wordCount: 1, rawScore: 0.4, rawMargin: 0, bandId: "likely_human", evidence: [] }]
  }), /passage or a content-free locator/);
  assert.throws(() => presentCycle5Result({
    source: "tier3-cycle5-v1",
    rawScore: 0.5,
    rawMargin: 0,
    bandId: "likely_human",
    primaryDisplayThreshold: 0.9679444972866822,
    secondaryDisplayThreshold: 0.956196,
    flagged: false,
    flagReason: null,
    sections: [{ index: 0, startUtf16: 0, endUtf16: 4, wordCount: 1, rawScore: 0.4, rawMargin: 0, bandId: "likely_human", passage: "Text", evidence: [] }]
  }), /strongest section/);
});
