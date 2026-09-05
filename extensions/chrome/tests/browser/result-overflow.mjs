/** Layout replay of an actual exported DOM snapshot; no inference is fabricated.
 * OACI_RESULT_SNAPSHOT must point to a private snapshot from a real eight-section
 * browser result. Source CSS is tested without rewriting the packaged extension.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const snapshot = process.env.OACI_RESULT_SNAPSHOT;
if (!snapshot) throw new Error('Set OACI_RESULT_SNAPSHOT to the private real-result DOM snapshot.');
const out = process.env.OACI_OVERFLOW_OUTPUT ?? path.join(root, 'evidence/result-overflow');
const dist = path.join(root, 'dist');
const hash = createHash('sha256').update(dist).digest('hex').slice(0, 32);
const id = [...hash].map(char => String.fromCharCode(97 + parseInt(char, 16))).join('');
const html = (await readFile(snapshot, 'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const css = await readFile(path.join(root, 'src/panel.css'), 'utf8');
const axeSource = await readFile(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
await mkdir(out, { recursive: true });
const context = await chromium.launchPersistentContext(await mkdtemp(path.join(os.tmpdir(), 'oaci-overflow-regression-')), {
  headless: false, executablePath: process.env.OACI_CHROME ?? chromium.executablePath(),
  ignoreDefaultArgs: ['--disable-extensions'],
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, '--no-first-run'],
  viewport: { width: 600, height: 1000 },
});
const page = await context.newPage();
const screenshotSession = await context.newCDPSession(page);
const results = [];
try {
  await page.goto(`chrome-extension://${id}/sidepanel.html`);
  await page.setContent(html);
  await page.evaluate(css => {
    document.querySelector('link[href="panel.css"]')?.remove();
    const style = document.createElement('style'); style.textContent = css; document.head.append(style);
  }, css);
  const count = await page.locator('[data-oaci-section-toggle]').count();
  assert.equal(count, 8, 'Use the actual eight-section homepage result for this regression.');
  for (const stress of [false, true]) {
    if (stress) await page.locator('.oaci-quote').evaluateAll(quotes => quotes.forEach(quote => {
      quote.textContent += '\nLayout-only URL stress: https://example.org/' + 'long-unbroken-path'.repeat(60);
    }));
    for (const width of [320, 375, 420, 600]) for (const zoom of [1, 2]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(zoom => chrome.tabs.setZoom(zoom), zoom);
      assert.equal(await page.evaluate(() => chrome.tabs.getZoom()), zoom);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      for (let index = 0; index < count; index++) {
        await page.evaluate(index => {
          document.querySelectorAll('.oaci-dive.in-row').forEach((dive, i) => { dive.hidden = i !== index; });
          document.querySelectorAll('[data-oaci-section-toggle]').forEach((button, i) => {
            button.setAttribute('aria-expanded', String(i === index)); button.closest('li').dataset.oaciOpen = String(i === index);
          });
          document.querySelectorAll('details').forEach(details => { details.open = true; });
          const button = document.querySelectorAll('[data-oaci-section-toggle]')[index];
          const strip = document.querySelector('.sectionbar'); strip.hidden = false;
          strip.querySelector('[data-part="where"]').textContent = `Section ${index + 1} of 8`;
          strip.querySelector('[data-part="band"]').textContent = button.querySelector('.oaci-strip__band').textContent;
          strip.querySelector('[data-part="score"]').textContent = button.querySelector('.oaci-strip__score').textContent;
          document.querySelector('#result-slot').style.setProperty('--pin-top', strip.getBoundingClientRect().height + 'px');
        }, index);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const measured = await page.evaluate(() => {
          const scrolling = document.scrollingElement;
          scrolling.scrollLeft = 100000;
          const scrollLeft = scrolling.scrollLeft;
          scrolling.scrollLeft = 0;
          return {
          client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
          scrollLeft,
          outside: [...document.querySelectorAll('body *')].filter(el => el.getClientRects().length && el.getBoundingClientRect().right > document.documentElement.clientWidth + .1 && !el.classList.contains('oaci-sr')).map(el => ({class:el.className,right:el.getBoundingClientRect().right})).slice(0,20),
          wide: [...document.querySelectorAll('body *')].filter(el => el.getClientRects().length && el.clientWidth && el.scrollWidth > el.clientWidth + 1 && !el.classList.contains('oaci-sr')).map(el => ({class:el.className,scroll:el.scrollWidth,client:el.clientWidth,overflow:getComputedStyle(el).overflowX})).slice(0,30),
          internal: [...document.querySelectorAll('#result-slot *')].filter(el => el.getClientRects().length && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && ['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(el).overflowX) && !el.classList.contains('oaci-sr')).map(el => el.className),
          };
        });
        results.push({ width, zoom, index, stress, ...measured });
        assert.ok(measured.scroll <= measured.client, `Page overflow ${JSON.stringify(results.at(-1))}`);
        assert.equal(measured.scrollLeft, 0, 'The document must not move horizontally.');
        assert.deepEqual(measured.internal, [], 'Evidence must wrap, not gain horizontal scrolling or clipping.');
        if (!stress && index === 3) {
          await page.evaluate(axeSource);
          const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.length })));
          assert.deepEqual(violations, []);
          await page.evaluate(async () => {
            document.querySelector('.oaci-dive.in-row:not([hidden])').scrollIntoView({ block: 'start' });
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          });
          const screenshot = await screenshotSession.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          await writeFile(path.join(out, `section-4-${width}-zoom-${zoom}.png`), Buffer.from(screenshot.data, 'base64'));
        }
      }
    }
  }
  console.log(JSON.stringify({ passed: results.length, sections: count, realZoom: true }));
} finally {
  await writeFile(path.join(out, 'regression.json'), JSON.stringify(results, null, 2));
  await context.close();
}
