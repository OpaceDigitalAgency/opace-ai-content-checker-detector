/**
 * The deterministic evidence view: what the reader is looking at while an EU or
 * on-device run is still in flight, and the whole of the reading on the
 * integrity-only route.
 *
 * It is drawn by this module rather than by the shared renderer, which has no
 * view for "checks ran, nothing scored yet" — but the reader does not know that
 * and should not be able to tell. The names and the status words therefore come
 * from the same tables the shared renderer uses, so the same check is not called
 * "Invisible characters · pass" here and "Invisible and hidden characters · No
 * issue found" four seconds later.
 */
import { CHECKER_METHOD_STATUS_LABELS } from '../vendor/shared/presentation/checker-result-presentation.mjs';

/**
 * How many findings a check shows before the rest go behind a disclosure. Five
 * is enough to see the shape of what was found without the card becoming a
 * scroll of its own.
 */
const FINDINGS_SHOWN = 5;

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

/**
 * The reader's name for a check. The two Unicode methods share one provider
 * name, so both would otherwise read "Opace deterministic Unicode inspection";
 * these are the shared renderer's words for the same three ids.
 */
const methodLabel = (method) => {
	if (method.id === 'unicode.invisible') return 'Invisible and hidden characters';
	if (method.id === 'unicode.homoglyph') return 'Lookalike (homoglyph) characters';
	if (method.id === 'style.patterns') return 'Writing patterns to review';
	if (method.id === 'watermark.anthropic') return 'Anthropic official watermark verifier';
	return method.provider_or_method;
};

/** The closed status vocabulary, in the shared renderer's words. */
const statusLabel = (status) => CHECKER_METHOD_STATUS_LABELS[status] ?? String(status || 'not_run').replaceAll('_', ' ');

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
		// A writing check can return twenty findings. Twenty four-line cards in a
		// row is a wall, and a wall is not read. The first few are open, the rest
		// are one press away, and nothing is thrown away: the count above says how
		// many there are and the disclosure says how many are behind it.
		const shown = findings.slice(0, FINDINGS_SHOWN);
		const rest = findings.slice(FINDINGS_SHOWN);
		const findingList = document.createElement('ol');
		findingList.className = 'oaci-finding-list';
		shown.forEach((finding, index) => findingList.append(renderFinding(document, finding, index)));
		card.append(findingList);
		if (rest.length) {
			const more = document.createElement('details');
			more.className = 'oaci-disclosure oaci-more-findings';
			appendText(document, more, 'summary', `Show the other ${rest.length} ${rest.length === 1 ? 'finding' : 'findings'}`);
			const body = document.createElement('div');
			body.className = 'oaci-disclosure__body';
			const restList = document.createElement('ol');
			restList.className = 'oaci-finding-list';
			restList.start = FINDINGS_SHOWN + 1;
			rest.forEach((finding, index) => restList.append(renderFinding(document, finding, index + FINDINGS_SHOWN)));
			body.append(restList);
			more.append(body);
			card.append(more);
		}
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

/** One tile: a number and what it counts. */
function renderStat(document, parent, value, label) {
	const tile = document.createElement('div');
	tile.className = 'oaci-stat';
	appendText(document, tile, 'b', String(value));
	appendText(document, tile, 'span', label);
	parent.append(tile);
}

/**
 * The integrity-only reading, as ONE card.
 *
 * It used to be two: a rail panel saying the AI-pattern model had not run, and
 * a summary box saying the same thing in different words directly underneath.
 * Two panels that say one thing read as two competing answers, so the headline,
 * the counts and the boundary are one card with one heading.
 */
export function renderEvidence(results, result, document) {
	results.replaceChildren();
	const card = document.createElement('section');
	card.className = 'oaci-local-card';
	card.setAttribute('aria-labelledby', 'oaci-local-heading');

	const head = document.createElement('div');
	head.className = 'oaci-local-card__head';
	appendText(document, head, 'h3', 'Integrity checks only').id = 'oaci-local-heading';
	appendText(document, head, 'span', 'No AI reading', 'oaci-chip oaci-chip--not_run');
	card.append(head);
	appendText(document, card, 'p', 'Character and writing checks ran in this browser. No trained model read this draft, so there is no AI-pattern score. Choose private EU analysis or on this device for one.', 'oaci-local-card__lead');

	const stats = document.createElement('div');
	stats.className = 'oaci-stats';
	renderStat(document, stats, result.summary.pass, 'checks passed');
	renderStat(document, stats, result.summary.attention, 'need review');
	renderStat(document, stats, result.summary.unsupported, 'unsupported');
	card.append(stats);
	results.append(card);

	const methods = document.createElement('div');
	methods.className = 'oaci-method-list';
	methods.setAttribute('aria-label', 'Evidence from each check');
	appendText(document, methods, 'h3', 'What each check found');
	appendText(document, methods, 'p', 'Each finding stays under the method that produced it. Writing notes are editing guidance, not authorship evidence.', 'oaci-method-list__intro');
	list(result.methods).forEach((method) => methods.append(renderMethod(document, result, method)));
	results.append(methods);
}
