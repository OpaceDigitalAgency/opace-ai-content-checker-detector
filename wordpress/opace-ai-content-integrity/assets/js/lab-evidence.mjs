const list = (value) => Array.isArray(value) ? value : [];

const uniqueById = (items) => {
	const seen = new Set();
	return items.filter((item) => {
		const key = item?.id || `${item?.type || 'evidence'}:${item?.rule_id || ''}:${item?.span?.start_utf16 ?? ''}:${item?.span?.end_utf16 ?? ''}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

export function unicodeFindingsForResult(result) {
	const direct = list(result?.unicode_findings);
	if (direct.length) return uniqueById(direct);
	return uniqueById(list(result?.methods)
		.filter((method) => method?.category === 'unicode')
		.flatMap((method) => list(method?.evidence))
		.filter((item) => item?.type === 'unicode_finding'));
}

export function findingsForMethod(result, method) {
	if (method?.id === 'style.patterns') return list(result?.pattern_findings);
	if (method?.id === 'unicode.invisible') return unicodeFindingsForResult(result).filter((finding) => !String(finding?.id || '').includes('_homoglyph_'));
	if (method?.id === 'unicode.homoglyph') return unicodeFindingsForResult(result).filter((finding) => String(finding?.id || '').includes('_homoglyph_'));
	return list(method?.evidence).filter((item) => !['editorial_signals', 'scope_note'].includes(item?.type));
}

const appendText = (document, parent, tag, text, className) => {
	const node = document.createElement(tag);
	node.textContent = text;
	if (className) node.className = className;
	parent.append(node);
	return node;
};

const methodLabel = (method) => {
	if (method.id === 'unicode.invisible') return 'Invisible characters';
	if (method.id === 'unicode.homoglyph') return 'Lookalike characters';
	if (method.id === 'style.patterns') return 'Writing patterns to review';
	return method.provider_or_method;
};

const statusLabel = (status) => String(status || 'not_run').replaceAll('_', ' ');

const positionLabel = (finding) => {
	const start = finding?.span?.start_utf16;
	const end = finding?.span?.end_utf16;
	return Number.isInteger(start) && Number.isInteger(end) ? `Characters ${start + 1}–${end}` : '';
};

const findingTitle = (finding, index) => {
	if (finding?.type === 'unicode_finding') return [finding.code_point, finding.name].filter(Boolean).join(' · ');
	const matched = String(finding?.evidence?.matched || '');
	const visibleMatch = matched.replace(/[\p{White_Space}\p{Default_Ignorable_Code_Point}]/gu, '');
	if (visibleMatch) return `“${matched}”`;
	if (finding?.rule_id === 'signals.normalization_flag') return 'Hidden or lookalike character';
	if (finding?.rule_id) return finding.rule_id.replaceAll(/[._-]+/g, ' ');
	return `Finding ${index + 1}`;
};

function renderFinding(document, finding, index) {
	const item = document.createElement('li');
	item.className = `oaci-finding oaci-finding--${finding?.severity || 'note'}`;
	appendText(document, item, 'h5', findingTitle(finding, index));
	const meta = [finding?.severity ? `${finding.severity} priority` : '', positionLabel(finding)].filter(Boolean).join(' · ');
	if (meta) appendText(document, item, 'p', meta, 'oaci-finding__meta');
	if (finding?.message) appendText(document, item, 'p', finding.message, 'oaci-finding__message');
	if (finding?.suggestion) {
		const suggestion = document.createElement('p');
		suggestion.className = 'oaci-finding__suggestion';
		appendText(document, suggestion, 'strong', 'What to do: ');
		suggestion.append(document.createTextNode(finding.suggestion));
		item.append(suggestion);
	}
	return item;
}

function renderMethod(document, result, method) {
	const card = document.createElement('section');
	card.className = 'oaci-method-card';
	card.setAttribute('aria-labelledby', `oaci-method-${method.id.replaceAll(/[^a-z0-9]+/gi, '-')}`);

	const header = document.createElement('div');
	header.className = 'oaci-method-card__header';
	const title = appendText(document, header, 'h4', methodLabel(method));
	title.id = card.getAttribute('aria-labelledby');
	appendText(document, header, 'span', statusLabel(method.status), `oaci-chip oaci-chip--${method.status}`);
	card.append(header);
	appendText(document, card, 'p', method.provider_or_method, 'oaci-method-provider');

	const findings = findingsForMethod(result, method);
	if (findings.length) {
		appendText(document, card, 'p', `${findings.length} ${findings.length === 1 ? 'finding' : 'findings'} from this check.`, 'oaci-result__count');
		const findingList = document.createElement('ol');
		findingList.className = 'oaci-finding-list';
		findings.forEach((finding, index) => findingList.append(renderFinding(document, finding, index)));
		card.append(findingList);
	} else {
		const empty = method.category === 'unicode' && method.status === 'attention'
			? 'No findings in this category. The shared Unicode inspection needs review because its other character category has findings.'
			: method.status === 'pass'
			? 'No findings from this check. This applies only to the named method; it is not proof of human authorship.'
			: 'This check did not produce evidence. It has not been counted as a pass.';
		appendText(document, card, 'p', empty, 'oaci-result__empty');
	}

	const limitations = list(method.limitations);
	if (limitations.length) {
		const details = document.createElement('details');
		details.className = 'oaci-limitations';
		appendText(document, details, 'summary', 'What this check cannot prove');
		const limits = document.createElement('ul');
		limitations.forEach((limitation) => appendText(document, limits, 'li', limitation));
		details.append(limits);
		card.append(details);
	}
	return card;
}

export function renderEvidence(results, result, document) {
	results.replaceChildren();
	const overview = document.createElement('section');
	overview.className = 'oaci-result-overview';
	appendText(document, overview, 'p', 'LOCAL CHECKS ONLY', 'oaci-result-overview__eyebrow');
	appendText(document, overview, 'h3', 'Local inspection summary');
	appendText(document, overview, 'p', `${result.summary.pass} passed · ${result.summary.attention} need review · ${result.summary.unsupported} unsupported`);
	appendText(document, overview, 'p', 'No AI-written text score was produced. The WordPress plugin ran character and editorial checks, not the trained AI model.', 'oaci-result-overview__boundary');
	results.append(overview);

	const methods = document.createElement('div');
	methods.className = 'oaci-method-list';
	methods.setAttribute('aria-label', 'Evidence from each check');
	appendText(document, methods, 'h3', 'What each check found');
	appendText(document, methods, 'p', 'Each finding stays under the method that produced it. Writing notes are editing guidance, not authorship evidence.', 'oaci-method-list__intro');
	list(result.methods).forEach((method) => methods.append(renderMethod(document, result, method)));
	results.append(methods);
}
