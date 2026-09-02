import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  EU_ALLOWANCE,
  describeWait,
  euAllowanceNotice,
  evaluateEuAllowance,
  pruneEuAllowance,
  recordEuAllowance,
} from "../../shared/eu-allowance.mjs";

const NOW = 1_788_000_000_000;
const root = path.resolve(import.meta.dirname, "../../chrome");

test("the published pace is three a minute and twenty an hour", () => {
  assert.equal(EU_ALLOWANCE.perMinute, 3);
  assert.equal(EU_ALLOWANCE.perHour, 20);
  assert.equal(EU_ALLOWANCE.minuteWindowMs, 60_000);
  assert.equal(EU_ALLOWANCE.hourWindowMs, 3_600_000);
  assert.equal(EU_ALLOWANCE.maxCharacters, 50_000);
  assert.equal(EU_ALLOWANCE.serviceDailySegmentInferences, 12_000);
});

test("a fresh install may send, and the remaining counts are reported", () => {
  const decision = evaluateEuAllowance(undefined, NOW);
  assert.equal(decision.allowed, true);
  assert.equal(decision.scope, null);
  assert.equal(decision.remainingMinute, 3);
  assert.equal(decision.remainingHour, 20);
});

test("the third request in a minute is the last one allowed", () => {
  let state = { requests: [] };
  for (let index = 0; index < 3; index += 1) {
    assert.equal(evaluateEuAllowance(state, NOW).allowed, true, `request ${index + 1}`);
    state = recordEuAllowance(state, NOW + index);
  }
  const blocked = evaluateEuAllowance(state, NOW + 3);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.scope, "minute");
  assert.equal(blocked.remainingMinute, 0);
  assert.equal(blocked.retryAfterSeconds, 60);
});

test("the minute window reopens once the oldest request ages out", () => {
  let state = { requests: [] };
  for (let index = 0; index < 3; index += 1) state = recordEuAllowance(state, NOW + index * 1_000);
  assert.equal(evaluateEuAllowance(state, NOW + 59_000).allowed, false);
  assert.equal(evaluateEuAllowance(state, NOW + 60_001).allowed, true);
});

test("the hourly ceiling holds even when the minute window is clear", () => {
  let state = { requests: [] };
  for (let index = 0; index < EU_ALLOWANCE.perHour; index += 1) state = recordEuAllowance(state, NOW + index * 120_000);
  const at = NOW + EU_ALLOWANCE.perHour * 120_000 + 120_000;
  const decision = evaluateEuAllowance(state, at);
  assert.equal(decision.allowed, false);
  assert.equal(decision.scope, "hour");
  assert.equal(decision.remainingHour, 0);
  assert.ok(decision.retryAfterSeconds > 0);
});

test("state older than an hour is pruned, so storage cannot grow without bound", () => {
  const state = { requests: [NOW - 7_200_000, NOW - 3_600_001, NOW - 10_000] };
  assert.deepEqual(pruneEuAllowance(state, NOW).requests, [NOW - 10_000]);
  let grown = { requests: [] };
  for (let index = 0; index < 200; index += 1) grown = recordEuAllowance(grown, NOW + index);
  assert.ok(grown.requests.length <= EU_ALLOWANCE.perHour * 2);
});

test("corrupt or missing stored state fails open rather than locking the reader out", () => {
  for (const state of [undefined, null, {}, { requests: "nonsense" }, { requests: [Number.NaN, "x"] }]) {
    assert.equal(evaluateEuAllowance(state, NOW).allowed, true);
  }
});

test("the wait is described in words a reader can act on", () => {
  assert.equal(describeWait(1), "in a moment");
  assert.equal(describeWait(20), "in about 20 seconds");
  assert.equal(describeWait(60), "in about a minute");
  assert.equal(describeWait(400), "in about 7 minutes");
});

test("the notice says what happened, when to retry and that on-device has no limit", () => {
  const notice = euAllowanceNotice({ allowed: false, scope: "minute", retryAfterSeconds: 42, remainingMinute: 0, remainingHour: 5 });
  assert.match(notice.title, /pace for the EU route/u);
  assert.match(notice.body, /3 checks a minute/u);
  assert.match(notice.body, /Nothing was sent/u);
  assert.match(notice.body, /in about 42 seconds/u);
  assert.match(notice.body, /no limit and never sends your text/u);
  const hourly = euAllowanceNotice({ allowed: false, scope: "hour", retryAfterSeconds: 900, remainingMinute: 2, remainingHour: 0 });
  assert.match(hourly.body, /20 checks an hour/u);
});

test("the built panel states every limit and enforces the pace before asking for permission", async () => {
  const panel = await readFile(path.join(root, "dist/panel.js"), "utf8");
  /* The panel builds these numbers from the shared constants, so the bundle
     carries the template and the constants rather than baked-in digits. */
  assert.match(panel, /MAX_TEXT_LENGTH\.toLocaleString\("en-GB"\)\} characters a check/u);
  assert.match(panel, /EU_ALLOWANCE\.perMinute\} checks a minute and \$\{EU_ALLOWANCE\.perHour\} an hour from this installation/u);
  assert.match(panel, /serviceDailySegmentInferences\.toLocaleString\("en-GB"\)\} section readings a day/u);
  assert.match(panel, /perMinute: 3/u);
  assert.match(panel, /perHour: 20/u);
  assert.match(panel, /serviceDailySegmentInferences: (?:12_?000|12e3)/u);
  assert.match(panel, /There is no limit on how often you can use it/u);
  assert.match(panel, /evaluateEuAllowance|remainingMinute/u);
  assert.match(panel, /pace for the EU route/u);
  assert.match(panel, /eu_allowance/u);
});

test("the built panel reassures the reader about the on-device download", async () => {
  const panel = await readFile(path.join(root, "dist/panel.js"), "utf8");
  assert.match(panel, /CYCLE5_MODEL_DOWNLOAD_LABEL\)\} of model weights and a word list/u);
  assert.match(panel, /"34\.5 MB"|34\.5 MB/u);
  assert.match(panel, /These are data files, not a program/u);
  assert.match(panel, /opace\.agency/u);
  assert.match(panel, /SHA-256 fingerprint \(starting/u);
  assert.match(panel, /9f57d6a8/u);
  assert.match(panel, /removed in one click/u);
});
