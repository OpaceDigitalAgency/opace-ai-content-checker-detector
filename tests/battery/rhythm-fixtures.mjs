// Shared fixtures for the 2026.08.5 measured-stylometrics + owner-rhythm
// battery (rhythm-battery.test.mjs) and the calibration script
// (calibrate.mjs). Crafted for this pack: positives encode the AI cadences
// documented in research/OWNER-RHYTHM-NOTES.md and research/
// CLEAN-PROSE-DETECTION-PLAN.md §2; the guards encode the owner's guardrail
// that professional human copywriters legitimately use punchlines.

// ── Human guards ─────────────────────────────────────────────────────

// Professional marketing copy with LEGITIMATE punchlines: concrete numbers,
// names, dates and offers throughout. Every 2026.08.5 rule must stay silent
// (OWNER-RHYTHM-NOTES guardrail: calibrate against professional human
// marketing copy before any severity above low).
export const MARKETING_COPY_HUMAN =
  "Spring Sale: 20% off every ecommerce build booked before 31 May. " +
  "Our Birmingham team has launched over 300 online shops since 2005, and we still answer the phone within three rings. " +
  "Last month we rebuilt the checkout for Hartley's Garden Supplies and cut their basket abandonment from 68% to 41% in six weeks. " +
  "That's not a projection. Those are their real trading figures, pulled straight from their analytics dashboard on 30 April.\n\n" +
  "Want the same results? Call Sarah on 0121 456 7890 for a free 30-minute review of your shop. " +
  "We'll audit your product pages, your delivery options and your payment flow, then send you a one-page plan with costs. " +
  "No retainers, no lock-in, no jargon. " +
  "If we can't improve your conversion rate inside a quarter, we'll say so on the first call and save you the money. " +
  "Book before Friday and we'll include a speed audit worth £350.";

// SEO/AEO-template guard — byte-identical to the patterns-v3 unit-test page
// (binding correction: question headings + uniform answers are TAUGHT to
// human SEO writers; duplicated here because test modules are not importable).
export const SEO_TEMPLATE_PAGE = [
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

// Non-native-style plain guard — byte-identical to the patterns-v3 unit-test
// control (Stanford TOEFL false-positive correction).
export const NON_NATIVE_CONTROL =
  "The internet is very important for education in my country. Many students use the internet every day for their homework. " +
  "Moreover, the teachers also use online materials in the classroom. The government made a program to give computers to schools. " +
  "My cousin received a computer from this program last year. He uses it to study mathematics and English in the evening. " +
  "The connection in the village is sometimes slow. The students go to the library when the connection does not work. " +
  "I think this program helps many families. The education becomes better when everyone can use the internet.";

// ── AI-cadence positives ─────────────────────────────────────────────

// The owner-documented "LinkedIn thought-leader cadence": mid-length setups
// building to short abstract contrast closers, repeated contrasts, quotable
// fragments. Built around the canonical mic-drop example from
// research/OWNER-RHYTHM-NOTES.md ("The difference was not the AI. It was who
// was controlling it." — re-expressed). Fires punchline-fragment-density,
// mic-drop-paragraph and contrast-density.
export const AI_CADENCE_FIXTURE =
  "We spent the last quarter rebuilding how our team approaches content, and the process taught us more than any course ever could. " +
  "The tools kept improving while we worked, and every improvement changed what good work looked like for the people using them. " +
  "The workflow that finally emerged was nothing like the one we started with, and it required letting go of habits that had served us well for years. " +
  "The difference was not the technology. It was who was controlling it.\n\n" +
  "Most teams treat the new tools as a faster way to do the same work, and that framing feels safe because it changes nothing about how anyone operates. " +
  "The braver framing accepts that the work itself is changing, and that the skills that mattered before will not be the ones that matter next. " +
  "The leaders who understand this are already rethinking what their people spend their days doing every single week. " +
  "That is the real shift.\n\n" +
  "The goal is not just efficiency — it's a different way of working. " +
  "This was not only a tooling change but also a cultural one. " +
  "The output is not the product. It is the starting point. " +
  "That distinction matters. " +
  "The gains will compound quietly for the organisations that see this early, and the ones that wait will not notice what they missed until the gap is visible from outside. " +
  "Everything else is noise.";

// Rhetorical-vs-procedural positive: abstract vision-speak with no numbers,
// no proper nouns and no specific actions — the polished-abstraction register
// the owner contrasted with his own procedural writing.
export const RATIO_ABSTRACT_FIXTURE =
  "Innovation is essential for growth. Leadership is about vision, not control. The future is different from the past. " +
  "Change is the only real constant. Success is possible when the mindset is right. The opportunity is enormous, and the potential is real. " +
  "Transformation is a journey, not a destination. The advantage is cultural, not technical. What matters is the willingness to adapt. " +
  "Progress is powerful when it compounds. The lesson is simple. The game is changing. Value is created through trust. The key is momentum.";

// Spectral-flatness positive: a strongly periodic short/long sentence-length
// alternation sustained across 28 sentences — the structured (non-noise-like)
// length series the empiricist measured, long enough for two-plus fixed
// 12-sentence windows.
export const SPECTRAL_CADENCE_FIXTURE = (() => {
  const shorts = [
    "The plan felt safe.", "The doubts grew louder.", "The board wanted proof.",
    "The team pushed back.", "The budget stayed flat.", "The mood kept shifting.",
    "The stakes rose again.", "The answer stayed hidden.", "The pattern became clear.",
    "The pressure never eased.", "The work continued anyway.", "The outcome surprised everyone.",
    "The lesson arrived late.", "The story spread quickly.",
  ];
  const longs = [
    "What followed was a long stretch of careful negotiation in which every assumption behind the original proposal was tested against the realities of the trading year.",
    "Each conversation surfaced another dependency that nobody had written down, and the map of the work grew more tangled with every meeting we held about it.",
    "The counterargument rested on a reading of the market that most of the senior group privately doubted but none of them was willing to challenge aloud.",
    "A quieter faction argued that the whole exercise misread what customers actually wanted, and their memo circulated for weeks before anyone responded to it.",
    "The review that finally settled the question ran long into the evening and touched every line of the forecast before agreement was even close.",
    "Progress, when it came, arrived through a series of small concessions that nobody had planned and that no single meeting could have produced on its own.",
    "The revised approach borrowed heavily from an earlier programme that had failed for reasons everyone remembered differently depending on where they had sat at the time.",
    "By the closing weeks the argument had shifted from whether the change was needed to how quickly the organisation could absorb it without breaking something important.",
    "The final document read nothing like the first draft, and the people who had fought hardest over it were the first to admit the improvement.",
    "What the process cost in patience it repaid in a shared understanding that would have been impossible to legislate from the top of the organisation.",
    "The account that reached the wider company smoothed over most of the conflict and preserved only the decisions, which is how these things usually survive.",
    "Those who had lived through the negotiation kept a different version of events, told mostly at leaving drinks and never written into any official record.",
    "The programme that eventually shipped bore the fingerprints of every faction, which is perhaps why it held up when the difficult quarter finally arrived.",
    "Whatever the retrospectives conclude, the experience changed how the group argues, and that change outlasted every document the process produced along the way.",
  ];
  const out = [];
  for (let i = 0; i < 14; i += 1) out.push(shorts[i], longs[i]);
  return out.join(" ");
})();

// Conditional-compression positive: an unstripped chat-export configuration
// dump — markdown tables, emoji headings, arrow connectors, code spans. The
// shape that measurably gains least from the varied human-prose prior on the
// calibration data (the same shape as the evaluation's lowest-gain AI sample).
export const CHAT_EXPORT_COMPRESSION_FIXTURE = (() => {
  const mk = (n) => `## 🚀 ${n} Setup

| Property | Value | Status |
|----------|-------|--------|
| tracking_id | GT-${n.toUpperCase().slice(0, 4)}8842 | ✅ active |
| endpoint | https://collect.example.com/${n.toLowerCase()}/v2 | ✅ verified |
| consent_default | denied_all | ⚠️ review |
| export_schedule | 03:00_UTC_daily | ✅ active |

- **install_snippet** → \`<script async src="gtag/js?id=GT-${n.toUpperCase().slice(0, 4)}8842">\` before \`</head>\`
- **verify_events** → \`dataLayer.push({event: "${n.toLowerCase()}_ready"})\` in console
- **map_params** → utm_campaign / utm_source / utm_medium / utm_content
- **link_domains** → shop.example.com ↔ www.example.com

`;
  return ["Analytics", "Consent", "Attribution", "Reporting", "Audiences", "Funnels"].map(mk).join("")
    + "**Final:** ship → validate → document → iterate 📈";
})();

// Lexical-register positive: dense latinate nominalisation with a
// function-word profile far from ordinary prose — the formal register shift
// the empiricist measured (syMean/wlMean), pushed to the calibrated extreme.
export const FORMAL_REGISTER_FIXTURE =
  "Organisational transformation initiatives necessitate comprehensive stakeholder alignment across interdependent operational domains. " +
  "Strategic capability development presupposes systematic competency assessment methodologies encompassing quantitative performance indicators. " +
  "Contemporary enterprises increasingly prioritise sustainable innovation frameworks facilitating continuous improvement trajectories. " +
  "Effective governance structures require transparent accountability mechanisms supporting distributed decision-making processes. " +
  "Institutional resilience depends fundamentally upon adaptive resource allocation strategies responsive to environmental volatility. " +
  "Successful implementation demands rigorous change-management protocols integrating communication cascades throughout hierarchical levels. " +
  "Measurable outcomes emerge predominantly from disciplined execution frameworks emphasising iterative refinement cycles. " +
  "Cross-functional collaboration accelerates knowledge transfer processes underpinning organisational learning capabilities. " +
  "Digital modernisation programmes frequently encounter legacy infrastructure constraints necessitating phased migration approaches. " +
  "Comprehensive risk assessment procedures enable proactive mitigation strategies addressing potential implementation obstacles. " +
  "Leadership commitment constitutes an indispensable prerequisite for enterprise-wide cultural transformation initiatives. " +
  "Performance optimisation ultimately requires balanced scorecard methodologies integrating financial and operational metrics. " +
  "Stakeholder engagement strategies should incorporate systematic feedback mechanisms ensuring continuous alignment verification. " +
  "Sustainable competitive advantage derives increasingly from intangible capabilities resisting straightforward replication attempts. " +
  "Methodological consistency underpins longitudinal benchmarking exercises spanning heterogeneous organisational contexts. " +
  "Procurement modernisation frameworks emphasise supplier consolidation strategies alongside contractual flexibility provisions. " +
  "Regulatory compliance obligations increasingly mandate auditable documentation trails throughout transformation programmes. " +
  "Interdepartmental coordination mechanisms mitigate implementation friction arising from conflicting operational priorities. " +
  "Capability maturity assessments calibrate investment prioritisation decisions against strategic differentiation objectives. " +
  "Knowledge codification initiatives institutionalise experiential learning otherwise dissipated through personnel turnover. " +
  "Scenario-planning disciplines strengthen strategic resilience against discontinuous environmental transformations. " +
  "Portfolio rationalisation exercises periodically eliminate redundant initiatives consuming disproportionate organisational bandwidth. " +
  "Communication architectures determine informational symmetry across geographically distributed operational units. " +
  "Incentive alignment structures reinforce behavioural consistency with articulated transformation objectives. " +
  "Measurement infrastructure investments precede meaningful accountability conversations throughout hierarchical strata. " +
  "Institutional memory preservation requires deliberate documentation disciplines transcending individual contributor tenure. " +
  "Governance cadences synchronise decision-making tempo with operational execution rhythms across programme portfolios. " +
  "Analytical sophistication amplifies diagnostic precision when organisational performance deviates from projected trajectories.";

// A document that fires MANY 2026.08.5 rhythm rules at once but almost
// nothing else — the guard case proving four-plus rhythm rules alone are ONE
// combined breadth contribution and can never escalate by themselves.
export const RHYTHM_ONLY_STACK = AI_CADENCE_FIXTURE + "\n\n" + RATIO_ABSTRACT_FIXTURE;
