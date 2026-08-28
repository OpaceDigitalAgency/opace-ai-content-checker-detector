// en-signals 2026.08.3 harvest-merge tests.
//
// Covers the rules added from the 2026.08 research harvest
// (research/AI-TELLS-MEGA-PACK.md, ai-tells-pack-seed.json tells-seed:2026.08.1,
// research/OWNER-DOCS-TELLS.md): every new rule fires on a crafted positive
// fixture and stays silent on the human control; the artefact battery covers
// each leaked-token type with its model attribution; the SEO-template and
// non-native-style guard fixtures encode the harvest's binding false-positive
// corrections; classification==argmax, determinism and the perf budget hold
// across the enlarged pack.
import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { inspectSignalsV2, computeEditorialSignals, EN_SIGNALS_PATTERN_VERSION } from "../../../packages/core/dist/patterns/en-signals-v2.js";
import { EXCLUDED_TELLS, CORROBORATION_CATEGORIES, RULE_ERA } from "../../../packages/core/dist/patterns/en-signals-v3-data.js";

// Human control (fixture E) — byte-identical to the v0.1-REVIEW control.
const HUMAN_CONTROL =
  "We moved the printer to the back office on Tuesday because the hallway socket kept tripping. " +
  "Dave from accounts complained, obviously. The replacement toner arrives Thursday; until then use the one upstairs. " +
  "If the tray jams again, ring Sharon on extension 42 rather than forcing it.";

// One crafted positive fixture per new 2026.08.3 rule. Each must fire its own
// rule AND stay silent on the human control (asserted below).
const POSITIVE_FIXTURES = {
  "signals.ai_citation_token":
    "The study found strong results grok_render_citation_card_json in the set citeturn0search2 with a file at https://ppl-ai-file-upload.s3.amazonaws.com/report.pdf and refs 【12†L34-L38】 plus [cite: 4] markers throughout the appendix pages.",
  "signals.reasoning_leak":
    "The user wants a persuasive summary, so the copy below keeps the tone light while covering every requirement from the planning meeting notes in detail.",
  "signals.placeholder_token":
    "Please contact INSERT_SOURCE_URL before the meeting and drop the clip at PASTE_YOUTUBE_VIDEO_URL_HERE so the editors can confirm the agenda in advance.",
  "signals.pua_character":
    "The exported draft still carries a stray  marker character in the middle of the second paragraph, which the editor spotted before publication.",
  "signals.math_alphanumeric":
    "Our team announced \u{1D5E7}\u{1D5F2}\u{1D605}\u{1D601} styling in the launch post yesterday and several readers noticed it immediately across every platform we publish on regularly.",
  "signals.arrow_decoration":
    "The pipeline runs plan → draft → review → publish for every article, and the workflow board mirrors those stages for the whole editorial team.",
  "signals.escaped_markup_literal":
    "The page still shows a literal &nbsp; between the words where the chat export left it, which the proofreader flagged on the first pass.",
  "signals.neg_parallelism":
    "The new office is not just bigger, but also brighter for everyone. The move was not only overdue, but also essential for morale after last winter.",
  "signals.tripled_negation":
    "Not hype. Not spin. Just results you can measure every single quarter, tracked in the open dashboard we publish for customers and staff alike.",
  "signals.despite_challenges_arc":
    "Despite these challenges, the bakery continues to thrive in its second decade of serving the town from the same corner premises every morning.",
  "signals.metaphor_cluster":
    "The project is a testament to the team and reflects the rich tapestry of local history in the ever-evolving landscape of regional publishing.",
  "signals.participial_tail":
    "Sales rose in March, highlighting the strength of the brand. The team expanded to Leeds, underscoring its ambition for growth. Costs fell again, reflecting tighter procurement discipline across the group.",
  "signals.focal_density":
    "The report delves into pivotal findings, showcasing meticulous analysis and groundbreaking advancements across every intricate section of the appendix.",
  "signals.owner_phrase":
    "Look no further: our comprehensive suite of tailored solutions will unlock your full potential this year. Take action now and see the difference.",
  "signals.power_verb_compound":
    "We help teams leverage a robust platform and ensure seamless delivery for clients, which is why the programme keeps growing every quarter without pause.",
  "signals.outcome_tail":
    "We rolled the update out slowly across regions, leading to improved stability for every customer on the platform during the busiest retail weeks.",
  "signals.conclusion_cta":
    "In conclusion, by following these steps you can significantly boost your search visibility this quarter and keep the gains through the January sales.",
  "signals.liang_cluster":
    "It is a versatile, insightful and methodical piece of work with profound and intriguing implications for the committee reviewing it this autumn.",
  "signals.kobak_density":
    "It is a notable, unparalleled and invaluable contribution, thereby culminating in surpassing results that the panel acknowledged in its closing statement.",
  "signals.promo_travel":
    "Set in the heart of the old town, this treasure trove of breathtaking views is a must-visit for anyone passing through the region in spring.",
  "signals.pivotal_role":
    "The council plays a crucial role in shaping local transport policy each year for residents across the district and the surrounding villages.",
  "signals.legacy_framing":
    "It was a pivotal moment that left an indelible mark and an enduring legacy on the sport, according to the tribute published this weekend.",
  "signals.notability_canned":
    "She has been profiled in multiple outlets and maintains an active social media presence today, according to the biography section of the site.",
  "signals.buzzword_phrase":
    "We harness the power of automation and stay at the forefront of the industry each season, according to the brochure the sales team hands out.",
  "signals.faux_insight":
    "Here's what nobody tells you about mortgages before you sign the final paperwork at the bank on completion day with your solicitor present.",
  "signals.rhetorical_qa":
    "The result? A faster site for every visitor. The catch? Slightly higher hosting bills for the busiest months of the year, which finance accepted.",
  "signals.didactic_note":
    "It's important to understand the risks involved before starting, and remember that individual results may vary considerably between different households.",
  "signals.narrative_cliche":
    "He faced numerous challenges and found a newfound sense of purpose after the move to Leeds, the profile says in its closing paragraphs.",
  "signals.valuable_insights":
    "The survey provides valuable insights into shopper behaviour, and the key takeaway is clear enough for retailers planning the spring season ranges.",
  "signals.copula_avoidance":
    "The hall serves as a venue. The annex functions as a cafe. The tower stands as a landmark. The barn operates as a gallery for artists most weekends.",
  "signals.bold_label_bullets":
    "The review covered three areas in the sprint notes today.\n\n- **Speed:** loads fast on rural connections\n- **Cost:** cheap to run month to month\n- **Support:** answered quickly by real people\n",
  "signals.emoji_decoration":
    "The launch notes cover the following areas for the week.\n\n## 🚀 Launch\n\nShipping begins Monday morning.\n\n## ✅ Checklist\n\nFinal reviews are due Friday.\n\n## 💡 Ideas\n\nSend suggestions to the board.\n",
  "signals.heading_inflation":
    "## Overview\n\nThe project started in March after the parish council approved the budget for the community hall repairs.\n\n" +
    "## Background\n\nFunding arrived late because the grant body asked for a second structural survey of the roof.\n\n" +
    "## Approach\n\nWe hired two local builders and agreed a fixed price covering materials, scaffolding and waste removal.\n\n" +
    "## Conclusion\n\nThe roof was finished nine days early and the hall reopened before the summer fete.\n",
  "signals.staccato_fragments":
    "It works. It scales. It lasts. The team spent two years proving that claim with production deployments across three continents and hundreds of clients.",
  "signals.tricolon_density":
    "We plan, build, and ship. We test, learn, and adapt. We hire, train, and retain. We measure, report, and improve every single quarter.",
  "signals.transition_stacking":
    "Moreover, the quarterly results improved beyond the forecast.\n\nFurthermore, operating costs fell for the third consecutive period.\n\nAdditionally, the support team grew by four new hires.",
  "signals.quote_inconsistency":
    "The chairman said “the deal is done” and later added “nothing changes” while the press release quoted him saying \"we move on\" and \"the plan holds\".",
  "signals.token_cutoff":
    Array(12).fill("The committee reviewed the budget figures line by line during the extended session on Thursday afternoon.").join(" ") +
    " After the final vote the treasurer began to explain that the remaining funds would be allocated to",
  "signals.setup_expansion_cadence":
    "The answer is simple. The platform, the scope, the migration plan and the support requirements together determine the actual cost of the project. " +
    "The fix is quick. A single configuration change in the deployment pipeline removes the delay that customers reported during the busy period. " +
    "The risk is real. Skipping the review stage has produced three separate outages this year according to the incident log kept by the platform team. " +
    "The choice is yours. Both suppliers can deliver the hardware before the deadline provided the order is confirmed by the end of the month.",
  "signals.passive_ratio":
    "The report was written by the finance team. The figures were checked by two auditors. The summary was approved by the board. " +
    "The launch was delayed by the weather. The invoices were paid by the client. The contract was signed by both parties. " +
    "The website was updated by the agency. The photos were taken by a local firm. The venue was booked by the assistant. The minutes were recorded by the secretary.",
  "signals.low_specificity":
    Array(14).fill(
      "the approach delivers meaningful outcomes for stakeholders across the organisation, and the framework supports ongoing alignment between teams while enabling flexible collaboration around shared priorities and evolving goals for the wider community of practice"
    ).join(". ") + ".",
  "signals.adjacent_lemma_repeat":
    "The platform improves the workflow. The platform reduces manual workflow steps. The platform reports on workflow progress. The platform archives completed workflow items. " +
    "The platform notifies the workflow owners. The platform schedules the workflow reviews. The platform exports the workflow history. The platform secures the workflow records. " +
    "The platform audits the workflow changes. The platform documents the workflow rules. The platform validates the workflow inputs.",
  "signals.fiction_claudeism":
    "Her ministrations continued in silence as he chuckled darkly at the letter, and despite herself she smiled at the sound from across the dim room.",
  "signals.fiction_promptonym":
    "Elara Voss stepped into the clearing near the Whispering Woods just after dawn with her satchel of maps and the letter from the village elder.",
  "signals.fiction_slop_phrase":
    "She took a deep breath, her voice barely above a whisper, and the room fell silent as the verdict was read to the assembled family.",
  "signals.owner_phrase_b":
    "Consulting with a professional will shed light on the options available to most homeowners today before any structural work begins on the property.",
  "signals.owner_vocab_b":
    "The essence of the plan has many facets that the folks in accounts already understand well from the previous round of budget meetings.",
  "signals.directive_colon_bullets":
    "The checklist for the migration weekend covers the following items.\n\n- Ensure backups run nightly: check the log each morning\n- Optimise images before upload: use the batch tool\n- Plan for scalability: pick the larger tier now\n",
  "signals.teach_preach_headings":
    "## Why it matters\n\nThe change affects every invoice the firm issues from April onwards.\n\n## Key takeaways\n\nSubmit the forms early and keep copies of everything.\n",
  "signals.by_ving_template":
    "By planning the rollout early, you can avoid surprises. By testing each release, you can catch regressions before customers notice anything at all.",
  "signals.invalid_isbn":
    "The first book (ISBN 978-0-306-40615-7) checks out, but the second citation lists ISBN 978-0-306-40615-9 which fails its checksum entirely.",
  "signals.proximity_cluster":
    "The pivotal decision came quickly that morning, and another pivotal choice followed the very next day for the board and its advisers in London.",
};

// SEO/AEO-template guard (binding correction, AI-TELLS-MEGA-PACK §5 tier C:
// str-question-headings / str-uniform-faq). Question headings with uniform
// direct answers are deliberately TAUGHT to human SEO writers — this shape
// alone must never reach ai_like.
const SEO_TEMPLATE_PAGE = [
  ["## What does the service cost?",
    "The standard plan costs forty pounds each month and covers two shops, and every extra shop after that adds ten pounds to the monthly invoice you receive."],
  ["## How long does setup take?",
    "Most shops finish setup in under an hour with the guided checklist, and the longest recorded case took an afternoon because of an unusual stock format."],
  ["## Can I cancel at any time?",
    "Yes, you can cancel from the billing page whenever you like, and the service stays active until the end of the month you have already paid for."],
  ["## Does it work with my till?",
    "The service connects to the four most common till systems sold in Britain, and the support team maintains a current list of tested models on the site."],
  ["## Who do I call for help?",
    "Support answers the phone from eight until six on weekdays, and outside those hours the answering service logs the call for the first agent free next morning."],
].map(([q, a]) => `${q}\n\n${a}`).join("\n\n");

// Non-native-style plain guard (binding correction: the Stanford TOEFL
// finding — uniform, formal, simple sentences are exactly what genuine
// non-native writers produce and must stay human_like).
const NON_NATIVE_CONTROL =
  "The internet is very important for education in my country. Many students use the internet every day for their homework. " +
  "Moreover, the teachers also use online materials in the classroom. The government made a program to give computers to schools. " +
  "My cousin received a computer from this program last year. He uses it to study mathematics and English in the evening. " +
  "The connection in the village is sometimes slow. The students go to the library when the connection does not work. " +
  "I think this program helps many families. The education becomes better when everyone can use the internet.";

const ALL_FIXTURES = [
  ...Object.values(POSITIVE_FIXTURES),
  HUMAN_CONTROL, SEO_TEMPLATE_PAGE, NON_NATIVE_CONTROL,
];

test("every 2026.08.3 rule fires on its crafted positive fixture", () => {
  for (const [rule, text] of Object.entries(POSITIVE_FIXTURES)) {
    const ids = new Set(inspectSignalsV2(text).map((f) => f.rule_id));
    assert.ok(ids.has(rule), `${rule} did not fire on its fixture; got: ${[...ids].join(", ") || "(none)"}`);
  }
});

test("every 2026.08.3 rule stays silent on the human control", () => {
  const ids = new Set(inspectSignalsV2(HUMAN_CONTROL).map((f) => f.rule_id));
  for (const rule of Object.keys(POSITIVE_FIXTURES)) {
    assert.ok(!ids.has(rule), `${rule} false-positives on the human control`);
  }
  const result = computeEditorialSignals(HUMAN_CONTROL);
  assert.equal(result.classification, "human_like");
  assert.equal(inspectSignalsV2(HUMAN_CONTROL).filter((f) => f.severity === "high").length, 0);
});

test("artefact battery — each leaked-token type is detected with its model attribution", () => {
  const cases = [
    ["【12†L34-L38】", "deepseek"],
    ["grok_render_citation_card_json", "grok"],
    ["https://ppl-ai-file-upload.s3.amazonaws.com/report.pdf", "perplexity"],
    ["[cite: 7]", "gemini"],
    ["citeturn0search4", "chatgpt"],
  ];
  for (const [token, attribution] of cases) {
    const text = `The article body carries the leaked marker ${token} in the middle of an otherwise ordinary paragraph about the launch.`;
    const hits = inspectSignalsV2(text).filter((f) => f.rule_id === "signals.ai_citation_token");
    assert.ok(hits.length >= 1, `no ai_citation_token finding for ${token}`);
    assert.equal(hits[0].severity, "high", `${token} must be high severity`);
    assert.equal(hits[0].evidence.attribution, attribution, `${token} must attribute ${attribution}`);
    assert.match(hits[0].message, /not proof of authorship/i, "artefact messages keep the claim boundary");
  }
  // Math-bold and classic placeholder round out the battery.
  const mathHits = inspectSignalsV2(POSITIVE_FIXTURES["signals.math_alphanumeric"]);
  assert.ok(mathHits.some((f) => f.rule_id === "signals.math_alphanumeric" && f.severity === "high"));
  const placeholder = inspectSignalsV2("Dear [Your Name], thanks for subscribing to the newsletter this month and welcome aboard the programme.");
  assert.ok(placeholder.some((f) => f.rule_id === "signals.ai_placeholder"), "[Your Name] must fire signals.ai_placeholder");
});

test("SEO-template page (question headings + uniform FAQ) never reaches ai_like on structure alone", () => {
  const result = computeEditorialSignals(SEO_TEMPLATE_PAGE);
  assert.equal(result.status, "scored");
  assert.notEqual(result.classification, "ai_like",
    `SEO/AEO-taught structure must not read as AI: got ${result.classification} (score ${result.score})`);
  const high = inspectSignalsV2(SEO_TEMPLATE_PAGE).filter((f) => f.severity === "high");
  assert.equal(high.length, 0, `structure-only page produced high findings: ${high.map((f) => f.rule_id).join(", ")}`);
});

test("non-native-style plain prose stays human_like (TOEFL false-positive guard)", () => {
  const result = computeEditorialSignals(NON_NATIVE_CONTROL);
  assert.equal(result.status, "scored");
  assert.equal(result.classification, "human_like",
    `non-native-style control misclassified: ${result.classification} (score ${result.score}, categories ${result.categoriesHit.join(",")})`);
  const high = inspectSignalsV2(NON_NATIVE_CONTROL).filter((f) => f.severity === "high");
  assert.equal(high.length, 0, `high findings on non-native control: ${high.map((f) => f.rule_id).join(", ")}`);
});

test("stylometric measurements alone cannot dominate the score", () => {
  // Passive + adjacent-repeat + flatline shaped text with no phrase tells:
  // multiple stylometric rules fire, yet the capped score must stay short of
  // an ai_like verdict (AI-TELLS-MEGA-PACK §6 correction).
  const styloOnly = POSITIVE_FIXTURES["signals.adjacent_lemma_repeat"];
  const result = computeEditorialSignals(styloOnly);
  assert.notEqual(result.classification, "ai_like",
    `stylometrics-only text must not reach ai_like: score ${result.score}, categories ${result.categoriesHit.join(",")}`);
});

test("every finding carries era metadata; tier B findings carry corroboration", () => {
  for (const text of ALL_FIXTURES) {
    for (const f of inspectSignalsV2(text)) {
      assert.ok(["2023", "2024-25", "2025-26", "evergreen"].includes(f.evidence.era),
        `${f.rule_id} missing/invalid era: ${f.evidence.era}`);
      const category = f.evidence.category;
      if (CORROBORATION_CATEGORIES.has(category)) {
        assert.equal(f.evidence.corroboration, true, `${f.rule_id} must carry corroboration: true`);
        assert.ok(f.severity === "low" || f.severity === "note", `${f.rule_id} tier B must stay low severity, got ${f.severity}`);
      }
      assert.match(f.message, /not (evidence|proof) of authorship/i,
        `${f.rule_id} message must keep the BRIEF §5 claim boundary`);
      assert.equal(f.rule_version, EN_SIGNALS_PATTERN_VERSION);
    }
  }
  // The em-dash rule carries the post-2025 Claude-attribution nuance.
  const dashy = "The launch went well — better than expected. The team shipped early — a rare thing here. Costs stayed flat — procurement helped. The client signed off — twice, in fact. Next quarter looks similar — perhaps busier.";
  const dash = inspectSignalsV2(dashy).find((f) => f.rule_id === "signals.em_dash_density");
  assert.ok(dash, "em-dash fixture must still fire");
  assert.equal(dash.evidence.attribution, "claude");
  assert.match(dash.message, /Claude/i, "em-dash message must state the post-2025 attribution nuance");
});

test("version bumped and excluded tells are documented for audit", () => {
  // 2026.08.5: measured-stylometrics + owner-rhythm pack (see patterns-v4.test.mjs).
  assert.equal(EN_SIGNALS_PATTERN_VERSION, "en-signals:2026.08.5");
  assert.ok(Array.isArray(EXCLUDED_TELLS) && EXCLUDED_TELLS.length >= 50,
    `EXCLUDED_TELLS must document the tier C harvest, got ${EXCLUDED_TELLS.length}`);
  const ids = new Set(EXCLUDED_TELLS.map((t) => t.id));
  for (const required of ["str-question-headings", "str-uniform-faq", "sty-low-perplexity", "sty-hedging-reversal", "sty-machine-cleanliness", "sty-anti-tells"]) {
    assert.ok(ids.has(required), `${required} must be recorded as excluded`);
  }
  for (const t of EXCLUDED_TELLS) {
    assert.ok(typeof t.id === "string" && t.id.length > 0);
    assert.ok(typeof t.reason === "string" && t.reason.length >= 20, `${t.id} needs a substantive reason`);
  }
  // Era table sanity: every era entry uses the closed vocabulary.
  for (const [cat, info] of Object.entries(RULE_ERA)) {
    assert.ok(["2023", "2024-25", "2025-26", "evergreen"].includes(info.era), `${cat} era invalid`);
  }
});

test("no naive hedging rule exists (binding research correction)", () => {
  // Ordinary hedged human prose — perhaps/might/maybe — must not fire any
  // hedging-named rule; only the specific modal+adverb stack ships.
  const hedged = "Perhaps the schedule will slip a little. We might need another week, and maybe two if the parts arrive late from the supplier again.";
  const ids = inspectSignalsV2(hedged).map((f) => f.rule_id);
  assert.equal(ids.filter((r) => /hedg/.test(r) && r !== "signals.hedge_stack" && r !== "signals.parenthetical_hedge").length, 0);
  assert.ok(!ids.includes("signals.hedge_stack"), "plain hedges must not fire the modal+adverb stack rule");
});

test("argmax-base invariant: classification equals argmax unless a named escalation raised it", () => {
  // 2026.08.4: argmax(probabilities) remains the BASE classification. The
  // published classification may only diverge upward, and only when
  // escalation.applied names the documented rule that raised it.
  const RANK = { human_like: 0, mixed_signals: 1, ai_like: 2 };
  for (const text of ALL_FIXTURES) {
    const r = computeEditorialSignals(text);
    const p = r.probabilities;
    const argmax = p.human_like >= p.mixed_signals && p.human_like >= p.ai_like
      ? "human_like"
      : p.mixed_signals >= p.ai_like ? "mixed_signals" : "ai_like";
    if (r.escalation.applied === null) {
      assert.equal(r.classification, argmax,
        `no escalation, yet classification ${r.classification} contradicts probabilities ${JSON.stringify(p)} for: ${text.slice(0, 60)}`);
    } else {
      assert.ok(RANK[r.classification] > RANK[argmax],
        `escalation ${r.escalation.applied} must RAISE the argmax base (${argmax} -> ${r.classification}) for: ${text.slice(0, 60)}`);
      assert.ok(typeof r.escalation.reason === "string" && r.escalation.reason.length >= 20,
        "an applied escalation must carry a substantive reason");
    }
  }
});

test("analysis is deterministic across the v3 fixture set", () => {
  for (const text of ALL_FIXTURES) {
    assert.deepEqual(inspectSignalsV2(text), inspectSignalsV2(text));
    assert.deepEqual(computeEditorialSignals(text), computeEditorialSignals(text));
  }
});

// ── 2026.08.4 escalation policy (research/REAL-WORLD-EVAL-2026-08.md §4a) ──
// Fixtures distilled from the evaluation evidence: artefact-bearing samples
// (opace-openai-004/-005/-008, the Medium oaicite pages) were scoring above
// every human control yet staying human_like. The five safe escalations must
// now use that evidence — and every human fixture must stay human_like with
// escalation.applied === null.

const ESCALATION_FIXTURES = {
  // Distils opace-openai-004/-005/-008: oaicite/contentReference markup plus a
  // leaked citation token in one document — unstripped ChatGPT export residue.
  citationCoOccurrence:
    "The migration guide was pasted straight from the chat window, so the references still read contentReference[oaicite:0]{index=0} in the middle of the second paragraph and a stray citeturn0search2 token survives at the end of the third, which the editor missed before the page went live on Monday morning.",
  // Single utm fingerprint in otherwise plain long prose: artefact floor only
  // (score stays below the artefact_score gate of 10).
  singleUtm: (() => {
    const filler =
      "The parish council met on Tuesday evening in the village hall to discuss the resurfacing of the lane behind the school. Fourteen residents attended and most spoke about drainage. The clerk read the surveyor's letter aloud and answered questions about the timetable for the works. Funding comes from the county highways budget with a small parish contribution agreed last year. The chair thanked the volunteers who cleared the ditch in March and asked for names for the summer rota. ";
    return filler + filler + "Full minutes are on the notice board and online at https://example.org/minutes?utm_source=chatgpt.com for anyone who missed the meeting.";
  })(),
  // Artefact hit with score >= 10 in short text: mixed_signals at medium
  // confidence minimum.
  artefactScore:
    "The user wants a persuasive summary, so the copy keeps the tone light while covering each requirement from the planning notes in order, and the draft below was approved by the committee on Thursday for the spring newsletter.",
  // Distils opace-openai-006: chat-export formatting furniture (emoji
  // headings + heading inflation + bold-label bullets), no artefact tokens.
  formattingCluster:
    "The weekly notes cover the release in the sections below for the team.\n\n" +
    "## 🚀 Launch\n\nShipping begins Monday for the two pilot shops.\n\n" +
    "## ✅ Checklist\n\nFinal reviews are due on Friday afternoon.\n\n" +
    "## 💡 Ideas\n\nSend suggestions to the product board.\n\n" +
    "## 📈 Metrics\n\nSign-ups doubled during the trial fortnight.\n\n" +
    "- **Speed:** loads fast on rural connections\n" +
    "- **Cost:** cheap to run month to month\n" +
    "- **Support:** answered quickly by real people\n",
  // Breadth: many findings across many categories with a low weighted score —
  // the eval's 9-findings-yet-human_like shape (human controls peaked at 2).
  findingBreadth:
    "Moreover, the committee reviewed the accounts in terms of the reserve fund. Truly, the numbers were better than last year, and genuinely the auditors were pleased with the bookkeeping. Notably, the hall bookings rose again this spring. Let's explore the options for the roof fund at the next meeting. What's next? To be honest, the committee still needs a treasurer before September. Furthermore, the fete raised more than the raffle for the first time, which surprised the older members who remember the wet summers. The clerk will circulate the schedule to everyone who attended, and the minutes will follow in the usual way after approval at the next monthly meeting of the full council.",
};
ALL_FIXTURES.push(...Object.values(ESCALATION_FIXTURES));

test("escalation — citation markup + citation token co-occurrence reaches ai_like", () => {
  const r = computeEditorialSignals(ESCALATION_FIXTURES.citationCoOccurrence);
  assert.equal(r.classification, "ai_like");
  assert.equal(r.escalation.applied, "citation_co_occurrence");
  assert.match(r.escalation.reason, /not proof of authorship/i, "escalation reason keeps the claim boundary");
});

test("escalation — a single utm fingerprint floors the classification at mixed_signals", () => {
  const r = computeEditorialSignals(ESCALATION_FIXTURES.singleUtm);
  assert.ok(r.score < 10, `fixture must stay under the artefact_score gate, got ${r.score}`);
  assert.equal(r.classification, "mixed_signals");
  assert.equal(r.escalation.applied, "artefact_floor");
});

test("escalation — artefact hit with score >= 10 reaches mixed_signals at medium confidence minimum", () => {
  const r = computeEditorialSignals(ESCALATION_FIXTURES.artefactScore);
  assert.ok(r.score >= 10, `fixture must clear the score gate, got ${r.score}`);
  assert.equal(r.classification, "mixed_signals");
  assert.equal(r.escalation.applied, "artefact_score");
  assert.notEqual(r.confidence, "low", "artefact_score lifts low confidence to medium");
});

test("escalation — three distinct formatting-cluster categories reach mixed_signals", () => {
  const r = computeEditorialSignals(ESCALATION_FIXTURES.formattingCluster);
  assert.equal(r.classification, "mixed_signals");
  assert.equal(r.escalation.applied, "formatting_cluster");
});

test("escalation — 8+ findings across 5+ categories raise the classification one band", () => {
  const r = computeEditorialSignals(ESCALATION_FIXTURES.findingBreadth);
  assert.ok(r.findingCount >= 8 && r.categoriesHit.length >= 5,
    `fixture must satisfy the breadth gate, got ${r.findingCount}/${r.categoriesHit.length}`);
  assert.equal(r.classification, "mixed_signals");
  assert.equal(r.escalation.applied, "finding_breadth");
});

test("escalation — every human fixture stays human_like with no escalation applied", () => {
  const humanFixtures = [HUMAN_CONTROL, NON_NATIVE_CONTROL];
  for (const text of humanFixtures) {
    const r = computeEditorialSignals(text);
    assert.equal(r.classification, "human_like", `human fixture escalated: ${text.slice(0, 50)}`);
    assert.equal(r.escalation.applied, null);
  }
  // The SEO-template page may legitimately sit at mixed via its base score,
  // but the escalation policy itself must not touch it (no artefacts, no
  // formatting cluster, breadth below the gate).
  const seo = computeEditorialSignals(SEO_TEMPLATE_PAGE);
  assert.equal(seo.escalation.applied, null, "structure-only SEO page must not trigger any escalation");
});

test("escalation — the evaluation's four human control texts stay human_like with escalation null", async (t) => {
  // The eval corpus lives in the analyst scratchpad (session-local); the
  // texts are third-party material (CC BY-SA Stack Exchange posts, Orwell)
  // and are deliberately NOT copied into the repository. Skip with a notice
  // when the corpus is not present on this machine.
  const { readFile } = await import("node:fs/promises");
  const path = "/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins/1fc732d4-98d7-4177-8945-5a9833d4621d/scratchpad/eval-samples.json";
  let samples;
  try {
    samples = JSON.parse(await readFile(path, "utf8"));
  } catch {
    t.diagnostic(`eval corpus not present at ${path}; human-control assertions skipped on this machine`);
    return;
  }
  const humans = samples.filter((s) => s.label === "human");
  assert.equal(humans.length, 4, "the eval corpus carries four human controls");
  for (const s of humans) {
    const r = computeEditorialSignals(s.text);
    assert.equal(r.classification, "human_like", `${s.id} escalated to ${r.classification} (score ${r.score})`);
    assert.equal(r.escalation.applied, null, `${s.id} triggered escalation ${r.escalation.applied}`);
  }
});

test("regression — fixture D still scores 63+ and classifies ai_like under the merged pack", () => {
  const FIXTURE_D =
    "Great question! Let's unpack what makes this framework so powerful. " +
    "This isn't just an update — it's a fundamental rethink of how teams operate. " +
    "The platform boasts robust integrations, seamless onboarding, and enhanced security. " +
    "Whether you're a startup founder, an enterprise architect, or a curious developer, there's something here for you. " +
    "The results stand as a testament to the team's dedication. " +
    "As of my last update, pricing details may have changed. " +
    "In the ever-changing world of software, staying ahead isn't optional — it's essential.";
  const r = computeEditorialSignals(FIXTURE_D);
  assert.equal(r.classification, "ai_like");
  assert.ok(r.score >= 63, `fixture D regressed: score ${r.score} (baseline 63)`);
});

test("performance — 50,000-character document completes under 400ms with the merged pack", () => {
  // Budget raised from the v2 pack's 300ms to 400ms for the 2026.08.3 merge:
  // the harvest roughly doubles the rule count (50+ new categories including
  // whole-document stylometric passes). Measured runs remain far below both
  // budgets; the raise only prevents CI flakes on slow runners.
  const seed = [
    "The migration finished on Thursday after the second dry run. Rollback stayed available throughout, and nobody needed it.",
    "In today's rapidly evolving landscape, teams must leverage robust, seamless tooling to deliver comprehensive results. Moreover, industry leaders agree that innovation is pivotal.",
    "Sharon checked the invoices twice. Two were wrong. She rang the supplier before lunch and had both corrected by four.",
    "Let's explore what makes this framework a game-changer. Whether you're a founder or an architect, the possibilities are endless — truly a testament to the team.",
    "Meanwhile the office kettle broke again, which mattered more to most of us than the quarterly numbers did, if we are honest about it.",
  ].join("\n\n");
  let doc = "";
  while (doc.length < 50000) doc += seed + "\n\n";
  doc = doc.slice(0, 50000);
  inspectSignalsV2(doc.slice(0, 5000)); // warm-up (JIT + regex compilation)
  const started = performance.now();
  const findings = inspectSignalsV2(doc);
  const scored = computeEditorialSignals(doc);
  const elapsed = performance.now() - started;
  assert.ok(findings.length > 0);
  assert.equal(scored.status, "scored");
  assert.ok(elapsed < 400, `50k-character analysis took ${elapsed.toFixed(1)}ms (budget 400ms)`);
  console.log(`METRIC patterns_v3_50k_ms=${elapsed.toFixed(1)} findings=${findings.length} score=${scored.score}`);
});
