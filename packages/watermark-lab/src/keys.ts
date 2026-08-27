/**
 * Published Opace demo keys for the SynthID-Text known-key experiments.
 *
 * These key sets are deliberately public. They exist so anyone can reproduce
 * the lab's watermarked fixtures and verify the mathematics. They are NOT
 * production keys: this lab cannot detect, verify or say anything about
 * Google's or Anthropic's production watermarks, and nothing here can say
 * anything about Claude output without Anthropic's private key.
 */

import type { WatermarkKeyConfig } from './gvalues.js';

/** Reference defaults we keep: ngram_len = 5 (H = 4 context window). */
export const DEFAULT_NGRAM_LEN = 5;
/** Reference default rolling context history size. */
export const DEFAULT_CONTEXT_HISTORY_SIZE = 1024;
/**
 * Demo watermarking depth (tournament layers). The reference repository's
 * example configuration uses 30 keys; the demo sets use 6 so the per-layer
 * signal is strong enough to see clearly at educational passage lengths.
 * Recorded in every fixture manifest.
 */
export const DEMO_DEPTH = 6;

function demoKeyConfig(id: string, keys: readonly number[]): WatermarkKeyConfig {
  return {
    id,
    keys,
    ngramLen: DEFAULT_NGRAM_LEN,
    contextHistorySize: DEFAULT_CONTEXT_HISTORY_SIZE,
  };
}

/**
 * Named, published demo key sets. Scoring text with a key it was not
 * generated under is the "wrong key" experiment — the score collapses to
 * noise around 0.5, which is the whole lesson: a SynthID-class watermark is
 * private-key evidence, not a universal AI stamp.
 */
export const DEMO_KEYS: Readonly<Record<string, WatermarkKeyConfig>> = {
  'opace-demo-alpha': demoKeyConfig('opace-demo-alpha', [
    2101, 4229, 6317, 8443, 10501, 12611,
  ]),
  'opace-demo-beta': demoKeyConfig('opace-demo-beta', [
    3313, 5449, 7523, 9601, 11731, 13807,
  ]),
  'opace-demo-gamma': demoKeyConfig('opace-demo-gamma', [
    4421, 6521, 8623, 10709, 12821, 14923,
  ]),
};

/** Convenience list of the demo key ids. */
export const DEMO_KEY_IDS: readonly string[] = Object.keys(DEMO_KEYS);
