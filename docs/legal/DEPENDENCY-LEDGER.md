# Dependency allow/hold/reject ledger

This ledger records the exact dependencies approved for the Opace AI Content Integrity 0.1.0 developer packages and sole current WordPress 1.0.5 submission candidate (`dist/opace-ai-content-integrity-1.0.5.zip`, SHA-256 `c4431c483f7152d058a7624d518959f3d728137cb4f2a83436b554c72c53f0bd`). Package locks and CycloneDX SBOMs provide the resolved dependency graphs. Provider and research-snapshot entries remain held or rejected and are not distributed. That is no longer true of the model: as of 28 August 2026 the cycle-2 int8 ONNX artefact is served from the live checker and downloaded by every visitor who consents to run it, so it is a distributed component and is recorded as such below. The training corpora are not distributed, but their licences are recorded here because a model trained on them is.

| Component | Origin/version | Licence | Release state | Purpose |
|---|---|---|---|---|
| Ajv | npm `8.20.0` | MIT | allow; public TypeScript client runtime | Draft 2020-12 validation |
| ajv-formats | npm `3.0.1` | MIT | allow; public TypeScript client runtime | URI/date-time formats |
| canonicalize | npm `4.0.0` | Apache-2.0 | allow; public core/CLI/Astro runtime | RFC 8785 canonical JSON |
| fast-deep-equal | npm `3.1.3` | MIT | allow; public Ajv runtime transitive | equality support |
| fast-uri | npm `3.1.6` | BSD-3-Clause | allow; public Ajv runtime transitive | URI support |
| json-schema-traverse | npm `1.0.0` | MIT | allow; public Ajv runtime transitive | schema traversal |
| require-from-string | npm `2.0.2` | MIT | allow; public Ajv runtime transitive | standalone module support |
| entities | npm `4.5.0` | BSD-2-Clause | allow; bundled public Astro runtime | Standards-correct HTML entity decoding for server/build visible-text parity |
| Astro | npm `5.18.2`, `6.4.8`, `7.2.7` | MIT | allow; peer/matrix dependency, not bundled | Integration compatibility across the tested matrix |
| esbuild | npm `0.28.2` | MIT | allow; build-only, not shipped as an extension runtime | Bundle Astro and Chrome runtime assets |
| @types/chrome | npm `0.1.36` | MIT | allow; test/build-only | Manifest V3 API type checking |
| axe-core | npm `4.10.3` | MPL-2.0 | allow; test-only, not shipped | Rendered accessibility assertions |
| json-schema-to-typescript | npm `15.0.4` | MIT | allow; build/test-only | Generate TypeScript DTOs from canonical schemas |
| jsonschema | PyPI `4.25.1` | MIT | allow; public Python runtime | Native Python Draft 2020-12 validation |
| rfc8785 | PyPI `0.1.4` | Apache-2.0 | allow; public Python runtime | Native Python RFC 8785 canonicalisation |
| attrs | PyPI `25.3.0` | MIT | allow as exact local runtime transitive dependency | `jsonschema` support |
| jsonschema-specifications | PyPI `2025.4.1` | MIT | allow as exact local runtime transitive dependency | JSON Schema vocabularies |
| referencing | PyPI `0.36.2` | MIT | allow as exact local runtime transitive dependency | JSON reference resolution |
| rpds-py | PyPI `0.27.0` | MIT | allow as exact macOS arm64 and Linux x86_64/aarch64 runtime transitive dependency | persistent data structures |
| typing-extensions | PyPI `4.15.0` | PSF-2.0 | allow as exact local runtime transitive dependency | Python typing compatibility |
| build / setuptools / wheel | PyPI `1.3.0` / `80.9.0` / `0.45.1` | MIT | allow build-only | deterministic local wheel/sdist candidate |
| pip-audit | PyPI `2.9.0` | Apache-2.0 | allow test-only | locked dependency vulnerability audit |
| opis/json-schema | Composer `2.6.0` | Apache-2.0 | allow; WordPress/PHP runtime with licence shipped | Native Draft 2020-12 validation on PHP 7.4+ |
| opis/string | Composer `2.1.0` (transitive) | Apache-2.0 | allow; WordPress/PHP runtime with licence shipped | Unicode/string support |
| opis/uri | Composer `1.1.0` (transitive) | Apache-2.0 | allow; WordPress/PHP runtime with licence shipped | Schema identifier and reference resolution |
| TypeScript | npm `5.9.2` | Apache-2.0 | allow; build/test-only | Contract declaration typecheck |
| yaml | npm `2.9.0` | ISC | allow; test-only | OpenAPI parse test |
| text-watermark-remover | `cyzanfar/text-watermark-remover@fd620a9` | MIT | hold for code review | assurance-contract reference only |
| watermarks-remover | `guillaumemeyer/watermarks-remover@4a0fbc3` | MIT | hold | research/adapter reference |
| Google SynthID Text | `google-deepmind/synthid-text@addb4a1` | Apache-2.0 | hold | controlled known-key research fixtures |
| MarkLLM | `THU-BPM/MarkLLM@c45ddc4` | Apache-2.0 | hold | research fixtures only |
| avoid-ai-writing | `conorbronsdon/avoid-ai-writing@40328bd` | MIT | hold | clean-room/rule review before reuse |
| C2PA JS (source snapshot) | `contentauth/c2pa-js@9be486f` | MIT | hold | reference snapshot only; superseded in the shipped site by the published package below |
| @contentauth/c2pa-web | npm `0.14.3` (declared `^0.14.3`) | MIT (`node_modules/@contentauth/c2pa-web/LICENSE`) | allow; **live** in the deployed checker | C2PA provenance reading for images and PDFs, local-only, with trust-list checking disabled and disclosed |
| onnxruntime-web | npm `1.29.0` (declared `^1.29.0`) | MIT, declared in the installed `node_modules/onnxruntime-web/package.json`; the package ships no licence file of its own | allow; **live** in the deployed checker | Runs the cycle-2 int8 ONNX model in the visitor's browser |
| `tier3-cycle2-e5small-int8-perchannel.onnx` | Opace-trained artefact, 34.3 MB, cycle-2 run of 28 August 2026 | Opace-owned weights; the base checkpoint's licence is not recorded in this repository — confirmed 29 August 2026: MIT | allow; **distributed** — fetched by the browser from the live site on explicit consent | The shipped AI-detection model |
| intfloat/e5-small (base checkpoint) | Hugging Face `intfloat/e5-small`, 33.36M parameters, recorded as `base_model` in `services/local-engine/research/models/tier3-cycle2-config.json` | not recorded in this repository — confirmed 29 August 2026: MIT | fine-tuned and shipped inside the artefact above | Encoder the cycle-2 detector was fine-tuned from |
| Binoculars | `ahans30/Binoculars@c8ae2f9` | BSD-3-Clause code | hold | model terms/runtime unapproved |
| Fast-DetectGPT | `baoguangsheng/fast-detect-gpt@971b052` | MIT code | hold | model terms/runtime unapproved |
| RADAR | `IBM/RADAR@3a9acf6` | Apache-2.0 code | hold | model terms/runtime unapproved |
| ai-detector-bench | `sv-pro/ai-detector-bench@46560cb` | MIT | hold | adapter/test patterns |
| BIRA | `ml-postech/Bias-Inversion-Rewriting-Attack@6f62ecc` | Apache-2.0 | hold | research profile only |
| DIPPER | `martiansideofthemoon/ai-detection-paraphrases@95f3e2c` | Apache-2.0 code | hold | 11B model terms/compute unapproved |
| SIRA / MGT-Eval | inspected snapshots | no actual reusable licence confirmed | reject copying | evidence only |
| Pangram/Copyleaks/Originality/GPTZero/Turnitin | proprietary services | provider terms | reject as dependency | future authorised BYOK calls only |
| onematrix/tracing-sdk | Composer `1.1.0` | MIT declared in Composer metadata | reject | JCS class is coupled to outbound cURL/RPC transport code and unnecessary DOM/cURL requirements |
| root23/php-json-canonicalization | Composer `1.0.1` | package registry reports no licence for latest release | reject | requires PHP 8.0+, outside the PHP 7.4 contract |
| aywan/php-json-canonicalization | GitHub snapshot, one 2021 commit | Apache-2.0 | reject | PHP 7.4-compatible but not maintained enough for the runtime dependency boundary |

No source file from the read-only snapshot tree is present in this repository.

PHP RFC 8785 canonicalisation is a small project-local implementation under the repository's GPL-2.0-or-later licence. It has no transport, telemetry or network dependency and is verified against the three shared vectors plus ECMAScript number-boundary and object/array distinction assertions.

## Training-corpus sources

The corpora themselves are not distributed. Their licences are recorded because the model trained
on them is distributed to every visitor of the live checker. Licences are transcribed exactly as
stated in [`cycle2-corpus/MANIFEST.md`](../../services/local-engine/research/cycle2-corpus/MANIFEST.md).

| Source | Licence as recorded in the manifest | Position |
|---|---|---|
| `elisabeth-pl-pl/GRADTEX` | CC BY 4.0 | included; the `fiction` and `conversations` domains are excluded as the wrong register, and rows from 2026 frontier generators are re-split by content hash |
| `HAT-Baselines/HAT-Bench` | Apache-2.0 | included; supplies the progressively AI-edited essay trajectories |
| `realbenpope/PERSUADE_manageable` (PERSUADE 2.0) | MIT for the mirror; upstream PERSUADE 2.0, The Learning Agency Lab, CC BY 4.0. Both are recorded because they differ | included; only `persuade_full_text.csv` is used |
| `allenai/c4 (en)` | ODC-BY 1.0 | included; the April 2019 Common Crawl snapshot, so every document predates ChatGPT by construction |
| `anyangsong/MAGA` | MIT | included; read from the two validation shards only, and only the human Reddit rows are kept |
| `mild-rgb/aita-human-vs-ai` | Apache-2.0 | included; only the AI half is usable, because the human half is redacted upstream |
| Opace OpenRouter generation run | Owner-generated, unrestricted internal use | included; ours to publish |
| `tests/battery/human-corpus-v1.json`, `human-corpus-v2.json` | Owner-curated (Opace) | pinned to the test split; the manifest forbids training use and the training run honoured that |
| wikiHow, as an independent source | CC BY-NC-SA 3.0 | rejected: the non-commercial clause is incompatible with a commercial plugin. How-to text enters only through the datasets above, under their own licences, and that inherited position is itself worth a legal read before shipping |
| `introvoyz041/PERSUADE_corpus_2.0` | MIT | not used: the mirror contains only scoring-rubric PDFs and no essay text |

Two licence questions remain open and must be answered before public release: the licence and
acceptable-use terms of the `intfloat/e5-small` base checkpoint, which are not recorded anywhere in
this repository, and the inherited position of the wikiHow-derived rows that reach the corpus
through MAGE/GRADTEX and MAGA. A model card has not been published.
