/**
 * The result view.
 *
 * The drawing is done by the cross-surface renderer in
 * `assets/vendor/shared/presentation/`, copied into this bundle by
 * `bin/sync-shared-presentation.mjs`, so the WordPress plugin, the Chrome
 * extension and the website all present the same reading in the same shapes.
 * This file is the WordPress adapter and holds only what is specific to this
 * surface: the canonical level vocabulary from this plugin's own runtime, the
 * packaged logo, and the mapping from the deterministic writing-rule findings
 * to the passages they fall in, which the shared renderer takes through its
 * documented `advice` option.
 */
import { mount as mountSharedResult } from '../vendor/shared/presentation/checker-result-presentation.mjs';

export const SURFACE_NAME = 'WordPress Lab';

/** The most advice cards worth showing under one passage. */
const ADVICE_PER_SECTION = 8;

/**
 * Which writing-rule findings fall inside each scored section.
 *
 * A finding is matched by the text it quotes whenever it quotes one, so the
 * card always points at something the reader can see in the passage above it.
 * Offsets are used only for plain text, where the checked projection and the
 * draft are the same characters; for Markdown and HTML the projection shifts
 * them, so a quote match is the only honest way to place a card.
 *
 * @param {object} result canonical checker-result
 * @param {Array} findings deterministic pattern findings
 * @param {string} sourceText the local draft
 * @param {string} contentType the draft's declared type
 * @returns {Array<Array<object>>} advice entries indexed by section index
 */
export function buildSectionAdvice(result, findings, sourceText, contentType) {
	const sections = Array.isArray(result?.sections) ? result.sections : [];
	const list = Array.isArray(findings) ? findings : [];
	const source = typeof sourceText === 'string' ? sourceText : '';
	const offsetsUsable = contentType === 'plain_text' && source.length > 0;
	return sections.map((section) => {
		const passage = typeof section.passage === 'string' && section.passage
			? section.passage
			: source.slice(section.start_utf16, section.end_utf16);
		const lower = passage.toLowerCase();
		const entries = [];
		for (const finding of list) {
			const matched = typeof finding?.evidence?.matched === 'string' ? finding.evidence.matched : '';
			const inPassage = matched
				? lower.includes(matched.toLowerCase())
				: offsetsUsable
					&& Number.isInteger(finding?.span?.start_utf16)
					&& finding.span.start_utf16 >= section.start_utf16
					&& finding.span.start_utf16 < section.end_utf16;
			if (!inPassage) continue;
			entries.push({
				rule_id: finding.rule_id,
				quote: matched,
				suggestion: finding.suggestion,
				message: finding.message
			});
			if (entries.length >= ADVICE_PER_SECTION) break;
		}
		return entries;
	});
}

/**
 * Draws the result into `target` and returns the shared renderer's handle.
 *
 * @param target element to render into
 * @param result canonical checker-result
 * @param sourceText the local draft, for advice placement
 * @param semantics this runtime's levels, honesty line and validator
 * @param documentRef unused by the shared renderer; kept for the call sites
 * @param options {findings, contentType, onShowInDraft, logoUrl}
 */
export function renderCheckerResult(target, result, sourceText, semantics, documentRef = document, options = {}) {
	if (!semantics?.levels || typeof semantics.assertResult !== 'function') throw new Error('Canonical checker-result semantics are required.');
	semantics.assertResult(result);
	const advice = buildSectionAdvice(result, options.findings, sourceText, options.contentType);
	const view = mountSharedResult(target, result, {
		surface: SURFACE_NAME,
		// The level names and their one-sentence meanings come from this
		// plugin's own runtime, so the two copies cannot drift.
		levels: semantics.levels,
		// WordPress owns the screen's h1, so the result opens at h2.
		headingLevel: 2,
		idPrefix: 'oaci-lab',
		measurePassages: true,
		advice,
		// The toolbar is the plugin's own, above the result and always present,
		// so the renderer draws no action bar of its own.
		actions: [],
		actionStatusSlot: false,
		...(options.logoUrl ? { logoHtml: `<img src="${options.logoUrl}" alt="" width="48" height="48">` } : {}),
		onToggleSection(index, open) {
			if (open && typeof options.onShowInDraft === 'function') {
				const section = result.sections[index];
				if (section) options.onShowInDraft(section.start_utf16, section.end_utf16, index + 1);
			}
		}
	});
	const heading = target.querySelector('h2, h3');
	if (heading) {
		heading.tabIndex = -1;
		heading.focus();
	}
	return view;
}
