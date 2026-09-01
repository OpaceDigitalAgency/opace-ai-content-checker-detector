# Capability register — Opace AI Content Integrity

**Current at 1 September 2026.** This register describes the Cycle-5 product and the exact
boundary of each capability. Dated Cycle-1 to Cycle-4 measurements are research history, not
current capability claims.

## 1. Product surfaces and parity boundary

| Surface | Current analysis path | Release state |
|---|---|---|
| Opace web checker | compiled TypeScript deterministic engine plus Cycle-5 server fp32 or browser int8 route | live |
| Chrome extension | compiled TypeScript engine in an MV3 Worker | local publication candidate |
| Astro integration | compiled TypeScript engine in the Dev Toolbar/build-report path | local publication candidate |
| Node CLI/client | compiled TypeScript engine plus optional loopback provider | local publication candidate |
| WordPress Lab | compiled TypeScript engine in the admin Worker | local publication candidate |
| WordPress editor/server quick check | namespaced PHP subset plus orchestration, persistence and receipts | local publication candidate |
| Python loopback service | contract/control plane for local optional adapters | local publication candidate |
| hosted inference service | Python/FastAPI Cycle-5 fp32 model route | live |

The compiled-engine paths are parity-tested. The WordPress PHP quick-check subset is deliberately
narrower: it carries 3 writing rules rather than 116, covers 16 carrier groups rather than 38 and
maps 7 homoglyphs rather than 60. It is not covered by claims of identical findings. The server
fp32 and browser int8 model routes share a model family and flag rule but are different numerical
runtimes and can disagree.

## 2. Three independent result axes

`combined:2026.08.8` publishes three readings and never reduces them to one:

| Axis | Values | Who may set it |
|---|---|---|
| AI reading | `ai_like`, `uncertain`, `human_like`, `not_assessed` | **only** a trained model result |
| text integrity/provenance | `clean`, `attention`, `manipulated` | deterministic character and genuine watermark findings |
| editorial | `none`, `some`, `many` | writing-suggestion rules |

A carrier, homoglyph, watermark mark or writing pattern cannot set or raise the AI reading.
`not_assessed` means no trained-model result exists; it does not mean human.

## 3. Deterministic evidence

### 3.1 Invisible-character forensics

The engine recognises **415 code points across 38 carrier rules**, including:

- Unicode format controls, bidi controls and tag characters;
- BMP and supplementary variation selectors;
- combining grapheme joiner;
- the Unicode space family, line and paragraph separators;
- replacement characters and unpaired surrogates; and
- context exceptions for legitimate emoji, cursive/Indic text, Han/Mongolian variation and
  French typography.

Findings carry exact offsets and a severity/innocent-explanation grade. Safe fixes do not remove
characters inside a detected C2PA text-credential wrapper unless the caller explicitly overrides
the protection.

### 3.2 Homoglyphs

The current table contains **60 Cyrillic/Greek Latin-lookalikes**. A mixed-script token gate avoids
flagging ordinary text written entirely in Cyrillic or Greek.

### 3.3 Protected facts

`extractProtectedSpans` recognises **12 kinds**: currency, number, date, time, unit, URL, email,
quote, code, name, organisation and citation. Protected spans are facts to preserve during edits;
they are not evidence about authorship.

### 3.4 Provenance and C2PA

The web checker reads C2PA Content Credentials from uploaded JPEG, PNG, WebP and PDF files locally
through `@contentauth/c2pa-web`. No-manifest, untrusted and invalid states remain distinct. Trust-
list validation is not claimed.

For pasted text the engine can recognise the C2PA 2.4 A.8 `C2PATXT\0` wrapper far enough to avoid
destroying it. It does not parse or verify the manifest or produce a text-provenance verdict.

### 3.5 Receipts

Receipts use RFC 8785 canonical JSON and SHA-256. They record hashes, method/version identities,
statuses and limitations; content is not retained by default.

## 4. Writing suggestions

The current pack is `en-signals:2026.08.6`:

- 51 v2 categories;
- 55 v3 categories;
- 7 v4 rhythm/stylometric categories; and
- 3 en-gb rules.

That is **113 weighted categories and 116 named rules**. Ninety-five named rules fired on at least
one of the measured AI documents, one is structurally inactive and 20 were dormant in the measured
corpora.

On the 5,558-document long-form corpus, the tier detected 45.1% of AI writing while flagging 24.8%
of human writing. It is therefore presented as editorial feedback on phrasing and structure and
contributes nothing to the AI verdict. The complete per-rule evidence is in
[`RULE-VALIDATION.md`](../services/local-engine/research/rule-validation/RULE-VALIDATION.md).

## 5. Current trained model: Cycle 5

### 5.1 Model and runtime

- identity: `tier3-cycle5-v1` / server registry name `tier3-cycle5-full`;
- base: `intfloat/e5-small`, 33.36M parameters, MIT;
- architecture: 384-dimensional encoder output plus eight z-normalised structural features;
- browser export: per-channel int8 ONNX, 34.3 MB;
- server export: fp32 ONNX, 133.8 MB;
- segmentation: `segments-v3`;
- input contract: `raw-v1`;
- feature contract: `features-v1`;
- scoring: `margin-v1`;
- flag rule: `max(m1, m2 + 0.34) >= 3.570935`; and
- display calibration: temperature 1.0479, which does not control the flag.

### 5.2 Full long-form measurement

The corpus contains 922 AI and 4,636 human documents. It is not wholly independent of Cycle-2
training: 268 AI and 11 human documents overlap a Cycle-2 split. The current results pool those
documents with the independent subset:

| Route | AI flagged | Human false positives |
|---|---:|---:|
| EU server, fp32 | **902/922 (97.8%)** | **46/4,636 (0.99%)** |
| browser, int8/WebAssembly | **900/922 (97.6%)** | **73/4,636 (1.57%)** |

The Cycle-5 evaluation view removes direct Cycle-5 train/calibration overlap and contains 675 AI
and 4,500 human documents. Server fp32 records 658/675 AI flagged and 42/4,500 human false
positives. The view was used to fit the operating point, so it is not an untouched post-fit set.

### 5.3 Independent and difficult slices

| Slice | Result | Limit |
|---|---|---|
| matched topic-bucket AI | 153/176 flagged | first fully topic/family-independent evasion slice |
| structured human partners | 1/418 false positive | matched held-out topics |
| 100-word AI test slice | 43/56 flagged | wide interval; do not quote without denominator |
| human fiction evaluation view | 7/227 false positives | highest-priority creative-writing caveat |
| heavy LLM edit of human originals | 39/137 flagged | rises from Cycle-2's 29/137; a disclosed trade |

Commercial humanisers have not been remeasured against Cycle 5. No claim about their current
escape rate is authorised.

## 6. Hosted inference

The default route runs in `europe-west1` on Cloud Run revision
`opace-detector-00010-4dt`, build `45e00978b10d1df6`, maxScale 1 and concurrency 3.

Current controls include:

- 8,000-word / 100,000-character request limits;
- proof-of-work token, origin and automation gates;
- per-connection request/inference limits;
- 12,000 segment inferences per UTC day;
- request-log exclusion and `retained: nothing` response contract;
- browser-model fallback; and
- an alert-driven kill switch plus separate spend controls.

The kill switch and ten-path zero-body-logging probe passed on the current revision. They must be
repeated after every redeploy.

The optional paced allowance is implemented and tested but disabled. The live flat configuration
makes all 12,000 inferences available immediately. Enabling a 3,000 burst would accrue the
remaining 9,000 at 375 per hour. This changes availability under heavy use, not the package
publication boundary, and cannot raise the daily ceiling.

## 7. Watermark and provenance lab

`@opace/watermark-lab` implements the published SynthID-Text detection mathematics for three
public Opace demonstration keys. It is local, deterministic and makes no network call.

It does **not**:

- detect arbitrary private provider keys;
- confirm whether Gemini or Claude production output carries a watermark;
- provide Anthropic's unavailable official text verifier;
- generate a provider production watermark; or
- turn a detected signal into proof of authorship.

Paraphrase robustness is measured and poor: 0/40 machine-rewritten watermarked passages remained
detectable under the lab's own rule, while 36/36 length-preserving controls did. Translation
round-trips and targeted removal remain unmeasured.

## 8. Planned external verification

Commercial detector adapters are planned as explicit BYOK/consent routes. None is active in the
current product. The controlled same-corpus competitor study is parked for the next phase; until
it is completed, no current superiority claim over named paid detectors is supported.

## 9. Status vocabulary

Every method reports exactly one of: `pass`, `attention`, `fail`, `inconclusive`, `unsupported`,
`not_configured`, `not_run`, `error`. Unsupported, unrun and failed checks are never collapsed into
a pass.

## 10. Known limits

- An AI score is evidence from a statistical model, not proof of authorship.
- Server and browser scores can differ because fp32 and int8/WebAssembly are different runtimes.
- The full headline corpus includes the disclosed Cycle-2 overlaps.
- The Cycle-5 evaluation view was used to fit the operating point.
- Short-text performance is improved but the 100-word AI cell contains only 56 documents.
- Human fiction, health-authority plain English and business reports remain priority hard-negative
  registers; business reports are still data-starved.
- Heavy AI edits of human originals flag more often under Cycle 5; light edits remain clear.
- Commercial humanisers are not measured against Cycle 5.
- The writing rules describe style and structure, not authorship.
- C2PA text wrappers are protected from automatic removal but not verified.
- Provider watermark production keys are unavailable.
- The WordPress PHP quick-check path is a subset, not the full compiled engine.
- Plagiarism checking and internet-scale source matching are out of scope.
- Real flood behaviour and actual spend-cap enforcement have not been exercised.

## 11. Current verification

The current source baseline passes:

- core 140/140;
- G1 14/14;
- G2 24/24 across Chromium, Firefox and WebKit;
- fixture battery 129/129;
- research discovery 119/119 with 556 relative links and none broken; and
- Cycle-5 segmentation, input, features, aggregation and pacing suites.

These are source/model tests, not evidence for a differently dated release archive. Exact-package
publication gates are tracked in [RELEASE-STATE.md](RELEASE-STATE.md) and current totals in
[TEST-EVIDENCE.md](TEST-EVIDENCE.md).

## 12. Attribution and provenance

Opace-authored code is MIT except for the declared WordPress distribution boundary. The full
dependency and source records are in [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md),
[`MODEL_AND_DATA_PROVENANCE.md`](../MODEL_AND_DATA_PROVENANCE.md) and
[`DEPENDENCY-LEDGER.md`](legal/DEPENDENCY-LEDGER.md). `intfloat/e5-small` is MIT; immutable
upstream revision and upstream training provenance remain unrecorded.
