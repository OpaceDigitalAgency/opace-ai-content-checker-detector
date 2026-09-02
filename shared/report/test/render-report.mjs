/**
 * Browser render, reflow and accessibility check for the shared printable report.
 *
 * It builds `buildCheckerReportHtml` for every fixture the unit tests render,
 * loads each one in Chromium at 1280, 900, 375 and exactly 360 CSS px in both
 * colour schemes, proves the document never scrolls sideways, runs axe against
 * each render, prints the canonical and singular fixtures through the A4 print
 * pipeline, and saves the evidence to shared/report/evidence/.
 *
 *   node shared/report/test/render-report.mjs
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

import { buildCheckerReportHtml } from '../checker-report-html.mjs';
import {
  checkerResultFixture,
  longFixture,
  notAssessedFixture,
  singularFixture,
  wideChecksFixture,
  zeroCountFixture,
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

const OPTIONS = Object.freeze({ surfaceName: 'Astro toolbar', generatedAt: '2026-09-02T10:00:00Z' });

/**
 * Every fixture the unit suites render, plus the appendix variant. `slug` is the
 * stem of the saved evidence; `keepHtml` writes the document itself as well.
 */
const FIXTURES = [
  { name: 'report', slug: 'html-report', fixture: checkerResultFixture, keepHtml: 'checker-report.html', print: 'html-report-print' },
  { name: 'singular', slug: 'html-singular', fixture: singularFixture, keepHtml: 'checker-report-singular.html', print: 'html-singular-print' },
  { name: 'not-assessed', slug: 'html-notassessed', fixture: notAssessedFixture },
  { name: 'zero-count', slug: 'html-zero', fixture: zeroCountFixture },
  { name: 'wide-checks', slug: 'html-wide-checks', fixture: wideChecksFixture },
  { name: 'long', slug: 'html-long', fixture: () => longFixture(9) },
  { name: 'long-appendix', slug: 'html-long-appendix', fixture: () => longFixture(9), extra: { fullText: 'The complete checked draft.\n\n'.repeat(40) } },
];

/**
 * 360 is the narrowest phone the acceptance note cares about and 375 is the one
 * it names exactly. Both must be free of horizontal scroll.
 */
const VIEWPORTS = [
  { name: '1280', width: 1280, height: 900 },
  { name: '900', width: 900, height: 900 },
  { name: '375', width: 375, height: 800 },
  { name: '360', width: 360, height: 800 },
];

/** Only these renders are saved as PNGs; the rest are measured and discarded. */
const SCREENSHOT_AT = new Set(['900', '375', '360']);

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
    console.error('Install it locally and re-run. No accessibility result is reported.');
    process.exit(2);
  }

  const { chromium } = require(path.join(repoRoot, 'node_modules/playwright'));
  const browser = await chromium.launch();
  const failures = [];
  const report = [];

  for (const entry of FIXTURES) {
    const html = buildCheckerReportHtml(entry.fixture(), { ...OPTIONS, ...(entry.extra ?? {}) });
    if (entry.keepHtml) await writeFile(path.join(evidenceDir, entry.keepHtml), html, 'utf8');

    for (const viewport of VIEWPORTS) {
      for (const theme of ['light', 'dark']) {
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
            failures.push(`${entry.name}@${viewport.name}: unexpected network request ${request.url()}`);
          }
        });

        await page.setContent(html, { waitUntil: 'load' });

        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyScrollWidth: document.body.scrollWidth,
          overflowing: [...document.querySelectorAll('*')]
            .filter((node) => node.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
            .slice(0, 5)
            .map((node) => `${node.tagName.toLowerCase()}.${node.className || '(no class)'} w=${Math.round(node.getBoundingClientRect().width)}`),
        }));
        if (metrics.scrollWidth > metrics.clientWidth) {
          failures.push(`${entry.name}@${viewport.name}(${theme}): scrollWidth ${metrics.scrollWidth} > clientWidth ${metrics.clientWidth}; widest: ${metrics.overflowing.join(', ')}`);
        }

        // Any box that scrolls sideways must be reachable from the keyboard and
        // must carry a name, or a keyboard-only reader cannot read what is in it.
        const scrollers = await page.evaluate(() => [...document.querySelectorAll('*')]
          .filter((node) => node.scrollWidth > node.clientWidth + 1 && ['auto', 'scroll'].includes(getComputedStyle(node).overflowX))
          .map((node) => ({
            selector: `${node.tagName.toLowerCase()}.${node.className || '(no class)'}`,
            tabindex: node.getAttribute('tabindex'),
            label: node.getAttribute('aria-label'),
            role: node.getAttribute('role'),
          })));
        for (const scroller of scrollers) {
          if (scroller.tabindex !== '0') failures.push(`${entry.name}@${viewport.name}(${theme}): ${scroller.selector} scrolls but is not focusable`);
          if (!scroller.label) failures.push(`${entry.name}@${viewport.name}(${theme}): ${scroller.selector} scrolls but has no accessible name`);
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
            summary: violation.nodes[0]?.any?.[0]?.message ?? violation.help,
          }));
        });
        for (const violation of axeResult) {
          failures.push(`${entry.name}@${viewport.name}(${theme}): axe ${violation.id} (${violation.impact}) x${violation.nodes} — ${violation.summary} — ${violation.target}`);
        }
        if (consoleErrors.length) failures.push(`${entry.name}@${viewport.name}(${theme}): console error ${consoleErrors[0]}`);

        let screenshot = null;
        if (SCREENSHOT_AT.has(viewport.name)) {
          const suffix = viewport.name === '900' ? 'screen' : viewport.name;
          screenshot = path.join(evidenceDir, `${entry.slug}-${suffix}${theme === 'dark' ? '-dark' : ''}.png`);
          await page.screenshot({ path: screenshot, fullPage: true });
        }

        report.push({
          fixture: entry.name,
          viewport: viewport.name,
          theme,
          scrollWidth: metrics.scrollWidth,
          clientWidth: metrics.clientWidth,
          scrollingBoxes: scrollers.length,
          axeViolations: axeResult.length,
          screenshot: screenshot ? path.relative(repoRoot, screenshot) : null,
        });
        console.log(`${entry.name} @ ${viewport.name}px (${theme}): scrollWidth ${metrics.scrollWidth} / clientWidth ${metrics.clientWidth}, scrolling boxes ${scrollers.length}, axe ${axeResult.length}${screenshot ? ` -> ${path.relative(repoRoot, screenshot)}` : ''}`);
        await page.close();
      }
    }

    if (entry.print) {
      const printPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await printPage.setContent(html, { waitUntil: 'load' });
      await printPage.emulateMedia({ media: 'print' });
      const printState = await printPage.evaluate(() => {
        const scroll = document.querySelector('.oaci-scroll');
        return {
          scrollOverflow: scroll ? getComputedStyle(scroll).overflowX : 'no wrapper',
          tableWidth: Math.round(document.querySelector('.oaci-table')?.getBoundingClientRect().width ?? 0),
        };
      });
      if (printState.scrollOverflow !== 'visible') {
        failures.push(`${entry.name}: the scroll wrapper still clips when printed (overflow-x ${printState.scrollOverflow})`);
      }
      const pdf = path.join(evidenceDir, `${entry.print}.pdf`);
      await printPage.pdf({ path: pdf, format: 'A4', printBackground: true });
      console.log(`${entry.name} print: wrapper overflow-x ${printState.scrollOverflow}, table ${printState.tableWidth}px -> ${path.relative(repoRoot, pdf)}`);
      await printPage.close();
    }
  }

  // Prove the probe. Unwrap the checks table in the widest fixture and the page must scroll
  // sideways again — a reflow check that cannot detect the failure is not a check.
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
    await page.setContent(buildCheckerReportHtml(wideChecksFixture(), OPTIONS), { waitUntil: 'load' });
    const wrapped = await page.evaluate(() => document.documentElement.scrollWidth);
    const unwrapped = await page.evaluate(() => {
      const wrapper = document.querySelector('.oaci-scroll');
      wrapper.replaceWith(...wrapper.childNodes);
      return document.documentElement.scrollWidth;
    });
    if (wrapped !== 375) failures.push(`control: the wrapped document scrolled to ${wrapped} at 375 px`);
    if (unwrapped <= 375) failures.push(`control: removing the wrapper did not reintroduce the overflow (${unwrapped}), so this harness cannot detect it`);
    console.log(`\ncontrol @ 375px: wrapped ${wrapped}, wrapper removed ${unwrapped} — the harness detects the fault it was written for`);
    await page.close();
  }

  await browser.close();
  await writeFile(
    path.join(evidenceDir, 'render-report.json'),
    `${JSON.stringify({ generated_at: new Date().toISOString(), failures, report }, null, 2)}\n`,
    'utf8',
  );

  if (failures.length) {
    console.error(`\n${failures.length} failure(s):`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log(`\nAll ${report.length} renders passed: no horizontal overflow at any width, zero axe violations in either colour scheme, no console errors, no network requests.`);
}

await main();
