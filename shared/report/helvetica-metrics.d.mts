/** Adobe Core-14 Helvetica character widths, indexed by WinAnsi code point. */
export const HELVETICA_WIDTHS: readonly number[];
/** Adobe Core-14 Helvetica-Bold character widths, indexed by WinAnsi code point. */
export const HELVETICA_BOLD_WIDTHS: readonly number[];
/** Width of one already-WinAnsi-encoded string, in PDF points. */
export function measureWinAnsi(text: string, weight: 'regular' | 'bold', size: number): number;
