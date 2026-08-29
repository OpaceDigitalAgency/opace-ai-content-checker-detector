// Calibration workbench — grouping and plain-English descriptions for the 113
// weighted signal categories. Weights themselves are read from the shipped
// packages/core dist tables; nothing here changes engine behaviour.
//
// Groups (owner-facing, not an engine concept):
//   artefact   — machine residue: leaked tokens, placeholders, odd Unicode
//   voice      — chatbot/assistant register that has no place in finished prose
//   stock      — stock phrasing, buzzwords, template sentences
//   structure  — formatting and document furniture (markdown, headings, bullets)
//   rhythm     — measured stylometrics and cadence
//   punct      — punctuation habits
//   wordiness  — filler, hedging, low-information padding

export const GROUPS = [
  ["artefact", "Artefact forensics", "Machine residue left in the text: leaked citation tokens, unfilled placeholders, private-use or fake-bold Unicode. Nominally the strongest evidence class \u2014 but on this corpus most of these rules never fire at all, so their real-world behaviour is untested here. normalization-flag and arrow-decoration are the two that do fire on humans."],
  ["voice", "Chatbot voice", "Assistant register surfacing in finished prose: conversational openers, flattery, narrated reasoning, knowledge-cutoff disclaimers."],
  ["stock", "Stock phrasing", "Documented over-used phrases, buzzwords and sentence templates. The largest group, and the one most likely to catch a human writing in the same register."],
  ["structure", "Structure and formatting", "Document furniture: markdown residue, heading density, bullet scaffolding, uniform sections."],
  ["rhythm", "Rhythm and stylometrics", "Measured cadence: sentence-length variation, burstiness, register distance. Capped in the score so rhythm alone can never reach an AI band."],
  ["punct", "Punctuation habits", "Dash density, quote consistency, punctuation distribution."],
  ["wordiness", "Wordiness and hedging", "Filler, stacked hedges, low-specificity padding."],
];

// category -> [group, short plain-English description of what it catches]
export const CATEGORY_INFO = {
  // ── artefact forensics ────────────────────────────────────────────
  "ai-citation-markup": ["artefact", "Internal chatbot citation markup left in the text."],
  "ai-citation-token": ["artefact", "A leaked citation token from a specific chatbot's export."],
  "ai-utm-source": ["artefact", "A URL carrying the tracking parameter AI tools append to generated links."],
  "ai-placeholder": ["artefact", "An unfilled template placeholder, e.g. [Your Name Here]."],
  "placeholder-token": ["artefact", "An unfilled machine placeholder token."],
  "reasoning-leak": ["artefact", "Text narrating the writing task itself — unedited reasoning-model output."],
  "pua-character": ["artefact", "Private Use Area characters; ChatGPT wraps citation tokens in these."],
  "math-alphanumeric": ["artefact", "Mathematical-alphanumeric Unicode (fake bold/italic) used as prose styling."],
  "arrow-decoration": ["artefact", "Arrow characters used repeatedly as prose connectors. Corroboration only."],
  "escaped-markup-literal": ["artefact", "A literal &nbsp; or \\n left in the prose by a chat-interface paste."],
  "normalization-flag": ["artefact", "Invisible or lookalike characters typical of detector-bypass tools."],
  "invalid-isbn": ["artefact", "An ISBN that fails its checksum — the shape of a fabricated reference."],

  // ── chatbot voice ─────────────────────────────────────────────────
  chatbot: ["voice", "A conversational assistant phrase, unusual in finished prose."],
  sycophantic: ["voice", "Flattering assistant acknowledgement (\"Great question!\")."],
  "reasoning-artifact": ["voice", "Step-by-step reasoning scaffolding surfacing in the prose."],
  "acknowledgment-loop": ["voice", "The text restates the question before answering it."],
  "cutoff-disclaimer": ["voice", "A knowledge-cutoff or AI self-description phrase."],
  "lets-construction": ["voice", "A \"let's walk through…\" walkthrough construction."],
  "didactic-note": ["voice", "A didactic disclaimer (\"it's important to understand\"). Corroboration only."],
  "faux-insight": ["voice", "A faux-insight setup (\"here's what nobody tells you\"). Corroboration only."],
  "teach-preach-headings": ["voice", "Tutorial scaffold headings (\"Why it matters\", \"Key takeaways\"). Corroboration only."],

  // ── stock phrasing ────────────────────────────────────────────────
  tier1: ["stock", "A single word strongly associated with generic AI drafting (delve, tapestry…)."],
  "tier1-clarity": ["stock", "A wordy construction that a clarity edit would remove."],
  tier2: ["stock", "Two or more buzzwords clustering inside one paragraph."],
  tier3: ["stock", "A filler word used unusually often for the length of the text."],
  transition: ["stock", "A formulaic transition phrase (Furthermore, Moreover…)."],
  "generic-conclusion": ["stock", "A generic closing formula (\"In conclusion, …\")."],
  "significance-inflation": ["stock", "Stock inflation of an event's significance."],
  "vague-attribution": ["stock", "A claim attributed to unnamed experts or studies."],
  "novelty-inflation": ["stock", "A stock novelty claim (\"a game-changer\")."],
  "template-phrase": ["stock", "A template phrase common in generated copy."],
  "not-just-contrast": ["stock", "The \"isn't just X — it's Y\" contrast template."],
  "tier3-phrase": ["stock", "A boilerplate phrase repeating through the text."],
  "tier3-phrase-cluster": ["stock", "Several distinct boilerplate phrases stacked in one piece."],
  "future-narrative": ["stock", "A vague future-significance formula with no falsifiable claim."],
  "real-actual-inflation": ["stock", "\"Real\"/\"actual\" used as an empty intensifier on an abstract noun."],
  "social-cta-closer": ["stock", "An engagement-bait closing formula."],
  "formulaic-opener": ["stock", "A formulaic essay opener (\"In today's fast-paced world…\")."],
  "speculative-opener": ["stock", "A speculative scenario opener (\"Imagine a world where…\")."],
  "neg-parallelism": ["stock", "The \"not only X but Y\" template, flagged only when it recurs."],
  "tripled-negation": ["stock", "The \"Not X. Not Y. Just Z.\" template."],
  "despite-challenges-arc": ["stock", "The rigid \"despite challenges … continues to thrive\" essay arc."],
  "metaphor-cluster": ["stock", "Stock abstract metaphors clustering (tapestry, interplay, testament)."],
  "participial-tail": ["stock", "Sentences repeatedly ending \", highlighting …\" / \", underscoring …\"."],
  "focal-density": ["stock", "High density of the empirically over-used AI focal lexicon."],
  "owner-phrase": ["stock", "A phrase from the documented generic-drafting phrasebook."],
  "owner-phrase-b": ["stock", "A phrase from the secondary phrasebook. Corroboration only."],
  "owner-vocab-b": ["stock", "Secondary filler words clustering (essence, facet, folks). Corroboration only."],
  "power-verb-compound": ["stock", "Power verb plus buzz-adjective (\"leverage a robust…\")."],
  "outcome-tail": ["stock", "A vague \", leading to increased X\" outcome tail."],
  "conclusion-cta": ["stock", "A \"by following these steps you can boost…\" conclusion."],
  "by-ving-template": ["stock", "The \"By doing X, you can Y\" template recurring. Corroboration only."],
  "liang-cluster": ["stock", "Evaluative adjectives from the documented overuse lists. Corroboration only."],
  "kobak-density": ["stock", "Words from the corpus-measured AI excess vocabulary. Corroboration only."],
  "promo-travel": ["stock", "Travel-brochure promotional register. Corroboration only."],
  "pivotal-role": ["stock", "The \"plays a crucial role in shaping\" formula. Corroboration only."],
  "legacy-framing": ["stock", "Stacked legacy/significance framings. Corroboration only."],
  "notability-canned": ["stock", "A canned notability phrase. Corroboration only."],
  "buzzword-phrase": ["stock", "A stock corporate buzz-phrase (\"harness the power of\"). Corroboration only."],
  "narrative-cliche": ["stock", "A high-multiplier narrative cliché. Corroboration only."],
  "valuable-insights": ["stock", "Academic boilerplate (\"provides valuable insights into\"). Corroboration only."],
  "rhetorical-qa": ["stock", "The self-posed \"The result? X.\" device recurring. Corroboration only."],
  "fiction-claudeism": ["stock", "Phrases from the documented Claude-fiction idiolect. Corroboration only."],
  "fiction-promptonym": ["stock", "A statistically AI-over-represented fiction name. Corroboration only."],
  "fiction-slop-phrase": ["stock", "Frequency-ranked fiction clichés co-occurring. Corroboration only."],
  "proximity-cluster": ["stock", "A flagged buzzword repeating within a few sentences. Corroboration only."],
  "emotional-flatline": ["stock", "Stock emotional framing with no specific feeling behind it."],
  "lingering-attention": ["stock", "Share-post framing claiming lingering attention."],

  // ── structure and formatting ──────────────────────────────────────
  formatting: ["structure", "Heavy bold styling. Fired on 0 of 169 held-out humans."],
  "markdown-bold": ["structure", "Literal **bold** markdown left in the text — chat-export residue."],
  "markdown-heading": ["structure", "A literal markdown heading line — chat-export residue."],
  "markdown-furniture": ["structure", "Combined gate: bold runs, heading lines or a dense bullet layout."],
  "uniform-sections": ["structure", "Sections unusually uniform in length."],
  "uniform-list-items": ["structure", "A run of list items with near-identical word counts."],
  "bullet-np-list": ["structure", "A long bullet list of bare noun phrases."],
  "bold-label-bullets": ["structure", "A run of \"**Label:** description\" bullets. Corroboration only."],
  "directive-colon-bullets": ["structure", "List items opening with a directive verb and colon. Corroboration only."],
  "heading-inflation": ["structure", "Headings unusually dense for the prose beneath them. Corroboration only."],
  "title-case-header": ["structure", "A heading capitalising every content word."],
  "hashtag-stuff": ["structure", "A long hashtag block."],
  "emoji-decoration": ["structure", "Emoji decorating headings or bullets. Corroboration only."],

  // ── rhythm and stylometrics ───────────────────────────────────────
  "sentence-flatline": ["rhythm", "Sentence lengths barely vary across the document."],
  uniformity: ["rhythm", "Paragraph rhythm unusually uniform."],
  "cross-para-burstiness": ["rhythm", "Every paragraph has roughly the same internal sentence rhythm."],
  "fnword-trigram-entropy": ["rhythm", "Grammatical structure unusually repetitive."],
  "low-ttr": ["rhythm", "Low vocabulary diversity for the length of the text."],
  "staccato-fragments": ["rhythm", "A run of consecutive punchy fragments. Corroboration only."],
  "tricolon-density": ["rhythm", "Balanced three-item constructions recurring. Corroboration only."],
  "setup-expansion-cadence": ["rhythm", "Short setup sentences repeatedly followed by long expansions. Corroboration only."],
  "adjacent-lemma-repeat": ["rhythm", "Adjacent sentences reusing the same content word. Corroboration only."],
  "passive-ratio": ["rhythm", "Passive-voice ratio high for marketing/blog register. Corroboration only."],
  "low-specificity": ["rhythm", "Almost no numbers, dates or named entities for its length. Corroboration only."],
  "copula-avoidance": ["rhythm", "Plain \"is/has\" repeatedly avoided for \"serves as / stands as\". Corroboration only."],
  "transition-stacking": ["rhythm", "Most paragraphs opening with a formal connective. Corroboration only."],
  "token-cutoff": ["rhythm", "The text ends mid-sentence — token-limit truncation shape. Corroboration only."],
  "sentence-length-spectral-flatness": ["rhythm", "Sentence-length rhythm unusually structured (windowed spectral measure)."],
  "conditional-compression": ["rhythm", "Text gains unusually little from a human-prose compression prior."],
  "lexical-register-distance": ["rhythm", "Function-word and word-length register far from the human reference."],
  "punchline-fragment-density": ["rhythm", "Short abstract punchlines (\"That's the point.\") at high density."],
  "mic-drop-paragraph": ["rhythm", "Paragraphs built as setup sentences ending in a short abstract closer."],
  "contrast-density": ["rhythm", "Two-sided contrast constructions recurring at high density."],
  "rhetorical-procedural-ratio": ["rhythm", "Abstract-claim sentences heavily outnumbering concrete ones."],

  // ── punctuation habits ────────────────────────────────────────────
  "em-dash-density": ["punct", "Em dashes (or spaced hyphens as dashes) unusually frequent."],
  "smart-punct-signature": ["punct", "Curly quotes, em dash, Oxford comma and zero typos all co-occurring."],
  "punct-distribution": ["punct", "Punctuation density unusually uniform across paragraphs."],
  "quote-inconsistency": ["punct", "Curly and straight quotes mixed — a paste signature. Corroboration only."],
  "parenthetical-hedge": ["punct", "A parenthetical aside performing thoughtfulness without adding information."],

  // ── wordiness and hedging ─────────────────────────────────────────
  filler: ["wordiness", "A filler phrase adding words without meaning."],
  "hollow-intensifier": ["wordiness", "A hollow intensifier adding emphasis without information."],
  "hedge-stack": ["wordiness", "A modal verb stacked with a hedging adverb."],
  "confidence-calibration": ["wordiness", "Confidence adverbs stacking up across the text."],
  "false-concession": ["wordiness", "A formulaic concession opening the sentence."],
  "rhetorical-question": ["wordiness", "A formulaic rhetorical question."],
};
