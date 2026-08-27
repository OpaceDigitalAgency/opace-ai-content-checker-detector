/**
 * GPT-2 byte-level BPE tokeniser in TypeScript.
 *
 * The algorithm is adapted from OpenAI's reference encoder
 * (github.com/openai/gpt-2, src/encoder.py, MIT licence) so that arbitrary
 * pasted text can be tokenised in the browser and scored with the known-key
 * SynthID-Text demo detector. The vocabulary (vocab.json) and merge table
 * (merges.txt) are the standard GPT-2 assets published by OpenAI and
 * distributed via the Hugging Face `gpt2` model repository (MIT licence);
 * provenance and checksums are recorded in the package README and
 * THIRD_PARTY_NOTICES.md.
 *
 * Encoding parity with Python `transformers.GPT2Tokenizer` is asserted by the
 * package test suite against fixtures computed with the pinned Python stack.
 */

export interface Gpt2TokenizerData {
  /** Parsed contents of vocab.json: token string -> id. */
  readonly vocab: Record<string, number>;
  /** Raw contents of merges.txt. */
  readonly merges: string;
}

/** GPT-2 end-of-text token id (also used as EOS during detection masking). */
export const GPT2_EOS_TOKEN_ID = 50256; // '<|endoftext|>'

const EOT_STRING = '<|endoftext|>';

const PAT =
  /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

/**
 * OpenAI's reversible byte -> unicode-character table: printable characters
 * map to themselves, the rest are shifted into the 256+ range.
 */
function bytesToUnicode(): Map<number, string> {
  const bs: number[] = [];
  for (let b = '!'.charCodeAt(0); b <= '~'.charCodeAt(0); b += 1) bs.push(b);
  for (let b = 0xa1; b <= 0xac; b += 1) bs.push(b);
  for (let b = 0xae; b <= 0xff; b += 1) bs.push(b);
  const cs = bs.slice();
  let n = 0;
  for (let b = 0; b < 256; b += 1) {
    if (!bs.includes(b)) {
      bs.push(b);
      cs.push(256 + n);
      n += 1;
    }
  }
  const table = new Map<number, string>();
  bs.forEach((b, index) => table.set(b, String.fromCodePoint(cs[index]!)));
  return table;
}

export class Gpt2Tokenizer {
  private readonly encoder: Map<string, number>;
  private readonly decoder: Map<number, string>;
  private readonly bpeRanks: Map<string, number>;
  private readonly byteEncoder: Map<number, string>;
  private readonly byteDecoder: Map<string, number>;
  private readonly cache = new Map<string, readonly string[]>();
  private readonly utf8 = new TextEncoder();

  constructor(data: Gpt2TokenizerData) {
    this.encoder = new Map(Object.entries(data.vocab));
    this.decoder = new Map(
      [...this.encoder.entries()].map(([token, id]) => [id, token]),
    );
    this.bpeRanks = new Map();
    const lines = data.merges.split('\n');
    let rank = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#version')) continue;
      this.bpeRanks.set(trimmed, rank);
      rank += 1;
    }
    this.byteEncoder = bytesToUnicode();
    this.byteDecoder = new Map(
      [...this.byteEncoder.entries()].map(([b, ch]) => [ch, b]),
    );
  }

  /**
   * Tokenise text into GPT-2 token ids. Matches Python
   * `transformers.GPT2Tokenizer` behaviour, including mapping the literal
   * `<|endoftext|>` string to its special token id (50256).
   */
  encode(text: string): number[] {
    const ids: number[] = [];
    const segments = text.split(EOT_STRING);
    segments.forEach((segment, index) => {
      if (index > 0) ids.push(GPT2_EOS_TOKEN_ID);
      this.encodeOrdinary(segment, ids);
    });
    return ids;
  }

  /** Encode plain text (no special-token handling), appending into `ids`. */
  private encodeOrdinary(text: string, ids: number[]): void {
    for (const match of text.matchAll(PAT)) {
      const piece = match[0];
      const bytes = this.utf8.encode(piece);
      let mapped = '';
      for (const byte of bytes) mapped += this.byteEncoder.get(byte)!;
      for (const token of this.bpe(mapped)) {
        const id = this.encoder.get(token);
        if (id === undefined) {
          throw new Error(`GPT-2 BPE produced unknown token: ${JSON.stringify(token)}`);
        }
        ids.push(id);
      }
    }
  }

  /** Decode GPT-2 token ids back to text. */
  decode(ids: readonly number[]): string {
    let mapped = '';
    for (const id of ids) {
      const token = this.decoder.get(id);
      if (token === undefined) throw new Error(`Unknown GPT-2 token id: ${id}`);
      mapped += token;
    }
    const bytes = new Uint8Array(mapped.length);
    let length = 0;
    for (const ch of mapped) {
      const byte = this.byteDecoder.get(ch);
      if (byte === undefined) throw new Error(`Unknown byte symbol: ${ch}`);
      bytes[length] = byte;
      length += 1;
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(
      bytes.subarray(0, length),
    );
  }

  /** Byte-pair-encode one pre-tokenised piece (already byte-mapped). */
  private bpe(token: string): readonly string[] {
    const cached = this.cache.get(token);
    if (cached) return cached;

    let word: string[] = [...token];
    if (word.length <= 1) {
      this.cache.set(token, word);
      return word;
    }

    for (;;) {
      let bestRank = Number.POSITIVE_INFINITY;
      let bestPair = '';
      for (let i = 0; i < word.length - 1; i += 1) {
        const pair = `${word[i]} ${word[i + 1]}`;
        const rank = this.bpeRanks.get(pair);
        if (rank !== undefined && rank < bestRank) {
          bestRank = rank;
          bestPair = pair;
        }
      }
      if (bestPair === '') break;

      const spaceIndex = bestPair.lastIndexOf(' ');
      // Symbols never contain spaces after byte mapping (0x20 maps to Ġ),
      // but split on the separator we inserted above regardless.
      const first = bestPair.slice(0, spaceIndex);
      const second = bestPair.slice(spaceIndex + 1);
      const merged: string[] = [];
      let i = 0;
      while (i < word.length) {
        if (i < word.length - 1 && word[i] === first && word[i + 1] === second) {
          merged.push(first + second);
          i += 2;
        } else {
          merged.push(word[i]!);
          i += 1;
        }
      }
      word = merged;
      if (word.length === 1) break;
    }

    this.cache.set(token, word);
    return word;
  }
}
