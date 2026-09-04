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
import { createSectionAccordion } from './checker-workbench.mjs';

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
 * Keep the shared result on the same side of light and dark as the screen it
 * sits in.
 *
 * The shared component answers `prefers-color-scheme` on its own, which is
 * right on the website, in the Chrome panel and in the Astro toolbar, because
 * each of those is the whole screen. Here it is half of one: WordPress paints
 * the admin from the reader's own admin colour scheme, which the operating
 * system's preference does not touch, and this plugin's palette follows suit —
 * `admin.css` turns dark only under Midnight. Left as it was, a reader on a
 * light admin scheme with a dark system got a dark reading beside a light draft
 * in one workbench.
 *
 * `data-theme` is the shared stylesheet's own documented override. It is set to
 * `light` on every admin scheme but Midnight, and left off under Midnight so
 * the component follows the preference exactly as the plugin's own tokens do.
 *
 * @param {Element} target the element the result was mounted into
 * @param {Document} documentRef the document that owns it
 */
export function applyAdminColourScheme(target, documentRef = document) {
	const dark = documentRef?.body?.classList?.contains('admin-color-midnight') === true;
	for (const node of target.querySelectorAll('.oaci-result')) {
		if (dark) node.removeAttribute('data-theme');
		else node.setAttribute('data-theme', 'light');
	}
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
		...(options.logoUrl ? { logoHtml: `<img src="${options.logoUrl}" alt="" width="48" height="48">` } : {})
	});
	applyAdminColourScheme(target, documentRef);
	// The owner's requirement is one section open at a time, opened inside its
	// own row, with the row pinned and a strip that steps between sections. The
	// shared renderer draws the rows and the dives as siblings with every dive
	// open, and shared/ is frozen, so the rearranging happens here.
	const accordion = createSectionAccordion(target, {
		sections: Array.isArray(result.sections) ? result.sections : [],
		// This runtime holds each level as { name, support }; the strip wants names.
		levelLabels: Object.fromEntries(
			Object.entries(semantics.levels || {}).map(([id, value]) => [id, typeof value === 'string' ? value : value?.name || id])
		),
		onOpen(index, section) {
			if (section && typeof options.onShowInDraft === 'function') {
				options.onShowInDraft(section.start_utf16, section.end_utf16, index + 1, section);
			}
		},
		onClose() {
			if (typeof options.onClearDraft === 'function') options.onClearDraft();
		}
	});
	const heading = target.querySelector('h2, h3');
	if (heading) {
		heading.tabIndex = -1;
		heading.focus();
	}
	view.accordion = accordion;
	return view;
}
