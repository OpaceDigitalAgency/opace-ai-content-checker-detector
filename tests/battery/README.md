# Adversarial fixture battery

The standing release gate defined in `v0.1-REVIEW.md` §6, wired into the test
tree as required by §8.2. Every suite runs the built engine
(`packages/core/dist`) — build the core before running.

## Run

```sh
npm run test:battery          # from implementation/
node --test tests/battery/*.test.mjs
```

## Suites

| Suite | Proves |
|---|---|
| `carrier-battery.test.mjs` | Every carrier category in the engine's own table (`packages/core/src/unicode/data.ts`, enumerated programmatically from the built copy, both ends of each range) is detected in plain text with its declared code point, severity and fix. The emoji-ZWJ and Persian/Indic-ZWNJ exemptions hold. No carrier from the v0.1 fixture-B escape list (ZWNJ, ZWJ, NNBSP, hair space, tag characters, VS16, CGJ, MVS) produces a clean report again. |
| `slop-battery.test.mjs` | Fixture D (modern AI slop, verbatim from the review) fires at least 5 findings and classifies `ai_like`; fixture C (classic clichés) fires and never reads `human_like`; fixture E (verified-human control) yields zero high-severity findings and classifies `human_like`. The GPT-5.6 article excerpt — clean, well-prompted AI prose scored 100% AI by Copyleaks and Originality — is scored and **printed, never asserted**: the rule and stylometric tiers document what they currently see, and closing that gap is the Tier C trained-model milestone (`BRIEF.md` §21). |
| `uniformity-battery.test.mjs` | Structural rhythm stylometrics: five near-identical-length FAQ answers fire `signals.uniform_sections`; an em-dash-dense paragraph fires `signals.em_dash_density`; naturally varied human prose fires neither. |
| `protected-battery.test.mjs` | The dense audit fact text yields all 12 protected-span kinds — including `name`, `organisation` and `citation`, the v0.1 headline misses — with exact offsets, and the safe-fix preview leaves every protected span byte-identical (carriers inside protected spans are skipped with `protected_span`; carriers in plain prose are still fixed). |
| `cross-surface.test.mjs` | The source `dist/bundle.js` and the website's installed copy (`opace-website/astro-latest/node_modules/@opace/content-integrity-core`) produce byte-identical findings, methods (timestamps stripped) and editorial signals for fixtures C/D/E and the fixture-B carrier line, under fixed request ids and injected `now()`/`analysisId`, and declare the same `EN_SIGNALS_PATTERN_VERSION` and `UNICODE_RULES_VERSION`. |

Shared verbatim fixtures live in `fixtures.mjs`; fixtures C, D, E, the fact
text and the article excerpt are byte-identical to the review's test inputs.

## Standing rule

**Every new capability lands with a battery extension.** A new carrier rule,
pattern category, stylometric signal, protected-span kind, detector adapter or
delivery surface is not done until this directory has a case that would fail
without it — and a human-control case proving it adds no false positives. The
battery is the release gate: no surface publishes while any suite is red, and
any cross-surface divergence fails the build.

## Known limitation, recorded honestly

The article-excerpt case in `slop-battery.test.mjs` prints a low score today.
That is the documented state of Tier A/B detection on clean AI prose, not a
regression; do not convert it into an assertion until the Tier C model ships
and beats it on the benchmark corpus.
