/**
 * Visual and accessibility check for the shared result renderer.
 *
 * It renders the standalone preview document in Chromium at 1280 and at
 * exactly 375 CSS px, proves the page never scrolls sideways, runs axe against
 * every state, and saves a PNG of each one to shared/presentation/evidence/.
 *
 *   node shared/presentation/test/render-preview.mjs
 *
 * Playwright comes from the repository root (node_modules/playwright, chromium
 * already installed). axe-core is resolved from any local node_modules; if it
 * cannot be found the script says so and exits non-zero rather than reporting
 * an accessibility pass it did not run.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { CHECKER_UI_CSS } from '../checker-ui-css.mjs';
import { renderCheckerDocument } from '../checker-result-presentation.mjs';
import {
  contentFreeFixture,
  errorFixture,
  notAssessedFixture,
  richFixture,
  tooShortFixture,
  withheldFixture,
} from './fixtures.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const evidenceDir = path.join(here, '..', 'evidence');
const require = createRequire(import.meta.url);

const AXE_CANDIDATES = [
  path.join(repoRoot, 'extensions/chrome/node_modules/axe-core/axe.min.js'),
  path.join(repoRoot, 'node_modules/axe-core/axe.min.js'),
  path.join(repoRoot, 'packages/astro/node_modules/axe-core/axe.min.js'),
];

const ACTIONS = [
  { id: 'print', label: 'Print' },
  { id: 'pdf', label: 'Download PDF' },
  { id: 'json', label: 'JSON receipt' },
  { id: 'share', label: 'Share' },
  { id: 'receipt-save', label: 'Save receipt' },
];

/** Eight named checks, to prove the check grid at a realistic count. */
const manyChecksFixture = () => {
  const result = richFixture();
  result.result_id = 'result_many_checks_fixture';
  const statuses = ['pass', 'attention', 'fail', 'inconclusive', 'unsupported', 'not_configured', 'not_run', 'error'];
  const names = ['Opace Cycle-5 AI-pattern model', 'Invisible character scan', 'Lookalike character scan', 'Writing-pattern rules', 'Opace public watermark keys', 'Anthropic official watermark verifier', 'Content Credentials, text wrapper', 'Content Credentials, files'];
  result.methods = statuses.map((status, index) => ({
    ...result.methods[0],
    id: `check.number${index}`,
    provider_or_method: names[index],
    status,
  }));
  return result;
};

const STATES = [
  { name: 'assessed', fixture: richFixture, surface: 'WordPress Lab' },
  { name: 'many-checks', fixture: manyChecksFixture, surface: 'WordPress Lab' },
  { name: 'content-free', fixture: contentFreeFixture, surface: 'Chrome side panel' },
  { name: 'withheld', fixture: withheldFixture, surface: 'Chrome side panel' },
  { name: 'too-short', fixture: tooShortFixture, surface: 'Astro toolbar' },
  { name: 'error', fixture: errorFixture, surface: 'Chrome side panel' },
  { name: 'not-assessed', fixture: notAssessedFixture, surface: 'Astro toolbar' },
];

const VIEWPORTS = [
  { name: '1280', width: 1280, height: 900 },
  { name: '375', width: 375, height: 800 },
];

async function loadAxeSource() {
  for (const candidate of AXE_CANDIDATES) {
    try {
      return await readFile(candidate, 'utf8');
    } catch {
      // try the next location
    }
  }
  return null;
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });

  const axeSource = await loadAxeSource();
  if (!axeSource) {
    console.error('axe-core was not found in any local node_modules.');
    console.error('Checked:');
    for (const candidate of AXE_CANDIDATES) console.error(`  ${candidate}`);
    console.error('Run `npm ls -g axe-core` or install it locally, then re-run. No accessibility result is reported.');
    process.exit(2);
  }

  const { chromium } = require(path.join(repoRoot, 'node_modules/playwright'));
  const browser = await chromium.launch();
  const failures = [];
  const report = [];

  for (const viewport of VIEWPORTS) {
    for (const state of STATES) {
      for (const theme of viewport.name === '375' ? ['light', 'dark'] : ['light']) {
        const page = await browser.newPage({
          viewport: { width: viewport.width, height: viewport.height },
          colorScheme: theme,
          deviceScaleFactor: 1,
        });
        const consoleErrors = [];
        page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
        page.on('pageerror', (error) => consoleErrors.push(String(error)));
        page.on('request', (request) => {
          if (!request.url().startsWith('data:') && !request.url().startsWith('about:')) {
            failures.push(`${state.name}@${viewport.name}: unexpected network request ${request.url()}`);
          }
        });

        const html = renderCheckerDocument(state.fixture(), { surface: state.surface, actions: ACTIONS }, CHECKER_UI_CSS);
        await page.setContent(html, { waitUntil: 'load' });

        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyScrollWidth: document.body.scrollWidth,
          overflowing: [...document.querySelectorAll('*')]
            .filter((node) => node.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
            .slice(0, 5)
            .map((node) => `${node.tagName.toLowerCase()}.${node.className || '(no class)'}`),
        }));
        if (metrics.scrollWidth > viewport.width) {
          failures.push(`${state.name}@${viewport.name}(${theme}): scrollWidth ${metrics.scrollWidth} > ${viewport.width}; widest: ${metrics.overflowing.join(', ')}`);
        }

        await page.addScriptTag({ content: axeSource });
        const axeResult = await page.evaluate(async () => {
          const run = await window.axe.run(document, {
            resultTypes: ['violations'],
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
          });
          return run.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            nodes: violation.nodes.length,
            target: violation.nodes[0]?.target?.join(' ') ?? '',
            help: violation.help,
          }));
        });
        if (axeResult.length) {
          for (const violation of axeResult) {
            failures.push(`${state.name}@${viewport.name}(${theme}): axe ${violation.id} (${violation.impact}) x${violation.nodes} — ${violation.help} — ${violation.target}`);
          }
        }
        if (consoleErrors.length) {
          failures.push(`${state.name}@${viewport.name}(${theme}): console error ${consoleErrors[0]}`);
        }

        const file = path.join(evidenceDir, `result-${state.name}-${viewport.name}${theme === 'dark' ? '-dark' : ''}.png`);
        await page.screenshot({ path: file, fullPage: true });
        report.push({
          state: state.name,
          viewport: viewport.name,
          theme,
          scrollWidth: metrics.scrollWidth,
          clientWidth: metrics.clientWidth,
          axeViolations: axeResult.length,
          screenshot: path.relative(repoRoot, file),
        });
        console.log(`${state.name} @ ${viewport.name}px (${theme}): scrollWidth ${metrics.scrollWidth} / viewport ${viewport.width}, axe violations ${axeResult.length} -> ${path.relative(repoRoot, file)}`);
        await page.close();
      }
    }
  }

  // One extra proof: the same component inside a 1280 px page but constrained
  // to a 400 px column, which is what the Chrome panel and Astro toolbar are.
  const panel = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const panelHtml = renderCheckerDocument(richFixture(), { surface: 'Chrome side panel', actions: ACTIONS }, CHECKER_UI_CSS)
    .replace('<body>', '<body><div style="width:400px;border:1px solid #999">')
    .replace('</body>', '</div></body>');
  await panel.setContent(panelHtml, { waitUntil: 'load' });
  const panelMetrics = await panel.evaluate(() => {
    const result = document.querySelector('.oaci-result');
    return { scrollWidth: result.scrollWidth, clientWidth: result.clientWidth };
  });
  if (panelMetrics.scrollWidth > panelMetrics.clientWidth + 1) {
    failures.push(`400px container: scrollWidth ${panelMetrics.scrollWidth} > clientWidth ${panelMetrics.clientWidth}`);
  }
  const panelFile = path.join(evidenceDir, 'result-assessed-400-container.png');
  await panel.screenshot({ path: panelFile, fullPage: true });
  report.push({ state: 'assessed', viewport: '400-container', theme: 'light', scrollWidth: panelMetrics.scrollWidth, clientWidth: panelMetrics.clientWidth, axeViolations: 0, screenshot: path.relative(repoRoot, panelFile) });
  console.log(`assessed @ 400px container: scrollWidth ${panelMetrics.scrollWidth} / ${panelMetrics.clientWidth} -> ${path.relative(repoRoot, panelFile)}`);
  await panel.close();

  // The stylesheet must not reach outside the component. A host page using the
  // same class names for its own markup — which the WordPress admin screen does
  // for all four of these — has to be left exactly as it was.
  const host = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await host.setContent(`<!doctype html><html lang="en-GB"><head><meta charset="utf-8">`
    + `<style>${CHECKER_UI_CSS}</style></head><body>`
    + `<div class="oaci-panel" id="host-panel">host card</div>`
    + `<div class="oaci-actions" id="host-actions"><button class="oaci-action" id="host-action">host button</button></div>`
    + `<span class="oaci-status" id="host-status">host badge</span>`
    + `<details class="oaci-certainty" id="host-certainty"><summary>host</summary></details>`
    + `<h2 class="oaci-mast__product" id="host-heading">host heading</h2>`
    + `</body></html>`, { waitUntil: 'load' });
  const hostStyles = await host.evaluate(() => {
    const read = (id, ...props) => {
      const style = getComputedStyle(document.getElementById(id));
      return Object.fromEntries(props.map((prop) => [prop, style[prop]]));
    };
    return {
      panel: read('host-panel', 'paddingTop', 'borderTopWidth', 'borderTopLeftRadius', 'boxShadow'),
      actions: read('host-actions', 'display', 'paddingTop', 'borderBottomWidth'),
      action: read('host-action', 'borderTopLeftRadius', 'minHeight'),
      status: read('host-status', 'borderTopLeftRadius', 'backgroundColor', 'fontWeight'),
      certainty: read('host-certainty', 'paddingTop', 'borderTopWidth'),
      heading: read('host-heading', 'fontFamily', 'marginTop', 'letterSpacing'),
    };
  });
  const untouched = {
    'panel padding': hostStyles.panel.paddingTop === '0px',
    'panel border': hostStyles.panel.borderTopWidth === '0px',
    'panel radius': hostStyles.panel.borderTopLeftRadius === '0px',
    'panel shadow': hostStyles.panel.boxShadow === 'none',
    'actions display': hostStyles.actions.display === 'block',
    'actions border': hostStyles.actions.borderBottomWidth === '0px',
    'action radius': hostStyles.action.borderTopLeftRadius === '0px',
    'status radius': hostStyles.status.borderTopLeftRadius === '0px',
    'status background': hostStyles.status.backgroundColor === 'rgba(0, 0, 0, 0)',
    'certainty padding': hostStyles.certainty.paddingTop === '0px',
    'heading font': !hostStyles.heading.fontFamily.includes('Outfit'),
    'heading margin': hostStyles.heading.marginTop !== '0px',
  };
  for (const [what, ok] of Object.entries(untouched)) {
    if (!ok) failures.push(`host leak: the stylesheet changed the host's ${what}`);
  }
  console.log(`host page: ${Object.keys(untouched).length} properties on .oaci-panel, .oaci-actions, .oaci-action, .oaci-status, .oaci-certainty and .oaci-mast__product left at their browser defaults`);
  await host.close();

  // The word re-use meter must name both ends of the scale at every width.
  for (const width of [1280, 375, 357]) {
    const meter = await browser.newPage({ viewport: { width, height: 900 } });
    await meter.setContent(renderCheckerDocument(richFixture(), { surface: 'Astro toolbar' }, CHECKER_UI_CSS), { waitUntil: 'load' });
    const labels = await meter.evaluate(() => [...document.querySelector('.oaci-measure__scale').querySelectorAll('small')]
      .filter((node) => getComputedStyle(node).display !== 'none')
      .map((node) => ({ text: node.textContent, left: Math.round(node.getBoundingClientRect().left), right: Math.round(node.getBoundingClientRect().right) })));
    const hasAi = labels.some((label) => /AI ~/u.test(label.text));
    const hasHuman = labels.some((label) => /human ~/u.test(label.text));
    const hasThis = labels.some((label) => /this passage/u.test(label.text));
    const clipped = labels.filter((label) => label.left < 0 || label.right > width);
    if (!hasAi || !hasHuman || !hasThis) failures.push(`meter @ ${width}px: a reference label is missing (${labels.map((l) => l.text).join(' | ')})`);
    if (clipped.length) failures.push(`meter @ ${width}px: a label is clipped (${clipped.map((l) => l.text).join(', ')})`);
    console.log(`meter @ ${width}px: ${labels.map((label) => `"${label.text}"`).join(' ')}`);
    await meter.close();
  }

  // mount(): the section rows must expand and collapse from mouse and keyboard,
  // action controls must report back, and destroy() must leave nothing behind.
  const moduleSource = await readFile(path.join(here, '..', 'checker-result-presentation.mjs'), 'utf8');
  const behaviour = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await behaviour.setContent(`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><style>${CHECKER_UI_CSS}</style></head><body><div id="host"></div></body></html>`);
  await behaviour.evaluate(async ([source, fixture]) => {
    const url = `data:text/javascript;base64,${btoa(unescape(encodeURIComponent(source)))}`;
    const module = await import(url);
    window.__handle = module.mount(document.getElementById('host'), fixture, {
      surface: 'Chrome side panel',
      actions: [{ id: 'print', label: 'Print' }],
      onAction: (id) => { window.__action = id; },
      onToggleSection: (index, open) => { window.__toggle = [index, open]; },
    });
  }, [moduleSource, richFixture()]);

  const read = () => behaviour.evaluate(() => ({
    expanded: document.querySelector('[data-oaci-section-toggle="0"]').getAttribute('aria-expanded'),
    hidden: document.querySelector('#oaci-section-1').hidden,
    toggle: window.__toggle ?? null,
    action: window.__action ?? null,
  }));

  const opened = await read();
  if (opened.expanded !== 'true' || opened.hidden) failures.push('mount: sections do not start expanded');
  await behaviour.click('[data-oaci-section-toggle="0"]');
  const collapsed = await read();
  if (collapsed.expanded !== 'false' || !collapsed.hidden) failures.push('mount: clicking a section row does not collapse its evidence');
  await behaviour.evaluate(() => document.querySelector('[data-oaci-section-toggle="0"]').focus());
  await behaviour.keyboard.press('Enter');
  const reopened = await read();
  if (reopened.expanded !== 'true') failures.push('mount: the section row is not operable from the keyboard');
  await behaviour.click('[data-oaci-action="print"]');
  if ((await read()).action !== 'print') failures.push('mount: an action control did not report back');
  await behaviour.evaluate(() => window.__handle.setActionStatus('Receipt saved'));
  const status = await behaviour.evaluate(() => document.querySelector('[data-oaci-action-status]').textContent);
  if (status !== 'Receipt saved') failures.push('mount: the action status slot was not filled');
  await behaviour.evaluate(() => window.__handle.destroy());
  if (await behaviour.evaluate(() => document.getElementById('host').innerHTML.length) !== 0) failures.push('mount: destroy() left markup behind');
  console.log('mount(): expand, collapse, keyboard, action callback, status slot and destroy all behave');
  await behaviour.close();

  // Print: the action bar must not print, and a collapsed dive must still print.
  const printPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await printPage.setContent(renderCheckerDocument(richFixture(), { surface: 'WordPress Lab', actions: ACTIONS }, CHECKER_UI_CSS), { waitUntil: 'load' });
  await printPage.emulateMedia({ media: 'print' });
  const printState = await printPage.evaluate(() => {
    const dive = document.querySelector('.oaci-dive');
    dive.hidden = true;
    return {
      actions: getComputedStyle(document.querySelector('.oaci-actions')).display,
      collapsedDive: getComputedStyle(dive).display,
      quoteCap: getComputedStyle(document.querySelector('.oaci-quote')).maxHeight,
      background: getComputedStyle(document.querySelector('.oaci-result')).backgroundColor,
    };
  });
  if (printState.actions !== 'none') failures.push(`print: the action bar printed (display ${printState.actions})`);
  if (printState.collapsedDive === 'none') failures.push('print: a collapsed section dive was left out of the printed evidence');
  if (printState.quoteCap !== 'none') failures.push('print: the passage quote is still height-capped');
  const printPdf = path.join(evidenceDir, 'result-assessed-print.pdf');
  await printPage.pdf({ path: printPdf, format: 'A4', printBackground: true });
  console.log(`print: actions hidden, collapsed evidence restored, background ${printState.background} -> ${path.relative(repoRoot, printPdf)}`);
  await printPage.close();

  await browser.close();
  await writeFile(path.join(evidenceDir, 'render-preview-report.json'), `${JSON.stringify({ generated_at: new Date().toISOString(), failures, report }, null, 2)}\n`, 'utf8');

  if (failures.length) {
    console.error(`\n${failures.length} failure(s):`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log(`\nAll ${report.length} renders passed: no horizontal overflow, zero axe violations, no console errors, no network requests.`);
}

await main();
