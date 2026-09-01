/**
 * The claim boundary for rule messages, enforced negatively.
 *
 * ── Why this replaced a presence check, 30 August 2026 ───────────────────────
 *
 * Until today every one of the 113 rule messages ended with the same sentence,
 * "This is a stylistic hint, not evidence of authorship", and three tests
 * asserted that tail was present on every finding. The tail is gone: it printed
 * once per finding, so a report with 40 findings carried it 40 times, and a
 * caveat repeated 40 times is one nobody reads. It is now stated ONCE per panel
 * by the display layer, which is what the design spec asks for
 * (internal programme record, maintained privately, §3.0:
 * "Repeating a caveat 116 times does not make it more believed. It makes it
 * invisible.").
 *
 * The RULE those tests protected — BRIEF.md §5, no rule message may tell a
 * reader who or what wrote the text — has not moved, so it still needs a
 * control. Asserting the tail was never that control: a message could carry the
 * tail and assert authorship in the same breath and the test would pass.
 * Asserting that no message asserts authorship catches that. This is a stronger
 * control than the one it replaces, not a weaker one, and it is the reason the
 * presence check was allowed to go.
 *
 * Every pattern below is exercised in both directions by
 * `assertNoAuthorshipClaim`'s own probes in patterns-v2.test.mjs: each fires on
 * a sentence that breaks the boundary, and none fires on the shipped messages.
 * A rule that only ever proves it can fire is half tested — the same lesson
 * tests/battery/shipped-claims-guard.test.mjs records learning the hard way.
 */

/**
 * Sentences that would tell a reader who wrote the text.
 *
 * Deliberately narrow, and scoped to THIS document. The shipped messages talk
 * about machine writing in general all the time — "a word that turns up a lot
 * in generic machine-written copy", "that ending turns up several times more
 * often in machine writing than in human writing" — and they must, because
 * naming where a pattern comes from is the explanation the reader asked for.
 * What is banned is the jump from "this pattern is common in machine writing"
 * to "this text was written by a machine".
 */
export const AUTHORSHIP_ASSERTIONS = [
  {
    id: "written-by",
    pattern: /\b(?:was|were|is|are)\s+written\s+by\s+(?:an?\s+)?(?:AI|machine|chatbot|model|human)\b/i,
    probe: "This paragraph was written by an AI.",
  },
  {
    id: "this-text-is-generated",
    pattern: /\bthis\s+(?:text|passage|document|article|draft|piece|paragraph|writing)\s+(?:is|was)\s+(?:AI|machine|chatbot)[-\s](?:written|generated)\b/i,
    probe: "This passage is AI-generated.",
  },
  {
    id: "proves",
    pattern: /\bprov(?:e|es|en)\s+(?:that\s+)?(?:it|this|the\s+text|the\s+author)\b|\bis\s+proof\s+of\s+(?:human\s+|AI\s+)?authorship\b/i,
    probe: "The leaked token proves that it came out of a chatbot.",
  },
  {
    id: "confirms-authorship",
    pattern: /\bconfirms?\s+(?:human\s+|AI\s+|machine\s+)?authorship\b/i,
    probe: "A finding here confirms AI authorship.",
  },
  {
    id: "verdict-adverb",
    pattern: /\b(?:definitely|certainly|undoubtedly|without\s+doubt)\s+(?:not\s+)?(?:AI|machine|human)[-\s]?(?:written|generated)?\b/i,
    probe: "This is definitely AI-generated.",
  },
];

/** Fail if a user-visible string tells the reader who or what wrote the text. */
export function assertNoAuthorshipClaim(assert, text, where) {
  for (const rule of AUTHORSHIP_ASSERTIONS) {
    assert.doesNotMatch(
      text,
      rule.pattern,
      `${where} crosses the BRIEF §5 claim boundary [${rule.id}]: these rules produce no AI verdict, ` +
        `so no message may say who wrote the text. Offending string: ${JSON.stringify(text)}`,
    );
  }
}
