# @opace/watermark-lab

A real, browser-runnable SynthID-Text known-key demo detector. This package is
a faithful TypeScript port of the **detection path** of Google DeepMind's
Apache-2.0 reference implementation, plus a GPT-2 byte-level BPE tokeniser so
arbitrary pasted text can be scored entirely in the browser — no network, no
model, pure functions over token-id arrays.

## Claim boundary (read first)

Everything in this package is a **known-key demo experiment** with public
Opace demo keys. It demonstrates how generation-time text watermarks work
using the published science. It does **not** run Google's or Anthropic's
production detectors or keys, cannot tell you whether text came from Gemini
or Claude, and **this mathematics cannot say anything about Claude output
without Anthropic's private key**. A score near 0.5 never proves text is
human-written.

## Provenance and licences

- Detection mathematics ported from `google-deepmind/synthid-text`
  (Apache-2.0, Google DeepMind), snapshot commit
  `addb4a158143c7c6851a1308f78b89fceed59683`, held in-tree at
  `source-snapshots/synthid-text-reference`. Ported files:
  `hashing_function.py`, `logits_processing.py` (g-values and masks),
  `detector_mean.py` (mean and weighted-mean scores).
- Tokeniser algorithm adapted from OpenAI's GPT-2 reference encoder
  (`github.com/openai/gpt-2`, `src/encoder.py`, MIT licence).
- Tokeniser assets (`assets/vocab.json`, `assets/merges.txt`) are the
  standard GPT-2 vocabulary published by OpenAI (MIT licence), copied from
  the Hugging Face `gpt2` model repository. SHA-256:
  - `vocab.json`  `196139668be63f3b5d6574427317ae82f612a97c5d1cdaf36ed2256dbf636783`
  - `merges.txt`  `1ce1664773c50f3e0cc8842619a93edc4624525b728b188a9e0be33b7726adc5`
- As the upstream README notes, the LCG-style hash provides **no
  cryptographic security guarantees** — it is a demonstration method.
- MarkLLM (Apache-2.0, THU-BPM, <https://github.com/THU-BPM/MarkLLM>) and
  `cyzanfar/text-watermark-remover` (MIT) were snapshotted and read during the
  watermark research. Neither is used here and nothing in this package derives
  from either.
- Full third-party records for the whole project, including the projects behind
  the rule tiers and the trained model:
  [THIRD_PARTY_NOTICES.md](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/THIRD_PARTY_NOTICES.md).

## Where this is weakest

This package scores text against **public demo keys only**. It cannot verify or
rule out any provider's production watermark, and no public verifier exists for
Anthropic production keys. SynthID could not be tested against real generated
output at all on this project: it is a generation-time watermark, none of the
evaluation corpus was generated with it enabled, and there is no detector key.
Saying so is the finding — a post-hoc text detector cannot evaluate it, and any
tool claiming to detect or remove SynthID without a key is claiming something
the method does not support.

The rest of the project's measured weaknesses — human fiction wrongly flagged
8.8% of the time (23 of 260) on the server route and 10.0% (26 of 260) in the
browser, detection falling to 16.9% (29 of 172) on passages of 100 to 199 words
and 84.6% (193 of 228) at 300 to 399, machine rewrites of human originals caught
30–35% of the time — belong to the
trained model rather than to this package, and are listed in full under
[Honest limitations](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#honest-limitations).

## Public API

```ts
import {
  tokenise,            // (text: string) => number[]           GPT-2 BPE ids
  score,               // (ids, key, opts?) => ScoreResult
  DEMO_KEYS,           // three named public demo key sets
  DEMO_KEY_IDS,
  computeGValues,      // lower-level primitives for visualisation
  computeCombinedMask,
  meanScores, zScore, pValueFromZ,
  Gpt2Tokenizer, getTokenizer, GPT2_EOS_TOKEN_ID,
  WATERMARK_LAB_VERSIONS,
} from '@opace/watermark-lab';

const result = score(tokenise(text), DEMO_KEYS['opace-demo-alpha']);
// result: { meanG, weightedMeanG, z, pValue, perTokenG, scoredPositions,
//           totalPositions, depth, keyId, disclaimer }
```

The "wrong key" experiment is simply `score(ids, someOtherKey)`: same
mathematics, and the score collapses to noise around the 0.5 null. Verified
against the built package with the first watermarked fixture:


```js
import { tokenise, score, DEMO_KEYS, DEMO_KEY_IDS } from '@opace/watermark-lab';
import { readFileSync } from 'node:fs';

const { fixtures } = JSON.parse(
  readFileSync('node_modules/@opace/watermark-lab/fixtures/synthid-demo-v1.json', 'utf8'));
const wm = fixtures.find(f => f.kind === 'watermarked');
const ids = tokenise(wm.text);

score(ids, DEMO_KEYS[wm.key_id]).meanG;                                   // 0.643 (right key)
score(ids, DEMO_KEYS[DEMO_KEY_IDS.find(k => k !== wm.key_id)]).meanG;     // 0.513 (wrong key)
```

![Grouped bar chart of mean g-values. Each watermarked passage scores about 0.68 under the key it was generated with and collapses to about 0.50 under the other two. Unwatermarked text sits on the 0.5 chance line under all three keys.](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/main/docs/assets/charts/watermark-key-collapse.svg)

Every value in that chart is a `meanG` from
[`fixtures/reference-scores.json`](fixtures/reference-scores.json), captioned with the number of
scored positions behind it. The longest `alpha` fixture, 393 scored positions, reads **0.6807**
under `alpha`, **0.4987** under `beta` and **0.4869** under `gamma`; unwatermarked text reads
0.5077–0.5105 under all three keys. That is the argument that watermark detection is evidence
about a specific private key rather than a universal machine stamp — and therefore the reason this
lab cannot verify any provider's production watermark, which it says plainly rather than implying
otherwise. The chart also appears on the
[repository front page](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#a-watermark-only-shows-up-under-its-own-key).

The three demo key ids are `opace-demo-alpha`, `opace-demo-beta` and
`opace-demo-gamma`. Ten thousand tokens score in about 50 ms; the test
suite is 30/30 and the port's 72 fixture-by-key scores agree with the
reference implementation to within 1e-4.

Configuration follows the reference defaults: `ngramLen: 5` (the paper's
H = 4 context window), `contextHistorySize: 1024`, non-distortionary
tournament (`num_leaves = 2`). The demo key sets use 6 tournament layers
(the reference example configuration uses 30; fewer layers give a clearer
per-layer signal at educational passage lengths) — recorded in
`WATERMARK_LAB_VERSIONS` and the fixture manifest.

## Fixtures

`fixtures/synthid-demo-v1.json` contains 24 genuinely generated fixtures
(12 watermarked via the reference tournament-sampling generation path with
GPT-2 124M, 8 unwatermarked GPT-2 passages, 4 degradation variants) with a
full generation manifest (model, config, per-fixture seeds, package
versions, reference commit). `fixtures/reference-scores.json` holds the
reference implementation's own scores for every fixture x key pair;
`fixtures/golden-gvalues.json` and `fixtures/tokenizer-parity.json` are the
faithfulness/parity golden vectors.

Reproduce with the pinned Python stack (python 3.12, torch 2.4.0,
transformers 4.43.3, immutabledict 4.2.0):

```sh
python3.12 -m venv .venv && .venv/bin/pip install torch==2.4.0 \
  transformers==4.43.3 immutabledict==4.2.0 numpy==1.26.4
.venv/bin/python scripts/generate-fixtures.py
```

Note: fixture seeds were selected so demonstration scores sit inside the
documented tolerance bands (wrong-key means at these lengths have standard
error ~0.02–0.04); the selection rule is in `scripts/generate-fixtures.py`
and the manifest.

## Where it runs

The live [Claude Watermark Readiness Lab](https://opace.agency/tools/ai/content-verification-integrity/claude-watermark-readiness-lab/)
builds its interactive experience on this package. Its v2 release adds key
rotation (pasted text is scored under every held demo key, so a
lab-generated sample has its producing key genuinely recovered by the
mathematics, while unrelated text shows every key collapsing to the 0.5
null) and desktop auto-load of the detection engine when the lab first
scrolls into view. Both behaviours live in the site controller; this
package stays pure functions.

The **AI Content Integrity Checker** also runs this package live, on every
assessment, as the named method `watermark.known_keys`. The site wrapper
(`src/lib/watermark-scan/`) tokenises the pasted text, calls `score` under
all three demo keys, and renders a per-key table of mean g, p-value and
scored positions:

- fewer than 40 scoreable n-gram positions returns `too_short`, and no
  verdict is rendered at all;
- `p < 0.001` with mean g above 0.5 under at least one key returns
  `signal_found`, naming that key;
- anything else returns `no_signal`, reported as inconclusive and never as
  a pass, with the wording that provider keys are private so an absent
  signal can neither clear nor accuse a text.

That check replaced a static "Anthropic watermark / Unsupported" row which
asserted the boundary without running anything. The boundary is still
stated, as its own line: Anthropic production keys are private, no public
verifier exists, and that watermark is not assessed. The engine chunk is
dynamically imported only when the check runs and is shared with the lab,
so a visitor pays the roughly 1.7 MB download once.

## Build and test

```sh
npm run build   # tsc + esbuild ESM bundle (browser-safe, ~1.7 MB, mostly vocab)
npm test        # node:test suite in ../../tests/watermark-lab/
```

## Links

[Capability register](../../docs/CAPABILITIES.md) ·
[Evidence index](../../docs/EVIDENCE-INDEX.md) ·
[Repository README](../../README.md) ·
[Claude watermark readiness lab](https://opace.agency/tools/ai/content-verification-integrity/claude-watermark-readiness-lab/) ·
[Opace Digital Agency](https://opace.agency/)
