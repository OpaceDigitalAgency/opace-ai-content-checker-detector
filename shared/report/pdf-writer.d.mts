export const A4: { readonly width: number; readonly height: number };

/** Encode text for the built-in WinAnsi core fonts. Idempotent; never emits "?" for a glyph. */
export function encodeWinAnsi(value: unknown): string;

/** Width of a string once encoded, in PDF points. */
export function measureText(value: unknown, weight: 'regular' | 'bold', size: number, characterSpacing?: number): number;

/** Split a paragraph into lines that fit `width` points, using real Helvetica metrics. */
export function wrapLines(value: unknown, weight: 'regular' | 'bold', size: number, width: number): string[];

/** Width, height, bit depth and component count of a JPEG, or null when it is unusable. */
export function readJpegHeader(bytes: Uint8Array | undefined | null):
  { bits: number; width: number; height: number; components: number } | null;

export interface PdfTextOptions {
  weight?: 'regular' | 'bold';
  size?: number;
  fill?: readonly [number, number, number];
  characterSpacing?: number;
}

/** One recorded paint or string in a traced page, in paint order. */
export type PdfTraceEntry =
  | { type: 'fill' | 'image'; fill: number[] | null; box: [number, number, number, number] }
  | { type: 'text'; text: string; x: number; y: number; size: number; weight: 'regular' | 'bold'; fill: number[]; width: number };

/** One string and the colour painted behind it, as `textBackgroundPairs` reports them. */
export interface PdfTextBackgroundPair {
  readonly page: number;
  readonly text: string;
  readonly size: number;
  readonly weight: 'regular' | 'bold';
  readonly foreground: number[];
  readonly background: number[] | null;
  readonly foregroundHex: string;
  readonly backgroundHex: string | null;
  readonly backgroundKind: 'fill' | 'image' | 'unpainted';
}

export interface PdfPage {
  raw(operation: string): PdfPage;
  rect(x: number, y: number, width: number, height: number, fill: readonly number[]): PdfPage;
  strokeRect(x: number, y: number, width: number, height: number, stroke: readonly number[], lineWidth?: number): PdfPage;
  roundedRect(x: number, y: number, width: number, height: number, radius: number, fill: readonly number[], stroke?: readonly number[] | null, lineWidth?: number): PdfPage;
  line(x1: number, y1: number, x2: number, y2: number, stroke: readonly number[], lineWidth?: number): PdfPage;
  polygon(points: readonly (readonly [number, number])[], fill: readonly number[]): PdfPage;
  circle(cx: number, cy: number, radius: number, fill: readonly number[]): PdfPage;
  arcBand(cx: number, cy: number, innerRadius: number, outerRadius: number, startDegrees: number, endDegrees: number, fill: readonly number[], steps?: number): PdfPage;
  text(value: unknown, x: number, y: number, options?: PdfTextOptions): PdfPage;
  image(name: string, x: number, y: number, width: number, height: number): PdfPage;
  stream(): string;
  readonly minimumY: number;
  /** Paint log, or null unless the document was built with `{ trace: true }`. */
  readonly trace: PdfTraceEntry[] | null;
}

export declare class PdfDocument {
  constructor(info?: { title?: string; author?: string; subject?: string; creator?: string; creationDate?: string; pageSize?: { width: number; height: number }; trace?: boolean });
  readonly pages: PdfPage[];
  addPage(): PdfPage;
  /** Register a JPEG XObject. Returns false when the bytes are not a usable JPEG. */
  addJpeg(name: string, bytes: Uint8Array): boolean;
  build(): Uint8Array;
}

/** An rgb triple in the 0-1 range as an `#rrggbb` string. */
export function rgbToHex(rgb: readonly number[]): string;

/**
 * Every string a traced document paints and the colour painted behind it, read out of the paint
 * log. Throws when the document was not built with `{ trace: true }`.
 */
export function textBackgroundPairs(document: PdfDocument): PdfTextBackgroundPair[];
