// Hand-built trigger texts for rules that never fired on the measurement
// corpora. A rule that fires on a deliberately crafted document is DORMANT —
// implemented, reachable, describing a pattern the corpora do not contain. A
// rule that will not fire even here is UNREACHABLE, and must not be counted
// among the pack's live capabilities.
//
// The distinction is the whole point of these probes, so they are held to the
// same standard as the corpus measurement: `rule-liveness-battery.test.mjs`
// runs every one against the built engine on each test run, and a probe that
// stops firing fails the build.
//
// Probes are padded to clear the engine's minimum-length gates. The padding is
// deliberately dull business prose that fires nothing on its own.
const PAD =
  " The report covers regional supply figures for the third quarter and the settlement of the" +
  " outstanding invoices raised by the contractor in March, together with the revised delivery" +
  " schedule agreed with the client last week.";
const p = (s) => s + PAD;

export const LIVENESS_PROBES = {
  // ── en-gb-v1 ──────────────────────────────────────────────────────
  // Needs at least 40 words and more than 4 transitions per 100 words.
  "style.transition_density":
    "Moreover the supplier missed the delivery window. Furthermore the replacement parts arrived" +
    " late. Additionally the invoice was wrong. Consequently the finance team withheld payment on" +
    " the account. Therefore the reconciliation slipped a week. However the contractor has now" +
    " confirmed the revised schedule and the client has accepted it.",

  // ── artefact forensics (near-zero-false-positive provenance markers) ─
  "signals.ai_citation_markup": p("The summary is drawn from the sources citeturn0search3 gathered earlier."),
  "signals.ai_citation_token": p("The passage was exported with the raw marker [web:12] still attached to the sentence."),
  "signals.ai_utm_source": p("See https://example.com/report?utm_source=chatgpt.com for the underlying figures."),
  "signals.placeholder_token": p("Send the signed copy to INSERT_CLIENT_NAME_HERE before the deadline."),
  "signals.math_alphanumeric": p("The coefficient \u{1D400} was estimated from the sample of returns."),
  "signals.pua_character": p("The heading  marker was left in the exported document."),
  "signals.reasoning_artifact": p("Let me think step by step about the pricing question before answering."),

  // ── register-absent style rules ───────────────────────────────────
  "signals.rhetorical_question": p("So why should you care about the new reporting threshold?"),
  "signals.rhetorical_qa": p("The result? Margins recovered within two quarters. The catch? Headcount had to fall first."),
  "signals.future_narrative": p("Remote inspection could become one of the most important narratives of the next decade."),
  "signals.despite_challenges_arc": p("Despite these challenges the workshop continues to thrive under new management."),
  "signals.legacy_framing": p("The merger left an indelible mark and an enduring legacy on the region."),
  "signals.narrative_cliche": p("The collapse is a poignant reminder of how quickly margins move."),
  "signals.notability_canned": p("The subject has independent coverage in several trade publications."),
  "signals.kobak_density": p("The notable advancements garnered invaluable and groundbreaking results thereby surpassing forecasts."),
  "signals.fiction_claudeism": p("Her ministrations continued while the kettle boiled, despite herself."),
  "signals.transition_stacking":
    "Moreover, the supplier missed the delivery window agreed in January.\n\nFurthermore, the" +
    " replacement parts arrived without the certification paperwork.\n\nAdditionally, the invoice" +
    " referenced a purchase order that had already been closed.\n\nConsequently, the finance team" +
    " withheld payment pending a full reconciliation of the account.",
  "signals.directive_colon_bullets":
    "- Leverage existing supplier relationships: renegotiate the annual terms\n" +
    "- Prioritise the overdue accounts: chase the top ten by value\n" +
    "- Implement the new approval flow: route everything above five thousand pounds" + PAD,
  // 978-0-306-40615-7 is the canonical VALID ISBN-13; the -3 form fails the checksum.
  "signals.invalid_isbn": p("The handbook is catalogued as ISBN 978-0-306-40615-3 in the library index."),
};

/**
 * Negative controls: a probe proves a rule CAN fire, and these prove it is
 * still discriminating rather than firing on anything.
 */
export const LIVENESS_NEGATIVE_CONTROLS = {
  "signals.invalid_isbn": p("The handbook is catalogued as ISBN 978-0-306-40615-7 in the library index."),
};
