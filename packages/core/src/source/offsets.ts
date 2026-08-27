export interface OffsetRange { [key:string]:unknown; start_utf16: number; end_utf16: number; start_codepoint: number; end_codepoint: number }

export function utf16ToCodePointOffset(text: string, offset: number): number {
  if (!Number.isInteger(offset) || offset < 0 || offset > text.length) throw new RangeError("invalid_utf16_offset");
  if (offset > 0 && offset < text.length && /[\uD800-\uDBFF]/.test(text[offset - 1]!) && /[\uDC00-\uDFFF]/.test(text[offset]!)) throw new RangeError("split_surrogate");
  return Array.from(text.slice(0, offset)).length;
}

export function rangeFromUtf16(text: string, start: number, end: number): OffsetRange {
  if (end <= start) throw new RangeError("empty_or_reversed_range");
  return { start_utf16: start, end_utf16: end, start_codepoint: utf16ToCodePointOffset(text, start), end_codepoint: utf16ToCodePointOffset(text, end) };
}
