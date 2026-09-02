import type { ReportOptions } from './report-model.d.mts';
import type { PdfTextBackgroundPair } from './pdf-writer.d.mts';

export interface CheckerPdfOptions extends ReportOptions {
  /** Product logo as JPEG bytes for the running header. Omit to print the wordmark alone. */
  logoJpegBytes?: Uint8Array;
  /** The complete submitted draft, printed as a content-bearing appendix when supplied. */
  fullText?: string;
}

/** The complete A4 evidence report as PDF bytes. Deterministic for identical input. */
export function buildCheckerPdf(result: unknown, options?: CheckerPdfOptions): Uint8Array;

/**
 * Every text/background pair the checker PDF paints, read out of the writer's paint log rather
 * than declared by hand. Used by the contrast test.
 */
export function checkerPdfTextPairs(result: unknown, options?: CheckerPdfOptions): PdfTextBackgroundPair[];

/** `opace-ai-content-integrity-YYYY-MM-DD.pdf`. */
export function checkerPdfFilename(generatedAt: string): string;

export type ProvenanceStatus = 'present' | 'absent' | 'invalid' | 'untrusted' | 'error' | 'unsupported';

export interface ProvenanceRecord {
  readonly schema_version: 'oaci-provenance-report:1';
  readonly generated_at: string;
  readonly contains_content: false;
  readonly product: string;
  readonly file: { readonly hash: string; readonly media_type: string; readonly size_bytes: number };
  readonly provenance: {
    readonly status: ProvenanceStatus;
    readonly trust: string;
    readonly reason: string;
    readonly manifest_summary: Record<string, unknown> | null;
    readonly issues: readonly { code: string; explanation?: string }[];
    readonly limitations: readonly string[];
  };
}

/** Build the content-free C2PA record. Throws when the input is not safe to export. */
export function buildProvenanceExport(
  file: { size: number; name?: string; bytes?: unknown },
  result: { file_hash: string; media_type: string; status: string; trust: string; reason: string; manifest_summary?: unknown; issues?: unknown; limitations?: unknown },
  generatedAt?: string
): ProvenanceRecord;

/** Plain-text rendering of the provenance record. */
export function provenanceReportText(record: ProvenanceRecord): string;

/** The branded, content-free C2PA file-inspection report as PDF bytes. */
export function buildProvenancePdf(record: ProvenanceRecord, options?: { logoJpegBytes?: Uint8Array }): Uint8Array;

/** Every text/background pair the provenance PDF paints. See `checkerPdfTextPairs`. */
export function provenancePdfTextPairs(record: ProvenanceRecord, options?: { logoJpegBytes?: Uint8Array }): PdfTextBackgroundPair[];

/** Every fill a level chip can be given, so white chip text can be measured against all of them. */
export const PDF_CHIP_FILLS: readonly (readonly number[])[];

/** `opace-content-credentials-YYYY-MM-DD.pdf`. */
export function provenancePdfFilename(generatedAt: string): string;
