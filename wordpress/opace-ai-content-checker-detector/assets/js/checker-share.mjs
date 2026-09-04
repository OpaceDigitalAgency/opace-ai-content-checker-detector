/**
 * Sharing a reading.
 *
 * The dialog itself is the cross-surface one in
 * `assets/vendor/shared/presentation/`, so the WordPress plugin, the Chrome
 * panel and the website offer the same destinations in the same words, and the
 * link a reader copies here opens as a read-only result on the product page.
 * What travels is a summary — the level, the section scores already on screen,
 * the word count, the date and the model version — carried in the URL fragment,
 * which a browser never sends to a server. The checked draft never travels.
 *
 * A run that produced no reading is not shareable, whatever its export block
 * still carries: `buildShareSummary` returns null for a withheld, errored,
 * too-short or unassessed run, and the caller says so rather than opening an
 * empty sheet.
 */
import {
	buildShareSummary,
	openShareSheet
} from '../vendor/shared/presentation/checker-result-presentation.mjs';

export { buildShareSummary };

/**
 * The share functions take a flat level-id-to-name table, while the renderer's
 * `levels` option takes this runtime's `{ name, support }` records. Handing the
 * records straight over prints "[object Object]" in the mail body and in the
 * native-share text, so the table is flattened here rather than a second copy
 * of the names being kept.
 *
 * @param {object} levels this runtime's level vocabulary
 * @returns {object|undefined} level id to name, or undefined to use the defaults
 */
export function shareLevelNames(levels) {
	if (!levels || typeof levels !== 'object') return undefined;
	return Object.fromEntries(
		Object.entries(levels).map(([id, value]) => [id, typeof value === 'string' ? value : String(value?.name ?? id)])
	);
}

/**
 * Open the shared share sheet for a finished reading.
 *
 * @param {object} result canonical checker-result
 * @param {object} options { levels, returnFocusTo, onOutcome, document, navigator }
 * @returns {object|null} the sheet handle, or null when there is no reading to share
 */
/**
 * The dialog is mounted on `document.body`, outside the plugin's own wrapper,
 * and the shared stylesheet turns it dark on `prefers-color-scheme` alone. The
 * admin around it is painted by the reader's WordPress colour scheme, which the
 * system preference does not touch, so a dark sheet could land on a light
 * screen. It is pinned to the side the admin is on, the same rule the result
 * itself follows.
 *
 * @param {Document} documentRef the document the dialog will be mounted in
 * @returns {'light'|undefined} the theme to pin, or undefined to follow the preference
 */
function adminSheetTheme(documentRef) {
	return documentRef?.body?.classList?.contains('admin-color-midnight') === true ? undefined : 'light';
}

export function openCheckerShareSheet(result, options = {}) {
	const summary = buildShareSummary(result);
	if (!summary) return null;
	const doc = options.document ?? (typeof document !== 'undefined' ? document : null);
	const theme = adminSheetTheme(doc);
	return openShareSheet({
		summary,
		result,
		idPrefix: 'oaci-lab-share',
		levels: shareLevelNames(options.levels),
		...(theme ? { theme } : {}),
		returnFocusTo: options.returnFocusTo,
		onOutcome: options.onOutcome,
		onClose: options.onClose,
		document: options.document,
		navigator: options.navigator
	});
}
