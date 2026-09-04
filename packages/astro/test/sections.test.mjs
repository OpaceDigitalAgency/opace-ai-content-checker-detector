/**
 * Sections that open in place, and the tint they put on the previewed page.
 *
 * Two behaviours are under test here and both are about honesty as much as
 * mechanics: the panel must never claim a section is showing on the page when
 * nothing is tinted, and the tint must leave the page's own text byte for byte
 * as it found it.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { installSectionAccordion, neighbour, stripLabel, tintStatus } from '../dist/sections.js';
import { createPageHighlighter, PAGE_MARK_CLASS, resolvePath, slicesForRange } from '../dist/highlight.js';
import { build, createDocument } from './fake-dom.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const toolbar = read('../src/toolbar.ts');
const theme = read('../src/toolbar-theme.ts');

/* ------------------------------------------------- the projection mapping - */

/**
 * "The model read this, then a bold run, then the rest." One paragraph, three
 * text nodes, exactly the shape a passage that crosses inline elements takes.
 */
function inlineProjection() {
  const doc = createDocument();
  doc.body.appendChild(build(doc, ['p', {}, 'The model read ', ['strong', {}, 'this passage'], ' and then stopped.']));
  // What `projectDomVisibleText` emits for that paragraph: the block separator
  // it opens with carries no text node of its own, and each text node carries
  // the window it occupies in the projected string.
  const runs = [
    { text: '\n', node_path: [0], start_utf16: 0, end_utf16: 0, visible_start_utf16: 0, visible_end_utf16: 1 },
    { text: 'The model read ', node_path: [0, 0], start_utf16: 0, end_utf16: 15, visible_start_utf16: 1, visible_end_utf16: 16 },
    { text: 'this passage', node_path: [0, 1, 0], start_utf16: 0, end_utf16: 12, visible_start_utf16: 16, visible_end_utf16: 28 },
    { text: ' and then stopped.', node_path: [0, 2], start_utf16: 0, end_utf16: 18, visible_start_utf16: 28, visible_end_utf16: 46 },
  ];
  return { doc, runs, text: 'The model read this passage and then stopped.' };
}

test('a section that runs across inline elements maps to one slice per text node', () => {
  const { runs } = inlineProjection();
  // "model read this passage and" — starts inside the first node, covers the
  // whole of the bold one, ends inside the third.
  const slices = slicesForRange(runs, 5, 32);
  assert.equal(slices.length, 3, 'three text nodes are covered, so three slices');
  assert.deepEqual(slices.map((slice) => slice.text), ['model read ', 'this passage', ' and']);
  assert.deepEqual(slices.map((slice) => slice.path), [[0, 0], [0, 1, 0], [0, 2]]);
  assert.deepEqual(slices.map((slice) => slice.offset), [4, 0, 0]);
  // The synthetic block separator belongs to no text node and is never a slice.
  assert.ok(slices.every((slice) => slice.text !== '\n'));
});

test('the mapping is a half-open window, and an empty or reversed span maps to nothing', () => {
  const { runs } = inlineProjection();
  assert.deepEqual(slicesForRange(runs, 16, 28).map((slice) => slice.text), ['this passage']);
  // Ending exactly on a node boundary does not reach into the next node.
  assert.deepEqual(slicesForRange(runs, 1, 16).map((slice) => slice.text), ['The model read ']);
  assert.deepEqual(slicesForRange(runs, 10, 10), []);
  assert.deepEqual(slicesForRange(runs, 30, 12), [], 'a span that does not run forwards is refused, not guessed at');
  assert.deepEqual(slicesForRange(runs, 400, 500), []);
});

test('a path that no longer resolves gives back nothing rather than the wrong node', () => {
  const { doc, runs } = inlineProjection();
  assert.equal(resolvePath(doc.body, runs[2].node_path).nodeValue, 'this passage');
  assert.equal(resolvePath(doc.body, [0, 9, 0]), null);
  assert.equal(resolvePath(doc.body, [4]), null);
});

/* ------------------------------------------------------------- the tint --- */

test('choosing a section tints it on the page, across inline elements, without changing the text', () => {
  const { doc, runs, text } = inlineProjection();
  const before = doc.body.textContent;
  const highlighter = createPageHighlighter({ root: doc.body, runs, document: doc });

  const marks = highlighter.show(5, 32, 'signal-likely-ai');
  assert.equal(marks, 3, 'one mark per text node the passage crosses');
  assert.equal(highlighter.count, 3);
  const drawn = doc.body.querySelectorAll(`.${PAGE_MARK_CLASS}`);
  assert.equal(drawn.length, 3);
  assert.equal(drawn.map((mark) => mark.textContent).join(''), 'model read this passage and');
  // The band colour is the level's, not a fixed one.
  assert.equal(drawn[0].getAttribute('data-oaci-page-mark'), 'likely');
  assert.match(drawn[0].getAttribute('style'), /--oaci-mark-ink:#a84a08/u);
  // The page's own text is untouched: only the tree around it changed.
  assert.equal(doc.body.textContent, before);
  assert.equal(doc.body.textContent, text);
  // The tint brings its own stylesheet, once.
  assert.equal(doc.head.querySelectorAll('style').length, 1);
  highlighter.show(16, 28, 'signal-likely-human');
  assert.equal(doc.head.querySelectorAll('style').length, 1, 'the stylesheet is added once, not per section');
});

test('a document with no window scrolls nothing and still tints', () => {
  // The fake DOM has no view, which is the same shape as a document that cannot
  // be scrolled. Tinting must not depend on being able to move the page.
  const { doc, runs } = inlineProjection();
  const highlighter = createPageHighlighter({ root: doc.body, runs, document: doc, avoid: () => ({ top: 0, bottom: 700, width: 1000 }) });
  assert.equal(highlighter.show(16, 28, 'signal-unclear'), 1);
});

test('opening a second section takes the first section tint away', () => {
  const { doc, runs } = inlineProjection();
  const highlighter = createPageHighlighter({ root: doc.body, runs, document: doc });
  highlighter.show(1, 16, 'signal-unclear');
  assert.equal(doc.body.querySelectorAll(`.${PAGE_MARK_CLASS}`).length, 1);
  highlighter.show(16, 28, 'signal-strongly-ai');
  const drawn = doc.body.querySelectorAll(`.${PAGE_MARK_CLASS}`);
  assert.equal(drawn.length, 1, 'one section is tinted at a time');
  assert.equal(drawn[0].textContent, 'this passage');
});

test('clearing puts the page back exactly as it was found', () => {
  const { doc, runs, text } = inlineProjection();
  const paragraph = doc.body.childNodes[0];
  const shapeBefore = paragraph.childNodes.map((node) => node.nodeType);
  const highlighter = createPageHighlighter({ root: doc.body, runs, document: doc });

  highlighter.show(5, 32, 'signal-potentially-ai');
  highlighter.clear();

  assert.equal(highlighter.count, 0);
  assert.equal(doc.body.querySelectorAll(`.${PAGE_MARK_CLASS}`).length, 0);
  assert.equal(doc.body.textContent, text);
  // Split text nodes are merged back, so the next projection sees the page the
  // first one did rather than a tree the tint left behind.
  assert.deepEqual(paragraph.childNodes.map((node) => node.nodeType), shapeBefore);
  assert.equal(paragraph.childNodes[0].nodeValue, 'The model read ');
  highlighter.clear();
  assert.equal(highlighter.count, 0, 'clearing twice is not an error');
});

test('a passage the page no longer carries tints nothing rather than tinting the wrong words', () => {
  const { doc, runs } = inlineProjection();
  const highlighter = createPageHighlighter({ root: doc.body, runs, document: doc });
  // The page changed after the reading was taken.
  resolvePath(doc.body, [0, 1, 0]).nodeValue = 'something else entirely';
  const marks = highlighter.show(16, 28, 'signal-likely-ai');
  assert.equal(marks, 0, 'the verification rejects a stale mapping outright');
  assert.equal(doc.body.querySelectorAll(`.${PAGE_MARK_CLASS}`).length, 0);
});

test('nothing inside a form control or an editable region is ever rewrapped', () => {
  const doc = createDocument();
  doc.body.appendChild(build(doc, ['textarea', {}, 'a draft being typed']));
  doc.body.appendChild(build(doc, ['div', { contenteditable: 'true' }, 'an editable note']));
  const runs = [
    { text: 'a draft being typed', node_path: [0, 0], start_utf16: 0, end_utf16: 19, visible_start_utf16: 0, visible_end_utf16: 19 },
    { text: 'an editable note', node_path: [1, 0], start_utf16: 0, end_utf16: 16, visible_start_utf16: 19, visible_end_utf16: 35 },
  ];
  const highlighter = createPageHighlighter({ root: doc.body, runs, document: doc });
  assert.equal(highlighter.show(0, 35, 'signal-likely-ai'), 0);
  assert.equal(doc.body.querySelectorAll(`.${PAGE_MARK_CLASS}`).length, 0);
  assert.equal(doc.body.textContent, 'a draft being typedan editable note');
});

test('the toolbar subtree is guarded, so the panel never tints itself', () => {
  const doc = createDocument();
  const host = build(doc, ['astro-dev-toolbar', {}, ['p', {}, 'panel copy']]);
  doc.body.appendChild(host);
  const runs = [{ text: 'panel copy', node_path: [0, 0, 0], start_utf16: 0, end_utf16: 10, visible_start_utf16: 0, visible_end_utf16: 10 }];
  const guarded = createPageHighlighter({ root: doc.body, runs, document: doc, guard: host });
  assert.equal(guarded.show(0, 10, 'signal-unclear'), 0);
  // The tag name alone is enough even where no guard node was handed over.
  const unguarded = createPageHighlighter({ root: doc.body, runs, document: doc });
  assert.equal(unguarded.show(0, 10, 'signal-unclear'), 0);
});

/* -------------------------------------------------------- the accordion --- */

/** The shape the shared renderer produces: a row list, then the dives below it. */
function mountedReading(total = 3) {
  const doc = createDocument();
  const levels = ['Likely human', 'Unclear', 'Strongly AI'];
  const scores = ['0.18', '0.51', '0.92'];
  const rows = [];
  for (let index = 0; index < total; index += 1) {
    rows.push(['li', {},
      ['button', { type: 'button', class: 'oaci-strip__bar', 'data-oaci-section-toggle': String(index), 'aria-expanded': 'true', 'aria-controls': `dive-${index}` },
        ['span', { class: 'oaci-strip__name' }, `Section ${index + 1}`],
        ['b', { class: 'oaci-strip__score' }, scores[index]],
        ['span', { class: 'oaci-strip__band' }, levels[index]],
        ['span', { class: 'oaci-strip__go' }, '›']],
    ]);
  }
  const dives = [];
  for (let index = 0; index < total; index += 1) {
    dives.push(['section', { class: 'oaci-dive', id: `dive-${index}`, 'data-oaci-section': String(index) }, `Inside section ${index + 1}`]);
  }
  const root = build(doc, ['div', {},
    ['section', { class: 'oaci-strip' },
      ['div', { class: 'oaci-strip__head' }, ['h4', {}, 'Section scores']],
      ['ol', { class: 'oaci-strip__list' }, ...rows]],
    ['section', { class: 'oaci-dives' },
      ['p', { class: 'oaci-dives__intro' }, 'Each section below shows the passage the model read.'],
      ...dives],
  ]);
  doc.body.appendChild(root);
  return { doc, root, levels, scores };
}

/** Drive a row the way the shared renderer's own handler does, then hand over. */
function press(accordion, root, index) {
  const bar = root.querySelectorAll('.oaci-strip__bar')[index];
  const open = bar.getAttribute('aria-expanded') !== 'true';
  bar.setAttribute('aria-expanded', String(open));
  const panel = root.querySelectorAll('.oaci-dive')[index];
  panel.hidden = !open;
  accordion.toggled(index, open);
  return bar;
}

test('each deep dive moves inside its own score row, and every row starts closed', () => {
  const { root } = mountedReading();
  const accordion = installSectionAccordion(root);

  assert.equal(accordion.total, 3);
  assert.equal(accordion.open, null);
  assert.equal(root.querySelector('.oaci-dives'), null, 'the emptied wrapper is removed, not left labelling nothing');
  assert.match(root.querySelector('.oaci-strip__head').textContent, /Each section below shows/u, 'its introduction moves with the dives');

  const rows = root.querySelectorAll('.oaci-strip__list')[0].childNodes;
  for (const [index, row] of rows.entries()) {
    const dive = row.querySelector('.oaci-dive');
    assert.ok(dive, `section ${index + 1} keeps its evidence inside its own row`);
    assert.equal(dive.getAttribute('id'), `dive-${index}`, 'the id the row points at is unchanged');
    assert.ok(dive.classList.has('oacit-dive-inline'));
    assert.equal(dive.hidden, true);
    assert.equal(row.querySelector('.oaci-strip__bar').getAttribute('aria-expanded'), 'false');
  }
});

test('one section is open at a time, and the sticky strip reads section, level and score', () => {
  const { root, levels, scores } = mountedReading();
  const opened = [];
  const accordion = installSectionAccordion(root, { onOpen: (index) => { opened.push(index); return 2; } });
  const nav = root.querySelector('.oacit-secnav');
  const now = root.querySelector('.oacit-secnav__now');
  const steps = root.querySelectorAll('.oacit-secnav__step');
  assert.equal(nav.hidden, true, 'the strip stays out of the way until a section is open');

  press(accordion, root, 1);
  assert.equal(accordion.open, 1);
  assert.equal(nav.hidden, false);
  assert.equal(now.textContent, `Section 2 of 3 · ${levels[1]} · ${scores[1]}`);
  assert.equal(root.querySelectorAll('.oaci-dive').filter((dive) => !dive.hidden).length, 1);
  assert.equal(root.querySelectorAll('.oaci-strip__list')[0].childNodes[1].getAttribute('data-oacit-open'), '');

  // Opening another closes the first: never two dives at once.
  press(accordion, root, 2);
  assert.equal(accordion.open, 2);
  assert.equal(root.querySelectorAll('.oaci-dive').filter((dive) => !dive.hidden).length, 1);
  assert.equal(root.querySelectorAll('.oaci-strip__bar').filter((bar) => bar.getAttribute('aria-expanded') === 'true').length, 1);
  assert.equal(now.textContent, `Section 3 of 3 · ${levels[2]} · ${scores[2]}`);

  // Previous and next walk in document order and stop at the ends.
  assert.equal(steps[1].disabled, true, 'there is no fourth section to go to');
  steps[0].click();
  assert.equal(accordion.open, 1);
  steps[0].click();
  assert.equal(accordion.open, 0);
  assert.equal(steps[0].disabled, true, 'and no section before the first');
  assert.deepEqual(opened, [1, 2, 1, 0], 'every opening asks for its own tint');
});

test('the strip never claims a section is shown on the page without a tint to point at', () => {
  const drawn = mountedReading();
  const found = installSectionAccordion(drawn.root, { onOpen: () => 2 });
  press(found, drawn.root, 0);
  assert.match(drawn.root.querySelector('.oacit-secnav__tint').textContent, /2 passages tinted/u);

  const missing = mountedReading();
  const nothing = installSectionAccordion(missing.root, { onOpen: () => 0 });
  press(nothing, missing.root, 0);
  const line = missing.root.querySelector('.oacit-secnav__tint').textContent;
  assert.match(line, /could not be found on the page as it is now/u);
  assert.doesNotMatch(line, /tinted in the band colour/u);

  // The exact wording, so neither branch can drift into a claim.
  assert.equal(tintStatus(1), 'Shown on the page: 1 passage tinted in the band colour.');
  assert.match(tintStatus(0), /nothing was tinted/u);
  assert.equal(stripLabel(2, 5, 'Unclear', '0.44'), 'Section 2 of 5 · Unclear · 0.44');
  assert.equal(neighbour(0, 3, -1), null);
  assert.equal(neighbour(2, 3, 1), null);
  assert.equal(neighbour(1, 3, 1), 2);
});

test('closing, and destroying, take the tint back off the page', () => {
  const { root } = mountedReading();
  let cleared = 0;
  const accordion = installSectionAccordion(root, { onOpen: () => 1, onClose: () => { cleared += 1; } });
  const nav = root.querySelector('.oacit-secnav');

  press(accordion, root, 0);
  root.querySelector('.oacit-secnav__close').click();
  assert.equal(accordion.open, null);
  assert.equal(cleared, 1);
  assert.equal(nav.hidden, true);
  assert.equal(root.querySelector('.oacit-secnav__tint').textContent, '');
  assert.equal(root.querySelectorAll('.oaci-dive').filter((dive) => !dive.hidden).length, 0);

  // Pressing the open row again is the other way to close it.
  press(accordion, root, 1);
  press(accordion, root, 1);
  assert.equal(accordion.open, null);
  assert.equal(cleared, 2);

  accordion.destroy();
  assert.equal(cleared, 3, 'a destroyed accordion clears the page it tinted');
  root.querySelector('.oacit-secnav__close').click();
  assert.equal(cleared, 3, 'and its own listeners are gone');
});

test('a reading with no sections gets no accordion and no strip', () => {
  const doc = createDocument();
  const root = build(doc, ['div', {}, ['p', {}, 'The AI-pattern reading was held back.']]);
  doc.body.appendChild(root);
  const accordion = installSectionAccordion(root);
  assert.equal(accordion.total, 0);
  assert.equal(root.querySelector('.oacit-secnav'), null);
});

/* ------------------------------------------------ wired into the toolbar - */

test('the toolbar keeps the projection runs, installs the accordion and clears the tint', () => {
  // The run table is what makes the tint possible, and it is held in memory for
  // one reading rather than written anywhere.
  assert.match(toolbar, /runs: projection\.runs as SourceRun\[\]/u);
  assert.match(toolbar, /accordion = installSectionAccordion\(host, \{/u);
  assert.match(toolbar, /onToggleSection: \(index, expanded\) => accordion\?\.toggled\(index, expanded\)/u);
  assert.match(toolbar, /highlighter = createPageHighlighter\(\{/u);
  assert.match(toolbar, /guard: canvas instanceof ShadowRoot \? canvas\.host : null/u);
  // Every route out of a reading clears the page.
  const forget = toolbar.match(/forgetSections\(\);/gu) ?? [];
  assert.ok(forget.length >= 4, `the tint must be cleared on a new run, a redraw, a view change and a panel close (found ${forget.length})`);
  assert.match(toolbar, /const forgetSections = \(\): void => \{[\s\S]*?highlighter\?\.clear\(\);/u);
});

test('the open row is pinned under the sticky strip, in both themes and at both widths', () => {
  assert.match(theme, /\.oacit-secnav\{position:sticky;top:var\(--oacit-head-h,0px\)/u);
  assert.match(theme, /li\[data-oacit-open\]>\.oaci-strip__bar\{position:sticky;top:calc\(var\(--oacit-head-h,0px\) \+ var\(--oacit-secnav-h,0px\)\)/u);
  // The strip is built from the shared tokens, so it flips with the panel.
  assert.match(theme, /\.oacit-secnav\{[^}]*background:var\(--white\)/u);
  // It reflows rather than colliding on a narrow panel, and it survives forced colours.
  assert.match(theme, /@media\(max-width:430px\)\{[\s\S]*?\.oacit-secnav\{grid-template-columns:auto 1fr auto/u);
  assert.match(theme, /@media\(forced-colors:active\)\{[\s\S]*?\.oacit-secnav,/u);
});

test('share opens the shared sheet with the content-free link, on the reading and on Receipts', () => {
  assert.match(toolbar, /openShareSheet\(\{/u);
  assert.match(toolbar, /result: checkerResult,/u);
  // The dialog is mounted where the shared stylesheet lives.
  assert.match(toolbar, /root: canvas,/u);
  assert.match(toolbar, /shareView\?\.addEventListener\('click', \(\) => openShare\(shareView\)\)/u);
  assert.match(toolbar, /if \(action === 'share'\) openShare\(/u);
  assert.match(toolbar, /Share this result/u);
  assert.doesNotMatch(toolbar, /Copy a share summary/u, 'the copy-only button is replaced by the sheet');
  // The scrim has to escape the Dev Toolbar host to cover the window.
  assert.match(theme, /\.oaci-share__scrim\[data-oaci-share-scrim\]\{position:fixed;inset:0/u);
});
