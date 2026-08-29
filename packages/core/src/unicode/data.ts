// Carrier and confusable tables for the deterministic Unicode inspection.
// Data adapted in part from the MIT-licensed `watermarks-remover` (Guillaume Meyer and
// contributors) carrier tables and the MIT-licensed `avoid-ai-writing` lookalike maps,
// extended from Unicode 16 format-character and confusables data. Future coverage
// changes should be edits to these constants, not to the inspection logic.

export const UNICODE_RULES_VERSION = "unicode:2026.08.2";

export type CarrierSeverity = "note"|"low"|"medium"|"high";
export type CarrierFix = "remove"|"space"|"review";
/** joiner: exempt inside emoji ZWJ sequences and between cursive/Indic letters. variation: exempt after emoji-capable bases, downgraded after Han/Mongolian. variation_sup: downgraded after Han ideographs. */
export type CarrierContext = "joiner"|"variation"|"variation_sup";
export interface CarrierRule { from:number; to?:number; name:string|((cp:number)=>string); severity:CarrierSeverity; fix:CarrierFix; message:string; context?:CarrierContext; limitation?:string }

const MSG_INVISIBLE = (what:string)=>`An invisible ${what} is present.`;
const MSG_BIDI = "A bidirectional formatting control is present.";
const BIDI_LIMIT = "Bidirectional controls are required for correct display of mixed right-to-left and left-to-right text.";

export const CARRIER_RULES: readonly CarrierRule[] = [
  // Soft hyphen and combining grapheme joiner
  {from:0x00ad,name:"SOFT HYPHEN",severity:"low",fix:"remove",message:"A discretionary soft hyphen is present."},
  {from:0x034f,name:"COMBINING GRAPHEME JOINER",severity:"medium",fix:"remove",message:MSG_INVISIBLE("combining grapheme joiner"),limitation:"The combining grapheme joiner has rare legitimate uses in collation and diacritic ordering."},
  // Script-specific format characters
  {from:0x061c,name:"ARABIC LETTER MARK",severity:"medium",fix:"review",message:MSG_BIDI,limitation:BIDI_LIMIT},
  {from:0x070f,name:"SYRIAC ABBREVIATION MARK",severity:"medium",fix:"review",message:"A Syriac abbreviation mark format character is present.",limitation:"This character is legitimate inside Syriac-script text."},
  {from:0x0890,to:0x0891,name:cp=>cp===0x0890?"ARABIC POUND MARK ABOVE":"ARABIC PIASTRE MARK ABOVE",severity:"medium",fix:"review",message:"An Arabic prepended format mark is present.",limitation:"This character is legitimate inside Arabic-script text."},
  {from:0x08e2,name:"ARABIC DISPUTED END OF AYAH",severity:"medium",fix:"review",message:"An Arabic prepended format mark is present.",limitation:"This character is legitimate inside Arabic-script text."},
  {from:0x180b,to:0x180d,name:cp=>`MONGOLIAN FREE VARIATION SELECTOR-${cp-0x180a}`,severity:"medium",fix:"remove",message:MSG_INVISIBLE("Mongolian free variation selector"),context:"variation",limitation:"Free variation selectors are legitimate inside Mongolian-script text."},
  {from:0x180e,name:"MONGOLIAN VOWEL SEPARATOR",severity:"medium",fix:"remove",message:MSG_INVISIBLE("Mongolian vowel separator"),limitation:"This character is legitimate inside Mongolian-script text."},
  {from:0x180f,name:"MONGOLIAN FREE VARIATION SELECTOR-4",severity:"medium",fix:"remove",message:MSG_INVISIBLE("Mongolian free variation selector"),context:"variation",limitation:"Free variation selectors are legitimate inside Mongolian-script text."},
  // Zero-width and joining controls
  {from:0x200b,name:"ZERO WIDTH SPACE",severity:"medium",fix:"remove",message:MSG_INVISIBLE("zero-width space")},
  {from:0x200c,name:"ZERO WIDTH NON-JOINER",severity:"medium",fix:"remove",message:MSG_INVISIBLE("zero-width non-joiner"),context:"joiner",limitation:"The zero-width non-joiner is standard orthography in Persian and several Indic languages."},
  {from:0x200d,name:"ZERO WIDTH JOINER",severity:"medium",fix:"remove",message:MSG_INVISIBLE("zero-width joiner"),context:"joiner",limitation:"The zero-width joiner is standard in emoji sequences and several complex scripts."},
  // Bidirectional controls
  {from:0x200e,name:"LEFT-TO-RIGHT MARK",severity:"medium",fix:"review",message:MSG_BIDI,limitation:BIDI_LIMIT},
  {from:0x200f,name:"RIGHT-TO-LEFT MARK",severity:"medium",fix:"review",message:MSG_BIDI,limitation:BIDI_LIMIT},
  {from:0x202a,to:0x202e,name:cp=>["LEFT-TO-RIGHT EMBEDDING","RIGHT-TO-LEFT EMBEDDING","POP DIRECTIONAL FORMATTING","LEFT-TO-RIGHT OVERRIDE","RIGHT-TO-LEFT OVERRIDE"][cp-0x202a]!,severity:"medium",fix:"review",message:MSG_BIDI,limitation:BIDI_LIMIT},
  {from:0x2066,to:0x2069,name:cp=>["LEFT-TO-RIGHT ISOLATE","RIGHT-TO-LEFT ISOLATE","FIRST STRONG ISOLATE","POP DIRECTIONAL ISOLATE"][cp-0x2066]!,severity:"medium",fix:"review",message:MSG_BIDI,limitation:BIDI_LIMIT},
  // Word joiner, invisible operators and deprecated format characters
  {from:0x2060,name:"WORD JOINER",severity:"medium",fix:"remove",message:MSG_INVISIBLE("word joiner")},
  {from:0x2061,to:0x2064,name:cp=>["FUNCTION APPLICATION","INVISIBLE TIMES","INVISIBLE SEPARATOR","INVISIBLE PLUS"][cp-0x2061]!,severity:"medium",fix:"remove",message:MSG_INVISIBLE("mathematical operator character"),limitation:"Invisible operators are legitimate inside machine-generated mathematical notation."},
  {from:0x206a,to:0x206f,name:cp=>["INHIBIT SYMMETRIC SWAPPING","ACTIVATE SYMMETRIC SWAPPING","INHIBIT ARABIC FORM SHAPING","ACTIVATE ARABIC FORM SHAPING","NATIONAL DIGIT SHAPES","NOMINAL DIGIT SHAPES"][cp-0x206a]!,severity:"medium",fix:"remove",message:"A deprecated invisible format character is present.",limitation:"These characters are deprecated by Unicode and have no place in modern interchange text."},
  // BOM, interlinear annotation, replacement
  {from:0xfeff,name:"BYTE ORDER MARK",severity:"low",fix:"remove",message:"A byte-order mark is present."},
  {from:0xfff9,to:0xfffb,name:cp=>["INTERLINEAR ANNOTATION ANCHOR","INTERLINEAR ANNOTATION SEPARATOR","INTERLINEAR ANNOTATION TERMINATOR"][cp-0xfff9]!,severity:"medium",fix:"review",message:"An interlinear annotation control is present.",limitation:"Interlinear annotation controls are legitimate in Japanese ruby markup pipelines."},
  {from:0xfffd,name:"REPLACEMENT CHARACTER",severity:"high",fix:"review",message:"A replacement character may indicate damaged text."},
  // Supplementary-plane format characters
  {from:0x110bd,name:"KAITHI NUMBER SIGN",severity:"medium",fix:"review",message:"A Kaithi number-sign format character is present.",limitation:"This character is legitimate inside Kaithi-script text."},
  {from:0x110cd,name:"KAITHI NUMBER SIGN ABOVE",severity:"medium",fix:"review",message:"A Kaithi number-sign format character is present.",limitation:"This character is legitimate inside Kaithi-script text."},
  // Tag characters: the classic covert payload carrier
  {from:0xe0001,name:"LANGUAGE TAG",severity:"high",fix:"remove",message:"A deprecated invisible language tag is present."},
  {from:0xe0020,to:0xe007f,name:cp=>cp===0xe007f?"CANCEL TAG":`TAG ${String.fromCodePoint(cp-0xe0000)===" "?"SPACE":`CHARACTER '${String.fromCodePoint(cp-0xe0000)}'`}`,severity:"high",fix:"remove",message:"An invisible tag character is present; tag runs are a known covert payload carrier.",limitation:"Tag characters have no legitimate use in ordinary interchange text outside emoji flag sequences."},
  // Variation selectors
  {from:0xfe00,to:0xfe0f,name:cp=>`VARIATION SELECTOR-${cp-0xfe00+1}`,severity:"medium",fix:"remove",message:MSG_INVISIBLE("variation selector"),context:"variation",limitation:"Variation selectors are legitimate after emoji-capable and CJK base characters."},
  {from:0xe0100,to:0xe01ef,name:cp=>`VARIATION SELECTOR-${cp-0xe0100+17}`,severity:"medium",fix:"review",message:MSG_INVISIBLE("supplementary variation selector"),context:"variation_sup",limitation:"Supplementary variation selectors are legitimate after CJK ideographs to select registered glyph variants."},
  // Space separators beyond U+0020
  {from:0x00a0,name:"NO-BREAK SPACE",severity:"note",fix:"space",message:"A non-breaking space is present.",limitation:"Non-breaking spaces are standard French and general typographic practice."},
  {from:0x1680,name:"OGHAM SPACE MARK",severity:"low",fix:"space",message:"An unusual space character is present.",limitation:"This character is legitimate inside Ogham-script text."},
  {from:0x2000,to:0x2008,name:cp=>["EN QUAD","EM QUAD","EN SPACE","EM SPACE","THREE-PER-EM SPACE","FOUR-PER-EM SPACE","SIX-PER-EM SPACE","FIGURE SPACE","PUNCTUATION SPACE"][cp-0x2000]!,severity:"low",fix:"space",message:"A typographic space that substitutes for an ordinary space is present.",limitation:"Fixed-width spaces are legitimate in carefully typeset material."},
  {from:0x2009,name:"THIN SPACE",severity:"note",fix:"space",message:"A thin space is present.",limitation:"Thin spaces are standard French and general typographic practice."},
  {from:0x200a,name:"HAIR SPACE",severity:"low",fix:"space",message:"A hair space that substitutes for an ordinary space is present.",limitation:"Hair spaces are legitimate in carefully typeset material."},
  {from:0x202f,name:"NARROW NO-BREAK SPACE",severity:"note",fix:"space",message:"A narrow no-break space is present.",limitation:"Narrow no-break spaces are standard French punctuation spacing and appear in Mongolian text."},
  {from:0x205f,name:"MEDIUM MATHEMATICAL SPACE",severity:"note",fix:"space",message:"A medium mathematical space is present.",limitation:"This space is legitimate inside typeset mathematical notation."},
  {from:0x3000,name:"IDEOGRAPHIC SPACE",severity:"note",fix:"space",message:"An ideographic space is present.",limitation:"Ideographic spaces are standard in Chinese and Japanese text."},
  // Line and paragraph separators
  {from:0x2028,name:"LINE SEPARATOR",severity:"low",fix:"review",message:"A Unicode line separator is present instead of a conventional line break."},
  {from:0x2029,name:"PARAGRAPH SEPARATOR",severity:"low",fix:"review",message:"A Unicode paragraph separator is present instead of a conventional line break."}
];

// Large carrier ranges. These are checked by range scan rather than expanded
// into the per-code-point lookup table, which would cost ~137k entries and blow
// the browser inspection budget. Coverage changes still belong here, not in the
// inspection logic.
export const CARRIER_RANGE_RULES: readonly CarrierRule[] = [
  {from:0xe000,to:0xf8ff,name:"PRIVATE USE CHARACTER",severity:"medium",fix:"review",message:"A private-use area character is present; its meaning is defined only by a private agreement between sender and receiver.",limitation:"Private-use characters are legitimate in icon fonts and legacy vendor symbols such as platform logos; a single one is routine."},
  {from:0xf0000,to:0xffffd,name:"SUPPLEMENTARY PRIVATE USE CHARACTER",severity:"medium",fix:"review",message:"A supplementary private-use area character is present; its meaning is defined only by a private agreement between sender and receiver.",limitation:"Private-use characters are legitimate in icon fonts and legacy vendor symbols; a single one is routine."},
  {from:0x100000,to:0x10fffd,name:"SUPPLEMENTARY PRIVATE USE CHARACTER",severity:"medium",fix:"review",message:"A supplementary private-use area character is present; its meaning is defined only by a private agreement between sender and receiver.",limitation:"Private-use characters are legitimate in icon fonts and legacy vendor symbols; a single one is routine."}
];

export interface Confusable { name:string; latin:string }
// Latin-lookalike confusables. Floor: avoid-ai-writing CYRILLIC_LOOKALIKES/GREEK_LOOKALIKES and
// watermarks-remover LATIN_CONFUSABLES; extended from Unicode confusables data.
export const CONFUSABLES: ReadonlyMap<number,Confusable> = new Map<number,Confusable>([
  // Cyrillic lower case
  [0x0430,{name:"CYRILLIC SMALL LETTER A",latin:"a"}],
  [0x0432,{name:"CYRILLIC SMALL LETTER VE",latin:"b"}],
  [0x0435,{name:"CYRILLIC SMALL LETTER IE",latin:"e"}],
  [0x043a,{name:"CYRILLIC SMALL LETTER KA",latin:"k"}],
  [0x043c,{name:"CYRILLIC SMALL LETTER EM",latin:"m"}],
  [0x043d,{name:"CYRILLIC SMALL LETTER EN",latin:"h"}],
  [0x043e,{name:"CYRILLIC SMALL LETTER O",latin:"o"}],
  [0x0440,{name:"CYRILLIC SMALL LETTER ER",latin:"p"}],
  [0x0441,{name:"CYRILLIC SMALL LETTER ES",latin:"c"}],
  [0x0442,{name:"CYRILLIC SMALL LETTER TE",latin:"t"}],
  [0x0443,{name:"CYRILLIC SMALL LETTER U",latin:"y"}],
  [0x0445,{name:"CYRILLIC SMALL LETTER HA",latin:"x"}],
  [0x0455,{name:"CYRILLIC SMALL LETTER DZE",latin:"s"}],
  [0x0456,{name:"CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I",latin:"i"}],
  [0x0458,{name:"CYRILLIC SMALL LETTER JE",latin:"j"}],
  [0x0461,{name:"CYRILLIC SMALL LETTER OMEGA",latin:"w"}],
  [0x0475,{name:"CYRILLIC SMALL LETTER IZHITSA",latin:"v"}],
  [0x04bb,{name:"CYRILLIC SMALL LETTER SHHA",latin:"h"}],
  [0x0501,{name:"CYRILLIC SMALL LETTER KOMI DE",latin:"d"}],
  [0x051b,{name:"CYRILLIC SMALL LETTER QA",latin:"q"}],
  [0x051d,{name:"CYRILLIC SMALL LETTER WE",latin:"w"}],
  // Cyrillic upper case
  [0x0405,{name:"CYRILLIC CAPITAL LETTER DZE",latin:"S"}],
  [0x0406,{name:"CYRILLIC CAPITAL LETTER BYELORUSSIAN-UKRAINIAN I",latin:"I"}],
  [0x0408,{name:"CYRILLIC CAPITAL LETTER JE",latin:"J"}],
  [0x0410,{name:"CYRILLIC CAPITAL LETTER A",latin:"A"}],
  [0x0412,{name:"CYRILLIC CAPITAL LETTER VE",latin:"B"}],
  [0x0415,{name:"CYRILLIC CAPITAL LETTER IE",latin:"E"}],
  [0x041a,{name:"CYRILLIC CAPITAL LETTER KA",latin:"K"}],
  [0x041c,{name:"CYRILLIC CAPITAL LETTER EM",latin:"M"}],
  [0x041d,{name:"CYRILLIC CAPITAL LETTER EN",latin:"H"}],
  [0x041e,{name:"CYRILLIC CAPITAL LETTER O",latin:"O"}],
  [0x0420,{name:"CYRILLIC CAPITAL LETTER ER",latin:"P"}],
  [0x0421,{name:"CYRILLIC CAPITAL LETTER ES",latin:"C"}],
  [0x0422,{name:"CYRILLIC CAPITAL LETTER TE",latin:"T"}],
  [0x0423,{name:"CYRILLIC CAPITAL LETTER U",latin:"Y"}],
  [0x0425,{name:"CYRILLIC CAPITAL LETTER HA",latin:"X"}],
  [0x0500,{name:"CYRILLIC CAPITAL LETTER KOMI DE",latin:"D"}],
  // Greek lower case
  [0x03b1,{name:"GREEK SMALL LETTER ALPHA",latin:"a"}],
  [0x03b9,{name:"GREEK SMALL LETTER IOTA",latin:"i"}],
  [0x03ba,{name:"GREEK SMALL LETTER KAPPA",latin:"k"}],
  [0x03bd,{name:"GREEK SMALL LETTER NU",latin:"v"}],
  [0x03bf,{name:"GREEK SMALL LETTER OMICRON",latin:"o"}],
  [0x03c1,{name:"GREEK SMALL LETTER RHO",latin:"p"}],
  [0x03c5,{name:"GREEK SMALL LETTER UPSILON",latin:"u"}],
  [0x03f2,{name:"GREEK LUNATE SIGMA SYMBOL",latin:"c"}],
  // Greek upper case
  [0x0391,{name:"GREEK CAPITAL LETTER ALPHA",latin:"A"}],
  [0x0392,{name:"GREEK CAPITAL LETTER BETA",latin:"B"}],
  [0x0395,{name:"GREEK CAPITAL LETTER EPSILON",latin:"E"}],
  [0x0396,{name:"GREEK CAPITAL LETTER ZETA",latin:"Z"}],
  [0x0397,{name:"GREEK CAPITAL LETTER ETA",latin:"H"}],
  [0x0399,{name:"GREEK CAPITAL LETTER IOTA",latin:"I"}],
  [0x039a,{name:"GREEK CAPITAL LETTER KAPPA",latin:"K"}],
  [0x039c,{name:"GREEK CAPITAL LETTER MU",latin:"M"}],
  [0x039d,{name:"GREEK CAPITAL LETTER NU",latin:"N"}],
  [0x039f,{name:"GREEK CAPITAL LETTER OMICRON",latin:"O"}],
  [0x03a1,{name:"GREEK CAPITAL LETTER RHO",latin:"P"}],
  [0x03a4,{name:"GREEK CAPITAL LETTER TAU",latin:"T"}],
  [0x03a5,{name:"GREEK CAPITAL LETTER UPSILON",latin:"Y"}],
  [0x03a7,{name:"GREEK CAPITAL LETTER CHI",latin:"X"}],
  [0x03f9,{name:"GREEK CAPITAL LUNATE SIGMA SYMBOL",latin:"C"}]
]);
