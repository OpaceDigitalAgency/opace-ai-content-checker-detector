/**
 * The downloadable evidence report.
 *
 * The PDF itself is built by the cross-surface writer in
 * `assets/vendor/shared/report/`, copied into this bundle by
 * `bin/sync-shared-presentation.mjs`, so the WordPress plugin, the Chrome
 * extension and the website all produce the same document from the same
 * canonical result. This file is only the WordPress adapter: it names the
 * surface, hands over the local draft so the exact scored characters can be
 * printed, passes this runtime's level names so two copies cannot drift, and
 * turns the returned bytes into a download.
 */
import { buildCheckerPdf, checkerPdfFilename } from '../vendor/shared/report/checker-pdf.mjs';
import { logoJpegBytes } from '../vendor/shared/report/logo.mjs';
import { encodeWinAnsi } from '../vendor/shared/report/pdf-writer.mjs';

export const SURFACE_NAME = 'WordPress Lab';
export const SUPPORT_DESTINATION = 'https://opace.agency/tools/ai/content-verification-integrity/checker/';

/** Kept for the surfaces and tests that encode a single string on its own. */
export const encodeCheckerPdfText = encodeWinAnsi;

const levelLabelsFrom = (semantics) => {
	if (!semantics?.levels) throw new Error('Canonical checker-result semantics are required.');
	return Object.fromEntries(Object.entries(semantics.levels).map(([id, level]) => [id, typeof level === 'string' ? level : level.name]));
};

export function createCheckerPdf(result, sourceText, semantics, options = {}) {
	if (typeof semantics?.assertResult === 'function') semantics.assertResult(result);
	return buildCheckerPdf(result, {
		surfaceName: SURFACE_NAME,
		productUrl: SUPPORT_DESTINATION,
		levelLabels: levelLabelsFrom(semantics),
		logoJpegBytes: logoJpegBytes(),
		sourceText: typeof sourceText === 'string' && sourceText ? sourceText : undefined,
		fullText: typeof sourceText === 'string' && sourceText ? sourceText : undefined,
		...options
	});
}

export function downloadCheckerPdf(result, sourceText, semantics, documentRef = document, options = {}) {
	const bytes = createCheckerPdf(result, sourceText, semantics, options);
	const filename = checkerPdfFilename(result.generated_at);
	const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
	const link = documentRef.createElement('a');
	link.href = url;
	link.download = filename;
	link.hidden = true;
	documentRef.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 0);
	return filename;
}
