# AI Content Integrity: owner brief and implementation-to-research traceability

Date: 27 August 2026  
State: current local audit; no publication, deployment or submission is implied

## 1. Plain-English conclusion

The same distinction applies to the website checker, WordPress plugin, Chrome extension, Astro integration, npm packages, Node CLI and Python service. They are different delivery surfaces over a common Opace-written, deterministic, model-free foundation.

The broad open-source and academic research was valuable, but most of it has **not** been integrated as executable detector or watermark-removal code. It mainly shaped the architecture, status vocabulary, safety boundaries, adapter design, protected-content gates, benchmark plan and the decision to show unavailable methods honestly. The current release does not bundle Binoculars, Fast-DetectGPT, RADAR, SynthID, MarkLLM, BIRA, DIPPER, C2PA, a commercial detector, a rewrite model or an official Anthropic verifier.

In practical terms:

- the cross-platform engineering is substantial;
- the deterministic text inspection is useful but deliberately narrow;
- the current “AI detection” intelligence is basic and must not be sold as authorship detection;
- production Claude/SynthID watermark verification is absent because no authorised official verifier has been integrated;
- the benchmark machinery exists, but the current 600-document corpus is synthetic mechanics data, not evidence that Opace outperforms detectors or humanisers.

## 2. Reconstructed owner brief

This is the consolidated brief derived from the original supplied material, the programme documents and the owner's review comments throughout the task.

### 2.1 Research and truthfulness

1. Investigate the Anthropic watermark claim and the viral `watermarks-remover` project while the subject is current.
2. Review a wide range of open-source watermark, provenance, AI-writing, detector, humaniser and benchmark projects; record exact repository, licence, commit and test evidence.
3. Separate provider facts, repository claims, academic evidence, vendor claims and Opace inference.
4. Never describe invisible-character cleanup, C2PA metadata, a style classifier or a public known-key watermark experiment as proof that Anthropic's production watermark was removed.
5. Use precise states such as `unsupported`, `not_configured`, `not_run` and `inconclusive`; never invent a passing detector result.
6. Protect facts, figures, names, links, quotations, citations and code before optimising any detector score.

### 2.2 Product family

1. Create one coherent content-integrity family, not unrelated thin tools.
2. Build a useful browser-local Opace website checker and evidence-led research/readiness pages.
3. Build one standalone WordPress plugin that remains useful without AI Hub, AI-Scribe, a paid provider or an Opace service.
4. Build one Chrome-first extension, one Astro integration, shared npm packages, a Node CLI and an optional secure local Python service.
5. Plan, but do not silently add, future AI-Scribe and AI Hub integrations.
6. Create reproducible benchmark/Index machinery and an agency-audit route, but publish comparative claims only after real corpus, provider, human and statistical gates pass.
7. Make each page/product perform a clear job and link to its real code, package, listing or next action when those destinations are authorised and live.

### 2.3 UX, design and review

1. Follow the established Opace tools design system and the Preferred Sources launch lessons rather than inventing a disconnected microsite style.
2. Use consistent dark heroes, category hubs, breadcrumbs, content widths, spacing, cards, imagery and dark-to-light section rhythm across Content Integrity and Preferred Sources tool pages.
3. Keep images meaningful and integrated with the relevant content; avoid pasted full-page screenshots, decorative banners and inconsistent product marks.
4. Prove real desktop, tablet, 375 px, 320 px/400%-equivalent, keyboard, focus, contrast, screen-reader and no-overflow behaviour.
5. Provide one loopback publication-review desk that can render both Content Integrity and Preferred Sources sources dynamically for visual comparison.

### 2.4 SEO, documentation and publication

1. Use meaningful search-led names and URLs while retaining honest limitations.
2. Prepare complete GitHub, npm, PyPI, Astro, WordPress.org and Chrome Web Store README/listing surfaces with accurate screenshots, links, privacy and support copy.
3. Apply the `plugin-repo-seo` workflow to all release-facing documentation and preserve a competitor matrix, keyword map, topic validation and internal-link graph.
4. Keep local candidate, exact package, repository commit, publication, submission, approval, deployment and verified-live states separate.
5. Do not publish, push, deploy, submit, contact third parties or alter the current AI-Scribe/AI Hub release lanes without explicit owner approval.

## 3. Status legend

| Mark | Meaning |
|---|---|
| **Built** | Executable local implementation exists and has current evidence. |
| **Partial** | Some real capability exists, but the wider promised job is unavailable. |
| **Research influence** | Concepts/tests informed Opace design; upstream runtime code is not distributed. |
| **Research fixture planned** | A controlled adapter/fixture is specified, but is not in the current package. |
| **Held** | Blocked on licence, model, corpus, provider, compute, security or owner approval. |
| **Unsupported** | The method is intentionally represented as unavailable rather than inferred. |
| **Future** | Specified but no current product implementation exists. |

## 4. Built surface matrix

| Surface/component | Current state | What genuinely works now | How it was built | Research/open-source influence | What it does **not** currently contain |
|---|---|---|---|---|---|
| Shared contracts and fixtures | **Built** | Canonical schemas, statuses, privacy routes, jobs, protected spans, methods, gates and hash-only receipts across TypeScript/PHP/Python | Opace-authored schemas and fixtures; RFC 8785 canonicalisation uses reviewed runtime dependencies/project code | `text-watermark-remover` influenced named-method assurance and independent-verifier requirements; `ai-detector-bench` influenced refusal/failure-state thinking | No detector, model, provider or watermark algorithm |
| TypeScript deterministic core | **Built** | Visible-text projection; seven named invisible/control cases plus bidi review; limited mixed-script homoglyph checks; protected code/URL/email/citation/quote/currency/date/time/unit/number spans; five stock phrases, repeated openings and transition-density hints; safe-fix preview; diff/gates; receipts | Opace-written implementation in `implementation/packages/core` | `avoid-ai-writing` informed explainable style-lint direction; viral/reference projects informed Unicode inspection and safe candidate plumbing | No trained AI classifier, semantic model, C2PA reader, statistical watermark detector or general humaniser |
| Browser adapter | **Built** | DOM visible-text projection and module Worker client, cancellation and bounded browser operation | Thin Opace adapter over contracts/core | Preferred Sources demonstrated thin adapters over one core; browser privacy patterns informed zero-egress design | Does not read a page or render UI by itself; no provider/network/model |
| Opace website centre (11 routes) | **Built locally** | Product/category pages, local checker, readiness/methodology/research copy, WordPress/Astro/Chrome/CLI/privacy/support pages, uploads for `.txt`/`.md`/`.html`, local receipts and reviewed responsive UI | Existing Opace Astro design system plus the shared browser/core packages | Preferred Sources launch architecture/design/SEO lessons; research supplies limitation and methodology copy | Only the checker runs analysis. Information pages do not add detector intelligence; all production URLs remain undeployed/404 |
| Website checker | **Built, narrow** | Paste/example/file input; deterministic Unicode/homoglyph/style checks; protected-span extraction; safe fixes; Worker at 50,000 characters; hash-only receipt; no content egress/storage by default | Opace UI over packaged browser Worker/core | Open-source research guided check categories and honest method rows | No local detector ensemble; no paid detector; no C2PA; no rewrite model; Anthropic is `unsupported`; provenance and unavailable local signals are not run |
| Claude Watermark Readiness Lab/research | **Partial** | Explains public research versus production verification and renders explicit method availability | Opace-authored static/reproducibility content and frozen placeholder fixtures | Anthropic/Google facts; SynthID, MarkLLM, BIRA/SIRA and bypass research informed the experiment design | Current public known-key watermark runner is not shipped; it cannot test Anthropic production output |
| WordPress plugin 1.0.4 | **Built locally** | Local deterministic inspection, protected content, safe-fix preview, Block/Classic working copies, REST ownership/idempotency, hash-only receipts, lifecycle/storage/privacy/a11y workflows | Opace PHP parity implementation plus bundled browser-safe JS/contracts | Same assurance/Unicode/protected-content research; WordPress market review shaped listing and editor UX | No generated rewrite route, local detector ensemble, provider call, C2PA reader or official Anthropic verifier; unavailable methods remain explicit |
| Chrome extension 1.0.0 | **Built locally** | Explicit paste/selection/visible-article capture; packaged Worker/core checks; protected-span review; safe-character candidate; copy-only comparison; hash-only export; no host permissions/telemetry | Opace MV3 extension over the frozen core/browser Worker | Market/store research shaped minimal permissions, user-action disclosure and listing design | No continuous scanning, page write-back, loopback pairing, provider, model or real AI detector; Edge/Firefox/Safari are not built |
| Astro integration 0.1.0 | **Built locally, report-only** | One Dev Toolbar integration with six evidence views, static/server/hybrid extraction parity, build reports, safe-fix preview/export and hash-only receipts | Opace integration over bundled contracts/core/browser packages | Existing Astro Visual Editor conventions informed toolbar UX; shared contracts prevent a separate engine | Does not fail builds in 0.1.0, change source, call local service/provider, run models or publish an Index |
| npm contracts/core/browser/client/CLI | **Built locally** | Installable dependency-closed packages; offline inspect/protect/compare/receipt; typed loopback client; fail-closed envelopes and command behaviour | Opace-authored packages | Clean adapter seams and assurance/failure concepts from researched tools | No bundled detectors/models/provider SDKs/public watermark fixtures; unavailable model commands fail explicitly |
| Python CLI/local engine 0.1.0 | **Built, model-free control plane** | Offline deterministic commands; authenticated loopback health/capabilities/jobs/cancellation; loopback/Host/Origin/auth/size/concurrency/privacy hardening | Opace Python parity engine and service | Planned to host Binoculars/Fast-DetectGPT/RADAR/Ollama/DIPPER/BIRA later; current service architecture reserves those seams | No model, detector, rewrite engine, watermark lab, public server or provider is bundled; Docker distribution remains held |
| BENCH-10 | **Built mechanics only** | Schema validation, frozen manifests, deterministic run/resume/aggregate/reproduce pipeline, budgets, failure states and statistics over 600 Opace-authored synthetic documents/1,800 records | Opace-authored benchmark machinery | HumanizerBench, RAID, ai-detector-bench and academic studies informed schema, failure states, false-positive and fidelity requirements | No real detector/provider calls, real human/AI corpus, human panel, held-out comparative claim, public Index or DOI release |
| Publication-review desk | **Built local QA utility** | Dynamically renders 21 Content Integrity views and 31 Preferred Sources views on one loopback desk with guarded assets/live refresh | Opace internal tooling; excluded from public packages | Preferred Sources acts as a comparison suite | It is not a customer product, directory listing or deployed page |
| AI-Scribe Editorial Rewrite Lab | **Future only** | Detailed integration, ownership, endpoint, state and UX specification | No current product code changed | Humaniser research drives multi-candidate/fidelity-first design | No current AI-Scribe integration; current Humanizer remains prompt-only and untouched |
| AI Hub add-on/provider bridge | **Future only** | Detailed catalogue, capability and provider-routing specification | No current product code changed | Preferred Sources/Hub lessons informed thin discovery and centralised credentials | No Hub add-on card, provider bridge or credential use exists in this programme |
| Integrity Index and agency audit | **Future/held** | Methodology, benchmark schema and service concept | BENCH mechanics exist; public product does not | HumanizerBench, RAID and detector studies shaped the plan | No defensible ranking, client service launch or public monthly dataset yet |
| Edge, Firefox and Safari extensions | **Future only** | Porting and separate store gates specified | No packages/listings | Chrome-first strategy only | No supported non-Chrome extension exists |

## 5. Research-to-implementation matrix

| Researched project/solution | Snapshot/licence | Separate feature studied | What Opace actually used now | Where it appears | What remains held or excluded |
|---|---|---|---|---|---|
| `cyzanfar/text-watermark-remover` | `fd620a9`, MIT | Named detectors, verifier separation, assurance states, quality gates | **Research influence only**: named method/version, explicit unsupported states and quality-before-score architecture | Contracts, method rows, gates, receipts, all surfaces | Upstream runtime code is not bundled; no Claude proof adopted |
| `guillaumemeyer/watermarks-remover` | `4a0fbc3`, MIT | Multi-layer file/Unicode scanner, CLI and rewrite plumbing, C2PA exploration | **Research influence only**: explicit-carrier inspection, candidate plumbing and news/market opportunity | Core Unicode checks, CLI shape, research pages | Placeholder Claude detector rejected; file/C2PA runtime not integrated |
| `conorbronsdon/avoid-ai-writing` | `40328bd`, MIT | Explainable deterministic writing-pattern lint | **Conceptual influence only**; current small English rule set is Opace-written | Core, website, WP, Chrome, Astro, CLI | Upstream package/code is held and not distributed; current five-phrase rules are much narrower |
| Google DeepMind `synthid-text` | `addb4a1`, Apache-2.0 | Known-key statistical watermark generation/detection | Research facts and planned controlled fixture contract | Readiness/research/specs | No current runner/model/key; never treated as Anthropic production verification |
| `THU-BPM/MarkLLM` | `c45ddc4`, Apache-2.0 | Multiple public watermark algorithms/evaluation | Planned research adapter and methodology influence | Local research profile/benchmark specification | Not integrated or distributed |
| `Bias-Inversion-Rewriting-Attack` (BIRA) | `6f62ecc`, Apache-2.0 | Attack/re-detect harness across public watermark schemes | Planned research baseline | Benchmark/local research specifications | No GPU/model run or current package integration |
| SIRA | `eeae0b5`, licence file missing | Semantic-invariant rewrite attack | Evidence/reference only | Research comparison | Production reuse rejected until licence is clarified |
| SynthID-Text-Bypass | `a42d285`, MIT | MLM token-substitution experiment | Research comparison only | Fact-check/readiness design | Not integrated; weak transfer evidence for Claude |
| DIPPER | `95f3e2c`, Apache-2.0 code | Discourse paraphrasing and controllable diversity | Future optional research/rewrite baseline | Local-engine and benchmark plans | 11B model/compute/licence/fidelity review held; not bundled |
| Binoculars | `c8ae2f9`, BSD-3-Clause code | Zero-shot local AI-text signal | Adapter/capability design only | Local engine specification | Model terms, resources, corpus thresholds and false-positive evidence unapproved |
| Fast-DetectGPT | `971b052`, MIT code | Probability-curvature local signal | Adapter/capability design only | Local engine specification | Model runtime, thresholds and domain robustness unapproved |
| IBM RADAR | `3a9acf6`, Apache-2.0 code | Adversarially trained detector research | Adapter/capability design only | Local engine specification | Model coverage/runtime and contemporary benchmark unapproved |
| `sv-pro/ai-detector-bench` | `46560cb`, MIT | Adapter normalisation, refusal states, attacks and reproducible evaluation | Research/test architecture influence; its lightweight suite was evaluated | Contracts, BENCH design, failure states | Upstream runtime is not a production dependency; no detector suite bundled |
| C2PA JS | `9be486f`, MIT | Official-compatible file provenance reading | Contract and future route design only | Provenance result schema/specs | Current web/WP/Chrome/npm/Python packages do not contain a C2PA reader |
| HumanizerBench | `e304f69`, MIT code/CC BY data | Multi-detector scoring, meaning/readability metrics and reproducible result verification | Benchmark/result-schema and market evidence influence | Research report and BENCH plan | Its private runner and small 11-prompt cycle are not Opace evidence; no data bundled |
| RAID | `ebd2cd8`, reported MIT pending exact data review | Large real-world AI-detection benchmark | Corpus/methodology reference only | G7 benchmark plan | Dataset not retained or distributed; exact data terms and full run held |
| `opensyndicate/unsynth` | `7524410`, MIT | Adapter seams, safety and deterministic rewrite testing | Architectural influence only | Adapter/rewrite specifications | Its keyless detector is not used or relabelled as watermark evidence |
| `ssamba1/untell` | `b054e67`, MIT | Mockable commercial detector adapter concepts | Architectural influence only | Provider adapter specifications | No live endpoint/SDK/provider call; optional dependency prevented full local tests |
| Pangram | Proprietary service | Strongest current independent classifier evidence in reviewed studies | Priority future challenge-set/provider target only | Competitor study and benchmark plan | No key, call, SDK, score or claim in current product |
| Copyleaks, Originality, GPTZero | Proprietary services | Common market detectors with different methods/thresholds | Future direct BYOK targets only; names inform research and honest comparison | Competitor research/specs | No simulated or live results in the current product |
| Turnitin | Proprietary/institutional | Institutional detector and paraphrase category | Authorised challenge-set target only | Competitor research/benchmark plan | No access or result; must never be simulated |
| Anthropic official verifier | Not publicly integrated in this programme | Production Claude watermark verification | Stable method ID and explicit `unsupported` state | Every product surface | No call, score, threshold or pass until an authorised official interface exists |
| Current AI-Scribe Humanizer | Existing Opace prompt mode | One-pass rhythm/language variation | Inspected as a gap/baseline only | Future Scribe integration plan | Not used by current Content Integrity products; no named detector or fidelity receipt |
| Google Preferred Sources programme | Separate Opace project | One core/thin adapters, honest release states, launch SEO, shared design, preview tooling | **Process/design influence**, not detector code | Architecture, site hierarchy, docs, QA and publication preview | It is a separate product and does not add content-analysis capability |

## 6. Feature coverage by current surface

Legend: **Yes** = real current implementation; **Part** = supporting mechanics/UI without the full method; **State** = explicit unavailable state only; **No** = absent.

| Feature | Web checker | WordPress | Chrome | Astro | Node CLI | Python service | BENCH |
|---|---:|---:|---:|---:|---:|---:|---:|
| Invisible/control Unicode inspection | Yes | Yes | Yes | Yes | Yes | Yes | Fixture |
| Limited mixed-script homoglyph review | Yes | Yes | Yes | Yes | Yes | Yes | Fixture |
| HTML/Markdown visible-text projection | Yes | Part | Yes | Yes | Core command | Core command | Fixture |
| Explainable writing-pattern hints | Yes | Yes | Yes | Yes | Yes | Yes | Fixture |
| Protected facts/links/quotes/code extraction | Yes | Yes | Yes | Yes | Yes | Yes | Fixture |
| Deterministic diff and exact protected-span gates | Part | Part | Yes | Part/report | Yes | Yes | Tested mechanics |
| Hash-only canonical receipts | Yes | Yes | Yes | Yes | Yes | Yes | Result hashes |
| C2PA/content-credentials reading | No | No | No | No | No | No | No |
| Binoculars | No | No | No | No | No | No | No |
| Fast-DetectGPT | No | No | No | No | No | No | No |
| IBM RADAR | No | No | No | No | No | No | No |
| Pangram/Copyleaks/Originality/GPTZero/Turnitin | No | No | No | No | No | No | No |
| Public SynthID/MarkLLM known-key experiment | No | No | No | No | No | No | Schema/placeholder only |
| Official Anthropic watermark verification | State | State | State | State | State | State | State |
| Semantic entailment/model-backed fidelity | State | State | State | State | State | State | Mechanics only |
| Local/LLM candidate rewrite generation | No | No | No | No | No | No | No |
| Real human/AI corpus and live detector benchmark | No | No | No | No | No | No | No |

## 7. How advanced is the current system?

These are scope assessments, not test scores or marketing claims.

| Area | Assessment | Why |
|---|---:|---|
| Cross-platform engineering and release discipline | **8/10** | One contract across browser, WordPress, Astro, Node and Python; deterministic packages, exact receipts, lifecycle/security/a11y/package evidence and honest state separation are strong. |
| Deterministic content-integrity utility | **6/10** | Useful Unicode, protected-content, diff and receipt mechanics, but the language-pattern rules and homoglyph map are intentionally small. |
| AI-authorship detection | **1/10** | No trained detector runs. Pattern hints are editorial heuristics and are correctly labelled as such. |
| Statistical text-watermark verification | **0/10 in production** | No public known-key runner ships and no official Anthropic verifier is available/integrated. The explicit unsupported seam is good engineering, not detection. |
| Semantic/fact-preserving rewrite intelligence | **2/10** | Deterministic locks/gates exist, but semantic entailment and candidate generation are unconfigured. |
| Benchmark science | **3/10** | The mechanics and statistics pipeline are substantial; the current data are synthetic and no real detector/human study has run. |

## 8. Gap between the researched vision and the present release

The early free-first plan proposed a browser layer plus detector-benchmark patterns, C2PA, protected-content gates and an optional local engine containing selected open detectors and rewrite research. The present 0.1.0 boundary completed the contracts, deterministic browser layer, protected-content mechanics, delivery surfaces, local control plane and benchmark mechanics. It did **not** complete the C2PA adapter, any open detector, public watermark runner, semantic model, Ollama rewrite route, commercial BYOK adapter or real benchmark.

That decision made the current packages safer and testable, but it also means the visible product is not yet the broad, research-powered AI detection system a reader might infer from the original landscape review. Product names and copy should therefore lead with **content verification/integrity checks**, not “AI detector” or “watermark checker”, until at least one named detector and one controlled watermark method pass their separate evidence gates.

## 9. Recommended next technical phase

1. Choose one local detector candidate only after licence/model/resource review; benchmark Binoculars and Fast-DetectGPT first against the agreed corpus rather than bundling both immediately.
2. Add the official C2PA JavaScript adapter as a separate file-provenance method, never as text-watermark evidence.
3. Implement one controlled SynthID/MarkLLM known-key research fixture in the readiness lab and prove wrong-key/attack/length behaviour.
4. Select one semantic fidelity method and prove entity, number, link, quotation and citation preservation before enabling rewrite generation.
5. Add one local Ollama rewrite route behind explicit consent and resource preflight.
6. Freeze a licensed real corpus with human, edited-human, non-native, mixed and current-model AI text; then run local methods and authorised direct providers with fixed budgets.
7. Publish detector/index claims only after independent reproduction, false-positive review and human-quality assessment.

## 10. Source-of-truth documents reviewed

Programme and status:

- `PROJECT.md`, `README.md`, `STATUS.md`
- `implementation/PROJECT.md`, `implementation/README.md`, `implementation/STATUS.md`
- `implementation/docs/RELEASE-STATE.md`, `implementation/docs/TEST-EVIDENCE.md`

Research and evidence:

- `research/OPEN-SOURCE-LANDSCAPE.md`
- `research/FACT-CHECK-AND-CONFIDENCE.md`
- `research/HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md`
- `research/AI-SCRIBE-INTEGRATION.md`
- `research/WORDPRESS-ASTRO-MARKET.md`
- `research/GOOGLE-PREFERRED-SOURCES-LESSONS.md`
- `evidence/SNAPSHOT-AND-TEST-LOG.md`
- `evidence/HUMANIZERBENCH-AUGUST-2026.md`

Plans and specifications:

- `strategy/FREE-FIRST-COMPONENT-PLAN.md`
- `strategy/MASTER-PRODUCT-PORTFOLIO-AND-EXECUTION-ORDER.md`
- `strategy/OPACE-BENCHMARK-SPECIFICATION.md`
- `strategy/PRODUCT-OPTIONS-AND-ROADMAP.md`
- `strategy/VISIBILITY-BACKLINK-AND-LAUNCH-PLAN.md`
- `specs/00-SHARED-BUILD-BRIEF.md` through `specs/08-IMPLEMENTATION-WORKSTREAMS-AND-DEPENDENCY-MATRIX.md`

Current implementation evidence:

- `implementation/THIRD_PARTY_NOTICES.md`
- `implementation/docs/legal/DEPENDENCY-LEDGER.md`
- package/component READMEs under `implementation/packages/`, `implementation/services/local-engine/`, `implementation/extensions/` and `implementation/wordpress/`
- current BENCH, Astro, Chrome, WordPress, G2/G5 and submission-readiness evidence referenced from the status registers

## 11. Publication boundary

Everything described as built in this report is a local candidate unless a row explicitly says otherwise. The Content Integrity GitHub repository, npm packages, PyPI project, WordPress.org listing, Chrome Web Store listing and all declared production website routes remain unpublished/unavailable. No public action was taken while producing this traceability audit.
