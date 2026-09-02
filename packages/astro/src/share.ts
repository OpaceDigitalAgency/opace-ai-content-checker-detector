/**
 * Sharing a reading without sharing the page.
 *
 * A share here is a summary: the level, the per-section scores already on
 * screen, the word count, the date and the model version. No page text, no URL
 * and no route path travels. The payload rides in the URL fragment, which a
 * browser never sends to a server, and the honesty line travels with every
 * summary so a level cannot be quoted without its limits.
 *
 * The wire shape matches the website checker's `#shared=` fragment exactly, so a
 * summary produced in the toolbar opens as a read-only result on the product
 * page. `v:1` fixes the level ordering forever.
 */
import type { CheckerResult } from '@opace/content-integrity-cycle5-browser';

export const CHECKER_URL = 'https://opace.agency/tools/ai/content-verification-integrity/checker/';
export const HONESTY_LINE = 'No AI checker can prove who wrote a text — this is a pattern reading.';

/** Fixed by the wire format. Withheld readings produced no level and are never shared. */
const SHAREABLE_LEVELS = ['signal-likely-human', 'signal-unclear', 'signal-potentially-ai', 'signal-likely-ai', 'signal-strongly-ai'] as const;
export type ShareableLevel = (typeof SHAREABLE_LEVELS)[number];

export const LEVEL_NAMES: Readonly<Record<ShareableLevel, string>> = Object.freeze({
  'signal-likely-human': 'Likely human',
  'signal-unclear': 'Unclear',
  'signal-potentially-ai': 'Potentially AI',
  'signal-likely-ai': 'Likely AI',
  'signal-strongly-ai': 'Strongly AI',
});

export interface ShareSummary {
  levelId: ShareableLevel;
  /** `score` is the four-decimal wire value; `display` is the exact string the reading printed. */
  sections: Array<{ index: number; score: number; display: string; levelId: ShareableLevel }>;
  display: string;
  words: number;
  date: string;
  version: string;
}

/** Four decimals: two could not keep 0.9655 and 0.9685 on opposite sides of a level boundary. */
const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;
const shareable = (value: unknown): value is ShareableLevel => SHAREABLE_LEVELS.includes(value as ShareableLevel);

interface CanonicalSharePayload {
  level: unknown;
  display_score: string;
  sections: ReadonlyArray<{ index: number; raw_score: number; display_score: string; level: unknown }>;
  word_count: number;
  date: string;
  model_version: string;
}

/**
 * Build a summary from the canonical content-free share payload the core
 * already asserts carries no draft. The page text is deliberately not a
 * parameter, so no excerpt can reach a share by accident.
 */
export function buildShareSummary(result: CheckerResult): ShareSummary | undefined {
  const share = result.exports.share;
  if (!share?.available || share.contains_content !== false) return undefined;
  const payload = share.payload as CanonicalSharePayload | undefined;
  if (!payload || !shareable(payload.level)) return undefined;
  const level = payload.level;
  return {
    levelId: level,
    display: payload.display_score,
    sections: payload.sections.map((section) => ({
      index: section.index,
      score: round4(section.raw_score),
      display: section.display_score,
      levelId: shareable(section.level) ? section.level : level,
    })),
    words: payload.word_count,
    date: payload.date,
    version: payload.model_version,
  };
}

const toBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
};

/** Encode a summary as the base64url payload the website's `#shared=` reader accepts. */
export function encodeShared(summary: ShareSummary): string {
  return toBase64Url(JSON.stringify({
    v: 1,
    l: SHAREABLE_LEVELS.indexOf(summary.levelId),
    s: summary.sections.map((section) => [section.index, round4(section.score), SHAREABLE_LEVELS.indexOf(section.levelId)]),
    w: summary.words,
    d: summary.date,
    t: summary.version,
  }));
}

/** The full shareable link: the canonical product page plus the content-free fragment. */
export const shareUrl = (summary: ShareSummary): string => `${CHECKER_URL}#shared=${encodeShared(summary)}`;

/** The plain-text summary offered alongside the link. Counts and levels only. */
export function shareText(summary: ShareSummary): string {
  const sections = summary.sections.map((section) => `  Section ${section.index + 1}: ${section.display} · ${LEVEL_NAMES[section.levelId]}`);
  return [
    'Opace AI Content Integrity — reading summary',
    `Overall: ${LEVEL_NAMES[summary.levelId]}, ${summary.display}`,
    `Checked: ${summary.words.toLocaleString('en-GB')} words on ${summary.date}, on this device (${summary.version})`,
    'Section readings on a zero-to-one pattern scale, never a percentage of AI text:',
    ...sections,
    '',
    HONESTY_LINE,
    `Open the full reading: ${shareUrl(summary)}`,
  ].join('\n');
}
