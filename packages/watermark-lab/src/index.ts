/**
 * @opace/watermark-lab — real SynthID-Text known-key demo detector.
 *
 * A faithful TypeScript port of the detection path of Google DeepMind's
 * Apache-2.0 SynthID-Text reference implementation
 * (google-deepmind/synthid-text, commit
 * addb4a158143c7c6851a1308f78b89fceed59683), plus a GPT-2 byte-level BPE
 * tokeniser so arbitrary pasted text can be scored in the browser.
 *
 * Claim boundary (BRIEF §5): every result from this package is a known-key
 * demo experiment with public Opace demo keys. Nothing here detects,
 * verifies or removes Google's or Anthropic's production watermarks, and
 * this mathematics cannot say anything about Claude output without
 * Anthropic's private key. A score near 0.5 never proves human authorship.
 */

export {
  accumulateHash,
  accumulateHashStep,
  arithmeticShiftRight64,
  computeHashIv,
  sha256,
  toSigned64,
  toUnsigned64,
  LCG_MULTIPLIER,
  LCG_INCREMENT,
  INT64_MAX,
} from './hashing.js';

export {
  computeGValues,
  computeContextRepetitionMask,
  computeEosTokenMask,
  computeCombinedMask,
  gValueFromNgramKey,
  type WatermarkKeyConfig,
} from './gvalues.js';

export {
  meanScores,
  zScore,
  pValueFromZ,
  erfc,
  type MeanScores,
} from './scoring.js';

export {
  score,
  SCORE_DISCLAIMER,
  type ScoreOptions,
  type ScoreResult,
} from './detector.js';

export {
  DEMO_KEYS,
  DEMO_KEY_IDS,
  DEMO_DEPTH,
  DEFAULT_NGRAM_LEN,
  DEFAULT_CONTEXT_HISTORY_SIZE,
} from './keys.js';

export { Gpt2Tokenizer, GPT2_EOS_TOKEN_ID } from './tokenizer/gpt2.js';

import { Gpt2Tokenizer } from './tokenizer/gpt2.js';
import { GPT2_MERGES_TXT, GPT2_VOCAB_JSON } from './tokenizer/gpt2-data.js';

let sharedTokenizer: Gpt2Tokenizer | undefined;

/** Lazily constructed shared GPT-2 tokeniser over the embedded assets. */
export function getTokenizer(): Gpt2Tokenizer {
  if (!sharedTokenizer) {
    sharedTokenizer = new Gpt2Tokenizer({
      vocab: JSON.parse(GPT2_VOCAB_JSON) as Record<string, number>,
      merges: GPT2_MERGES_TXT,
    });
  }
  return sharedTokenizer;
}

/** Tokenise text to GPT-2 token ids with the embedded tokeniser assets. */
export function tokenise(text: string): number[] {
  return getTokenizer().encode(text);
}

/** Alias for American-English callers. */
export const tokenize = tokenise;

/** Version block recorded with every fixture manifest and receipt. */
export const WATERMARK_LAB_VERSIONS = {
  package: '0.1.0',
  synthidTextReferenceCommit: 'addb4a158143c7c6851a1308f78b89fceed59683',
  synthidTextReferenceLicence: 'Apache-2.0',
  gpt2VocabSha256:
    '196139668be63f3b5d6574427317ae82f612a97c5d1cdaf36ed2256dbf636783',
  gpt2MergesSha256:
    '1ce1664773c50f3e0cc8842619a93edc4624525b728b188a9e0be33b7726adc5',
} as const;
