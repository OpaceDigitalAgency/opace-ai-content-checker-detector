/**
 * The content-free Content Credentials report for a checked file.
 *
 * The record and the PDF are built by the cross-surface writer in
 * `assets/vendor/shared/report/`, so a file checked in this plugin, in the
 * Chrome extension or on the website produces the same document. The record
 * carries the file's hash, media type, size and the six-state result. It never
 * carries the file, its name or its bytes.
 */
import { buildProvenanceExport as buildSharedProvenanceExport, buildProvenancePdf, provenancePdfFilename, provenanceReportText } from '../vendor/shared/report/checker-pdf.mjs';
import { logoJpegBytes } from '../vendor/shared/report/logo.mjs';

export { provenanceReportText };

export function buildProvenanceExport(file, result, generatedAt = new Date().toISOString()) {
	return buildSharedProvenanceExport(file, result, generatedAt);
}

export function createProvenancePdf(record) {
	return buildProvenancePdf(record, { logoJpegBytes: logoJpegBytes() });
}

export function downloadProvenancePdf(record, documentRef = document) {
	const bytes = createProvenancePdf(record);
	const filename = provenancePdfFilename(record.generated_at);
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
