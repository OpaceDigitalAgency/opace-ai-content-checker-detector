/** Re-encode the approved, unchanged mark for self-contained HTML and PDF reports. */
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire(new URL('../extensions/chrome/package.json', import.meta.url));
const sharp = require('sharp');
const source = new URL('../docs/assets/opace-ai-checker-chrome-mark-v4.png', import.meta.url);
const bytes = await readFile(source);
const png = await sharp(bytes).resize(96, 96).png().toBuffer();
const jpeg = await sharp(bytes).resize(128, 128).flatten({ background: '#0f1115' }).jpeg({ quality: 90 }).toBuffer();
const replaceExport = (text, name, value) => {
  const pattern = new RegExp(`export const ${name} =\\s*'[^']*';`);
  if (!pattern.test(text)) throw new Error(`Missing ${name}`);
  return text.replace(pattern, `export const ${name} =\n  '${value}';`);
};
const logoFile = new URL('../shared/report/logo.mjs', import.meta.url);
let logo = await readFile(logoFile, 'utf8');
logo = replaceExport(logo, 'LOGO_PNG_96_BASE64', png.toString('base64'));
logo = replaceExport(logo, 'LOGO_JPEG_128_BASE64', jpeg.toString('base64'));
await writeFile(logoFile, logo);
const presentationFile = new URL('../shared/presentation/checker-result-presentation.mjs', import.meta.url);
let presentation = await readFile(presentationFile, 'utf8');
presentation = replaceExport(presentation, 'PRODUCT_LOGO_DATA_URI', `data:image/png;base64,${png.toString('base64')}`);
presentation = presentation.replace(/Source: docs\/assets\/[^\n]+/, 'Source: docs/assets/opace-ai-checker-chrome-mark-v4.png')
  .replace(/Source SHA-256: [a-f0-9]+/, `Source SHA-256: ${createHash('sha256').update(bytes).digest('hex')}`)
  .replace(/Resized PNG SHA-256: [a-f0-9]+/, `Resized PNG SHA-256: ${createHash('sha256').update(png).digest('hex')}`);
await writeFile(presentationFile, presentation);
console.log('Approved mark encoded for reports; no other branding assets changed.');
