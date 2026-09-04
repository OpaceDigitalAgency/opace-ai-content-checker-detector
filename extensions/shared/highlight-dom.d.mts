import type { RangeSegment } from "./passage-locator.d.mts";

export interface TextChunk {
  node: Text | null;
  text: string;
}

export const HIGHLIGHT_ATTRIBUTE: string;
export const HIGHLIGHT_CLASS: string;
export function collectTextChunks(root: Node, options?: { isVisible?: (element: Element) => boolean }): TextChunk[];
export function applyHighlight(document: Document, chunks: readonly TextChunk[], segments: readonly RangeSegment[], attributes?: Record<string, string>): HTMLElement[];
export function mergeAdjacentText(parent: Node | null): void;
export function clearHighlight(root: Node | null): number;
