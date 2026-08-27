/**
 * SynthID-Text detection scoring: Mean and Weighted Mean scores ported from
 * the Apache-2.0 reference implementation by Google DeepMind
 * (google-deepmind/synthid-text, src/synthid_text/detector_mean.py, commit
 * addb4a158143c7c6851a1308f78b89fceed59683), plus a frequentist z-score and
 * one-sided p-value against the unwatermarked null (mean g-value = 0.5) so a
 * UI can present uncertainty honestly.
 *
 * These are known-key demo statistics. A score near 0.5 means
 * "indistinguishable from unwatermarked under THIS key" — it never proves
 * text is human-written, and none of this can say anything about Claude
 * output without Anthropic's private key.
 */

export interface MeanScores {
  /** Mean of unmasked g-values across positions and layers. Null value 0.5. */
  readonly meanG: number;
  /**
   * Weighted mean with linearly decreasing layer weights 10 → 1 (normalised
   * to sum to the watermarking depth), as in the reference — earlier
   * tournament layers carry more watermark signal.
   */
  readonly weightedMeanG: number;
  /** Number of scored (unmasked) ngram positions. */
  readonly scoredPositions: number;
}

/**
 * Port of `detector_mean.mean_score` and `weighted_mean_score` for a single
 * sequence: gValues[t] is one Uint8Array of per-layer g-values; mask[t]
 * selects which positions are scored.
 */
export function meanScores(
  gValues: readonly Uint8Array[],
  mask: readonly boolean[],
): MeanScores {
  const depth = gValues[0]?.length ?? 0;
  let unmasked = 0;
  let sum = 0;
  let weightedSum = 0;

  // linspace(10, 1, depth), normalised so the weights sum to depth.
  const weights = new Float64Array(depth);
  if (depth === 1) {
    weights[0] = 1;
  } else if (depth > 1) {
    let total = 0;
    for (let layer = 0; layer < depth; layer += 1) {
      weights[layer] = 10 - (9 * layer) / (depth - 1);
      total += weights[layer]!;
    }
    for (let layer = 0; layer < depth; layer += 1) {
      weights[layer] = (weights[layer]! * depth) / total;
    }
  }

  for (let position = 0; position < gValues.length; position += 1) {
    if (!mask[position]) continue;
    unmasked += 1;
    const layers = gValues[position]!;
    for (let layer = 0; layer < depth; layer += 1) {
      if (layers[layer] === 1) {
        sum += 1;
        weightedSum += weights[layer]!;
      }
    }
  }

  if (unmasked === 0 || depth === 0) {
    return { meanG: Number.NaN, weightedMeanG: Number.NaN, scoredPositions: 0 };
  }
  const denominator = depth * unmasked;
  return {
    meanG: sum / denominator,
    weightedMeanG: weightedSum / denominator,
    scoredPositions: unmasked,
  };
}

/**
 * Frequentist z-score for the mean g-value against the null hypothesis that
 * every g-value is an independent Bernoulli(0.5) draw (unwatermarked text).
 *
 * z = (meanG - 0.5) / sqrt(0.25 / (scoredPositions * depth))
 *
 * The independence assumption is approximate (overlapping ngram windows are
 * mildly correlated), so treat the p-value as indicative, not exact — the
 * upstream README recommends calibrating thresholds empirically per length.
 */
export function zScore(meanG: number, scoredPositions: number, depth: number): number {
  const n = scoredPositions * depth;
  if (n <= 0 || Number.isNaN(meanG)) return Number.NaN;
  return (meanG - 0.5) / Math.sqrt(0.25 / n);
}

/**
 * One-sided p-value P(mean >= observed | unwatermarked null) from the normal
 * approximation: 0.5 * erfc(z / sqrt(2)).
 */
export function pValueFromZ(z: number): number {
  if (Number.isNaN(z)) return Number.NaN;
  return 0.5 * erfc(z / Math.SQRT2);
}

/**
 * Complementary error function, Numerical Recipes rational Chebyshev
 * approximation (fractional error below 1.2e-7 everywhere).
 */
export function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + z / 2);
  const answer =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t *
                                  (1.48851587 +
                                    t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return x >= 0 ? answer : 2 - answer;
}
