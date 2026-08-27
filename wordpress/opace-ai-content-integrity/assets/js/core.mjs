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
function utf16ToCodePointOffset(text, offset) {
  if (!Number.isInteger(offset) || offset < 0 || offset > text.length) throw new RangeError("invalid_utf16_offset");
  if (offset > 0 && offset < text.length && /[\uD800-\uDBFF]/.test(text[offset - 1]) && /[\uDC00-\uDFFF]/.test(text[offset])) throw new RangeError("split_surrogate");
  return Array.from(text.slice(0, offset)).length;
}
function rangeFromUtf16(text, start, end) {
  if (end <= start) throw new RangeError("empty_or_reversed_range");
  return { start_utf16: start, end_utf16: end, start_codepoint: utf16ToCodePointOffset(text, start), end_codepoint: utf16ToCodePointOffset(text, end) };
}

// src/unicode/inspect.ts
var RULES = /* @__PURE__ */ new Map([
  [65279, { name: "BYTE ORDER MARK", severity: "low", fix: "remove", message: "A byte-order mark is present." }],
  [8203, { name: "ZERO WIDTH SPACE", severity: "medium", fix: "remove", message: "An invisible zero-width space is present." }],
  [8288, { name: "WORD JOINER", severity: "medium", fix: "remove", message: "An invisible word joiner is present." }],
  [173, { name: "SOFT HYPHEN", severity: "low", fix: "remove", message: "A discretionary soft hyphen is present." }],
  [160, { name: "NO-BREAK SPACE", severity: "note", fix: "space", message: "A non-breaking space is present." }],
  [8201, { name: "THIN SPACE", severity: "note", fix: "space", message: "A thin space is present." }],
  [65533, { name: "REPLACEMENT CHARACTER", severity: "high", fix: "review", message: "A replacement character may indicate damaged text." }]
]);
var BIDI = /* @__PURE__ */ new Set([8234, 8235, 8236, 8237, 8238, 8294, 8295, 8296, 8297]);
function inspectUnicode(text) {
  const findings = [];
  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i);
    const width = cp > 65535 ? 2 : 1;
    const rule = RULES.get(cp) ?? (BIDI.has(cp) ? { name: "BIDIRECTIONAL CONTROL", severity: "medium", fix: "review", message: "A bidirectional formatting control is present." } : void 0);
    if (rule) {
      const raw = text.slice(i, i + width);
      findings.push({ id: `unicode_${i}_${cp.toString(16)}`, code_point: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`, name: rule.name, severity: rule.severity, message: rule.message, suggestion: rule.fix === "review" ? "Review the surrounding script and direction before editing." : "Preview the deterministic change before approval.", span: rangeFromUtf16(text, i, i + width), matched_text_hash: prefixedSha256(raw), fix: rule.fix, limitations: ["Unicode controls can be legitimate in multilingual text; this finding is not evidence of authorship."] });
    }
    if (cp >= 55296 && cp <= 57343) {
      findings.push({ id: `unicode_${i}_surrogate`, code_point: `U+${cp.toString(16).toUpperCase()}`, name: "UNPAIRED SURROGATE", severity: "high", message: "An unpaired UTF-16 surrogate cannot be encoded as valid UTF-8.", suggestion: "Replace or remove it after checking the source encoding.", span: { start_utf16: i, end_utf16: i + 1, start_codepoint: Array.from(text.slice(0, i)).length, end_codepoint: Array.from(text.slice(0, i)).length + 1 }, matched_text_hash: prefixedSha256("\uFFFD"), fix: "review", limitations: ["The displayed replacement may differ from the original invalid code unit."] });
    }
    i += width;
  }
  const tokens2 = [...text.matchAll(/[\p{L}\p{N}_-]+/gu)];
  const confusable = /* @__PURE__ */ new Map([[1072, "CYRILLIC SMALL LETTER A"], [1077, "CYRILLIC SMALL LETTER IE"], [1086, "CYRILLIC SMALL LETTER O"], [1088, "CYRILLIC SMALL LETTER ER"], [1089, "CYRILLIC SMALL LETTER ES"], [1093, "CYRILLIC SMALL LETTER HA"], [1091, "CYRILLIC SMALL LETTER U"]]);
  for (const token of tokens2) {
    const value = token[0];
    if (!/\p{Script=Latin}/u.test(value) || !/\p{Script=Cyrillic}|\p{Script=Greek}/u.test(value)) continue;
    let local = 0;
    for (const char of value) {
      const cp = char.codePointAt(0), name = confusable.get(cp);
      if (name) {
        const start = token.index + local;
        findings.push({ id: `unicode_${start}_homoglyph_${cp.toString(16)}`, code_point: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`, name, severity: "medium", message: "A mixed-script token contains a character visually confusable with Latin text.", suggestion: "Verify the intended spelling; homoglyphs are never replaced automatically.", span: rangeFromUtf16(text, start, start + char.length), matched_text_hash: prefixedSha256(char), fix: "review", limitations: ["Mixed scripts can be legitimate in names and multilingual text; this is contextual evidence only."] });
      }
      local += char.length;
    }
  }
  return findings;
}

// src/protected/extract.ts
var RULES2 = [
  ["code", /```[\s\S]*?```|`[^`\n]+`/g],
  ["url", /https?:\/\/[^\s<>)\]]+/g],
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ["citation", /\[[0-9]+\]|\([A-Z][A-Za-z-]+,?\s+\d{4}[a-z]?\)/g],
  ["quote", /[“"][^”"\n]+[”"]/g],
  ["currency", /(?:£|\$|€)\s?\d[\d,]*(?:\.\d+)?/g],
  ["date", /\b(?:\d{1,2}\s+[A-Z][a-z]+\s+\d{4}|\d{4}-\d{2}-\d{2})\b/g],
  ["time", /\b\d{1,2}:\d{2}(?:\s?[ap]m)?\b/gi],
  ["unit", /\b\d+(?:\.\d+)?\s?(?:kg|g|km|m|cm|mm|GB|MB|%|°C)\b/g],
  ["number", /\b\d[\d,]*(?:\.\d+)?%?\b/g]
];
function extractProtectedSpans(source, policy = {}) {
  const hash = source.content_hash ?? prefixedSha256(source.content);
  const spans = [];
  const add = (text, start, kind, origin, protection = "exact") => {
    const r = rangeFromUtf16(source.content, start, start + text.length);
    spans.push({ id: `ps_${kind}_${start}_${prefixedSha256(text).slice(7, 15)}`, kind, text, ...r, normalised_value: text, policy: protection, source: origin, confidence: null, content_hash: hash });
  };
  for (const [kind, regex] of RULES2) {
    regex.lastIndex = 0;
    for (const m of source.content.matchAll(regex)) add(m[0], m.index, kind, "deterministic", kind === "date" || kind === "number" ? "equivalent_format" : "exact");
  }
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

// src/patterns/en-gb-v1.ts
var EN_GB_PATTERN_VERSION = "en-gb:2026.08.1";
var PHRASES = ["in today's rapidly evolving landscape", "game-changer", "in conclusion", "it is important to note", "delve into"];
var finding = (text, start, rule, severity, message, suggestion, evidence) => ({ rule_id: rule, rule_version: EN_GB_PATTERN_VERSION, severity, message, suggestion, span: rangeFromUtf16(text, start, start + String(evidence.matched ?? text.slice(start, start + 1)).length), matched_text_hash: prefixedSha256(String(evidence.matched ?? "")), evidence });
function inspectPatterns(text) {
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

// src/inspect.ts
var limits = (message) => [message, "Authorship cannot be proved from this check."];
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
  const methods = [];
  for (const id of request.checks) {
    const methodStarted = now();
    if (id.startsWith("unicode.")) {
      methods.push(method(id, "unicode", "Opace deterministic Unicode inspection", "unicode:2026.08.1", unicode.length ? "attention" : "pass", unicode.map((x) => ({ type: "unicode_finding", ...x })), limits("Unicode controls can be legitimate in multilingual text."), methodStarted, now(), "browser"));
    } else if (id === "style.patterns") {
      methods.push(method(id, "pattern", "Opace writing-pattern rules", "en-gb:2026.08.1", patternFindings.length ? "attention" : "pass", patternFindings.map((x) => ({ type: "pattern_finding", rule_id: x.rule_id, span: x.span })), limits("Writing patterns are editorial prompts, not detector or watermark evidence."), methodStarted, now(), "browser"));
    } else if (id === "watermark.anthropic") {
      methods.push({ ...method(id, "watermark", "Anthropic official text-watermark detector", "unavailable-2026-08-26", "unsupported", [], ["No official detector call was available. Local style or public SynthID tests are not substitutes."], methodStarted, now(), "browser"), availability: "not_available", native_outcome: "not_available" });
    } else methods.push(method(id, "detector", id, "unsupported/1", "unsupported", [], ["This requested method is not implemented in the deterministic browser core."], methodStarted, now(), "browser"));
  }
  const summary = { pass: 0, attention: 0, fail: 0, inconclusive: 0, unsupported: 0, not_configured: 0, not_run: 0, error: 0 };
  for (const item of methods) summary[item.status]++;
  progress("complete");
  const result = { schema_version: "1.0", contract_version: "1.0.0", request_id: request.request_id, analysis_id: options.analysisId?.() ?? `analysis_${sourceHash.slice(7, 23)}`, source: { content_hash: sourceHash, normalised_hash: prefixedSha256(projection.text.normalize("NFC")), content_type: request.source.content_type, language: request.source.language, word_count: (projection.text.trim().match(/\S+/g) ?? []).length }, protected_spans: protectedSpans, pattern_findings: patternFindings, methods, summary, limitations: ["Authorship cannot be proved from these checks.", ...projection.limitations], started_at: started, completed_at: now() };
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
  return { version: "lcs-token/1.0.0", source_hash: prefixedSha256(source), candidate_hash: prefixedSha256(candidate), change_count: segments.filter((item) => item.type !== "equal").length, segments, fallback: true };
}

// src/fixes/preview.ts
function previewSafeFixes(source, findings, selectedFindingIds, protectedSpans = []) {
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
  buildReceipt,
  diff,
  extractProtectedSpans,
  inspect,
  inspectUnicode,
  listMethods,
  prefixedSha256,
  previewSafeFixes,
  projectVisibleText,
  registerPatternPack,
  sha256Hex,
  utf8Bytes,
  validateCandidate,
  verifyReceipt
};
