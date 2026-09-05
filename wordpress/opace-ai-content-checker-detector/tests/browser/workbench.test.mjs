/**
 * The workbench, in a real browser.
 *
 * The layout, the accordion, the draft tint and the share sheet are all things a
 * string assertion cannot settle: a grid track, a sticky row, a painted `<mark>`
 * and a modal dialog only exist once a browser has laid them out. These run
 * against the plugin's own files, served from disk, with no WordPress and no
 * network beyond the loopback server this file starts.
 *
 * Every test here carries a control where one is possible: a probe that cannot
 * fail is not evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '../../../../node_modules/playwright/index.mjs';

const pluginDir = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const TYPES = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html; charset=utf-8' };

const HARNESS = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<link rel="stylesheet" href="/assets/css/admin.css">
<link rel="stylesheet" href="/assets/vendor/shared/presentation/checker-ui.css">
<link rel="stylesheet" href="/assets/css/lab.css">
<title>workbench harness</title></head>
<body class="wp-admin"><div class="wrap oaci-wrap oaci-checker-page"><div class="oaci-lab" id="oaci-lab-root">
<div class="oaci-action-bar"><div class="oaci-action-bar__summary"><strong>On this device</strong><p>Your draft stays in this browser.</p></div><button id="oaci-inspect" class="oaci-button oaci-button--primary">Check my draft</button></div>
<div class="oaci-lab__column oaci-lab__column--draft" data-oaci-column="draft">
  <section class="oaci-panel" id="oaci-step-draft">
    <label for="oaci-source">Your draft</label>
    <div class="oaci-draft-field" data-oaci-draft-field>
      <textarea id="oaci-source" rows="10"></textarea>
      <div class="oaci-draft-mirror" id="oaci-draft-mirror" data-oaci-draft-mirror hidden>
        <div class="oaci-draft-mirror__text" id="oaci-draft-mirror-text" tabindex="0" role="group" aria-label="Your draft, with the chosen section tinted"></div>
        <p class="oaci-draft-mirror__foot"><span id="oaci-draft-mirror-state">Choose a section.</span>
        <button type="button" class="oaci-button oaci-button--quiet" id="oaci-draft-edit">Edit the draft</button></p>
      </div>
    </div>
  </section>
  <section class="oaci-panel" id="oaci-step-route"><p>Route</p></section>
</div>
<div class="oaci-lab__column oaci-lab__column--result" data-oaci-column="result">
  <section class="oaci-panel oaci-result-panel" id="oaci-result-panel" tabindex="0">
    <h2>Your result</h2>
    <button type="button" class="oaci-button" id="oaci-copy-share">Copy share summary</button>
    <div id="oaci-results"></div>
  </section>
</div>
</div></div>
<script type="module">
import { renderCheckerResult } from '/assets/js/checker-result.mjs';
import { openCheckerShareSheet } from '/assets/js/checker-share.mjs';
import { createDraftMirror, locateSection } from '/assets/js/checker-workbench.mjs';

const CHECKER_LEVELS = {
  'signal-strongly-ai': { name: 'Strongly AI', support: 'This draft very strongly matches AI writing.' },
  'signal-likely-ai': { name: 'Likely AI', support: 'Much of this draft reads like AI writing.' },
  'signal-potentially-ai': { name: 'Potentially AI', support: 'Parts of this draft resemble AI writing.' },
  'signal-unclear': { name: 'Unclear', support: 'We cannot call this one either way.' },
  'signal-likely-human': { name: 'Likely human', support: 'This reads like human writing.' }
};
const result = (await (await fetch('/tests/fixtures/contracts/valid/checker-result.json')).json()).data;
const draft = result.sections.map((section) => section.passage).join('\\n\\n') + '\\n';
document.querySelector('#oaci-source').value = draft;

const mirror = createDraftMirror({
  field: document.querySelector('[data-oaci-draft-field]'),
  textarea: document.querySelector('#oaci-source'),
  mirror: document.querySelector('#oaci-draft-mirror'),
  mirrorText: document.querySelector('#oaci-draft-mirror-text'),
  mirrorState: document.querySelector('#oaci-draft-mirror-state'),
  editButton: document.querySelector('#oaci-draft-edit')
});
window.__announcements = [];
renderCheckerResult(document.querySelector('#oaci-results'), result, draft, {
  levels: CHECKER_LEVELS, honestyLine: 'Evidence, not guarantees', assertResult: () => {}
}, document, {
  findings: [], contentType: 'plain_text',
  onShowInDraft(start, end, number, section) {
    const span = locateSection(section || { start_utf16: start, end_utf16: end }, draft);
    if (!span) return;
    if (!mirror.shown) mirror.show(draft);
    const painted = mirror.highlight(span, section?.level || '', 'Section ' + number + ' is tinted above.');
    if (painted) window.__announcements.push('Section ' + number + ' is selected in your draft.');
  },
  onClearDraft() { mirror.clearHighlight(); }
});
document.querySelector('#oaci-copy-share').addEventListener('click', () => {
  window.__sheet = openCheckerShareSheet(result, { levels: CHECKER_LEVELS, returnFocusTo: document.querySelector('#oaci-copy-share') });
});
window.__mirror = mirror;
window.__result = result;
window.__draft = draft;
window.__ready = true;
</script></body></html>`;

async function serve() {
	const server = createServer(async (request, response) => {
		const url = new URL(request.url, 'http://127.0.0.1');
		if (url.pathname === '/' || url.pathname === '/harness.html') {
			response.writeHead(200, { 'content-type': TYPES['.html'] });
			response.end(HARNESS);
			return;
		}
		const path = join(pluginDir, normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
		if (!path.startsWith(pluginDir)) { response.writeHead(403).end(); return; }
		try {
			const info = await stat(path);
			if (!info.isFile()) throw new Error('not a file');
		} catch {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
		createReadStream(path).pipe(response);
	});
	await new Promise((done) => server.listen(0, '127.0.0.1', done));
	return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function open(width = 1440, height = 1000) {
	const { server, origin } = await serve();
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width, height } });
	const errors = [];
	page.on('pageerror', (error) => errors.push(String(error)));
	page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
	await page.goto(`${origin}/harness.html`);
	await page.waitForFunction(() => window.__ready === true);
	return {
		page,
		errors,
		async close() { await browser.close(); await new Promise((done) => server.close(done)); }
	};
}

const columns = (page) => page.evaluate(() => {
	const draft = document.querySelector('[data-oaci-column="draft"]').getBoundingClientRect();
	const result = document.querySelector('[data-oaci-column="result"]').getBoundingClientRect();
	return { draft: { x: draft.x, width: draft.width, bottom: draft.bottom }, result: { x: result.x, y: result.y, width: result.width } };
});

/* ------------------------------------------------------------ the layout */

test('expanded named checks retain padding and keyboard-operable disclosure targets', async () => {
	const session = await open();
	try {
		for (const width of [1440, 768, 375]) {
			await session.page.setViewportSize({ width, height: 900 });
			const summary = session.page.locator('.oaci-check__details > summary').first();
			await summary.focus();
			if (!(await session.page.locator('.oaci-check__details').first().evaluate(node => node.open))) {
				await session.page.keyboard.press('Enter');
			}
			assert.equal(await session.page.locator('.oaci-check__details').first().evaluate(node => node.open), true);
			const rows = await session.page.locator('.oaci-check').evaluateAll(nodes => nodes.map(node => ({
				padding: getComputedStyle(node).padding,
				target: node.querySelector('summary').getBoundingClientRect().height,
				overflow: node.scrollWidth > node.clientWidth + 1
			})));
			assert.ok(rows.length > 0);
			for (const row of rows) {
				assert.equal(row.padding, '16px');
				assert.ok(row.target >= 44);
				assert.equal(row.overflow, false);
			}
		}
	} finally {
		await session.close();
	}
});

test('the workbench is two columns at 1440 and at 1280, and one column at 1024 and 375', async () => {
	const session = await open(1440, 1000);
	try {
		const wide = await columns(session.page);
		assert.ok(wide.result.x > wide.draft.x + wide.draft.width - 2, 'the result sits beside the draft, not under it');
		assert.ok(wide.draft.width > wide.result.width, 'the draft column is the wider of the two');
		// The website's proportions: 1.08 against 0.92, allowing for the gutter.
		const ratio = wide.draft.width / wide.result.width;
		assert.ok(ratio > 1.05 && ratio < 1.25, `column ratio ${ratio.toFixed(3)} is the website's 1.08 : 0.92`);

		await session.page.setViewportSize({ width: 1280, height: 900 });
		const medium = await columns(session.page);
		assert.ok(medium.result.x > medium.draft.x + medium.draft.width - 2, 'still two columns at 1280');

		// The control: below the breakpoint the same markup must stack, or the
		// probe above proves nothing.
		await session.page.setViewportSize({ width: 1024, height: 900 });
		const narrow = await columns(session.page);
		assert.ok(Math.abs(narrow.result.x - narrow.draft.x) < 2, 'one column at 1024: the two share a left edge');
		assert.ok(narrow.result.y >= narrow.draft.bottom - 2, 'the result is below the draft, not beside it');

		await session.page.setViewportSize({ width: 375, height: 800 });
		const phone = await columns(session.page);
		assert.ok(Math.abs(phone.result.x - phone.draft.x) < 2, 'one column at exactly 375');
		const overflow = await session.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
		assert.ok(overflow <= 0, `no horizontal overflow at 375 (${overflow}px)`);
		assert.deepEqual(session.errors, []);
	} finally {
		await session.close();
	}
});

test('the page owns scrolling and the primary action remains visible', async () => {
	const session = await open(1440, 700);
	try {
		const measured = await session.page.evaluate(() => {
			const draft = document.querySelector('[data-oaci-column="draft"]');
			const result = document.querySelector('[data-oaci-column="result"]');
			const read = (node) => {
				const style = getComputedStyle(node);
				return { position: style.position, overflowY: style.overflowY, scrollable: node.scrollHeight > node.clientHeight + 1 };
			};
			result.scrollTop = 400;
			return { draft: read(draft), result: read(result), resultScrolled: result.scrollTop, draftScrolled: draft.scrollTop };
		});
		assert.equal(measured.result.position, 'static');
		assert.equal(measured.draft.position, 'static');
		assert.equal(measured.result.overflowY, 'visible');
		assert.equal(measured.resultScrolled, 0, 'the result column does not trap scrolling');
		assert.equal(measured.draftScrolled, 0, 'the draft column does not trap scrolling');
		for (const width of [1440, 1280, 375]) {
			await session.page.setViewportSize({ width, height: 700 });
			await session.page.evaluate(() => window.scrollTo(0, 500));
			const action = await session.page.locator('#oaci-inspect').boundingBox();
			assert.ok(action.y >= 0 && action.y + action.height <= 700, `primary action visible at ${width}px`);
		}
	} finally {
		await session.close();
	}
});

/* --------------------------------------------------------- the accordion */

test('section rows open in place, one at a time, with the row pinned and a step strip', async () => {
	const session = await open();
	try {
		const state = () => session.page.evaluate(() => [...document.querySelectorAll('.oaci-strip__list > li')].map((item) => ({
			open: item.dataset.oaciOpen,
			expanded: item.querySelector('[data-oaci-section-toggle]').getAttribute('aria-expanded'),
			diveInRow: Boolean(item.querySelector('.oaci-dive')),
			diveHidden: item.querySelector('.oaci-dive').hidden,
			pinHidden: item.querySelector('.oaci-dive__pin').hidden,
			step: item.querySelector('.oaci-dive__step').textContent,
			previousDisabled: item.querySelector('[data-oaci-dive-move="previous"]').disabled,
			nextDisabled: item.querySelector('[data-oaci-dive-move="next"]').disabled
		})));

		const closed = await state();
		assert.equal(closed.length, 2);
		assert.ok(closed.every((row) => row.diveInRow), 'every deep dive was moved into its own row');
		assert.ok(closed.every((row) => row.open === 'false' && row.diveHidden && row.pinHidden), 'nothing is open before a row is chosen');
		assert.equal(await session.page.locator('.oaci-dives').count(), 0, 'the separate block of dives is gone');

		await session.page.click('[data-oaci-section-toggle="1"]');
		const second = await state();
		assert.equal(second[1].open, 'true');
		assert.equal(second[1].expanded, 'true');
		assert.equal(second[1].diveHidden, false);
		assert.equal(second[1].pinHidden, false);
		assert.equal(second[1].step, 'Section 2 of 2 · Strongly AI · Score 0.969');
		assert.equal(second[1].nextDisabled, true, 'the last section cannot step forward');
		assert.equal(second[1].previousDisabled, false);
		assert.equal(second[0].open, 'false', 'the other row did not open with it');

		// Only one at a time: opening the first closes the second.
		await session.page.click('[data-oaci-section-toggle="0"]');
		const first = await state();
		assert.equal(first[0].open, 'true');
		assert.equal(first[1].open, 'false');
		assert.equal(first[0].previousDisabled, true, 'the first section cannot step back');
		assert.equal(first[0].step, 'Section 1 of 2 · Likely AI · Score 0.966');

		// The row is pinned while it is open, and only while it is open.
		const pinned = await session.page.evaluate(() => {
			const rows = [...document.querySelectorAll('.oaci-strip__list > li')];
			return rows.map((item) => getComputedStyle(item.querySelector('.oaci-strip__bar')).position);
		});
		assert.deepEqual(pinned, ['sticky', 'static']);
		const offsets = await session.page.evaluate(() => ({
			action: document.querySelector('.oaci-action-bar').getBoundingClientRect().height,
			row: parseFloat(getComputedStyle(document.querySelector('.oaci-dive__row[data-oaci-open="true"] > .oaci-dive__rowbar')).top),
			pin: parseFloat(getComputedStyle(document.querySelector('.oaci-dive__row[data-oaci-open="true"] .oaci-dive__pin')).top)
		}));
		assert.ok(offsets.row >= offsets.action, 'the pinned section clears the persistent action bar');
		assert.ok(offsets.pin > offsets.row, 'section navigation clears the pinned row');

		// Next steps to section 2 and moves focus with it.
		await session.page.click('.oaci-strip__list > li:nth-child(1) [data-oaci-dive-move="next"]');
		const stepped = await state();
		assert.equal(stepped[1].open, 'true');
		assert.equal(stepped[0].open, 'false');
		assert.equal(await session.page.evaluate(() => document.activeElement.dataset.oaciSectionToggle), '1');
		assert.deepEqual(session.errors, []);
	} finally {
		await session.close();
	}
});

test('Escape closes the open section and arrow keys move between rows', async () => {
	const session = await open();
	try {
		await session.page.click('[data-oaci-section-toggle="0"]');
		await session.page.keyboard.press('ArrowDown');
		assert.equal(await session.page.evaluate(() => document.activeElement.dataset.oaciSectionToggle), '1');
		assert.equal(await session.page.evaluate(() => document.querySelectorAll('.oaci-strip__list > li[data-oaci-open="true"]').length), 1);
		assert.equal(await session.page.evaluate(() => document.querySelector('.oaci-strip__list > li:nth-child(2)').dataset.oaciOpen), 'true');

		await session.page.keyboard.press('ArrowUp');
		assert.equal(await session.page.evaluate(() => document.querySelector('.oaci-strip__list > li:nth-child(1)').dataset.oaciOpen), 'true');

		await session.page.keyboard.press('Escape');
		const afterEscape = await session.page.evaluate(() => ({
			open: document.querySelectorAll('.oaci-strip__list > li[data-oaci-open="true"]').length,
			marks: document.querySelectorAll('.oaci-draft-mirror__mark').length,
			focused: document.activeElement.dataset.oaciSectionToggle
		}));
		assert.equal(afterEscape.open, 0, 'Escape closes the open section');
		assert.equal(afterEscape.marks, 0, 'and clears the tint in the draft with it');
		assert.equal(afterEscape.focused, '0', 'focus returns to the row that was open');
		assert.deepEqual(session.errors, []);
	} finally {
		await session.close();
	}
});

/* ------------------------------------------------------------- the draft */

test('choosing a section tints that exact passage in the draft, in the section’s own band colour', async () => {
	const session = await open();
	try {
		await session.page.click('[data-oaci-section-toggle="1"]');
		const painted = await session.page.evaluate(() => {
			const mark = document.querySelector('.oaci-draft-mirror__mark');
			if (!mark) return null;
			const style = getComputedStyle(mark);
			const box = mark.getBoundingClientRect();
			const holder = document.querySelector('#oaci-draft-mirror-text').getBoundingClientRect();
			return {
				text: mark.textContent,
				level: mark.dataset.level,
				background: style.backgroundColor,
				border: style.borderBottomWidth,
				visible: box.width > 0 && box.height > 0,
				inView: box.top >= holder.top - 1 && box.bottom <= holder.bottom + 1,
				textareaHidden: document.querySelector('#oaci-source').hidden,
				announcements: window.__announcements
			};
		});
		assert.ok(painted, 'a passage was tinted');
		assert.equal(painted.text, (await session.page.evaluate(() => window.__result.sections[1].passage)));
		assert.equal(painted.level, 'signal-strongly-ai');
		assert.notEqual(painted.background, 'rgba(0, 0, 0, 0)', 'the tint is a real colour, not transparent');
		assert.equal(painted.border, '2px', 'and carries a rule, so the passage is findable without colour');
		assert.ok(painted.visible && painted.inView, 'the tinted passage is scrolled into view');
		assert.equal(painted.textareaHidden, true, 'the mirror stands in for the plain box while it is shown');
		// The sentence and the colour travel together.
		assert.deepEqual(painted.announcements, ['Section 2 is selected in your draft.']);

		// Choosing the other section moves the tint rather than adding one.
		await session.page.click('[data-oaci-section-toggle="0"]');
		const moved = await session.page.evaluate(() => ({
			count: document.querySelectorAll('.oaci-draft-mirror__mark').length,
			text: document.querySelector('.oaci-draft-mirror__mark').textContent,
			level: document.querySelector('.oaci-draft-mirror__mark').dataset.level
		}));
		assert.equal(moved.count, 1);
		assert.equal(moved.text, await session.page.evaluate(() => window.__result.sections[0].passage));
		assert.equal(moved.level, 'signal-likely-ai');
		assert.deepEqual(session.errors, []);
	} finally {
		await session.close();
	}
});

test('the plain box comes back on an edit, and the draft is never shown carrying a stale tint', async () => {
	const session = await open();
	try {
		await session.page.click('[data-oaci-section-toggle="1"]');
		await session.page.click('#oaci-draft-edit');
		const after = await session.page.evaluate(() => ({
			mirrorHidden: document.querySelector('#oaci-draft-mirror').hidden,
			textareaHidden: document.querySelector('#oaci-source').hidden,
			marks: document.querySelectorAll('.oaci-draft-mirror__mark').length,
			focused: document.activeElement.id
		}));
		assert.equal(after.mirrorHidden, true);
		assert.equal(after.textareaHidden, false);
		assert.equal(after.marks, 0);
		assert.equal(after.focused, 'oaci-source', 'and the caret is in the box the reader asked to edit');

		// Typing in the mirrored text is also an edit.
		await session.page.click('[data-oaci-section-toggle="0"]');
		await session.page.focus('#oaci-draft-mirror-text');
		await session.page.keyboard.press('a');
		assert.equal(await session.page.evaluate(() => document.querySelector('#oaci-source').hidden), false);
		assert.deepEqual(session.errors, []);
	} finally {
		await session.close();
	}
});

/* -------------------------------------------------------------- the share */

test('"Copy share summary" opens the shared share sheet, with a content-free link and no draft in it', async () => {
	const session = await open();
	try {
		await session.page.click('#oaci-copy-share');
		const sheet = await session.page.evaluate(() => {
			const dialog = document.querySelector('[data-oaci-share-sheet]');
			if (!dialog) return null;
			return {
				role: dialog.getAttribute('role'),
				modal: dialog.getAttribute('aria-modal'),
				inBody: dialog.closest('.oaci-lab') === null,
				controls: [...dialog.querySelectorAll('a[href], button')].map((node) => node.textContent.trim()),
				social: dialog.querySelector('[data-oaci-share-to="linkedin"]')?.getAttribute('href') || '',
				hasCopy: Boolean(dialog.querySelector('[data-oaci-share-copy]')),
				text: dialog.textContent,
				focused: document.activeElement.dataset.oaciShareCopy !== undefined
			};
		});
		assert.ok(sheet, 'the sheet opened');
		assert.equal(sheet.role, 'dialog');
		assert.equal(sheet.modal, 'true');
		assert.ok(sheet.inBody, 'the dialog is mounted outside the result, so it is not trapped by its container');
		assert.ok(sheet.controls.length >= 6, `the sheet offers its destinations (${sheet.controls.length})`);
		assert.match(sheet.text, /Your checked text is never included/);
		assert.ok(sheet.hasCopy, 'the first control is "Copy result link"');
		// The link is the website's read-only result URL, and the summary rides in
		// the fragment, which a browser never sends to a server. It is carried on
		// the copy control, and encoded inside each social destination.
		const link = await session.page.evaluate(async () => {
			const module = await import('/assets/vendor/shared/presentation/checker-result-presentation.mjs');
			return module.shareResultUrl(module.buildShareSummary(window.__result));
		});
		assert.match(link, /^https:\/\/opace\.agency\/.*#shared=/);
		assert.ok(sheet.social.includes(encodeURIComponent(link.split('#')[0])), 'the social destinations carry that same link');
		const draft = await session.page.evaluate(() => window.__draft);
		for (const passage of draft.split('\n\n').filter(Boolean)) {
			const words = passage.slice(0, 20);
			assert.ok(!link.includes(words) && !link.includes(encodeURIComponent(words)), 'no passage travels in the link');
			assert.ok(!sheet.text.includes(words), 'and no passage is printed in the sheet');
		}

		await session.page.keyboard.press('Escape');
		const closed = await session.page.evaluate(() => ({
			open: document.querySelectorAll('[data-oaci-share-sheet]').length,
			focused: document.activeElement.id
		}));
		assert.equal(closed.open, 0, 'Escape closes the sheet');
		assert.equal(closed.focused, 'oaci-copy-share', 'and focus returns to the button that opened it');
		assert.deepEqual(session.errors, []);
	} finally {
		await session.close();
	}
});

test('a run with no reading opens no sheet at all', async () => {
	const session = await open();
	try {
		const withheld = await session.page.evaluate(async () => {
			const { buildShareSummary } = await import('/assets/js/checker-share.mjs');
			const result = structuredClone(window.__result);
			result.axes.ai_pattern.assessment_status = 'withheld';
			return { assessed: Boolean(buildShareSummary(window.__result)), unassessed: buildShareSummary(result) };
		});
		assert.equal(withheld.assessed, true, 'the control: an assessed run does produce a summary');
		assert.equal(withheld.unassessed, null, 'a withheld run produces none, so there is no sheet to open');
	} finally {
		await session.close();
	}
});
