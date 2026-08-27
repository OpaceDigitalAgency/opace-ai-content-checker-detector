/**
 * SynthID-Text g-value computation and detection masks, ported to TypeScript
 * from the Apache-2.0 reference implementation by Google DeepMind:
 * google-deepmind/synthid-text, commit addb4a158143c7c6851a1308f78b89fceed59683
 * (src/synthid_text/logits_processing.py — compute_g_values, get_gvals,
 * compute_context_repetition_mask, compute_eos_token_mask).
 *
 * Known-key demo mathematics only: these functions demonstrate the published
 * SynthID-Text method with keys we choose. They cannot say anything about
 * Claude output without Anthropic's private key.
 */

import {
  accumulateHash,
  accumulateHashStep,
  arithmeticShiftRight64,
  computeHashIv,
  toSigned64,
} from './hashing.js';

export interface WatermarkKeyConfig {
  /** Human-readable identifier for the key set (e.g. a demo key name). */
  readonly id: string;
  /** One integer watermarking key per tournament layer (depth = keys.length). */
  readonly keys: readonly number[];
  /**
   * N-gram length: context of ngramLen - 1 tokens plus the candidate token.
   * Reference default 5 (H = 4 context window in the paper).
   */
  readonly ngramLen: number;
  /** Rolling repeated-context history size. Reference default 1024. */
  readonly contextHistorySize: number;
}

const NUM_APPLY_HASH = 12;
const GVAL_SHIFT = 64n / BigInt(NUM_APPLY_HASH); // 5, as in the reference

/**
 * Port of `get_gvals` for a single hashed ngram/key value: apply the LCG hash
 * 12 times (arithmetic-shifting by 5 bits after each application), then take
 * bit 30 — a Bernoulli(0.5) binary g-value.
 */
export function gValueFromNgramKey(ngramKey: bigint): 0 | 1 {
  let hash = ngramKey;
  for (let i = 0; i < NUM_APPLY_HASH; i += 1) {
    hash = arithmeticShiftRight64(accumulateHashStep(hash, 1n), GVAL_SHIFT);
  }
  // torch `(x >> 30) % 2` uses arithmetic shift and Python-style modulo
  // (result non-negative regardless of sign).
  const shifted = toSigned64(hash) >> 30n;
  const g = ((shifted % 2n) + 2n) % 2n;
  return g === 1n ? 1 : 0;
}

/**
 * Port of `compute_g_values` (single sequence): g-values for every complete
 * ngram window in `tokenIds`, one per watermarking key layer.
 *
 * Returns an array of length tokenIds.length - (ngramLen - 1); each entry is
 * a Uint8Array of length keys.length.
 */
export function computeGValues(
  tokenIds: readonly number[],
  config: WatermarkKeyConfig,
): Uint8Array[] {
  const { keys, ngramLen } = config;
  const numWindows = tokenIds.length - (ngramLen - 1);
  if (numWindows <= 0) return [];

  const iv = computeHashIv(keys);
  const keyBigints = keys.map((key) => BigInt(key));
  const tokenBigints = tokenIds.map((id) => BigInt(id));
  const result: Uint8Array[] = new Array(numWindows);

  for (let start = 0; start < numWindows; start += 1) {
    // Hash the full ngram (context + candidate token) onto the IV.
    let ngramHash = iv;
    for (let offset = 0; offset < ngramLen; offset += 1) {
      ngramHash = accumulateHashStep(ngramHash, tokenBigints[start + offset]!);
    }
    // Then fold in each layer key and extract that layer's g-value.
    const layerGValues = new Uint8Array(keys.length);
    for (let layer = 0; layer < keyBigints.length; layer += 1) {
      const layerKey = accumulateHashStep(ngramHash, keyBigints[layer]!);
      layerGValues[layer] = gValueFromNgramKey(layerKey);
    }
    result[start] = layerGValues;
  }
  return result;
}

/**
 * Port of `compute_context_repetition_mask` (single sequence).
 *
 * true = context not yet seen (position is scored); false = repeated context
 * (watermarking was skipped at generation time, so the detector must skip it
 * too). Matches the reference exactly, including the FIFO history of size
 * contextHistorySize initialised to zeros.
 */
export function computeContextRepetitionMask(
  tokenIds: readonly number[],
  config: WatermarkKeyConfig,
): boolean[] {
  const { ngramLen, contextHistorySize, keys } = config;
  const contextLen = ngramLen - 1;
  const numContexts = tokenIds.length - 1 - (contextLen - 1);
  if (numContexts <= 0) return [];

  const iv = computeHashIv(keys);
  const tokenBigints = tokenIds.map((id) => BigInt(id));

  // FIFO history of hashed contexts, newest first, initialised to zeros
  // exactly as the reference SynthIDState does.
  const history: bigint[] = new Array(contextHistorySize).fill(0n);
  const counts = new Map<bigint, number>([[0n, contextHistorySize]]);
  let head = 0; // index of the oldest entry (the one evicted next)

  const mask: boolean[] = new Array(numContexts);
  for (let i = 0; i < numContexts; i += 1) {
    let contextHash = iv;
    for (let offset = 0; offset < contextLen; offset += 1) {
      contextHash = accumulateHashStep(contextHash, tokenBigints[i + offset]!);
    }
    mask[i] = (counts.get(contextHash) ?? 0) === 0;

    // Push the new hash, evict the oldest (reference keeps the newest
    // contextHistorySize entries).
    const evicted = history[head]!;
    const evictedCount = counts.get(evicted)! - 1;
    if (evictedCount === 0) counts.delete(evicted);
    else counts.set(evicted, evictedCount);
    history[head] = contextHash;
    counts.set(contextHash, (counts.get(contextHash) ?? 0) + 1);
    head = (head + 1) % contextHistorySize;
  }
  return mask;
}

/**
 * Port of `compute_eos_token_mask` (single sequence): true up to (but not
 * including) the first EOS token, false from the first EOS onwards.
 * Length equals tokenIds.length; callers slice off the first ngramLen - 1
 * entries before combining with the repetition mask, as the reference does.
 */
export function computeEosTokenMask(
  tokenIds: readonly number[],
  eosTokenId: number,
): boolean[] {
  const mask: boolean[] = new Array(tokenIds.length).fill(true);
  const firstEos = tokenIds.indexOf(eosTokenId);
  if (firstEos !== -1) {
    for (let i = firstEos; i < tokenIds.length; i += 1) mask[i] = false;
  }
  return mask;
}

/**
 * Combined detection mask over scored ngram positions:
 * contextRepetitionMask AND eosMask[ngramLen - 1 ..], per the reference
 * detection recipe in the upstream README.
 */
export function computeCombinedMask(
  tokenIds: readonly number[],
  config: WatermarkKeyConfig,
  eosTokenId: number,
): boolean[] {
  const repetition = computeContextRepetitionMask(tokenIds, config);
  const eos = computeEosTokenMask(tokenIds, eosTokenId).slice(config.ngramLen - 1);
  return repetition.map((keep, index) => keep && (eos[index] ?? false));
}

/** Re-export for callers that need the raw ngram-key path (visualisation). */
export { accumulateHash, computeHashIv };
