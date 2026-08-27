// Regenerates src/tokenizer/gpt2-data.ts from assets/vocab.json and
// assets/merges.txt so the bundle stays browser-safe (no fs, no fetch).
// Run: node scripts/embed-assets.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vocab = readFileSync(join(root, 'assets', 'vocab.json'), 'utf8');
const merges = readFileSync(join(root, 'assets', 'merges.txt'), 'utf8');

const banner = `/**
 * GENERATED FILE — do not edit by hand. Run \`node scripts/embed-assets.mjs\`.
 *
 * Standard GPT-2 byte-level BPE assets (OpenAI, MIT licence), copied from the
 * Hugging Face \`gpt2\` model repository. Checksums recorded in the package
 * README. Embedded so the detector bundle needs no filesystem or network.
 */
`;

const body =
  banner +
  `export const GPT2_VOCAB_JSON: string = ${JSON.stringify(vocab)};\n\n` +
  `export const GPT2_MERGES_TXT: string = ${JSON.stringify(merges)};\n`;

writeFileSync(join(root, 'src', 'tokenizer', 'gpt2-data.ts'), body);
console.log('Wrote src/tokenizer/gpt2-data.ts');
