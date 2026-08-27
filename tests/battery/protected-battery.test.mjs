// Protected-span fidelity battery (v0.1-REVIEW §6.5). The dense audit fact
// text must yield all 12 protected-span kinds — including the name,
// organisation and citation kinds v0.1 missed — and the safe-fix preview must
// leave every protected span byte-identical even when carriers sit inside them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FACT_TEXT, EXPECTED_PROTECTED_KINDS } from "./fixtures.mjs";

const { extractProtectedSpans, inspectUnicode, previewSafeFixes, prefixedSha256 } =
  await import(new URL("../../packages/core/dist/index.js", import.meta.url).pathname);

const extract = (content) => extractProtectedSpans({ content, content_hash: prefixedSha256(content) });

test("the audit fact text yields all 12 protected-span kinds", () => {
  const spans = extract(FACT_TEXT);
  const kinds = [...new Set(spans.map((s) => s.kind))].sort();
  assert.deepEqual(kinds, EXPECTED_PROTECTED_KINDS,
    `missing kinds: ${EXPECTED_PROTECTED_KINDS.filter((k) => !kinds.includes(k)).join(", ") || "(none)"}; extra: ${kinds.filter((k) => !EXPECTED_PROTECTED_KINDS.includes(k)).join(", ") || "(none)"}`);
});

test("the v0.1 headline misses are now extracted verbatim", () => {
  const spans = extract(FACT_TEXT);
  const texts = spans.map((s) => s.text);
  assert.ok(texts.includes("Dr Sarah Chen"), "name 'Dr Sarah Chen' not extracted");
  assert.ok(texts.includes("Opace Ltd"), "organisation 'Opace Ltd' not extracted");
  assert.ok(texts.includes("(Chen et al., 2025)"), "citation '(Chen et al., 2025)' not extracted");
});

test("every span carries exact offsets back into the source", () => {
  const spans = extract(FACT_TEXT);
  for (const span of spans) {
    assert.equal(FACT_TEXT.slice(span.start_utf16, span.end_utf16), span.text,
      `span ${span.id} offsets do not reproduce its text`);
  }
});

// Safe-fix fidelity: seed carriers both inside and outside protected spans.
// ZWSP inside the URL span (the URL regex still matches through it) and
// ZWSP/soft hyphen in plain prose. Observed engine behaviour, documented here
// deliberately: a carrier seeded INSIDE an entity token (e.g. "Opa<ZWSP>ce
// Ltd") breaks the deterministic name/organisation match, so that span is no
// longer extracted and the carrier becomes fixable — the entity protection is
// only as strong as the extractor's token match on the text as given.
const seeded = FACT_TEXT
  .replace("https://opace.agency/report", "https://opace.agency/re​port")
  .replace("reported revenue", "repor​ted reve­nue");

test("safe-fix preview leaves every protected span byte-identical", () => {
  const spans = extract(seeded);
  const findings = inspectUnicode(seeded);
  assert.ok(findings.length >= 3, `expected the seeded carriers to be found, got ${findings.length}`);
  const preview = previewSafeFixes(seeded, findings, findings.map((f) => f.id), spans);
  for (const span of spans) {
    assert.ok(preview.candidate.includes(span.text),
      `protected span ${span.kind} "${span.text}" was altered by the safe-fix preview`);
  }
  // Carriers inside protected spans must be skipped with the protected_span reason.
  const skippedReasons = new Set(preview.skipped.map((s) => s.reason));
  assert.ok(skippedReasons.has("protected_span"),
    `expected protected_span skips, got reasons: ${[...skippedReasons].join(", ") || "(none)"}`);
  // Carriers in plain prose must still be fixed.
  assert.ok(preview.applied_finding_ids.length >= 2,
    "carriers outside protected spans should still be fixable");
  assert.ok(!preview.candidate.includes("repor​ted"), "plain-prose ZWSP should be removed");
  assert.ok(!preview.candidate.includes("reve­nue"), "plain-prose soft hyphen should be removed");
  // And the protected carrier must survive untouched.
  assert.ok(preview.candidate.includes("re​port"), "carrier inside the URL span must be left for review");
});
