/**
 * The Opace known-key SynthID-Text demo detector.
 *
 * Runs the published detection mathematics (Google DeepMind's Apache-2.0
 * reference implementation, ported faithfully to TypeScript) over GPT-2 token
 * ids with keys we chose and published. A high score means "watermarked with
 * THIS demo key"; a score near 0.5 means "indistinguishable from
 * unwatermarked under THIS key" and never proves human authorship. This
 * mathematics cannot say anything about Claude output without Anthropic's
 * private key.
 */

import {
  computeCombinedMask,
  computeContextRepetitionMask,
  computeEosTokenMask,
  computeGValues,
  type WatermarkKeyConfig,
} from './gvalues.js';
import { meanScores, pValueFromZ, zScore } from './scoring.js';
import { GPT2_EOS_TOKEN_ID } from './tokenizer/gpt2.js';

export interface ScoreOptions {
  /** EOS token id used for the post-EOS mask. Defaults to GPT-2's 50256. */
  readonly eosTokenId?: number;
}

export interface ScoreResult {
  /** Mean g-value over scored positions and layers. Null value 0.5. */
  readonly meanG: number;
  /** Weighted mean with the reference 10 -> 1 layer weight ramp. */
  readonly weightedMeanG: number;
  /**
   * z-score of meanG against the unwatermarked null (0.5), under the
   * approximate assumption of independent Bernoulli(0.5) g-values.
   */
  readonly z: number;
  /**
   * One-sided p-value for "at least this watermarked-looking by chance".
   * Near 0.5 or above means the text is statistically indistinguishable from
   * unwatermarked under the supplied key.
   */
  readonly pValue: number;
  /** Per-position mean g-value across layers (NaN where masked). */
  readonly perTokenG: readonly number[];
  /** Number of scored (unmasked) ngram positions. */
  readonly scoredPositions: number;
  /** Number of complete ngram windows in the input. */
  readonly totalPositions: number;
  /** Watermarking depth (number of layer keys) used. */
  readonly depth: number;
  /** Key set id the text was scored under. */
  readonly keyId: string;
  /**
   * Honest-framing string for UIs. Always states the demo-key boundary; never
   * implies anything about Anthropic/Claude production watermarks.
   */
  readonly disclaimer: string;
}

export const SCORE_DISCLAIMER =
  'Known-key demo experiment: this score applies the published SynthID-Text ' +
  'mathematics with a public Opace demo key. It does not run Google’s or ' +
  'Anthropic’s production detectors, cannot say anything about Claude ' +
  'output without Anthropic’s private key, and a score near 0.5 never ' +
  'proves text is human-written.';

/**
 * Score a token-id sequence under one watermark key configuration.
 *
 * Pure function: no network, no model, deterministic for a given input.
 * "Wrong key" behaviour is simply calling this with a different key — the
 * mathematics is identical and the score collapses to noise around 0.5.
 */
export function score(
  tokenIds: readonly number[],
  key: WatermarkKeyConfig,
  options: ScoreOptions = {},
): ScoreResult {
  const eosTokenId = options.eosTokenId ?? GPT2_EOS_TOKEN_ID;
  const gValues = computeGValues(tokenIds, key);
  const mask = computeCombinedMask(tokenIds, key, eosTokenId);
  const { meanG, weightedMeanG, scoredPositions } = meanScores(gValues, mask);
  const depth = key.keys.length;
  const z = zScore(meanG, scoredPositions, depth);

  const perTokenG = gValues.map((layers, index) => {
    if (!mask[index]) return Number.NaN;
    let sum = 0;
    for (const g of layers) sum += g;
    return sum / layers.length;
  });

  return {
    meanG,
    weightedMeanG,
    z,
    pValue: pValueFromZ(z),
    perTokenG,
    scoredPositions,
    totalPositions: gValues.length,
    depth,
    keyId: key.id,
    disclaimer: SCORE_DISCLAIMER,
  };
}

export {
  computeCombinedMask,
  computeContextRepetitionMask,
  computeEosTokenMask,
  computeGValues,
};
