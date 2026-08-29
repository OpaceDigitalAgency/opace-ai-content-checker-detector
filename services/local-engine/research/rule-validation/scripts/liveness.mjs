// Liveness probe for rules that never fired on the eval corpus.
//
// A rule that never fires on 1,896 samples is either (a) live but describing a
// pattern absent from this corpus, or (b) effectively unreachable — a gate no
// realistic text passes, or a dead regex. Those need opposite actions, so each
// zero-firing rule gets a hand-built text designed to trigger it. If a
// deliberately crafted trigger still does not fire, the rule is a candidate
// for engine review, not merely "absent from the corpus".
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const HERE = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const core = require(join(HERE, "..", "..", "..", "..", "packages", "core", "dist", "index.js"));

const PAD = " The report covers regional supply figures for the third quarter and the settlement of the outstanding invoices raised by the contractor in March, together with the revised delivery schedule agreed with the client last week.";
const p = (s) => s + PAD;

const PROBES = {
  "ai-citation-markup": p("The summary is drawn from the sources citeturn0search3 gathered earlier."),
  "ai-utm-source": p("See https://example.com/report?utm_source=chatgpt.com for the underlying figures."),
  "placeholder-token": p("Send the signed copy to INSERT_CLIENT_NAME_HERE before the deadline."),
  "math-alphanumeric": p("The coefficient \u{1D400} was estimated from the sample of returns."),
  "pua-character": p("The heading  marker was left in the exported document."),
  "generic-conclusion": p("Only time will tell, but the future looks bright for the sector."),
  "reasoning-artifact": p("Let me think step by step about the pricing question before answering."),
  "emotional-flatline": p("What struck me was the size of the variance in the quarterly figures."),
  "lingering-attention": p("I can't stop thinking about the line in the contract about liability."),
  "novelty-inflation": p("Here is what nobody tells you about renewing a commercial lease."),
  "rhetorical-question": p("So why should you care about the new reporting threshold?"),
  "future-narrative": p("Remote inspection could become one of the most important narratives of the next decade."),
  "social-cta-closer": p("This one's worth your time if you handle procurement."),
  "faux-insight": p("Here's the kicker: the supplier had already invoiced for the same work."),
  "narrative-cliche": p("The collapse is a poignant reminder of how quickly margins move."),
  "notability-canned": p("The subject has independent coverage in several trade publications."),
  "legacy-framing": p("The merger left an indelible mark and an enduring legacy on the region."),
  "despite-challenges-arc": p("Despite these challenges the workshop continues to thrive under new management."),
  "fiction-claudeism": p("Her ministrations continued while the kettle boiled, despite herself."),
  "fiction-slop-phrase": p("He took a deep breath, voice barely above a whisper, and signed."),
  "rhetorical-qa": p("The result? Margins recovered within two quarters. The catch? Headcount had to fall first."),
  "directive-colon-bullets": "- Leverage existing supplier relationships: renegotiate the annual terms\n- Prioritise the overdue accounts: chase the top ten by value\n- Implement the new approval flow: route everything above five thousand pounds" + PAD,
  // 978-0-306-40615-7 is the canonical VALID ISBN-13; ...-3 fails the checksum.
  "invalid-isbn": p("The handbook is catalogued as ISBN 978-0-306-40615-3 in the library index."),
  "invalid-isbn/negative-control": p("The handbook is catalogued as ISBN 978-0-306-40615-7 in the library index."),
  "transition-stacking": "Moreover, the supplier missed the delivery window agreed in January.\n\nFurthermore, the replacement parts arrived without the certification paperwork.\n\nAdditionally, the invoice referenced a purchase order that had already been closed.\n\nConsequently, the finance team withheld payment pending a full reconciliation of the account.",
  "liang-cluster": p("The methodical and insightful review was noteworthy, lucid and commendably thorough."),
  "kobak-density": p("The notable advancements garnered invaluable and groundbreaking results thereby surpassing forecasts."),
  "copula-avoidance": p("The unit serves as a hub. The team stands as a partner. The tool functions as a bridge. The board operates as a check."),
  // TIER3_PHRASES is inherited crypto/web3 whitepaper vocabulary, so the probe
  // has to speak that dialect to reach the >=3-distinct-phrase cluster gate.
  "tier3-phrase-cluster": p("The emerging sector rewards the integration of community-driven governance with long-term sustainability and user engagement across the network."),
  "contrast-density": null,
  "mic-drop-paragraph": null,
  "punchline-fragment-density": null,
  "ai-citation-token": p("The passage was exported with the raw marker [web:12] still attached to the sentence."),
};

const out = {};
for (const [cat, text] of Object.entries(PROBES)) {
  if (text === null) { out[cat] = { probe: null, fired: null, note: "no hand-built probe: threshold rule over whole-document rhythm metrics; see RULE-VALIDATION.md" }; continue; }
  let cats = [];
  try { cats = core.inspectSignalsV2(text).map((f) => f.evidence.category); } catch (e) { out[cat] = { fired: null, error: String(e) }; continue; }
  const target = cat.split("/")[0];
  out[cat] = { fired: cats.includes(target), also_fired: [...new Set(cats)].filter((c) => c !== target), probe_words: text.split(/\s+/).length };
}
writeFileSync(join(HERE, "data", "liveness.json"), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(String(v.fired).padEnd(6), k, v.note ?? "");
