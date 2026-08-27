# Third-party notices

Opace AI Content Integrity 0.1.0 uses the exact packages below. No notice implies endorsement by an upstream author. Opace has not modified these third-party packages unless a row says otherwise. Full dependency graphs and package identifiers are recorded in the shipped CycloneDX SBOMs.

| Component | Author or project | Canonical source | Version | Licence | Purpose |
|---|---|---|---:|---|---|
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

The Python runtime transitive packages `attrs 25.3.0`, `jsonschema-specifications 2025.4.1`, `referencing 0.36.2`, `rpds-py 0.27.0` and `typing-extensions 4.15.0` are unmodified and recorded with their exact licences and package URLs in `services/local-engine/SBOM.cdx.json` and `services/local-engine/THIRD_PARTY_NOTICES.md`.

Verbatim upstream licence files ship inside the relevant npm, Python or Composer distribution trees. The Astro archive includes the `canonicalize` Apache-2.0 and `entities` BSD-2-Clause licence files. The WordPress ZIP includes the Opis licence files. Opace-authored packages are distributed under this repository's MIT licence.

No research snapshot source, model weights, provider implementation, private corpus or customer data is distributed.

Deliberately NOT reused: `AlpinDale/gptslop` (`gptslop.yaml`, `claudeslop.yaml`) is AGPL-3.0 and its lists were not copied — the handful of overlapping observations in the 2026.08.3 pattern pack were reimplemented independently from the underlying publicly documented facts. `jalaalrd/anti-ai-slop-writing` carries no licence and none of its tables were copied. The berenslab `excess_words.csv` (407-word lexicon) is not bundled pending licence-file verification; only a small regex subset derived from the CC-BY Science Advances paper's published findings is used.
