export interface TextIndex {
  text: string;
  chunkIndex: number[];
  offsets: number[];
  chunks: string[];
}

export interface PassageLocation {
  start: number;
  end: number;
  exact: boolean;
  anchor: string | null;
  occurrences: number;
}

export interface RangeSegment {
  chunk: number;
  start: number;
  end: number;
}

export const MIN_ANCHOR_LENGTH: number;
export function collapseWhitespace(value: unknown): string;
export function buildTextIndex(chunks: readonly string[]): TextIndex;
export function locatePassage(index: TextIndex, passage: string, options?: { hint?: number }): PassageLocation | null;
export function segmentsForRange(index: TextIndex, start: number, end: number): RangeSegment[];
