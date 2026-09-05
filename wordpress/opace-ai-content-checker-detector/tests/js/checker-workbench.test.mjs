import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
	BAND_LEVELS,
	draftMirrorParts,
	locateSection,
	nextRowForKey,
	stepLabel
} from '../../assets/js/checker-workbench.mjs';

const cssUrl = new URL('../../assets/css/lab.css', import.meta.url);
const pageUrl = new URL('../../includes/Admin/LabPage.php', import.meta.url);
const appUrl = new URL('../../assets/js/lab-app.mjs', import.meta.url);
const shareUrl = new URL('../../assets/js/checker-share.mjs', import.meta.url);

/* ---------------------------------------------- mapping a section to a draft */

test('a section whose offsets hold is placed by its UTF-16 offsets', () => {
	const draft = 'One sentence here. And a second sentence follows it.';
	const section = { start_utf16: 19, end_utf16: 51, passage: draft.slice(19, 51) };
	assert.deepEqual(locateSection(section, draft), { start: 19, end: 51, exact: true });
});

test('offsets count UTF-16 code units, so an astral character moves them', () => {
	// The rocket is one code point and two UTF-16 code units. A mapping that
	// counted code points would land one character short of the passage.
	const draft = 'Launch 🚀 day was quiet. The report reads like a template.';
	const start = draft.indexOf('The report');
	const section = { start_utf16: start, end_utf16: draft.length, passage: draft.slice(start) };
	const span = locateSection(section, draft);
	assert.deepEqual(span, { start, end: draft.length, exact: true });
	assert.equal(draft.slice(span.start, span.end), 'The report reads like a template.');
	assert.equal(start, 25);
});

test('offsets that no longer point at the passage are refused, and the passage is found instead', () => {
	const draft = 'A preface nobody scored. The second complete passage is the strongest.';
	const passage = 'The second complete passage is the strongest.';
	// The offsets are the projection's, not this draft's: following them would
	// tint the wrong words, which is worse than tinting none.
	const span = locateSection({ start_utf16: 0, end_utf16: 44, passage }, draft);
	assert.deepEqual(span, { start: 25, end: 70, exact: false });
	assert.equal(draft.slice(span.start, span.end), passage);
});

test('a passage that is not in the draft at all places nothing', () => {
	assert.equal(locateSection({ start_utf16: 0, end_utf16: 9, passage: 'not here' }, 'a different draft entirely'), null);
	assert.equal(locateSection({ start_utf16: 0, end_utf16: 4, passage: 'abcd' }, ''), null);
	assert.equal(locateSection(null, 'anything'), null);
});

test('a section with no passage is trusted to its offsets, and only inside the draft', () => {
	const draft = 'Twelve chars and more.';
	assert.deepEqual(locateSection({ start_utf16: 0, end_utf16: 12 }, draft), { start: 0, end: 12, exact: true });
	assert.equal(locateSection({ start_utf16: 0, end_utf16: 900 }, draft), null);
	assert.equal(locateSection({ start_utf16: 5, end_utf16: 5 }, draft), null);
});

test('the fixture result places both of its passages in a draft that carries them', async () => {
	const fixture = JSON.parse(await readFile(new URL('../fixtures/contracts/valid/checker-result.json', import.meta.url), 'utf8')).data;
	const [first, second] = fixture.sections;
	const draft = `${first.passage}\n\n${second.passage}\n`;
	const one = locateSection(first, draft);
	const two = locateSection(second, draft);
	assert.equal(draft.slice(one.start, one.end), first.passage);
	assert.equal(draft.slice(two.start, two.end), second.passage);
	assert.ok(two.start > one.end, 'sections stay in document order');
});

/* -------------------------------------------------- the three-part mirror */

test('the mirror splits the draft into before, marked and after, and loses nothing', () => {
	const draft = 'Alpha beta gamma delta';
	const parts = draftMirrorParts(draft, { start: 6, end: 16 });
	assert.deepEqual(parts, { before: 'Alpha ', marked: 'beta gamma', after: ' delta' });
	assert.equal(parts.before + parts.marked + parts.after, draft);
});

test('no span means the whole draft and no mark', () => {
	assert.deepEqual(draftMirrorParts('Alpha beta', null), { before: 'Alpha beta', marked: '', after: '' });
});

test('a span beyond the draft is clamped rather than throwing', () => {
	const parts = draftMirrorParts('short', { start: 2, end: 900 });
	assert.deepEqual(parts, { before: 'sh', marked: 'ort', after: '' });
	assert.equal(parts.before + parts.marked + parts.after, 'short');
});

/* ------------------------------------------------------- the sticky strip */

test('the strip names the section, its level and its score, in that order', () => {
	assert.equal(stepLabel(1, 5, 'Strongly AI', '0.969'), 'Section 2 of 5 · Strongly AI · Score 0.969');
	// A score string is printed exactly as the contract gave it, never re-rounded.
	assert.match(stepLabel(0, 2, 'Likely AI', '0.966'), /Score 0\.966$/);
	assert.equal(stepLabel(0, 1, '', ''), 'Section 1 of 1');
});

test('the five band ids are the renderer’s own, low to high', () => {
	assert.deepEqual([...BAND_LEVELS], [
		'signal-likely-human', 'signal-unclear', 'signal-potentially-ai', 'signal-likely-ai', 'signal-strongly-ai'
	]);
});

/* ----------------------------------------------------------- arrow keying */

test('arrow keys step through the section list and stop at both ends', () => {
	assert.equal(nextRowForKey('ArrowDown', 0, 4), 1);
	assert.equal(nextRowForKey('ArrowRight', 0, 4), 1);
	assert.equal(nextRowForKey('ArrowUp', 2, 4), 1);
	assert.equal(nextRowForKey('ArrowLeft', 2, 4), 1);
	assert.equal(nextRowForKey('ArrowDown', 3, 4), 3, 'the last row is the last row');
	assert.equal(nextRowForKey('ArrowUp', 0, 4), 0, 'the first row is the first row');
	assert.equal(nextRowForKey('Home', 3, 4), 0);
	assert.equal(nextRowForKey('End', 0, 4), 3);
	assert.equal(nextRowForKey('Enter', 1, 4), null);
	assert.equal(nextRowForKey(' ', 1, 4), null);
	assert.equal(nextRowForKey('ArrowDown', 0, 0), null);
});

/* --------------------------------------------------- the layout, in the CSS */

test('the workbench is two columns from 1100 px and one column below it', async () => {
	const css = await readFile(cssUrl, 'utf8');
	const breakpoint = css.slice(css.indexOf('@media (min-width: 1100px)'));
	assert.ok(css.includes('@media (min-width: 1100px)'), 'the workbench has a 1100 px breakpoint');
	// The website's own proportions: 1.08fr against a 430 px-floored 0.92fr.
	assert.match(breakpoint, /grid-template-columns: minmax\(0, 1\.08fr\) minmax\(430px, 0\.92fr\)/);
	// The page owns scrolling; only the action bar remains pinned.
	const desktopColumns = breakpoint.slice(0, breakpoint.indexOf('/* Inside the workbench'));
	assert.doesNotMatch(desktopColumns, /overflow-y: auto|max-height: calc\(100vh|position: sticky/);
	assert.match(css, /\.oaci-action-bar\s*\{[^}]*position: sticky/s);
	// One column below that width: the base rule is a single track.
	assert.match(css.slice(0, css.indexOf('@media (min-width: 1100px)')), /\.oaci-lab \{[^}]*grid-template-columns: minmax\(0, 1fr\)/s);
});

test('the draft column comes first in the markup, so one column puts the draft above the result', async () => {
	const page = await readFile(pageUrl, 'utf8');
	const draftColumn = page.indexOf('data-oaci-column="draft"');
	const resultColumn = page.indexOf('data-oaci-column="result"');
	assert.ok(draftColumn > -1 && resultColumn > draftColumn, 'draft column precedes the result column');
	assert.ok(page.indexOf('id="oaci-step-draft"') > draftColumn);
	assert.ok(page.indexOf('id="oaci-step-route"') > draftColumn);
	assert.ok(page.indexOf('id="oaci-step-route"') < resultColumn, 'both steps are in the draft column');
	assert.ok(page.indexOf('id="oaci-result-panel"') > resultColumn);
});

test('the draft box has a mirror to tint a passage in, and a way back to plain editing', async () => {
	const page = await readFile(pageUrl, 'utf8');
	assert.match(page, /data-oaci-draft-field/);
	assert.match(page, /id="oaci-draft-mirror"[^>]*hidden/);
	assert.match(page, /id="oaci-draft-mirror-text"/);
	assert.match(page, /id="oaci-draft-edit"/);
	const css = await readFile(cssUrl, 'utf8');
	// Every band has its own tint, and each mark carries a rule in the band's ink
	// so the passage is findable without colour.
	for (const level of BAND_LEVELS) {
		assert.match(css, new RegExp(`\\.oaci-draft-mirror__mark\\[data-level="${level}"\\]`));
	}
	assert.match(css, /\.oaci-draft-mirror__mark \{[^}]*border-bottom: 2px solid/s);
});

test('nothing claims a section is selected unless a tint was painted', async () => {
	const app = await readFile(appUrl, 'utf8');
	const body = app.slice(app.indexOf('function showInDraft'), app.indexOf('function clearDraftSelection'));
	assert.match(body, /const painted = draftMirror\.highlight\(/);
	assert.match(body, /if \(painted\) announce\(/);
	// The announcement is inside the painted branch and nowhere else.
	assert.equal((body.match(/is selected in your draft/g) || []).length, 1);
	assert.ok(body.indexOf('const painted') < body.indexOf('is selected in your draft'));
});

test('the share button opens the shared share sheet, and the receipt button is untouched', async () => {
	const app = await readFile(appUrl, 'utf8');
	const share = await readFile(shareUrl, 'utf8');
	assert.match(share, /openShareSheet/);
	assert.match(share, /from '\.\.\/vendor\/shared\/presentation\/checker-result-presentation\.mjs'/);
	assert.match(app, /openCheckerShareSheet\(canonicalResult, \{/);
	assert.match(app, /returnFocusTo: shareButton/);
	// A run with no reading never opens an empty sheet.
	assert.match(app, /if \(!sheet\) \{/);
	assert.match(app, /produced no reading to share/);
	// "Save hash-only receipt" still saves a hash-only receipt.
	assert.match(app, /receiptButton\?\.addEventListener\('click'/);
});
