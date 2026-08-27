// Faithfulness of the TypeScript port against golden vectors computed with
// the Apache-2.0 reference implementation (google-deepmind/synthid-text) in
// the pinned Python stack (torch 2.4.0, transformers 4.43.3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..', '..', 'packages', 'watermark-lab');
const {
  computeGValues,
  computeContextRepetitionMask,
  computeEosTokenMask,
  computeHashIv,
  DEMO_KEYS,
  GPT2_EOS_TOKEN_ID,
} = await import(join(pkg, 'dist', 'bundle.js'));

const golden = JSON.parse(
  readFileSync(join(pkg, 'fixtures', 'golden-gvalues.json'), 'utf8'),
);

test('g-values match the reference implementation exactly', () => {
  let compared = 0;
  for (const entry of golden) {
    const key = DEMO_KEYS[entry.key_id];
    assert.ok(key, `demo key ${entry.key_id} exists`);
    const gValues = computeGValues(entry.token_ids, key);
    assert.equal(gValues.length, entry.g_values.length, entry.key_id);
    gValues.forEach((layers, position) => {
      assert.deepEqual(
        Array.from(layers),
        entry.g_values[position],
        `${entry.key_id} position ${position}`,
      );
      compared += layers.length;
    });
  }
  assert.ok(compared > 500, `compared ${compared} g-values`);
});

test('context repetition mask matches the reference (incl. repeated contexts)', () => {
  for (const entry of golden) {
    const key = DEMO_KEYS[entry.key_id];
    const mask = computeContextRepetitionMask(entry.token_ids, key);
    assert.deepEqual(
      mask.map((keep) => (keep ? 1 : 0)),
      entry.repetition_mask.map((keep) => (keep ? 1 : 0)),
      entry.key_id,
    );
  }
  // The dedicated repeated-context vector must actually mask something.
  const repeated = golden[golden.length - 1];
  assert.ok(
    repeated.repetition_mask.some((keep) => !keep),
    'repeated-context golden vector exercises the mask',
  );
});

test('EOS mask matches the reference', () => {
  for (const entry of golden) {
    const mask = computeEosTokenMask(entry.token_ids, GPT2_EOS_TOKEN_ID);
    assert.deepEqual(
      mask.map((keep) => (keep ? 1 : 0)),
      entry.eos_mask.map((keep) => (keep ? 1 : 0)),
    );
  }
});

test('hash IV derivation is deterministic and key-dependent', () => {
  const alpha = computeHashIv(DEMO_KEYS['opace-demo-alpha'].keys);
  const beta = computeHashIv(DEMO_KEYS['opace-demo-beta'].keys);
  assert.equal(typeof alpha, 'bigint');
  assert.notEqual(alpha, beta);
  assert.equal(alpha, computeHashIv(DEMO_KEYS['opace-demo-alpha'].keys));
});
