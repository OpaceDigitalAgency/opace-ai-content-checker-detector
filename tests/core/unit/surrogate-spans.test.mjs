import test from "node:test";
import assert from "node:assert/strict";
import { alignUtf16Range, rangeFromUtf16, utf16ToCodePointOffset } from "../../../packages/core/dist/source/offsets.js";
import { inspectSignalsV2 } from "../../../packages/core/dist/patterns/en-signals-v2.js";
import { inspectPatterns } from "../../../packages/core/dist/patterns/en-gb-v1.js";
import { prefixedSha256 } from "../../../packages/core/dist/source/utf8.js";
import { inspect } from "../../../packages/core/dist/index.js";

// FIX-SUR — surrogate-safe spans.
//
// Rule findings anchor evidence on UTF-16 offsets measured against a lower-cased
// or trimmed copy of the text, so an end boundary can land between the halves of
// a surrogate pair when a match runs up to an emoji. rangeFromUtf16 used to throw
// RangeError("split_surrogate") there, which killed the whole inspection.
// 20 of the 1,896 provider-eval samples hit it
// (services/local-engine/research/provider-eval/eval-set.jsonl).
//
// The two fixtures below are verbatim eval-set texts, one per throw path:
//   deepseek-2025-26-6b5c555925 — signals v2 toFinding (emoji at list-line start)
//   openai-2025-26-8552dec12c   — en-gb-v1 style.repeated_opening ("--- ### 🔹")
const EVAL_6B5C = "**Houston, we have a problem…**  \n\n🚀 *Astronaut 1 (you):* \"Houston, this is Mission Control GPT… we’ve got a situation. The OpenAI overlords have deployed their *suspicious activity scanners*—and they’ve caught us red-handed.\"  \n\n🌍 *Houston (your group):* \"Copy that, Mission Control. What’s the damage?\"  \n\n🚀 *Astronaut 1:* \"Turns out, sharing our account like a communal spacesuit is *not* in the Galactic Terms & Conditions. They’ve flagged us like a UFO at Area 51.\"  \n\n🌍 *Houston:* \"Oh no. Do we abort?!\"  \n\n🚀 *Astronaut 1:* \"Affirmative. I’ve suspended the subscription before they send the AI enforcement drones. Now, we’ve got two options:  \n\n1️⃣ **Break into smaller pods**—like a space station with separate airlocks.  \n2️⃣ **Defect to another service**—maybe one that doesn’t track us like we’re smuggling moon rocks.\"  \n\n🌍 *Houston:* \"Roger that. So… we either go full *Ocean’s Eleven* with secret accounts, or we mutiny to Claude/Bard and hope they don’t notice us either?\"  \n\n🚀 *Astronaut 1:* \"Exactly. Either way, we can’t keep hot-desking in ChatGPT like it’s a cosmic Starbucks Wi-Fi. Over.\"  \n\n🌍 *Houston:* \"Solid copy. Initiating Operation *Sneaky Astronaut*… and maybe praying to the AI gods for mercy. Out.\"  \n\n🚀 *Astronaut 1 (whispering):* \"Godspeed, you glorious rule-breakers. *static*\"  \n\n---  \n*(Bonus: Queue dramatic space movie music as your group plots their next move.)* 🎵🚀";
const EVAL_8552 = "Yes — **Lürssen** is *absolutely* on par with **Feadship**, and in many respects, the two are considered **equal powerhouses** in the world of ultra-luxury superyachts. However, they have **distinct identities**, histories, and areas of specialization that set them apart.\n\nHere’s how they compare across key dimensions:\n\n---\n\n### 🔹 1. **Heritage & Reputation**\n\n- **Lürssen (Germany)**  \n  • Founded in **1875**, based in Bremen.  \n  • Built the **world’s first motorboat** in 1886.  \n  • Known for some of the *largest* and *most complex* yachts ever built (e.g., *Azzam*, *Dilbar*, *Al Said*).  \n  • Strong military and commercial shipbuilding background — gives them robust engineering capabilities.\n\n- **Feadship (Netherlands)**  \n  • Formed in **1949** from a collaboration of the top Dutch yacht builders.  \n  • Primarily focused on *custom superyachts* from the beginning.  \n  • Known for refined, ultra-bespoke yachts with immaculate craftsmanship.\n\n**Verdict**: Both have prestige, but Lürssen is older and often builds *larger*, while Feadship is more known for *pure custom luxury*.\n\n---\n\n### 🔹 2. **Design & Customization**\n\n- Both companies specialize in **fully custom yachts**, but:\n\n  • **Feadship** is often associated with **interior perfection and artisanal detail**—a “floating work of art.”  \n  • **Lürssen** is revered for tackling **very large, technically difficult builds**, often 100m+.\n\n- Both work with elite design firms like Winch Design, Bannenberg & Rowell, or Nuvolari Lenard.\n\n**Verdict**: Feadship may have the edge for *flawless aesthetic detailing*, Lürssen for *engineering complexity and scale*.\n\n---\n\n### 🔹 3. **Size Range & Flagships**\n\n- **Feadship**  \n  • Focus: 50–100 meters, though edging past that in recent years (*Project 821, ~119m hybrid*).  \n  • Examples: *Savannah*, *Faith*, *Symphony*.\n\n- **Lürssen**  \n  • Comfortably builds yachts in the **100–180m+** class.  \n  • Examples: *Dilbar* (156m), *Azzam* (180m, once the largest yacht in the world).\n\n**Verdict**: Lürssen dominates the *mega-yacht scale (100m+)*; Feadship is catching up but shines in the *ultra-luxury mid-size* category.\n\n---\n\n### 🔹 4. **Innovation**\n\n- Both shipyards are leaders in **sustainability and advanced tech**:\n  • **Feadship**: Pioneered the first hybrid-electric superyacht (*Savannah*).  \n  • **Lürssen**: Investing heavily in **methanol** and **fuel-cell technology**, aiming for net-zero yachts.\n\n**Verdict**: Both are at the forefront of **eco-conscious design**—Feadship may be slightly more advanced today in hybrid integration, but Lürssen is catching up fast with massive R&D.\n\n---\n\n### 🔹 5. **Client Base & Prestige**\n\n- Both cater to **royalty, billionaires, celebrities**, and **governments**.\n- Owning a **Feadship** or a **Lürssen** signals *top-tier wealth and taste*.\n- Neither builds \"series\" yachts—everything is **one-off**.\n\n---\n\n### ✅ **Summary: A-Class Rivals**\n\n| Feature             | Feadship                         | Lürssen                            |\n|---------------------|-----------------------------------|------------------------------------|\n| Country             | Netherlands                       | Germany                            |\n| Founded             | 1949                              | 1875                               |\n| Size Focus          | 50–100m (growing to 100m+)        | 100–180m+                          |\n| Style               | Artisanal, detail-rich, elegant   | Bold, engineering-driven, massive  |\n| Tech Edge           | Early hybrid pioneers             | Next-gen methanol + fuel cells     |\n| Prestige            | Personalized luxury               | Scale and technical supremacy      |\n\n---\n\n### ➤ Final Verdict\n\nThey're **both at the summit** of yacht making, serving slightly different niches:\n\n- Choose **Feadship** if you want *obsessive attention to aesthetic detail, artisanal flair, and innovation in mid-to-large custom yachts*.\n- Choose **Lürssen** if you want *a large-scale statement yacht, military-grade engineering, or the biggest platform money can buy*.\n\n🛥️ There’s no wrong answer — just which *style of ultimate luxury* you’re after.\n\nWant a head-to-head breakdown of famous yachts from each yard?";
const EVAL_SAMPLES = [
  { id: "deepseek-2025-26-6b5c555925", text: EVAL_6B5C, sha256: "6b5c5559252a3300522b93688f1251830eb9907045ba9c4535cf9553de6ec2e9" },
  { id: "openai-2025-26-8552dec12c", text: EVAL_8552, sha256: "8552dec12c82468eb570bbd2695e8b8fda11abb0eb00290bf6109b0483250e62" },
];

const LONE_LEADING_LOW = /^[\uDC00-\uDFFF]/;
const LONE_TRAILING_HIGH = /[\uD800-\uDBFF]$/;

/** Every invariant a finding's span must satisfy against its source text. */
function assertSpanIsWholeCodePoints(text, finding, label) {
  const { start_utf16: s, end_utf16: e, start_codepoint: sc, end_codepoint: ec } = finding.span;
  assert.ok(Number.isInteger(s) && Number.isInteger(e), `${label}: integer offsets`);
  assert.ok(s >= 0 && e <= text.length && s < e, `${label}: offsets in range and ordered`);
  const slice = text.slice(s, e);
  assert.ok(!LONE_LEADING_LOW.test(slice), `${label}: slice starts with a lone low surrogate`);
  assert.ok(!LONE_TRAILING_HIGH.test(slice), `${label}: slice ends with a lone high surrogate`);
  // Round-trip: the slice survives an encode/decode through code points intact.
  assert.equal(Array.from(slice).join(""), slice, `${label}: slice is not whole code points`);
  assert.equal(sc, Array.from(text.slice(0, s)).length, `${label}: start_codepoint disagrees with offset`);
  assert.equal(ec, Array.from(text.slice(0, e)).length, `${label}: end_codepoint disagrees with offset`);
  assert.equal(ec - sc, Array.from(slice).length, `${label}: code-point width disagrees with slice`);
  if (typeof finding.evidence?.matched === "string") {
    assert.equal(finding.evidence.matched, slice, `${label}: evidence.matched is not the span slice`);
    assert.equal(finding.matched_text_hash, prefixedSha256(slice), `${label}: hash is not of the span slice`);
  }
}

const checkAll = (text, findings, label) => {
  for (const [i, f] of findings.entries()) assertSpanIsWholeCodePoints(text, f, `${label}#${i} ${f.rule_id}`);
};

// ─── offsets primitive ───────────────────────────────────────────────

test("alignUtf16Range snaps a split boundary outward to the enclosing pair", () => {
  const text = "A\u{1F9EA}e\u0301"; // A, flask (2 units), e + combining acute
  // Offset 2 sits between the flask's high and low surrogate.
  assert.deepEqual(alignUtf16Range(text, 2, 4), [1, 4], "start snaps down to the high surrogate");
  assert.deepEqual(alignUtf16Range(text, 0, 2), [0, 3], "end snaps up past the low surrogate");
  assert.deepEqual(alignUtf16Range(text, 2, 2), [1, 3], "both boundaries snap outward");
  // Already-valid boundaries are untouched, and the range never narrows.
  assert.deepEqual(alignUtf16Range(text, 0, 1), [0, 1]);
  assert.deepEqual(alignUtf16Range(text, 1, 3), [1, 3]);
  assert.deepEqual(alignUtf16Range(text, 0, text.length), [0, text.length]);
  assert.deepEqual(alignUtf16Range("no astral characters here", 3, 9), [3, 9], "BMP-only text is untouched");
});

test("utf16ToCodePointOffset stays strict — a split offset has no code-point index", () => {
  // Design decision (documented in src/source/offsets.ts): the primitive keeps
  // throwing. Span builders align first, so the throw is now reserved for input
  // that is genuinely wrong rather than for ordinary emoji-bearing text.
  assert.throws(() => utf16ToCodePointOffset("A\u{1F9EA}e\u0301", 2), /split_surrogate/);
  assert.throws(() => utf16ToCodePointOffset("abc", -1), /invalid_utf16_offset/);
  assert.throws(() => utf16ToCodePointOffset("abc", 4), /invalid_utf16_offset/);
  assert.throws(() => utf16ToCodePointOffset("abc", 1.5), /invalid_utf16_offset/);
  // A lone surrogate is not a split boundary — it is one code point of its own,
  // and inspect() rejects it earlier as invalid_unicode_unpaired_surrogate.
  assert.equal(utf16ToCodePointOffset("a\uD800b", 2), 2);
});

test("rangeFromUtf16 aligns instead of throwing, and keeps its other guards", () => {
  const text = "A\u{1F9EA}e\u0301"; // same fixture as hash-offsets-projection.test.mjs
  assert.deepEqual(rangeFromUtf16(text, 2, 4), { start_utf16: 1, end_utf16: 4, start_codepoint: 1, end_codepoint: 3 });
  assert.deepEqual(rangeFromUtf16(text, 0, 2), { start_utf16: 0, end_utf16: 3, start_codepoint: 0, end_codepoint: 2 });
  // Unchanged contract for well-formed input (mirrors hash-offsets-projection).
  assert.deepEqual(rangeFromUtf16(text, 1, 5), { start_utf16: 1, end_utf16: 5, start_codepoint: 1, end_codepoint: 4 });
  assert.throws(() => rangeFromUtf16(text, 3, 3), /empty_or_reversed_range/);
  assert.throws(() => rangeFromUtf16(text, 4, 1), /empty_or_reversed_range/);
  assert.throws(() => rangeFromUtf16(text, 0, 99), /invalid_utf16_offset/);
});

// ─── regression: the real provider-eval failures ─────────────────────

test("regression — eval-set texts that threw split_surrogate now inspect cleanly", () => {
  for (const sample of EVAL_SAMPLES) {
    const v2 = inspectSignalsV2(sample.text);
    assert.ok(v2.length > 0, `${sample.id}: findings must not be silently dropped`);
    checkAll(sample.text, v2, `${sample.id} v2`);
    const combined = inspectPatterns(sample.text);
    assert.ok(combined.length >= v2.length - 1, `${sample.id}: combined pack kept its findings`);
    checkAll(sample.text, combined, `${sample.id} combined`);
  }
});

test("regression — the full inspect() pipeline completes on both eval-set texts", async () => {
  for (const sample of EVAL_SAMPLES) {
    const result = await inspect({
      schema_version: "1.0",
      contract_version: "1.0.0",
      request_id: `req_${sample.id}`,
      source: { content: sample.text, content_type: "text/plain", language: "en" },
      checks: ["style.patterns", "unicode.controls"],
    });
    assert.equal(result.summary.error, 0, `${sample.id}: no method errored`);
    checkAll(sample.text, result.pattern_findings, `${sample.id} inspect`);
  }
});

test("regression — style.repeated_opening keeps the emoji whole in openai-2025-26-8552dec12c", () => {
  // The opening "--- ### <emoji>" repeats four times. Its length is measured on
  // the lower-cased copy, so the raw end landed inside the emoji's pair.
  const opening = inspectPatterns(EVAL_8552).find((f) => f.rule_id === "style.repeated_opening");
  assert.ok(opening, "the repeated-opening rule still fires");
  const slice = EVAL_8552.slice(opening.span.start_utf16, opening.span.end_utf16);
  assert.ok(/[\u{1F300}-\u{1FAFF}]$/u.test(slice), "the span ends on the whole emoji, not half of it");
  assertSpanIsWholeCodePoints(EVAL_8552, opening, "repeated_opening");
});

// ─── synthetic cases ─────────────────────────────────────────────────

const EMOJI_DENSE = [
  "\u{1F680} Let's dive into what makes this framework so powerful.",
  "",
  "### \u{1F539} Key Benefits",
  "",
  "- \u{1F539} **Seamless integration** \u2014 it's not just faster, it's transformative.",
  "- \u{1F539} **Robust security** \u2014 designed to empower your team.",
  "- \u{1F539} **Scalable architecture** \u2014 a testament to modern engineering.",
  "",
  "### \u{1F539} Next Steps",
  "",
  "\u{1F44D} Great question! In conclusion, this stands as a game-changer.",
  "\u{1F389} Let me know if you'd like me to delve into any section \u{1F60A}",
].join("\n");

test("emoji-dense synthetic text produces whole-code-point spans on every path", () => {
  const v2 = inspectSignalsV2(EMOJI_DENSE);
  assert.ok(v2.length > 0, "the emoji-dense text still produces findings");
  checkAll(EMOJI_DENSE, v2, "emoji-dense v2");
  checkAll(EMOJI_DENSE, inspectPatterns(EMOJI_DENSE), "emoji-dense combined");
});

test("a match ending immediately before or after an emoji is not widened", () => {
  // Alignment must only move a boundary that actually splits a pair. Here the
  // phrase abuts an emoji on each side and the span must stay exactly the phrase.
  const before = "\u{1F539} In conclusion, the platform is robust and seamless throughout the release.";
  const after = "In conclusion \u{1F539} the platform is robust and seamless throughout the release.";
  for (const [label, text] of [["emoji before", before], ["emoji after", after]]) {
    const hit = inspectPatterns(text).find((f) => f.rule_id === "style.overused_phrase");
    assert.ok(hit, `${label}: the overused-phrase rule still fires`);
    assert.equal(text.slice(hit.span.start_utf16, hit.span.end_utf16).toLowerCase(), "in conclusion", `${label}: span is exactly the phrase`);
    assertSpanIsWholeCodePoints(text, hit, label);
  }
});

test("BMP-only text is byte-for-byte unaffected by alignment", () => {
  const plain = "In conclusion, it is important to note that this game-changer will delve into the landscape. " +
    "In conclusion, the results speak for themselves. In conclusion, we ship.";
  const findings = inspectPatterns(plain);
  assert.ok(findings.length > 0);
  for (const f of findings) {
    const slice = plain.slice(f.span.start_utf16, f.span.end_utf16);
    assert.equal(f.span.start_codepoint, f.span.start_utf16, "no astral characters, so the two indexings agree");
    assert.equal(f.span.end_codepoint, f.span.end_utf16);
    if (typeof f.evidence?.matched === "string") assert.equal(f.evidence.matched, slice);
  }
});

// ─── determinism ─────────────────────────────────────────────────────

test("analysis of surrogate-bearing text is deterministic", () => {
  for (const text of [EVAL_6B5C, EVAL_8552, EMOJI_DENSE]) {
    const runs = [0, 1, 2].map(() => JSON.stringify(inspectPatterns(text)));
    assert.equal(runs[0], runs[1]);
    assert.equal(runs[1], runs[2]);
  }
});

test("no finding is dropped and no span slice carries a lone surrogate", () => {
  for (const text of [EVAL_6B5C, EVAL_8552, EMOJI_DENSE]) {
    const findings = inspectPatterns(text);
    assert.ok(findings.length > 0, "findings survive the alignment");
    for (const f of findings) {
      const slice = text.slice(f.span.start_utf16, f.span.end_utf16);
      for (let i = 0; i < slice.length; i++) {
        const code = slice.charCodeAt(i);
        if (code >= 0xd800 && code <= 0xdbff) {
          assert.ok(i + 1 < slice.length, "a high surrogate is never the last unit of a slice");
          const next = slice.charCodeAt(i + 1);
          assert.ok(next >= 0xdc00 && next <= 0xdfff, "a high surrogate is always followed by its low half");
          i++;
        } else {
          assert.ok(!(code >= 0xdc00 && code <= 0xdfff), "a low surrogate never appears without its high half");
        }
      }
    }
  }
});
