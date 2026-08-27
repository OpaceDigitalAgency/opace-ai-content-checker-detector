// Detection behaviour over the genuinely watermarked GPT-2 fixtures:
// right key -> strong signal; wrong key -> noise around 0.5; unwatermarked
// -> noise with every key; degradation -> reduced but directional signal.
// Also asserts TS scores agree with the reference implementation's scores.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..', '..', 'packages', 'watermark-lab');
const { score, DEMO_KEYS, DEMO_KEY_IDS, SCORE_DISCLAIMER } = await import(
  join(pkg, 'dist', 'bundle.js')
);

const { fixtures, manifest } = JSON.parse(
  readFileSync(join(pkg, 'fixtures', 'synthid-demo-v1.json'), 'utf8'),
);
const referenceScores = JSON.parse(
  readFileSync(join(pkg, 'fixtures', 'reference-scores.json'), 'utf8'),
);

const watermarked = fixtures.filter((f) => f.kind === 'watermarked');
const unwatermarked = fixtures.filter((f) => f.kind === 'unwatermarked');
const degraded = fixtures.filter((f) => f.kind.startsWith('degraded'));

test('fixture corpus is complete', () => {
  assert.ok(watermarked.length >= 12, `${watermarked.length} watermarked`);
  assert.ok(unwatermarked.length >= 8, `${unwatermarked.length} unwatermarked`);
  assert.ok(degraded.length >= 4, `${degraded.length} degradation variants`);
  assert.ok(manifest.claim_boundary.includes('Anthropic'));
});

test('watermarked fixtures score meanG > 0.6 with their own key', () => {
  for (const fixture of watermarked) {
    const result = score(fixture.token_ids, DEMO_KEYS[fixture.key_id]);
    console.log(
      `  [right-key] ${fixture.id}: meanG=${result.meanG.toFixed(4)} ` +
        `weighted=${result.weightedMeanG.toFixed(4)} z=${result.z.toFixed(2)} ` +
        `p=${result.pValue.toExponential(2)} scored=${result.scoredPositions}`,
    );
    assert.ok(result.meanG > 0.6, `${fixture.id} meanG=${result.meanG}`);
    assert.ok(result.pValue < 1e-3, `${fixture.id} p=${result.pValue}`);
  }
});

test('ALL fixtures score ~0.5 with wrong keys', () => {
  for (const fixture of fixtures) {
    for (const keyId of DEMO_KEY_IDS) {
      if (keyId === fixture.key_id) continue;
      const result = score(fixture.token_ids, DEMO_KEYS[keyId]);
      console.log(
        `  [wrong-key] ${fixture.id} x ${keyId}: meanG=${result.meanG.toFixed(4)}`,
      );
      assert.ok(
        Math.abs(result.meanG - 0.5) < 0.04,
        `${fixture.id} under ${keyId}: meanG=${result.meanG}`,
      );
    }
  }
});

test('unwatermarked fixtures score ~0.5 with every demo key', () => {
  for (const fixture of unwatermarked) {
    for (const keyId of DEMO_KEY_IDS) {
      const result = score(fixture.token_ids, DEMO_KEYS[keyId]);
      assert.ok(
        Math.abs(result.meanG - 0.5) < 0.04,
        `${fixture.id} under ${keyId}: meanG=${result.meanG}`,
      );
      assert.ok(
        result.pValue > 1e-3,
        `${fixture.id} under ${keyId} should not look watermarked (p=${result.pValue})`,
      );
    }
  }
});

test('degradation variants show reduced but directional signal', () => {
  for (const fixture of degraded) {
    const source = fixtures.find((f) => f.id === fixture.source_id);
    assert.ok(source, `source ${fixture.source_id} present`);
    const degradedScore = score(fixture.token_ids, DEMO_KEYS[fixture.key_id]);
    const sourceScore = score(source.token_ids, DEMO_KEYS[fixture.key_id]);
    console.log(
      `  [degraded] ${fixture.id}: meanG=${degradedScore.meanG.toFixed(4)} ` +
        `(source ${sourceScore.meanG.toFixed(4)}), z=${degradedScore.z.toFixed(2)}, ` +
        `scored=${degradedScore.scoredPositions}`,
    );
    // Direction: still above the 0.5 null…
    assert.ok(
      degradedScore.meanG > 0.5,
      `${fixture.id} retains directional signal (meanG=${degradedScore.meanG})`,
    );
    if (fixture.kind === 'degraded-substituted') {
      // …but substitution weakens the per-position evidence.
      assert.ok(
        degradedScore.meanG < sourceScore.meanG,
        `${fixture.id} weaker than source`,
      );
    }
  }
});

test('TS scores agree with the reference implementation scores', () => {
  let compared = 0;
  for (const fixture of fixtures) {
    for (const keyId of DEMO_KEY_IDS) {
      const expected = referenceScores[fixture.id]?.[keyId];
      if (!expected) continue;
      const result = score(fixture.token_ids, DEMO_KEYS[keyId]);
      assert.ok(
        Math.abs(result.meanG - expected.meanG) < 1e-4,
        `${fixture.id}/${keyId} meanG ${result.meanG} vs ${expected.meanG}`,
      );
      assert.ok(
        Math.abs(result.weightedMeanG - expected.weightedMeanG) < 1e-4,
        `${fixture.id}/${keyId} weightedMeanG`,
      );
      assert.equal(result.scoredPositions, expected.scored, `${fixture.id}/${keyId} scored`);
      compared += 1;
    }
  }
  assert.ok(compared >= 60, `compared ${compared} fixture x key scores`);
});

test('scoring is deterministic and carries the claim-boundary disclaimer', () => {
  const fixture = watermarked[0];
  const first = score(fixture.token_ids, DEMO_KEYS[fixture.key_id]);
  const second = score(fixture.token_ids, DEMO_KEYS[fixture.key_id]);
  assert.deepEqual(first, second);
  assert.equal(first.disclaimer, SCORE_DISCLAIMER);
  assert.match(first.disclaimer, /demo key/);
  assert.match(first.disclaimer, /Anthropic/);
});
