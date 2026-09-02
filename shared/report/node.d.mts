import type { CheckerPdfOptions } from './checker-pdf.d.mts';

export function packagedLogoJpeg(): Uint8Array;
export function packagedLogoDataUri(): string;
export function readLogoJpeg(path: string): Promise<Uint8Array>;
export function readCheckerResult(path: string): Promise<unknown>;
export function writeCheckerReports(
  result: unknown,
  directory: string,
  options?: CheckerPdfOptions & { pdfName?: string; htmlName?: string }
): Promise<{ pdfPath: string; htmlPath: string; bytes: number }>;
