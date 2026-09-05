/**
 * The reading, small enough for a sidebar.
 *
 * The checker screen's result is the whole of it: a masthead, a five-band dial,
 * the section bars, every named check, the meaning panel and the run record. It
 * is right there and wrong here. A block-editor sidebar is about 280 pixels
 * wide, and a reader looking at it has one question — what did it say — with a
 * button to the full reading beside the answer.
 *
 * So this draws the top of the shared result and nothing else: the dial, the
 * level, the score, the one plain sentence, the three readings, and where the
 * strongest passage was. Every value on it is read from the canonical result and
 * the shared module's own tables; the level names, the band order and the needle
 * position all come from `shared/presentation/`, so the sidebar and the checker
 * screen cannot show a reader two different readings of one run.
 *
 * Secondary readings are imported from the shared renderer; the compact and
 * full views cannot silently diverge in what they say was checked.
 */
import { CHECKER_GAUGE_ORDER, CHECKER_LEVEL_MEANINGS, gaugePosition, INTEGRITY_READINGS, EDITORIAL_READINGS } from '../vendor/shared/presentation/checker-result-presentation.mjs';
import { buildDraftEvidence } from '../vendor/shared/evidence/index.mjs';
import { formatEditorialReading, formatCharacterReading } from '../vendor/shared/evidence/readings.mjs';
export { INTEGRITY_READINGS, EDITORIAL_READINGS };

const DIAL_R = 46;
const DIAL_CX = 52;
const DIAL_CY = 52;
const DIAL_PAD = 2.5;

const dialPoint = (degrees, radius) => ({
	x: DIAL_CX + radius * Math.cos((degrees * Math.PI) / 180),
	y: DIAL_CY - radius * Math.sin((degrees * Math.PI) / 180)
});

const svg = (name, attributes) => {
	const node = document.createElementNS('http://www.w3.org/2000/svg', name);
	for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
	return node;
};

const element = (tag, className, text) => {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined && text !== null) node.textContent = String(text);
	return node;
};

/**
 * The mini dial: the same five bands in the same order, at a quarter of the
 * size, with the needle at the band centre `gaugePosition` gives.
 *
 * @param {string} level    A level id on the gauge.
 * @param {object} names    level id -> name.
 * @returns {Element}
 */
export function renderMiniDial(level, names) {
	const position = gaugePosition(level);
	const span = 180 / CHECKER_GAUGE_ORDER.length;
	const holder = element('div', 'oaci-ed-dial');
	holder.setAttribute('role', 'img');
	holder.dataset.level = level;
	holder.setAttribute('aria-label', `AI reading: ${names[level]}, on the five-band scale from likely human to strongly AI`);
	const canvas = svg('svg', { viewBox: '0 0 104 58', 'aria-hidden': 'true', focusable: 'false' });
	CHECKER_GAUGE_ORDER.forEach((id, index) => {
		const start = 180 - index * span - (index === 0 ? 0 : DIAL_PAD);
		const end = 180 - (index + 1) * span + (index === CHECKER_GAUGE_ORDER.length - 1 ? 0 : DIAL_PAD);
		const a = dialPoint(start, DIAL_R);
		const b = dialPoint(end, DIAL_R);
		const path = svg('path', { class: 'oaci-ed-dial__seg', 'data-level': id, d: `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${DIAL_R} ${DIAL_R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}` });
		if (id === level) path.setAttribute('data-active', 'true');
		canvas.append(path);
	});
	const angle = 180 - position * 1.8;
	const tip = dialPoint(angle, DIAL_R - 13);
	const tail = dialPoint(angle + 180, 6);
	canvas.append(svg('line', { class: 'oaci-ed-dial__needle', x1: tail.x.toFixed(2), y1: tail.y.toFixed(2), x2: tip.x.toFixed(2), y2: tip.y.toFixed(2) }));
	canvas.append(svg('circle', { class: 'oaci-ed-dial__hub', cx: DIAL_CX, cy: DIAL_CY, r: 3.5 }));
	holder.append(canvas);
	return holder;
}

/**
 * The three readings as chips: the AI-pattern level, text integrity, editorial
 * signals. Each chip prints its own word beside its own colour, so colour is
 * never the only thing carrying the meaning.
 *
 * @param {object} result canonical checker-result
 * @param {object} names  level id -> name
 * @returns {Element}
 */
export function renderReadingChips(result, names) {
	const ai = result.axes.ai_pattern;
	const characters = formatCharacterReading(result);
	const writing = formatEditorialReading(result);
	const list = element('ul', 'oaci-ed-chips');
	const rows = [
		{ id: 'ai', label: 'AI pattern', reading: ai.level ? names[ai.level] : 'Not assessed', state: ai.assessment_status, level: ai.level },
		{ id: 'integrity', label: 'Character checks', reading: characters.value, state: characters.status, level: null },
		{ id: 'editorial', label: 'Writing rules', reading: writing.value, state: writing.status, level: null }
	];
	for (const row of rows) {
		const item = element('li', 'oaci-ed-chip');
		item.dataset.axis = row.id;
		item.dataset.state = row.state;
		if (row.level) item.dataset.level = row.level;
		item.append(element('span', 'oaci-ed-chip__label', row.label), element('span', 'oaci-ed-chip__reading', row.reading));
		list.append(item);
	}
	return list;
}

/**
 * The whole compact reading, drawn into `target`.
 *
 * A run that produced no AI reading is drawn as itself: no dial, no score, no
 * level, and the run's own reason where the level would be. It is never drawn as
 * a pass, and the two readings that did run are still shown.
 *
 * @param {Element} target
 * @param {object} result canonical checker-result
 * @param {{levels: object, honestyLine: string, routeSentence?: string, aiAssessed?: boolean}} options
 * @returns {Element} the summary element
 */
export function renderEditorSummary(target, result, options) {
	const names = Object.fromEntries(Object.entries(options.levels || {}).map(([id, value]) => [id, typeof value === 'string' ? value : value?.name || id]));
	const ai = result.axes.ai_pattern;
	const assessed = ai.assessment_status === 'assessed' && Boolean(ai.level);
	const summary = element('div', 'oaci-ed-result');
	summary.dataset.assessed = assessed ? 'true' : 'false';
	if (assessed) summary.dataset.level = ai.level;

	const head = element('div', 'oaci-ed-result__head');
	if (assessed) {
		head.append(renderMiniDial(ai.level, names));
		const read = element('div', 'oaci-ed-result__read');
		read.append(element('p', 'oaci-ed-level', names[ai.level]));
		const score = element('p', 'oaci-ed-score');
		score.append(element('b', null, ai.display_score), element('small', null, 'Pattern score · 0–1'));
		read.append(score);
		head.append(read);
	} else {
		const read = element('div', 'oaci-ed-result__read');
		read.append(element('p', 'oaci-ed-level', ai.assessment_status === 'error' ? 'AI reading unavailable' : 'No trained model ran'));
		read.append(element('p', 'oaci-ed-score', 'No score and no level, because none was produced.'));
		head.append(read);
	}
	summary.append(head);

	const meaning = assessed ? CHECKER_LEVEL_MEANINGS[ai.level] : ai.reason;
	const sentenceEnd = assessed ? meaning.indexOf('. ') : -1;
	const leadMeaning = sentenceEnd < 0 ? meaning : meaning.slice(0, sentenceEnd + 1);
	const meaningDetail = sentenceEnd < 0 ? '' : meaning.slice(sentenceEnd + 2);
	summary.append(element('p', 'oaci-ed-meaning', leadMeaning));
	if (typeof options.sourceText === 'string' && options.sourceText.trim()) {
		const evidence = buildDraftEvidence(options.sourceText, { selectedRuleFindings: options.selectedRuleFindings });
		const observations = element('div', 'oaci-ed-evidence');
		observations.append(element('p', 'oaci-ed-evidence__title', 'What you can see in the writing'));
		for (const observation of evidence.observations.slice(0, 1)) {
			const item = element('div', 'oaci-ed-evidence__item');
			item.append(element('strong', null, observation.title));
			for (const quote of observation.quotes.slice(0, 1)) item.append(element('blockquote', null, quote.text));
			const detail = element('details', 'oaci-ed-details');
			detail.append(element('summary', null, 'Why this is worth reviewing'));
			detail.append(element('p', null, observation.explanation), element('p', null, observation.basis), element('p', null, observation.caveat));
			item.append(detail);
			observations.append(item);
		}
		if (!evidence.observations.length) {
			const detail = element('details', 'oaci-ed-details');
			detail.append(element('summary', null, 'No specific writing example found'));
			detail.append(element('p', null, 'No specific phrase or structure example passed these checks. That does not establish who wrote the text, and these checks cannot explain the model score.'));
			summary.append(detail);
		} else {
		observations.append(element('p', 'oaci-ed-evidence__boundary', 'Writing observations, not a proven explanation of the model score.'));
		summary.append(observations);
		}
	}

	const supportingChecks = renderReadingChips(result, names);
	supportingChecks.querySelector('[data-axis="ai"]')?.remove();
	summary.append(supportingChecks);

	const sections = Array.isArray(result.sections) ? result.sections : [];
	const strongest = sections.find((section) => section.index === ai.strongest_section_index);
	if (assessed && strongest && sections.length > 1 && ai.level !== 'signal-likely-human') {
		summary.append(element('p', 'oaci-ed-strongest', `Section ${strongest.index + 1} of ${sections.length} read strongest, at ${strongest.display_score}.`));
	}

	summary.append(element('p', 'oaci-ed-honesty', 'Patterns, not proof of authorship.'));
	const details = element('details', 'oaci-ed-details oaci-ed-privacy');
	details.append(element('summary', null, 'Privacy & score details'));
	if (meaningDetail) details.append(element('p', 'oaci-ed-meaning-detail', meaningDetail));
	if (options.routeSentence) details.append(element('p', 'oaci-ed-route', options.routeSentence));
	if (options.honestyLine) details.append(element('p', 'oaci-ed-honesty', options.honestyLine));
	if (assessed) details.append(element('p', 'oaci-ed-honesty', 'The pattern score runs from 0 to 1. It is not a percentage probability that AI wrote this draft.'));
	summary.append(details);

	target.replaceChildren(summary);
	return summary;
}
