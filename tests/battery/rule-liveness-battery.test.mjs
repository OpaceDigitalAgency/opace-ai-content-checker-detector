// Rule-liveness battery — the standing guard against shipping a rule that
// cannot fire.
//
// The defect class this exists to stop: a writing-signal rule sits in the
// advertised inventory, is counted in "116 named rules", is described in the
// README as a capability, and cannot fire on any real document. That is a
// claim without a measurement, which BRIEF.md section 5 forbids, and it has
// happened once already (`signals.tier3_phrase_cluster`, whose 3-distinct-
// phrase gate over inherited crypto/web3 whitepaper vocabulary is never
// reached: the measured maximum across 10,096 documents is 1).
//
// The guard has three parts, and each one closes a different way of being
// wrong:
//
//   1. INVENTORY — the measured manifest covers exactly the rules the built
//      packs expose, and `WRITING_SIGNAL_RULES_RUN` equals that count. A new
//      rule cannot be added without a measured liveness figure.
//   2. LIVENESS — every rule with zero AI-side fires is recorded in
//      rule-liveness-inactive.json with a category and a reason; and a rule
//      recorded there that HAS started firing fails too, so the register
//      cannot go stale in either direction.
//   3. REACHABILITY — every rule recorded as merely `dormant-*` must still
//      fire on its committed probe, against the engine as built. That is what
//      separates "absent from these corpora" from "cannot fire at all", and
//      it is checked on every run rather than trusted from a report.
//
// Regenerate the manifest with `node tests/battery/rule-liveness.mjs` after
// any change to the rule packs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { LIVENESS_PROBES, LIVENESS_NEGATIVE_CONTROLS } from "./rule-liveness-probes.mjs";
import { ruleInventory } from "./rule-liveness.mjs";

const require = createRequire(import.meta.url);
const { inspectPatterns } = require(
  new URL("../../packages/core/dist/patterns/en-gb-v1.js", import.meta.url).pathname);
const manifest = JSON.parse(
  readFileSync(new URL("./rule-liveness.json", import.meta.url), "utf8"));
const inactive = manifest.inactive;
const INVENTORY = ruleInventory();
const fired = (text) => new Set(inspectPatterns(text).map((f) => f.rule_id));

test("rule liveness: the manifest covers exactly the built rule inventory", () => {
  const measured = Object.keys(manifest.rules).sort();
  assert.deepEqual(measured, [...INVENTORY].sort(),
    "rule-liveness.json is stale — regenerate it with `node tests/battery/rule-liveness.mjs`");
  assert.equal(manifest.named_rules, INVENTORY.length);
});

test("rule liveness: WRITING_SIGNAL_RULES_RUN matches the built inventory", () => {
  const src = readFileSync(
    new URL("../../packages/core/src/inspect.ts", import.meta.url), "utf8");
  const m = /WRITING_SIGNAL_RULES_RUN\s*=\s*(\d+)/.exec(src);
  assert.ok(m, "WRITING_SIGNAL_RULES_RUN not found in packages/core/src/inspect.ts");
  assert.equal(Number(m[1]), INVENTORY.length,
    `the emitted rules_run count must equal the ${INVENTORY.length} named rules the packs expose`);
});

test("rule liveness: the manifest states its denominators", () => {
  assert.ok(manifest.denominators.ai_documents > 0, "no AI-side denominator recorded");
  assert.ok(manifest.denominators.human_documents > 0, "no human-side denominator recorded");
  for (const c of manifest.corpora) {
    assert.ok(typeof c.note === "string" && c.note.length > 0, `corpus ${c.id} has no provenance note`);
  }
});

test("rule liveness: no rule ships in the active inventory that never fires", () => {
  const undocumented = [];
  for (const rule of INVENTORY) {
    if (manifest.rules[rule].ai_documents_fired > 0) continue;
    if (!inactive[rule]) undocumented.push(rule);
  }
  assert.deepEqual(undocumented, [],
    `these rules fired on 0 of ${manifest.denominators.ai_documents} AI documents and are not recorded ` +
    "in rule-liveness-inactive.json. Either fix the rule, or record it there with a category and a reason " +
    "and correct the published rule counts.");
});

test("rule liveness: every inactive record carries a category and a reason", () => {
  const CATEGORIES = new Set(["inactive", "dormant-forensic", "dormant-register"]);
  for (const [rule, rec] of Object.entries(inactive)) {
    if (rule.startsWith("_")) continue;
    assert.ok(INVENTORY.includes(rule), `${rule} is recorded inactive but is not in the rule inventory`);
    assert.ok(CATEGORIES.has(rec.category), `${rule} has an unknown category ${rec.category}`);
    assert.ok(typeof rec.reason === "string" && rec.reason.length > 40,
      `${rule} needs a reason that says why, not a placeholder`);
  }
});

test("rule liveness: the inactive register is not stale — nothing listed has started firing", () => {
  const revived = Object.keys(inactive)
    .filter((r) => !r.startsWith("_"))
    .filter((r) => (manifest.rules[r]?.ai_documents_fired ?? 0) > 0);
  assert.deepEqual(revived, [],
    "these rules now fire on the measurement corpora and must be removed from " +
    "rule-liveness-inactive.json, and the published counts corrected upward.");
});

test("rule liveness: every dormant rule is probe-verified reachable", () => {
  for (const [rule, rec] of Object.entries(inactive)) {
    if (rule.startsWith("_") || rec.category === "inactive") continue;
    const probe = LIVENESS_PROBES[rule];
    assert.ok(probe, `${rule} is recorded as ${rec.category} but has no probe in rule-liveness-probes.mjs`);
    assert.ok(fired(probe).has(rule),
      `${rule} is recorded as reachable but does not fire on its own probe — it belongs in the ` +
      "'inactive' category and must come out of the live capability count");
  }
});

test("rule liveness: probe negative controls do not fire", () => {
  for (const [rule, text] of Object.entries(LIVENESS_NEGATIVE_CONTROLS)) {
    assert.ok(!fired(text).has(rule), `${rule} fired on its negative control`);
  }
});

test("rule liveness: the one rule recorded as inactive really cannot reach its gate", () => {
  // Guards the specific finding rather than trusting the record: the
  // tier3-phrase-cluster gate needs 3 distinct phrases and four of the ten
  // regexes match nothing in 10,096 measured documents. If the vocabulary is
  // ever repaired, this fails and the rule returns to the live count.
  const { TIER3_PHRASES } = require(
    new URL("../../packages/core/dist/patterns/en-signals-v2-data.js", import.meta.url).pathname);
  assert.equal(inactive["signals.tier3_phrase_cluster"].category, "inactive");
  assert.equal(manifest.rules["signals.tier3_phrase_cluster"].ai_documents_fired, 0);
  assert.equal(manifest.rules["signals.tier3_phrase_cluster"].human_documents_fired, 0);
  const crypto = [/decentralized/, /reward\\s\+emissions/, /tokenized/, /emerging/];
  const stillCrypto = TIER3_PHRASES.filter((re) => crypto.some((c) => c.test(re.source)));
  assert.ok(stillCrypto.length >= 4,
    "the tier3 phrase list no longer looks like inherited crypto vocabulary — re-measure and " +
    "either revive the rule or restate why it stays inactive");
});
