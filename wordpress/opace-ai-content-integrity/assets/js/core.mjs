// src/source/visible-text.ts
var ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\xA0" };
var decodeEntity = (raw) => {
  if (raw[1] !== "#") return ENTITIES[raw.slice(1, -1)] ?? raw;
  const value = raw[2]?.toLowerCase() === "x" ? Number.parseInt(raw.slice(3, -1), 16) : Number.parseInt(raw.slice(2, -1), 10);
  return Number.isInteger(value) && value >= 0 && value <= 1114111 && !(value >= 55296 && value <= 57343) ? String.fromCodePoint(value) : raw;
};
function projectVisibleText(source, contentType) {
  if (contentType === "plain_text") return { text: source, runs: source ? [{ visible_start_utf16: 0, visible_end_utf16: source.length, source_start_utf16: 0, source_end_utf16: source.length }] : [], limitations: [] };
  if (contentType === "markdown") {
    const text2 = source.replace(/```[\s\S]*?```/g, (m) => m).replace(/!?(\[([^\]]*)\])\(([^)]+)\)/g, (_m, _a, label) => label).replace(/(^|\s)[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1$2");
    return { text: text2, runs: text2 ? [{ visible_start_utf16: 0, visible_end_utf16: text2.length, source_start_utf16: 0, source_end_utf16: source.length }] : [], limitations: ["Markdown mapping is projection-level; protected extractors retain exact source ranges."] };
  }
  let text = "", cursor = 0;
  const runs = [];
  const excluded = /<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>|<!--[\s\S]*?-->/gi;
  const safe = source.replace(excluded, (m) => " ".repeat(m.length));
  const token = /<[^>]*>|&(?:#x?[0-9a-f]+|[a-z]+);/gi;
  let match;
  const append = (value, start, end) => {
    if (!value) return;
    const v = text.length;
    text += value;
    runs.push({ visible_start_utf16: v, visible_end_utf16: text.length, source_start_utf16: start, source_end_utf16: end });
  };
  while (match = token.exec(safe)) {
    append(safe.slice(cursor, match.index), cursor, match.index);
    const raw = match[0];
    if (/^<(br|\/?(?:p|div|section|article|li|h[1-6]|blockquote|tr))\b/i.test(raw)) append("\n", match.index, token.lastIndex);
    else if (raw[0] === "&") append(decodeEntity(raw), match.index, token.lastIndex);
    cursor = token.lastIndex;
  }
  append(safe.slice(cursor), cursor, safe.length);
  return { text, runs, limitations: ["HTML projection is deterministic text extraction, not sanitisation."] };
}

// src/source/utf8.ts
var K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var rotr = (x, n) => x >>> n | x << 32 - n;
function utf8Bytes(value) {
  return new TextEncoder().encode(value);
}
function sha256Hex(value) {
  const source = utf8Bytes(value);
  const bitLength = source.length * 8;
  const paddedLength = Math.ceil((source.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(source);
  bytes[source.length] = 128;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 4294967296), false);
  const h = new Uint32Array([1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const a2 = w[i - 15], b2 = w[i - 2];
      w[i] = (rotr(a2, 7) ^ rotr(a2, 18) ^ a2 >>> 3) + w[i - 16] + (rotr(b2, 17) ^ rotr(b2, 19) ^ b2 >>> 10) + w[i - 7] >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = e & f ^ ~e & g;
      const t1 = hh + s1 + ch + K[i] + w[i] >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const t2 = s0 + maj >>> 0;
      hh = g;
      g = f;
      f = e;
      e = d + t1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 >>> 0;
    }
    h[0] = h[0] + a >>> 0;
    h[1] = h[1] + b >>> 0;
    h[2] = h[2] + c >>> 0;
    h[3] = h[3] + d >>> 0;
    h[4] = h[4] + e >>> 0;
    h[5] = h[5] + f >>> 0;
    h[6] = h[6] + g >>> 0;
    h[7] = h[7] + hh >>> 0;
  }
  return Array.from(h, (n) => n.toString(16).padStart(8, "0")).join("");
}
var prefixedSha256 = (value) => `sha256:${sha256Hex(value)}`;

// src/source/offsets.ts
var isHighSurrogate = (code) => code >= 55296 && code <= 56319;
var isLowSurrogate = (code) => code >= 56320 && code <= 57343;
function splitsSurrogatePair(text, offset) {
  return offset > 0 && offset < text.length && isHighSurrogate(text.charCodeAt(offset - 1)) && isLowSurrogate(text.charCodeAt(offset));
}
function alignUtf16Range(text, start, end) {
  return [splitsSurrogatePair(text, start) ? start - 1 : start, splitsSurrogatePair(text, end) ? end + 1 : end];
}
function utf16ToCodePointOffset(text, offset) {
  if (!Number.isInteger(offset) || offset < 0 || offset > text.length) throw new RangeError("invalid_utf16_offset");
  if (splitsSurrogatePair(text, offset)) throw new RangeError("split_surrogate");
  return Array.from(text.slice(0, offset)).length;
}
function rangeFromUtf16(text, start, end) {
  if (end <= start) throw new RangeError("empty_or_reversed_range");
  const [alignedStart, alignedEnd] = alignUtf16Range(text, start, end);
  return { start_utf16: alignedStart, end_utf16: alignedEnd, start_codepoint: utf16ToCodePointOffset(text, alignedStart), end_codepoint: utf16ToCodePointOffset(text, alignedEnd) };
}

// src/unicode/data.ts
var UNICODE_RULES_VERSION = "unicode:2026.08.2";
var MSG_INVISIBLE = (what) => `An invisible ${what} is present.`;
var MSG_BIDI = "A bidirectional formatting control is present.";
var BIDI_LIMIT = "Bidirectional controls are required for correct display of mixed right-to-left and left-to-right text.";
var CARRIER_RULES = [
  // Soft hyphen and combining grapheme joiner
  { from: 173, name: "SOFT HYPHEN", severity: "low", fix: "remove", message: "A discretionary soft hyphen is present." },
  { from: 847, name: "COMBINING GRAPHEME JOINER", severity: "medium", fix: "remove", message: MSG_INVISIBLE("combining grapheme joiner"), limitation: "The combining grapheme joiner has rare legitimate uses in collation and diacritic ordering." },
  // Script-specific format characters
  { from: 1564, name: "ARABIC LETTER MARK", severity: "medium", fix: "review", message: MSG_BIDI, limitation: BIDI_LIMIT },
  { from: 1807, name: "SYRIAC ABBREVIATION MARK", severity: "medium", fix: "review", message: "A Syriac abbreviation mark format character is present.", limitation: "This character is legitimate inside Syriac-script text." },
  { from: 2192, to: 2193, name: (cp) => cp === 2192 ? "ARABIC POUND MARK ABOVE" : "ARABIC PIASTRE MARK ABOVE", severity: "medium", fix: "review", message: "An Arabic prepended format mark is present.", limitation: "This character is legitimate inside Arabic-script text." },
  { from: 2274, name: "ARABIC DISPUTED END OF AYAH", severity: "medium", fix: "review", message: "An Arabic prepended format mark is present.", limitation: "This character is legitimate inside Arabic-script text." },
  { from: 6155, to: 6157, name: (cp) => `MONGOLIAN FREE VARIATION SELECTOR-${cp - 6154}`, severity: "medium", fix: "remove", message: MSG_INVISIBLE("Mongolian free variation selector"), context: "variation", limitation: "Free variation selectors are legitimate inside Mongolian-script text." },
  { from: 6158, name: "MONGOLIAN VOWEL SEPARATOR", severity: "medium", fix: "remove", message: MSG_INVISIBLE("Mongolian vowel separator"), limitation: "This character is legitimate inside Mongolian-script text." },
  { from: 6159, name: "MONGOLIAN FREE VARIATION SELECTOR-4", severity: "medium", fix: "remove", message: MSG_INVISIBLE("Mongolian free variation selector"), context: "variation", limitation: "Free variation selectors are legitimate inside Mongolian-script text." },
  // Zero-width and joining controls
  { from: 8203, name: "ZERO WIDTH SPACE", severity: "medium", fix: "remove", message: MSG_INVISIBLE("zero-width space") },
  { from: 8204, name: "ZERO WIDTH NON-JOINER", severity: "medium", fix: "remove", message: MSG_INVISIBLE("zero-width non-joiner"), context: "joiner", limitation: "The zero-width non-joiner is standard orthography in Persian and several Indic languages." },
  { from: 8205, name: "ZERO WIDTH JOINER", severity: "medium", fix: "remove", message: MSG_INVISIBLE("zero-width joiner"), context: "joiner", limitation: "The zero-width joiner is standard in emoji sequences and several complex scripts." },
  // Bidirectional controls
  { from: 8206, name: "LEFT-TO-RIGHT MARK", severity: "medium", fix: "review", message: MSG_BIDI, limitation: BIDI_LIMIT },
  { from: 8207, name: "RIGHT-TO-LEFT MARK", severity: "medium", fix: "review", message: MSG_BIDI, limitation: BIDI_LIMIT },
  { from: 8234, to: 8238, name: (cp) => ["LEFT-TO-RIGHT EMBEDDING", "RIGHT-TO-LEFT EMBEDDING", "POP DIRECTIONAL FORMATTING", "LEFT-TO-RIGHT OVERRIDE", "RIGHT-TO-LEFT OVERRIDE"][cp - 8234], severity: "medium", fix: "review", message: MSG_BIDI, limitation: BIDI_LIMIT },
  { from: 8294, to: 8297, name: (cp) => ["LEFT-TO-RIGHT ISOLATE", "RIGHT-TO-LEFT ISOLATE", "FIRST STRONG ISOLATE", "POP DIRECTIONAL ISOLATE"][cp - 8294], severity: "medium", fix: "review", message: MSG_BIDI, limitation: BIDI_LIMIT },
  // Word joiner, invisible operators and deprecated format characters
  { from: 8288, name: "WORD JOINER", severity: "medium", fix: "remove", message: MSG_INVISIBLE("word joiner") },
  { from: 8289, to: 8292, name: (cp) => ["FUNCTION APPLICATION", "INVISIBLE TIMES", "INVISIBLE SEPARATOR", "INVISIBLE PLUS"][cp - 8289], severity: "medium", fix: "remove", message: MSG_INVISIBLE("mathematical operator character"), limitation: "Invisible operators are legitimate inside machine-generated mathematical notation." },
  { from: 8298, to: 8303, name: (cp) => ["INHIBIT SYMMETRIC SWAPPING", "ACTIVATE SYMMETRIC SWAPPING", "INHIBIT ARABIC FORM SHAPING", "ACTIVATE ARABIC FORM SHAPING", "NATIONAL DIGIT SHAPES", "NOMINAL DIGIT SHAPES"][cp - 8298], severity: "medium", fix: "remove", message: "A deprecated invisible format character is present.", limitation: "These characters are deprecated by Unicode and have no place in modern interchange text." },
  // BOM, interlinear annotation, replacement
  { from: 65279, name: "BYTE ORDER MARK", severity: "low", fix: "remove", message: "A byte-order mark is present." },
  { from: 65529, to: 65531, name: (cp) => ["INTERLINEAR ANNOTATION ANCHOR", "INTERLINEAR ANNOTATION SEPARATOR", "INTERLINEAR ANNOTATION TERMINATOR"][cp - 65529], severity: "medium", fix: "review", message: "An interlinear annotation control is present.", limitation: "Interlinear annotation controls are legitimate in Japanese ruby markup pipelines." },
  { from: 65533, name: "REPLACEMENT CHARACTER", severity: "high", fix: "review", message: "A replacement character may indicate damaged text." },
  // Supplementary-plane format characters
  { from: 69821, name: "KAITHI NUMBER SIGN", severity: "medium", fix: "review", message: "A Kaithi number-sign format character is present.", limitation: "This character is legitimate inside Kaithi-script text." },
  { from: 69837, name: "KAITHI NUMBER SIGN ABOVE", severity: "medium", fix: "review", message: "A Kaithi number-sign format character is present.", limitation: "This character is legitimate inside Kaithi-script text." },
  // Tag characters: the classic covert payload carrier
  { from: 917505, name: "LANGUAGE TAG", severity: "high", fix: "remove", message: "A deprecated invisible language tag is present." },
  { from: 917536, to: 917631, name: (cp) => cp === 917631 ? "CANCEL TAG" : `TAG ${String.fromCodePoint(cp - 917504) === " " ? "SPACE" : `CHARACTER '${String.fromCodePoint(cp - 917504)}'`}`, severity: "high", fix: "remove", message: "An invisible tag character is present; tag runs are a known covert payload carrier.", limitation: "Tag characters have no legitimate use in ordinary interchange text outside emoji flag sequences." },
  // Variation selectors
  { from: 65024, to: 65039, name: (cp) => `VARIATION SELECTOR-${cp - 65024 + 1}`, severity: "medium", fix: "remove", message: MSG_INVISIBLE("variation selector"), context: "variation", limitation: "Variation selectors are legitimate after emoji-capable and CJK base characters." },
  { from: 917760, to: 917999, name: (cp) => `VARIATION SELECTOR-${cp - 917760 + 17}`, severity: "medium", fix: "review", message: MSG_INVISIBLE("supplementary variation selector"), context: "variation_sup", limitation: "Supplementary variation selectors are legitimate after CJK ideographs to select registered glyph variants." },
  // Space separators beyond U+0020
  { from: 160, name: "NO-BREAK SPACE", severity: "note", fix: "space", message: "A non-breaking space is present.", limitation: "Non-breaking spaces are standard French and general typographic practice." },
  { from: 5760, name: "OGHAM SPACE MARK", severity: "low", fix: "space", message: "An unusual space character is present.", limitation: "This character is legitimate inside Ogham-script text." },
  { from: 8192, to: 8200, name: (cp) => ["EN QUAD", "EM QUAD", "EN SPACE", "EM SPACE", "THREE-PER-EM SPACE", "FOUR-PER-EM SPACE", "SIX-PER-EM SPACE", "FIGURE SPACE", "PUNCTUATION SPACE"][cp - 8192], severity: "low", fix: "space", message: "A typographic space that substitutes for an ordinary space is present.", limitation: "Fixed-width spaces are legitimate in carefully typeset material." },
  { from: 8201, name: "THIN SPACE", severity: "note", fix: "space", message: "A thin space is present.", limitation: "Thin spaces are standard French and general typographic practice." },
  { from: 8202, name: "HAIR SPACE", severity: "low", fix: "space", message: "A hair space that substitutes for an ordinary space is present.", limitation: "Hair spaces are legitimate in carefully typeset material." },
  { from: 8239, name: "NARROW NO-BREAK SPACE", severity: "note", fix: "space", message: "A narrow no-break space is present.", limitation: "Narrow no-break spaces are standard French punctuation spacing and appear in Mongolian text." },
  { from: 8287, name: "MEDIUM MATHEMATICAL SPACE", severity: "note", fix: "space", message: "A medium mathematical space is present.", limitation: "This space is legitimate inside typeset mathematical notation." },
  { from: 12288, name: "IDEOGRAPHIC SPACE", severity: "note", fix: "space", message: "An ideographic space is present.", limitation: "Ideographic spaces are standard in Chinese and Japanese text." },
  // Line and paragraph separators
  { from: 8232, name: "LINE SEPARATOR", severity: "low", fix: "review", message: "A Unicode line separator is present instead of a conventional line break." },
  { from: 8233, name: "PARAGRAPH SEPARATOR", severity: "low", fix: "review", message: "A Unicode paragraph separator is present instead of a conventional line break." }
];
var CARRIER_RANGE_RULES = [
  { from: 57344, to: 63743, name: "PRIVATE USE CHARACTER", severity: "medium", fix: "review", message: "A private-use area character is present; its meaning is defined only by a private agreement between sender and receiver.", limitation: "Private-use characters are legitimate in icon fonts and legacy vendor symbols such as platform logos; a single one is routine." },
  { from: 983040, to: 1048573, name: "SUPPLEMENTARY PRIVATE USE CHARACTER", severity: "medium", fix: "review", message: "A supplementary private-use area character is present; its meaning is defined only by a private agreement between sender and receiver.", limitation: "Private-use characters are legitimate in icon fonts and legacy vendor symbols; a single one is routine." },
  { from: 1048576, to: 1114109, name: "SUPPLEMENTARY PRIVATE USE CHARACTER", severity: "medium", fix: "review", message: "A supplementary private-use area character is present; its meaning is defined only by a private agreement between sender and receiver.", limitation: "Private-use characters are legitimate in icon fonts and legacy vendor symbols; a single one is routine." }
];
var CONFUSABLES = /* @__PURE__ */ new Map([
  // Cyrillic lower case
  [1072, { name: "CYRILLIC SMALL LETTER A", latin: "a" }],
  [1074, { name: "CYRILLIC SMALL LETTER VE", latin: "b" }],
  [1077, { name: "CYRILLIC SMALL LETTER IE", latin: "e" }],
  [1082, { name: "CYRILLIC SMALL LETTER KA", latin: "k" }],
  [1084, { name: "CYRILLIC SMALL LETTER EM", latin: "m" }],
  [1085, { name: "CYRILLIC SMALL LETTER EN", latin: "h" }],
  [1086, { name: "CYRILLIC SMALL LETTER O", latin: "o" }],
  [1088, { name: "CYRILLIC SMALL LETTER ER", latin: "p" }],
  [1089, { name: "CYRILLIC SMALL LETTER ES", latin: "c" }],
  [1090, { name: "CYRILLIC SMALL LETTER TE", latin: "t" }],
  [1091, { name: "CYRILLIC SMALL LETTER U", latin: "y" }],
  [1093, { name: "CYRILLIC SMALL LETTER HA", latin: "x" }],
  [1109, { name: "CYRILLIC SMALL LETTER DZE", latin: "s" }],
  [1110, { name: "CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I", latin: "i" }],
  [1112, { name: "CYRILLIC SMALL LETTER JE", latin: "j" }],
  [1121, { name: "CYRILLIC SMALL LETTER OMEGA", latin: "w" }],
  [1141, { name: "CYRILLIC SMALL LETTER IZHITSA", latin: "v" }],
  [1211, { name: "CYRILLIC SMALL LETTER SHHA", latin: "h" }],
  [1281, { name: "CYRILLIC SMALL LETTER KOMI DE", latin: "d" }],
  [1307, { name: "CYRILLIC SMALL LETTER QA", latin: "q" }],
  [1309, { name: "CYRILLIC SMALL LETTER WE", latin: "w" }],
  // Cyrillic upper case
  [1029, { name: "CYRILLIC CAPITAL LETTER DZE", latin: "S" }],
  [1030, { name: "CYRILLIC CAPITAL LETTER BYELORUSSIAN-UKRAINIAN I", latin: "I" }],
  [1032, { name: "CYRILLIC CAPITAL LETTER JE", latin: "J" }],
  [1040, { name: "CYRILLIC CAPITAL LETTER A", latin: "A" }],
  [1042, { name: "CYRILLIC CAPITAL LETTER VE", latin: "B" }],
  [1045, { name: "CYRILLIC CAPITAL LETTER IE", latin: "E" }],
  [1050, { name: "CYRILLIC CAPITAL LETTER KA", latin: "K" }],
  [1052, { name: "CYRILLIC CAPITAL LETTER EM", latin: "M" }],
  [1053, { name: "CYRILLIC CAPITAL LETTER EN", latin: "H" }],
  [1054, { name: "CYRILLIC CAPITAL LETTER O", latin: "O" }],
  [1056, { name: "CYRILLIC CAPITAL LETTER ER", latin: "P" }],
  [1057, { name: "CYRILLIC CAPITAL LETTER ES", latin: "C" }],
  [1058, { name: "CYRILLIC CAPITAL LETTER TE", latin: "T" }],
  [1059, { name: "CYRILLIC CAPITAL LETTER U", latin: "Y" }],
  [1061, { name: "CYRILLIC CAPITAL LETTER HA", latin: "X" }],
  [1280, { name: "CYRILLIC CAPITAL LETTER KOMI DE", latin: "D" }],
  // Greek lower case
  [945, { name: "GREEK SMALL LETTER ALPHA", latin: "a" }],
  [953, { name: "GREEK SMALL LETTER IOTA", latin: "i" }],
  [954, { name: "GREEK SMALL LETTER KAPPA", latin: "k" }],
  [957, { name: "GREEK SMALL LETTER NU", latin: "v" }],
  [959, { name: "GREEK SMALL LETTER OMICRON", latin: "o" }],
  [961, { name: "GREEK SMALL LETTER RHO", latin: "p" }],
  [965, { name: "GREEK SMALL LETTER UPSILON", latin: "u" }],
  [1010, { name: "GREEK LUNATE SIGMA SYMBOL", latin: "c" }],
  // Greek upper case
  [913, { name: "GREEK CAPITAL LETTER ALPHA", latin: "A" }],
  [914, { name: "GREEK CAPITAL LETTER BETA", latin: "B" }],
  [917, { name: "GREEK CAPITAL LETTER EPSILON", latin: "E" }],
  [918, { name: "GREEK CAPITAL LETTER ZETA", latin: "Z" }],
  [919, { name: "GREEK CAPITAL LETTER ETA", latin: "H" }],
  [921, { name: "GREEK CAPITAL LETTER IOTA", latin: "I" }],
  [922, { name: "GREEK CAPITAL LETTER KAPPA", latin: "K" }],
  [924, { name: "GREEK CAPITAL LETTER MU", latin: "M" }],
  [925, { name: "GREEK CAPITAL LETTER NU", latin: "N" }],
  [927, { name: "GREEK CAPITAL LETTER OMICRON", latin: "O" }],
  [929, { name: "GREEK CAPITAL LETTER RHO", latin: "P" }],
  [932, { name: "GREEK CAPITAL LETTER TAU", latin: "T" }],
  [933, { name: "GREEK CAPITAL LETTER UPSILON", latin: "Y" }],
  [935, { name: "GREEK CAPITAL LETTER CHI", latin: "X" }],
  [1017, { name: "GREEK CAPITAL LUNATE SIGMA SYMBOL", latin: "C" }]
]);

// src/unicode/inspect.ts
var TABLE = /* @__PURE__ */ new Map();
for (const rule of CARRIER_RULES) {
  for (let cp = rule.from; cp <= (rule.to ?? rule.from); cp++) {
    TABLE.set(cp, { name: typeof rule.name === "function" ? rule.name(cp) : rule.name, severity: rule.severity, fix: rule.fix, message: rule.message, context: rule.context, limitation: rule.limitation });
  }
}
var BASE_LIMIT = "Unicode controls can be legitimate in multilingual text; this finding is not evidence of authorship.";
var EMOJI_SIDE = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\uFE0F0-9#*]/u;
var JOINING_SCRIPT = /[\p{sc=Arabic}\p{sc=Syriac}\p{sc=Nko}\p{sc=Mongolian}\p{sc=Devanagari}\p{sc=Bengali}\p{sc=Gurmukhi}\p{sc=Gujarati}\p{sc=Oriya}\p{sc=Tamil}\p{sc=Telugu}\p{sc=Kannada}\p{sc=Malayalam}\p{sc=Sinhala}\p{sc=Myanmar}\p{sc=Khmer}\p{sc=Tibetan}]/u;
var CJK_BASE = /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Mongolian}]/u;
function contextualise(rule, cp, prev, next) {
  if (rule.context === "joiner") {
    if (cp === 8205 && prev && next && EMOJI_SIDE.test(prev) && EMOJI_SIDE.test(next)) return void 0;
    if (prev && next && JOINING_SCRIPT.test(prev) && JOINING_SCRIPT.test(next)) return void 0;
    return rule;
  }
  if (rule.context === "variation") {
    if (prev && EMOJI_SIDE.test(prev)) return void 0;
    if (prev && CJK_BASE.test(prev)) return { ...rule, severity: "note", fix: "review", message: `${rule.message} It follows a base character that commonly takes glyph variants.` };
    return rule;
  }
  if (rule.context === "variation_sup") {
    if (prev && CJK_BASE.test(prev)) return { ...rule, severity: "note", message: `${rule.message} It follows a CJK ideograph and may select a registered glyph variant.` };
    return rule;
  }
  return rule;
}
function rangeRule(cp) {
  for (const rule of CARRIER_RANGE_RULES) {
    if (cp >= rule.from && cp <= (rule.to ?? rule.from)) return { name: typeof rule.name === "function" ? rule.name(cp) : rule.name, severity: rule.severity, fix: rule.fix, message: rule.message, context: rule.context, limitation: rule.limitation };
  }
  return void 0;
}
function inspectUnicode(text) {
  const findings = [];
  let prev = "";
  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i);
    const width = cp > 65535 ? 2 : 1;
    const raw = text.slice(i, i + width);
    const base = TABLE.get(cp) ?? (cp >= 57344 ? rangeRule(cp) : void 0);
    if (base) {
      const next = i + width < text.length ? String.fromCodePoint(text.codePointAt(i + width)) : "";
      const rule = contextualise(base, cp, prev, next);
      if (rule) {
        findings.push({ id: `unicode_${i}_${cp.toString(16)}`, code_point: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`, name: rule.name, severity: rule.severity, message: rule.message, suggestion: rule.fix === "review" ? "Review the surrounding script and direction before editing." : "Preview the deterministic change before approval.", span: rangeFromUtf16(text, i, i + width), matched_text_hash: prefixedSha256(raw), fix: rule.fix, limitations: rule.limitation ? [BASE_LIMIT, rule.limitation] : [BASE_LIMIT] });
      }
    }
    if (cp >= 55296 && cp <= 57343) {
      findings.push({ id: `unicode_${i}_surrogate`, code_point: `U+${cp.toString(16).toUpperCase()}`, name: "UNPAIRED SURROGATE", severity: "high", message: "An unpaired UTF-16 surrogate cannot be encoded as valid UTF-8.", suggestion: "Replace or remove it after checking the source encoding.", span: { start_utf16: i, end_utf16: i + 1, start_codepoint: Array.from(text.slice(0, i)).length, end_codepoint: Array.from(text.slice(0, i)).length + 1 }, matched_text_hash: prefixedSha256("\uFFFD"), fix: "review", limitations: ["The displayed replacement may differ from the original invalid code unit."] });
    }
    prev = raw;
    i += width;
  }
  const tokens2 = [...text.matchAll(/[\p{L}\p{N}_-]+/gu)];
  for (const token of tokens2) {
    const value = token[0];
    if (!/\p{Script=Latin}/u.test(value) || !/\p{Script=Cyrillic}|\p{Script=Greek}/u.test(value)) continue;
    let local = 0;
    for (const char of value) {
      const cp = char.codePointAt(0), entry = CONFUSABLES.get(cp);
      if (entry) {
        const start = token.index + local;
        findings.push({ id: `unicode_${start}_homoglyph_${cp.toString(16)}`, code_point: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`, name: entry.name, severity: "medium", message: `A mixed-script token contains a character visually confusable with Latin '${entry.latin}'.`, suggestion: "Verify the intended spelling; homoglyphs are never replaced automatically.", span: rangeFromUtf16(text, start, start + char.length), matched_text_hash: prefixedSha256(char), fix: "review", limitations: ["Mixed scripts can be legitimate in names and multilingual text; this is contextual evidence only."] });
      }
      local += char.length;
    }
  }
  return findings;
}

// src/protected/extract.ts
var RULES = [
  ["code", /```[\s\S]*?```|`[^`\n]+`/g],
  ["url", /https?:\/\/[^\s<>)\]]+/g],
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ["citation", /\[[0-9]+\]|\((?:[A-Z][A-Za-z-]+(?:\s+(?:and|&)\s+[A-Z][A-Za-z-]+)*(?:\s+et al\.)?),?\s+\d{4}[a-z]?\)|\b[A-Z][A-Za-z-]+(?:\s+(?:and|&)\s+[A-Z][A-Za-z-]+)*\s+et al\.,?\s*\(?\d{4}[a-z]?\)?/g],
  ["quote", /[“"][^”"\n]+[”"]/g],
  ["currency", /(?:£|\$|€)\s?\d[\d,]*(?:\.\d+)?/g],
  ["date", /\b(?:\d{1,2}\s+[A-Z][a-z]+\s+\d{4}|\d{4}-\d{2}-\d{2})\b/g],
  ["time", /\b\d{1,2}:\d{2}(?:\s?[ap]m)?\b/gi],
  ["unit", /\b\d+(?:\.\d+)?\s?(?:kg|g|km|m|cm|mm|GB|MB|%|°C)\b/g],
  ["number", /\b\d[\d,]*(?:\.\d+)?%?\b/g]
];
var HONORIFIC_NAME = /\b(?:Dr|Mr|Mrs|Ms|Prof|Sir|Dame)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}/g;
var NAME_RUN = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g;
var ORG_SUFFIXED = /\b(?:[A-Z][A-Za-z&.'-]*\s+){1,5}(?:Ltd\.?|Limited|LLC|Inc\.?|plc|GmbH|&\s?Co\.?|Agency|Council|University)(?!\w)/g;
var ORG_ACRONYM = /\b[A-Z]{2,6}(?:\.[A-Z]{2,6})*\b/g;
var NAME_STOPLIST = new Set("The A An This That These Those It He She They We You I In On At For To From With By Of And But Or Nor If As Is Are Was Were Be Been Not No Yes See Run New Our Your Their His Her Its My Do Does Did Will Would Can Could Should May Might Must Have Has Had So Then There Here What Which Who Whose When Where Why How All Any Each Per Both More Most Some Such Other Also Just Only Now Today Yesterday Tomorrow Please Note".split(" "));
var ACRONYM_STOPLIST = /* @__PURE__ */ new Set(["AM", "PM", "GMT", "UTC", "BST", "CET", "CEST", "EST", "EDT", "PST", "PDT", "EUR", "USD", "GBP", "JPY", "CHF", "AI", "IT", "TV", "OK", "PS", "NB", "ID", "IP", "FAQ", "API", "URL", "URI", "HTML", "CSS", "SQL", "PDF", "HTTP", "HTTPS", "VAT", "ASAP", "DIY", "CEO", "CTO", "CFO", "COO", "UK", "EU", "US", "USA", "RSVP", "ETA", "FYI", "QA", "DNA", "GPS", "SMS"]);
function atSentenceStart(content, index) {
  const before = content.slice(0, index).replace(/[\s"“”'‘’(\[]+$/, "");
  return before === "" || /[.!?:;…]$/.test(before);
}
function extractEntitySpans(content) {
  const found = [];
  const overlaps = (start, end) => found.some((x) => start < x.start + x.text.length && x.start < end);
  for (const m of content.matchAll(ORG_SUFFIXED)) {
    let text = m[0], start = m.index;
    for (; ; ) {
      const lead = /^([A-Z][A-Za-z&.'-]*)\s+/.exec(text);
      if (lead && NAME_STOPLIST.has(lead[1])) {
        start += lead[0].length;
        text = text.slice(lead[0].length);
      } else break;
    }
    if (/\s/.test(text)) found.push({ kind: "organisation", text, start });
  }
  for (const m of content.matchAll(ORG_ACRONYM)) {
    if (!ACRONYM_STOPLIST.has(m[0]) && !overlaps(m.index, m.index + m[0].length)) found.push({ kind: "organisation", text: m[0], start: m.index });
  }
  for (const m of content.matchAll(HONORIFIC_NAME)) {
    if (!overlaps(m.index, m.index + m[0].length)) found.push({ kind: "name", text: m[0], start: m.index });
  }
  for (const m of content.matchAll(NAME_RUN)) {
    if (atSentenceStart(content, m.index) || overlaps(m.index, m.index + m[0].length)) continue;
    if (m[0].split(/\s+/).some((token) => NAME_STOPLIST.has(token))) continue;
    found.push({ kind: "name", text: m[0], start: m.index });
  }
  return found;
}
function extractProtectedSpans(source, policy = {}) {
  const hash = source.content_hash ?? prefixedSha256(source.content);
  const spans = [];
  const add = (text, start, kind, origin, protection = "exact") => {
    const r = rangeFromUtf16(source.content, start, start + text.length);
    spans.push({ id: `ps_${kind}_${start}_${prefixedSha256(text).slice(7, 15)}`, kind, text, ...r, normalised_value: text, policy: protection, source: origin, confidence: null, content_hash: hash });
  };
  for (const [kind, regex] of RULES) {
    regex.lastIndex = 0;
    for (const m of source.content.matchAll(regex)) add(m[0], m.index, kind, "deterministic", kind === "date" || kind === "number" ? "equivalent_format" : "exact");
  }
  for (const entity of extractEntitySpans(source.content)) add(entity.text, entity.start, entity.kind, "deterministic");
  for (const term of policy.configured_terms ?? []) {
    let at = 0;
    while ((at = source.content.indexOf(term.text, at)) >= 0) {
      add(term.text, at, term.kind ?? "name", "user");
      at += term.text.length;
    }
  }
  for (const selected of policy.user_spans ?? []) add(source.content.slice(selected.start_utf16, selected.end_utf16), selected.start_utf16, "user_selected", "user");
  const unique = /* @__PURE__ */ new Map();
  for (const span of spans) unique.set(`${span.start_utf16}:${span.end_utf16}:${span.kind}:${span.policy}`, span);
  return [...unique.values()].sort((a, b) => a.start_utf16 - b.start_utf16 || b.end_utf16 - b.start_utf16 - (a.end_utf16 - a.start_utf16) || a.id.localeCompare(b.id));
}

// src/patterns/en-signals-v2-data.ts
var CYRILLIC_LOOKALIKES = {
  "\u0430": "a",
  "\u0435": "e",
  "\u043E": "o",
  "\u0440": "p",
  "\u0441": "c",
  "\u0445": "x",
  "\u0443": "y",
  "\u043A": "k",
  "\u043C": "m",
  "\u043D": "h",
  "\u0432": "b",
  "\u0442": "t",
  "\u0410": "A",
  "\u0415": "E",
  "\u041E": "O",
  "\u0420": "P",
  "\u0421": "C",
  "\u0425": "X",
  "\u0423": "Y",
  "\u041A": "K",
  "\u041C": "M",
  "\u041D": "H",
  "\u0412": "B",
  "\u0422": "T"
};
var GREEK_LOOKALIKES = {
  "\u03BF": "o",
  "\u039F": "O",
  "\u03B1": "a",
  "\u0391": "A",
  "\u03C1": "p",
  "\u03A1": "P"
};
var ROLEPLAY_VERBS = /^(?:nods|sighs|laughs|smiles|frowns|shrugs|grins|winks|chuckles|gasps|pauses|thinks|wonders|whispers|shouts|gestures|raises|leans|turns|looks|glances|smirks|blinks|nodding|sighing|laughing|smiling|thinking|gesturing)\b/i;
var TIER1 = {
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
  "top-notch": "excellent, first-rate"
};
var TIER1_PHRASES = [
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
  { pattern: /\bfeatures\b/gi, replace: "has, includes", clarity: true },
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
  { pattern: /\bload-bearing\b(?!\s+(?:(?:structural|exterior|interior|internal|external|concrete|steel|timber|wooden|brick|masonry|perimeter|basement|main|primary|existing|original)\s+)?(?:walls?|beams?|columns?|joists?|truss(?:es)?|members?|footings?|slabs?|studs?|partitions?|masonry|lintels?|piers?|rafters?|girders?|capacity|capacities)\b)/gi, replace: "essential, critical, or say what breaks if it is removed" }
];
var TIER2 = {
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
  "ai-powered": "say what the AI part actually does"
};
var TIER2_CONDITIONAL = [
  {
    word: "deeply",
    pattern: /\bdeeply\s+(?:integrated|committed|rooted|personal|human|flawed|resonant|transformative|interconnected|ingrained|embedded|meaningful)\b/i,
    suggestion: "cut, or name what specifically runs deep"
  }
];
var TIER3 = [
  "significant",
  "significantly",
  "innovative",
  "innovation",
  "effective",
  "effectively",
  "dynamic",
  "dynamics",
  "scalable",
  "scalability",
  "compelling",
  "unprecedented",
  "exceptional",
  "exceptionally",
  "remarkable",
  "remarkably",
  "sophisticated",
  "instrumental",
  "world-class",
  "state-of-the-art",
  "best-in-class",
  "verbatim"
];
var TIER3_PHRASES = [
  /\bemerging\s+(?:sector|space|category|industry)\b/gi,
  /\bthe\s+integration\s+of\b/gi,
  /\bthe\s+intersection\s+of\b/gi,
  /\bcommunity-?driven\b/gi,
  /\blong-?term\s+sustainability\b/gi,
  /\buser\s+engagement\b/gi,
  /\bdecentralized\s+compute\b/gi,
  /\b(?:sustainable\s+)?reward\s+emissions?\b/gi,
  /\btokenized\s+incentive\s+structures?\b/gi,
  /\bdesigned\s+for\s+long-?term\b/gi
];
var TRANSITIONS = [
  /\bmoreover\b/gi,
  /\bfurthermore\b/gi,
  /\badditionally\b/gi,
  /\bin\s+today'?s\b/gi,
  /\bin\s+an\s+era\s+where\b/gi,
  /\bit'?s\s+worth\s+noting\s+that\b/gi,
  /\bnotably\b/gi,
  /\bin\s+conclusion\b/gi,
  /\bin\s+summary\b/gi,
  /\bto\s+summarize\b/gi,
  /\bwhen\s+it\s+comes\s+to\b/gi,
  /\bat\s+the\s+end\s+of\s+the\s+day\b/gi,
  /\bthat\s+(?:being\s+)?said\b/gi,
  // 2026.08.3: ritual-conclusion opener variant (seed str-ritual-conclusion).
  /\bto\s+sum\s+up\b/gi
];
var CHATBOT_ARTIFACTS = [
  /\bi\s+hope\s+this\s+helps\b/gi,
  /\bcertainly!\B/gi,
  /\babsolutely!\B/gi,
  /\bgreat\s+question!\B/gi,
  /\bexcellent\s+point!\B/gi,
  /\bfeel\s+free\s+to\s+reach\s+out\b/gi,
  /\blet\s+me\s+know\s+if\s+you\s+need\s+anything\b/gi,
  /\bin\s+this\s+article,?\s+we\s+will\s+explore\b/gi,
  /\blet'?s\s+dive\s+in!?\b/gi,
  // 2026.08.3: chat-wrapper leakage variants (seed art-collab-leakage /
  // art-sycophantic-openers).
  /\bwould\s+you\s+like\s+me\s+to\b/gi,
  /\bi'?d\s+be\s+happy\s+to\b/gi
];
var SYCOPHANTIC = [
  /\byou'?re\s+absolutely\s+right\b/gi,
  /\bthat'?s\s+a\s+really\s+insightful\b/gi,
  /\bthat'?s\s+a\s+great\s+question\b/gi,
  /\bexcellent\s+question\b/gi
];
var FILLERS = [
  /\bit\s+is\s+important\s+to\s+note\s+that\b/gi,
  /\bin\s+terms\s+of\b/gi,
  /\bthe\s+reality\s+is\s+that\b/gi,
  /\bit'?s\s+important\s+to\s+note\s+that\b/gi
];
var GENERIC_CONCLUSIONS = [
  /\bthe\s+future\s+looks\s+bright\b/gi,
  /\bonly\s+time\s+will\s+tell\b/gi,
  /\bone\s+thing\s+is\s+certain\b/gi,
  /\bas\s+we\s+move\s+forward\b/gi
];
var LETS_PATTERNS = [
  /\blet'?s\s+explore\b/gi,
  /\blet'?s\s+take\s+a\s+look\b/gi,
  /\blet'?s\s+break\s+this\s+down\b/gi,
  /\blet'?s\s+examine\b/gi,
  /\blet'?s\s+(?:consider|discuss|delve|unpack|walk\s+through)\b/gi
];
var REASONING_ARTIFACTS = [
  /\blet\s+me\s+think\s+step\s+by\s+step\b/gi,
  /\bbreaking\s+this\s+down\b/gi,
  /\bto\s+approach\s+this\s+systematically\b/gi,
  /\bhere'?s\s+my\s+thought\s+process\b/gi,
  /\bfirst,?\s+let'?s\s+consider\b/gi,
  /\bworking\s+through\s+this\s+logically\b/gi
];
var ACKNOWLEDGMENT_LOOPS = [
  /\byou'?re\s+asking\s+about\b/gi,
  /\bthe\s+question\s+of\s+whether\b/gi,
  /\bto\s+answer\s+your\s+question\b/gi
];
var SIGNIFICANCE_INFLATION = [
  /\bmarking\s+a\s+(?:pivotal|significant|important)\s+moment\b/gi,
  /\ba\s+watershed\s+moment\s+for\b/gi,
  /\bin\s+the\s+evolution\s+of\b/gi,
  /\ba\s+(?:pivotal|defining)\s+moment\s+in\b/gi
];
var VAGUE_ATTRIBUTIONS = [
  /\bexperts\s+(?:believe|say|suggest|agree)\b/gi,
  /\bstudies\s+(?:show|suggest|indicate)\b/gi,
  /\bresearch\s+(?:shows|suggests|indicates)\b/gi,
  /\bindustry\s+leaders\s+(?:agree|believe|say)\b/gi,
  // 2026.08.3: weasel-attribution variants (seed phr-weasel-attribution).
  /\b(?:observers?|critics|analysts)\s+(?:argue|suggest|believe|say|have\s+(?:cited|noted|shown))\b/gi,
  /\bindustry\s+reports?\s+(?:suggest|show|indicate)\b/gi,
  /\bit\s+is\s+widely\s+believed\b/gi
];
var HOLLOW_INTENSIFIERS = [
  /\bgenuine(?:ly)?\b/gi,
  /\btruly\b/gi,
  /\bquite\s+frankly\b/gi,
  /\bto\s+be\s+honest\b/gi,
  /\blet'?s\s+be\s+clear\b/gi
];
var EMOTIONAL_FLATLINE = [
  /\bwhat\s+surprised\s+me\s+most\b/gi,
  /\bi\s+was\s+fascinated\s+to\b/gi,
  /\bwhat\s+struck\s+me\s+was\b/gi,
  /\bi\s+was\s+excited\s+to\s+learn\b/gi,
  /\bthe\s+most\s+interesting\s+(?:part|thing|aspect|piece)\b/gi,
  /^\s*interesting\s+(?:part|thing|aspect|piece)(?:\s+of\s+(?:the\s+)?\w+)?\s*:/gim
];
var LINGERING_ATTENTION = [
  /\b(?:the|that|this)\s+(?:one\s+)?(?:line|quote|bit|part|idea|point|framing|comment|thing)\s+(?:that\s+)?i\s+keep\s+(?:coming\s+back\s+to|thinking\s+about)\b/gi,
  /\bi\s+can'?t\s+stop\s+thinking\s+about\b/gi,
  /\bstill\s+thinking\s+about\s+(?:this|that)\s+one\b/gi,
  /\b(?:been|be)\s+rattling\s+around\s+(?:in\s+)?my\s+(?:head|brain)\b/gi,
  /\bi'?ve\s+been\s+chewing\s+on\s+(?:this|that)\b/gi
];
var NOVELTY_INFLATION = [
  /\bthe\s+failure\s+mode\s+nobody'?s?\s+naming\b/gi,
  /\ba\s+problem\s+nobody\s+talks\s+about\b/gi,
  /\bthe\s+insight\s+everyone'?s?\s+missing\b/gi,
  /\bwhat\s+nobody\s+tells\s+you\b/gi
];
var CUTOFF_DISCLAIMERS = [
  /\bas\s+of\s+my\s+last\s+update\b/gi,
  /\bas\s+of\s+my\s+(?:knowledge\s+)?(?:cut-?off|last\s+training)\b/gi,
  /\bi\s+don'?t\s+have\s+access\s+to\s+real-?time\s+(?:data|information)\b/gi,
  /\bbased\s+on\s+available\s+information\b/gi,
  /\bas\s+an?\s+(?:ai|artificial\s+intelligence|large\s+language|ai\s+language)\s+(?:language\s+)?model\b/gi,
  /\bi\s+(?:am|'m)\s+an?\s+(?:ai|artificial\s+intelligence|large\s+language)\s+(?:assistant|model)?\b/gi,
  /\bi\s+cannot\s+(?:provide|give|offer)\s+(?:legal|medical|financial|professional)\s+advice\b/gi,
  /\bmy\s+training\s+data\s+(?:only\s+)?(?:goes\s+up\s+to|extends\s+to|ends\s+(?:in|at))\b/gi,
  // 2026.08.3: RAG-era source-gap variant (seed art-cutoff-disclaimer).
  /\bin\s+the\s+provided\s+search\s+results\b/gi
];
var AI_PLACEHOLDERS = [
  /\[(?:Your|Insert|Add|Enter|Describe|Specify|Choose|Pick)[^\]\n]{1,80}\]/gi,
  /\[(?:Recipient|Sender|Topic|Subject|Salutation|Closing|Position|Department|Project Name|Company Name|Date)(?:\s+[^\]\n]{0,60})?\]/gi,
  /\[(?:INSERT|FILL\s+IN|ADD|TODO|TBD|PLACEHOLDER)[^\]\n]{0,80}\]/g,
  /\b(?:19|20)\d{2}-XX-XX\b/g,
  /\bXX\/XX\/(?:19|20)\d{2}\b/g,
  /<!--\s*(?:add|fill\s+in|insert|todo|placeholder)[^>]{0,120}-->/gi
];
var AI_CITATION_MARKUP = [
  /\bcite(?:turn|news|search|navigation)\d+(?:search|turn|news|navigation)\d+/gi,
  /contentReference\s*\[oaicite:[^\]]+\]\s*\{[^}]*\}/gi,
  /\boai_citation\b/gi,
  /\[attached_file:\d+\]/gi,
  /\bgrok_card\b/gi
];
var AI_UTM_SOURCE = [
  /[?&]utm_source=(?:chatgpt|openai|copilot|claude|grok|gemini|perplexity)(?:\.com|\.ai)?\b/gi,
  /[?&]referrer=(?:chatgpt|copilot|grok|claude|gemini|perplexity)\.(?:com|ai)\b/gi
];
var TEMPLATE_PHRASES = [
  /\ba\s+\w+\s+step\s+(?:towards?|forward\s+for)\b/gi,
  /\bwhether\s+you'?re\s+\w+\s+or\s+\w+/gi,
  /\bi\s+recently\s+had\s+the\s+pleasure\s+of\b/gi
];
var FALSE_CONCESSION = [
  /\bwhile\s+\w+\s+is\s+impressive\b/gi,
  /\balthough\s+\w+\s+has\s+made\s+strides\b/gi,
  /\bdespite\s+\w+\s+challenges?\b/gi
];
var RHETORICAL_QUESTIONS = [
  /\bbut\s+what\s+does\s+this\s+mean\s+for\b/gi,
  /\bso\s+why\s+should\s+you\s+care\b/gi,
  /\bwhat'?s\s+next\?\s*/gi
];
var HEDGE_STACK = [
  /\b(?:could|may|might)\s+(?:(?!not\b|never\b|hardly\b|scarcely\b|barely\b)\w+\s+)?(?:potentially|eventually|ultimately|possibly|conceivably)\b/gi,
  /\b(?:potentially|eventually|ultimately)\s+(?:could|may|might)\b/gi
];
var FUTURE_NARRATIVE = [
  /\b(?:may|could|will|is\s+(?:poised|set)\s+to)\s+become\s+(?:one\s+of\s+)?(?:the\s+)?(?:most\s+)?\w+\s+(?:narratives?|stories|developments?|trends?|movements?|chapters?|themes?|forces?)\b/gi,
  /\bone\s+of\s+the\s+most\s+important\s+(?:narratives?|stories|trends?|themes?)\s+of\s+the\s+(?:next|coming)\s+\w+\b/gi
];
var REAL_ACTUAL_INFLATION = [
  /\b(?:real|actual|genuine|true)\s+(?:on-?chain\s+)?(?:tokenomics|economics|utility|adoption|sustainability|impact|revenue|fundamentals|demand|value|innovation|traction)\b/gi
];
var FORMULAIC_OPENERS = [
  /\bin\s+the\s+(?:rapidly\s+|ever-?\s*)?(?:evolving|changing|expanding|growing|shifting)\s+(?:world|landscape|realm|space|field|domain|era)\s+of\b/gi,
  /\bin\s+(?:an?|the)\s+(?:digital\s+)?age\s+(?:where|of)\b/gi,
  /\bas\s+(?:we|the\s+world|society|industries?)\s+(?:continue|move|navigate|enter)\s+(?:to\s+)?(?:evolve|forward|into|through)\b/gi,
  /\bhas\s+emerged\s+as\s+(?:a|the|one\s+of)\s+(?:leading|key|major|critical|essential|fundamental|pivotal|prominent|dominant|important)\s+\w+/gi,
  /\bhas\s+become\s+increasingly\s+(?:important|critical|popular|relevant|prominent|essential)\b/gi
];
var SPECULATIVE_OPENERS = [
  /\b(?:imagine|picture|envision)(?:\s*,[^,\n]{1,30},)?\s+a\s+(?:world|future|reality)\s+(?:where|in\s+which)\b/gi
];
var PARENTHETICAL_HEDGE = [
  /\(\s*(?:and\s+)?(?:increasingly|notably|importantly|crucially|interestingly|perhaps)[,]?\s+[^)]{3,60}\)/gi,
  /\(\s*or\s+more\s+(?:precisely|accurately|specifically)[,]?\s+[^)]{3,60}\)/gi,
  /\(\s*though\s+to\s+be\s+fair[,]?\s+[^)]{3,60}\)/gi,
  /\(\s*at\s+least\s+(?:in\s+)?(?:theory|principle|part)[,]?\s+[^)]{0,60}\)/gi
];
var CONFIDENCE_CALIBRATION = [
  /\binterestingly\b/gi,
  /\bsurprisingly\b/gi,
  /\bimportantly\b/gi,
  /\bsignificantly\b/gi,
  /\bcertainly\b/gi,
  /\bundoubtedly\b/gi,
  /\bwithout\s+a\s+doubt\b/gi
];
var SOCIAL_CTA_CLOSER = [
  /\bthis\s+one['’]?s?\s+(?:is\s+)?(?:well\s+|totally\s+|absolutely\s+|definitely\s+|really\s+|truly\s+|easily\s+|more\s+than\s+)?worth\s+(?:your\s+time|the\s+read|a\s+read|every\s+(?:minute|second)|reading|watching|a\s+listen|a\s+watch|a\s+look|it)\b/gi,
  /\bthis\s+one['’]?s?\s+(?:is\s+)?a\s+must[-\s]?(?:read|watch|listen|see)\b/gi,
  /\b(?:highly|strongly|can['’]?t|cannot)\s+recommend\w*\s+(?:giving\s+)?(?:this|it)\s+(?:one\s+)?a\s+(?:read|listen|watch|look|go)\b/gi,
  /\bdo\s+yourself\s+a\s+favou?r\s+and\s+(?:read|watch|check\s+out)\s+(?:this|it)\b/gi,
  /\byou\s+(?:really\s+)?(?:won['’]?t|do\s*n['’]?t|will\s+not|do\s+not)\s+want\s+to\s+miss\s+this(?:\s+one)?(?=\s*(?:[:.!\n]|$))/gi,
  /(?<=^|[,.!?:\n]\s{0,4})(?:you\s+can\s+)?thank\s+me\s+later\b/gim,
  /(?<=^|[.!?:\n]\s{0,4})save\s+this\s+(?:one\s+)?for\s+later\b/gim,
  /\bbookmark\s+this(?:\s+(?:one|post|thread))?(?=\s*(?:[:.!\n]|$))/gi,
  /\bdo\s*n['’]?t\s+sleep\s+on\s+this\b/gi,
  /\btrust\s+me,?\s+(?:on\s+this|you['’]?ll)\b/gi
];
var NOT_JUST_CONTRAST = [
  /\b(?:isn|aren|wasn|weren|doesn|don|didn)['’]t\s+(?:just\s+)?[^.!?\n]{1,60}?\s*(?:—|–|--)\s*(?:it|this|that|they|we)['’](?:s|re)\b/gi,
  /\b(?:is|are|was|were)\s+not\s+just\s+[^.!?\n]{1,60}?\s*(?:—|–|--|,)\s*(?:it|this|that|they)['’](?:s|re)\b/gi,
  /\bnot\s+just\s+[^.!?\n]{1,60}?\s*(?:—|–|--)\s*(?:but\s+)?(?:it|this|that|they)['’](?:s|re)\b/gi
];
var FUNCTION_WORD_IN_TITLE = /\b(?:And|Or|Of|The|In|For|To|A|An)\b/;
var MD_HEADING_PREFIX = /^#{1,6}[ \t]+/;
var TITLE_CASE_HEADER = /^(?:#{1,6}[ \t]+)?([A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|and|or|of|the|in|for|to|a|an))+\s+[A-Z][a-z]+)\s*$/gm;
var SEPARATOR_DASH_RE = /^\s*(?:[-*+]|\d+[.)])\s+(?:\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\n]*\))(?:[ \t]*(?:\([^)\n]*\)|`[^`\n]+`))?[ \t]*—/gm;
var VERSION_HEADING_DASH_RE = /^#{1,6}[ \t]+\[?v?\d+\.\d+\.\d+[^\]\n]*\]?[ \t]*—[ \t]*\d{4}-\d{2}-\d{2}[ \t]*$/gm;
var FUNC_WORDS = /* @__PURE__ */ new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "of",
  "to",
  "in",
  "on",
  "at",
  "by",
  "for",
  "with",
  "from",
  "as",
  "is",
  "was",
  "are",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "should",
  "could",
  "may",
  "might",
  "must",
  "can",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "they",
  "them",
  "their",
  "there",
  "here",
  "we",
  "our",
  "us",
  "i",
  "you",
  "your",
  "he",
  "she",
  "his",
  "her",
  "him",
  "not",
  "no",
  "so",
  "if",
  "then",
  "than",
  "when",
  "where",
  "which",
  "who",
  "what",
  "how",
  "why",
  "because"
]);
var ISSUE_WEIGHTS = {
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
  "ai-utm-source": 12
};
var CATEGORY_META = {
  "tier1": { severity: "high", message: 'A word that turns up a lot in generic machine-written copy, like "delve", "robust" or "seamless".', suggestion: "Swap it for a plainer word." },
  "tier1-clarity": { severity: "medium", message: 'This is a long way of saying something short, like "in order to" for "to", or "due to the fact that" for "because".', suggestion: "Use the shorter form." },
  "tier2": { severity: "medium", message: 'Several buzzwords sit in one paragraph, words like "foster", "facilitate" and "ecosystem". One is fine. A pile of them reads as filler.', suggestion: "Keep one at most, and say the plain thing instead." },
  "tier3": { severity: "low", message: 'A vague filler word such as "significant", "effective" or "dynamic" is used a lot for a piece this long.', suggestion: "Cut some of them, or say what you actually mean." },
  "transition": { severity: "medium", message: 'A joining phrase that could link any two sentences, like "Moreover", "Furthermore" or "In conclusion".', suggestion: "Cut it, or say how the two sentences really connect." },
  "chatbot": { severity: "high", message: 'A line from a chat window is still in the text, like "I hope this helps" or "Certainly!".', suggestion: "Delete it." },
  "sycophantic": { severity: "high", message: `A compliment aimed at the reader's question, the way a chatbot opens a reply: "Great question!".`, suggestion: "Delete it and go straight to the point." },
  "filler": { severity: "medium", message: "A phrase that adds words but no meaning.", suggestion: "Cut it. The sentence almost always still works." },
  "generic-conclusion": { severity: "medium", message: 'A closing line that could end any article, like "only time will tell" or "the future looks bright".', suggestion: "End on something specific instead." },
  "lets-construction": { severity: "medium", message: `A "let's take a look at\u2026" line, the way a tutorial talks to you.`, suggestion: "Just say the thing. Do not announce it first." },
  "reasoning-artifact": { severity: "high", message: 'Step-by-step working is still showing, like "First, let me\u2026" or "Step 1:".', suggestion: "Delete the working and keep the answer." },
  "acknowledgment-loop": { severity: "medium", message: 'The text repeats the question back before answering it: "You asked about X. X is\u2026".', suggestion: "Answer straight away." },
  "significance-inflation": { severity: "high", message: 'A stock line telling the reader how big something was, instead of saying what happened: "marking a pivotal moment".', suggestion: "Say what happened and let the reader judge." },
  "vague-attribution": { severity: "high", message: 'A claim is credited to nobody in particular: "experts say", "studies show".', suggestion: "Name the study or the person, or drop the claim." },
  "hollow-intensifier": { severity: "medium", message: 'An emphasis word that adds no information, like "truly", "incredibly" or "absolutely".', suggestion: "Cut it." },
  "emotional-flatline": { severity: "low", message: 'A ready-made feeling word stands in for a real reaction, like "fascinating" or "surprising".', suggestion: "Say what was actually surprising, or cut it." },
  "lingering-attention": { severity: "medium", message: 'A share-post line about how long an idea stayed with you, which tells the reader nothing about the idea: "this stuck with me for days".', suggestion: "Say why it matters instead." },
  "novelty-inflation": { severity: "medium", message: 'The text announces that it is about to say something rare: "few people realise".', suggestion: "Show the point. Do not advertise it." },
  "cutoff-disclaimer": { severity: "high", message: 'A line where a chatbot describes itself or its training cut-off, like "as of my last update" or "as an AI language model".', suggestion: "Delete it, and check the facts around it yourself." },
  "template-phrase": { severity: "high", message: "A ready-made phrase that turns up in a lot of generated copy.", suggestion: "Replace it with something specific to your subject." },
  "false-concession": { severity: "medium", message: `A formula that pretends to give ground before making the point: "while it's true that\u2026".`, suggestion: "Name the real trade-off, or drop it." },
  "rhetorical-question": { severity: "medium", message: 'A question the writer asks and then answers: "So what does this mean?".', suggestion: "Give the answer without asking first." },
  "confidence-calibration": { severity: "low", message: 'Words like "clearly", "certainly" and "undoubtedly" pile up across the text.', suggestion: "Keep the one or two you have earned and cut the rest." },
  "em-dash-density": { severity: "medium", message: "Em dashes (\u2014), or spaced hyphens used as dashes, turn up a lot for a piece this long. Worth knowing: since OpenAI cut back on em dashes in late 2025, heavy dash use is more common in Claude's writing than in machine writing generally, and plenty of professional human writers use more dashes than this.", suggestion: "Swap some for commas, colons or full stops." },
  "not-just-contrast": { severity: "high", message: `The "it isn't just X, it's Y" shape.`, suggestion: "Say what it is, without the set-up." },
  "uniform-sections": { severity: "medium", message: "Every section is close to the same length. Real writing runs long in places and short in others.", suggestion: "Let each section be as long as its content needs." },
  "uniform-list-items": { severity: "medium", message: "The list items are all close to the same length. Real lists are lumpy.", suggestion: "Let some items run shorter or longer, or merge ones that repeat." },
  "sentence-flatline": { severity: "medium", message: "Sentence lengths barely change across the whole piece. Real writing swings between short and long.", suggestion: "Mix a few short, punchy sentences in with the longer ones." },
  "uniformity": { severity: "medium", message: "The paragraphs are all close to the same size.", suggestion: "Make some paragraphs shorter or longer on purpose." },
  "formatting": { severity: "medium", message: "A lot of bold is used.", suggestion: "Take the bold off most phrases, and put the important thing first." },
  "tier3-phrase": { severity: "medium", message: "The same stock phrase keeps coming back through the text.", suggestion: "Replace at least one of them with something concrete." },
  "tier3-phrase-cluster": { severity: "high", message: "Several different stock phrases are stacked up in one piece.", suggestion: "Rewrite it around one real point." },
  "hashtag-stuff": { severity: "medium", message: "A long block of hashtags.", suggestion: "Cut to two or three that fit, or none." },
  "bullet-np-list": { severity: "high", message: "A long bullet list where every item is a bare noun phrase with no verb.", suggestion: "Turn it into a paragraph, or join the items up." },
  "hedge-stack": { severity: "high", message: 'Two hedges on the same claim, like "may potentially" or "could possibly".', suggestion: "Pick one hedge, or make a claim someone could check." },
  "future-narrative": { severity: "high", message: 'A vague line about the future that nobody could ever check: "is set to reshape the industry".', suggestion: "Say something concrete a reader could test." },
  "real-actual-inflation": { severity: "medium", message: '"Real" or "actual" is doing no work here, as in "real value" or "actual impact".', suggestion: "Cut the word, or say what makes it real." },
  "social-cta-closer": { severity: "high", message: 'A closing line begging for engagement: "What do you think? Let me know below."', suggestion: "Give the reader a reason to care instead of an instruction." },
  "formulaic-opener": { severity: "high", message: `A stock opening line that would fit any article: "In today's fast-paced world\u2026".`, suggestion: "Open on a fact or a specific detail." },
  "speculative-opener": { severity: "high", message: 'The piece opens by asking you to picture a scene: "Imagine a world where\u2026".', suggestion: "Make the point directly." },
  "title-case-header": { severity: "medium", message: "The heading puts a capital on nearly every word, the way a lot of marketing copy does.", suggestion: "Capitalise the first word only, as you would in a sentence." },
  "parenthetical-hedge": { severity: "medium", message: 'An aside in brackets that sounds thoughtful and adds nothing: "(at least in most cases)".', suggestion: "Cut it, or make it a proper sentence." },
  "smart-punct-signature": { severity: "high", message: "Curly quotes, an em dash, an Oxford comma and no typos, all in one piece. That combination is rare in text somebody typed straight out by hand.", suggestion: "Nothing to fix. This is just something we noticed." },
  "punct-distribution": { severity: "medium", message: "Every paragraph uses about the same amount of punctuation.", suggestion: "Let some paragraphs run busier than others." },
  "fnword-trigram-entropy": { severity: "medium", message: "Sentences are built to the same grammar pattern again and again.", suggestion: "Change the way you build some of the sentences." },
  "cross-para-burstiness": { severity: "medium", message: "Every paragraph has the same inner rhythm of long and short sentences.", suggestion: "Let some paragraphs be clipped and others rambling." },
  "normalization-flag": { severity: "high", message: "The text held invisible characters or lookalike letters, the kind used to hide copied text from checkers. We swapped them back before reading it.", suggestion: "Take the hidden characters out and check the text again." },
  "low-ttr": { severity: "low", message: "The same words come round a lot for a piece this long.", suggestion: "Vary the nouns and verbs, unless the subject really does need the repeating." },
  "ai-placeholder": { severity: "high", message: 'A blank somebody forgot to fill in is still here, like "[INSERT NAME]".', suggestion: "Fill it in or delete it before this goes out." },
  "ai-citation-markup": { severity: "high", message: "Chatbot citation code was pasted in along with the text.", suggestion: "Delete it and put a real reference in its place." },
  "ai-utm-source": { severity: "high", message: 'A link carries a tracking tag that AI tools add to the links they hand out, like "utm_source=chatgpt.com".', suggestion: "Strip the tracking part off the link." }
};

// src/patterns/en-signals-v3-data.ts
var RULE_ERA = {
  // ── existing v2 categories ──
  "tier1": { era: "2023" },
  "tier1-clarity": { era: "evergreen" },
  "tier2": { era: "2023" },
  "tier3": { era: "2023" },
  "transition": { era: "2023" },
  "chatbot": { era: "evergreen", attribution: "multi" },
  "sycophantic": { era: "evergreen", attribution: "multi" },
  "filler": { era: "2023" },
  "generic-conclusion": { era: "2023" },
  "lets-construction": { era: "evergreen" },
  "reasoning-artifact": { era: "2025-26" },
  "acknowledgment-loop": { era: "evergreen" },
  "significance-inflation": { era: "2024-25" },
  "vague-attribution": { era: "evergreen" },
  "hollow-intensifier": { era: "evergreen" },
  "emotional-flatline": { era: "2024-25" },
  "lingering-attention": { era: "2025-26" },
  "novelty-inflation": { era: "2025-26" },
  "cutoff-disclaimer": { era: "2023", attribution: "multi" },
  "template-phrase": { era: "2023" },
  "false-concession": { era: "2024-25" },
  "rhetorical-question": { era: "2024-25" },
  "confidence-calibration": { era: "evergreen" },
  // Post-2025 nuance: OpenAI suppressed em dashes in Nov 2025; by mid-2026
  // only Claude-family output exceeds professional writers, making density a
  // partial model-attribution hint rather than a generic AI tell.
  "em-dash-density": { era: "2025-26", attribution: "claude" },
  "not-just-contrast": { era: "2024-25" },
  "uniform-sections": { era: "evergreen" },
  "uniform-list-items": { era: "evergreen" },
  "sentence-flatline": { era: "2023" },
  "uniformity": { era: "evergreen" },
  "formatting": { era: "evergreen", attribution: "multi" },
  "tier3-phrase": { era: "2023" },
  "tier3-phrase-cluster": { era: "2023" },
  "hashtag-stuff": { era: "evergreen" },
  "bullet-np-list": { era: "evergreen" },
  "hedge-stack": { era: "evergreen" },
  "future-narrative": { era: "2024-25" },
  "real-actual-inflation": { era: "2025-26" },
  "social-cta-closer": { era: "2025-26" },
  "formulaic-opener": { era: "2023" },
  "speculative-opener": { era: "2023" },
  "title-case-header": { era: "evergreen" },
  "parenthetical-hedge": { era: "2025-26" },
  "smart-punct-signature": { era: "evergreen" },
  "punct-distribution": { era: "evergreen" },
  "fnword-trigram-entropy": { era: "evergreen" },
  "cross-para-burstiness": { era: "evergreen" },
  "normalization-flag": { era: "evergreen" },
  "low-ttr": { era: "2023" },
  "ai-placeholder": { era: "evergreen", attribution: "multi" },
  "ai-citation-markup": { era: "2025-26", attribution: "multi" },
  "ai-utm-source": { era: "2024-25", attribution: "multi" },
  // ── v3 artefact forensics ──
  "ai-citation-token": { era: "2025-26", attribution: "multi" },
  "reasoning-leak": { era: "2025-26" },
  "placeholder-token": { era: "2024-25" },
  "pua-character": { era: "2025-26", attribution: "chatgpt" },
  "math-alphanumeric": { era: "2025-26", attribution: "chatgpt" },
  "arrow-decoration": { era: "2025-26", attribution: "chatgpt" },
  "escaped-markup-literal": { era: "evergreen", attribution: "multi" },
  // ── v3 tier A phrase/structural ──
  "neg-parallelism": { era: "2024-25" },
  "tripled-negation": { era: "2025-26", attribution: "chatgpt" },
  "despite-challenges-arc": { era: "2023" },
  "metaphor-cluster": { era: "2023" },
  "participial-tail": { era: "evergreen" },
  "focal-density": { era: "2023" },
  "owner-phrase": { era: "2023" },
  "power-verb-compound": { era: "2023" },
  "outcome-tail": { era: "2023" },
  "conclusion-cta": { era: "2023" },
  // ── v3 tier B (corroboration-weight) ──
  "liang-cluster": { era: "2024-25" },
  "kobak-density": { era: "2023" },
  "promo-travel": { era: "2023" },
  "pivotal-role": { era: "2024-25" },
  "legacy-framing": { era: "2024-25", attribution: "multi" },
  "notability-canned": { era: "2025-26" },
  "buzzword-phrase": { era: "2023" },
  "faux-insight": { era: "2025-26" },
  "rhetorical-qa": { era: "2024-25", attribution: "chatgpt" },
  "didactic-note": { era: "2023" },
  "narrative-cliche": { era: "2024-25" },
  "valuable-insights": { era: "2024-25" },
  "copula-avoidance": { era: "evergreen" },
  "bold-label-bullets": { era: "evergreen", attribution: "multi" },
  "emoji-decoration": { era: "2024-25", attribution: "chatgpt" },
  "heading-inflation": { era: "2024-25", attribution: "gemini" },
  "staccato-fragments": { era: "2025-26" },
  "tricolon-density": { era: "evergreen" },
  "transition-stacking": { era: "2023" },
  "quote-inconsistency": { era: "2025-26", attribution: "chatgpt" },
  "token-cutoff": { era: "2023", attribution: "chatgpt" },
  "setup-expansion-cadence": { era: "2025-26" },
  "passive-ratio": { era: "evergreen" },
  "low-specificity": { era: "evergreen" },
  "adjacent-lemma-repeat": { era: "evergreen" },
  "fiction-claudeism": { era: "2024-25", attribution: "claude" },
  "fiction-promptonym": { era: "2024-25", attribution: "multi" },
  "fiction-slop-phrase": { era: "2024-25", attribution: "multi" },
  "owner-phrase-b": { era: "2023" },
  "owner-vocab-b": { era: "2023" },
  "directive-colon-bullets": { era: "2024-25" },
  "teach-preach-headings": { era: "2023" },
  "by-ving-template": { era: "2023" },
  "invalid-isbn": { era: "evergreen" },
  "proximity-cluster": { era: "evergreen" },
  // ── 2026.08.6 provider-eval furniture rules ──
  // deepseek 99.3% / google-25 95.3% / mistral 94.7% carry bold; heaviest in
  // the 2024+ chat register across vendors → multi attribution.
  "markdown-bold": { era: "2024-25", attribution: "multi" },
  "markdown-heading": { era: "2025-26", attribution: "multi" },
  "markdown-furniture": { era: "2024-25", attribution: "multi" }
};
var CORROBORATION_CATEGORIES = /* @__PURE__ */ new Set([
  "liang-cluster",
  "kobak-density",
  "promo-travel",
  "pivotal-role",
  "legacy-framing",
  "notability-canned",
  "buzzword-phrase",
  "faux-insight",
  "rhetorical-qa",
  "didactic-note",
  "narrative-cliche",
  "valuable-insights",
  "copula-avoidance",
  "bold-label-bullets",
  "emoji-decoration",
  "heading-inflation",
  "staccato-fragments",
  "tricolon-density",
  "transition-stacking",
  "quote-inconsistency",
  "token-cutoff",
  "setup-expansion-cadence",
  "passive-ratio",
  "low-specificity",
  "adjacent-lemma-repeat",
  "fiction-claudeism",
  "fiction-promptonym",
  "fiction-slop-phrase",
  "owner-phrase-b",
  "owner-vocab-b",
  "directive-colon-bullets",
  "teach-preach-headings",
  "by-ving-template",
  "invalid-isbn",
  "proximity-cluster",
  "escaped-markup-literal",
  // 2026.08.6: markdown-furniture rules are corroboration-weight by design —
  // their absence must never count in favour of a human verdict, because an
  // editor paste that strips formatting removes the signal entirely
  // (PROVIDER-EVAL-2026-08.md §1 honest gaps, §4.1 caveats). Their
  // classification power comes from the zero-FP escalation floors, not from
  // severity or weight.
  "markdown-bold",
  "markdown-heading",
  "markdown-furniture"
]);
var ARTEFACT_CORE_CATEGORIES = /* @__PURE__ */ new Set([
  "ai-citation-markup",
  "ai-citation-token",
  "ai-utm-source",
  "reasoning-leak",
  "placeholder-token",
  "ai-placeholder",
  "pua-character",
  "math-alphanumeric"
]);
var ARTEFACT_SUPPORT_CATEGORIES = /* @__PURE__ */ new Set([
  "arrow-decoration",
  "escaped-markup-literal"
]);
var FORMATTING_CLUSTER_CATEGORIES = /* @__PURE__ */ new Set([
  "bold-label-bullets",
  "heading-inflation",
  "emoji-decoration",
  "arrow-decoration"
]);
var V6_FURNITURE_THRESHOLDS = {
  /** R5: bullet lines per 1,000 words above which bullets alone open the gate. */
  bulletsPer1000: 10.75
};
var STYLOMETRIC_CATEGORIES = /* @__PURE__ */ new Set([
  "punct-distribution",
  "cross-para-burstiness",
  "fnword-trigram-entropy",
  "sentence-flatline",
  "uniformity",
  "uniform-sections",
  "uniform-list-items",
  "low-ttr",
  "smart-punct-signature",
  "em-dash-density",
  "setup-expansion-cadence",
  "passive-ratio",
  "low-specificity",
  "adjacent-lemma-repeat",
  "copula-avoidance",
  "tricolon-density",
  "staccato-fragments",
  "transition-stacking",
  "heading-inflation"
]);
var AI_CITATION_TOKENS = [
  { pattern: /【\d+†L\d+(?:-L?\d+)?】/g, attribution: "deepseek" },
  { pattern: /\bgrok_render_citation_card_json\b/gi, attribution: "grok" },
  { pattern: /\bgrok-card\s+data-id\b/gi, attribution: "grok" },
  { pattern: /ppl-ai-file-upload/gi, attribution: "perplexity" },
  { pattern: /\[attached_file:\d+\]/gi, attribution: "perplexity" },
  { pattern: /\[web:\d+\]/g, attribution: "perplexity" },
  { pattern: /\[cite:\s*\d+\]/g, attribution: "gemini" },
  { pattern: /\[span_\d+\]\(start_span\)/g, attribution: "gemini" },
  { pattern: /\battributableIndex\b/g, attribution: "chatgpt" },
  { pattern: /:::writing\{/g, attribution: "chatgpt" },
  { pattern: /\bciteturn\d+(?:search|image|news|navigation)\d+/gi, attribution: "chatgpt" }
];
var REASONING_LEAKS = [
  /\bthe\s+user\s+(?:wants|is\s+asking|requested|has\s+asked)\b/gi,
  /\breviewer\s+note\s*[:—-]/gi,
  /\bas\s+per\s+(?:the\s+)?(?:system\s+)?prompt\b/gi,
  /\bso\s+i\s+should\s+(?:structure|frame|word)\s+(?:the|this|my)\b/gi
];
var PLACEHOLDER_TOKENS = [
  /\bINSERT_[A-Z][A-Z_]{2,40}\b/g,
  /\bPASTE_[A-Z][A-Z_]{2,40}\b/g,
  /\baccess-date\s*=\s*\d{4}-XX-XX\b/gi
];
var PUA_RANGE_RE = /[\uE000-\uF8FF]/g;
var MATH_ALPHANUMERIC_RE = /[\u{1D400}-\u{1D7FF}]/gu;
var ARROW_CONNECTOR_RE = /(?<=\S)\s[\u2192\u2794\u27A1]\s(?=\S)/g;
var ESCAPED_MARKUP_LITERALS = [
  /&nbsp;/g,
  /(?<!\\)\\n\\n/g
];
var NEG_PARALLELISM_RE = /\bnot\s+(?:just|only|merely)\s+[^.!?\n]{2,60}?,?\s+but\s+(?:also\s+|rather\s+)?\w+/gi;
var TRIPLED_NEGATION_RE = /\b(?:Not|No)\s+[^.!?,\n]{2,30}[.,]\s*(?:Not|no)\s+[^.!?,\n]{2,30}[.,]\s*(?:Just|just)\s+\w+/g;
var DESPITE_CHALLENGES_RE = /\bDespite\s+(?:these|its|numerous|various|several)\s+(?:challenges|setbacks|obstacles)\b[^.!?\n]{0,120}?(?:continues?\s+to\s+(?:thrive|grow|flourish)|faces?\s+(?:several\s+|numerous\s+)?challenges)/gi;
var METAPHOR_CLUSTER_RES = [
  /\b(?:rich\s+tapestry|tapestry\s+of)\b/gi,
  /\b(?:complex|intricate)\s+interplay\b/gi,
  /\b(?:ever-)?evolving\s+landscape\b/gi,
  /\ba\s+testament\s+to\b/gi,
  /\bbeacon\s+of\b/gi
];
var PARTICIPIAL_TAIL_RE = /,\s+(?:highlighting|underscoring|reflecting|symboli[sz]ing|showcasing|emphasi[sz]ing|demonstrating|ensuring|fostering|solidifying|cementing|signaling|signalling|contributing\s+to)\b[^.!?\n]{5,80}[.!?]/g;
var FOCAL_WORD_RE = /\b(?:delv(?:e|es|ed|ing)|showcas(?:e|es|ing)|boasts?|underscor(?:e|es|ing)|intricac(?:y|ies)|intricate(?:ly)?|surpass(?:es|ing)|garner(?:ed|s)?|emphasi[sz]ing|groundbreaking|meticulous(?:ly)?|commendable|pivotal|elucidat(?:e|es|ing)|advancements)\b/gi;
var OWNER_PHRASES = [
  /\blook\s+no\s+further\b/gi,
  /\bcomprehensive\s+suite\s+of\b/gi,
  /\btailored\s+solutions?\b/gi,
  /\bunlock(?:ing)?\s+(?:its|your|their|the)\s+full\s+potential\b/gi,
  /\bbefore\s+diving\s+in(?:to)?\b/gi,
  /\bcommon\s+pitfalls\s+and\s+how\s+to\s+avoid\s+them\b/gi,
  /\b(?:break(?:ing)?\s+(?:down\s+)?the\s+process\s+(?:down\s+)?into|process\s+can\s+be\s+broken\s+down\s+into)\b/gi,
  /\bunderstanding\s+your\s+starting\s+point\b/gi,
  /\bwhile\s+it\s+might\s+seem\s+counterintuitive\b/gi,
  /\bcommon\s+choices\s+include\b/gi,
  /\bwhere\s+things\s+get\s+interesting\b/gi,
  /\bright\?\s*Well,\s+not\s+any\s*more\b/gi,
  /\bthe\s+future\s+of\s+[\w\s]{1,30}\s+is\s+increasingly\s+(?:shaped|driven|defined)\s+by\b/gi,
  /\btake\s+action\s+now\b/gi,
  /\banother\s+(?:important|key|crucial)\s+(?:aspect|factor|thing|element|point)\s+to\s+consider\b/gi,
  /\bby\s+doing\s+so,?\s+you(?:['’]ll|\s+can|\s+will)\b/gi,
  /\bit['’]?s\s+(?:crucial|important|essential)\s+to\s+remember\b/gi,
  /\bhere\s+are\s+(?:\d+|five|six|seven|eight|nine|ten)\s+(?:simple\s+|key\s+|essential\s+)?(?:steps|things|ways|tips|strategies|best\s+practices|key\s+elements)\b/gi,
  /\bkey\s+(?:elements|aspects|factors|components|considerations)\s+include\b/gi,
  /\b(?:to\s+)?put\s+it\s+simply\b/gi,
  /\bescape\s+the\s+stresses\s+of\s+daily\s+life\b/gi,
  /\bworks?\s+wonders\b/gi
];
var POWER_VERB_COMPOUND_RE = /\b(?:ensur(?:e|es|ing)|leverag(?:e|es|ing)|prioriti[sz](?:e|es|ing)|harness(?:es|ing)?|enhanc(?:e|es|ing)|capitali[sz](?:e|es|ing)\s+on|deliver(?:s|ing)?)\s+(?:\w+\s+){0,3}(?:holistic|seamless|robust|sustainable|scalable|exceptional|strategic|transformative)\b/gi;
var OUTCOME_TAIL_RE = /,\s*leading\s+to\s+(?:increased|improved|enhanced|greater|better)\s+\w+/gi;
var CONCLUSION_CTA_RE = /\bby\s+following\s+these\s+(?:steps|tips|strategies|best\s+practices)\b[^.!?\n]{0,80}?\b(?:boost|improve|enhance|transform|elevate|significantly)\w*/gi;
var LIANG_CLUSTER_RE = /\b(?:versatile|ingenious|methodical(?:ly)?|insightful|laudable|admirable|profound|intriguing(?:ly)?|cogent|lucid|noteworthy|thoughtfully|judiciously|elegantly|compellingly|synergistically|succinctly|comprehensively|strategically|aptly|hitherto|herein)\b/gi;
var KOBAK_CLUSTER_RE = /\b(?:notable|noteworthy|unparalleled|invaluable|culminating|thereby|garnered|surpassing|groundbreaking|commendable|advancements|encompass(?:es|ing)?)\b/gi;
var PROMO_TRAVEL_RE = /\b(?:in\s+the\s+heart\s+of|breathtaking|rich\s+cultural\s+heritage|treasure\s+trove|diverse\s+array|must-visit|hidden\s+gem)\b/gi;
var PIVOTAL_ROLE_RE = /\bplays?\s+a\s+(?:crucial|pivotal|vital|key)\s+role\s+in(?:\s+shaping)?\b/gi;
var LEGACY_FRAMING_RE = /\b(?:pivotal\s+moment|enduring\s+legacy|indelible\s+mark|key\s+turning\s+point|setting\s+the\s+stage\s+for|deeply\s+rooted)\b/gi;
var NOTABILITY_CANNED_RE = /\b(?:profiled\s+in\s+multiple\s+outlets|independent\s+coverage|active\s+social\s+media\s+presence|widely-read\s+outlets)\b/gi;
var BUZZWORD_PHRASES = [
  /\bunlock(?:ing)?\s+the\s+(?:potential|power)\s+of\b/gi,
  /\bharness(?:ing)?\s+the\s+power\s+of\b/gi,
  /\bembark(?:ing)?\s+on\s+a\s+journey\b/gi,
  /\bat\s+the\s+forefront\s+of\b/gi,
  /\bbridg(?:e|ing)\s+the\s+gap\s+between\b/gi,
  /\bpav(?:e|ing)\s+the\s+way\s+for\b/gi,
  /\bpush(?:ing)?\s+the\s+boundaries\s+of\b/gi,
  /\bnavigat(?:e|ing)\s+the\s+complexit(?:y|ies)\b/gi,
  /\btake\s+(?:it|things)\s+to\s+the\s+next\s+level\b/gi
];
var FAUX_INSIGHT_RE = /\b(?:here['’]?s\s+what\s+nobody\s+tells\s+you|what\s+most\s+people\s+get\s+wrong|here['’]?s\s+the\s+kicker|plot\s+twist:|the\s+part\s+everyone\s+misses)\b/gi;
var RHETORICAL_QA_RE = /\b[Tt]he\s+(?:result|goal|answer|solution|problem|catch|best\s+part)\?\s+[A-Z]/g;
var DIDACTIC_NOTE_RE = /\b(?:it['’]?s\s+(?:important|crucial|essential)\s+to\s+(?:understand|recognise|recognize)|(?:results|experiences|mileage)\s+may\s+vary|it\s+should\s+be\s+noted)\b/gi;
var NARRATIVE_CLICHE_RE = /\b(?:faced\s+numerous\s+challenges|newfound\s+sense\s+of\s+purpose|poignant\s+reminder|serves\s+as\s+a\s+(?:powerful|poignant)\s+reminder)\b/gi;
var VALUABLE_INSIGHTS_RE = /\b(?:provid(?:es?|ing)\s+valuable\s+insights?\s+into|key\s+takeaways?\b)/gi;
var COPULA_ALTERNATIVE_RE = /\b(?:serves?|stands?|functions?|operates?)\s+as\s+(?:a|an|the)\b/gi;
var BOLD_LABEL_BULLET_RE = /^\s*[-*+•]\s*\*\*[^*\n]{2,40}\*\*[:.]?\s/;
var EMOJI_DECOR_RE = /[\u{1F680}\u{2728}\u{1F9E0}\u{2705}\u{1F449}\u{1F4A1}\u{1F3AF}\u{1F525}\u{1F4CC}\u{1F4C8}\u{26A1}\u{1F511}]/u;
var RITUAL_HEADING_RE = /^(?:#{1,6}[ \t]+\S.*|<h[1-6][^>]*>.*)$/gim;
var STACCATO_MAX_WORDS = 4;
var TRANSITION_OPENER_RE = /^\s*(?:Additionally|Moreover|Furthermore|Subsequently|In\s+addition|What['’]s\s+more)\b/i;
var FICTION_CLAUDEISM_RE = /\b(?:ministrations|audible\s+pop|rivulets\s+of|half-lidded\s+eyes|despite\s+(?:herself|himself)|with\s+reckless\s+abandon|knuckles\s+(?:turning|turned)\s+white|chuckl(?:es|ed)\s+darkly)\b/gi;
var FICTION_PROMPTONYM_RE = /\b(?:Elara\s+(?:Voss|Vex)|Aris\s+Thorne|Elias\s+Vance|Whispering\s+(?:Woods|Pines|Hollow)|Eldoria)\b/g;
var FICTION_SLOP_RE = /\b(?:took\s+a\s+deep\s+breath|voice\s+barely\s+above\s+a\s+whisper|couldn['’]?t\s+help\s+but\s+feel|casting\s+long\s+shadows|shivers?\s+(?:ran|run(?:ning)?)\s+down\s+(?:my|her|his|their)\s+spine|heart\s+pounding\s+in\s+(?:her|his|my)\s+chest|the\s+room\s+fell\s+silent|days\s+turned\s+into\s+weeks|maybe,\s+just\s+maybe|little\s+did\s+(?:she|he|they)\s+know|unbeknownst\s+to\s+(?:them|her|him))\b/gi;
var OWNER_PHRASES_B = [
  /\bshed(?:s|ding)?\s+light\s+on\b/gi,
  /\ba\s+popular\s+choice\s+for\b/gi,
  /\bconsult(?:ing)?\s+with\s+a\s+(?:professional|specialist|qualified)\b/gi,
  /\bas\s+a\s+professional\s*,/gi,
  /\bstay(?:ing)?\s+ahead\s+of\s+the\s+curve\b/gi,
  /\bI\s+am\s+not\s+a\s+(?:lawyer|doctor|financial\s+advisor|professional)\s*,?\s+but\b/gi,
  /\bsafety\s+should\s+never\s+be\s+(?:overlooked|compromised)\b/gi,
  /\bpresent\s+challenges\s+due\s+to\b/gi,
  /\bextending\s+their\s+lifespan\b/gi,
  /\beven\s+the\s+best\s+plans\s+can\b/gi
];
var OWNER_VOCAB_B_RE = /\b(?:essence|facets?|exhaustive|pesky|folks)\b/gi;
var DIRECTIVE_COLON_BULLET_RE = /^\s*(?:[-*+•]|\d+[.)])\s*(?:Plan|Ensure|Optimi[sz]e|Enhance|Leverage|Prioriti[sz]e|Implement|Utili[sz]e|Consider|Embrace)\b[^.:\n]{0,50}:/;
var TEACH_PREACH_HEADING_RE = /^#{1,6}\s+(?:why\s+(?:it|this)\s+(?:matters|is\s+important)|how\s+to\s+get\s+started|final\s+thoughts|key\s+takeaways|common\s+pitfalls)\s*\??\s*$/gim;
var BY_VING_TEMPLATE_RE = /\bBy\s+\w+ing\s+[^,.\n]{5,60},\s+you\s+can\s+\w+/g;
var PASSIVE_RE = /\b(?:is|are|was|were|been|being|be)\s+(?:\w+ly\s+)?\w{3,}(?:ed|en|wn|lt)\b/gi;
var V3_ISSUE_WEIGHTS = {
  // artefact forensics
  "ai-citation-token": 15,
  "reasoning-leak": 12,
  "placeholder-token": 10,
  "pua-character": 14,
  "math-alphanumeric": 12,
  "arrow-decoration": 4,
  "escaped-markup-literal": 3,
  // tier A phrase/structural
  "neg-parallelism": 5,
  "tripled-negation": 5,
  "despite-challenges-arc": 5,
  "metaphor-cluster": 4,
  "participial-tail": 5,
  "focal-density": 5,
  "owner-phrase": 5,
  "power-verb-compound": 6,
  "outcome-tail": 4,
  "conclusion-cta": 6,
  // tier B (low weights; corroboration)
  "liang-cluster": 2,
  "kobak-density": 2,
  "promo-travel": 2,
  "pivotal-role": 2,
  "legacy-framing": 3,
  "notability-canned": 2,
  "buzzword-phrase": 2,
  "faux-insight": 2,
  "rhetorical-qa": 2,
  "didactic-note": 2,
  "narrative-cliche": 3,
  "valuable-insights": 2,
  "copula-avoidance": 3,
  "bold-label-bullets": 3,
  "emoji-decoration": 2,
  "heading-inflation": 3,
  "staccato-fragments": 3,
  "tricolon-density": 2,
  "transition-stacking": 3,
  "quote-inconsistency": 2,
  "token-cutoff": 2,
  "setup-expansion-cadence": 3,
  "passive-ratio": 3,
  "low-specificity": 2,
  "adjacent-lemma-repeat": 3,
  "fiction-claudeism": 3,
  "fiction-promptonym": 3,
  "fiction-slop-phrase": 2,
  "owner-phrase-b": 2,
  "owner-vocab-b": 2,
  "directive-colon-bullets": 3,
  "teach-preach-headings": 2,
  "by-ving-template": 3,
  "invalid-isbn": 3,
  "proximity-cluster": 2,
  // 2026.08.6 furniture rules (low weights; the escalation floors carry the
  // detection, and the weights stay small so furniture cannot fake breadth).
  "markdown-bold": 3,
  "markdown-heading": 3,
  "markdown-furniture": 4
};
var PASTE = "This only shows up when chat formatting survives the paste. If an editor stripped the formatting, the check finds nothing, which says nothing either way.";
var FORMAL = "Formal writing, and writing by people whose first language is not English, can read this way too.";
var V3_CATEGORY_META = {
  "ai-citation-token": { severity: "high", message: "A chatbot's own citation code is sitting in the text. The code itself says which chatbot it came from.", suggestion: "Delete the code and put a real reference in its place." },
  "reasoning-leak": { severity: "high", message: 'Parts of this text talk about the writing job itself, the kind of notes an AI leaves in its answer, like "as requested" or "let me revise".', suggestion: "Delete those notes and keep the finished writing." },
  "placeholder-token": { severity: "high", message: 'A machine placeholder is still in the text, something like "{{name}}" or "<insert>".', suggestion: "Fill it in or delete it before this goes out." },
  "pua-character": { severity: "high", message: "The text holds characters from a private corner of Unicode that has no agreed meaning. ChatGPT wraps its citation codes in these. Icon fonts are the only other common reason for them.", suggestion: "Delete them, and look for chatbot citation codes next to them." },
  "math-alphanumeric": { severity: "high", message: "Fake bold or italic letters built from maths symbols (\u{1D5F9}\u{1D5F6}\u{1D5F8}\u{1D5F2} \u{1D601}\u{1D5F5}\u{1D5F6}\u{1D600}). They come from chatbot copy-paste and social-media text formatters.", suggestion: "Retype them as ordinary letters and use real bold or italic." },
  "arrow-decoration": { severity: "medium", message: 'Arrows stand in for words again and again: "input \u2192 output \u2192 result".', suggestion: "Write the connection out in words." },
  "escaped-markup-literal": { severity: "low", message: 'A stray scrap of code is showing through the text, like "&nbsp;" or "\\n". It usually comes from pasting out of a chat window.', suggestion: "Delete it." },
  "neg-parallelism": { severity: "medium", message: 'The "not only X but Y" shape comes back more than once.', suggestion: "Keep one. Say the rest plainly." },
  "tripled-negation": { severity: "medium", message: 'The "Not X. Not Y. Just Z." shape.', suggestion: "Say what it is, without the three-part build-up." },
  "despite-challenges-arc": { severity: "medium", message: 'The stock "despite challenges, it continues to thrive" story shape.', suggestion: "Name the real problem and what was really done about it." },
  "metaphor-cluster": { severity: "medium", message: 'Several worn-out picture words are stacked together: "tapestry", "interplay", "evolving landscape", "testament to".', suggestion: "Say the plain facts they are standing in for." },
  "participial-tail": { severity: "medium", message: 'Sentences keep ending with a tacked-on "-ing" clause that tells you why it mattered: ", highlighting the need for\u2026", ", underscoring the importance of\u2026". That ending turns up several times more often in machine writing than in human writing.', suggestion: "Stop the sentence at the fact. Cut the tail, or turn it into a claim you can source." },
  "focal-density": { severity: "medium", message: 'A lot of words from the AI-favourite list turn up here: "delve", "showcase", "pivotal", "meticulous". Any one of them is normal English. It is how many there are that stands out.', suggestion: "Swap most of them for plainer verbs and adjectives." },
  "owner-phrase": { severity: "medium", message: "A ready-made phrase from the generic-writing phrasebook.", suggestion: "Replace it with something specific to your subject." },
  "power-verb-compound": { severity: "high", message: 'A big verb glued to a vague adjective: "leverage a robust solution", "ensure seamless delivery". It sounds like value and says nothing.', suggestion: "Name the real action and the thing you can measure." },
  "outcome-tail": { severity: "medium", message: 'The sentence trails off into a vague result: ", leading to increased engagement".', suggestion: "Say the exact result, or cut the tail." },
  "conclusion-cta": { severity: "high", message: 'The stock marketing sign-off: "by following these steps you can boost\u2026".', suggestion: "Close on something specific, not a general promise." },
  "liang-cluster": { severity: "low", message: 'Several judgement words from the AI-overuse lists sit close together, like "crucial", "notable" and "significant".', suggestion: "Keep the judgements you can back up with detail." },
  "kobak-density": { severity: "low", message: "Several words sit here that turned up far more often in machine writing when a large body of text was counted.", suggestion: "Vary the words, or back the claims with detail." },
  "promo-travel": { severity: "low", message: 'Brochure words are bunched together: "nestled", "breathtaking", "hidden gem". They stand out most when the piece is not a travel brochure.', suggestion: "Describe the place or the product with real detail." },
  "pivotal-role": { severity: "low", message: 'The "plays a crucial role in shaping" formula.', suggestion: "Say what it actually does." },
  "legacy-framing": { severity: "low", message: 'Several grand phrases about legacy and importance are stacked up: "enduring legacy", "pivotal moment".', suggestion: "Let the events speak for themselves." },
  "notability-canned": { severity: "low", message: 'A canned line about how well known something is: "profiled in multiple outlets".', suggestion: "Name the outlets, or drop the claim." },
  "buzzword-phrase": { severity: "low", message: 'A stock office phrase: "harness the power of", "at the forefront of".', suggestion: "Say what it can actually do." },
  "faux-insight": { severity: "low", message: `A line promising a secret: "here's what nobody tells you".`, suggestion: "Show the point. Do not announce it." },
  "rhetorical-qa": { severity: "low", message: 'The "The result? X." trick keeps coming back.', suggestion: "Use it once at most." },
  "didactic-note": { severity: "low", message: `A teacherly disclaimer: "it's important to understand", "results may vary".`, suggestion: "Cut it, or make it specific." },
  "narrative-cliche": { severity: "low", message: 'A worn-out story phrase: "faced numerous challenges", "a poignant reminder".', suggestion: "Say what actually happened." },
  "valuable-insights": { severity: "low", message: 'A stock academic filler phrase: "provides valuable insights into".', suggestion: "State the insight itself." },
  "copula-avoidance": { severity: "low", message: 'The text keeps dodging plain "is" and "has" in favour of "serves as", "stands as" and "functions as". ' + FORMAL, suggestion: 'Use "is" and "has" where they fit.' },
  "bold-label-bullets": { severity: "low", message: 'A run of bullets all shaped "**Label:** description". Technical documents use this shape too.', suggestion: "Turn it into sentences, or vary the shape of the items." },
  "emoji-decoration": { severity: "low", message: "Emoji are used on headings or bullets. That is a chat-window habit in a piece of business writing.", suggestion: "Take the decorative emoji out of this kind of writing." },
  "heading-inflation": { severity: "low", message: "There are a lot of headings for the amount of writing under them. SEO advice produces the same shape.", suggestion: "Merge sections whose body is only a sentence or two." },
  "staccato-fragments": { severity: "low", message: "A run of very short, punchy fragments. Ad copy does this on purpose too.", suggestion: "Join some of them into full sentences." },
  "tricolon-density": { severity: "low", message: 'Three-part lists such as "faster, cheaper, simpler" turn up a lot for a piece this long.', suggestion: "Break the pattern: use two items, or four." },
  "transition-stacking": { severity: "low", message: 'Most paragraphs open on a formal joining word: "Furthermore", "Moreover", "Additionally". ' + FORMAL, suggestion: "Let the content do the joining in most paragraphs." },
  "quote-inconsistency": { severity: "low", message: "Curly and straight quotation marks are mixed together. That usually comes from pasting out of a chat window, though word processors do it too.", suggestion: "Make the quotation marks match, either way round." },
  "token-cutoff": { severity: "low", message: "The text stops in the middle of a sentence, the shape of an answer that ran out of room, or a paste that went wrong.", suggestion: "Finish the last sentence, or delete it." },
  "setup-expansion-cadence": { severity: "low", message: "Short sentence, then long one, over and over, or the other way round. " + FORMAL, suggestion: "Keep the pattern only where the short sentence works on its own." },
  "passive-ratio": { severity: "low", message: 'A lot of the sentences hide who did the thing: "mistakes were made". That is high for a blog or a marketing piece. Academic writing does it, and ' + FORMAL.charAt(0).toLowerCase() + FORMAL.slice(1), suggestion: "Rewrite most sentences so the person or thing doing it comes first." },
  "low-specificity": { severity: "low", message: "Almost no numbers, dates or names for a piece this long. Corporate writers produce empty writing too.", suggestion: "Add facts a reader could go and check." },
  "adjacent-lemma-repeat": { severity: "low", message: "Neighbouring sentences keep reusing the same word. " + FORMAL, suggestion: "Merge the repetitive sentences, or change the wording where it reads naturally." },
  "fiction-claudeism": { severity: "low", message: "Phrases that turn up a lot in Claude's fiction writing. Romance authors use several of them quite normally.", suggestion: "Put the stock phrases into your own words." },
  "fiction-promptonym": { severity: "low", message: 'A character name that AI writing produces far more often than people do. "Elara Voss" is the best-known one.', suggestion: "Pick a less loaded name if you want one." },
  "fiction-slop-phrase": { severity: "low", message: "Several well-worn fiction lines land in the same piece. All of them were human clich\xE9s long before AI.", suggestion: "Cut or rework the stock moments." },
  "owner-phrase-b": { severity: "low", message: "A phrase from the second generic-writing phrasebook.", suggestion: "Replace it with something specific." },
  "owner-vocab-b": { severity: "low", message: 'Several second-string filler words sit close together: "essence", "facet", "pesky", "folks".', suggestion: "Swap them for plainer words where they add nothing." },
  "directive-colon-bullets": { severity: "low", message: 'Several list items open on an order and a colon: "Ensure X:", "Optimise Y:". Real technical checklists look like this too.', suggestion: "Vary the way the items are built." },
  "teach-preach-headings": { severity: "low", message: 'Stock tutorial headings hold the piece together: "Why it matters", "Final thoughts", "Key takeaways".', suggestion: "Name each section after what is actually in it." },
  "by-ving-template": { severity: "low", message: 'The "By doing X, you can Y" shape keeps coming back.', suggestion: "Say the benefit straight out most of the time." },
  "invalid-isbn": { severity: "low", message: "An ISBN in the text does not add up. Made-up references often fail this check, and so do typos.", suggestion: "Check the reference against the real book." },
  "proximity-cluster": { severity: "low", message: "The same flagged buzzword comes back within a sentence or two.", suggestion: "Keep one use at most in each passage." },
  // 2026.08.6 chat-formatting rules. Each one states the paste caveat: the
  // check can only see formatting that survived the paste, so its ABSENCE says
  // nothing about who wrote the text.
  "markdown-bold": { severity: "low", message: "Raw **bold** markdown is showing in the text. None of the 169 human-written documents we checked had it. " + PASTE, suggestion: "Delete the stars, or apply real bold." },
  "markdown-heading": { severity: "low", message: "A raw markdown heading line, the kind that starts with # signs, is showing in the text. None of the 169 human-written documents we checked had one. " + PASTE, suggestion: "Turn it into a real heading, or delete it." },
  "markdown-furniture": { severity: "low", message: "Chat-window formatting shapes this text: runs of bold, heading lines, or a wall of bullets. None of the 169 human-written documents we checked had that combination. " + PASTE, suggestion: "Rebuild the formatting properly for wherever this is going." }
};

// src/patterns/en-signals-v3.ts
function execAll(pattern, text) {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push(m);
    if (m[0].length === 0) re.lastIndex += 1;
  }
  return out;
}
function countWords(text) {
  return (text.match(/\S+/g) ?? []).length;
}
function pushDistinctCluster(ctx, pattern, category, minDistinct) {
  const matches = execAll(pattern, ctx.text);
  const distinct = new Set(matches.map((m) => m[0].toLowerCase()));
  if (distinct.size < minDistinct) return;
  const seen = /* @__PURE__ */ new Set();
  for (const m of matches) {
    const lower = m[0].toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    ctx.push(category, lower, m.index, m.index + m[0].length);
  }
}
function pushCountThreshold(ctx, pattern, category, minCount) {
  const matches = execAll(pattern, ctx.text);
  if (matches.length < minCount) return;
  for (const m of matches) ctx.push(category, m[0], m.index, m.index + m[0].length);
}
function isbn10Valid(digits) {
  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    const ch = digits[i];
    const val = ch === "X" || ch === "x" ? 10 : ch.charCodeAt(0) - 48;
    if (val < 0 || val > 10) return false;
    sum += val * (10 - i);
  }
  return sum % 11 === 0;
}
function isbn13Valid(digits) {
  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    const val = digits.charCodeAt(i) - 48;
    if (val < 0 || val > 9) return false;
    sum += val * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}
function collectV3Issues(ctx) {
  const { text, wordCount, paragraphs, sentences, push, pushEx, pushPatterns } = ctx;
  const perThousand = (n) => n / (wordCount / 1e3);
  for (const { pattern, attribution } of AI_CITATION_TOKENS) {
    for (const m of execAll(pattern, text)) {
      pushEx("ai-citation-token", m[0], m.index, m.index + m[0].length, {
        extra: { attribution }
      });
    }
  }
  pushPatterns(REASONING_LEAKS, "reasoning-leak");
  pushPatterns(PLACEHOLDER_TOKENS, "placeholder-token");
  pushPatterns(ESCAPED_MARKUP_LITERALS, "escaped-markup-literal");
  {
    const pua = execAll(PUA_RANGE_RE, text);
    if (pua.length > 0) {
      const first = pua[0];
      pushEx("pua-character", `${pua.length} private-use character(s)`, first.index, first.index + first[0].length, { count: pua.length });
    }
    const math = execAll(MATH_ALPHANUMERIC_RE, text);
    if (math.length > 0) {
      const first = math[0];
      pushEx("math-alphanumeric", `${math.length} mathematical-alphanumeric character(s)`, first.index, first.index + first[0].length, { count: math.length });
    }
    const arrows = execAll(ARROW_CONNECTOR_RE, text);
    if (arrows.length >= 3) {
      const first = arrows[0];
      pushEx("arrow-decoration", `${arrows.length} arrow connectors`, first.index, first.index + first[0].length, { count: arrows.length });
    }
  }
  pushCountThreshold(ctx, NEG_PARALLELISM_RE, "neg-parallelism", 2);
  pushPatterns([TRIPLED_NEGATION_RE], "tripled-negation");
  pushPatterns([DESPITE_CHALLENGES_RE], "despite-challenges-arc");
  {
    const found = [];
    for (const re of METAPHOR_CLUSTER_RES) {
      const m = execAll(re, text)[0];
      if (m) found.push({ key: m[0].toLowerCase(), index: m.index, len: m[0].length });
    }
    if (found.length >= 2) {
      for (const f of found) push("metaphor-cluster", f.key, f.index, f.index + f.len);
    }
  }
  {
    const tails = execAll(PARTICIPIAL_TAIL_RE, text);
    if (tails.length >= 3 && (wordCount < 1e3 || perThousand(tails.length) >= 3)) {
      for (const m of tails) push("participial-tail", m[0].slice(0, 60), m.index, m.index + m[0].length);
    }
  }
  {
    const hits = execAll(FOCAL_WORD_RE, text);
    if (hits.length >= 3 && perThousand(hits.length) >= 3) {
      const first = hits[0];
      pushEx("focal-density", `${hits.length} focal-lexicon hits in ${wordCount} words`, first.index, first.index + first[0].length, {
        count: hits.length,
        extra: { rate_per_1000_words: Math.round(perThousand(hits.length) * 10) / 10 }
      });
    }
  }
  pushPatterns(OWNER_PHRASES, "owner-phrase");
  pushPatterns([POWER_VERB_COMPOUND_RE], "power-verb-compound");
  pushPatterns([OUTCOME_TAIL_RE], "outcome-tail");
  pushPatterns([CONCLUSION_CTA_RE], "conclusion-cta");
  pushDistinctCluster(ctx, LIANG_CLUSTER_RE, "liang-cluster", 3);
  pushDistinctCluster(ctx, KOBAK_CLUSTER_RE, "kobak-density", 4);
  pushDistinctCluster(ctx, PROMO_TRAVEL_RE, "promo-travel", 2);
  pushPatterns([PIVOTAL_ROLE_RE], "pivotal-role");
  pushDistinctCluster(ctx, LEGACY_FRAMING_RE, "legacy-framing", 2);
  pushPatterns([NOTABILITY_CANNED_RE], "notability-canned");
  pushPatterns(BUZZWORD_PHRASES, "buzzword-phrase");
  pushPatterns([FAUX_INSIGHT_RE], "faux-insight");
  pushCountThreshold(ctx, RHETORICAL_QA_RE, "rhetorical-qa", 2);
  pushPatterns([DIDACTIC_NOTE_RE], "didactic-note");
  pushPatterns([NARRATIVE_CLICHE_RE], "narrative-cliche");
  pushPatterns([VALUABLE_INSIGHTS_RE], "valuable-insights");
  pushDistinctCluster(ctx, FICTION_CLAUDEISM_RE, "fiction-claudeism", 2);
  pushPatterns([FICTION_PROMPTONYM_RE], "fiction-promptonym");
  pushDistinctCluster(ctx, FICTION_SLOP_RE, "fiction-slop-phrase", 2);
  pushPatterns(OWNER_PHRASES_B, "owner-phrase-b");
  pushDistinctCluster(ctx, OWNER_VOCAB_B_RE, "owner-vocab-b", 2);
  pushPatterns([TEACH_PREACH_HEADING_RE], "teach-preach-headings");
  pushCountThreshold(ctx, BY_VING_TEMPLATE_RE, "by-ving-template", 2);
  {
    const alts = execAll(COPULA_ALTERNATIVE_RE, text);
    if (alts.length >= 3) {
      const copulas = (text.match(/\b(?:is|are)\b/gi) ?? []).length;
      const ratio = alts.length / (alts.length + copulas);
      if (ratio > 0.25) {
        const first = alts[0];
        pushEx("copula-avoidance", `${alts.length} copula alternatives vs ${copulas} is/are (${Math.round(ratio * 100)}%)`, first.index, first.index + first[0].length, {
          count: alts.length,
          extra: { copula_count: copulas, alternative_ratio: Math.round(ratio * 100) / 100 }
        });
      }
    }
  }
  const lines = text.split(/\r?\n/);
  {
    let offset = 0;
    let boldRun = 0;
    let boldRunStart = -1;
    let boldRunEnd = -1;
    let emojiLines = 0;
    let firstEmojiAt = -1;
    let firstEmojiEnd = -1;
    let directiveHits = 0;
    let firstDirectiveAt = -1;
    let firstDirectiveEnd = -1;
    const flushBold = () => {
      if (boldRun >= 3) {
        pushEx("bold-label-bullets", `${boldRun} bold-label bullets`, boldRunStart, boldRunEnd, { count: boldRun });
      }
      boldRun = 0;
      boldRunStart = -1;
      boldRunEnd = -1;
    };
    for (const line of lines) {
      if (BOLD_LABEL_BULLET_RE.test(line)) {
        if (boldRun === 0) boldRunStart = offset + (line.length - line.trimStart().length);
        boldRunEnd = offset + line.replace(/\s+$/, "").length;
        boldRun += 1;
      } else if (line.trim() !== "") {
        flushBold();
      }
      const isHeadingOrBullet = /^\s*(?:#{1,6}[ \t]|[-*+•]\s|\d+[.)]\s)/.test(line);
      if (isHeadingOrBullet) {
        const emoji = EMOJI_DECOR_RE.exec(line);
        if (emoji !== null) {
          emojiLines += 1;
          if (firstEmojiAt < 0) {
            firstEmojiAt = offset + emoji.index;
            firstEmojiEnd = firstEmojiAt + emoji[0].length;
          }
        }
      }
      const directive = DIRECTIVE_COLON_BULLET_RE.exec(line);
      if (directive !== null) {
        directiveHits += 1;
        if (firstDirectiveAt < 0) {
          firstDirectiveAt = offset + directive.index;
          firstDirectiveEnd = firstDirectiveAt + directive[0].length;
        }
      }
      offset += line.length + 1;
    }
    flushBold();
    if (emojiLines >= 3) {
      pushEx("emoji-decoration", `${emojiLines} emoji-decorated headings/bullets`, firstEmojiAt, firstEmojiEnd, { count: emojiLines });
    }
    if (directiveHits >= 3) {
      pushEx("directive-colon-bullets", `${directiveHits} directive-colon list items`, firstDirectiveAt, firstDirectiveEnd, { count: directiveHits });
    }
  }
  {
    const headings = execAll(RITUAL_HEADING_RE, text);
    if (headings.length >= 4 && wordCount >= 60 && headings.length / (wordCount / 300) > 3) {
      const first = headings[0];
      pushEx("heading-inflation", `${headings.length} headings in ${wordCount} words`, first.index, first.index + first[0].length, {
        count: headings.length,
        extra: { headings_per_300_words: Math.round(headings.length / (wordCount / 300) * 10) / 10 }
      });
    }
  }
  {
    for (const para of paragraphs) {
      const paraSents = para.text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
      let cursor = 0;
      const located = paraSents.map((s) => {
        const at = para.text.indexOf(s, cursor);
        const start = at >= 0 ? at : cursor;
        cursor = start + s.length;
        return { text: s, start: para.start + start, end: para.start + start + s.length };
      });
      let run = 0;
      let runStart = -1;
      let fired = false;
      for (const s of located) {
        const words = countWords(s.text);
        if (words > 0 && words <= STACCATO_MAX_WORDS && /[.!?]$/.test(s.text)) {
          run += 1;
          if (run === 1) runStart = s.start;
          if (run >= 3 && !fired) {
            pushEx("staccato-fragments", `${run}+ consecutive short fragments`, runStart, s.end, { count: run });
            fired = true;
          }
        } else {
          run = 0;
          runStart = -1;
        }
      }
    }
  }
  {
    const triads = execAll(/\b\w+,\s+\w+,\s+and\s+\w+\b/g, text);
    if (triads.length >= 4 && perThousand(triads.length) > 10) {
      const first = triads[0];
      pushEx("tricolon-density", `${triads.length} balanced triads in ${wordCount} words`, first.index, first.index + first[0].length, { count: triads.length });
    }
  }
  {
    if (paragraphs.length >= 3) {
      let openers = 0;
      let consecutive = 0;
      let maxConsecutive = 0;
      let firstAt = -1;
      let firstEnd = -1;
      for (const p of paragraphs) {
        const opener = TRANSITION_OPENER_RE.exec(p.text);
        if (opener !== null) {
          openers += 1;
          consecutive += 1;
          maxConsecutive = Math.max(maxConsecutive, consecutive);
          if (firstAt < 0) {
            const lead = opener[0].length - opener[0].trimStart().length;
            firstAt = p.start + opener.index + lead;
            const tail = /^[,;:]/.exec(p.text.slice(opener.index + opener[0].length));
            firstEnd = p.start + opener.index + opener[0].length + (tail === null ? 0 : 1);
          }
        } else {
          consecutive = 0;
        }
      }
      const majority = paragraphs.length >= 4 && openers / paragraphs.length > 0.5;
      if (majority || maxConsecutive >= 3) {
        pushEx("transition-stacking", `${openers}/${paragraphs.length} paragraphs open with a formal connective`, firstAt >= 0 ? firstAt : null, firstAt >= 0 ? firstEnd : null, { count: openers });
      }
    }
  }
  {
    const curly = (text.match(/[“”]/g) ?? []).length;
    const straight = (text.match(/"/g) ?? []).length;
    if (curly >= 2 && straight >= 2) {
      pushEx("quote-inconsistency", `${curly} curly + ${straight} straight double quotes mixed`, null, null, {
        count: curly + straight,
        extra: { curly_double_quotes: curly, straight_double_quotes: straight }
      });
    }
  }
  {
    const trimmed = text.replace(/\s+$/, "");
    const lastLine = trimmed.slice(trimmed.lastIndexOf("\n") + 1);
    const looksStructural = /^\s*(?:#{1,6}[ \t]|[-*+•]\s|\d+[.)]\s|\|)/.test(lastLine) || /^```|^~~~/.test(lastLine.trim());
    if (wordCount >= 100 && trimmed.length > 0 && /[a-z,;]$/.test(trimmed) && !looksStructural && countWords(lastLine) >= 5) {
      const lineStart = trimmed.length - lastLine.length;
      const lastStop = lastLine.search(/[.!?](?=[^.!?]*$)/);
      const fragment = lastStop >= 0 ? lastLine.slice(lastStop + 1) : lastLine;
      const start = trimmed.length - fragment.length + (fragment.length - fragment.trimStart().length);
      pushEx("token-cutoff", "text ends mid-sentence", Math.max(lineStart, start), trimmed.length, {});
    }
  }
  const sentenceWordCounts = sentences.map(countWords);
  {
    if (sentenceWordCounts.length >= 8) {
      let hits = 0;
      for (let i = 0; i < sentenceWordCounts.length - 1; i += 1) {
        const a = sentenceWordCounts[i];
        const b = sentenceWordCounts[i + 1];
        if (a > 0 && a <= 6 && b >= 3 * a && b >= 12 || b > 0 && b <= 6 && a >= 3 * b && a >= 12) hits += 1;
      }
      const ratio = hits / (sentenceWordCounts.length - 1);
      if (hits >= 3 && ratio >= 0.2) {
        pushEx("setup-expansion-cadence", `${hits} setup/expansion sentence pairs (${Math.round(ratio * 100)}%)`, null, null, {
          count: hits,
          extra: { pair_ratio: Math.round(ratio * 100) / 100 }
        });
      }
    }
  }
  {
    if (sentences.length >= 10) {
      let passiveSentences = 0;
      for (const s of sentences) {
        PASSIVE_RE.lastIndex = 0;
        if (PASSIVE_RE.test(s)) passiveSentences += 1;
      }
      const ratio = passiveSentences / sentences.length;
      if (ratio > 0.4) {
        pushEx("passive-ratio", `${passiveSentences}/${sentences.length} sentences read as passive (${Math.round(ratio * 100)}%)`, null, null, {
          count: passiveSentences,
          extra: { passive_ratio: Math.round(ratio * 100) / 100 }
        });
      }
    }
  }
  {
    if (wordCount >= 300) {
      const digitTokens = (text.match(/(?<![\w.])[£$€]?\d[\d,.]*%?/g) ?? []).length;
      const midCaps = (text.match(/(?<=[a-z,;]\s)[A-Z][a-z]{2,}/g) ?? []).length;
      const specifics = digitTokens + midCaps;
      if (perThousand(specifics) < 2) {
        pushEx("low-specificity", `${specifics} concrete specifics in ${wordCount} words`, null, null, {
          count: specifics,
          extra: { specifics_per_1000_words: Math.round(perThousand(specifics) * 10) / 10 }
        });
      }
    }
  }
  {
    if (sentences.length >= 10) {
      const contentSets = sentences.map((s) => new Set(s.toLowerCase().match(/\b[a-z]{6,}\b/g) ?? []));
      let repeats = 0;
      for (let i = 0; i < contentSets.length - 1; i += 1) {
        const a = contentSets[i];
        const b = contentSets[i + 1];
        let shared = false;
        for (const w of a) {
          if (b.has(w)) {
            shared = true;
            break;
          }
        }
        if (shared) repeats += 1;
      }
      const ratio = repeats / (contentSets.length - 1);
      if (ratio >= 0.45) {
        pushEx("adjacent-lemma-repeat", `${repeats}/${contentSets.length - 1} adjacent sentence pairs repeat a content word`, null, null, {
          count: repeats,
          extra: { repeat_ratio: Math.round(ratio * 100) / 100 }
        });
      }
    }
  }
  {
    const hits = execAll(FOCAL_WORD_RE, text);
    const byWord = /* @__PURE__ */ new Map();
    for (const m of hits) {
      const w = m[0].toLowerCase();
      (byWord.get(w) ?? byWord.set(w, []).get(w)).push(m.index);
    }
    for (const [word, positions] of byWord) {
      for (let i = 0; i < positions.length - 1; i += 1) {
        if (positions[i + 1] - positions[i] <= 300) {
          push("proximity-cluster", `"${word}" repeats within 300 chars`, positions[i], positions[i] + word.length, void 0, positions.length);
          break;
        }
      }
    }
  }
  {
    for (const m of execAll(/\bISBN(?:-1[03])?:?\s*((?:97[89][- ]?)?(?:\d[- ]?){9,12}[\dXx])\b/g, text)) {
      const digits = m[1].replace(/[- ]/g, "");
      const valid = digits.length === 10 ? isbn10Valid(digits) : digits.length === 13 ? isbn13Valid(digits) : false;
      if (!valid && (digits.length === 10 || digits.length === 13)) {
        push("invalid-isbn", m[0], m.index, m.index + m[0].length);
      }
    }
  }
  {
    const boldRuns = execAll(/\*\*[^*\n]{1,120}\*\*/g, text);
    if (boldRuns.length >= 1) {
      const first = boldRuns[0];
      pushEx("markdown-bold", `${boldRuns.length} literal **bold** run(s)`, first.index, first.index + first[0].length, { count: boldRuns.length });
    }
    const mdHeadings = execAll(/^#{1,6}[ \t]+\S/gm, text);
    if (mdHeadings.length >= 1) {
      const first = mdHeadings[0];
      pushEx("markdown-heading", `${mdHeadings.length} markdown heading line(s)`, first.index, first.index + first[0].length, { count: mdHeadings.length });
    }
    const bulletLines = (text.match(/^\s*[-*•]\s+/gm) ?? []).length;
    const bulletsPer1000 = wordCount > 0 ? bulletLines / (wordCount / 1e3) : 0;
    const gateOpen = boldRuns.length >= 1 || mdHeadings.length >= 1 || bulletsPer1000 > V6_FURNITURE_THRESHOLDS.bulletsPer1000;
    if (gateOpen) {
      pushEx(
        "markdown-furniture",
        `${boldRuns.length} bold / ${mdHeadings.length} headings / ${Math.round(bulletsPer1000 * 10) / 10} bullets per 1000 words`,
        null,
        null,
        {
          count: boldRuns.length + mdHeadings.length + bulletLines,
          extra: {
            bold_runs: boldRuns.length,
            heading_lines: mdHeadings.length,
            bullets_per_1000_words: Math.round(bulletsPer1000 * 10) / 10
          }
        }
      );
    }
  }
}

// src/patterns/en-signals-v4-data.ts
var V4_RHYTHM_CATEGORIES = /* @__PURE__ */ new Set([
  "sentence-length-spectral-flatness",
  "conditional-compression",
  "lexical-register-distance",
  "punchline-fragment-density",
  "mic-drop-paragraph",
  "contrast-density",
  "rhetorical-procedural-ratio"
]);
var V4_THRESHOLDS = {
  /** Fixed window length in sentences for the spectral estimator — the
   * plan's length-artefact correction: flatness is only compared between
   * equal-length series. */
  spectralWindowSentences: 12,
  /** Minimum number of full windows before the signal is computed. */
  spectralMinWindows: 2,
  /** Fire when the window-averaged spectral flatness falls below this. */
  spectralFlatnessMax: 0.28,
  /** Conditional compression is computed only inside this word band: the
   * gain statistic falls with document length for EVERY author (the plan's
   * length-confound warning), so out-of-band documents are exempt rather
   * than mis-thresholded. */
  compressionMinWords: 250,
  compressionMaxWords: 900,
  /** Fire when the relative gain from the human-corpus prior falls below
   * this. Calibrated in-band: the lowest human sample measured 0.177; the
   * chat-export-furniture positive measures ~0.10. */
  compressionGainMin: 0.14,
  /** Minimum words before the register profile is computed (the L1 distance
   * is noisy on short texts — a 50-word human note measures >0.5). */
  registerMinWords: 300,
  /** Fire when function-word L1 distance from the human reference profile
   * exceeds this AND the long-word share exceeds the reference by the
   * delta below (both must hold — the genre-confound guard). Calibrated:
   * the highest human fixture measured funcL1 0.266 / longΔ 0.058. */
  registerFuncL1Min: 0.3,
  registerLongWordDeltaMin: 0.1,
  /** Punchline fragments: at least this many, at at least this share of
   * sentences, with at least this many paragraph-final. */
  punchlineMinCount: 4,
  punchlineMinRate: 0.18,
  punchlineMinParagraphFinal: 2,
  /** Mic-drop paragraphs required before the rule fires (never one). */
  micDropMinParagraphs: 2,
  /** Contrast constructions: minimum count AND minimum per-1000-words rate. */
  contrastMinCount: 4,
  contrastMinPer1000: 4,
  /** Rhetorical/procedural: minimum sentences, minimum abstract-claim
   * sentences, minimum abstract share, maximum concrete sentences. */
  ratioMinSentences: 12,
  ratioMinAbstract: 9,
  ratioMinShare: 0.7,
  ratioMaxConcrete: 2
};
var ABSTRACT_PUNCH_RE = /^(?:(?:and\s+)?(?:that|this|it)['’]?s?\b)|\b(?:matters?|everything|nothing|difference|point|result|future|answer|story|truth|shift|mindset|game|lesson|magic|secret|power|possible|real\s+\w+)\b/i;
var MIC_DROP_CONTRAST_RE = /\bnot\b|n[’']t\b|\bbut\b|\b(?:it|that|this)\s+(?:is|was)\b|\bdifference\b|\bmatters?\b|\binstead\b|\bwho\b|\bwhat\b|\bwhy\b|\bjust\b/i;
var CONTRAST_VARIANT_RES = [
  /\b\w+\s+(?:is|was|are|were)\s+not\s+(?:about\s+|just\s+|only\s+)?[^.!?\n]{1,50}[.!?]\s+(?:It|They|That|This)\s+(?:is|was|are|were)\b/g,
  /\b(?:this|it)\s+(?:is|was)\s*n[’']t\s+about\s+[^.!?\n]{1,50}[.;—]\s*[Ii]t['’]s\s+about\b/g,
  /\b(?:this|it)\s+isn[’']t\s+[^.!?\n]{1,50}[.!?]\s+It['’]s\b/g
];
var CONCRETE_ACTION_VERB_RE = /\b(?:moved|installed|checked|rang|phoned|emailed|sent|built|wrote|ordered|fixed|booked|painted|measured|delivered|signed|printed|uploaded|configured|tested|deployed|migrated|invoiced|quoted|packed|shipped|cleaned|repaired|replaced|bought|paid|hired|visited|opened|closed|launched|updated|added|removed|reviewed|approved|submitted|filed|called|drove|attended|arranged|cancelled|refunded|scheduled|recorded|photographed|wired|plumbed|stocked|priced|posted|drafted|edited|published)\b/i;
var ABSTRACT_CLAIM_RE = /\b(?:is|are|was|were|isn[’']t|aren[’']t|means|matters|becomes?|feels?|represents?)\b[^.!?\n]{0,80}\b(?:important|essential|critical|everything|nothing|different|possible|powerful|real|value|success|growth|potential|future|journey|transformation|opportunity|mindset|game|advantage|key|vital|crucial|remarkable|extraordinary|leadership|innovation|vision|impact|change)\b/i;
var REGISTER_FUNCTION_WORDS = [
  "the",
  "of",
  "and",
  "a",
  "to",
  "in",
  "is",
  "it",
  "that",
  "was",
  "he",
  "for",
  "on",
  "are",
  "as",
  "with",
  "his",
  "they",
  "i",
  "at",
  "be",
  "this",
  "have",
  "from",
  "or",
  "one",
  "had",
  "by",
  "not",
  "but",
  "what",
  "all",
  "were",
  "we",
  "when",
  "your",
  "can",
  "there",
  "an",
  "which",
  "their",
  "if",
  "will",
  "so",
  "no",
  "would",
  "who",
  "them",
  "these",
  "than"
];
var REGISTER_LONG_WORD_LEN = 7;
var V4_ISSUE_WEIGHTS = {
  "sentence-length-spectral-flatness": 2,
  "conditional-compression": 2,
  "lexical-register-distance": 2,
  "punchline-fragment-density": 2,
  "mic-drop-paragraph": 2,
  "contrast-density": 2,
  "rhetorical-procedural-ratio": 2
};
var V4_CATEGORY_META = {
  "sentence-length-spectral-flatness": {
    severity: "low",
    message: "Sentence lengths follow a pattern that is more regular than most writing this long. We only measure it on fixed-size chunks, so short pieces are skipped. Careful human editing produces the same shape.",
    suggestion: "Nothing to change unless the other checks agree. Varying sentence length is a choice, not a rule."
  },
  "conditional-compression": {
    severity: "low",
    message: "Held up against a sample of varied human writing, this text has less in common with it than most. Copy written to a tight template scores the same way.",
    suggestion: "Nothing to change on its own. If the other checks agree, vary phrasing you have repeated."
  },
  "lexical-register-distance": {
    severity: "low",
    message: "The mix of small joining words, and the length of the words, sits a long way from our sample of everyday human writing. Worth knowing: that sample is general writing, so academic, legal and technical pieces land far away quite fairly.",
    suggestion: "Nothing to change on its own. Plainer wording moves it closer if the other checks agree."
  },
  "punchline-fragment-density": {
    severity: "low",
    message: `Very short, abstract closing lines keep turning up, especially at the end of paragraphs: "That's the point." Good copywriters use punchlines on purpose, which is why we only count how many there are.`,
    suggestion: "Keep the punchlines that earn their place. Turn the rest into full sentences."
  },
  "mic-drop-paragraph": {
    severity: "low",
    message: "Several paragraphs are built the same way: a few medium sentences, then a much shorter line to land on. One paragraph like that is ordinary. It is the repeat that stands out.",
    suggestion: "Let some paragraphs finish on their facts instead of a quotable line."
  },
  "contrast-density": {
    severity: "low",
    message: `Two-sided contrasts keep coming back: "not X, but Y"; "It wasn't A. It was B." One is ordinary writing. It is the rate that stands out.`,
    suggestion: "Keep the strongest contrast and say the rest plainly."
  },
  "rhetorical-procedural-ratio": {
    severity: "low",
    message: "Sentences making broad claims heavily outnumber sentences naming a real action, object or number. We count a sentence as concrete when it holds a number, a name, or a specific action verb. Opinion and vision pieces are broad on purpose.",
    suggestion: "Back more claims with a specific action, name or figure if the other checks agree."
  }
};

// src/patterns/en-signals-v4-corpus.ts
var REFERENCE_CORPUS = `At five o\u2019clock the two ladies retired to dress, and at half-past six Elizabeth was summoned to dinner. To the civil inquiries which then poured in, and amongst which she had the pleasure of distinguishing the much superior solicitude of Mr. Bingley, she could not make a very favourable answer. Jane was by no means better. The sisters, on hearing this, repeated three or four times how much they were grieved, how shocking it was to have a bad cold, and how excessively they disliked being ill themselves; and then thought no more of the matter: and their indifference towards Jane, when not immediately before them, restored Elizabeth to the enjoyment of all her original dislike.

Their brother, indeed, was the only one of the party whom she could regard with any complacency. His anxiety for Jane was evident, and his attentions to herself most pleasing; and they prevented her feeling herself so much an intruder as she believed she was considered by the others. She had very little notice from any but him. Miss Bingley was engrossed by Mr. Darcy, her sister scarcely less so; and as for Mr. Hurst, by whom Elizabeth sat, he was an indolent man, who lived only to eat, drink, and play at cards, who, when he found her prefer a plain dish to a ragout, had nothing to say to her.

When dinner was over, she returned directly to Jane, and Miss Bingley began abusing her as soon as she was out of the room. Her manners were pronounced to be very bad indeed,--a mixture of pride and impertinence: she had no conversation, no style, no taste, no beauty. Mrs. Hurst thought the same, and added,--

\u201CShe has nothing, in short, to recommend her, but being an excellent walker. I shall never forget her appearance this morning. She really looked almost wild.\u201D

\u201CShe did indeed, Louisa. I could hardly keep my countenance. Very nonsensical to come at all! Why must _she_ be scampering about the country, because her sister had a cold? Her hair so untidy, so blowzy!\u201D

\u201CYes, and her petticoat; I hope you saw her petticoat, six inches deep in mud, I am absolutely certain, and the gown which had been let down to hide it not doing its office.\u201D

\u201CYour picture may be very exact, Louisa,\u201D said Bingley; \u201Cbut this was all lost upon me. I thought Miss Elizabeth Bennet looked remarkably well when she came into the room this morning. Her dirty petticoat quite escaped my notice.\u201D

\u201C_You_ observed it, Mr. Darcy, I am sure,\u201D said Miss Bingley; \u201Cand I am inclined to think that you would not wish to see _your sister_ make such an exhibition.\u201D

\u201CTo walk three miles, or four miles, or five miles, or whatever it is, above her ancles in dirt, and alone, quite alone! what could she mean by it? It seems to me to show an abominable sort of conceited independence, a most country-town indifference to decorum.\u201D

\u201CIt shows an affection for her sister that is very pleasing,\u201D said Bingley.

\u201CI am afraid, Mr. Darcy,\u201D observed Miss Bingley, in a half whisper, \u201Cthat this adventure has rather affected your admiration of her fine eyes.\u201D

\u201CNot at all,\u201D he replied: \u201Cthey were brightened by the exercise.\u201D A short pause followed this speech, and Mrs. Hurst began again,--

\u201CI have an excessive regard for Jane Bennet,--she is really a very sweet girl,--and I wish with all my heart she were well settled. But with such a father and mother, and such low connections, I am afraid there is no chance of it.\u201D

\u201CI think I have heard you say that their uncle is an attorney in Meryton?\u201D

\u201CYes; and they have another, who lives somewhere near Cheapside.\u201D

\u201CThat is capital,\u201D added her sister; and they both laughed heartily.

\u201CIf they had uncles enough to fill _all_ Cheapside,\u201D cried Bingley, \u201Cit would not make them one jot less agreeable.\u201D

\u201CBut it must very materially lessen their chance of marrying men of any consideration in the world,\u201D replied Darcy.

To this speech Bingley made no answer; but his sisters gave it their hearty assent, and indulged their mirth for some time at the expense of their dear friend\u2019s vulgar relations.

With a renewal of tenderness, however, they repaired to her room on leaving the dining-parlour, and sat with her till summoned to coffee. She was still very poorly, and Elizabeth would not quit her at all, till late in the evening, when she had the comfort of seeing her asleep, and when it appeared to her rather right than pleasant that she should go down stairs herself. On entering the drawing-room, she found the whole party at loo, and was immediately invited to join them; but suspecting them to be playing high, she declined it, and making her sister the excuse, said she would amuse herself, for the short time she could stay below, with a book. Mr. Hurst looked at her with astonishment.

\u201CDo you prefer reading to cards?\u201D said he; \u201Cthat is rather singular.\u201D

\u201CMiss Eliza Bennet,\u201D said Miss Bingley, \u201Cdespises cards. She is a great reader, and has no pleasure in anything else.\u201D

\u201CI deserve neither such praise nor such censure,\u201D cried Elizabeth; \u201CI am _not_ a great reader, and I have pleasure in many things.\u201D

\u201CIn nursing your sister I am sure you have pleasure,\u201D said Bingley; \u201Cand I hope it will soon be increased by seeing her quite well.\u201D

Elizabeth thanked him from her heart, and then walked towards a table where a few books were lying. He immediately offered to fetch her others; all that his library afforded.

\u201CAnd I wish my collection were larger for your benefit and my own credit; but I am an idle fellow; and though I have not many, I have more than I ever looked into.\u201D

Elizabeth assured him that she could suit herself perfectly with those in the room.

\u201CI am astonished,\u201D said Miss Bingley, \u201Cthat my father should have left so small a collection of books. What a delightful library you have at Pemberley, Mr. Darcy!\u201D

\u201CIt ought to be good,\u201D he replied: \u201Cit has been the work of many generations.\u201D

\u201CAnd then you have added so much to it yourself--you are always buying books.\u201D

\u201CI cannot comprehend the neglect of a family library in such days as these.\u201D

\u201CNeglect! I am sure you neglect nothing that can add to the beauties of that noble place. Charles, when you build _your_ house, I wish it may be half as delightful as Pemberley.\u201D

\u201CBut I would really advise you to make your purchase in that neighbourhood, and take Pemberley for a kind of model. There is not a finer county in England than Derbyshire.\u201D

\u201CWith all my heart: I will buy Pemberley itself, if Darcy will sell it.\u201D

\u201CI am talking of possibilities, Charles.\u201D

\u201CUpon my word, Caroline, I should think it more possible to get Pemberley by purchase than by imitation.\u201D

Elizabeth was so much caught by what passed, as to leave her very little attention for her book; and, soon laying it wholly aside, she drew near the card-table, and stationed herself between Mr. Bingley and his eldest sister, to observe the game.

\u201CIs Miss Darcy much grown since the spring?\u201D said Miss Bingley: \u201Cwill she be as tall as I am?\u201D

\u201CI think she will. She is now about Miss Elizabeth Bennet\u2019s height, or rather taller.\u201D

\u201CHow I long to see her again! I never met with anybody who delighted me so much. Such a countenance, such manners, and so extremely accomplished for her age! Her performance on the pianoforte is exquisite.\u201D

\u201CIt is amazing to me,\u201D said Bingley, \u201Chow young ladies can have patience to be so very accomplished as they all are.\u201D

\u201CAll young ladies accomplished! My dear Charles, what do you mean?\u201D

\u201CYes, all of them, I think. They all paint tables, cover screens, and net purses. I scarcely know any one who cannot do all this; and I am sure I never heard a young lady spoken of for the first time, without being informed that she was very accomplished.\u201D

\u201CYour list of the common extent of accomplishments,\u201D said Darcy, \u201Chas too much truth. The word is applied to many a woman who deserves it no otherwise than by netting a purse or covering a screen; but I am very far from agreeing with you in your estimation of ladies in general. I cannot boast of knowing more than half-a-dozen in the whole range of my acquaintance that are really accomplished.\u201D

\u201CThen,\u201D observed Elizabeth, \u201Cyou must comprehend a great deal in your idea of an accomplished woman.\u201D

\u201CYes; I do comprehend a great deal in it.\u201D

\u201COh, certainly,\u201D cried his faithful assistant, \u201Cno one can be really esteemed accomplished who does not greatly surpass what is usually met with. A woman must have a thorough knowledge of music, singing, drawing, dancing, and the modern languages, to deserve the word; and, besides all this, she must possess a certain something in her air and manner of walking, the tone of her voice, her address and expressions, or the word will be but half deserved.\u201D

\u201CAll this she must possess,\u201D added Darcy; \u201Cand to all she must yet add something more substantial in the improvement of her mind by extensive reading.\u201D

\u201CI am no longer surprised at your knowing _only_ six accomplished women. I rather wonder now at your knowing _any_.\u201D

\u201CAre you so severe upon your own sex as to doubt the possibility of all this?\u201D

\u201C_I_ never saw such a woman. _I_ never saw such capacity, and taste, and application, and elegance, as you describe, united.\u201D.

At the present time, eminent breeders try by methodical selection, with a distinct object in view, to make a new strain or sub-breed, superior to anything of the kind in the country. But, for our purpose, a form of selection, which may be called unconscious, and which results from every one trying to possess and breed from the best individual animals, is more important. Thus, a man who intends keeping pointers naturally tries to get as good dogs as he can, and afterwards breeds from his own best dogs, but he has no wish or expectation of permanently altering the breed. Nevertheless we may infer that this process, continued during centuries, would improve and modify any breed, in the same way as Bakewell, Collins, &c., by this very same process, only carried on more methodically, did greatly modify, even during their lifetimes, the forms and qualities of their cattle. Slow and insensible changes of this kind could never be recognised unless actual measurements or careful drawings of the breeds in question have been made long ago, which may serve for comparison. In some cases, however, unchanged, or but little changed, individuals of the same breed exist in less civilised districts, where the breed has been less improved. There is reason to believe that King Charles\u2019 spaniel has been unconsciously modified to a large extent since the time of that monarch. Some highly competent authorities are convinced that the setter is directly derived from the spaniel, and has probably been slowly altered from it. It is known that the English pointer has been greatly changed within the last century, and in this case the change has, it is believed, been chiefly effected by crosses with the foxhound; but what concerns us is, that the change has been effected unconsciously and gradually, and yet so effectually that, though the old Spanish pointer certainly came from Spain, Mr. Borrow has not seen, as I am informed by him, any native dog in Spain like our pointer.

By a similar process of selection, and by careful training, English race-horses have come to surpass in fleetness and size the parent Arabs, so that the latter, by the regulations for the Goodwood Races, are favoured in the weights which they carry. Lord Spencer and others have shown how the cattle of England have increased in weight and in early maturity, compared with the stock formerly kept in this country. By comparing the accounts given in various old treatises of the former and present state of carrier and tumbler pigeons in Britain, India, and Persia, we can trace the stages through which they have insensibly passed, and come to differ so greatly from the rock-pigeon.

Youatt gives an excellent illustration of the effects of a course of selection which may be considered as unconscious, in so far that the breeders could never have expected, or even wished, to produce the result which ensued\u2014namely, the production of the distinct strains. The two flocks of Leicester sheep kept by Mr. Buckley and Mr. Burgess, as Mr. Youatt remarks, \u201CHave been purely bred from the original stock of Mr. Bakewell for upwards of fifty years. There is not a suspicion existing in the mind of any one at all acquainted with the subject that the owner of either of them has deviated in any one instance from the pure blood of Mr. Bakewell\u2019s flock, and yet the difference between the sheep possessed by these two gentlemen is so great that they have the appearance of being quite different varieties.\u201D

If there exist savages so barbarous as never to think of the inherited character of the offspring of their domestic animals, yet any one animal particularly useful to them, for any special purpose, would be carefully preserved during famines and other accidents, to which savages are so liable, and such choice animals would thus generally leave more offspring than the inferior ones; so that in this case there would be a kind of unconscious selection going on. We see the value set on animals even by the barbarians of Tierra del Fuego, by their killing and devouring their old women, in times of dearth, as of less value than their dogs.

In plants the same gradual process of improvement through the occasional preservation of the best individuals, whether or not sufficiently distinct to be ranked at their first appearance as distinct varieties, and whether or not two or more species or races have become blended together by crossing, may plainly be recognised in the increased size and beauty which we now see in the varieties of the heartsease, rose, pelargonium, dahlia, and other plants, when compared with the older varieties or with their parent-stocks. No one would ever expect to get a first-rate heartsease or dahlia from the seed of a wild plant. No one would expect to raise a first-rate melting pear from the seed of a wild pear, though he might succeed from a poor seedling growing wild, if it had come from a garden-stock. The pear, though cultivated in classical times, appears, from Pliny\u2019s description, to have been a fruit of very inferior quality. I have seen great surprise expressed in horticultural works at the wonderful skill of gardeners in having produced such splendid results from such poor materials; but the art has been simple, and, as far as the final result is concerned, has been followed almost unconsciously. It has consisted in always cultivating the best known variety, sowing its seeds, and, when a slightly better variety chanced to appear, selecting it, and so onwards. But the gardeners of the classical period, who cultivated the best pears which they could procure, never thought what splendid fruit we should eat; though we owe our excellent fruit in some small degree to their having naturally chosen and preserved the best varieties they could anywhere find.

A large amount of change, thus slowly and unconsciously accumulated, explains, as I believe, the well-known fact, that in a number of cases we cannot recognise, and therefore do not know, the wild parent-stocks of the plants which have been longest cultivated in our flower and kitchen gardens. If it has taken centuries or thousands of years to improve or modify most of our plants up to their present standard of usefulness to man, we can understand how it is that neither Australia, the Cape of Good Hope, nor any other region inhabited by quite uncivilised man, has afforded us a single plant worth culture. It is not that these countries, so rich in species, do not by a strange chance possess the aboriginal stocks of any useful plants, but that the native plants have not been improved by continued selection up to a standard of perfection comparable with that acquired by the plants in countries anciently civilised.

In regard to the domestic animals kept by uncivilised man, it should not be overlooked that they almost always have to struggle for their own food, at least during certain seasons.

About this time I met with an odd volume of the Spectator. It was the third. I had never before seen any of them. I bought it, read it over and over, and was much delighted with it. I thought the writing excellent, and wished, if possible, to imitate it. With this view I took some of the papers, and, making short hints of the sentiment in each sentence, laid them by a few days, and then, without looking at the book, try'd to compleat the papers again, by expressing each hinted sentiment at length, and as fully as it had been expressed before, in any suitable words that should come to hand. Then I compared my Spectator with the original, discovered some of my faults, and corrected them. But I found I wanted a stock of words, or a readiness in recollecting and using them, which I thought I should have acquired before that time if I had gone on making verses; since the continual occasion for words of the same import, but of different length, to suit the measure, or of different sound for the rhyme, would have laid me under a constant necessity of searching for variety, and also have tended to fix that variety in my mind, and make me master of it. Therefore I took some of the tales and turned them into verse; and, after a time, when I had pretty well forgotten the prose, turned them back again. I also sometimes jumbled my collections of hints into confusion, and after some weeks endeavored to reduce them into the best order, before I began to form the full sentences and compleat the paper. This was to teach me method in the arrangement of thoughts. By comparing my work afterwards with the original, I discovered many faults and amended them; but I sometimes had the pleasure of fancying that, in certain particulars of small import, I had been lucky enough to improve the method or the language, and this encouraged me to think I might possibly in time come to be a tolerable English writer, of which I was extremely ambitious. My time for these exercises and for reading was at night, after work or before it began in the morning, or on Sundays, when I contrived to be in the printing-house alone, evading as much as I could the common attendance on public worship which my father used to exact on me when I was under his care, and which indeed I still thought a duty, though I could not, as it seemed to me, afford time to practise it.

When about 16 years of age I happened to meet with a book, written by one Tryon, recommending a vegetable diet. I determined to go into it. My brother, being yet unmarried, did not keep house, but boarded himself and his apprentices in another family. My refusing to eat flesh occasioned an inconveniency, and I was frequently chid for my singularity. I made myself acquainted with Tryon's manner of preparing some of his dishes, such as boiling potatoes or rice, making hasty pudding, and a few others, and then proposed to my brother, that if he would give me, weekly, half the money he paid for my board, I would board myself. He instantly agreed to it, and I presently found that I could save half what he paid me. This was an additional fund for buying books. But I had another advantage in it. My brother and the rest going from the printing-house to their meals, I remained there alone, and, despatching presently my light repast, which often was no more than a bisket or a slice of bread, a handful of raisins or a tart from the pastry-cook's, and a glass of water, had the rest of the time till their return for study, in which I made the greater progress, from that greater clearness of head and quicker apprehension which usually attend temperance in eating and drinking.

And now it was that, being on some occasion made asham'd of my ignorance in figures, which I had twice failed in learning when at school, I took Cocker's book of Arithmetick, and went through the whole by myself with great ease. I also read Seller's and Shermy's books of Navigation, and became acquainted with the little geometry they contain; but never proceeded far in that science. And I read about this time Locke On Human Understanding, and the Art of Thinking, by Messrs. du Port Royal.

While I was intent on improving my language, I met with an English grammar (I think it was Greenwood's), at the end of which there were two little sketches of the arts of rhetoric and logic, the latter finishing with a specimen of a dispute in the Socratic method; and soon after I procur'd Xenophon's Memorable Things of Socrates, wherein there are many instances of the same method. I was charm'd with it, adopted it, dropt my abrupt contradiction and positive argumentation, and put on the humble inquirer and doubter. And being then, from reading Shaftesbury and Collins, become a real doubter in many points of our religious doctrine, I found this method safest for myself and very embarrassing to those against whom I used it; therefore I took a delight in it, practis'd it continually, and grew very artful and expert in drawing people, even of superior knowledge, into concessions, the consequences of which they did not foresee, entangling them in difficulties out of which they could not extricate themselves, and so obtaining victories that neither myself nor my cause always deserved. I continu'd this method some few years, but gradually left it, retaining only the habit of expressing myself in terms of modest diffidence; never using, when I advanced any thing that may possibly be disputed, the words certainly, undoubtedly, or any others that give the air of positiveness to an opinion; but rather say, I conceive or apprehend a thing to be so and so; it appears to me, or I should think it so or so, for such and such reasons; or I imagine it to be so; or it is so, if I am not mistaken. This habit, I believe, has been of great advantage to me when I have had occasion to inculcate my opinions, and persuade men into measures that I have been from time to time engag'd in promoting; and, as the chief ends of conversation are to inform or to be informed, to please or to persuade, I wish well-meaning, sensible men would not lessen their power of doing good by a positive, assuming manner, that seldom fails to disgust, tends to create opposition, and to defeat every one of those purposes for which speech was given to us, to wit, giving or receiving information or pleasure. For, if you would inform, a positive and dogmatical manner in advancing your sentiments may provoke contradiction and prevent a candid attention.

\u201COh, everything. Latitude and longitude, noon every day; and how many miles we made last twenty-four hours; and all the domino games I beat and horse billiards; and whales and sharks and porpoises; and the text of the sermon Sundays (because that'll tell at home, you know); and the ships we saluted and what nation they were; and which way the wind was, and whether there was a heavy sea, and what sail we carried, though we don't ever carry any, principally, going against a head wind always--wonder what is the reason of that?--and how many lies Moult has told--Oh, every thing! I've got everything down. My father told me to keep that journal. Father wouldn't take a thousand dollars for it when I get it done.\u201D

\u201CNo, Jack; it will be worth more than a thousand dollars--when you get it done.\u201D

\u201CDo you?--no, but do you think it will, though?

\u201CYes, it will be worth at least as much as a thousand dollars--when you get it done. May be more.\u201D

\u201CWell, I about half think so, myself. It ain't no slouch of a journal.\u201D

But it shortly became a most lamentable \u201Cslouch of a journal.\u201D One night in Paris, after a hard day's toil in sightseeing, I said:

\u201CNow I'll go and stroll around the cafes awhile, Jack, and give you a chance to write up your journal, old fellow.\u201D

\u201CWell, no, you needn't mind. I think I won't run that journal anymore. It is awful tedious. Do you know--I reckon I'm as much as four thousand pages behind hand. I haven't got any France in it at all. First I thought I'd leave France out and start fresh. But that wouldn't do, would it? The governor would say, 'Hello, here--didn't see anything in France? That cat wouldn't fight, you know. First I thought I'd copy France out of the guide-book, like old Badger in the for'rard cabin, who's writing a book, but there's more than three hundred pages of it. Oh, I don't think a journal's any use--do you? They're only a bother, ain't they?\u201D

\u201CYes, a journal that is incomplete isn't of much use, but a journal properly kept is worth a thousand dollars--when you've got it done.\u201D

\u201CA thousand!--well, I should think so. I wouldn't finish it for a million.\u201D

His experience was only the experience of the majority of that industrious night school in the cabin. If you wish to inflict a heartless and malignant punishment upon a young person, pledge him to keep a journal a year.

A good many expedients were resorted to to keep the excursionists amused and satisfied. A club was formed, of all the passengers, which met in the writing school after prayers and read aloud about the countries we were approaching and discussed the information so obtained.

Several times the photographer of the expedition brought out his transparent pictures and gave us a handsome magic-lantern exhibition. His views were nearly all of foreign scenes, but there were one or two home pictures among them. He advertised that he would \u201Copen his performance in the after cabin at 'two bells' (nine P.M.) and show the passengers where they shall eventually arrive\u201D--which was all very well, but by a funny accident the first picture that flamed out upon the canvas was a view of Greenwood Cemetery!

On several starlight nights we danced on the upper deck, under the awnings, and made something of a ball-room display of brilliancy by hanging a number of ship's lanterns to the stanchions. Our music consisted of the well-mixed strains of a melodeon which was a little asthmatic and apt to catch its breath where it ought to come out strong, a clarinet which was a little unreliable on the high keys and rather melancholy on the low ones, and a disreputable accordion that had a leak somewhere and breathed louder than it squawked--a more elegant term does not occur to me just now. However, the dancing was infinitely worse than the music. When the ship rolled to starboard the whole platoon of dancers came charging down to starboard with it, and brought up in mass at the rail; and when it rolled to port they went floundering down to port with the same unanimity of sentiment. Waltzers spun around precariously for a matter of fifteen seconds and then went scurrying down to the rail as if they meant to go overboard. The Virginia reel, as performed on board the __Quaker City__, had more genuine reel about it than any reel I ever saw before, and was as full of interest to the spectator as it was full of desperate chances and hairbreadth escapes to the participant. We gave up dancing, finally.

We celebrated a lady's birthday anniversary with toasts, speeches, a poem, and so forth. We also had a mock trial. No ship ever went to sea that hadn't a mock trial on board. The purser was accused of stealing an overcoat from stateroom No. 10. A judge was appointed; also clerks, a crier of the court, constables, sheriffs; counsel for the State and for the defendant; witnesses were subpoenaed, and a jury empaneled after much challenging. The witnesses were stupid and unreliable and contradictory, as witnesses always are. The counsel were eloquent, argumentative, and vindictively abusive of each other, as was characteristic and proper. The case was at last submitted and duly finished by the judge with an absurd decision and a ridiculous sentence.

The acting of charades was tried on several evenings by the young gentlemen and ladies, in the cabins, and proved the most distinguished success of all the amusement experiments.

An attempt was made to organize a debating club, but it was a failure. There was no oratorical talent in the ship.

We all enjoyed ourselves--I think I can safely say that, but it was in a rather quiet way. We very, very seldom played the piano; we played the flute and the clarinet together, and made good music, too, what there was of it, but we always played the same old tune; it was a very pretty tune --how well I remember it--I wonder when I shall ever get rid of it. We never played either the melodeon or the organ except at devotions--but I am too fast: young Albert did know part of a tune something about \u201CO Something-Or-Other How Sweet It Is to Know That He's His What's-his-Name\u201D (I do not remember the exact title of it, but it was very plaintive and full of sentiment); Albert played that pretty much all the time until we contracted with him to restrain himself. But nobody ever sang by moonlight on the upper deck, and the congregational singing at church and prayers was not of a superior order of architecture. I put up with it as long as I could and then joined in and tried to improve it, but this encouraged young George to join in too, and that made a failure of it; because George's voice was just \u201Cturning,\u201D and when he was singing a dismal sort of bass it was apt to fly off the handle and startle everybody with a most discordant cackle on the upper notes. George didn't know the tunes, either, which was also a drawback to his performances. I said:

\u201CCome, now, George, don't improvise. It looks too egotistical. It will provoke remark. Just stick to 'Coronation,' like the others. It is a good tune--you can't improve it any, just off-hand, in this way.\u201D

\u201CWhy, I'm not trying to improve it--and I am singing like the others --just as it is in the notes.\u201D

And he honestly thought he was, too; and so he had no one to blame but himself when his voice caught on the center occasionally and gave him the lockjaw.

In the trade to China and India, we interfere with more than one nation, inasmuch as it enables us to partake in advantages which they had in a manner monopolized, and as we thereby supply ourselves with commodities which we used to purchase from them.

The extension of our own commerce in our own vessels cannot give pleasure to any nations who possess territories on or near this continent, because the cheapness and excellence of our productions, added to the circumstance of vicinity, and the enterprise and address of our merchants and navigators, will give us a greater share in the advantages which those territories afford, than consists with the wishes or policy of their respective sovereigns.

Spain thinks it convenient to shut the Mississippi against us on the one side, and Britain excludes us from the Saint Lawrence on the other; nor will either of them permit the other waters which are between them and us to become the means of mutual intercourse and traffic.

From these and such like considerations, which might, if consistent with prudence, be more amplified and detailed, it is easy to see that jealousies and uneasinesses may gradually slide into the minds and cabinets of other nations, and that we are not to expect that they should regard our advancement in union, in power and consequence by land and by sea, with an eye of indifference and composure.

The people of America are aware that inducements to war may arise out of these circumstances, as well as from others not so obvious at present, and that whenever such inducements may find fit time and opportunity for operation, pretenses to color and justify them will not be wanting. Wisely, therefore, do they consider union and a good national government as necessary to put and keep them in SUCH A SITUATION as, instead of INVITING war, will tend to repress and discourage it. That situation consists in the best possible state of defense, and necessarily depends on the government, the arms, and the resources of the country.

As the safety of the whole is the interest of the whole, and cannot be provided for without government, either one or more or many, let us inquire whether one good government is not, relative to the object in question, more competent than any other given number whatever.

One government can collect and avail itself of the talents and experience of the ablest men, in whatever part of the Union they may be found. It can move on uniform principles of policy. It can harmonize, assimilate, and protect the several parts and members, and extend the benefit of its foresight and precautions to each. In the formation of treaties, it will regard the interest of the whole, and the particular interests of the parts as connected with that of the whole. It can apply the resources and power of the whole to the defense of any particular part, and that more easily and expeditiously than State governments or separate confederacies can possibly do, for want of concert and unity of system. It can place the militia under one plan of discipline, and, by putting their officers in a proper line of subordination to the Chief Magistrate, will, as it were, consolidate them into one corps, and thereby render them more efficient than if divided into thirteen or into three or four distinct independent companies.

What would the militia of Britain be if the English militia obeyed the government of England, if the Scotch militia obeyed the government of Scotland, and if the Welsh militia obeyed the government of Wales? Suppose an invasion; would those three governments (if they agreed at all) be able, with all their respective forces, to operate against the enemy so effectually as the single government of Great Britain would?

We have heard much of the fleets of Britain, and the time may come, if we are wise, when the fleets of America may engage attention. But if one national government, had not so regulated the navigation of Britain as to make it a nursery for seamen--if one national government had not called forth all the national means and materials for forming fleets, their prowess and their thunder would never have been celebrated. Let England have its navigation and fleet--let Scotland have its navigation and fleet--let Wales have its navigation and fleet--let Ireland have its navigation and fleet--let those four of the constituent parts of the British empire be under four independent governments, and it is easy to perceive how soon they would each dwindle into comparative insignificance.

Apply these facts to our own case. Leave America divided into thirteen or, if you please, into three or four independent governments--what armies could they raise and pay--what fleets could they ever hope to have? If one was attacked, would the others fly to its succor, and spend their blood and money in its defense? Would there be no danger of their being flattered into neutrality by its specious promises, or seduced by a too great fondness for peace to decline hazarding their tranquillity and present safety for the sake of neighbors, of whom perhaps they have been jealous, and whose importance they are content to see diminished? Although such conduct would not be wise, it would, nevertheless, be natural. The history of the states of Greece, and of other countries, abounds with such instances, and it is not improbable that what has so often happened would, under similar circumstances, happen again.

But admit that they might be willing to help the invaded State or confederacy. How, and when, and in what proportion shall aids of men and money be afforded? Who shall command the allied armies, and from which of them shall he receive his orders? Who shall settle the terms of peace, and in case of disputes what umpire shall decide between them and compel acquiescence? Various difficulties and inconveniences would be inseparable from such a situation; whereas one government, watching over the general and common interests, and combining and directing the powers and resources of the whole, would be free from all these embarrassments, and conduce far more to the safety of the people.

But whatever may be our situation, whether firmly united under one national government, or split into a number of confederacies, certain it is, that foreign nations will know and view it exactly as it is; and they will act toward us accordingly. If they see that our national government is efficient and well administered, our trade prudently regulated, our militia properly organized and disciplined, our resources and finances discreetly managed, our credit re-established, our people free, contented, and united, they will be much more disposed to cultivate our friendship than provoke our resentment. If, on the other hand, they find us either destitute of an effectual government (each State doing right or wrong, as to its rulers may seem convenient), or split into three or four independent and probably discordant republics or confederacies, one inclining to Britain, another to France, and a third to Spain, and perhaps played off against each other by the three, what a poor, pitiful figure will America make in their eyes! How liable would she become not only to their contempt but to their outrage, and how soon would dear-bought experience proclaim that when a people or family so divide, it never fails to be against themselves.

"The world was sad! the garden was a wild! And man the hermit sigh'd, till _woman_ smiled."

Let her prove herself, then, the happy companion of man, and able to take unto herself the praises of the pious prelate, Jeremy Taylor, who says,--"A good wife is Heaven's last best gift to man,--his angel and minister of graces innumerable,--his gem of many virtues,--his casket of jewels--her voice is sweet music--her smiles his brightest day;--her kiss, the guardian of his innocence;--her arms, the pale of his safety, the balm of his health, the balsam of his life;--her industry, his surest wealth;--her economy, his safest steward;--her lips, his faithful counsellors;--her bosom, the softest pillow of his cares; and her prayers, the ablest advocates of Heaven's blessings on his head."

Cherishing, then, in her breast the respected utterances of the good and the great, let the mistress of every house rise to the responsibility of its management; so that, in doing her duty to all around her, she may receive the genuine reward of respect, love, and affection!

Although the choice of a house must be dependent on so many different circumstances with different people, that to give any specific directions on this head would be impossible and useless; yet it will be advantageous, perhaps, to many, if we point out some of those general features as to locality, soil, aspect, &c., to which the attention of all house-takers should be carefully directed.

Regarding the locality, we may say, speaking now more particularly of a town house, that it is very important to the health and comfort of a family, that the neighbourhood of all factories of any kind, producing unwholesome effluvia or smells, should be strictly avoided. Neither is it well to take a house in the immediate vicinity of where a noisy trade is carried on, as it is unpleasant to the feelings, and tends to increase any existing irritation of the system.

Referring to soils; it is held as a rule, that a gravel soil is superior to any other, as the rain drains through it very quickly, and it is consequently drier and less damp than clay, upon which water rests a far longer time. A clay country, too, is not so pleasant for walking exercise as one in which gravel predominates.

The aspect of the house should be well considered, and it should be borne in mind that the more sunlight that comes into the house, the healthier is the habitation. The close, fetid smell which assails one on entering a narrow court, or street, in towns, is to be assigned to the want of light, and, consequently, air. A house with a south or south-west aspect, is lighter, warmer, drier, and consequently more healthy, than one facing the north or north-east.

Great advances have been made, during the last few years, in the principles of sanitary knowledge, and one most essential point to be observed in reference to a house, is its "drainage," as it has been proved in an endless number of cases, that bad or defective drainage is as certain to destroy health as the taking of poisons. This arises from its injuriously affecting the atmosphere; thus rendering the air we breathe unwholesome and deleterious. Let it be borne in mind, then, that unless a house is effectually drained, the health of its inhabitants is sure to suffer; and they will be susceptible of ague, rheumatism, diarrhoea, fevers, and cholera.

We now come to an all-important point,--that of the water supply. The value of this necessary article has also been lately more and more recognized in connection with the question of health and life; and most houses are well supplied with every convenience connected with water. Let it, however, be well understood, that no house, however suitable in other respects, can be desirable, if this grand means of health and comfort is, in the slightest degree, scarce or impure. No caution can be too great to see that it is pure and good, as well as plentiful; for, knowing, as we do, that not a single part of our daily food is prepared without it, the importance of its influence on the health of the inmates of a house cannot be over-rated.

Ventilation is another feature which must not be overlooked. In a general way, enough of air is admitted by the cracks round the doors and windows; but if this be not the case, the chimney will smoke; and other plans, such as the placing of a plate of finely-perforated zinc in the upper part of the window, must be used. Cold air should never be admitted under the doors, or at the bottom of a room, unless it be close to the fire or stove; for it will flow along the floor towards the fireplace, and thus leave the foul air in the upper part of the room, unpurified, cooling, at the same time, unpleasantly and injuriously, the feet and legs of the inmates.

The rent of a house, it has been said, should not exceed one-eighth of the whole income of its occupier; and, as a general rule, we are disposed to assent to this estimate, although there may be many circumstances which would not admit of its being considered infallible.

55. AS SECOND IN COMMAND IN THE HOUSE, except in large establishments, where there is a house steward, the housekeeper must consider herself as the immediate representative of her mistress, and bring, to the management of the household, all those qualities of honesty, industry, and vigilance, in the same degree as if she were at the head of her _own_ family. Constantly on the watch to detect any wrong-doing on the part of any of the domestics, she will overlook all that goes on in the house, and will see that every department is thoroughly attended to, and that the servants are comfortable, at the same time that their various duties are properly performed.

Cleanliness, punctuality, order, and method, are essentials in the character of a good housekeeper. Without the first, no household can be said to be well managed. The second is equally all-important; for those who are under the housekeeper will take their "cue" from her; and in the same proportion as punctuality governs her movements, so will it theirs. Order, again, is indispensable; for by it we wish to be understood that "there should be a place for everything, and everything in its place." Method, too, is most necessary; for when the work is properly contrived, and each part arranged in regular succession, it will be done more quickly and more effectually.

56. A NECESSARY QUALIFICATION FOR A HOUSEKEEPER is, that she should thoroughly understand accounts.

Common farmers seldom employ any overseer to direct the general operations of the farm. They generally, too, work a good deal with their own hands, as ploughmen, harrowers, etc. What remains of the crop, after paying the rent, therefore, should not only replace to them their stock employed in cultivation, together with its ordinary profits, but pay them the wages which are due to them, both as labourers and overseers. Whatever remains, however, after paying the rent and keeping up the stock, is called profit. But wages evidently make a part of it. The farmer, by saving these wages, must necessarily gain them. Wages, therefore, are in this case confounded with profit.

An independent manufacturer, who has stock enough both to purchase materials, and to maintain himself till he can carry his work to market, should gain both the wages of a journeyman who works under a master, and the profit which that master makes by the sale of that journeyman\u2019s work. His whole gains, however, are commonly called profit, and wages are, in this case, too, confounded with profit.

A gardener who cultivates his own garden with his own hands, unites in his own person the three different characters, of landlord, farmer, and labourer. His produce, therefore, should pay him the rent of the first, the profit of the second, and the wages of the third. The whole, however, is commonly considered as the earnings of his labour. Both rent and profit are, in this case, confounded with wages.

As in a civilized country there are but few commodities of which the exchangeable value arises from labour only, rent and profit contributing largely to that of the far greater part of them, so the annual produce of its labour will always be sufficient to purchase or command a much greater quantity of labour than what was employed in raising, preparing, and bringing that produce to market. If the society were annually to employ all the labour which it can annually purchase, as the quantity of labour would increase greatly every year, so the produce of every succeeding year would be of vastly greater value than that of the foregoing. But there is no country in which the whole annual produce is employed in maintaining the industrious. The idle everywhere consume a great part of it; and, according to the different proportions in which it is annually divided between those two different orders of people, its ordinary or average value must either annually increase or diminish, or continue the same from one year to another.

There is in every society or neighbourhood an ordinary or average rate, both of wages and profit, in every different employment of labour and stock. This rate is naturally regulated, as I shall shew hereafter, partly by the general circumstances of the society, their riches or poverty, their advancing, stationary, or declining condition, and partly by the particular nature of each employment.

There is likewise in every society or neighbourhood an ordinary or average rate of rent, which is regulated, too, as I shall shew hereafter, partly by the general circumstances of the society or neighbourhood in which the land is situated, and partly by the natural or improved fertility of the land.

These ordinary or average rates may be called the natural rates of wages, profit and rent, at the time and place in which they commonly prevail.

When the price of any commodity is neither more nor less than what is sufficient to pay the rent of the land, the wages of the labour, and the profits of the stock employed in raising, preparing, and bringing it to market, according to their natural rates, the commodity is then sold for what may be called its natural price.

The commodity is then sold precisely for what it is worth, or for what it really costs the person who brings it to market; for though, in common language, what is called the prime cost of any commodity does not comprehend the profit of the person who is to sell it again, yet, if he sells it at a price which does not allow him the ordinary rate of profit in his neighbourhood, he is evidently a loser by the trade; since, by employing his stock in some other way, he might have made that profit. His profit, besides, is his revenue, the proper fund of his subsistence. As, while he is preparing and bringing the goods to market, he advances to his workmen their wages, or their subsistence; so he advances to himself, in the same manner, his own subsistence, which is generally suitable to the profit which he may reasonably expect from the sale of his goods. Unless they yield him this profit, therefore, they do not repay him what they may very properly be said to have really cost him.

Though the price, therefore, which leaves him this profit, is not always the lowest at which a dealer may sometimes sell his goods, it is the lowest at which he is likely to sell them for any considerable time; at least where there is perfect liberty, or where he may change his trade as often as he pleases.

The actual price at which any commodity is commonly sold, is called its market price. It may either be above, or below, or exactly the same with its natural price.

The market price of every particular commodity is regulated by the proportion between the quantity which is actually brought to market, and the demand of those who are willing to pay the natural price of the commodity, or the whole value of the rent, labour, and profit, which must be paid in order to bring it thither. Such people may be called the effectual demanders, and their demand the effectual demand; since it maybe sufficient to effectuate the bringing of the commodity to market. It is different from the absolute demand. A very poor man may be said, in some sense, to have a demand for a coach and six; he might like to have it; but his demand is not an effectual demand, as the commodity can never be brought to market in order to satisfy it.

When the quantity of any commodity which is brought to market falls short of the effectual demand, all those who are willing to pay the whole value of the rent, wages, and profit, which must be paid in order to bring it thither, cannot be supplied with the quantity which they want. Rather than want it altogether, some of them will be willing to give more. A competition will immediately begin among them, and the market price will rise more or less above the natural price, according as either the greatness of the deficiency, or the wealth and wanton luxury of the competitors, happen to animate more or less the eagerness of the competition.`;

// src/patterns/en-signals-v4.ts
var T = V4_THRESHOLDS;
function countWords2(text) {
  return (text.match(/\S+/g) ?? []).length;
}
function countMatches(re, text) {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let n = 0;
  while (g.exec(text) !== null) {
    n += 1;
    if (g.lastIndex === 0) break;
  }
  return n;
}
function paragraphSentences(paraText) {
  return paraText.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
}
var NUMERIC_RE = /[£$€]?\d|\d%/;
var MID_CAP_RE = /(?<=[a-z][,;]?\s)[A-Z][a-z]{2,}/;
function isAbstractShort(sentence) {
  if (NUMERIC_RE.test(sentence)) return false;
  if (MID_CAP_RE.test(sentence)) return false;
  return ABSTRACT_PUNCH_RE.test(sentence);
}
function spectralFlatness(sentenceWordCounts) {
  const W = T.spectralWindowSentences;
  const windows = Math.floor(sentenceWordCounts.length / W);
  if (windows < T.spectralMinWindows) return null;
  const EPS = 1e-9;
  let sum = 0;
  for (let w = 0; w < windows; w += 1) {
    const seg = sentenceWordCounts.slice(w * W, (w + 1) * W);
    const mean = seg.reduce((a, b) => a + b, 0) / W;
    const x = seg.map((v) => v - mean);
    let logSum = 0;
    let linSum = 0;
    const bins = Math.floor(W / 2);
    for (let k = 1; k <= bins; k += 1) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < W; n += 1) {
        const ang = 2 * Math.PI * k * n / W;
        re += x[n] * Math.cos(ang);
        im -= x[n] * Math.sin(ang);
      }
      const p = re * re + im * im + EPS;
      logSum += Math.log(p);
      linSum += p;
    }
    const flat = Math.exp(logSum / bins) / (linSum / bins);
    sum += flat;
  }
  return sum / windows;
}
var HASH_SPAN = 4;
function hashAt(s, i) {
  return ((s.charCodeAt(i) * 131 + s.charCodeAt(i + 1)) * 131 + s.charCodeAt(i + 2)) * 131 + s.charCodeAt(i + 3) >>> 0;
}
var MAX_CHAIN = 32;
var MAX_MATCH = 258;
function indexInto(index, s, from, to) {
  for (let i = from; i <= to - HASH_SPAN; i += 1) {
    const h = hashAt(s, i);
    let chain = index.get(h);
    if (!chain) {
      chain = [];
      index.set(h, chain);
    }
    chain.push(i);
    if (chain.length > MAX_CHAIN * 2) chain.splice(0, chain.length - MAX_CHAIN);
  }
}
var corpusIndex = null;
function getCorpusIndex() {
  if (corpusIndex === null) {
    corpusIndex = /* @__PURE__ */ new Map();
    indexInto(corpusIndex, REFERENCE_CORPUS, 0, REFERENCE_CORPUS.length);
  }
  return corpusIndex;
}
function lzCostBits(target, withCorpusPrior) {
  const dict = withCorpusPrior ? REFERENCE_CORPUS : "";
  const combined = withCorpusPrior ? dict + target : target;
  const base = dict.length;
  const selfIndex = /* @__PURE__ */ new Map();
  const dictIndex = withCorpusPrior ? getCorpusIndex() : null;
  let bits = 0;
  let i = base;
  while (i < combined.length) {
    let bestLen = 0;
    let bestDist = 0;
    if (i + HASH_SPAN <= combined.length) {
      const h = hashAt(combined, i);
      const tryChain = (chain, offset) => {
        if (!chain) return;
        const start = Math.max(0, chain.length - MAX_CHAIN);
        for (let c = chain.length - 1; c >= start; c -= 1) {
          const j = chain[c] + offset;
          if (j >= i) continue;
          let len = 0;
          const maxLen = Math.min(MAX_MATCH, combined.length - i);
          while (len < maxLen && combined.charCodeAt(j + len) === combined.charCodeAt(i + len)) len += 1;
          if (len > bestLen) {
            bestLen = len;
            bestDist = i - j;
          }
        }
      };
      tryChain(selfIndex.get(h), base);
      if (dictIndex) tryChain(dictIndex.get(h), 0);
    }
    if (bestLen >= HASH_SPAN) {
      bits += 13 + Math.log2(bestDist);
      for (let k = i; k < i + bestLen && k + HASH_SPAN <= combined.length; k += 2) {
        const h2 = hashAt(combined, k);
        let chain = selfIndex.get(h2);
        if (!chain) {
          chain = [];
          selfIndex.set(h2, chain);
        }
        chain.push(k - base);
        if (chain.length > MAX_CHAIN * 2) chain.splice(0, chain.length - MAX_CHAIN);
      }
      i += bestLen;
    } else {
      bits += 9;
      if (i + HASH_SPAN <= combined.length) {
        const h2 = hashAt(combined, i);
        let chain = selfIndex.get(h2);
        if (!chain) {
          chain = [];
          selfIndex.set(h2, chain);
        }
        chain.push(i - base);
        if (chain.length > MAX_CHAIN * 2) chain.splice(0, chain.length - MAX_CHAIN);
      }
      i += 1;
    }
  }
  return bits;
}
function compressionGain(text) {
  const solo = lzCostBits(text, false);
  if (solo <= 0) return 0;
  const cond = lzCostBits(text, true);
  return 1 - cond / solo;
}
function registerProfile(text) {
  const tokens2 = text.toLowerCase().match(/[a-z][a-z'’-]*/g) ?? [];
  const counts = /* @__PURE__ */ new Map();
  let long = 0;
  for (const t of tokens2) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
    if (t.length >= REGISTER_LONG_WORD_LEN) long += 1;
  }
  const n = Math.max(1, tokens2.length);
  return {
    func: REGISTER_FUNCTION_WORDS.map((w) => (counts.get(w) ?? 0) / n),
    longWordShare: long / n,
    tokenCount: tokens2.length
  };
}
var refProfile = null;
function referenceRegisterProfile() {
  if (refProfile === null) refProfile = registerProfile(REFERENCE_CORPUS);
  return refProfile;
}
function registerDistance(text) {
  const p = registerProfile(text);
  const r = referenceRegisterProfile();
  let l1 = 0;
  for (let i = 0; i < p.func.length; i += 1) l1 += Math.abs(p.func[i] - r.func[i]);
  return { funcL1: l1, longWordDelta: p.longWordShare - r.longWordShare };
}
function collectMetrics(doc) {
  const { text, wordCount, paragraphs } = doc;
  const allSentences = [];
  for (const p of paragraphs) allSentences.push(...paragraphSentences(p.text));
  const counts = allSentences.map(countWords2).filter((c) => c > 0);
  const flat = spectralFlatness(counts);
  const gain = wordCount >= T.compressionMinWords && wordCount <= T.compressionMaxWords ? compressionGain(text) : null;
  const reg = registerDistance(text);
  let punchCount = 0;
  let punchFinal = 0;
  for (const p of paragraphs) {
    const sents = paragraphSentences(p.text);
    for (let i = 0; i < sents.length; i += 1) {
      const s = sents[i];
      const wc = countWords2(s);
      if (wc > 0 && wc <= 8 && /[.!?]$/.test(s) && isAbstractShort(s)) {
        punchCount += 1;
        if (i === sents.length - 1) punchFinal += 1;
      }
    }
  }
  const punchRate = allSentences.length > 0 ? punchCount / allSentences.length : 0;
  let micDrops = 0;
  for (const p of paragraphs) {
    const sents = paragraphSentences(p.text);
    if (sents.length < 4) continue;
    const closer = sents[sents.length - 1];
    const closerWc = countWords2(closer);
    const setupWcs = sents.slice(0, -1).map(countWords2).filter((c) => c >= 12);
    if (setupWcs.length < 3) continue;
    const setupMean = setupWcs.reduce((a, b) => a + b, 0) / setupWcs.length;
    if (closerWc > 0 && closerWc <= 8 && closerWc <= 0.45 * setupMean && !NUMERIC_RE.test(closer) && !MID_CAP_RE.test(closer) && MIC_DROP_CONTRAST_RE.test(closer)) {
      micDrops += 1;
    }
  }
  let contrastCount = 0;
  for (const re of NOT_JUST_CONTRAST) contrastCount += countMatches(re, text);
  contrastCount += countMatches(NEG_PARALLELISM_RE, text);
  for (const re of CONTRAST_VARIANT_RES) contrastCount += countMatches(re, text);
  const contrastPer1000 = wordCount > 0 ? contrastCount / (wordCount / 1e3) : 0;
  let abstract = 0;
  let concrete = 0;
  for (const s of allSentences) {
    const isConcrete = NUMERIC_RE.test(s) || MID_CAP_RE.test(s) || CONCRETE_ACTION_VERB_RE.test(s);
    if (isConcrete) {
      concrete += 1;
    } else if (ABSTRACT_CLAIM_RE.test(s) || countWords2(s) <= 8) {
      abstract += 1;
    }
  }
  const share = allSentences.length > 0 ? abstract / allSentences.length : 0;
  return {
    wordCount,
    sentenceCount: allSentences.length,
    spectralFlatness: flat,
    compressionGain: gain,
    registerFuncL1: reg.funcL1,
    registerLongWordDelta: reg.longWordDelta,
    punchlineCount: punchCount,
    punchlineRate: punchRate,
    punchlineParagraphFinal: punchFinal,
    micDropParagraphs: micDrops,
    contrastCount,
    contrastPer1000,
    ratioSentences: allSentences.length,
    ratioAbstract: abstract,
    ratioConcrete: concrete,
    ratioAbstractShare: share
  };
}
var round = (v, dp = 3) => Math.round(v * 10 ** dp) / 10 ** dp;
function collectV4Issues(ctx) {
  const m = collectMetrics(ctx);
  const { pushEx } = ctx;
  if (m.spectralFlatness !== null && m.spectralFlatness < T.spectralFlatnessMax) {
    pushEx(
      "sentence-length-spectral-flatness",
      `window-averaged spectral flatness ${round(m.spectralFlatness)} (threshold ${T.spectralFlatnessMax})`,
      null,
      null,
      {
        extra: {
          spectral_flatness: round(m.spectralFlatness),
          window_sentences: T.spectralWindowSentences,
          sentence_count: m.sentenceCount
        }
      }
    );
  }
  if (m.compressionGain !== null && m.compressionGain < T.compressionGainMin) {
    pushEx(
      "conditional-compression",
      `human-prior compression gain ${round(m.compressionGain)} (threshold ${T.compressionGainMin})`,
      null,
      null,
      {
        extra: { compression_gain: round(m.compressionGain), reference_corpus: "en-signals-v4-corpus 2026.08.5 (public-domain, pre-1929)" }
      }
    );
  }
  if (m.wordCount >= T.registerMinWords && m.registerFuncL1 > T.registerFuncL1Min && m.registerLongWordDelta > T.registerLongWordDeltaMin) {
    pushEx(
      "lexical-register-distance",
      `function-word L1 ${round(m.registerFuncL1)} + long-word share +${round(m.registerLongWordDelta)} vs human reference`,
      null,
      null,
      {
        extra: {
          function_word_l1: round(m.registerFuncL1),
          long_word_share_delta: round(m.registerLongWordDelta),
          genre_caveat: "specialised genres legitimately measure as distant; corroboration only"
        }
      }
    );
  }
  if (m.punchlineCount >= T.punchlineMinCount && m.punchlineRate >= T.punchlineMinRate && m.punchlineParagraphFinal >= T.punchlineMinParagraphFinal) {
    pushEx(
      "punchline-fragment-density",
      `${m.punchlineCount} abstract punchline fragments in ${m.sentenceCount} sentences (${m.punchlineParagraphFinal} paragraph-final)`,
      null,
      null,
      {
        count: m.punchlineCount,
        extra: { punchline_rate: round(m.punchlineRate), paragraph_final: m.punchlineParagraphFinal }
      }
    );
  }
  if (m.micDropParagraphs >= T.micDropMinParagraphs) {
    pushEx(
      "mic-drop-paragraph",
      `${m.micDropParagraphs} paragraphs end in a short abstract contrast closer`,
      null,
      null,
      { count: m.micDropParagraphs }
    );
  }
  if (m.contrastCount >= T.contrastMinCount && m.contrastPer1000 >= T.contrastMinPer1000) {
    pushEx(
      "contrast-density",
      `${m.contrastCount} contrast constructions (${round(m.contrastPer1000, 1)}/1000 words)`,
      null,
      null,
      {
        count: m.contrastCount,
        extra: { rate_per_1000_words: round(m.contrastPer1000, 1) }
      }
    );
  }
  if (m.ratioSentences >= T.ratioMinSentences && m.ratioAbstract >= T.ratioMinAbstract && m.ratioAbstractShare >= T.ratioMinShare && m.ratioConcrete <= T.ratioMaxConcrete) {
    pushEx(
      "rhetorical-procedural-ratio",
      `${m.ratioAbstract} abstract-claim vs ${m.ratioConcrete} concrete-action sentences of ${m.ratioSentences}`,
      null,
      null,
      {
        count: m.ratioAbstract,
        extra: {
          abstract_sentences: m.ratioAbstract,
          concrete_sentences: m.ratioConcrete,
          abstract_share: round(m.ratioAbstractShare)
        }
      }
    );
  }
}

// src/patterns/en-signals-v2.ts
var EN_SIGNALS_PATTERN_VERSION = "en-signals:2026.08.6";
var MERGED_WEIGHTS = { ...ISSUE_WEIGHTS, ...V3_ISSUE_WEIGHTS, ...V4_ISSUE_WEIGHTS };
var MERGED_META = { ...CATEGORY_META, ...V3_CATEGORY_META, ...V4_CATEGORY_META };
var MAX_SCORED_WORDS = 1e4;
var DESCRIPTION = "Editorial writing-signals score from documented writing-pattern rules and stylometric measurements. It is stylistic evidence about how the text reads, not proof of who or what wrote it.";
var ZERO_WIDTH = /[\u200B\u200C\u200D\uFEFF\u2060]/;
var CYRILLIC_GREEK = /[Ѐ-ӿͰ-Ͽ]/;
function normalise(original) {
  const flags = { zeroWidth: 0, homoglyph: 0, roleplay: 0 };
  let firstStrippedAt = -1;
  let chars = [];
  let map = [];
  for (let i = 0; i < original.length; i += 1) {
    const ch = original[i];
    if (ZERO_WIDTH.test(ch)) {
      flags.zeroWidth += 1;
      if (firstStrippedAt < 0) firstStrippedAt = i;
      continue;
    }
    if (CYRILLIC_GREEK.test(ch)) {
      const swap = CYRILLIC_LOOKALIKES[ch] ?? GREEK_LOOKALIKES[ch];
      if (swap !== void 0) {
        flags.homoglyph += 1;
        if (firstStrippedAt < 0) firstStrippedAt = i;
        chars.push(swap);
        map.push(i);
        continue;
      }
    }
    chars.push(ch);
    map.push(i);
  }
  const joined = chars.join("");
  const roleplayRe = /(?<!\*)\*([^*\n]{1,80}?)\*(?!\*)/gu;
  const removals = [];
  let m;
  while ((m = roleplayRe.exec(joined)) !== null) {
    if (ROLEPLAY_VERBS.test(m[1])) {
      flags.roleplay += 1;
      removals.push([m.index, m.index + m[0].length]);
    }
  }
  if (removals.length > 0) {
    const keptChars = [];
    const keptMap = [];
    let r = 0;
    for (let i = 0; i < joined.length; i += 1) {
      while (r < removals.length && i >= removals[r][1]) r += 1;
      if (r < removals.length && i >= removals[r][0] && i < removals[r][1]) continue;
      keptChars.push(joined[i]);
      keptMap.push(map[i]);
    }
    chars = keptChars;
    map = keptMap;
  }
  return { text: chars.join(""), map, flags, firstStrippedAt };
}
function countWords3(text) {
  return (text.match(/\S+/g) ?? []).length;
}
function tokenizeWithIndex(text) {
  const out = [];
  const re = /[\w'-]+/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push({ token: m[0].toLowerCase(), index: m.index });
  return out;
}
function paragraphsWithOffsets(text) {
  const parts = [];
  const re = /\n\s*\n/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    parts.push({ text: text.slice(last, m.index), start: last });
    last = m.index + m[0].length;
  }
  parts.push({ text: text.slice(last), start: last });
  return parts.filter((p) => p.text.trim().length > 0);
}
function getSentences(text) {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
}
function execAll2(pattern, text) {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push(m);
    if (m[0].length === 0) re.lastIndex += 1;
  }
  return out;
}
function fenceRanges(text) {
  const re = /^[ \t]{0,3}(`{3,}|~{3,})([^\n]*)$/gm;
  const ranges = [];
  let open = null;
  let m;
  while ((m = re.exec(text)) !== null) {
    const marker = m[1];
    if (!open) {
      open = { char: marker[0], len: marker.length, start: m.index };
    } else if (marker[0] === open.char && marker.length >= open.len && /^[ \t]*\r?$/.test(m[2])) {
      ranges.push([open.start, m.index + m[0].length]);
      open = null;
    }
  }
  if (open) ranges.push([open.start, text.length]);
  return ranges;
}
function inFenceRange(ranges, index) {
  return ranges.some(([a, b]) => index >= a && index < b);
}
function maskCode(text) {
  const chars = text.split("");
  const blank = (a, b) => {
    for (let i = a; i < b && i < chars.length; i += 1) if (chars[i] !== "\n") chars[i] = " ";
  };
  for (const [a, b] of fenceRanges(text)) blank(a, b);
  const withoutFences = chars.join("");
  const inlineRe = /(`+)(?:(?!\1)[^\n])+\1/g;
  let m;
  while ((m = inlineRe.exec(withoutFences)) !== null) blank(m.index, m.index + m[0].length);
  return chars.join("");
}
var HEX_COLOUR = /^(?=[0-9a-f]*\d)(?:[0-9a-f]{6}|[0-9a-f]{8})$/i;
var CPP_DIRECTIVE = /^(?:include|define|undef|if|ifdef|ifndef|elif|else|endif|pragma|error|warning|line)$/;
function isSocialTag(tag) {
  return !/^\d+$/.test(tag) && !HEX_COLOUR.test(tag) && !CPP_DIRECTIVE.test(tag);
}
var byLengthDesc = (a, b) => b.length - a.length || a.localeCompare(b);
var TIER1_WORD_RE = new RegExp("\\b(?:" + Object.keys(TIER1).sort(byLengthDesc).join("|") + ")\\b", "gi");
var TIER2_WORD_RE = new RegExp("\\b(?:" + Object.keys(TIER2).sort(byLengthDesc).join("|") + ")\\b", "gi");
var TIER3_LOOKUP = /* @__PURE__ */ new Map();
for (const word of TIER3) {
  TIER3_LOOKUP.set(word, word);
  const dashless = word.replace(/-/g, "");
  if (dashless !== word) TIER3_LOOKUP.set(dashless, word);
}
function analyse(original) {
  const norm = normalise(original);
  const text = norm.text;
  const map = norm.map;
  const span = (nStart, nEnd) => {
    if (nEnd <= nStart || nStart >= map.length) return [null, null];
    const last = Math.min(nEnd, map.length) - 1;
    return [map[nStart], map[last] + 1];
  };
  const issues = [];
  const push = (category, key, nStart, nEnd, suggestion, count) => {
    let s = null;
    let e = null;
    if (nStart !== null && nEnd !== null) [s, e] = span(nStart, nEnd);
    issues.push({ category, key, start: s, end: e, ...suggestion !== void 0 ? { suggestion } : {}, ...count !== void 0 ? { count } : {} });
  };
  const pushEx = (category, key, nStart, nEnd, opts = {}) => {
    let s = null;
    let e = null;
    if (nStart !== null && nEnd !== null) [s, e] = span(nStart, nEnd);
    issues.push({
      category,
      key,
      start: s,
      end: e,
      ...opts.suggestion !== void 0 ? { suggestion: opts.suggestion } : {},
      ...opts.count !== void 0 ? { count: opts.count } : {},
      ...opts.extra !== void 0 ? { extra: opts.extra } : {},
      ...opts.severityOverride !== void 0 ? { severityOverride: opts.severityOverride } : {}
    });
  };
  const pushPatterns = (patterns, category) => {
    const added = [];
    for (const pattern of patterns) {
      for (const m of execAll2(pattern, text)) {
        push(category, m[0], m.index, m.index + m[0].length);
        added.push(issues[issues.length - 1]);
      }
    }
    return added;
  };
  const wordCount = countWords3(text);
  const tokens2 = tokenizeWithIndex(text);
  const paragraphs = paragraphsWithOffsets(text);
  const sentences = getSentences(text);
  if (wordCount < 10) {
    return { issues: [], wordCount, tier2Clusters: 0, tier1Distinct: 0, normFlags: norm.flags };
  }
  const tier1Found = /* @__PURE__ */ new Set();
  for (const m of execAll2(TIER1_WORD_RE, text)) {
    const lower = m[0].toLowerCase();
    if (tier1Found.has(lower)) continue;
    tier1Found.add(lower);
    push("tier1", lower, m.index, m.index + m[0].length, TIER1[lower]);
  }
  for (const phrase of TIER1_PHRASES) {
    for (const m of execAll2(phrase.pattern, text)) {
      const lower = m[0].toLowerCase();
      if (tier1Found.has(lower)) continue;
      tier1Found.add(lower);
      push(phrase.clarity ? "tier1-clarity" : "tier1", lower, m.index, m.index + m[0].length, phrase.replace);
    }
  }
  let tier2Clusters = 0;
  for (const para of paragraphs) {
    const found = /* @__PURE__ */ new Map();
    for (const m of execAll2(TIER2_WORD_RE, para.text)) {
      const lower = m[0].toLowerCase();
      if (!found.has(lower)) found.set(lower, { index: para.start + m.index, suggestion: TIER2[lower] ?? "" });
    }
    for (const cond of TIER2_CONDITIONAL) {
      if (found.has(cond.word)) continue;
      const m = new RegExp(cond.pattern.source, cond.pattern.flags).exec(para.text);
      if (m) found.set(cond.word, { index: para.start + m.index, suggestion: cond.suggestion });
    }
    if (found.size >= 2) {
      tier2Clusters += 1;
      for (const [word, at] of found) push("tier2", word, at.index, at.index + word.length, at.suggestion);
    }
  }
  const tier3Counts = /* @__PURE__ */ new Map();
  for (const t of tokens2) {
    const canonical2 = TIER3_LOOKUP.get(t.token);
    if (!canonical2) continue;
    const entry = tier3Counts.get(canonical2);
    if (entry) entry.count += 1;
    else tier3Counts.set(canonical2, { count: 1, first: t.index, firstLen: t.token.length });
  }
  const densityThreshold = Math.max(3, Math.floor(wordCount * 0.03));
  for (const [word, entry] of tier3Counts) {
    if (entry.count >= densityThreshold) {
      push(
        "tier3",
        `"${word}" x${entry.count}`,
        entry.first,
        entry.first + entry.firstLen,
        `Used ${entry.count} times in ${wordCount} words; vary the wording.`,
        entry.count
      );
    }
  }
  pushPatterns(TRANSITIONS, "transition");
  pushPatterns(CHATBOT_ARTIFACTS, "chatbot");
  pushPatterns(SYCOPHANTIC, "sycophantic");
  pushPatterns(FILLERS, "filler");
  pushPatterns(GENERIC_CONCLUSIONS, "generic-conclusion");
  pushPatterns(LETS_PATTERNS, "lets-construction");
  pushPatterns(REASONING_ARTIFACTS, "reasoning-artifact");
  pushPatterns(ACKNOWLEDGMENT_LOOPS, "acknowledgment-loop");
  pushPatterns(SIGNIFICANCE_INFLATION, "significance-inflation");
  pushPatterns(VAGUE_ATTRIBUTIONS, "vague-attribution");
  pushPatterns(HOLLOW_INTENSIFIERS, "hollow-intensifier");
  pushPatterns(EMOTIONAL_FLATLINE, "emotional-flatline");
  pushPatterns(LINGERING_ATTENTION, "lingering-attention");
  pushPatterns(NOVELTY_INFLATION, "novelty-inflation");
  pushPatterns(CUTOFF_DISCLAIMERS, "cutoff-disclaimer");
  pushPatterns(AI_PLACEHOLDERS, "ai-placeholder");
  pushPatterns(AI_CITATION_MARKUP, "ai-citation-markup");
  pushPatterns(AI_UTM_SOURCE, "ai-utm-source");
  pushPatterns(TEMPLATE_PHRASES, "template-phrase");
  pushPatterns(FALSE_CONCESSION, "false-concession");
  pushPatterns(RHETORICAL_QUESTIONS, "rhetorical-question");
  pushPatterns(HEDGE_STACK, "hedge-stack");
  pushPatterns(FUTURE_NARRATIVE, "future-narrative");
  pushPatterns(REAL_ACTUAL_INFLATION, "real-actual-inflation");
  pushPatterns(SOCIAL_CTA_CLOSER, "social-cta-closer");
  pushPatterns(NOT_JUST_CONTRAST, "not-just-contrast");
  pushPatterns(FORMULAIC_OPENERS, "formulaic-opener");
  pushPatterns(SPECULATIVE_OPENERS, "speculative-opener");
  pushPatterns(PARENTHETICAL_HEDGE, "parenthetical-hedge");
  {
    const hits = execAll2(TITLE_CASE_HEADER, text).filter((m) => {
      const title = m[0].replace(MD_HEADING_PREFIX, "");
      const parts = title.trim().split(/\s+/);
      if (parts.length < 4) return false;
      return FUNCTION_WORD_IN_TITLE.test(parts.slice(1).join(" "));
    });
    const fences = hits.length ? fenceRanges(text) : [];
    for (const m of hits) {
      if (!inFenceRange(fences, m.index)) push("title-case-header", m[0], m.index, m.index + m[0].length);
    }
  }
  if (norm.flags.zeroWidth > 0 || norm.flags.homoglyph >= 2) {
    const at = norm.firstStrippedAt;
    issues.push({
      category: "normalization-flag",
      key: `${norm.flags.zeroWidth} zero-width + ${norm.flags.homoglyph} homoglyph swaps`,
      start: at >= 0 ? at : null,
      end: at >= 0 ? at + 1 : null,
      count: norm.flags.zeroWidth + norm.flags.homoglyph
    });
  }
  if (norm.flags.roleplay >= 2) {
    issues.push({
      category: "normalization-flag",
      key: `${norm.flags.roleplay} roleplay-action markers stripped`,
      start: null,
      end: null,
      count: norm.flags.roleplay
    });
  }
  {
    const hasCurly = /[“”‘’]/.test(text);
    const totalEmDashes = (text.match(/—/g) ?? []).length;
    const separatorEmDashes = (text.match(SEPARATOR_DASH_RE) ?? []).length + (text.match(VERSION_HEADING_DASH_RE) ?? []).length;
    const hasEmDash = totalEmDashes > separatorEmDashes;
    const hasOxford = (text.match(/\b\w+,\s+\w+,\s+and\s+\w+/g)?.length ?? 0) >= 1;
    const doubleSpaces = (text.match(/[^.!?]  +/g) ?? []).length;
    const missingApos = /\b(?:dont|wont|cant|isnt|wasnt|shouldnt|wouldnt|couldnt|youre|theyre|its\s+a\s+\w+ing)\b/i.test(text);
    const clean = doubleSpaces === 0 && !missingApos;
    const signals = [hasCurly, hasEmDash, hasOxford, clean].filter(Boolean).length;
    if (signals >= 4 && wordCount >= 80) {
      const first = text.search(/[“”‘’—]/);
      push(
        "smart-punct-signature",
        "curly quotes + em dash + Oxford comma + zero typos",
        first >= 0 ? first : null,
        first >= 0 ? first + 1 : null
      );
    }
  }
  if (paragraphs.length >= 4) {
    const densities = paragraphs.map((p) => {
      const words = (p.text.match(/\S+/g) ?? []).length;
      if (words < 5) return null;
      return (p.text.match(/[,;:—()]/g) ?? []).length / words;
    }).filter((d) => d !== null);
    if (densities.length >= 4) {
      const mean = densities.reduce((a, b) => a + b, 0) / densities.length;
      const variance = densities.reduce((s, d) => s + (d - mean) ** 2, 0) / densities.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
      if (cv < 0.25 && mean >= 0.04) {
        push("punct-distribution", `Punctuation density uniform across paragraphs (CV=${cv.toFixed(2)})`, null, null);
      }
    }
  }
  if (wordCount >= 150) {
    const mapped = tokens2.map((t) => FUNC_WORDS.has(t.token) ? t.token : "_");
    const seq = mapped.filter((v, i, arr) => v !== "_" || i > 0 && arr[i - 1] !== "_");
    if (seq.length >= 50) {
      const trigrams = /* @__PURE__ */ new Map();
      for (let i = 0; i < seq.length - 2; i += 1) {
        const tg = `${seq[i]}|${seq[i + 1]}|${seq[i + 2]}`;
        trigrams.set(tg, (trigrams.get(tg) ?? 0) + 1);
      }
      const total = seq.length - 2;
      let entropy = 0;
      for (const c of trigrams.values()) {
        const p = c / total;
        entropy -= p * Math.log2(p);
      }
      const distinct = trigrams.size;
      const normalized = distinct > 1 ? entropy / Math.log2(distinct) : 1;
      if (normalized < 0.82 && total >= 50) {
        push("fnword-trigram-entropy", `Function-word trigram entropy ${normalized.toFixed(2)} (low)`, null, null);
      }
      if (distinct === 1 && total >= 50) {
        push("fnword-trigram-entropy", "Single function-word trigram repeated across document", null, null);
      }
    }
  }
  if (paragraphs.length >= 4) {
    const cvs = paragraphs.map((p) => {
      const sents = getSentences(p.text);
      if (sents.length < 3) return null;
      const lens = sents.map(countWords3);
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
      if (mean === 0) return null;
      const v = lens.reduce((s, l) => s + (l - mean) ** 2, 0) / lens.length;
      return Math.sqrt(v) / mean;
    }).filter((c) => c !== null);
    if (cvs.length >= 4) {
      const cvMean = cvs.reduce((a, b) => a + b, 0) / cvs.length;
      const cvStd = Math.sqrt(cvs.reduce((s, c) => s + (c - cvMean) ** 2, 0) / cvs.length);
      if (cvStd < 0.08 && cvMean < 0.45) {
        push("cross-para-burstiness", `Sentence rhythm uniform across paragraphs (sigmaCV=${cvStd.toFixed(2)})`, null, null);
      }
    }
  }
  {
    const claimed = [];
    const overlaps = (a, b) => claimed.some(([s, e]) => a < e && b > s);
    let distinctPhrasesHit = 0;
    for (const phrase of TIER3_PHRASES) {
      const phraseSpans = [];
      for (const m of execAll2(phrase, text)) {
        const a = m.index;
        const b = a + m[0].length;
        if (!overlaps(a, b)) phraseSpans.push([a, b, m[0]]);
      }
      if (phraseSpans.length === 0) continue;
      for (const [a, b] of phraseSpans) claimed.push([a, b]);
      distinctPhrasesHit += 1;
      if (phraseSpans.length >= 2) {
        const [a, b, matched] = phraseSpans[0];
        push(
          "tier3-phrase",
          `"${matched.toLowerCase()}" x${phraseSpans.length}`,
          a,
          b,
          `Boilerplate phrase repeated ${phraseSpans.length} times; replace at least one with specifics.`,
          phraseSpans.length
        );
      }
    }
    if (distinctPhrasesHit >= 3) {
      const firstClaim = claimed.slice().sort((x, y) => x[0] - y[0])[0];
      push(
        "tier3-phrase-cluster",
        `${distinctPhrasesHit} distinct boilerplate phrases`,
        firstClaim ? firstClaim[0] : null,
        firstClaim ? firstClaim[1] : null,
        void 0,
        distinctPhrasesHit
      );
    }
  }
  {
    const tagMatches = [...maskCode(text).matchAll(/(?:^|\W)#(\w[\w-]*)/g)].filter((m) => isSocialTag(m[1]));
    if (tagMatches.length >= 6) {
      const first = tagMatches[0];
      const hashAt2 = first.index + first[0].indexOf("#");
      push("hashtag-stuff", `${tagMatches.length} hashtags`, hashAt2, hashAt2 + 1 + first[1].length, void 0, tagMatches.length);
    }
  }
  {
    const lines = text.split(/\r?\n/);
    const bulletRe = /^\s*(?:\*|-|•|\+)\s+(.+)$/;
    const verbRe = /\b(?:is|are|was|were|has|have|had|will|would|should|must|do|does|did|can|could|may|might|am|been|being)\b/i;
    const fenceRe = /^\s*(?:```|~~~)/;
    let run = [];
    let runStart = -1;
    let blankStreak = 0;
    let inFence = false;
    let offset = 0;
    const flushRun = () => {
      if (run.length >= 5) {
        const bareNP = run.filter((it) => {
          const wc = (it.match(/\S+/g) ?? []).length;
          return wc > 0 && wc <= 6 && !verbRe.test(it);
        });
        if (bareNP.length >= 5 && bareNP.length / run.length >= 0.75) {
          push(
            "bullet-np-list",
            `${run.length}-item bullet list of bare noun phrases`,
            runStart,
            Math.min(text.length, runStart + 1),
            void 0,
            run.length
          );
        }
      }
      run = [];
      runStart = -1;
      blankStreak = 0;
    };
    for (const line of lines) {
      if (fenceRe.test(line)) {
        flushRun();
        inFence = !inFence;
      } else if (!inFence) {
        const m = line.match(bulletRe);
        if (m) {
          if (run.length === 0) runStart = offset;
          run.push(m[1].trim());
          blankStreak = 0;
        } else if (line.trim() === "") {
          blankStreak += 1;
          if (blankStreak >= 2) flushRun();
        } else {
          flushRun();
        }
      }
      offset += line.length + 1;
    }
    flushRun();
  }
  {
    const confMatches = [];
    for (const pattern of CONFIDENCE_CALIBRATION) {
      for (const m of execAll2(pattern, text)) confMatches.push({ text: m[0], index: m.index });
    }
    if (confMatches.length >= 3) {
      for (const m of confMatches) push("confidence-calibration", m.text, m.index, m.index + m.text.length);
    }
  }
  {
    const rawEmDashCount = (text.match(/—|(?<=\s)--(?=\s|$)|(?<=^|\s)--(?=\s)/gm) ?? []).length;
    const spacedHyphenCount = (text.match(/(?<=\S) (?:-|–) (?=\S)/g) ?? []).length;
    const separatorDashCount = (text.match(SEPARATOR_DASH_RE) ?? []).length + (text.match(VERSION_HEADING_DASH_RE) ?? []).length;
    const dashCount = rawEmDashCount + spacedHyphenCount - separatorDashCount;
    const rate = dashCount / (wordCount / 1e3);
    if (dashCount >= 3 && rate > 6) {
      issues.push({
        category: "em-dash-density",
        key: `${dashCount} dash separators in ${wordCount} words`,
        start: null,
        end: null,
        count: dashCount,
        extra: { rate_per_1000_words: Math.round(rate * 10) / 10, em_dash_count: rawEmDashCount, spaced_hyphen_count: spacedHyphenCount }
      });
    }
  }
  if (sentences.length >= 5) {
    const lengths = sentences.map(countWords3);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const stdDev = Math.sqrt(lengths.reduce((s, l) => s + (l - avg) ** 2, 0) / lengths.length);
    const cv = avg > 0 ? stdDev / avg : 0;
    if (cv < 0.25 && avg > 10) {
      issues.push({
        category: "sentence-flatline",
        key: `Sentence lengths cluster around ${Math.round(avg)} words (CV=${cv.toFixed(2)})`,
        start: null,
        end: null,
        count: sentences.length,
        extra: { sentence_count: sentences.length, mean_words: Math.round(avg * 10) / 10, std_dev: Math.round(stdDev * 100) / 100, cv: Math.round(cv * 100) / 100 }
      });
    }
  }
  {
    const headingRe = /^(?:#{1,6}[ \t]+\S.*|<h[1-6][^>]*>.*)$/gim;
    const headings = execAll2(headingRe, text);
    let sectionLengths = [];
    if (headings.length >= 2) {
      for (let i = 0; i < headings.length; i += 1) {
        const bodyStart = headings[i].index + headings[i][0].length;
        const bodyEnd = i + 1 < headings.length ? headings[i + 1].index : text.length;
        const words = countWords3(text.slice(bodyStart, bodyEnd));
        if (words >= 20) {
          sectionLengths.push(words);
        }
      }
    } else {
      for (const p of paragraphs) {
        const words = countWords3(p.text);
        if (words >= 20) {
          sectionLengths.push(words);
        }
      }
    }
    if (sectionLengths.length >= 4) {
      const mean = sectionLengths.reduce((a, b) => a + b, 0) / sectionLengths.length;
      const std = Math.sqrt(sectionLengths.reduce((s, l) => s + (l - mean) ** 2, 0) / sectionLengths.length);
      const cv = mean > 0 ? std / mean : 0;
      if (cv < 0.15) {
        issues.push({
          category: "uniform-sections",
          key: `${sectionLengths.length} sections of near-identical length (CV=${cv.toFixed(2)})`,
          start: null,
          end: null,
          count: sectionLengths.length,
          ...sectionLengths.length >= 8 && cv < 0.1 ? { severityOverride: "high" } : {},
          extra: { section_count: sectionLengths.length, mean_words: Math.round(mean * 10) / 10, cv: Math.round(cv * 100) / 100 }
        });
      }
    }
  }
  {
    const lines = text.split(/\r?\n/);
    const itemRe = /^\s*(?:[-*+•]|\d+[.)])\s+(\S.*)$/;
    let offset = 0;
    let run = [];
    let runStart = null;
    let runEnd = null;
    const flush = () => {
      if (run.length >= 4) {
        const mean = run.reduce((a, b) => a + b, 0) / run.length;
        const std = Math.sqrt(run.reduce((s, l) => s + (l - mean) ** 2, 0) / run.length);
        const cv = mean > 0 ? std / mean : 0;
        if (mean >= 3 && cv < 0.15) {
          issues.push({
            category: "uniform-list-items",
            key: `${run.length} list items of near-identical length (CV=${cv.toFixed(2)})`,
            ...runStart !== null && runEnd !== null && runEnd > runStart ? (([s, e]) => ({ start: s, end: e }))(span(runStart, runEnd)) : { start: null, end: null },
            count: run.length,
            extra: { item_count: run.length, mean_words: Math.round(mean * 10) / 10, cv: Math.round(cv * 100) / 100 }
          });
        }
      }
      run = [];
      runStart = null;
      runEnd = null;
    };
    for (const line of lines) {
      const m = line.match(itemRe);
      if (m) {
        if (run.length === 0) runStart = offset + (line.length - line.trimStart().length);
        runEnd = offset + line.replace(/\s+$/, "").length;
        run.push(countWords3(m[1]));
      } else if (line.trim() !== "") {
        flush();
      }
      offset += line.length + 1;
    }
    flush();
  }
  if (tokens2.length >= 200) {
    const unique = new Set(tokens2.map((t) => t.token)).size;
    const ttr = unique / tokens2.length;
    if (ttr < 0.4) {
      push("low-ttr", `Vocabulary diversity ${(ttr * 100).toFixed(1)}% (${unique} unique / ${tokens2.length} tokens)`, null, null);
    }
  }
  if (paragraphs.length >= 4) {
    const paraLengths = paragraphs.map((p) => getSentences(p.text).length);
    const avg = paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length;
    if (paraLengths.every((l) => Math.abs(l - avg) <= 1) && avg >= 3) {
      push("uniformity", `All paragraphs are ~${Math.round(avg)} sentences`, null, null);
    }
  }
  {
    const boldRe = /\*\*[^*]+\*\*/g;
    const bolds = execAll2(boldRe, text);
    if (bolds.length > 3) {
      const first = bolds[0];
      push("formatting", `${bolds.length} bold phrases`, first.index, first.index + first[0].length, void 0, bolds.length);
    }
  }
  collectV3Issues({
    text,
    wordCount,
    paragraphs,
    sentences,
    push,
    pushEx,
    pushPatterns: (patterns, category) => {
      pushPatterns(patterns, category);
    }
  });
  collectV4Issues({
    text,
    wordCount,
    paragraphs,
    sentences,
    push,
    pushEx,
    pushPatterns: (patterns, category) => {
      pushPatterns(patterns, category);
    }
  });
  const seen = /* @__PURE__ */ new Set();
  const deduped = issues.filter((issue) => {
    const k = `${issue.category}:${issue.key.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const tier1Distinct = new Set(deduped.filter((i) => i.category === "tier1").map((i) => i.key.toLowerCase())).size;
  return { issues: deduped, wordCount, tier2Clusters, tier1Distinct, normFlags: norm.flags };
}
function docAnchor(text) {
  const cp = text.codePointAt(0);
  return [0, cp !== void 0 && cp > 65535 ? 2 : 1];
}
function toFinding(original, issue) {
  const meta = MERGED_META[issue.category] ?? { severity: "low", message: "This passage set off one of our writing checks.", suggestion: "Have a look at the flagged text." };
  let start = issue.start;
  let end = issue.end;
  let documentLevel = false;
  if (start === null || end === null || end <= start) {
    [start, end] = docAnchor(original);
    documentLevel = true;
  }
  [start, end] = alignUtf16Range(original, start, end);
  const matched = original.slice(start, end);
  const weight = MERGED_WEIGHTS[issue.category] ?? 2;
  const eraInfo = RULE_ERA[issue.category] ?? { era: "evergreen" };
  return {
    rule_id: "signals." + issue.category.replace(/-/g, "_"),
    rule_version: EN_SIGNALS_PATTERN_VERSION,
    severity: issue.severityOverride ?? meta.severity,
    message: meta.message,
    suggestion: issue.suggestion !== void 0 && issue.suggestion !== "" ? `Consider: ${issue.suggestion}.` : meta.suggestion,
    span: rangeFromUtf16(original, start, end),
    matched_text_hash: prefixedSha256(matched),
    evidence: {
      matched,
      count: issue.count ?? 1,
      weight,
      category: issue.category,
      detail: issue.key,
      era: eraInfo.era,
      ...eraInfo.attribution !== void 0 ? { attribution: eraInfo.attribution } : {},
      ...CORROBORATION_CATEGORIES.has(issue.category) || V4_RHYTHM_CATEGORIES.has(issue.category) ? { corroboration: true } : {},
      ...issue.extra ?? {},
      ...documentLevel ? { document_level: true } : {}
    }
  };
}
function inspectSignalsV2(text) {
  if (!text || text.trim().length === 0) return [];
  const analysis = analyse(text);
  return analysis.issues.map((issue) => toFinding(text, issue)).sort((a, b) => a.span.start_utf16 - b.span.start_utf16 || a.rule_id.localeCompare(b.rule_id));
}
function classify(score, issues, normFlags, wordCount, denseAIVocab) {
  const has = (category) => issues.some((i) => i.category === category);
  const hasCutoff = has("cutoff-disclaimer");
  const hasNormFlag = normFlags.zeroWidth >= 2 || normFlags.homoglyph >= 2;
  const strongCorrob = (hasCutoff ? 1 : 0) + (hasNormFlag ? 1 : 0) + (has("reasoning-artifact") && has("chatbot") ? 1 : 0) + (denseAIVocab ? 1 : 0);
  const stylometricHits = ["punct-distribution", "cross-para-burstiness", "fnword-trigram-entropy"].filter(has).length;
  const weakCorrob = (stylometricHits >= 2 ? 1 : 0) + (has("smart-punct-signature") ? 1 : 0);
  const totalCorrob = strongCorrob + weakCorrob;
  let band;
  if (score < 15 && strongCorrob === 0) band = "human_like";
  else if (strongCorrob >= 1 || score >= 70) band = "ai_like";
  else if (score >= 40 && totalCorrob >= 1) band = "ai_like";
  else band = "mixed_signals";
  const aiSoft = Math.min(0.97, score / 100 + totalCorrob * 0.06 + strongCorrob * 0.08);
  let p;
  if (band === "human_like") p = { human: Math.max(0.6, 1 - aiSoft), mixed: Math.min(0.35, aiSoft * 0.8), ai: Math.min(0.1, aiSoft * 0.3) };
  else if (band === "ai_like") p = { human: Math.max(0.02, 1 - aiSoft - 0.05), mixed: 0.1, ai: aiSoft };
  else p = { human: Math.max(0.15, 0.6 - aiSoft * 0.5), mixed: 0.5, ai: aiSoft * 0.7 };
  const rawSum = p.human + p.mixed + p.ai;
  const human = +(p.human / rawSum).toFixed(3);
  const mixed = +(p.mixed / rawSum).toFixed(3);
  const ai = Math.max(0, +(1 - human - mixed).toFixed(3));
  let classification;
  if (human >= mixed && human >= ai) classification = "human_like";
  else if (mixed >= ai) classification = "mixed_signals";
  else classification = "ai_like";
  let confidence;
  if (strongCorrob >= 2 || hasCutoff || score < 8 && wordCount >= 100) confidence = "high";
  else if (strongCorrob >= 1 || score >= 45 && weakCorrob >= 1 || score < 20) confidence = "medium";
  else confidence = "low";
  return { classification, probabilities: { human_like: human, mixed_signals: mixed, ai_like: ai }, confidence };
}
var CLASS_RANK = { human_like: 0, mixed_signals: 1, ai_like: 2 };
function applyEscalationPolicy(base, confidence, score, findingCount, categories) {
  const cats = new Set(categories);
  const coreArtefacts = categories.filter((c) => ARTEFACT_CORE_CATEGORIES.has(c));
  const supportArtefacts = categories.filter((c) => ARTEFACT_SUPPORT_CATEGORIES.has(c));
  const artefactHit = coreArtefacts.length >= 1 || supportArtefacts.length >= 2;
  const artefactCats = artefactHit ? [...coreArtefacts, ...supportArtefacts] : [];
  const formattingCats = categories.filter((c) => FORMATTING_CLUSTER_CATEGORIES.has(c));
  const candidates = [];
  if (cats.has("ai-citation-markup") && cats.has("ai-citation-token")) {
    candidates.push({
      applied: "citation_co_occurrence",
      classification: "ai_like",
      reason: "Internal citation markup and a leaked citation token both appear \u2014 the residue of an unstripped chatbot export, with no plausible human origin. This remains stylistic-artefact evidence, not proof of authorship."
    });
  }
  if (findingCount >= 6 && cats.size >= 4) {
    const bumped = base === "human_like" ? "mixed_signals" : "ai_like";
    candidates.push({
      applied: "finding_breadth",
      classification: bumped,
      reason: `Documented writing signals are unusually broad (${findingCount} findings across ${cats.size} categories), so more editorial suggestions are surfaced. Breadth is an observation about the writing, not evidence of authorship: measured on a representative 4,144-sample human corpus, genuine human writing reaches up to 9 categories and 135 of those documents trip this same gate.`
    });
  }
  const artefactScore = artefactHit && score >= 10;
  if (artefactScore) {
    candidates.push({
      applied: "artefact_score",
      classification: "mixed_signals",
      reason: `Machine-artefact evidence (${artefactCats.join(", ")}) combines with a score of ${score}. Measured on a representative 4,144-sample human corpus, human writing reaches a score of 11 and 2 of those documents clear this gate, so this is a strong editorial signal rather than a finding about authorship.`
    });
  }
  if (artefactHit) {
    candidates.push({
      applied: "artefact_floor",
      classification: "mixed_signals",
      reason: `Machine-artefact evidence (${artefactCats.join(", ")}) was found. Artefact-class findings are rare in human writing \u2014 4 of 4,144 documents in a representative human corpus \u2014 but they are not absent, so this raises the editorial reading and is not evidence of authorship.`
    });
  }
  if (cats.has("markdown-furniture")) {
    candidates.push({
      applied: "furniture_gate",
      classification: "mixed_signals",
      reason: "Chat-export markdown furniture (bold runs, heading lines, or dense bullets) shapes this text \u2014 the combined gate fired on 0 of 169 held-out human documents. Absence of furniture (e.g. after a format-stripping paste) never counts the other way."
    });
  }
  if (cats.has("formatting")) {
    candidates.push({
      applied: "formatting_floor",
      classification: "mixed_signals",
      reason: "Heavy bold styling (the formatting rule) fired \u2014 measured on 0 of 169 held-out human documents and 9-95% of AI chat text per provider slice; the classification is floored at mixed_signals."
    });
  }
  if (new Set(formattingCats).size >= 3) {
    candidates.push({
      applied: "formatting_cluster",
      classification: "mixed_signals",
      reason: `Chat-export formatting furniture clusters (${[...new Set(formattingCats)].join(", ")}). This compound signal fired on 0 of 4,144 documents in a representative human corpus, but it detects how a draft was pasted rather than who wrote it: an editor that strips formatting removes it entirely.`
    });
  }
  let finalClass = base;
  let applied = null;
  let reason = "No escalation applied; the classification is the argmax of the published probabilities.";
  for (const c of candidates) {
    if (CLASS_RANK[c.classification] > CLASS_RANK[finalClass]) {
      finalClass = c.classification;
      applied = c.applied;
      reason = c.reason;
    }
  }
  const finalConfidence = artefactScore && confidence === "low" ? "medium" : confidence;
  return { classification: finalClass, confidence: finalConfidence, escalation: { applied, reason } };
}
function unscored(status, wordCount) {
  return {
    score: 0,
    classification: "human_like",
    probabilities: { human_like: 0.334, mixed_signals: 0.333, ai_like: 0.333 },
    confidence: "low",
    categoriesHit: [],
    findingCount: 0,
    wordCount,
    version: EN_SIGNALS_PATTERN_VERSION,
    status,
    escalation: { applied: null, reason: "Text was outside the scoring window; the escalation policy was not evaluated." },
    description: DESCRIPTION + " This text was outside the scoring window (" + status.replace("_", " ") + "), so no stylistic assessment was made."
  };
}
function computeEditorialSignals(text) {
  if (!text || text.trim().length === 0) return unscored("empty", 0);
  const analysis = analyse(text);
  const { wordCount } = analysis;
  if (wordCount < 10) return unscored("too_short", wordCount);
  if (wordCount > MAX_SCORED_WORDS) return unscored("too_long", wordCount);
  let styloRaw = 0;
  let otherRaw = 0;
  for (const issue of analysis.issues) {
    const w = MERGED_WEIGHTS[issue.category] ?? 2;
    if (STYLOMETRIC_CATEGORIES.has(issue.category) || V4_RHYTHM_CATEGORIES.has(issue.category)) styloRaw += w;
    else otherRaw += w;
  }
  const rawScore = otherRaw + Math.min(styloRaw, Math.max(otherRaw, 12));
  const lengthFactor = Math.max(1, Math.log2(wordCount / 50));
  const score = Math.min(100, Math.round(rawScore / lengthFactor));
  const denseAIVocab = wordCount >= 150 && analysis.tier1Distinct >= 5 && analysis.tier2Clusters >= 2 && analysis.issues.some((i) => i.category === "transition");
  const verdict = classify(score, analysis.issues, analysis.normFlags, wordCount, denseAIVocab);
  const categoriesHit = [...new Set(analysis.issues.map((i) => i.category))].sort();
  const FURNITURE_CATS = /* @__PURE__ */ new Set(["markdown-bold", "markdown-heading", "markdown-furniture"]);
  const v4IssueCount = analysis.issues.filter((i) => V4_RHYTHM_CATEGORIES.has(i.category)).length;
  const furnitureIssueCount = analysis.issues.filter((i) => FURNITURE_CATS.has(i.category)).length;
  const breadthFindingCount = analysis.issues.length - Math.max(0, v4IssueCount - 1) - Math.max(0, furnitureIssueCount - 1);
  const breadthCategories = categoriesHit.filter((c) => !V4_RHYTHM_CATEGORIES.has(c) && !FURNITURE_CATS.has(c));
  if (v4IssueCount > 0) breadthCategories.push("stylometric-rhythm-combined");
  if (furnitureIssueCount > 0) breadthCategories.push("markdown-furniture-combined");
  const escalated = applyEscalationPolicy(
    verdict.classification,
    verdict.confidence,
    score,
    breadthFindingCount,
    breadthCategories
  );
  return {
    score,
    classification: escalated.classification,
    probabilities: verdict.probabilities,
    confidence: escalated.confidence,
    categoriesHit,
    findingCount: analysis.issues.length,
    wordCount,
    version: EN_SIGNALS_PATTERN_VERSION,
    status: "scored",
    escalation: escalated.escalation,
    description: DESCRIPTION
  };
}

// src/patterns/en-gb-v1.ts
var EN_GB_PATTERN_VERSION = "en-gb:2026.08.1";
var PHRASES = ["in today's rapidly evolving landscape", "game-changer", "in conclusion", "it is important to note", "delve into"];
var finding = (text, start, rule, severity, message, suggestion, evidence) => {
  const raw = evidence.matched === void 0 ? text.slice(start, start + 1) : String(evidence.matched);
  const [alignedStart, alignedEnd] = alignUtf16Range(text, start, start + raw.length);
  const matched = evidence.matched === void 0 ? void 0 : text.slice(alignedStart, alignedEnd);
  return { rule_id: rule, rule_version: EN_GB_PATTERN_VERSION, severity, message, suggestion, span: rangeFromUtf16(text, alignedStart, alignedEnd), matched_text_hash: prefixedSha256(matched ?? ""), evidence: matched === void 0 ? evidence : { ...evidence, matched } };
};
function inspectPatterns(text) {
  const v1 = inspectPatternsV1(text);
  const v1Spans = new Set(v1.map((f) => `${f.span.start_utf16}:${f.span.end_utf16}`));
  const v2 = inspectSignalsV2(text).filter((f) => !v1Spans.has(`${f.span.start_utf16}:${f.span.end_utf16}`));
  return [...v1, ...v2].sort((a, b) => a.span.start_utf16 - b.span.start_utf16 || a.rule_id.localeCompare(b.rule_id));
}
function inspectPatternsV1(text) {
  const findings = [];
  const lower = text.toLocaleLowerCase("en-GB");
  for (const phrase of PHRASES) {
    let at = 0, count = 0;
    while ((at = lower.indexOf(phrase, at)) >= 0) {
      count++;
      at += phrase.length;
    }
    if (count >= 1) {
      const start = lower.indexOf(phrase);
      findings.push(finding(text, start, "style.overused_phrase", count > 1 ? "medium" : "low", "A stock phrase may make the passage feel generic.", "Review whether a more specific statement would be clearer.", { matched: text.slice(start, start + phrase.length), count, threshold: 1 }));
    }
  }
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const openings = /* @__PURE__ */ new Map();
  let cursor = 0;
  for (const sentence of sentences) {
    const start = text.indexOf(sentence, cursor);
    cursor = start + sentence.length;
    const opening = sentence.trim().split(/\s+/).slice(0, 3).join(" ").toLocaleLowerCase("en-GB");
    if (opening.split(" ").length >= 2) (openings.get(opening) ?? (openings.set(opening, []), openings.get(opening))).push(start);
  }
  for (const [opening, starts] of openings) if (starts.length >= 3) findings.push(finding(text, starts[0], "style.repeated_opening", "medium", "Several sentences begin the same way.", "Vary only the openings that genuinely benefit from it.", { matched: text.slice(starts[0], starts[0] + opening.length), count: starts.length, threshold: 3 }));
  const transitions = (lower.match(/\b(?:moreover|furthermore|additionally|consequently|therefore|however)\b/g) ?? []).length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  if (wordCount >= 40 && transitions / wordCount > 0.04) {
    const m = /\b(?:moreover|furthermore|additionally|consequently|therefore|however)\b/i.exec(text);
    findings.push(finding(text, m.index, "style.transition_density", "low", "Transition words are unusually dense.", "Remove transitions that do not clarify the relationship between sentences.", { matched: m[0], count: transitions, word_count: wordCount, threshold_ratio: 0.04 }));
  }
  return findings.sort((a, b) => a.span.start_utf16 - b.span.start_utf16 || a.rule_id.localeCompare(b.rule_id));
}
var packs = /* @__PURE__ */ new Map();
function registerPatternPack(pack) {
  if (!/^[a-z][a-z0-9.-]+$/.test(pack.id) || !pack.version || !pack.rules.length) throw new Error("invalid_pattern_pack");
  if (packs.has(pack.id)) throw new Error("duplicate_pattern_pack");
  const frozen = Object.freeze({ ...pack, rules: Object.freeze([...pack.rules]) });
  packs.set(pack.id, frozen);
  return () => {
    if (packs.get(pack.id) === frozen) packs.delete(pack.id);
  };
}
var runRegisteredPacks = (text) => [...packs.values()].flatMap((pack) => pack.inspect(text));

// src/verdict/combine.ts
var COMBINED_VERDICT_VERSION = "combined:2026.08.8";
var DESCRIPTION2 = "Three independent readings, published side by side and never merged: the AI probability, which only a trained model may set; text-integrity and provenance findings, which describe what was done to the text; and editorial suggestions about phrasing and structure. Integrity findings describe manipulation, not authorship.";
var AXES_LIMIT = "These three readings are independent and are never combined into a single verdict. Hidden characters, homoglyph substitutions and watermark marks show that something was done to the text; they are not evidence of AI authorship. Only the trained model gives an AI reading.";
var AUTHORSHIP_LIMIT = "Authorship cannot be proved from these checks; character evidence shows how text was produced or pasted, not by whom.";
var ABSENCE_LIMIT = "Absence of carrier characters is not evidence of human authorship. Most published prose carries none, and any copy-paste, CMS save or format strip removes them.";
var PROTECTED_LIMIT = "Protected spans are excluded from this verdict by design: they are facts to preserve, not evidence about origin.";
var EDITORIAL_LIMIT = "Writing suggestions are editorial feedback on phrasing and structure. Measured on 5,558 fresh long-form documents the named rules flagged 24.8% of human writing, so they say nothing about who or what wrote a draft and are never counted toward the AI reading.";
var NO_MODEL_LIMIT = "No trained model ran on this text, so no AI probability is available. That is reported as not assessed, and not assessed does not mean human.";
var INTEGRITY_RANK = { clean: 0, attention: 1, manipulated: 2 };
function isDeliberateCarrier(cp) {
  return cp === 8203 || // ZERO WIDTH SPACE
  cp === 8204 || // ZWNJ that survived the cursive/Indic joining exemption
  cp === 8205 || // ZWJ that survived the emoji and joining-script exemptions
  cp === 8288 || // WORD JOINER
  cp >= 8298 && cp <= 8303 || // deprecated format characters
  cp >= 65024 && cp <= 65039 || // variation selectors past the emoji/CJK exemption
  cp >= 917760 && cp <= 917999 || // supplementary variation selectors past the CJK exemption
  cp === 917505 || // LANGUAGE TAG
  cp >= 917536 && cp <= 917631;
}
function isVariationSelector(cp) {
  return cp >= 65024 && cp <= 65039 || cp >= 917760 && cp <= 917999;
}
function isSupportingCarrier(cp) {
  return cp === 173 || // SOFT HYPHEN - justified typography and word-processor exports
  cp === 847 || // COMBINING GRAPHEME JOINER - rare collation and diacritic ordering
  cp === 65279 || // BYTE ORDER MARK - routine file-encoding artefact
  cp >= 8289 && cp <= 8292 || // invisible operators - typeset mathematics
  cp >= 65529 && cp <= 65531 || // interlinear annotation - Japanese ruby pipelines
  cp >= 6155 && cp <= 6159 || // Mongolian free variation selectors and vowel separator
  isPrivateUse(cp);
}
function isPrivateUse(cp) {
  return cp >= 57344 && cp <= 63743 || cp >= 983040 && cp <= 1048573 || cp >= 1048576 && cp <= 1114109;
}
function isInvisibleCarrier(cp) {
  return isDeliberateCarrier(cp) || isSupportingCarrier(cp) && !isPrivateUse(cp);
}
var DELIBERATE_RATIONALE = "No ordinary authoring or publishing tool emits this character into prose, and every documented legitimate context for it was checked and did not apply.";
var SUPPORTING_RATIONALE = "Unusual in prose but with a documented innocent origin, so it corroborates other evidence and never raises a status on its own.";
var EXCLUDED_RATIONALE = "This character has a documented legitimate use in typography, multilingual text or encoding, so it is reported but excluded from the integrity status.";
var PUA_RATIONALE = "A private-use character carries meaning only under a private agreement. A single one is common in icon fonts and vendor logos, so one alone only corroborates.";
var LATIN_LETTER = /\p{Script=Latin}/u;
function isInteriorHomoglyph(text, finding2) {
  const start = finding2.span.start_utf16;
  const end = finding2.span.end_utf16;
  if (start <= 0 || end >= text.length) return false;
  return LATIN_LETTER.test(text[start - 1]) && LATIN_LETTER.test(text[end]);
}
var BLACK_FLAG = 127988;
function tagIsInFlagSequence(text, index) {
  let i = index;
  while (i >= 2) {
    const previous = text.codePointAt(i - 2);
    if (previous !== void 0 && previous >= 917536 && previous <= 917631) {
      i -= 2;
      continue;
    }
    break;
  }
  if (i < 2) return false;
  return text.codePointAt(i - 2) === BLACK_FLAG;
}
var SUGGESTION_LEVEL = {
  human_like: "none",
  mixed_signals: "some",
  ai_like: "many"
};
var SUGGESTION_REASON = {
  none: "The named writing rules found nothing worth suggesting a change to.",
  some: "The named writing rules produced some editorial suggestions about phrasing or structure. Genuine human copy triggers them routinely.",
  many: "The named writing rules produced a lot of editorial suggestions about phrasing and structure. That is a comment on the writing, not on who wrote it: measured on fresh long-form documents these rules flag roughly one human document in four."
};
function computeCombinedVerdict(input) {
  const findings = input.unicodeFindings ?? [];
  const text = input.text;
  const signals = input.signals;
  const watermarkOutcome = input.watermark?.outcome ?? "not_available";
  const deliberate = [];
  const supporting = [];
  const excluded = [];
  let interiorHomoglyphs = 0;
  const carrierPositions = [];
  for (const finding2 of findings) {
    const cp = codePointOf(finding2);
    const isHomoglyph = finding2.id.includes("_homoglyph_");
    if (isHomoglyph) {
      const interior = text !== void 0 && isInteriorHomoglyph(text, finding2);
      if (interior) {
        interiorHomoglyphs++;
        deliberate.push(item(finding2, "deliberate", "A Latin-lookalike character sits between two Latin letters, which is a substitution inside a Latin word rather than multilingual text."));
      } else {
        supporting.push(item(finding2, "supporting", "A Latin-lookalike character at a token boundary, which is the shape genuinely multilingual and scientific text produces."));
      }
      continue;
    }
    if (cp === null) {
      excluded.push(item(finding2, "excluded", EXCLUDED_RATIONALE));
      continue;
    }
    if (cp >= 917536 && cp <= 917631 && text !== void 0 && tagIsInFlagSequence(text, finding2.span.start_utf16)) {
      excluded.push(item(finding2, "excluded", "This tag character belongs to a subdivision flag emoji sequence, which is a legitimate tag run."));
      continue;
    }
    if (isVariationSelector(cp) && finding2.severity === "note") {
      excluded.push(item(finding2, "excluded", "This variation selector follows a base character that commonly takes registered glyph variants, which is its documented legitimate use."));
      continue;
    }
    if (isInvisibleCarrier(cp)) carrierPositions.push(finding2.span.start_utf16);
    if (isDeliberateCarrier(cp)) {
      deliberate.push(item(finding2, "deliberate", DELIBERATE_RATIONALE));
      continue;
    }
    if (isSupportingCarrier(cp)) {
      supporting.push(item(finding2, "supporting", isPrivateUse(cp) ? PUA_RATIONALE : SUPPORTING_RATIONALE));
      continue;
    }
    excluded.push(item(finding2, "excluded", EXCLUDED_RATIONALE));
  }
  const privateUseCount = supporting.filter((x) => {
    const cp = codePointFromLabel(x.code_point);
    return cp !== null && isPrivateUse(cp);
  }).length;
  const longestRun = longestAdjacentRun(carrierPositions, text);
  const deliberateCount = deliberate.length;
  const tagCharacters = deliberate.filter((x) => {
    const cp = codePointFromLabel(x.code_point);
    return cp !== null && cp >= 917505 && cp <= 917631;
  }).length;
  const inputs = [];
  if (input.model) inputs.push("model");
  if (signals) inputs.push("writing_signals");
  if (findings.some((f) => !f.id.includes("_homoglyph_"))) inputs.push("invisible_unicode");
  if (findings.some((f) => f.id.includes("_homoglyph_"))) inputs.push("homoglyphs");
  if (watermarkOutcome === "detected") inputs.push("watermark");
  const limitations = [AXES_LIMIT, AUTHORSHIP_LIMIT, ABSENCE_LIMIT, PROTECTED_LIMIT];
  const integrityFindings = [];
  if (watermarkOutcome === "detected") {
    integrityFindings.push({
      applied: "watermark_signal",
      status: "manipulated",
      reason: "A watermark detector reported a positive signal, so this text carries a generator's mark. That is provenance evidence about the text, and it is reported here rather than as an AI probability."
    });
    limitations.push("A watermark signal identifies the generator that marked the text, not the person who published it, and says nothing about later human editing. It is not, on its own, an AI reading.");
  }
  if (longestRun >= 3 || tagCharacters >= 2 || deliberateCount >= 8) {
    integrityFindings.push({
      applied: "carrier_payload",
      status: "manipulated",
      reason: describePayload(longestRun, tagCharacters, deliberateCount)
    });
    limitations.push("A carrier payload shows that something deliberately encoded data into this text. It does not identify what encoded it, it can be inserted by any tool in the chain including one the author never saw, and it is not evidence that a machine wrote the words.");
  }
  if (deliberateCount - interiorHomoglyphs >= 1) {
    integrityFindings.push({
      applied: "carrier_deliberate",
      status: "attention",
      reason: `This text contains an invisible character with no ordinary authoring explanation (${describeEvidence(deliberate.filter((x) => !x.rationale.startsWith("A Latin-lookalike")))}). Every documented legitimate context for it was checked and did not apply.`
    });
    limitations.push("Invisible carriers can be introduced by any tool that touched the text after it was written, including editors, CMS filters and paste handlers, so they place the text in a pipeline rather than with an author, and they say nothing about whether a person or a machine composed it.");
  }
  if (interiorHomoglyphs >= 1) {
    integrityFindings.push({
      applied: "homoglyph_substitution",
      status: "attention",
      reason: `${interiorHomoglyphs} Latin-lookalike character${interiorHomoglyphs === 1 ? " sits" : "s sit"} between Latin letters inside a word. Genuinely multilingual and scientific text places such characters at token boundaries instead.`
    });
    limitations.push("Homoglyph substitution indicates the text passed through a tool that rewrites characters. It is never corrected automatically, it does not establish intent or authorship, and it is not an AI signal.");
  }
  if (privateUseCount >= 2) {
    integrityFindings.push({
      applied: "private_use_cluster",
      status: "attention",
      reason: `${privateUseCount} private-use characters are present. One is a routine icon-font or vendor logo; a cluster is a private encoding.`
    });
    limitations.push("Private-use characters carry meaning only under a private agreement, which this engine cannot read, so their presence is described and not interpreted.");
  }
  let integrityStatus = "clean";
  let integrityApplied = null;
  let integrityReason = "No hidden characters, homoglyph substitutions or watermark marks were found that lack an ordinary explanation.";
  for (const finding2 of integrityFindings) {
    if (INTEGRITY_RANK[finding2.status] > INTEGRITY_RANK[integrityStatus]) {
      integrityStatus = finding2.status;
      integrityApplied = finding2.applied;
      integrityReason = finding2.reason;
    }
  }
  const integrityConfidence = watermarkOutcome === "detected" || integrityStatus === "manipulated" ? "high" : integrityStatus === "attention" ? "medium" : "low";
  const model = input.model;
  const aiProbability = model ? {
    source: model.version ? `${model.name}@${model.version}` : model.name,
    value: model.probability,
    threshold: model.threshold,
    reading: model.below_reliable_range ? "not_assessed" : model.probability >= model.threshold ? "ai_like" : model.probability >= model.threshold * 0.5 ? "uncertain" : "human_like",
    confidence: model.below_reliable_range ? "not_assessed" : modelConfidence(model),
    reason: model.below_reliable_range ? "The trained model ran but this text is outside the length range where its reading is reliable, so no AI probability is published." : `The trained model scored this text at ${(model.probability * 100).toFixed(1)}% against an operating point of ${(model.threshold * 100).toFixed(1)}%. This is the only AI reading the engine publishes.`
  } : {
    source: null,
    value: null,
    threshold: null,
    reading: "not_assessed",
    confidence: "not_assessed",
    reason: "No trained model ran on this text, so no AI probability is available. Character findings and writing rules cannot supply one."
  };
  if (!model) limitations.push(NO_MODEL_LIMIT);
  if (model?.below_reliable_range) {
    limitations.push("Detection falls away on short text: binned by the words a passage actually has, 29 of 172 AI passages of 100 to 199 words are detected (16.9%), against 193 of 228 at 300 to 399 (84.6%). Below the reliable range no reading is published rather than a weak one.");
  }
  const suggestionLevel = signals ? SUGGESTION_LEVEL[signals.classification] : "none";
  const editorial = {
    suggestion_level: suggestionLevel,
    score: signals?.score ?? null,
    categories_hit: signals?.categoriesHit ?? null,
    finding_count: signals?.findingCount ?? null,
    confidence: signals?.confidence ?? "not_assessed",
    reason: signals ? SUGGESTION_REASON[suggestionLevel] : "The named writing rules were not requested for this text.",
    rule_probabilities: signals?.probabilities ?? null
  };
  if (signals) limitations.push(EDITORIAL_LIMIT);
  const result = {
    ai_probability: aiProbability,
    text_integrity: {
      status: integrityStatus,
      applied: integrityApplied,
      reason: integrityReason,
      findings: integrityFindings,
      character_evidence: {
        deliberate,
        supporting,
        excluded,
        interior_homoglyph_count: interiorHomoglyphs,
        longest_carrier_run: longestRun
      },
      watermark: { outcome: watermarkOutcome, counted_as_evidence: watermarkOutcome === "detected" },
      confidence: integrityConfidence
    },
    editorial,
    inputs_considered: inputs,
    version: COMBINED_VERDICT_VERSION,
    limitations: dedupe(limitations),
    description: DESCRIPTION2
  };
  assertAxisIndependence(result, input);
  return result;
}
function assertAxisIndependence(result, input) {
  if (!input.model && result.ai_probability.reading !== "not_assessed") {
    throw new Error("combined_verdict_axis_violation: an AI reading was published without a trained model");
  }
  if (!input.model && result.ai_probability.value !== null) {
    throw new Error("combined_verdict_axis_violation: an AI probability was published without a trained model");
  }
  const evidence = result.text_integrity.character_evidence;
  const hasCharacterEvidence = evidence.deliberate.length > 0 || result.text_integrity.watermark.counted_as_evidence || evidence.supporting.filter((x) => {
    const cp = codePointFromLabel(x.code_point);
    return cp !== null && isPrivateUse(cp);
  }).length >= 2;
  if (result.text_integrity.status !== "clean" && !hasCharacterEvidence) {
    throw new Error("combined_verdict_axis_violation: the integrity status was raised without character or watermark evidence");
  }
  const AUTHORSHIP_VOCABULARY = /\b(?:ai[-\s]?(?:like|generated|written|authored)|likely\s+ai|machine[-\s]written|human[-\s]?(?:like|written|authored))\b/i;
  const strings = [
    result.text_integrity.reason,
    ...result.text_integrity.findings.map((f) => f.reason),
    result.editorial.reason
  ];
  for (const line of strings) {
    if (AUTHORSHIP_VOCABULARY.test(line)) {
      throw new Error(`combined_verdict_axis_violation: an integrity or editorial string made an authorship claim: ${line.slice(0, 80)}`);
    }
  }
}
function modelConfidence(model) {
  const distance = Math.abs(model.probability - model.threshold);
  if (distance >= 0.3) return "high";
  if (distance >= 0.1) return "medium";
  return "low";
}
function item(finding2, tier, rationale) {
  return { finding_id: finding2.id, code_point: finding2.code_point, name: finding2.name, tier, rationale };
}
function codePointFromLabel(label) {
  const parsed = Number.parseInt(label.replace(/^U\+/, ""), 16);
  return Number.isFinite(parsed) ? parsed : null;
}
function codePointOf(finding2) {
  if (finding2.name === "UNPAIRED SURROGATE") return null;
  return codePointFromLabel(finding2.code_point);
}
function longestAdjacentRun(positions, text) {
  if (text === void 0 || positions.length === 0) return 0;
  const sorted = [...new Set(positions)].sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const previousCp = text.codePointAt(previous);
    const width = previousCp !== void 0 && previousCp > 65535 ? 2 : 1;
    if (previous + width === sorted[i]) {
      run++;
      best = Math.max(best, run);
    } else run = 1;
  }
  return best;
}
function describeEvidence(items) {
  const names = [...new Set(items.map((x) => `${x.name} ${x.code_point}`))];
  return names.slice(0, 4).join(", ") + (names.length > 4 ? `, and ${names.length - 4} more` : "");
}
function describePayload(run, tags, deliberateCount) {
  const parts = [];
  if (run >= 3) parts.push(`${run} invisible carriers sit adjacent to one another with no visible character between them`);
  if (tags >= 2) parts.push(`${tags} tag characters form a run outside any flag sequence`);
  if (deliberateCount >= 8) parts.push(`${deliberateCount} deliberate carriers are present`);
  return `This text carries the shape of an encoded payload rather than a stray character: ${parts.join("; ")}. It shows the text was written into, not who composed it.`;
}
function dedupe(values) {
  return [...new Set(values)];
}

// src/inspect.ts
var limits = (message) => [message, "Authorship cannot be proved from this check."];
var WRITING_SIGNAL_RULES_RUN = 116;
async function inspect(request, options = {}) {
  const now = options.now ?? (() => (/* @__PURE__ */ new Date()).toISOString()), started = now();
  const progress = (p) => {
    if (options.signal?.aborted) throw new DOMException("Inspection cancelled", "AbortError");
    options.onProgress?.(p);
  };
  progress("validating");
  if (request.schema_version !== "1.0" || !request.contract_version.startsWith("1.")) throw new Error("contract_incompatible");
  if (request.source.content.length > 25e4) throw new Error("request_too_large");
  if (hasUnpairedSurrogate(request.source.content)) throw new Error("invalid_unicode_unpaired_surrogate");
  const sourceHash = prefixedSha256(request.source.content);
  progress("mapping_text");
  const projection = projectVisibleText(request.source.content, request.source.content_type);
  progress("unicode_checks");
  const unicode = inspectUnicode(request.source.content);
  progress("protected_spans");
  const protectedSpans = extractProtectedSpans({ ...request.source, content_hash: sourceHash });
  progress("writing_patterns");
  const patternFindings = [...inspectPatterns(projection.text), ...runRegisteredPacks(projection.text)];
  const editorialSignals = request.checks.includes("style.patterns") ? computeEditorialSignals(projection.text) : void 0;
  const methods = [];
  for (const id of request.checks) {
    const methodStarted = now();
    if (id.startsWith("unicode.")) {
      methods.push(method(id, "unicode", "Opace deterministic Unicode inspection", UNICODE_RULES_VERSION, unicode.length ? "attention" : "pass", unicode.map((x) => ({ type: "unicode_finding", ...x })), limits("Unicode controls can be legitimate in multilingual text."), methodStarted, now(), "browser"));
    } else if (id === "style.patterns") {
      const signalsAttention = patternFindings.length > 0 || editorialSignals?.status === "scored" && editorialSignals.classification !== "human_like";
      const evidence = patternFindings.length ? patternFindings.map((x) => ({ type: "pattern_finding", rule_id: x.rule_id, span: x.span })) : [{ type: "scope_note", rules_run: WRITING_SIGNAL_RULES_RUN, note: "No selected writing-signal rule matched. This is not evidence of human authorship." }];
      if (editorialSignals) evidence.push({ type: "editorial_signals", ...editorialSignals });
      methods.push(method(id, "pattern", "Opace writing-signal rules", EN_SIGNALS_PATTERN_VERSION, signalsAttention ? "attention" : "pass", evidence, limits("Writing patterns are editorial prompts, not detector or watermark evidence."), methodStarted, now(), "browser"));
    } else if (id === "watermark.anthropic") {
      methods.push({ ...method(id, "watermark", "Anthropic official text-watermark detector", "unavailable-2026-08-26", "unsupported", [], ["No official detector call was available. Local style or public SynthID tests are not substitutes.", "Not yet available in this release."], methodStarted, now(), "browser"), availability: "not_available", native_outcome: "not_available" });
    } else methods.push(method(id, "detector", id, "unsupported/1", "unsupported", [], ["This requested method is not implemented in the deterministic browser core.", "Not yet available in this release."], methodStarted, now(), "browser"));
  }
  const watermarkOutcome = request.checks.includes("watermark.anthropic") ? "not_available" : "not_supported";
  const combinedVerdict = computeCombinedVerdict({ signals: editorialSignals, unicodeFindings: unicode, text: request.source.content, watermark: { outcome: watermarkOutcome } });
  const combinedRaised = combinedVerdict.text_integrity.status !== "clean";
  const summary = { pass: 0, attention: 0, fail: 0, inconclusive: 0, unsupported: 0, not_configured: 0, not_run: 0, error: 0 };
  for (const item2 of methods) summary[item2.status]++;
  progress("complete");
  const result = { schema_version: "1.0", contract_version: "1.0.0", request_id: request.request_id, analysis_id: options.analysisId?.() ?? `analysis_${sourceHash.slice(7, 23)}`, source: { content_hash: sourceHash, normalised_hash: prefixedSha256(projection.text.normalize("NFC")), content_type: request.source.content_type, language: request.source.language, word_count: (projection.text.trim().match(/\S+/g) ?? []).length }, protected_spans: protectedSpans, pattern_findings: patternFindings, methods, summary, combined_verdict: combinedVerdict, limitations: [.../* @__PURE__ */ new Set(["Authorship cannot be proved from these checks.", ...projection.limitations, ...combinedRaised ? combinedVerdict.limitations : []])], started_at: started, completed_at: now() };
  return deepFreeze(result);
}
function method(id, category, provider, version, status, evidence, limitations, started_at, completed_at, privacy_route) {
  if (!limitations.length) throw new Error("method_limitations_required");
  return { id, category, provider_or_method: provider, version, status, score: null, threshold: null, segments: [], evidence, limitations, started_at, completed_at, privacy_route };
}
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
function hasUnpairedSurrogate(value) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 55296 && code <= 56319) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 56320 && next <= 57343)) return true;
      i++;
    } else if (code >= 56320 && code <= 57343) return true;
  }
  return false;
}

// src/protected/validate.ts
function validateProtected(source, candidate, spans) {
  const failures = [];
  for (const span of spans) {
    const count = candidate.split(span.text).length - 1;
    if (count === 0) failures.push({ protected_span_id: span.id, expected_hash: span.content_hash, observed: "missing" });
    else if (count > source.split(span.text).length - 1) failures.push({ protected_span_id: span.id, expected_hash: span.content_hash, observed: "duplicated" });
  }
  return { id: "protected_spans.exact", version: "1.0.0", status: failures.length ? "fail" : "pass", hard: true, summary: failures.length ? `${failures.length} protected item(s) changed` : "Protected items remain present", failures, limitations: [] };
}
function validateAdditions(source, candidate) {
  const pattern = /https?:\/\/[^\s<>)\]]+|```[\s\S]*?```|`[^`\n]+`|\[[0-9]+\]|[“"][^”"\n]+[”"]/g;
  const original = new Set(source.match(pattern) ?? []);
  const added = (candidate.match(pattern) ?? []).filter((x) => !original.has(x));
  return { id: "unsupported_additions", version: "1.0.0", status: added.length ? "fail" : "pass", hard: true, summary: added.length ? `${added.length} unsupported reference(s) added` : "No unsupported URLs, citations, quotations or code added", failures: added.map((observed) => ({ observed })), limitations: [] };
}

// src/gates/policy.ts
function validateCandidate(source, candidate, spans, policy = {}) {
  const gates = [validateProtected(source.content, candidate, spans), validateAdditions(source.content, candidate)];
  const current = prefixedSha256(source.content), expected = policy.expected_source_hash ?? source.content_hash ?? current;
  gates.push({ id: "source_version", version: "1.0.0", status: current === expected ? "pass" : "fail", hard: true, summary: current === expected ? "Source hash matches" : "Source changed since protection", failures: current === expected ? [] : [{ expected_hash: expected, observed: current }], limitations: [] });
  const executable = /<\s*(?:script|iframe|object|embed|form)\b|\son\w+\s*=|javascript:/i.test(candidate);
  gates.push({ id: "html_safety", version: "1.0.0", status: executable ? "fail" : "pass", hard: true, summary: executable ? "Executable or unsafe HTML found" : "No executable HTML found", failures: executable ? [{ observed: "executable_markup" }] : [], limitations: ["This deterministic gate is not a complete HTML sanitiser."] });
  const max = policy.max_length_ratio ?? 2;
  const ratio = source.content.length ? candidate.length / source.content.length : 1;
  gates.push({ id: "language_length", version: "1.0.0", status: ratio > max ? "fail" : "pass", hard: true, summary: ratio > max ? "Candidate exceeds the configured length bound" : "Candidate is within the configured length bound", failures: ratio > max ? [{ observed_ratio: ratio, max_ratio: max }] : [], limitations: ["CORE-10 does not infer language; it preserves the requested language as a host-reviewed constraint."] });
  const leakage = /\b(?:protected_span_id|system prompt|<\|(?:system|assistant|user)\|>)\b/i.test(candidate);
  gates.push({ id: "output_safety", version: "1.0.0", status: leakage ? "fail" : "pass", hard: true, summary: leakage ? "Prompt or protected-ID leakage found" : "No prompt/control-token leakage found", failures: leakage ? [{ observed: "control_or_prompt_marker" }] : [], limitations: [] });
  gates.push({ id: "semantic_entailment", version: "unconfigured/1", status: "not_configured", hard: true, summary: "Semantic entailment is not configured in the deterministic core", failures: [], limitations: ["Strict policy must treat this required semantic gate as blocking when generation depends on semantic fidelity."] });
  return gates;
}

// src/diff/diff.ts
var tokens = (s) => s.match(/\s+|[^\s]+/g) ?? [];
function diff(source, candidate) {
  if (source.length + candidate.length > 8e4) return lineDiff(source, candidate);
  const a = tokens(source), b = tokens(candidate);
  if (a.length * b.length > 2e6) return lineDiff(source, candidate);
  const matches = hirschberg(a, b);
  let i = 0, j = 0, sp = 0, cp = 0, mi = 0;
  const out = [];
  const push = (type, text, ss, se, cs, ce) => {
    const last = out.at(-1);
    if (last?.type === type && last.source_end === ss && last.candidate_end === cs) {
      last.text += text;
      last.source_end = se;
      last.candidate_end = ce;
    } else out.push({ type, text, source_start: ss, source_end: se, candidate_start: cs, candidate_end: ce });
  };
  while (i < a.length || j < b.length) {
    const match = matches[mi];
    if (match && i === match[0] && j === match[1]) {
      const t = a[i];
      push("equal", t, sp, sp + t.length, cp, cp + t.length);
      sp += t.length;
      cp += t.length;
      i++;
      j++;
      mi++;
    } else if (j < b.length && (!match || j < match[1])) {
      const t = b[j];
      push("insert", t, sp, sp, cp, cp + t.length);
      cp += t.length;
      j++;
    } else {
      const t = a[i];
      push("delete", t, sp, sp + t.length, cp, cp);
      sp += t.length;
      i++;
    }
  }
  return { version: "lcs-token/1.0.0", source_hash: prefixedSha256(source), candidate_hash: prefixedSha256(candidate), change_count: out.filter((x) => x.type !== "equal").length, segments: out, fallback: false };
}
function rowScores(a, a0, a1, b, b0, b1, reverse = false) {
  const width = b1 - b0;
  let previous = new Uint32Array(width + 1), current = new Uint32Array(width + 1);
  for (let ai = 0; ai < a1 - a0; ai++) {
    const av = a[reverse ? a1 - 1 - ai : a0 + ai];
    for (let bj = 0; bj < width; bj++) {
      const bv = b[reverse ? b1 - 1 - bj : b0 + bj];
      current[bj + 1] = av === bv ? previous[bj] + 1 : Math.max(previous[bj + 1], current[bj]);
    }
    const swap = previous;
    previous = current;
    current = swap;
    current.fill(0);
  }
  return previous;
}
function hirschberg(a, b) {
  const out = [];
  const walk = (a0, a1, b0, b1) => {
    if (a0 >= a1 || b0 >= b1) return;
    if (a1 - a0 === 1) {
      for (let j = b0; j < b1; j++) if (a[a0] === b[j]) {
        out.push([a0, j]);
        break;
      }
      return;
    }
    const mid = a0 + a1 >> 1;
    let left = rowScores(a, a0, mid, b, b0, b1), right = rowScores(a, mid, a1, b, b0, b1, true);
    let split = 0, best = -1;
    for (let j = 0; j <= b1 - b0; j++) {
      const score = left[j] + right[b1 - b0 - j];
      if (score > best) {
        best = score;
        split = j;
      }
    }
    left = void 0;
    right = void 0;
    walk(a0, mid, b0, b0 + split);
    walk(mid, a1, b0 + split, b1);
  };
  walk(0, a.length, 0, b.length);
  return out;
}
function lineDiff(source, candidate) {
  const segments = source === candidate ? source ? [{ type: "equal", text: source, source_start: 0, source_end: source.length, candidate_start: 0, candidate_end: candidate.length }] : [] : [];
  if (source !== candidate) {
    if (source) segments.push({ type: "delete", text: source, source_start: 0, source_end: source.length, candidate_start: 0, candidate_end: 0 });
    if (candidate) segments.push({ type: "insert", text: candidate, source_start: source.length, source_end: source.length, candidate_start: 0, candidate_end: candidate.length });
  }
  return { version: "lcs-token/1.0.0", source_hash: prefixedSha256(source), candidate_hash: prefixedSha256(candidate), change_count: segments.filter((item2) => item2.type !== "equal").length, segments, fallback: true };
}

// src/provenance/c2pa-text.ts
var MAGIC = [67, 50, 80, 65, 84, 88, 84, 0];
var HEADER_BYTES = 13;
var SENTINEL = 65279;
var variationSelectorToByte = (codePoint) => codePoint >= 65024 && codePoint <= 65039 ? codePoint - 65024 : codePoint >= 917760 && codePoint <= 917999 ? codePoint - 917760 + 16 : null;
var isCredentialCarrier = (codePoint) => codePoint === SENTINEL || variationSelectorToByte(codePoint) !== null;
function detectC2paTextCredentials(text) {
  const found = [];
  for (let i = 0; i < text.length; ) {
    const codePoint = text.codePointAt(i);
    const width = codePoint > 65535 ? 2 : 1;
    if (codePoint !== SENTINEL) {
      i += width;
      continue;
    }
    const bytes = [];
    let cursor = i + width;
    while (cursor < text.length) {
      const next = text.codePointAt(cursor);
      const byte = variationSelectorToByte(next);
      if (byte === null) break;
      bytes.push(byte);
      cursor += next > 65535 ? 2 : 1;
    }
    if (bytes.length < HEADER_BYTES || !MAGIC.every((value, index) => bytes[index] === value)) {
      i += width;
      continue;
    }
    const manifestLength = (bytes[9] << 24 | bytes[10] << 16 | bytes[11] << 8 | bytes[12]) >>> 0;
    found.push({
      start_utf16: i,
      end_utf16: cursor,
      version: bytes[8],
      manifest_length: manifestLength,
      status: bytes.length >= HEADER_BYTES + manifestLength ? "ok" : "truncated"
    });
    i = cursor;
  }
  return found;
}
var withinCredential = (credentials, span) => credentials.some(
  (credential) => span.start_utf16 < credential.end_utf16 && span.end_utf16 > credential.start_utf16
);
var credentialNotice = (credentials) => {
  const one = credentials.length === 1;
  const truncated = credentials.some((credential) => credential.status === "truncated");
  return `This draft carries ${one ? "a C2PA content credential" : `${credentials.length} C2PA content credentials`} embedded in the text itself (C2PA 2.3 \xA7A.8, Unicode variation selectors)${truncated ? ", at least one of which is already incomplete" : ""}. The hidden characters listed below include ${one ? "its" : "their"} bytes. Removing them destroys the credential permanently, and it cannot be rebuilt from the visible text, so they are excluded from the automatic fix.`;
};

// src/fixes/preview.ts
function previewSafeFixes(source, findings, selectedFindingIds, protectedSpans = [], options = {}) {
  const credentials = options.allow_c2pa_credential_removal ? [] : detectC2paTextCredentials(source);
  const selected = new Set(selectedFindingIds), edits = [], skipped = [];
  for (const f of findings) {
    if (!selected.has(f.id)) continue;
    const raw = source.slice(f.span.start_utf16, f.span.end_utf16);
    if (!f.id.startsWith("unicode_") || f.span.end_utf16 <= f.span.start_utf16 || f.matched_text_hash !== prefixedSha256(raw)) {
      skipped.push({ id: f.id, reason: "invalid_finding_provenance" });
      continue;
    }
    if (f.code_point === "U+FEFF" && f.span.start_utf16 !== 0) {
      skipped.push({ id: f.id, reason: "invalid_bom_position" });
      continue;
    }
    if (f.fix === "review") {
      skipped.push({ id: f.id, reason: "user_review" });
      continue;
    }
    if (withinCredential(credentials, f.span)) {
      skipped.push({ id: f.id, reason: "c2pa_text_credential" });
      continue;
    }
    if (protectedSpans.some((p) => f.span.start_utf16 < p.end_utf16 && f.span.end_utf16 > p.start_utf16)) {
      skipped.push({ id: f.id, reason: "protected_span" });
      continue;
    }
    if (edits.some((e) => f.span.start_utf16 < e.end && f.span.end_utf16 > e.start)) {
      skipped.push({ id: f.id, reason: "overlapping_edit" });
      continue;
    }
    edits.push({ start: f.span.start_utf16, end: f.span.end_utf16, value: f.fix === "space" ? " " : "", id: f.id });
  }
  edits.sort((a, b) => b.start - a.start);
  let candidate = source;
  for (const e of edits) candidate = candidate.slice(0, e.start) + e.value + candidate.slice(e.end);
  return deepFreeze2({ source_hash: prefixedSha256(source), candidate_hash: prefixedSha256(candidate), candidate, applied_finding_ids: edits.map((e) => e.id).reverse(), skipped, diff: diff(source, candidate) });
}
function deepFreeze2(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze2(child);
  }
  return value;
}

// node_modules/canonicalize/lib/canonicalize.js
function hasLoneSurrogate(value) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 55296 && code <= 56319) {
      if (i === value.length - 1) {
        return true;
      }
      const next = value.charCodeAt(i + 1);
      if (!(next >= 56320 && next <= 57343)) {
        return true;
      }
      i++;
    } else if (code >= 56320 && code <= 57343) {
      return true;
    }
  }
  return false;
}
function canonicalize(object, seen = /* @__PURE__ */ new Set()) {
  if (typeof object === "number" && isNaN(object)) {
    throw new Error("NaN is not allowed");
  }
  if (typeof object === "number" && !isFinite(object)) {
    throw new Error("Infinity is not allowed");
  }
  if (typeof object === "string" && hasLoneSurrogate(object)) {
    throw new Error("Lone surrogate is not allowed");
  }
  if (object === null || typeof object !== "object") {
    return JSON.stringify(object);
  }
  if (typeof object.toJSON === "function") {
    if (seen.has(object)) {
      throw new Error("Circular reference detected");
    }
    seen.add(object);
    const result2 = canonicalize(object.toJSON(), seen);
    seen.delete(object);
    return result2;
  }
  if (seen.has(object)) {
    throw new Error("Circular reference detected");
  }
  seen.add(object);
  let result;
  if (Array.isArray(object)) {
    const values = object.map((cv) => {
      const value = cv === void 0 || typeof cv === "symbol" ? null : cv;
      return canonicalize(value, seen);
    });
    result = `[${values.join(",")}]`;
  } else {
    const parts = [];
    for (const key of Object.keys(object).sort()) {
      if (object[key] === void 0 || typeof object[key] === "symbol") {
        continue;
      }
      parts.push(`${canonicalize(key)}:${canonicalize(object[key], seen)}`);
    }
    result = `{${parts.join(",")}}`;
  }
  seen.delete(object);
  return result;
}

// src/receipts/build.ts
var payloadForHash = (receipt) => {
  const clone = structuredClone(receipt);
  delete clone.integrity?.payload_hash;
  delete clone.integrity?.signature;
  return clone;
};
var canonical = (value) => {
  const output = canonicalize(value);
  if (output === void 0) throw new Error("receipt_canonicalisation_failed");
  return output;
};
async function buildReceipt(input) {
  if (input.contains_content !== input.policy.retain_content) throw new Error("receipt_content_consent_mismatch");
  if (input.contains_content && input.rewrite && !input.rewrite.candidate_content) throw new Error("receipt_candidate_content_required");
  const sourceHash = prefixedSha256(input.source.content), normalisedHash = prefixedSha256(input.source.normalised_text ?? input.source.content);
  const source = { content_hash: sourceHash, normalised_hash: normalisedHash, content_type: input.source.content_type, language: input.source.language, word_count: (input.source.content.trim().match(/\S+/g) ?? []).length };
  if (input.contains_content) source.content = input.source.content;
  const rewrite = input.rewrite ? (() => {
    const { candidate_content, source_content: _callerSourceContent, ...metadata } = input.rewrite;
    return { ...metadata, ...input.contains_content ? { source_content: input.source.content, candidate_content } : {} };
  })() : null;
  const receipt = { schema_version: "1.0", contract_version: "1.0.0", product_version: input.product_version, receipt_id: input.receipt_id, created_at: input.created_at, source, policy: input.policy, methods: input.methods, rewrite, approval: input.approval, limitations: input.limitations, contains_content: input.contains_content, integrity: { canonicalisation: "RFC8785", payload_hash: "sha256:" + "0".repeat(64) } };
  receipt.integrity.payload_hash = prefixedSha256(canonical(payloadForHash(receipt)));
  return deepFreeze3(receipt);
}
function verifyReceipt(receipt) {
  const errors = validateReceiptShape(receipt);
  let expected = "";
  try {
    expected = prefixedSha256(canonical(payloadForHash(receipt)));
    if (expected !== receipt?.integrity?.payload_hash) errors.push("payload_hash_mismatch");
  } catch {
    errors.push("receipt_canonicalisation_failed");
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)], payload_hash: expected };
}
var isHash = (value) => typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
var isTime = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));
function validateReceiptShape(receipt) {
  const e = [];
  if (!receipt || typeof receipt !== "object") return ["invalid_receipt"];
  if (receipt.schema_version !== "1.0") e.push("unsupported_schema");
  if (typeof receipt.contract_version !== "string" || !receipt.contract_version.startsWith("1.")) e.push("contract_incompatible");
  for (const key of ["product_version", "receipt_id"]) if (typeof receipt[key] !== "string" || !receipt[key]) e.push(`missing_${key}`);
  if (!isTime(receipt.created_at)) e.push("invalid_created_at");
  if (!receipt.source || !isHash(receipt.source.content_hash) || !isHash(receipt.source.normalised_hash) || !Number.isInteger(receipt.source.word_count) || receipt.source.word_count < 0 || !["plain_text", "html", "markdown"].includes(receipt.source.content_type) || typeof receipt.source.language !== "string") e.push("invalid_source");
  if (!receipt.policy || typeof receipt.policy.retain_content !== "boolean" || !Array.isArray(receipt.policy.requested_checks) || !Array.isArray(receipt.policy.allowed_routes)) e.push("invalid_policy");
  if (typeof receipt.contains_content !== "boolean") e.push("invalid_contains_content");
  if (receipt.policy && receipt.contains_content !== receipt.policy.retain_content) e.push("receipt_content_consent_mismatch");
  if (receipt.source && receipt.contains_content !== Object.hasOwn(receipt.source, "content")) e.push("receipt_content_flag_mismatch");
  if (receipt.rewrite) {
    if (!isHash(receipt.rewrite.source_hash) || !isHash(receipt.rewrite.candidate_hash) || !receipt.rewrite.generator || !Array.isArray(receipt.rewrite.gates) || !(typeof receipt.rewrite.selected_candidate === "string" || receipt.rewrite.selected_candidate === null)) e.push("invalid_rewrite");
    const hasSource = Object.hasOwn(receipt.rewrite, "source_content"), hasCandidate = Object.hasOwn(receipt.rewrite, "candidate_content");
    if (receipt.contains_content ? !hasSource || !hasCandidate : hasSource || hasCandidate) e.push("rewrite_content_flag_mismatch");
  }
  if (!Array.isArray(receipt.methods)) e.push("invalid_methods");
  else for (const method2 of receipt.methods) {
    if (!method2 || typeof method2.id !== "string" || typeof method2.version !== "string" || !["pass", "attention", "fail", "inconclusive", "unsupported", "not_configured", "not_run", "error"].includes(method2.status) || !isTime(method2.started_at) || !isTime(method2.completed_at) || !Array.isArray(method2.limitations) || !method2.limitations.length) e.push("invalid_method");
  }
  if (!receipt.approval || !["whole", "sentences", "none"].includes(receipt.approval.scope)) e.push("invalid_approval");
  if (!Array.isArray(receipt.limitations) || !receipt.limitations.length) e.push("invalid_limitations");
  if (receipt.integrity?.canonicalisation !== "RFC8785" || !isHash(receipt.integrity?.payload_hash)) e.push("invalid_integrity");
  return e;
}
function deepFreeze3(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze3(child);
  }
  return value;
}

// src/capabilities.ts
var METHODS = Object.freeze([
  Object.freeze({ id: "unicode.invisible", category: "unicode", version: "unicode:2026.08.1", state: "available", privacy_routes: ["browser"], limitations: ["Controls can be legitimate in multilingual text."] }),
  Object.freeze({ id: "unicode.homoglyph", category: "unicode", version: "unicode:2026.08.1", state: "available", privacy_routes: ["browser"], limitations: ["Mixed scripts require contextual human review."] }),
  Object.freeze({ id: "style.patterns", category: "pattern", version: "en-gb:2026.08.1", state: "available", privacy_routes: ["browser"], limitations: ["Editorial pattern findings are not authorship evidence."] }),
  Object.freeze({ id: "watermark.anthropic", category: "watermark", version: "adapter-placeholder/1", state: "unsupported", privacy_routes: ["browser"], limitations: ["No official detector interface is available."] })
]);
var listMethods = () => METHODS.map((method2) => Object.freeze({ ...method2, privacy_routes: Object.freeze([...method2.privacy_routes]), limitations: Object.freeze([...method2.limitations]) }));
export {
  COMBINED_VERDICT_VERSION,
  EN_SIGNALS_PATTERN_VERSION,
  UNICODE_RULES_VERSION,
  assertAxisIndependence,
  buildReceipt,
  computeCombinedVerdict,
  computeEditorialSignals,
  credentialNotice,
  detectC2paTextCredentials,
  diff,
  extractProtectedSpans,
  inspect,
  inspectSignalsV2,
  inspectUnicode,
  isCredentialCarrier,
  listMethods,
  prefixedSha256,
  previewSafeFixes,
  projectVisibleText,
  registerPatternPack,
  sha256Hex,
  utf8Bytes,
  validateCandidate,
  variationSelectorToByte,
  verifyReceipt,
  withinCredential
};
