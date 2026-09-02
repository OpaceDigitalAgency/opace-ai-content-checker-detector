/**
 * Mirror `checker-ui.css` into `checker-ui-css.mjs`.
 *
 * The `.css` file is the source of truth: it is what a surface links, inlines
 * or copies into its bundle. The `.mjs` mirror exists because a browser-only
 * surface (the Chrome side panel, the Astro toolbar's shadow root) cannot read
 * a file at runtime and needs the same bytes as a string.
 *
 *   node shared/presentation/build-css.mjs           regenerate the mirror
 *   node shared/presentation/build-css.mjs --check   fail if it has drifted
 *
 * `test/checker-ui-css.test.mjs` runs the check, so the two cannot diverge
 * without a red test.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const cssPath = fileURLToPath(new URL('./checker-ui.css', import.meta.url));
const mjsPath = fileURLToPath(new URL('./checker-ui-css.mjs', import.meta.url));

const HEADER = `/**
 * GENERATED FILE — do not edit.
 *
 * The exact bytes of shared/presentation/checker-ui.css, as a string, for
 * surfaces that inject CSS at runtime instead of linking a file.
 * Regenerate with: node shared/presentation/build-css.mjs
 */
`;

export function moduleSourceFor(css) {
  const literal = css.replace(/\\/gu, '\\\\').replace(/`/gu, '\\`').replace(/\$\{/gu, '\\${');
  return `${HEADER}export const CHECKER_UI_CSS = \`${literal}\`;\n\nexport default CHECKER_UI_CSS;\n`;
}

const css = await readFile(cssPath, 'utf8');
const expected = moduleSourceFor(css);

if (process.argv.includes('--check')) {
  const actual = await readFile(mjsPath, 'utf8').catch(() => '');
  if (actual !== expected) {
    console.error('checker-ui-css.mjs is out of date. Run: node shared/presentation/build-css.mjs');
    process.exit(1);
  }
  console.log('checker-ui-css.mjs matches checker-ui.css');
} else {
  await writeFile(mjsPath, expected, 'utf8');
  console.log(`checker-ui-css.mjs written, ${expected.length} bytes`);
}
