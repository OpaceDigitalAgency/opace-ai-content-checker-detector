// Paste-simulation on arbitrary English prose (must be noise under demo
// keys), determinism across tokenise+score, browser-safety of the bundle,
// and the 10,000-token performance budget.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..', '..', 'packages', 'watermark-lab');
const bundlePath = join(pkg, 'dist', 'bundle.js');
const { score, tokenise, DEMO_KEYS, DEMO_KEY_IDS } = await import(bundlePath);

// Human-written English prose (authored for this test, not model output).
const PROSE = [
  `The allotment behind the railway line had been in the family for three
generations, and nobody could remember who first planted the rhubarb. Every
spring it came up regardless, thick and sour, and every autumn my grandfather
would swear it was the last year he would bother with it. He said the soil
was mostly cinders and spite. The beans did well enough, though, and the
onions never failed, and on warm evenings he would sit on an upturned crate
by the water butt and explain, at length, why the committee had been wrong
about the hedge, wrong about the rents, and wrong about almost everything
since 1974. We took him a flask of tea and pretended to agree, because the
alternative was an hour on the subject of pigeons. When the council finally
sold the land for housing, he did not say much. He dug up the rhubarb crowns,
wrapped them in damp newspaper, and planted them behind the garage, where
they sulked for two summers and then, against all advice, thrived.`,
  `Budget meetings at the parish hall followed a pattern as fixed as the
liturgy. The treasurer would present the accounts, someone would question the
cost of the photocopier, and Mrs Hale would propose, as she had proposed for
eleven consecutive years, that the flower rota be given its own budget line.
The vicar, who understood both accounting and diplomacy, would thank her
warmly and move to any other business. Once a year the boiler broke, and once
a year the same three men stood around it in the crypt agreeing that they did
not make them like that any more, which was true, and that it had another
winter in it yet, which never was. The hall survived on jumble sales, small
legacies and stubbornness. It is still there. The photocopier is not.`,
  `You learn a river slowly. The first season you fish it, you read the water
the way a tourist reads a phrasebook, pointing at likely spots and hoping.
The second season you begin to notice the seams, the slack behind the big
stone, the way the current folds under the alders after rain. By the fifth
you no longer think about it at all; your feet know where the gravel shelves
and your hands know the cast before you do. My father fished the same two
miles of the Teme for forty years and claimed, without irony, that he was
still learning it. He lost more fish than he landed and called that the
proper ratio. A river that gave you everything, he said, would be a canal.`,
].join('\n\n');

test('arbitrary English prose scores ~0.5 under every demo key', () => {
  const ids = tokenise(PROSE);
  assert.ok(ids.length > 500, `prose tokenises to ${ids.length} ids`);
  for (const keyId of DEMO_KEY_IDS) {
    const result = score(ids, DEMO_KEYS[keyId]);
    console.log(
      `  [prose] ${keyId}: meanG=${result.meanG.toFixed(4)} z=${result.z.toFixed(2)}`,
    );
    assert.ok(
      Math.abs(result.meanG - 0.5) < 0.04,
      `${keyId}: meanG=${result.meanG}`,
    );
  }
});

test('tokenise + score is deterministic', () => {
  const first = tokenise(PROSE);
  const second = tokenise(PROSE);
  assert.deepEqual(first, second);
  const a = score(first, DEMO_KEYS['opace-demo-alpha']);
  const b = score(second, DEMO_KEYS['opace-demo-alpha']);
  assert.deepEqual(a, b);
});

test('bundle is browser-safe (no Node built-ins, no network primitives)', () => {
  const source = readFileSync(bundlePath, 'utf8');
  for (const forbidden of [
    'require("fs")', "require('fs')", 'node:fs', 'node:crypto', 'node:path',
    'process.env', 'XMLHttpRequest', 'fetch(',
  ]) {
    assert.ok(!source.includes(forbidden), `bundle contains ${forbidden}`);
  }
});

test('scores 10,000 tokens in under 250ms', () => {
  const ids = [];
  let state = 123456789;
  for (let i = 0; i < 10000; i += 1) {
    state = (1103515245 * state + 12345) % 2147483648;
    ids.push(state % 50257);
  }
  const key = DEMO_KEYS['opace-demo-alpha'];
  score(ids.slice(0, 100), key); // warm up
  const started = performance.now();
  const result = score(ids, key);
  const elapsed = performance.now() - started;
  console.log(`  [perf] 10,000 tokens scored in ${elapsed.toFixed(1)}ms`);
  assert.equal(result.totalPositions, 10000 - 4);
  assert.ok(elapsed < 250, `took ${elapsed}ms`);
});
