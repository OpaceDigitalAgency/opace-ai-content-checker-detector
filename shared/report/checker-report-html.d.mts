import type { ReportOptions } from './report-model.d.mts';

export interface CheckerReportHtmlOptions extends ReportOptions {
  /** Product mark as a data URI. Defaults to the packaged 96 px PNG. */
  logoDataUri?: string;
  /** How the mark is drawn. "background" avoids `<img>` and `src=` entirely. Default "img". */
  logoStyle?: 'img' | 'background';
  /** Complete markup for the logo slot, used instead of `logoDataUri` and `logoStyle`. */
  logoHtml?: string;
  /** The complete submitted draft, printed as a content-bearing appendix when supplied. */
  fullText?: string;
  /** Return only the <article>, for a surface that supplies its own document shell. */
  fragment?: boolean;
}

/** The complete printable HTML report: one self-contained A4 document. */
export function buildCheckerReportHtml(result: unknown, options?: CheckerReportHtmlOptions): string;

/** Escape a value for HTML text and double-quoted attribute contexts. */
export function escapeHtml(value: unknown): string;

/** Markup for the logo slot, in either style. Exported so a surface can place it itself. */
export function logoMarkHtml(dataUri?: string, style?: 'img' | 'background'): string;

/** The report stylesheet, exported for a surface that inlines the fragment into its own shell. */
export const CHECKER_REPORT_CSS: string;
