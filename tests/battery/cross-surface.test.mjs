// Cross-surface consistency battery (v0.1-REVIEW §8.2/§8.5). The engine built
// in this repository and the copy installed in the Opace website's
// node_modules must produce byte-identical findings, methods and editorial
// signals for identical input, and must declare the same rule versions.
// Two surfaces on the same signal-set version must, by definition, agree.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  CORE_BUNDLE, WEBSITE_BUNDLE, FIXTURE_C, FIXTURE_D, FIXTURE_E, CARRIER_LINE,
  buildRequest, detOptions,
} from "./fixtures.mjs";

assert.ok(existsSync(CORE_BUNDLE), `source bundle missing: ${CORE_BUNDLE}`);
assert.ok(existsSync(WEBSITE_BUNDLE),
  `website copy missing: ${WEBSITE_BUNDLE} — the website no longer consumes the engine tarball, or the path moved`);

const local = await import(CORE_BUNDLE);
const site = await import(WEBSITE_BUNDLE);

// Timestamps are the only fields the task allows to differ; with injected now()
// they should already be equal, but strip them so the comparison tests the
// analytical payload, not the clock plumbing.
function stripTimestamps(result) {
  const clone = structuredClone(result);
  delete clone.started_at;
  delete clone.completed_at;
  for (const method of clone.methods ?? []) {
    delete method.started_at;
    delete method.completed_at;
  }
  return clone;
}

const CASES = [
  ["fixture C (classic clichés)", "req_battery_xs_c", FIXTURE_C],
  ["fixture D (modern slop)", "req_battery_xs_d", FIXTURE_D],
  ["fixture E (human control)", "req_battery_xs_e", FIXTURE_E],
  ["carrier line (fixture-B payload)", "req_battery_xs_b", CARRIER_LINE],
];

test("both copies declare the same rule versions", () => {
  assert.equal(local.EN_SIGNALS_PATTERN_VERSION, site.EN_SIGNALS_PATTERN_VERSION,
    "EN_SIGNALS_PATTERN_VERSION diverges between source dist and the website's installed copy");
  assert.equal(local.UNICODE_RULES_VERSION, site.UNICODE_RULES_VERSION,
    "UNICODE_RULES_VERSION diverges between source dist and the website's installed copy");
});

for (const [label, requestId, content] of CASES) {
  test(`inspect() findings are identical on both surfaces: ${label}`, async () => {
    const request = buildRequest(requestId, content);
    const a = await local.inspect(request, detOptions());
    const b = await site.inspect(request, detOptions());
    assert.deepEqual(stripTimestamps(a), stripTimestamps(b),
      `source dist and website copy diverge on ${label}`);
  });

  test(`unicode findings and editorial signals are identical on both surfaces: ${label}`, () => {
    assert.deepEqual(local.inspectUnicode(content), site.inspectUnicode(content));
    assert.deepEqual(
      structuredClone(local.computeEditorialSignals(content)),
      structuredClone(site.computeEditorialSignals(content)),
    );
    assert.deepEqual(
      structuredClone(local.inspectSignalsV2(content)),
      structuredClone(site.inspectSignalsV2(content)),
    );
  });
}
