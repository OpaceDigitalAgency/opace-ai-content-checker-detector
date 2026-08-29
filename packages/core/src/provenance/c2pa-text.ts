/**
 * C2PA text content credentials — detection only, never removal.
 *
 * C2PA Specification 2.3 (December 2025) added §A.8 "Embedding Manifests into
 * Unstructured Text": a C2PA Manifest Store carried inside the text itself as
 * non-rendering Unicode variation selectors, so that Content Credentials
 * survive a copy and paste. The spec is explicit about the carrier set:
 *
 *   "Unicode variation selectors (U+FE00-U+FE0F and U+E0100-U+E01EF) are used
 *    because they are specifically designed to be visually non-rendering while
 *    remaining part of the valid Unicode character set."
 *                                    — C2PA Specification 2.4, §A.8.2
 *
 * Those are the same code points this tool's hidden-character check flags, and
 * U+FE00-U+FE0F carry fix:"remove", so the safe-fix path would strip every byte
 * of the manifest whose value is 0-15. That silently breaks the magic number
 * and the credential stops being detectable at all — not reported as corrupt,
 * simply gone. This module exists so the checker can see a credential before it
 * is offered a fix that would destroy it.
 *
 * Nothing here weakens the hidden-character detection. Every carrier is still
 * found, still counted and still shown. The credential's characters are made
 * ineligible for the automatic fix, and removing them becomes a separate,
 * deliberate choice.
 */

/** §A.8.2.2 — magic = 0x4332504154585400, "C2PATXT\0". */
const MAGIC = [0x43, 0x32, 0x50, 0x41, 0x54, 0x58, 0x54, 0x00] as const;
/** §A.8.2.2 — 8-byte magic, 1-byte version, 4-byte big-endian manifestLength. */
const HEADER_BYTES = 13;
/** §A.8.4.1 — the wrapper is prefixed with a single U+FEFF. */
const SENTINEL = 0xfeff;

/** §A.8.3.2 — variationSelectorToByte. Returns null for anything else. */
export const variationSelectorToByte = (codePoint: number): number | null =>
  codePoint >= 0xfe00 && codePoint <= 0xfe0f
    ? codePoint - 0xfe00
    : codePoint >= 0xe0100 && codePoint <= 0xe01ef
      ? codePoint - 0xe0100 + 16
      : null;

/** True for any code point §A.8 can use as a manifest carrier, sentinel included. */
export const isCredentialCarrier = (codePoint: number): boolean =>
  codePoint === SENTINEL || variationSelectorToByte(codePoint) !== null;

export interface C2paTextCredential {
  /** UTF-16 offsets covering the U+FEFF sentinel and the whole wrapper. */
  start_utf16: number;
  end_utf16: number;
  /** §A.8.2.3 version field. */
  version: number;
  /** §A.8.2.3 manifestLength, in bytes. */
  manifest_length: number;
  /**
   * "ok" when the declared manifest is complete;
   * "truncated" maps to the spec's manifest.text.corruptedWrapper condition.
   */
  status: "ok" | "truncated";
}

/**
 * §A.8.4.2 detection algorithm: scan for U+FEFF, read the contiguous run of
 * variation selectors that follows, decode the first eight bytes and compare
 * them with the magic number.
 */
export function detectC2paTextCredentials(text: string): C2paTextCredential[] {
  const found: C2paTextCredential[] = [];
  for (let i = 0; i < text.length; ) {
    const codePoint = text.codePointAt(i)!;
    const width = codePoint > 0xffff ? 2 : 1;
    if (codePoint !== SENTINEL) {
      i += width;
      continue;
    }
    const bytes: number[] = [];
    let cursor = i + width;
    while (cursor < text.length) {
      const next = text.codePointAt(cursor)!;
      const byte = variationSelectorToByte(next);
      if (byte === null) break;
      bytes.push(byte);
      cursor += next > 0xffff ? 2 : 1;
    }
    if (bytes.length < HEADER_BYTES || !MAGIC.every((value, index) => bytes[index] === value)) {
      i += width;
      continue;
    }
    const manifestLength =
      ((bytes[9]! << 24) | (bytes[10]! << 16) | (bytes[11]! << 8) | bytes[12]!) >>> 0;
    found.push({
      start_utf16: i,
      end_utf16: cursor,
      version: bytes[8]!,
      manifest_length: manifestLength,
      status: bytes.length >= HEADER_BYTES + manifestLength ? "ok" : "truncated",
    });
    i = cursor;
  }
  return found;
}

/** True when the span touches any detected credential. */
export const withinCredential = (
  credentials: readonly C2paTextCredential[],
  span: { start_utf16: number; end_utf16: number },
): boolean =>
  credentials.some(
    (credential) => span.start_utf16 < credential.end_utf16 && span.end_utf16 > credential.start_utf16,
  );

export const credentialNotice = (credentials: readonly C2paTextCredential[]): string => {
  const one = credentials.length === 1;
  const truncated = credentials.some((credential) => credential.status === "truncated");
  return `This draft carries ${one ? "a C2PA content credential" : `${credentials.length} C2PA content credentials`} embedded in the text itself (C2PA 2.3 §A.8, Unicode variation selectors)${truncated ? ", at least one of which is already incomplete" : ""}. The hidden characters listed below include ${one ? "its" : "their"} bytes. Removing them destroys the credential permanently, and it cannot be rebuilt from the visible text, so they are excluded from the automatic fix.`;
};
