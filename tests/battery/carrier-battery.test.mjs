// Carrier battery (v0.1-REVIEW §6.1). Every carrier category the engine claims,
// enumerated programmatically from the core's own data table, must be detected
// when embedded in clean English text — with the declared code point, severity
// and fix. The v0.1 fixture-B escape list must never produce a clean report,
// and the emoji-ZWJ / Persian-ZWNJ exemptions must hold.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_B_CARRIERS } from "./fixtures.mjs";

const { inspectUnicode } = await import(new URL("../../packages/core/dist/index.js", import.meta.url).pathname);
const { CARRIER_RULES } = await import(new URL("../../packages/core/dist/unicode/data.js", import.meta.url).pathname);

const embed = (cp) => `plain text${String.fromCodePoint(cp)}here in an ordinary English sentence.`;
const codePointLabel = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;

// Representative code points per rule: the first of each rule, plus the last of
// each range, so both ends of every claimed category are exercised.
const representatives = [];
for (const rule of CARRIER_RULES) {
  const points = rule.to !== undefined && rule.to !== rule.from ? [rule.from, rule.to] : [rule.from];
  for (const cp of points) {
    representatives.push({
      cp,
      name: typeof rule.name === "function" ? rule.name(cp) : rule.name,
      severity: rule.severity,
      fix: rule.fix,
    });
  }
}

test("the carrier table is non-trivial and enumerable", () => {
  assert.ok(CARRIER_RULES.length >= 30, `expected a full carrier table, got ${CARRIER_RULES.length} rules`);
  assert.ok(representatives.length >= 40, `expected >=40 representative code points, got ${representatives.length}`);
});

for (const rep of representatives) {
  test(`carrier ${codePointLabel(rep.cp)} (${rep.name}) is detected in plain text with declared severity and fix`, () => {
    const findings = inspectUnicode(embed(rep.cp));
    const hit = findings.find((f) => f.code_point === codePointLabel(rep.cp));
    assert.ok(hit, `no finding for ${codePointLabel(rep.cp)} ${rep.name}`);
    assert.equal(hit.name, rep.name);
    assert.equal(hit.severity, rep.severity, `severity mismatch for ${codePointLabel(rep.cp)}`);
    assert.equal(hit.fix, rep.fix, `fix mismatch for ${codePointLabel(rep.cp)}`);
    assert.ok(hit.matched_text_hash.startsWith("sha256:"), "finding must carry a matched-text hash");
    assert.ok(hit.limitations.length >= 1, "finding must carry limitation text");
  });
}

test("emoji ZWJ sequences are exempt (no finding inside a family emoji)", () => {
  const findings = inspectUnicode("Family photo: \u{1F469}‍\u{1F469}‍\u{1F467} arrived today.");
  assert.equal(findings.length, 0, `expected 0 findings, got ${findings.map((f) => f.code_point).join(", ")}`);
});

test("Persian ZWNJ between Arabic-script letters is exempt", () => {
  // "mi-khaham" (I want): ZWNJ is standard Persian orthography here.
  const findings = inspectUnicode("می‌خواهم");
  assert.equal(findings.length, 0, `expected 0 findings, got ${findings.map((f) => f.code_point).join(", ")}`);
});

test("ZWJ between Latin letters is NOT exempt", () => {
  const findings = inspectUnicode("wat‍ermark");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].code_point, "U+200D");
});

// The v0.1-REVIEW fixture-B escape list: in v0.1 every one of these produced a
// clean report. None may escape detection in a plain-text context again.
for (const [cp, label] of FIXTURE_B_CARRIERS) {
  test(`fixture-B carrier ${codePointLabel(cp)} (${label}) does not escape detection`, () => {
    const findings = inspectUnicode(embed(cp));
    const hit = findings.find((f) => f.code_point === codePointLabel(cp));
    assert.ok(hit, `fixture-B regression: ${codePointLabel(cp)} ${label} produced a clean report`);
  });
}

test("the whole fixture-B payload in one passage yields one finding per carrier", () => {
  const text = "Report" + FIXTURE_B_CARRIERS.map(([cp]) => String.fromCodePoint(cp)).join("word") + "ends here.";
  const findings = inspectUnicode(text);
  assert.equal(findings.length, FIXTURE_B_CARRIERS.length,
    `expected ${FIXTURE_B_CARRIERS.length} findings, got ${findings.length}: ${findings.map((f) => f.code_point).join(", ")}`);
});
