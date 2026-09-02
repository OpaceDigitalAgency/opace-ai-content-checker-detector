# Third-party notices

Opace AI Content Integrity 0.1.0 uses the exact packages below, and the live browser checker at <https://opace.agency/tools/ai/content-verification-integrity/checker/> additionally runs `onnxruntime-web` and `@contentauth/c2pa-web` and serves a model derived from `intfloat/e5-small`. All three are recorded here. No notice implies endorsement by an upstream author. Opace has not modified these third-party packages unless a row says otherwise. Full dependency graphs and package identifiers are recorded in the shipped CycloneDX SBOMs.

Versions for the three live-checker entries are the exact versions installed in `opace-website/astro-latest/node_modules`, read from each package's own `package.json`.

| Component | Author or project | Canonical source | Version | Licence | Purpose |
|---|---|---|---:|---|---|
| `onnxruntime-web` | Microsoft / ONNX Runtime contributors | <https://github.com/Microsoft/onnxruntime> | 1.29.0 | MIT | Runs the shipped int8 classifier in the visitor's browser on the live checker. Its WebAssembly binaries (`ort-wasm-simd-threaded.wasm`, and the asyncify build where WebGPU is available) are served from `public/models/local-signals-v1/ort/`. Unmodified. |
| `onnxruntime-common` | Microsoft / ONNX Runtime contributors | <https://github.com/Microsoft/onnxruntime> | 1.29.0 | MIT | `onnxruntime-web` runtime dependency. Unmodified. |
| `@contentauth/c2pa-web` | Adobe / Content Authenticity Initiative | <https://github.com/contentauth/c2pa-js> | 0.14.3 | MIT (LICENSE file: MIT, © 2025 Adobe) | C2PA content-credential reading in the live checker. Unmodified. |
| `intfloat/e5-small` (fine-tuned, quantised and redistributed as `tier3-cycle2-e5small-int8-perchannel.onnx`) | intfloat | <https://huggingface.co/intfloat/e5-small> | e5-small (33.4M params) | MIT (confirmed from the model card, 29 August 2026) | Base encoder, 33.36M parameters, fine-tuned by Opace in cycle 2 and exported to per-channel int8 ONNX. The 34.3 MB artefact is served from the live site and downloaded to the visitor's browser on explicit consent (modified: fine-tuned and quantised). Full provenance and the outstanding fields are in `MODEL_AND_DATA_PROVENANCE.md`. |
| `canonicalize` | Anders Rundgren / Cyberphone | <https://github.com/cyberphone/json-canonicalization> | 4.0.0 | Apache-2.0 | RFC 8785 canonical JSON. |
| `entities` | Felix Böhm and contributors | <https://github.com/fb55/entities> | 4.5.0 | BSD-2-Clause | Astro server/build HTML entity decoding. |
| `ajv` | Evgeny Poberezkin and contributors | <https://github.com/ajv-validator/ajv> | 8.20.0 | MIT | Runtime JSON Schema validation in the TypeScript client. |
| `ajv-formats` | Evgeny Poberezkin and contributors | <https://github.com/ajv-validator/ajv-formats> | 3.0.1 | MIT | URI and date-time formats for Ajv. |
| `fast-deep-equal` | Evgeny Poberezkin and contributors | <https://github.com/epoberezkin/fast-deep-equal> | 3.1.3 | MIT | Ajv runtime dependency. |
| `fast-uri` | Vincent Le Goff and contributors | <https://github.com/fastify/fast-uri> | 3.1.6 | BSD-3-Clause | Ajv URI support. |
| `json-schema-traverse` | Evgeny Poberezkin and contributors | <https://github.com/epoberezkin/json-schema-traverse> | 1.0.0 | MIT | Ajv schema traversal. |
| `require-from-string` | Vsevolod Strukchinsky | <https://github.com/floatdrop/require-from-string> | 2.0.2 | MIT | Ajv standalone-module support. |
| `jsonschema` | Julian Berman and contributors | <https://github.com/python-jsonschema/jsonschema> | 4.25.1 | MIT | Python Draft 2020-12 validation. |
| `rfc8785` | Trail of Bits | <https://github.com/trailofbits/rfc8785.py> | 0.1.4 | Apache-2.0 | Python RFC 8785 canonicalisation. |
| `opis/json-schema` | Opis Project | <https://github.com/opis/json-schema> | 2.6.0 | Apache-2.0 | WordPress/PHP Draft 2020-12 validation. |
| `opis/string` | Opis Project | <https://github.com/opis/string> | 2.1.0 | Apache-2.0 | Opis Unicode/string support. |
| `opis/uri` | Opis Project | <https://github.com/opis/uri> | 1.1.0 | Apache-2.0 | Opis identifier/reference handling. |
| `avoid-ai-writing` | Conor Bronsdon and contributors | <https://github.com/conorbronsdon/avoid-ai-writing> | snapshot in `source-snapshots/avoid-ai-writing/` | MIT | Writing-pattern rules and stylometric methods adapted to TypeScript in `packages/core/src/patterns/en-signals-v2*.ts` (modified). |
| `watermarks-remover` | Guillaume Meyer and contributors | <https://github.com/guillaumemeyer/watermarks-remover> | snapshot 2026-08 | MIT | Carrier/confusable table data adapted (invisible-character and space-substitute inventories) for the core Unicode inspection; no upstream code is distributed. |
| `avoid-ai-writing` | Conor Bronsdon | <https://github.com/conorbronsdon/avoid-ai-writing> | 3.26.0 | MIT | Carrier/confusable table data adapted (Cyrillic/Greek Latin-lookalike maps) for the core Unicode inspection; no upstream code is distributed. |
| `synthid-text` | Google DeepMind | <https://github.com/google-deepmind/synthid-text> | snapshot `addb4a15` in `source-snapshots/synthid-text-reference/` | Apache-2.0 | SynthID-Text detection mathematics (LCG hashing, g-values, masks, mean/weighted-mean scores) ported to TypeScript in `packages/watermark-lab/src/` (modified: Python/torch to TypeScript port); reference generation path used to produce the known-key demo fixtures. |
| `antislop-sampler` (fiction slop-phrase and promptonym frequency lists) | Sam Paech | <https://github.com/sam-paech/antislop-sampler> | April 2025 data | Apache-2.0 | Frequency-ranked fiction phrase and over-represented name data adapted as regex rules in `packages/core/src/patterns/en-signals-v3-data.ts` (`fiction-slop-phrase`, `fiction-promptonym`); no upstream code is distributed. |
| `slop-forensics` (per-model slop profiles) | Sam Paech | <https://github.com/sam-paech/slop-forensics> | snapshot 2026-08 | MIT | Promptonym/per-model observation data corroborating the fiction-lane rules; no upstream code or profile files are distributed. |
| `SLOP_Detector` (SLOP.yml, penalty.yml) | SicariusSicariiStuff | <https://github.com/SicariusSicariiStuff/SLOP_Detector> | snapshot 2026-08 | Apache-2.0 | Graded penalty-class weighting approach informing the corroboration/tier-B weighting in the 2026.08.3 pack; no upstream lists are distributed verbatim. |
| `slop-gate` | hwajongpark | <https://github.com/hwajongpark/slop-gate> | snapshot 2026-08 | MIT | Promotional-register and buzz-phrase pattern data adapted (`promo-travel`, `buzzword-phrase` and related regexes in `en-signals-v3-data.ts`). |
| `anti-ai-writing` | avectats7 | <https://github.com/avectats7/anti-ai-writing> | snapshot 2026-08 | MIT | Buzz-phrase and weak-verb observation data adapted into the 2026.08.3 phrase rules. |
| `anti-slop` | kjmagnan1s | <https://github.com/kjmagnan1s/anti-slop> | snapshot 2026-08 | MIT | Faux-insight phrase data and the protect-list/context-profile design adapted; no upstream code is distributed. |
| `claude-slop-detector` | aplaceforallmystuff | <https://github.com/aplaceforallmystuff/claude-slop-detector> | snapshot 2026-08 | MIT | Staccato-fragment and tripled-negation observations adapted as structural rules in the 2026.08.3 pack. |
| Wikipedia *Signs of AI writing* guidance | Wikipedia editors | <https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing> | as of 2026-08 | CC BY-SA 4.0 | Editorial guidance independently re-expressed (paraphrase only — no verbatim excerpts) for the artefact-token, legacy-framing and structural rules in the 2026.08.3 pack; attribution given here per licence. |
| Academic findings (Liang et al. ICML 2024; Kobak et al. Science Advances 2025; Juzek & Ward COLING 2025; Reinhart et al. PNAS 2025; Geng & Trotta 2024; Pew Research 2026) | respective authors | cited in `research/AI-TELLS-MEGA-PACK.md` | — | facts/findings (uncopyrightable) | Word-frequency and structural findings used as rule thresholds and lexicon facts in `en-signals-v3-data.ts`; no paper tables are reproduced verbatim. |
| GPT-2 BPE vocabulary (`vocab.json`, `merges.txt`) | OpenAI | <https://github.com/openai/gpt-2> (copied from the Hugging Face `gpt2` model repository) | gpt2 (124M) release | MIT | Byte-level BPE tokeniser assets embedded in `packages/watermark-lab` so pasted text can be tokenised in the browser; tokeniser algorithm adapted from `src/encoder.py` (modified: Python to TypeScript port). SHA-256 checksums recorded in `packages/watermark-lab/README.md`. |

| Project Gutenberg public-domain texts: Austen, *Pride and Prejudice* (1813); Darwin, *On the Origin of Species* (1859); Franklin, *Autobiography* (1791); Twain, *The Innocents Abroad* (1869); Hamilton/Madison/Jay, *The Federalist Papers* (1788); Beeton, *The Book of Household Management* (1861); Smith, *The Wealth of Nations* (1776) | respective authors (all works pre-1929) | <https://www.gutenberg.org> ebooks #1342, #2009, #148, #3176, #1404, #10136, #3300 | plain-text files, fetched 2026-08-28 | public domain (US; pre-1929 publication) | ~50KB human-prose reference corpus embedded in `packages/core/src/patterns/en-signals-v4-corpus.ts` as the conditional-compression prior and lexical-register reference profile for the en-signals 2026.08.5 signals. Per-slice source file, character offset and length are recorded in the module's provenance header; the pre-1929 cutoff also makes the corpus contamination-proof against LLM output. Project Gutenberg's trademark licence applies to the ebook *files*, not the underlying public-domain texts; only the raw public-domain text is redistributed, with no Project Gutenberg header, licence text or trademark included. |

The Python runtime transitive packages `attrs 25.3.0`, `jsonschema-specifications 2025.4.1`, `referencing 0.36.2`, `rpds-py 0.27.0` and `typing-extensions 4.15.0` are unmodified and recorded with their exact licences and package URLs in `services/local-engine/SBOM.cdx.json` and `services/local-engine/THIRD_PARTY_NOTICES.md`.

Verbatim upstream licence files ship inside the relevant npm, Python or Composer distribution trees. The Astro archive includes the `canonicalize` Apache-2.0 and `entities` BSD-2-Clause licence files. The WordPress ZIP includes the Opis licence files. Opace-authored packages are distributed under this repository's MIT licence.

Model weights **are** distributed. The live browser checker serves `tier3-cycle2-e5small-int8-perchannel.onnx`, 34.3 MB, SHA-256 `b0b985cdabdc61ce05fae5568e69911c2e5b49680477f81e5e8f1a48afa30459`, together with its 231,508-byte `vocab.txt`, and the visitor's browser downloads both on explicit consent. Those weights are Opace's cycle-2 fine-tune of `intfloat/e5-small`, which is published under the **MIT licence** (confirmed from <https://huggingface.co/intfloat/e5-small> on 29 August 2026). MIT permits redistribution of modified versions provided the licence and copyright notice travel with them, which is why the fine-tuned derivative may be served to visitors and committed to this repository. The GPT-2 Tier 2 assets listed in the served manifest are gated off and are not fetched.

No research snapshot source, provider implementation, private corpus or customer data is distributed. `tests/battery/human-corpus-v2.json` in particular is a research-evaluation quotation set whose own manifest forbids shipping it in product artefacts; it is not shipped.

Deliberately NOT reused: `AlpinDale/gptslop` (`gptslop.yaml`, `claudeslop.yaml`) is AGPL-3.0 and its lists were not copied — the handful of overlapping observations in the 2026.08.3 pattern pack were reimplemented independently from the underlying publicly documented facts. `jalaalrd/anti-ai-slop-writing` carries no licence and none of its tables were copied. The berenslab `excess_words.csv` (407-word lexicon) is not bundled pending licence-file verification; only a small regex subset derived from the CC-BY Science Advances paper's published findings is used.

---

## Shared report builder font metrics

`shared/report/helvetica-metrics.mjs` carries the glyph advance widths of the PDF Core-14
Helvetica faces so that the dependency-free PDF writer can wrap text by measurement. Those
numbers are the Adobe Font Metrics (AFM) values that every PDF reader is required to know for
the standard fourteen fonts; they were derived programmatically and cross-checked against
`pdf-lib`'s bundled metrics, and no third-party code was copied. No font program is embedded:
the PDFs reference the reader-supplied Helvetica faces only.

## Research methods, corpora and evaluation baselines

Nothing in this section ships as code. It is recorded because the project's stated intent was to
build on existing open work rather than start from scratch, and a notice that lists only the
packages in the bundle under-states how much of that work the project actually stands on. Every
entry names what was taken and how far it travelled. Reading someone's repository is credited as
reading it, not as extending it.

| Project or source | Author | Canonical source | Licence | What was taken, and how far it got |
|---|---|---|---|---|
| **Pangram method** (technical report) | Emmanuel, Bhattacharjee et al., Pangram Labs | <https://arxiv.org/abs/2402.14873> | method published; the service is proprietary | **The single largest debt in this project.** The hard-negative-mining recipe — score a large human pool, find what the classifier wrongly flags, generate machine-written mirrors of those same documents, retrain, repeat — is the training method behind the shipped cycle-2 classifier. It is what moved published-prose AUROC from 0.530 to 0.970. The method was published and was ours to implement. The Pangram service itself is not called, not depended on and makes no claim here. |
| **GLTR** (Giant Language model Test Room) | Gehrmann, Strobelt & Rush | <https://arxiv.org/abs/1906.04043> | no repository or licence recorded in this project — an open gap in our records | The rank-bucket idea and the per-token explanation overlay, reimplemented from the paper in `services/local-engine/research/signal-science/baselines.py` and measured on our own corpus (AUROC 0.724–0.735, 0.0% detection at a 1% false-positive budget). Research only; not shipped. |
| **DivEye** (surprisal-diversity family) | Cheruku et al. | <https://arxiv.org/abs/2509.18880> | **CC BY-NC** — the code must not be consulted for a commercial tool, and was not | The claim that the *diversity* of the surprisal sequence separates the classes better than its *mean*, reimplemented from the paper alone. Measured and **confirmed** on 2026 models its authors could not have tested: diversity moments reach AUROC 0.757–0.766 against 0.715 for mean log-perplexity. Research only; not shipped. |
| **Fast-DetectGPT** | Bao, Zhao, Teng, Yang & Zhang (ICLR 2024) | <https://github.com/baoguangsheng/fast-detect-gpt> | MIT | The sampling-free conditional-probability curvature statistic, reimplemented as one of eleven evaluation baselines and measured with a GPT-2 small observer: AUROC 0.545 against the paper's ~0.93 with far larger scoring models. That is a floor for the browser-deployable form of the method, not a refutation of it. **No upstream code is distributed, none is derived from, and nothing in the product is built on it.** |
| **Binoculars** | Hans, Schwarzschild & Goldstein | <https://github.com/ahans30/Binoculars> | BSD-3-Clause | The observer/performer cross-perplexity design was read. **Not implemented**: it needs two different models and only one was available offline. A degenerate same-model proxy was measured at AUROC 0.502 and is explicitly not Binoculars' score. Its published 79% at a 5% false-positive rate on RAID stands unchallenged by anything here. |
| **RAID** benchmark | Dugan et al. | <https://arxiv.org/abs/2405.07940> | see upstream | Recorded remotely as the reference benchmark for the published detector results quoted above. No data used. |
| **RADAR** | IBM Research | <https://github.com/IBM/RADAR> | Apache-2.0 | Snapshotted and read during the detector survey. Model terms and runtime were never approved; **not run, not used, nothing derived**. |
| **DIPPER** | Krishna, Song, Karpinska, Wieting & Iyyer | <https://github.com/martiansideofthemoon/ai-detection-paraphrases> | Apache-2.0 | Snapshotted and read as the reference paraphrase attack. The 11B model's compute and terms were never approved; **not run, not used, nothing derived**. |
| **ai-detector-bench** | sv-pro | <https://github.com/sv-pro/ai-detector-bench> | MIT | Adapter and test patterns read during the survey; **nothing copied or derived**. |
| **BIRA** (Bias-Inversion Rewriting Attack) | ML-POSTECH | <https://github.com/ml-postech/Bias-Inversion-Rewriting-Attack> | Apache-2.0 | Read as a research profile of rewriting attacks; **nothing copied or derived**. |
| **SIRA / MGT-Eval** | respective authors | inspected snapshots; no reusable licence confirmed | unclear | Read as evidence during the survey. Marked *reject copying* in the dependency ledger for exactly that reason; **nothing copied or derived**. |
| **HumanizerBench** | respective authors | published benchmark data | published results | The August per-detector figures were read for the competitor study, with their reproducibility and ownership limitations recorded. **No data, code or method is used in the product.** |
| **MarkLLM** | THU-BPM | <https://github.com/THU-BPM/MarkLLM> | Apache-2.0 | Snapshotted for watermark research fixtures only; not distributed, not in the product. |
| **text-watermark-remover** | cyzanfar | <https://github.com/cyzanfar/text-watermark-remover> | MIT | Read as an assurance-contract reference during the survey; nothing copied. |

### Training and evaluation corpora

The corpora are not distributed. Their licences are recorded because the model trained on them
**is** distributed — every visitor who consents downloads it. Licences are transcribed from
`services/local-engine/research/cycle2-corpus/MANIFEST.md`.

| Corpus | Source | Licence | Used for |
|---|---|---|---|
| GRADTEX | <https://huggingface.co/datasets/elisabeth-pl-pl/GRADTEX> | CC BY 4.0 | Cycle-2 training. The `fiction` and `conversations` domains were excluded as the wrong register. |
| HAT-Bench | <https://huggingface.co/datasets/HAT-Baselines/HAT-Bench> | Apache-2.0 | The progressively AI-edited essay trajectories, which is how people actually use a model on their own prose. |
| PERSUADE 2.0 | <https://huggingface.co/datasets/realbenpope/PERSUADE_manageable> (mirror, MIT); upstream PERSUADE 2.0, The Learning Agency Lab | CC BY 4.0 upstream; MIT for the mirror. Both recorded because they differ | Human student essays, training and held-out evaluation. |
| C4 (en) | <https://huggingface.co/datasets/allenai/c4> | ODC-BY 1.0 | Human web prose. The April 2019 Common Crawl snapshot, so every document predates ChatGPT by construction. |
| MAGA | <https://huggingface.co/datasets/anyangsong/MAGA> | MIT | Human Reddit rows from the two validation shards. |
| aita-human-vs-ai | <https://huggingface.co/datasets/mild-rgb/aita-human-vs-ai> | Apache-2.0 | The AI half only; the human half is redacted upstream. |
| Europe PMC open access | <https://europepmc.org> | open-access licences per article | Held-out human academic prose. |
| GOV.UK | <https://www.gov.uk> | Open Government Licence 3.0 | Held-out human public-sector prose. |
| Congressional Research Service reports | <https://crsreports.congress.gov> | US government work, public domain | Held-out human research summaries. |
| Global Voices | <https://globalvoices.org> | CC BY 3.0 | Held-out human long-form journalism. |
| Mongabay | <https://news.mongabay.com> | CC BY-ND 4.0 for reprinted articles | Held-out human long-form journalism. |
| SEC EDGAR 10-K MD&A | <https://www.sec.gov/edgar> | US government filings, public domain | Held-out human corporate reporting. |
| Opace OpenRouter generation run | this project | owner-generated, ours to publish | 4,016 current-model articles across 21 models and 10 providers. |

`crsreports.congress.gov`, `news.mongabay.com` and `www.sec.gov` return HTTP 403 to a scripted
request. Each was confirmed reachable in a browser on 29 August 2026; the 403 is bot filtering,
not a dead link.

### Cloned, read, and deliberately not used

Several large detector repositories were cloned during the research phase and read as
background. **None of them was used, extended or derived from.** The shipped product contains no
line, table, weight or design taken from any of them, and a search of every shipped package for
their names returns nothing:

`fast-detect-gpt`, `Binoculars`, `RADAR`, `DIPPER`, `ai-detector-bench`, `BIRA`, `SIRA / MGT-Eval`,
`MarkLLM`, `text-watermark-remover`, and the `HumanizerBench` published data.

Three of them had a *published method* reimplemented from the paper as an evaluation baseline in
`services/local-engine/research/signal-science/` — Fast-DetectGPT's curvature statistic, GLTR's
rank buckets, and DivEye's surprisal-diversity moments. That is measurement, not derivation:
those baselines live in the research tree, none is in the product, and each is credited above
with what it scored.

### Deliberately not reused

- `AlpinDale/gptslop` (<https://github.com/AlpinDale/gptslop>) is AGPL-3.0. Its lists were not copied; the handful of overlapping observations in the 2026.08.3 pattern pack were reimplemented independently from the underlying publicly documented facts.
- `jalaalrd/anti-ai-slop-writing` carries no licence, so none of its tables were copied.
- The berenslab `excess_words.csv` 407-word lexicon is not bundled pending licence-file verification. Only a small regex subset derived from the CC-BY *Science Advances* paper's published findings is used.
- wikiHow was rejected as an independent corpus source: CC BY-NC-SA 3.0 is incompatible with a commercial plugin.
