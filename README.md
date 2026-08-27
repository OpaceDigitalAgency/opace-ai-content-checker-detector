# Opace AI Content Integrity

One local-first engine for explainable content-integrity evidence: hidden-character forensics, writing-signal analysis, protected facts, watermark science and reproducible receipts. The same compiled engine powers every surface (web checker, WordPress plugin, Chrome extension, Astro integration, CLI and local service), so identical input produces identical findings everywhere.

![Opace AI Content Integrity evidence workflow with a genuine local toolbar](docs/assets/opace-ai-content-integrity-hero-v2.png)

The product never presents an AI score as proof of authorship. Every result names the method that ran, its version, its status and its limitations. A pass applies only to its named check.

[Try the browser checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) · [Product page](https://opace.agency/tools/ai/content-integrity/) · [Privacy notice](https://opace.agency/tools/ai/content-integrity/privacy/) · [Support](https://opace.agency/tools/ai/content-integrity/support/)

## One engine, many surfaces

The engine is `@opace/content-integrity-core` (TypeScript, MIT, local-only), compiled once and bundled into every shell. There are no parallel analysis implementations to drift apart: PHP and Python act as orchestration only. Two version constants, `UNICODE_RULES_VERSION` and `EN_SIGNALS_PATTERN_VERSION`, are stamped into every result and receipt, and a cross-surface test battery proves that the installed engine on the website is byte-identical to source on findings, methods, signals and versions.

| Surface | How it consumes the engine | Where |
|---|---|---|
| Web checker | Browser Worker via `@opace/content-integrity-browser`, with a main-thread watchdog fallback | [live checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) |
| WordPress plugin | Same JS bundle in the admin Worker; PHP handles REST, persistence and receipts | [wordpress/](wordpress/opace-ai-content-integrity/readme.txt) |
| Chrome extension | Bundled MV3 Worker over selected or visible page text | [extensions/chrome/](extensions/chrome/README.md) |
| Astro integration | Dev Toolbar checks and hash-only build reports | [packages/astro/](packages/astro/README.md) |
| Node CLI | `opace-integrity` command over the identical core | [packages/cli/](packages/cli/README.md) |
| Local engine | Authenticated loopback API (`127.0.0.1:8741`) for heavier optional adapters | [services/local-engine/](services/local-engine/README.md) |
| Watermark lab | `@opace/watermark-lab` scores text against demo watermark keys, fully in-browser | [packages/watermark-lab/](packages/watermark-lab/README.md) |

## Capabilities by tier

The full technical register, with exact rule inventories and test evidence, is [docs/CAPABILITIES.md](docs/CAPABILITIES.md). Ready-to-copy listing descriptions for WordPress.org, the Chrome Web Store, npm and Astro live in [DESCRIPTIONS.md](DESCRIPTIONS.md).

### Tier A — deterministic evidence (exact, local, runs everywhere)

- **Invisible-character detection**: 38 carrier rules covering 415 code points (full Cf format set including the tag block, variation selectors including the supplementary range, the Zs space family, separators, unpaired surrogates), with context intelligence so emoji sequences, cursive and Indic scripts and French typography do not false-flag.
- **Homoglyph detection**: 60 Cyrillic and Greek Latin-lookalike confusables with a mixed-script gate, so pure Russian or Greek text never flags.
- **Protected content**: 12 span kinds (currency, number, date, time, unit, url, email, quote, code, name, organisation, citation) extracted precision-first, so facts survive any rewrite.
- **Provenance**: a C2PA Content Credentials adapter built on the official c2pa-js library (JPEG, PNG, WebP, read entirely locally) is in integration.
- **Receipts**: canonical, hash-only RFC 8785 receipts recording exactly which checks ran, at which versions, with which statuses.

### Tier B — writing-signal rules and stylometrics

- 54 named rules today: 51 weighted categories (46 adapted from avoid-ai-writing plus 5 Opace-original structural rules) and 3 en-gb rules, producing a 0–100 editorial-signals score with trinary classification and confidence.
- The `en-signals:2026.08.4` expansion adds an artefact-forensics category (exposed chatbot citation tokens, URL fingerprints, placeholders, reasoning leaks, character-set leakage), new stylometric measures, owner-sourced rules and era/model-attribution metadata, growing the pack to 103 weighted categories (106 named rules with the three original en-gb rules).
- This tier explains and improves writing and catches careless AI output. It is never presented as authorship detection.

### Tier C — trained local models (in development)

A distilled in-browser classifier for genuine AI-writing signals, downloaded once on explicit consent, still private. Until it ships, clean text is labelled "No strong AI-style signals", never "human".

### Tier D — authorised external verification (planned)

Bring-your-own-key adapters to commercial detectors the user already pays for, with clearly attributed results, plus official Anthropic verification if and when a supported interface exists.

### Watermark lab

A real SynthID-Text demo detector: DeepMind's Apache-2.0 reference detection mathematics ported faithfully to TypeScript, a GPT-2 tokeniser, genuinely generated watermarked fixtures and a wrong-key collapse demonstration, all in-browser with public demo keys. See [packages/watermark-lab/](packages/watermark-lab/README.md).

## Quick starts

**No install:** paste text into the [browser checker](https://opace.agency/tools/ai/content-verification-integrity/checker/). Everything runs in your browser; nothing is uploaded.

**npm — core engine** (after owner-approved publication; verified against the built package):

```js
import { inspect, computeEditorialSignals } from "@opace/content-integrity-core";

const result = await inspect({
  schema_version: "1.0",
  contract_version: "1.0.0",
  request_id: "req_readme_demo",
  created_at: new Date().toISOString(),
  source: { content: "In today's rapidly evolving landscape, Opace quoted £1,250.​",
            content_type: "plain_text", language: "en-GB" },
  checks: ["unicode.invisible", "style.patterns", "watermark.anthropic"],
  privacy: { allowed_routes: ["browser"], save_receipt: false, retain_content: false }
});
console.log(result.summary);
// { pass: 0, attention: 2, fail: 0, inconclusive: 0, unsupported: 1, not_configured: 0, not_run: 0, error: 0 }

const signals = computeEditorialSignals(draftText);
// { score, classification, probabilities, confidence, categoriesHit, findingCount, wordCount, version, status, description }
```

**npm — watermark lab:**

```js
import { tokenise, score, DEMO_KEYS } from "@opace/watermark-lab";

const ids = tokenise(watermarkedFixtureText);
score(ids, DEMO_KEYS["opace-demo-alpha"]).meanG; // 0.643 (right key)
score(ids, DEMO_KEYS["opace-demo-beta"]).meanG;  // 0.513 (wrong key: collapses to the 0.5 null)
```

**CLI:**

```sh
opace-integrity inspect article.txt
opace-integrity inspect - --format json < article.txt
```

**Local engine** (optional, loopback only): see [services/local-engine/](services/local-engine/README.md). It binds only to `http://127.0.0.1:8741` with separate run and administration tokens.

To validate the monorepo itself (Node 20+, Python 3.10+, PHP 7.4+ for the full cross-language run):

```sh
npm ci
npm test
npm run test:battery   # 84/84 cross-surface fixture battery
```

## Honest limitations

- **Clean, well-prompted AI prose carries no rule-detectable style tells.** A 100% GPT-5.6 article scores 6/100 with the rule tier. Only a trained model can catch that class; our Tier C model is in development, and every surface says so instead of implying a human verdict.
- A clean result means no selected rule matched. It is not evidence of human authorship, and the UI labels it "No strong AI-style signals" with a "style rules only" marker.
- The signals score is false-negative-biased by design: classic-cliché AI text reaches `mixed_signals`, not `ai_like`.
- A carrier inserted mid-entity can defeat name and organisation extraction.
- The watermark lab uses public demo keys and cannot verify or rule out any provider's production watermark.
- No plagiarism checking, no detector-clearance claims, no guaranteed SEO outcomes. Unsupported and unrun checks are shown as exactly that, never collapsed into a pass.

## Methodology and versioning

Every analysis records the signal-set versions that produced it (`unicode:2026.08.2`, `en-signals:2026.08.4` at the time of writing) in results and receipts, so findings are reproducible and surfaces are provably in step. Statuses come from a fixed vocabulary (`pass`, `attention`, `fail`, `inconclusive`, `unsupported`, `not_configured`, `not_run`, `error`). Test methodology and evidence classes are documented in [docs/TEST-EVIDENCE.md](docs/TEST-EVIDENCE.md); the standing rule is that every new capability lands with a fixture-battery extension.

## Roadmap

- **Trained local model (Tier C)**: distilled classifier, hard-negative-mining training per the published Pangram method, benchmark-gated before any accuracy claim.
- **BYOK adapters (Tier D)**: Copyleaks and Originality first, rendering their attributed scores beside ours.
- **WordPress, Chrome and Astro sync**: next release, built from the same engine tarballs.
- **Benchmark and Integrity Index**: reproducible, versioned corpus with published false-positive rates, including a hand-rewritten-AI category.

## Attribution and licences

This project deliberately reuses excellent prior work, with credit:

- **avoid-ai-writing** (MIT, Conor Bronsdon and contributors): writing-pattern rules, stylometric methods, weights and classifier logic, adapted to TypeScript.
- **watermarks-remover** (MIT, Guillaume Meyer): carrier and confusable table data, adapted.
- **google-deepmind/synthid-text** (Apache-2.0): the watermark detection mathematics ported in `@opace/watermark-lab`.
- **Unicode Consortium data**: the category-derived carrier inventory.
- **OpenAI GPT-2** (MIT): tokeniser algorithm and vocabulary assets.
- **c2pa-js** (Content Authenticity Initiative): the provenance adapter.

Full records: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), [MODEL_AND_DATA_PROVENANCE.md](MODEL_AND_DATA_PROVENANCE.md), [docs/legal/DEPENDENCY-LEDGER.md](docs/legal/DEPENDENCY-LEDGER.md).

## Documentation

- [Capability register](docs/CAPABILITIES.md) — the exhaustive technical inventory
- [Listing descriptions](DESCRIPTIONS.md) — canonical copy for stores and registries
- [Test evidence](docs/TEST-EVIDENCE.md) · [Release state](docs/RELEASE-STATE.md)
- [Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Code of conduct](CODE_OF_CONDUCT.md)
- [Changelog](CHANGELOG.md) · [Citation](CITATION.cff)

## Privacy and security

Browser, extension and Astro inspection stays on the device: no telemetry, no remote fallback, no content sent to Opace or any detector provider by default. The loopback service requires bearer tokens and rejects non-loopback origins. Report vulnerabilities through [SECURITY.md](SECURITY.md), never a public issue.

Maintained by [Opace Digital Agency](https://opace.agency/). Opace-authored monorepo code is available under the [MIT Licence](LICENSE); the WordPress distribution retains its declared GPL-compatible licence.
