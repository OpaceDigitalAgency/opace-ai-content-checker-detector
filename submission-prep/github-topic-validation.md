# GitHub topic validation

Checked: 27 August 2026

Target: `OpaceDigitalAgency/opace-ai-content-checker-detector` (public)

## Superseded, 3 September 2026

**The 16-topic decision below is superseded and is kept only as the record of the 27 August 2026
check.** The repository was renamed to `opace-ai-content-checker-detector` on 3 September 2026 and
now carries 20 topics, the platform maximum. Two of the 27 August rules were reversed by evidence
that did not exist then: `ai-detector` was excluded because the first release shipped no
probabilistic detector, and `synthid` because there was no watermark work to point at. Both are
now accurate — the Cycle-5 classifier is live and the SynthID-Text lab ships — and both are
applied.

The applied set, read back from the GitHub API after the change:

```text
ai-checker            ai-content-detector   ai-detection          ai-detector
ai-text-detection     astro                 c2pa                  chatgpt-detector
chrome-extension      claude-detector       content-authenticity  gptzero-alternative
homoglyph             invisible-characters  onnx                  open-source
synthid                typescript            watermark             wordpress-plugin
```

Change made on 3 September 2026: removed `unicode` and `zero-width-characters`, added `ai-checker`
and `claude-detector`. The removed pair was the weakest of the twenty — `unicode` is a language
topic rather than a product one, and `zero-width-characters` is a strict subset of what
`invisible-characters` already covers. No topic-page count below was re-verified for this change,
and none of these counts is evidence of search demand, indexing or ranking.

## Historical check, 27 August 2026

GitHub topics accept lower-case letters, numbers and hyphens. Every proposed topic below matches that syntax and its topic URL returned HTTP 200 during this check. Repository counts are the numbers displayed by GitHub at retrieval time; they show topic usage, not search demand or quality.

| Topic | Syntax | Topic URL and existence | Public repositories | Relevance to shipped source and audience | Indexing state |
|---|---|---|---:|---|---|
| `content-integrity` | valid | [exists](https://github.com/topics/content-integrity) | 10 | Direct product category and evidence vocabulary | Not verified; no Search Console or dated Google result is available |
| `content-provenance` | valid | [exists](https://github.com/topics/content-provenance) | 51 | Relevant to named method states and receipts; does not imply authorship proof | Not verified |
| `astro` | valid | [exists](https://github.com/topics/astro) | 13,007 | Exact supported framework for the integration | Not verified |
| `astro-integration` | valid | [exists](https://github.com/topics/astro-integration) | 199 | Exact package type and catalogue signal | Not verified |
| `dev-toolbar` | valid | [exists](https://github.com/topics/dev-toolbar) | 5 | Exact tested Astro user interface | Not verified |
| `chrome-extension` | valid | [exists](https://github.com/topics/chrome-extension) | 32,586 | Exact first browser-store surface | Not verified |
| `wordpress-plugin` | valid | [exists](https://github.com/topics/wordpress-plugin) | 16,424 | Exact plugin distribution | Not verified |
| `developer-tools` | valid | [exists](https://github.com/topics/developer-tools) | 60,897 | Relevant to SDK, CLI, schemas and integrations | Not verified |
| `privacy` | valid | [exists](https://github.com/topics/privacy) | 22,935 | Local-first processing and explicit route disclosures are material features | Not verified |
| `offline-first` | valid | [exists](https://github.com/topics/offline-first) | 7,478 | Accurate for deterministic browser/core and local workflows; remote/provider routes remain absent | Not verified |
| `text-analysis` | valid | [exists](https://github.com/topics/text-analysis) | 2,416 | Accurate for Unicode and writing-pattern inspection | Not verified |
| `accessibility` | valid | [exists](https://github.com/topics/accessibility) | 14,269 | Keyboard, reflow and axe evidence spans product surfaces | Not verified |
| `json-schema` | valid | [exists](https://github.com/topics/json-schema) | 3,991 | The frozen public contract contains 13 Draft 2020-12 schemas | Not verified |
| `typescript` | valid | [exists](https://github.com/topics/typescript) | 423,978 | Exact language for the public package set | Not verified |
| `python` | valid | [exists](https://github.com/topics/python) | 859,860 | Exact language for the CLI and loopback service | Not verified |
| `php` | valid | [exists](https://github.com/topics/php) | 151,064 | Exact language for the WordPress integration and fixtures | Not verified |

## Decision

Use the 16 prepared topics. The set stays below GitHub's 20-topic limit, covers the product category, ecosystems, implementation and defensible attributes, and contains no unsupported detector/removal topic.

Do not add `ai-detector`, `humanizer`, `watermark-remover`, `synthid` or `anthropic` for 0.1.0. The release does not ship a probabilistic authorship detector, humaniser, guaranteed removal method or supported Anthropic production adapter. A topic-page count or a page's existence must never be reported as keyword demand, indexing or ranking.

Recheck the 16 topic URLs and counts immediately before any authorised repository-setting action. Separately record whether GitHub applied each topic, whether the repository appears on each topic page, and whether any destination is indexed.
