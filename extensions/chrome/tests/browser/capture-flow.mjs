/** Actual built panel with deterministic Chrome API mocks in an isolated
 * visible browser. Tests capture state/async delivery, not native activeTab
 * grants or model inference. Synthetic fixtures only; no owner browser state.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'dist');
const origin = process.env.OACI_CAPTURE_FIXTURE_ORIGIN ?? 'https://capture-flow.test';
const out = process.env.OACI_CAPTURE_FLOW_OUTPUT;
const fixtureText = id => `Public capture fixture from tab ${id}. This text exists only to verify that the selected page is loaded into the checker, without running any analysis.`;
const states = [], errors = [], externalRequests = [];
const panelHash = createHash('sha256').update(await readFile(path.join(dist, 'panel.js'))).digest('hex');
const axeSource = await readFile(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const browser = await chromium.launch({ headless: false });

async function open(config = {}, width = 375) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'light' });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      externalRequests.push(url.href);
      await route.abort();
      return;
    }
    const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
    if (relative.includes('..')) throw new Error('Invalid fixture path');
    try {
      const body = await readFile(path.join(dist, relative));
      const ext = path.extname(relative);
      const contentType = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' }[ext] ?? 'application/octet-stream';
      await route.fulfill({ body, contentType });
    } catch { await route.fulfill({ status: 404, body: '' }); }
  });
  await context.addInitScript(({ config, origin }) => {
    const listeners = new Set();
    const event = () => ({ addListener() {}, removeListener() {} });
    const state = window.__captureTest = { messages: [], tabGets: [], tabQueries: 0, injections: [], workerStarts: 0, requests: [], permissions: [], pendingReplies: [], initialRelease: null, config };
    const emit = state.emit = (message, tabId) => { for (const listener of [...listeners]) listener(message, tabId == null ? {} : { tab: { id: tabId } }, () => {}); };
    state.intent = intent => emit({ type: 'CAPTURE_INTENT', intent });
    state.payload = (tabId, text, kind = 'article') => ({ kind, text, host: `site${tabId}.example`, title: `Public fixture ${tabId}`, limitations: ['Visibility uses hidden and aria-hidden markers; computed CSS visibility is host-dependent.'] });
    state.reply = (tabId, text, kind = 'article') => {
      const pending = state.pendingReplies.find(reply => reply.id === tabId && reply.kind === kind && !reply.settled);
      if (pending) { pending.settled = true; pending.resolve([{ frameId: 0, result: state.payload(tabId, text, kind) }]); }
      else emit({ type: 'CAPTURE_READY', payload: state.payload(tabId, text, kind) }, tabId);
    };
    const actualWorker = window.Worker;
    window.Worker = class extends actualWorker { constructor(...args) { state.workerStarts++; super(...args); } };
    const tab = id => ({ id, url: state.config.noUrlIds?.includes(id) ? undefined : `https://site${id}.example/article`, title: `Public fixture ${id}` });
    const local = {};
    const storage = { async get(key) { return key == null ? { ...local } : { [key]: local[key] }; }, async set(data) { Object.assign(local, data); }, async remove() {}, async clear() {} };
    window.chrome = {
      runtime: {
        getURL: relative => `${origin}/${relative}`,
        onMessage: { addListener: listener => listeners.add(listener), removeListener: listener => listeners.delete(listener) },
        async sendMessage(message) {
          state.messages.push(message);
          if (message.type === 'GET_PENDING') {
            if (config.holdInitial) await new Promise(resolve => { state.initialRelease = resolve; });
            return { intent: config.intent, capture: null, interrupted: null };
          }
          return { ok: true };
        },
      },
      storage: { local: storage, session: storage },
      tabs: {
        async get(id) { state.tabGets.push(id); return tab(id); },
        async query() { state.tabQueries++; return [tab(state.config.activeId ?? 900)]; },
        onActivated: event(), onUpdated: event(), onRemoved: event(),
      },
      permissions: {
        async contains() { return false; },
        async request(value) { state.permissions.push(value); return false; },
        async addHostAccessRequest(value) { state.permissions.push(value); },
      },
      scripting: { async executeScript(details) {
        if (!details.files?.some(file => /extract-/.test(file))) return [];
        const id = details.target.tabId;
        const kind = details.files[0].includes('selection') ? 'selection' : 'article';
        state.injections.push({ tabId: id, kind });
        if (state.config.failIds?.includes(id)) throw new Error('Cannot access contents: host permission required');
        if (state.config.delayIds?.includes(id)) return new Promise(resolve => state.pendingReplies.push({ id, kind, resolve }));
        const text = state.config.emptyIds?.includes(id) ? '' : `Public capture fixture from tab ${id}. This text exists only to verify that the selected page is loaded into the checker, without running any analysis.`;
        return [{ frameId: 0, result: state.payload(id, text, kind) }];
      } },
    };
  }, { config, origin });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/sidepanel.html`);
  return { context, page };
}

async function expectSource(page, id, mode = 'article') {
  await page.waitForFunction(text => document.querySelector('#source')?.value === text, fixtureText(id));
  assert.equal(await page.locator(`[data-mode="${mode}"]`).getAttribute('aria-selected'), 'true');
}
async function proof(page, label) {
  const measured = await page.evaluate(() => ({
    source: document.querySelector('#source')?.value,
    injections: window.__captureTest.injections,
    tabGets: window.__captureTest.tabGets,
    tabQueries: window.__captureTest.tabQueries,
    workers: window.__captureTest.workerStarts,
    permissions: window.__captureTest.permissions,
    acknowledgements: window.__captureTest.messages.filter(message => message.type === 'CLEAR_CAPTURE_INTENT'),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    result: !!document.querySelector('[data-oaci-result], #phase'),
    disclosures: [...document.querySelectorAll('details.capture-details')].map(detail => ({ label: detail.querySelector('summary')?.textContent, open: detail.open })),
  }));
  assert.equal(measured.workers, 0, 'Loading text must not start checking');
  assert.equal(measured.result, false);
  assert.deepEqual(measured.permissions, [], 'Normal capture must not request permanent site access');
  assert.equal(measured.overflow, false);
  states.push({ label, ...measured });
  if (out && /cold-article|warm-selection/.test(label)) await page.screenshot({ path: path.join(out, `${label}.png`), fullPage: true });
  return measured;
}

try {
  if (out) await mkdir(out, { recursive: true });
  for (const width of [1280, 375]) {
    const { context, page } = await open({ intent: { id: `cold-${width}`, tabId: 11, mode: 'article' }, activeId: 900 }, width);
    await expectSource(page, 11);
    const cold = await proof(page, `cold-article-${width}`);
    assert.deepEqual(cold.tabGets, [11]);
    assert.equal(cold.tabQueries, 0, 'Use the original toolbar tab, not the currently active one');
    assert.equal(cold.injections.length, 1);
    assert.ok(cold.disclosures.length >= 2);
    assert.ok(cold.disclosures.every(detail => !detail.open));
    if (width === 375) {
      for (const summary of await page.locator('details.capture-details > summary').all()) {
        await summary.focus();
        await page.keyboard.press('Enter');
        assert.equal(await summary.evaluate(element => element.parentElement.open), true);
      }
      await page.evaluate(axeSource);
      const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(value => ({ id: value.id, nodes: value.nodes.length })));
      assert.deepEqual(violations, [], 'Expanded capture disclosures must remain accessible');
      for (const summary of await page.locator('details.capture-details > summary').all()) {
        await summary.focus();
        await page.keyboard.press('Enter');
        assert.equal(await summary.evaluate(element => element.parentElement.open), false);
      }
    }
    await page.evaluate(() => window.__captureTest.intent({ id: 'warm-22', tabId: 22, mode: 'selection' }));
    await expectSource(page, 22, 'selection');
    await page.evaluate(() => {
      window.__captureTest.intent({ id: 'warm-22', tabId: 22, mode: 'selection' });
      window.__captureTest.intent({ id: 'warm-22', tabId: 22, mode: 'selection' });
    });
    const warm = await proof(page, `warm-selection-${width}`);
    assert.deepEqual(warm.injections, [{ tabId: 11, kind: 'article' }, { tabId: 22, kind: 'selection' }]);
    assert.equal(warm.acknowledgements.length, 2);
    await context.close();
  }
  {
    const { context, page } = await open({ intent: { id: 'cold-selection', tabId: 33, mode: 'selection' } });
    await expectSource(page, 33, 'selection');
    await proof(page, 'cold-selection');
    await context.close();
  }
  {
    const { context, page } = await open({ intent: { id: 'older-cold', tabId: 1, mode: 'article' }, holdInitial: true });
    await page.waitForFunction(() => typeof window.__captureTest.initialRelease === 'function');
    await page.evaluate(() => {
      window.__captureTest.intent({ id: 'early-warm', tabId: 44, mode: 'article' });
      window.__captureTest.initialRelease();
    });
    await expectSource(page, 44);
    const state = await proof(page, 'warm-before-initialisation');
    assert.deepEqual(state.tabGets, [44]);
    await context.close();
  }
  {
    const { context, page } = await open({ intent: { id: 'filtered', tabId: 55, mode: 'article' }, delayIds: [55] });
    await page.waitForFunction(() => window.__captureTest.pendingReplies.length === 1);
    await page.evaluate(() => window.__captureTest.reply(999, 'WRONG TAB MUST NEVER APPEAR'));
    assert.equal(await page.locator('#source').count(), 0, 'Wrong-tab response must not create a captured source');
    await page.evaluate(text => window.__captureTest.reply(55, text), fixtureText(55));
    await expectSource(page, 55);
    await proof(page, 'wrong-tab-reply-ignored');
    await page.evaluate(() => {
      window.__captureTest.config.delayIds = [66];
      window.__captureTest.intent({ id: 'slow-old', tabId: 66, mode: 'article' });
    });
    await page.waitForFunction(() => window.__captureTest.injections.some(value => value.tabId === 66));
    await page.evaluate(() => window.__captureTest.intent({ id: 'fast-new', tabId: 77, mode: 'article' }));
    await expectSource(page, 77);
    await page.evaluate(text => window.__captureTest.reply(66, text), fixtureText(66));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expectSource(page, 77);
    await proof(page, 'late-old-capture-ignored');
    await context.close();
  }
  for (const failure of ['missing-url', 'empty-selection', 'permission-refusal']) {
    const config = { activeId: 88, ...(failure === 'missing-url' ? { noUrlIds: [88] } : failure === 'empty-selection' ? { emptyIds: [88] } : { failIds: [88] }) };
    const { context, page } = await open(config);
    await page.waitForSelector('#source');
    await page.fill('#source', 'Pasted draft must never be presented as text from the page.');
    const mode = failure === 'empty-selection' ? 'selection' : 'article';
    await page.locator(`[data-mode="${mode}"]`).click();
    await page.waitForFunction(() => document.querySelector('#source')?.value === '' && document.querySelector('.notice'));
    const state = await proof(page, `failed-${failure}`);
    assert.equal(state.source, '');
    assert.equal(await page.locator(`[data-mode="${mode}"]`).getAttribute('aria-selected'), 'true');
    await page.locator('[data-mode="paste"]').click();
    assert.equal(await page.locator('#source').inputValue(), 'Pasted draft must never be presented as text from the page.');
    await context.close();
  }
  {
    const { context, page } = await open({ intent: { id: 'same-tab-article', tabId: 99, mode: 'article' }, delayIds: [99] });
    await page.waitForFunction(() => window.__captureTest.pendingReplies.length === 1);
    await page.evaluate(() => window.__captureTest.intent({ id: 'same-tab-selection', tabId: 99, mode: 'selection' }));
    await page.waitForFunction(() => window.__captureTest.messages.some(message => message.type === 'CLEAR_CAPTURE_INTENT' && message.id === 'same-tab-selection'));
    await page.evaluate(() => window.__captureTest.reply(99, 'OLD ARTICLE MUST NOT REPLACE THE NEW SELECTION', 'article'));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const interim = await page.evaluate(() => document.querySelector('#source')?.value ?? '');
    states.push({ label: 'same-tab-mode-race-interim', source: interim });
    assert.notEqual(interim, 'OLD ARTICLE MUST NOT REPLACE THE NEW SELECTION', 'An older article reply on the same tab must not become the newer selection capture');
    await page.waitForFunction(() => window.__captureTest.injections.some(value => value.tabId === 99 && value.kind === 'selection'));
    await page.evaluate(text => window.__captureTest.reply(99, text, 'selection'), fixtureText(99));
    await expectSource(page, 99, 'selection');
    await proof(page, 'same-tab-mode-race');
    await context.close();
  }
  {
    const { context, page } = await open({ intent: { id: 'timed-out', tabId: 100, mode: 'article' }, delayIds: [100] });
    await page.getByText('Nothing came back', { exact: true }).waitFor({ timeout: 8_000 });
    await page.evaluate(() => window.__captureTest.intent({ id: 'after-timeout', tabId: 100, mode: 'selection' }));
    await page.waitForFunction(() => window.__captureTest.injections.some(value => value.kind === 'selection'));
    await page.evaluate(() => window.__captureTest.reply(100, 'EXPIRED ARTICLE MUST NOT REPLACE SELECTION', 'article'));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.notEqual(await page.evaluate(() => document.querySelector('#source')?.value ?? ''), 'EXPIRED ARTICLE MUST NOT REPLACE SELECTION');
    await page.evaluate(text => window.__captureTest.reply(100, text, 'selection'), fixtureText(100));
    await expectSource(page, 100, 'selection');
    await proof(page, 'late-timeout-reply-ignored');
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, [], 'Loading a page must not fetch model/service/remote assets');
  console.log(JSON.stringify({ passed: states.length, panel_sha256: panelHash, errors, externalRequests, boundary: 'Actual built panel in isolated visible browser; Chrome APIs mocked, no native permission claim.' }, null, 2));
} finally {
  if (out) await writeFile(path.join(out, 'capture-flow-results.json'), JSON.stringify({ panel_sha256: panelHash, states, errors, externalRequests }, null, 2));
  await browser.close();
}
