const STATUS_VIEW = Object.freeze({
	present: Object.freeze({ badge: 'Present · trust not checked', tone: 'pass', summary: 'Content Credentials were read and validated locally.' }),
	absent: Object.freeze({ badge: 'Not found · inconclusive', tone: 'inconclusive', summary: 'No Content Credentials were found. This is evidence without a judgement.' }),
	invalid: Object.freeze({ badge: 'Invalid · review', tone: 'fail', summary: 'Content Credentials were found, but local validation reported a problem.' }),
	untrusted: Object.freeze({ badge: 'Signer untrusted · review', tone: 'attention', summary: 'Content Credentials were found, but signer trust was not established.' }),
	unsupported: Object.freeze({ badge: 'Unsupported', tone: 'unsupported', summary: 'This file type is not inspected by this release.' }),
	error: Object.freeze({ badge: 'Check error', tone: 'error', summary: 'The local check could not complete, so no judgement was made.' })
});

function node(doc, tag, text, className) {
	const element = doc.createElement(tag);
	if (text !== undefined) element.textContent = text;
	if (className) element.className = className;
	return element;
}

function fact(doc, list, term, value) {
	list.append(node(doc, 'dt', term), node(doc, 'dd', value));
}

function formatBytes(bytes) {
	return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(value) {
	if (!value) return 'Not recorded';
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : `${date.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

export function renderProvenanceProgress(container, file, doc = document) {
	const shell = node(doc, 'div', undefined, 'oaci-provenance-result oaci-provenance-result--progress');
	shell.append(
		node(doc, 'p', 'Local file check', 'oaci-eyebrow'),
		node(doc, 'h3', 'Reading Content Credentials…'),
		node(doc, 'p', `${file.name} · ${formatBytes(file.size)} · stays in this browser`),
		node(doc, 'p', 'The packaged C2PA engine is loading. Remote manifests, certificate status and trust lists are not fetched.', 'oaci-provenance-result__privacy')
	);
	container.replaceChildren(shell);
}

export function renderProvenanceResult(container, file, result, doc = document) {
	const view = STATUS_VIEW[result?.status] || STATUS_VIEW.error;
	const shell = node(doc, 'section', undefined, `oaci-provenance-result oaci-provenance-result--${result?.status || 'error'}`);
	const title = node(doc, 'h3', 'File origin and edit history');
	title.id = 'oaci-provenance-result-title';
	title.tabIndex = -1;
	const header = node(doc, 'div', undefined, 'oaci-provenance-result__header');
	const headerText = node(doc, 'div');
	headerText.append(node(doc, 'p', 'Local Content Credentials check', 'oaci-eyebrow'), title);
	const badge = node(doc, 'span', view.badge, `oaci-chip oaci-chip--${view.tone}`);
	header.append(headerText, badge);
	shell.append(
		header,
		node(doc, 'p', `${file.name} · ${formatBytes(file.size)} · inspected locally`, 'oaci-provenance-result__file'),
		node(doc, 'p', view.summary, 'oaci-provenance-result__summary'),
		node(doc, 'p', result?.reason || STATUS_VIEW.error.summary, 'oaci-provenance-result__reason')
	);

	if (result?.manifest_summary) {
		const details = node(doc, 'dl', undefined, 'oaci-provenance-result__facts');
		fact(doc, details, 'Signer', result.manifest_summary.signer || 'Not named in the signature');
		fact(doc, details, 'Claim generator', result.manifest_summary.claim_generator || 'Not named in the manifest');
		fact(doc, details, 'Signed on', formatDate(result.manifest_summary.signed_on));
		fact(doc, details, 'Validation state', result.manifest_summary.validation_state || 'Not reported');
		fact(doc, details, 'Assertions', String(result.manifest_summary.assertions_count));
		fact(doc, details, 'Ingredients', String(result.manifest_summary.ingredients_count));
		shell.append(details);
	}

	const issues = Array.isArray(result?.issues) ? result.issues.filter((issue) => issue.success !== true) : [];
	if (issues.length) {
		const issueSection = node(doc, 'div', undefined, 'oaci-provenance-result__issues');
		issueSection.append(node(doc, 'h4', `Validation ${issues.length === 1 ? 'issue' : 'issues'} reported`));
		const issueList = node(doc, 'ul');
		for (const issue of issues) {
			const item = node(doc, 'li');
			item.append(node(doc, 'code', issue.code));
			if (issue.explanation) item.append(node(doc, 'p', issue.explanation));
			issueList.append(item);
		}
		issueSection.append(issueList);
		shell.append(issueSection);
	}

	const boundary = node(doc, 'div', undefined, 'oaci-provenance-result__boundary');
	boundary.append(node(doc, 'h4', 'What this check can and cannot say'));
	const limitations = node(doc, 'ul');
	for (const item of result?.limitations || []) limitations.append(node(doc, 'li', item));
	boundary.append(limitations);
	shell.append(
		boundary,
		node(doc, 'p', 'Text checks for invisible characters, lookalike characters and writing patterns do not run on image or PDF uploads.', 'oaci-provenance-result__scope'),
		node(doc, 'p', 'Private by design: the file bytes stayed in this browser. No filename, file hash, manifest or file content is placed in a receipt, share link, URL or event log.', 'oaci-provenance-result__privacy')
	);
	container.replaceChildren(shell);
	title.focus();
}

export function renderProvenanceCancelled(container, doc = document) {
	const shell = node(doc, 'div', undefined, 'oaci-provenance-result oaci-provenance-result--cancelled');
	shell.append(
		node(doc, 'p', 'Local file check', 'oaci-eyebrow'),
		node(doc, 'h3', 'Inspection cancelled'),
		node(doc, 'p', 'No result was substituted for the stopped run. Choose the file again when you are ready.')
	);
	container.replaceChildren(shell);
}
