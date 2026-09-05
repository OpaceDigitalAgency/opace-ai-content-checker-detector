/**
 * Rule data for the en-signals v2 editorial-signals engine.
 *
 * Adapted to TypeScript from the MIT-licensed `avoid-ai-writing` detector
 * (`detector/patterns.js`, Conor Bronsdon and contributors) recorded in
 * `source-snapshots/avoid-ai-writing/`. See THIRD_PARTY_NOTICES.md.
 *
 * Everything in this module is a documented writing-pattern rule or a
 * stylometric threshold. All of it is Tier B evidence in BRIEF.md §21 terms:
 * editorial hints about style, never proof of authorship.
 */

export interface Tier1Phrase { pattern: RegExp; replace: string; clarity?: boolean }
export interface Tier2Conditional { word: string; pattern: RegExp; suggestion: string }

// ─── Homoglyph lookalikes for the normalisation pre-pass ─────────────
export const CYRILLIC_LOOKALIKES: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x",
  "у": "y", "к": "k", "м": "m", "н": "h", "в": "b", "т": "t",
  "А": "A", "Е": "E", "О": "O", "Р": "P", "С": "C", "Х": "X",
  "У": "Y", "К": "K", "М": "M", "Н": "H", "В": "B", "Т": "T",
};
export const GREEK_LOOKALIKES: Record<string, string> = {
  "ο": "o", "Ο": "O", "α": "a", "Α": "A", "ρ": "p", "Ρ": "P",
};
export const ROLEPLAY_VERBS = /^(?:nods|sighs|laughs|smiles|frowns|shrugs|grins|winks|chuckles|gasps|pauses|thinks|wonders|whispers|shouts|gestures|raises|leans|turns|looks|glances|smirks|blinks|nodding|sighing|laughing|smiling|thinking|gesturing)\b/i;

// ─── Tier 1: always flag ─────────────────────────────────────────────
export const TIER1: Record<string, string> = {
  "delve": "explore, dig into, look at",
  "tapestry": "describe the actual complexity",
  "paradigm": "model, approach, framework",
  "beacon": "rewrite entirely",
  "robust": "strong, reliable, solid",
  "comprehensive": "thorough, complete, full",
  "cutting-edge": "latest, newest, advanced",
  "pivotal": "important, key, critical",
  "meticulous": "careful, detailed, precise",
  "meticulously": "carefully, precisely",
  "seamless": "smooth, easy, without friction",
  "seamlessly": "smoothly, easily",
  "game-changer": "describe what changed",
  "game-changing": "describe what changed",
  "nestled": "is located, sits",
  "vibrant": "describe what makes it active",
  "thriving": "growing, active",
  "bustling": "busy, active",
  "intricate": "complex, detailed",
  "intricacies": "complexities, details",
  "ever-evolving": "changing, growing",
  "enduring": "lasting, long-running",
  "daunting": "hard, difficult",
  "holistic": "complete, full, whole",
  "holistically": "completely, fully",
  "actionable": "practical, useful, concrete",
  "impactful": "effective, significant",
  "learnings": "lessons, findings, takeaways",
  "synergy": "describe the combined effect",
  "synergies": "describe the combined effect",
  "interplay": "relationship, connection",
  "symphony": "describe the coordination",
  "embrace": "adopt, accept, use",
  // 2026.08.3 owner-docs tier A additions (OWNER-DOCS-TELLS.md §8).
  "enigma": "mystery, puzzle",
  "labyrinth": "maze, tangle",
  "top-notch": "excellent, first-rate",
};

export const TIER1_PHRASES: readonly Tier1Phrase[] = [
  { pattern: /\bdelve\s+into\b/gi, replace: "explore, dig into" },
  { pattern: /\blandscape\b/gi, replace: "field, space, industry" },
  { pattern: /\brealm\b/gi, replace: "area, field, domain" },
  { pattern: /\btestament\s+to\b/gi, replace: "shows, proves" },
  { pattern: /\bleverag(?:e|es|ing|ed)\b/gi, replace: "use" },
  { pattern: /\bwatershed\s+moment\b/gi, replace: "turning point, shift" },
  { pattern: /\bmarking\s+a\s+pivotal\s+moment\b/gi, replace: "state what happened" },
  { pattern: /\bthe\s+future\s+looks\s+bright\b/gi, replace: "cut or say something specific" },
  { pattern: /\bonly\s+time\s+will\s+tell\b/gi, replace: "cut or say something specific" },
  { pattern: /\bdespite\s+challenges[^.]*continues?\s+to\s+thrive\b/gi, replace: "name the challenge and response" },
  { pattern: /\bdeep\s+dive\b/gi, replace: "look at, examine" },
  { pattern: /\bdive\s+into\b/gi, replace: "look at, examine" },
  { pattern: /\bunpack(?:ing)?\b/gi, replace: "explain, break down" },
  { pattern: /\bcomplexities\b/gi, replace: "name the actual problems" },
  { pattern: /\bthought\s+leader(?:ship)?\b/gi, replace: "expert, authority" },
  { pattern: /\bbest\s+practices\b/gi, replace: "what works, proven methods" },
  { pattern: /\bat\s+its\s+core\b/gi, replace: "cut, just state it" },
  { pattern: /\bin\s+order\s+to\b/gi, replace: "to", clarity: true },
  { pattern: /\bdue\s+to\s+the\s+fact\s+that\b/gi, replace: "because", clarity: true },
  { pattern: /\bserves\s+as\b/gi, replace: "is", clarity: true },
  { pattern: /\bboasts\b/gi, replace: "has", clarity: true },
  { pattern: /\butiliz(?:e|es|ing|ed)\b/gi, replace: "use", clarity: true },
  { pattern: /\bshowcas(?:e|es|ing|ed)\b/gi, replace: "show, demonstrate" },
  { pattern: /\bembark(?:s|ing|ed)?\b/gi, replace: "start, begin" },
  { pattern: /\bcommenc(?:e|es|ing|ed)\b/gi, replace: "start, begin", clarity: true },
  { pattern: /\bascertain(?:s|ing|ed)?\b/gi, replace: "find out, determine", clarity: true },
  { pattern: /\bendeavou?r(?:s|ing|ed)?\b/gi, replace: "effort, attempt, try", clarity: true },
  { pattern: /\bunderscor(?:es|ing|ed)\b/gi, replace: "highlights, shows" },
  // 2026.08.3 owner-docs tier A phrase additions.
  { pattern: /\bbuckle\s+up\b/gi, replace: "cut, or say what actually follows" },
  { pattern: /\bload-bearing\b(?!\s+(?:(?:structural|exterior|interior|internal|external|concrete|steel|timber|wooden|brick|masonry|perimeter|basement|main|primary|existing|original)\s+)?(?:walls?|beams?|columns?|joists?|truss(?:es)?|members?|footings?|slabs?|studs?|partitions?|masonry|lintels?|piers?|rafters?|girders?|capacity|capacities)\b)/gi, replace: "essential, critical, or say what breaks if it is removed" },
];

// ─── Tier 2: flag in clusters (2+ distinct per paragraph) ────────────
export const TIER2: Record<string, string> = {
  "harness": "use, take advantage of",
  "navigate": "work through, handle",
  "navigating": "working through, handling",
  "foster": "encourage, support, build",
  "elevate": "improve, raise, strengthen",
  "unleash": "release, enable, unlock",
  "streamline": "simplify, speed up",
  "empower": "enable, let, allow",
  "bolster": "support, strengthen",
  "spearhead": "lead, drive, run",
  "resonate": "connect with, appeal to",
  "resonates": "connects with, appeals to",
  "revolutionize": "change, transform",
  "facilitate": "enable, help, allow",
  "facilitates": "enables, helps, allows",
  "underpin": "support, form the basis of",
  "nuanced": "specific, subtle, detailed",
  "crucial": "important, key, necessary",
  "multifaceted": "describe the actual facets",
  "ecosystem": "system, community, network",
  "myriad": "many, numerous",
  "plethora": "many, a lot of",
  "encompass": "include, cover, span",
  "catalyze": "start, trigger, accelerate",
  "reimagine": "rethink, redesign, rebuild",
  "galvanize": "motivate, rally, push",
  "augment": "add to, expand, supplement",
  "cultivate": "build, develop, grow",
  "illuminate": "clarify, explain, show",
  "elucidate": "explain, clarify",
  "juxtapose": "compare, contrast",
  "transformative": "describe what changed",
  "transformation": "describe what changed",
  "cornerstone": "foundation, basis, key part",
  "paramount": "most important, top priority",
  "poised": "ready, set, about to",
  "burgeoning": "growing, emerging",
  "nascent": "new, early-stage",
  "quintessential": "typical, classic, defining",
  "overarching": "main, central, broad",
  "quietly": "cut, or name the concrete contrast",
  "underpinning": "basis, foundation",
  "underpinnings": "basis, foundations",
  "paradigm-shifting": "describe what shifted",
  // 2026.08.3 owner-docs additions (medium FP → cluster-scored tier 2).
  "revolutionary": "describe what changed",
  "ai-powered": "say what the AI part actually does",
};

export const TIER2_CONDITIONAL: readonly Tier2Conditional[] = [
  {
    word: "deeply",
    pattern: /\bdeeply\s+(?:integrated|committed|rooted|personal|human|flawed|resonant|transformative|interconnected|ingrained|embedded|meaningful)\b/i,
    suggestion: "cut, or name what specifically runs deep",
  },
];

// ─── Tier 3: flag by density ─────────────────────────────────────────
export const TIER3: readonly string[] = [
  "significant", "significantly", "innovative", "innovation",
  "effective", "effectively", "dynamic", "dynamics",
  "scalable", "scalability", "compelling", "unprecedented",
  "exceptional", "exceptionally", "remarkable", "remarkably",
  "sophisticated", "instrumental",
  "world-class", "state-of-the-art", "best-in-class",
  "verbatim",
];

export const TIER3_PHRASES: readonly RegExp[] = [
  /\bemerging\s+(?:sector|space|category|industry)\b/gi,
  /\bthe\s+integration\s+of\b/gi,
  /\bthe\s+intersection\s+of\b/gi,
  /\bcommunity-?driven\b/gi,
  /\blong-?term\s+sustainability\b/gi,
  /\buser\s+engagement\b/gi,
  /\bdecentralized\s+compute\b/gi,
  /\b(?:sustainable\s+)?reward\s+emissions?\b/gi,
  /\btokenized\s+incentive\s+structures?\b/gi,
  /\bdesigned\s+for\s+long-?term\b/gi,
];

// ─── Weighted phrase categories ──────────────────────────────────────
export const TRANSITIONS: readonly RegExp[] = [
  /\bmoreover\b/gi, /\bfurthermore\b/gi, /\badditionally\b/gi,
  /\bin\s+today'?s\b/gi, /\bin\s+an\s+era\s+where\b/gi,
  /\bit'?s\s+worth\s+noting\s+that\b/gi, /\bnotably\b/gi,
  /\bin\s+conclusion\b/gi, /\bin\s+summary\b/gi, /\bto\s+summarize\b/gi,
  /\bwhen\s+it\s+comes\s+to\b/gi, /\bat\s+the\s+end\s+of\s+the\s+day\b/gi,
  /\bthat\s+(?:being\s+)?said\b/gi,
  // 2026.08.3: ritual-conclusion opener variant (seed str-ritual-conclusion).
  /\bto\s+sum\s+up\b/gi,
];

export const CHATBOT_ARTIFACTS: readonly RegExp[] = [
  /\bi\s+hope\s+this\s+helps\b/gi, /\bcertainly!\B/gi, /\babsolutely!\B/gi,
  /\bgreat\s+question!\B/gi, /\bexcellent\s+point!\B/gi,
  /\bfeel\s+free\s+to\s+reach\s+out\b/gi,
  /\blet\s+me\s+know\s+if\s+you\s+need\s+anything\b/gi,
  /\bin\s+this\s+article,?\s+we\s+will\s+explore\b/gi,
  /\blet'?s\s+dive\s+in!?\b/gi,
  // 2026.08.3: chat-wrapper leakage variants (seed art-collab-leakage /
  // art-sycophantic-openers).
  /\bwould\s+you\s+like\s+me\s+to\b/gi,
  /\bi'?d\s+be\s+happy\s+to\b/gi,
];

export const SYCOPHANTIC: readonly RegExp[] = [
  /\byou'?re\s+absolutely\s+right\b/gi,
  /\bthat'?s\s+a\s+really\s+insightful\b/gi,
  /\bthat'?s\s+a\s+great\s+question\b/gi,
  /\bexcellent\s+question\b/gi,
];

export const FILLERS: readonly RegExp[] = [
  /\bit\s+is\s+important\s+to\s+note\s+that\b/gi,
  /\bin\s+terms\s+of\b/gi,
  /\bthe\s+reality\s+is\s+that\b/gi,
  /\bit'?s\s+important\s+to\s+note\s+that\b/gi,
];

export const GENERIC_CONCLUSIONS: readonly RegExp[] = [
  /\bthe\s+future\s+looks\s+bright\b/gi, /\bonly\s+time\s+will\s+tell\b/gi,
  /\bone\s+thing\s+is\s+certain\b/gi, /\bas\s+we\s+move\s+forward\b/gi,
];

export const LETS_PATTERNS: readonly RegExp[] = [
  /\blet'?s\s+explore\b/gi, /\blet'?s\s+take\s+a\s+look\b/gi,
  /\blet'?s\s+break\s+this\s+down\b/gi, /\blet'?s\s+examine\b/gi,
  /\blet'?s\s+(?:consider|discuss|delve|unpack|walk\s+through)\b/gi,
];

export const REASONING_ARTIFACTS: readonly RegExp[] = [
  /\blet\s+me\s+think\s+step\s+by\s+step\b/gi, /\bbreaking\s+this\s+down\b/gi,
  /\bto\s+approach\s+this\s+systematically\b/gi,
  /\bhere'?s\s+my\s+thought\s+process\b/gi,
  /\bfirst,?\s+let'?s\s+consider\b/gi,
  /\bworking\s+through\s+this\s+logically\b/gi,
];

export const ACKNOWLEDGMENT_LOOPS: readonly RegExp[] = [
  /\byou'?re\s+asking\s+about\b/gi, /\bthe\s+question\s+of\s+whether\b/gi,
  /\bto\s+answer\s+your\s+question\b/gi,
];

export const SIGNIFICANCE_INFLATION: readonly RegExp[] = [
  /\bmarking\s+a\s+(?:pivotal|significant|important)\s+moment\b/gi,
  /\ba\s+watershed\s+moment\s+for\b/gi,
  /\bin\s+the\s+evolution\s+of\b/gi,
  /\ba\s+(?:pivotal|defining)\s+moment\s+in\b/gi,
];

export const VAGUE_ATTRIBUTIONS: readonly RegExp[] = [
  /\bexperts\s+(?:believe|say|suggest|agree)\b/gi,
  /\bstudies\s+(?:show|suggest|indicate)\b/gi,
  /\bresearch\s+(?:shows|suggests|indicates)\b/gi,
  /\bindustry\s+leaders\s+(?:agree|believe|say)\b/gi,
  // 2026.08.3: weasel-attribution variants (seed phr-weasel-attribution).
  /\b(?:observers?|critics|analysts)\s+(?:argue|suggest|believe|say|have\s+(?:cited|noted|shown))\b/gi,
  /\bindustry\s+reports?\s+(?:suggest|show|indicate)\b/gi,
  /\bit\s+is\s+widely\s+believed\b/gi,
];

export const HOLLOW_INTENSIFIERS: readonly RegExp[] = [
  /\bgenuine(?:ly)?\b/gi, /\btruly\b/gi, /\bquite\s+frankly\b/gi,
  /\bto\s+be\s+honest\b/gi, /\blet'?s\s+be\s+clear\b/gi,
];

export const EMOTIONAL_FLATLINE: readonly RegExp[] = [
  /\bwhat\s+surprised\s+me\s+most\b/gi, /\bi\s+was\s+fascinated\s+to\b/gi,
  /\bwhat\s+struck\s+me\s+was\b/gi, /\bi\s+was\s+excited\s+to\s+learn\b/gi,
  /\bthe\s+most\s+interesting\s+(?:part|thing|aspect|piece)\b/gi,
  /^\s*interesting\s+(?:part|thing|aspect|piece)(?:\s+of\s+(?:the\s+)?\w+)?\s*:/gim,
];

export const LINGERING_ATTENTION: readonly RegExp[] = [
  /\b(?:the|that|this)\s+(?:one\s+)?(?:line|quote|bit|part|idea|point|framing|comment|thing)\s+(?:that\s+)?i\s+keep\s+(?:coming\s+back\s+to|thinking\s+about)\b/gi,
  /\bi\s+can'?t\s+stop\s+thinking\s+about\b/gi,
  /\bstill\s+thinking\s+about\s+(?:this|that)\s+one\b/gi,
  /\b(?:been|be)\s+rattling\s+around\s+(?:in\s+)?my\s+(?:head|brain)\b/gi,
  /\bi'?ve\s+been\s+chewing\s+on\s+(?:this|that)\b/gi,
];

export const NOVELTY_INFLATION: readonly RegExp[] = [
  /\bthe\s+failure\s+mode\s+nobody'?s?\s+naming\b/gi,
  /\ba\s+problem\s+nobody\s+talks\s+about\b/gi,
  /\bthe\s+insight\s+everyone'?s?\s+missing\b/gi,
  /\bwhat\s+nobody\s+tells\s+you\b/gi,
];

export const CUTOFF_DISCLAIMERS: readonly RegExp[] = [
  /\bas\s+of\s+my\s+last\s+update\b/gi,
  /\bas\s+of\s+my\s+(?:knowledge\s+)?(?:cut-?off|last\s+training)\b/gi,
  /\bi\s+don'?t\s+have\s+access\s+to\s+real-?time\s+(?:data|information)\b/gi,
  /\bbased\s+on\s+available\s+information\b/gi,
  /\bas\s+an?\s+(?:ai|artificial\s+intelligence|large\s+language|ai\s+language)\s+(?:language\s+)?model\b/gi,
  /\bi\s+(?:am|'m)\s+an?\s+(?:ai|artificial\s+intelligence|large\s+language)\s+(?:assistant|model)?\b/gi,
  /\bi\s+cannot\s+(?:provide|give|offer)\s+(?:legal|medical|financial|professional)\s+advice\b/gi,
  /\bmy\s+training\s+data\s+(?:only\s+)?(?:goes\s+up\s+to|extends\s+to|ends\s+(?:in|at))\b/gi,
  // 2026.08.3: RAG-era source-gap variant (seed art-cutoff-disclaimer).
  /\bin\s+the\s+provided\s+search\s+results\b/gi,
];

export const AI_PLACEHOLDERS: readonly RegExp[] = [
  /\[(?:Your|Insert|Add|Enter|Describe|Specify|Choose|Pick)[^\]\n]{1,80}\]/gi,
  /\[(?:Recipient|Sender|Topic|Subject|Salutation|Closing|Position|Department|Project Name|Company Name|Date)(?:\s+[^\]\n]{0,60})?\]/gi,
  /\[(?:INSERT|FILL\s+IN|ADD|TODO|TBD|PLACEHOLDER)[^\]\n]{0,80}\]/g,
  /\b(?:19|20)\d{2}-XX-XX\b/g,
  /\bXX\/XX\/(?:19|20)\d{2}\b/g,
  /<!--\s*(?:add|fill\s+in|insert|todo|placeholder)[^>]{0,120}-->/gi,
];

export const AI_CITATION_MARKUP: readonly RegExp[] = [
  /\bcite(?:turn|news|search|navigation)\d+(?:search|turn|news|navigation)\d+/gi,
  /contentReference\s*\[oaicite:[^\]]+\]\s*\{[^}]*\}/gi,
  /\boai_citation\b/gi,
  /\[attached_file:\d+\]/gi,
  /\bgrok_card\b/gi,
];

export const AI_UTM_SOURCE: readonly RegExp[] = [
  /[?&]utm_source=(?:chatgpt|openai|copilot|claude|grok|gemini|perplexity)(?:\.com|\.ai)?\b/gi,
  /[?&]referrer=(?:chatgpt|copilot|grok|claude|gemini|perplexity)\.(?:com|ai)\b/gi,
];

export const TEMPLATE_PHRASES: readonly RegExp[] = [
  /\ba\s+\w+\s+step\s+(?:towards?|forward\s+for)\b/gi,
  /\bwhether\s+you'?re\s+\w+\s+or\s+\w+/gi,
  /\bi\s+recently\s+had\s+the\s+pleasure\s+of\b/gi,
];

export const FALSE_CONCESSION: readonly RegExp[] = [
  /\bwhile\s+\w+\s+is\s+impressive\b/gi,
  /\balthough\s+\w+\s+has\s+made\s+strides\b/gi,
  /\bdespite\s+\w+\s+challenges?\b/gi,
];

export const RHETORICAL_QUESTIONS: readonly RegExp[] = [
  /\bbut\s+what\s+does\s+this\s+mean\s+for\b/gi,
  /\bso\s+why\s+should\s+you\s+care\b/gi,
  /\bwhat'?s\s+next\?\s*/gi,
];

export const HEDGE_STACK: readonly RegExp[] = [
  /\b(?:could|may|might)\s+(?:(?!not\b|never\b|hardly\b|scarcely\b|barely\b)\w+\s+)?(?:potentially|eventually|ultimately|possibly|conceivably)\b/gi,
  /\b(?:potentially|eventually|ultimately)\s+(?:could|may|might)\b/gi,
];

export const FUTURE_NARRATIVE: readonly RegExp[] = [
  /\b(?:may|could|will|is\s+(?:poised|set)\s+to)\s+become\s+(?:one\s+of\s+)?(?:the\s+)?(?:most\s+)?\w+\s+(?:narratives?|stories|developments?|trends?|movements?|chapters?|themes?|forces?)\b/gi,
  /\bone\s+of\s+the\s+most\s+important\s+(?:narratives?|stories|trends?|themes?)\s+of\s+the\s+(?:next|coming)\s+\w+\b/gi,
];

export const REAL_ACTUAL_INFLATION: readonly RegExp[] = [
  /\b(?:real|actual|genuine|true)\s+(?:on-?chain\s+)?(?:tokenomics|economics|utility|adoption|sustainability|impact|revenue|fundamentals|demand|value|innovation|traction)\b/gi,
];

export const FORMULAIC_OPENERS: readonly RegExp[] = [
  /\bin\s+the\s+(?:rapidly\s+|ever-?\s*)?(?:evolving|changing|expanding|growing|shifting)\s+(?:world|landscape|realm|space|field|domain|era)\s+of\b/gi,
  /\bin\s+(?:an?|the)\s+(?:digital\s+)?age\s+(?:where|of)\b/gi,
  /\bas\s+(?:we|the\s+world|society|industries?)\s+(?:continue|move|navigate|enter)\s+(?:to\s+)?(?:evolve|forward|into|through)\b/gi,
  /\bhas\s+emerged\s+as\s+(?:a|the|one\s+of)\s+(?:leading|key|major|critical|essential|fundamental|pivotal|prominent|dominant|important)\s+\w+/gi,
  /\bhas\s+become\s+increasingly\s+(?:important|critical|popular|relevant|prominent|essential)\b/gi,
];

export const SPECULATIVE_OPENERS: readonly RegExp[] = [
  /\b(?:imagine|picture|envision)(?:\s*,[^,\n]{1,30},)?\s+a\s+(?:world|future|reality)\s+(?:where|in\s+which)\b/gi,
];

export const PARENTHETICAL_HEDGE: readonly RegExp[] = [
  /\(\s*(?:and\s+)?(?:increasingly|notably|importantly|crucially|interestingly|perhaps)[,]?\s+[^)]{3,60}\)/gi,
  /\(\s*or\s+more\s+(?:precisely|accurately|specifically)[,]?\s+[^)]{3,60}\)/gi,
  /\(\s*though\s+to\s+be\s+fair[,]?\s+[^)]{3,60}\)/gi,
  /\(\s*at\s+least\s+(?:in\s+)?(?:theory|principle|part)[,]?\s+[^)]{0,60}\)/gi,
];

export const CONFIDENCE_CALIBRATION: readonly RegExp[] = [
  /\binterestingly\b/gi, /\bsurprisingly\b/gi, /\bimportantly\b/gi,
  /\bsignificantly\b/gi, /\bcertainly\b/gi, /\bundoubtedly\b/gi,
  /\bwithout\s+a\s+doubt\b/gi,
];

export const SOCIAL_CTA_CLOSER: readonly RegExp[] = [
  /\bthis\s+one['’]?s?\s+(?:is\s+)?(?:well\s+|totally\s+|absolutely\s+|definitely\s+|really\s+|truly\s+|easily\s+|more\s+than\s+)?worth\s+(?:your\s+time|the\s+read|a\s+read|every\s+(?:minute|second)|reading|watching|a\s+listen|a\s+watch|a\s+look|it)\b/gi,
  /\bthis\s+one['’]?s?\s+(?:is\s+)?a\s+must[-\s]?(?:read|watch|listen|see)\b/gi,
  /\b(?:highly|strongly|can['’]?t|cannot)\s+recommend\w*\s+(?:giving\s+)?(?:this|it)\s+(?:one\s+)?a\s+(?:read|listen|watch|look|go)\b/gi,
  /\bdo\s+yourself\s+a\s+favou?r\s+and\s+(?:read|watch|check\s+out)\s+(?:this|it)\b/gi,
  /\byou\s+(?:really\s+)?(?:won['’]?t|do\s*n['’]?t|will\s+not|do\s+not)\s+want\s+to\s+miss\s+this(?:\s+one)?(?=\s*(?:[:.!\n]|$))/gi,
  /(?<=^|[,.!?:\n]\s{0,4})(?:you\s+can\s+)?thank\s+me\s+later\b/gim,
  /(?<=^|[.!?:\n]\s{0,4})save\s+this\s+(?:one\s+)?for\s+later\b/gim,
  /\bbookmark\s+this(?:\s+(?:one|post|thread))?(?=\s*(?:[:.!\n]|$))/gi,
  /\bdo\s*n['’]?t\s+sleep\s+on\s+this\b/gi,
  /\btrust\s+me,?\s+(?:on\s+this|you['’]?ll)\b/gi,
];

// ─── "isn't just X — it's Y" contrast construction ──────────────────
// Opace addition (not in upstream): the negated-contrast template that pairs
// "isn't/not just X" with a dash and an "it's Y" punchline.
export const NOT_JUST_CONTRAST: readonly RegExp[] = [
  /\b(?:isn|aren|wasn|weren|doesn|don|didn)['’]t\s+(?:just\s+)?[^.!?\n]{1,60}?\s*(?:—|–|--)\s*(?:it|this|that|they|we)['’](?:s|re)\b/gi,
  /\b(?:is|are|was|were)\s+not\s+just\s+[^.!?\n]{1,60}?\s*(?:—|–|--|,)\s*(?:it|this|that|they)['’](?:s|re)\b/gi,
  /\bnot\s+just\s+[^.!?\n]{1,60}?\s*(?:—|–|--)\s*(?:but\s+)?(?:it|this|that|they)['’](?:s|re)\b/gi,
];

export const FUNCTION_WORD_IN_TITLE = /\b(?:And|Or|Of|The|In|For|To|A|An)\b/;
export const MD_HEADING_PREFIX = /^#{1,6}[ \t]+/;
export const TITLE_CASE_HEADER = /^(?:#{1,6}[ \t]+)?([A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|and|or|of|the|in|for|to|a|an))+\s+[A-Z][a-z]+)\s*$/gm;

export const SEPARATOR_DASH_RE = /^\s*(?:[-*+]|\d+[.)])\s+(?:\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\n]*\))(?:[ \t]*(?:\([^)\n]*\)|`[^`\n]+`))?[ \t]*—/gm;
export const VERSION_HEADING_DASH_RE = /^#{1,6}[ \t]+\[?v?\d+\.\d+\.\d+[^\]\n]*\]?[ \t]*—[ \t]*\d{4}-\d{2}-\d{2}[ \t]*$/gm;

export const FUNC_WORDS: ReadonlySet<string> = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "at", "by", "for", "with",
  "from", "as", "is", "was", "are", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "should", "could", "may", "might", "must", "can",
  "this", "that", "these", "those", "it", "its", "they", "them", "their", "there", "here",
  "we", "our", "us", "i", "you", "your", "he", "she", "his", "her", "him", "not", "no", "so",
  "if", "then", "than", "when", "where", "which", "who", "what", "how", "why", "because",
]);

// Per-category score weights applied to the deduplicated issue list —
// values carried over verbatim from the upstream ISSUE_WEIGHTS table.
export const ISSUE_WEIGHTS: Record<string, number> = {
  "tier1": 5,
  "tier1-clarity": 3,
  "tier2": 3,
  "tier3": 2,
  "transition": 2,
  "chatbot": 8,
  "sycophantic": 8,
  "filler": 2,
  "generic-conclusion": 3,
  "lets-construction": 2,
  "reasoning-artifact": 6,
  "acknowledgment-loop": 3,
  "significance-inflation": 4,
  "vague-attribution": 5,
  "hollow-intensifier": 2,
  "emotional-flatline": 2,
  "lingering-attention": 3,
  "novelty-inflation": 3,
  "cutoff-disclaimer": 10,
  "template-phrase": 3,
  "false-concession": 2,
  "rhetorical-question": 2,
  "confidence-calibration": 2,
  "em-dash-density": 4,
  "not-just-contrast": 6,
  "uniform-sections": 5,
  "uniform-list-items": 4,
  "sentence-flatline": 5,
  "uniformity": 5,
  "formatting": 3,
  "tier3-phrase": 3,
  "tier3-phrase-cluster": 12,
  "hashtag-stuff": 12,
  "bullet-np-list": 10,
  "hedge-stack": 6,
  "future-narrative": 12,
  "real-actual-inflation": 5,
  "social-cta-closer": 8,
  "formulaic-opener": 8,
  "speculative-opener": 8,
  "title-case-header": 4,
  "parenthetical-hedge": 3,
  "smart-punct-signature": 6,
  "punct-distribution": 6,
  "fnword-trigram-entropy": 5,
  "cross-para-burstiness": 5,
  "normalization-flag": 9,
  "low-ttr": 3,
  "ai-placeholder": 10,
  "ai-citation-markup": 15,
  "ai-utm-source": 12,
};

export interface CategoryMeta {
  severity: "note" | "low" | "medium" | "high";
  message: string;
  suggestion: string;
}

// Plain-language pass, 30 August 2026. Every message names the thing, gives an
// example where the rule allows one, and the suggestion is an action.
//
// The repeated "this is a stylistic hint, not evidence of authorship" tail that
// used to end all 113 messages is gone on purpose. It was printed 113 times per
// report, which is how a caveat becomes invisible; the display layer states the
// claim boundary ONCE per panel instead (design spec
// internal programme record, maintained privately, section 3.0).
// The boundary itself is unchanged and is now enforced negatively: no message
// here may assert who or what wrote the text. See the claim-boundary tests in
// tests/core/unit/patterns-v2.test.mjs and patterns-v3.test.mjs.
export const CATEGORY_META: Record<string, CategoryMeta> = {
  "tier1": { severity: "high", message: "A word that turns up a lot in generic machine-written copy, like \"delve\", \"robust\" or \"seamless\".", suggestion: "Swap it for a plainer word." },
  "tier1-clarity": { severity: "medium", message: "This is a long way of saying something short, like \"in order to\" for \"to\", or \"due to the fact that\" for \"because\".", suggestion: "Use the shorter form." },
  "tier2": { severity: "medium", message: "Several buzzwords sit in one paragraph, words like \"foster\", \"facilitate\" and \"ecosystem\". One is fine. A pile of them reads as filler.", suggestion: "Keep one at most, and say the plain thing instead." },
  "tier3": { severity: "low", message: "A vague filler word such as \"significant\", \"effective\" or \"dynamic\" is used a lot for a piece this long.", suggestion: "Cut some of them, or say what you actually mean." },
  "transition": { severity: "medium", message: "A joining phrase that could link any two sentences, like \"Moreover\", \"Furthermore\" or \"In conclusion\".", suggestion: "Cut it, or say how the two sentences really connect." },
  "chatbot": { severity: "high", message: "A line from a chat window is still in the text, like \"I hope this helps\" or \"Certainly!\".", suggestion: "Delete it." },
  "sycophantic": { severity: "high", message: "A compliment aimed at the reader's question, the way a chatbot opens a reply: \"Great question!\".", suggestion: "Delete it and go straight to the point." },
  "filler": { severity: "medium", message: "A phrase that adds words but no meaning.", suggestion: "Cut it. The sentence almost always still works." },
  "generic-conclusion": { severity: "medium", message: "A closing line that could end any article, like \"only time will tell\" or \"the future looks bright\".", suggestion: "End on something specific instead." },
  "lets-construction": { severity: "medium", message: "A \"let's take a look at…\" line, the way a tutorial talks to you.", suggestion: "Just say the thing. Do not announce it first." },
  "reasoning-artifact": { severity: "high", message: "Step-by-step working is still showing, like \"First, let me…\" or \"Step 1:\".", suggestion: "Delete the working and keep the answer." },
  "acknowledgment-loop": { severity: "medium", message: "The text repeats the question back before answering it: \"You asked about X. X is…\".", suggestion: "Answer straight away." },
  "significance-inflation": { severity: "high", message: "A stock line telling the reader how big something was, instead of saying what happened: \"marking a pivotal moment\".", suggestion: "Say what happened and let the reader judge." },
  "vague-attribution": { severity: "high", message: "A claim is credited to nobody in particular: \"experts say\", \"studies show\".", suggestion: "Name the study or the person, or drop the claim." },
  "hollow-intensifier": { severity: "medium", message: "An emphasis word that adds no information, like \"truly\", \"incredibly\" or \"absolutely\".", suggestion: "Cut it." },
  "emotional-flatline": { severity: "low", message: "A ready-made feeling word stands in for a real reaction, like \"fascinating\" or \"surprising\".", suggestion: "Say what was actually surprising, or cut it." },
  "lingering-attention": { severity: "medium", message: "A share-post line about how long an idea stayed with you, which tells the reader nothing about the idea: \"this stuck with me for days\".", suggestion: "Say why it matters instead." },
  "novelty-inflation": { severity: "medium", message: "The text announces that it is about to say something rare: \"few people realise\".", suggestion: "Show the point. Do not advertise it." },
  "cutoff-disclaimer": { severity: "high", message: "A line where a chatbot describes itself or its training cut-off, like \"as of my last update\" or \"as an AI language model\".", suggestion: "Delete it, and check the facts around it yourself." },
  "template-phrase": { severity: "high", message: "A ready-made phrase that turns up in a lot of generated copy.", suggestion: "Replace it with something specific to your subject." },
  "false-concession": { severity: "medium", message: "A formula that pretends to give ground before making the point: \"while it's true that…\".", suggestion: "Name the real trade-off, or drop it." },
  "rhetorical-question": { severity: "medium", message: "A question the writer asks and then answers: \"So what does this mean?\".", suggestion: "Give the answer without asking first." },
  "confidence-calibration": { severity: "low", message: "Words like \"clearly\", \"certainly\" and \"undoubtedly\" pile up across the text.", suggestion: "Keep the one or two you have earned and cut the rest." },
  "em-dash-density": { severity: "medium", message: "Em dashes (—), or spaced hyphens used as dashes, turn up a lot for a piece this long. Worth knowing: since OpenAI cut back on em dashes in late 2025, heavy dash use is more common in Claude's writing than in machine writing generally, and plenty of professional human writers use more dashes than this.", suggestion: "Swap some for commas, colons or full stops." },
  "not-just-contrast": { severity: "high", message: "The \"it isn't just X, it's Y\" shape.", suggestion: "Say what it is, without the set-up." },
  "uniform-sections": { severity: "medium", message: "Every section is close to the same length. Real writing runs long in places and short in others.", suggestion: "Let each section be as long as its content needs." },
  "uniform-list-items": { severity: "medium", message: "The list items are all close to the same length. Real lists are lumpy.", suggestion: "Let some items run shorter or longer, or merge ones that repeat." },
  "sentence-flatline": { severity: "medium", message: "Sentence lengths barely change across the whole piece. Real writing swings between short and long.", suggestion: "Mix a few short, punchy sentences in with the longer ones." },
  "uniformity": { severity: "medium", message: "The paragraphs are all close to the same size.", suggestion: "Make some paragraphs shorter or longer on purpose." },
  "formatting": { severity: "medium", message: "A lot of bold is used.", suggestion: "Take the bold off most phrases, and put the important thing first." },
  "tier3-phrase": { severity: "medium", message: "The same stock phrase keeps coming back through the text.", suggestion: "Replace at least one of them with something concrete." },
  "tier3-phrase-cluster": { severity: "high", message: "Several different stock phrases are stacked up in one piece.", suggestion: "Rewrite it around one real point." },
  "hashtag-stuff": { severity: "medium", message: "A long block of hashtags.", suggestion: "Cut to two or three that fit, or none." },
  "bullet-np-list": { severity: "high", message: "A long bullet list where every item is a bare noun phrase with no verb.", suggestion: "Turn it into a paragraph, or join the items up." },
  "hedge-stack": { severity: "high", message: "Two hedges on the same claim, like \"may potentially\" or \"could possibly\".", suggestion: "Pick one hedge, or make a claim someone could check." },
  "future-narrative": { severity: "high", message: "A vague line about the future that nobody could ever check: \"is set to reshape the industry\".", suggestion: "Say something concrete a reader could test." },
  "real-actual-inflation": { severity: "medium", message: "\"Real\" or \"actual\" is doing no work here, as in \"real value\" or \"actual impact\".", suggestion: "Cut the word, or say what makes it real." },
  "social-cta-closer": { severity: "high", message: "A closing line begging for engagement: \"What do you think? Let me know below.\"", suggestion: "Give the reader a reason to care instead of an instruction." },
  "formulaic-opener": { severity: "high", message: "A stock opening line that would fit any article: \"In today's fast-paced world…\".", suggestion: "Open on a fact or a specific detail." },
  "speculative-opener": { severity: "high", message: "The piece opens by asking you to picture a scene: \"Imagine a world where…\".", suggestion: "Make the point directly." },
  "title-case-header": { severity: "medium", message: "The heading puts a capital on nearly every word, the way a lot of marketing copy does.", suggestion: "Capitalise the first word only, as you would in a sentence." },
  "parenthetical-hedge": { severity: "medium", message: "An aside in brackets that sounds thoughtful and adds nothing: \"(at least in most cases)\".", suggestion: "Cut it, or make it a proper sentence." },
  "smart-punct-signature": { severity: "high", message: "Curly quotes, an em dash, an Oxford comma and no typos, all in one piece. That combination is rare in text somebody typed straight out by hand.", suggestion: "Nothing to fix. This is just something we noticed." },
  "punct-distribution": { severity: "medium", message: "Every paragraph uses about the same amount of punctuation.", suggestion: "Let some paragraphs run busier than others." },
  "fnword-trigram-entropy": { severity: "medium", message: "Sentences are built to the same grammar pattern again and again.", suggestion: "Change the way you build some of the sentences." },
  "cross-para-burstiness": { severity: "medium", message: "Every paragraph has the same inner rhythm of long and short sentences.", suggestion: "Let some paragraphs be clipped and others rambling." },
  "normalization-flag": { severity: "high", message: "The text held invisible characters or lookalike letters, the kind used to hide copied text from checkers. We swapped them back before reading it.", suggestion: "Take the hidden characters out and check the text again." },
  "low-ttr": { severity: "low", message: "The same words come round a lot for a piece this long.", suggestion: "Vary the nouns and verbs, unless the subject really does need the repeating." },
  "ai-placeholder": { severity: "high", message: "A blank somebody forgot to fill in is still here, like \"[INSERT NAME]\".", suggestion: "Fill it in or delete it before this goes out." },
  "ai-citation-markup": { severity: "high", message: "Chatbot citation code was pasted in along with the text.", suggestion: "Delete it and put a real reference in its place." },
  "ai-utm-source": { severity: "high", message: "A link carries a tracking tag that AI tools add to the links they hand out, like \"utm_source=chatgpt.com\".", suggestion: "Strip the tracking part off the link." },
};
