export function buildCheckerShareSummary(result, levels) {
	const payload = result?.exports?.share?.payload;
	if (!payload || payload.contains_content !== false) throw new Error('A content-free share result is not available.');
	const level = levels[payload.level]?.name || payload.level;
	return `Opace AI Content Integrity: ${level} (${payload.display_score}). ${payload.honesty_line} Result ${payload.result_id}, ${payload.date}.`;
}

export async function copyCheckerShareSummary(result, levels, options = {}) {
	const summary = buildCheckerShareSummary(result, levels);
	if (typeof options.clipboard?.writeText === 'function') {
		await options.clipboard.writeText(summary);
		return summary;
	}
	const documentRef = options.document;
	if (!documentRef?.body || typeof documentRef.execCommand !== 'function') throw new Error('Clipboard access is unavailable.');
	const field = documentRef.createElement('textarea');
	field.value = summary;
	field.setAttribute('readonly', '');
	field.style.position = 'fixed';
	field.style.opacity = '0';
	documentRef.body.append(field);
	field.select();
	const copied = documentRef.execCommand('copy');
	field.remove();
	if (!copied) throw new Error('Copy was not accepted.');
	return summary;
}
