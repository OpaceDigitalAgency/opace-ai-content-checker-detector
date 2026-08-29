export interface OffsetRange { [key:string]:unknown; start_utf16: number; end_utf16: number; start_codepoint: number; end_codepoint: number }

const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

/**
 * True when `offset` falls between the two halves of a well-formed surrogate
 * pair. A lone surrogate never satisfies both sides, so unpaired input is
 * deliberately not treated as a split boundary here.
 */
function splitsSurrogatePair(text: string, offset: number): boolean {
  return offset > 0 && offset < text.length &&
    isHighSurrogate(text.charCodeAt(offset - 1)) && isLowSurrogate(text.charCodeAt(offset));
}

/**
 * Snap a UTF-16 span outward to code-point boundaries.
 *
 * A boundary landing inside a surrogate pair is moved to the edge of the
 * enclosing pair: `start` snaps down to the high surrogate, `end` snaps up past
 * the low surrogate. The span therefore always covers whole code points and can
 * never cut an astral character in half. Non-astral text is untouched, and the
 * result is never narrower than the input, so a finding is never dropped.
 *
 * Call this before slicing the matched text at a span-construction site, so the
 * slice, its hash and the recorded offsets all describe the same characters.
 */
export function alignUtf16Range(text: string, start: number, end: number): [number, number] {
  return [splitsSurrogatePair(text, start) ? start - 1 : start, splitsSurrogatePair(text, end) ? end + 1 : end];
}

/**
 * Count the code points preceding a UTF-16 offset.
 *
 * This stays strict: an offset inside a surrogate pair has no meaningful
 * code-point index, so it throws rather than inventing one. Callers that build
 * spans go through `alignUtf16Range`/`rangeFromUtf16`, which snap the boundary
 * out to the enclosing pair first, so the throw is now reserved for genuinely
 * invalid input rather than for ordinary emoji-bearing text. Unpaired
 * surrogates are rejected earlier by `inspect()` validation
 * (`invalid_unicode_unpaired_surrogate`) and are not a split boundary here, so
 * the alignment path only ever sees well-formed pairs.
 */
export function utf16ToCodePointOffset(text: string, offset: number): number {
  if (!Number.isInteger(offset) || offset < 0 || offset > text.length) throw new RangeError("invalid_utf16_offset");
  if (splitsSurrogatePair(text, offset)) throw new RangeError("split_surrogate");
  return Array.from(text.slice(0, offset)).length;
}

export function rangeFromUtf16(text: string, start: number, end: number): OffsetRange {
  if (end <= start) throw new RangeError("empty_or_reversed_range");
  const [alignedStart, alignedEnd] = alignUtf16Range(text, start, end);
  return { start_utf16: alignedStart, end_utf16: alignedEnd, start_codepoint: utf16ToCodePointOffset(text, alignedStart), end_codepoint: utf16ToCodePointOffset(text, alignedEnd) };
}
