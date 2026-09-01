# Open-source landscape

> **Public research snapshot.** Repository metadata and project activity are dated observations. Use the [current architecture](../docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md), [research index](../docs/RESEARCH-INDEX.md) and current upstream repositories before quoting a present-day fact.

Repository metadata and source were checked on 26 August 2026. Stars are snapshots, not quality scores.

| Project | Snapshot | Licence / activity | Local evidence | Suitable use | Confidence in claimed practical role |
|---|---|---|---|---|---:|
| [watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover) | `4a0fbc3` | MIT; ~18,380 stars; pushed 25 Aug | Full Python suite exited 0; optional system-tool tests skipped | File/Unicode inspection, CLI patterns, C2PA research, candidate rewrite plumbing | 90% for explicit carriers; 20–35% for certified Claude removal |
| [text-watermark-remover](https://github.com/cyzanfar/text-watermark-remover) | `fd620a9` | MIT; pushed 24 Aug | 797 passed, 2 skipped, 1 deselected; the deselected replay test failed because sanitised subprocess PATH could not find `python` | Best assurance-contract design: named detector, independent verifier, quality gates, honest unsupported state | 90% architecture; no current Claude proof |
| [Google SynthID Text](https://github.com/google-deepmind/synthid-text) | `addb4a1` | Apache-2.0; ~1,066 stars | Reference source inspected | Controlled watermark generation/detection and test fixtures | 90–95% with own exact key/configuration |
| [MarkLLM](https://github.com/THU-BPM/MarkLLM) | `c45ddc4` | Apache-2.0; ~1,054 stars | Sparse source snapshot inspected | Research benchmark covering multiple schemes | 85–95% for implemented public schemes |
| [SynthID-Text-Bypass](https://github.com/Zhou-Shilin/SynthID-Text-Bypass) | `a42d285` | MIT; 6 stars | Python compilation passed; model runtime not executed | Research-only MLM substitution experiment | 70–90% on matched research setup; 15–35% Claude transfer |
| [unsynth](https://github.com/opensyndicate/unsynth) | `7524410` | MIT; new project | Full Python suite exited 0 | Detector-adapter seam, safety and deterministic rewrite tests | 80% architecture; its keyless statistical detector is only a heuristic |
| [untell](https://github.com/ssamba1/untell) | `b054e67` | MIT; 17 stars | Source inspected; tests would not collect without optional `torch` | Commercial detector-adapter concepts and mockable contracts | 60–75% after live endpoint/terms validation |
| [avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) | `40328bd` | MIT; ~3,257 stars | `npm test` passed | Deterministic phrase/style linter with strong adoption; good contributor magnet | 90% for pattern linting; under 15% as watermark proof |
| [HumanizerBench](https://github.com/HumanizerBench/humanizerbench) | `e304f69` | Code MIT; data CC BY 4.0; brand restricted | `npm run verify` passed all published cycles; npm audit found one low issue | Directional benchmark schema/data and reproducible score verification | 60–75% directional; August sample is only 11 prompts and runner integrations are private |
| [LLM Detector Evaluation](https://github.com/LeiLiLab/llm-detector-eval) | `3754d80` | No clear reusable licence found | Evidence-only snapshot | Research evidence on detector weaknesses | Use findings; do not copy code without permission |
| [AI Text Detectors](https://github.com/jaeholee-brown/ai-text-detectors) | `3f5ed20` | No clear reusable licence found | Evidence-only snapshot | Evaluation reference | Use findings; do not copy code without permission |
| [C2PA JS](https://github.com/contentauth/c2pa-js) | `9be486f` | MIT; official Content Authenticity Initiative project | Source inspected | Browser and Node manifest reading/validation; Astro-ready | 95% on supported assets |

## What to reuse

- Use the assurance-state design from `text-watermark-remover`: a result is tied to a named detector, independent verification and quality gates.
- Use the official C2PA JS packages for provenance reading and validation.
- Adapt the deterministic writing-pattern rules from `avoid-ai-writing`, retaining attribution and licence notices.
- Use Google SynthID and MarkLLM solely for controlled fixtures and benchmark science.
- Build detector adapters behind a clean interface, using customer-owned keys and provider terms.

## What not to reuse as proof

- Do not expose the viral project's placeholder `ClaudeTextDetector` as a detector.
- Do not describe lexical divergence, stylometry or a keyless score as SynthID verification.
- Do not use unlicensed repository code.
- Do not combine GPL WordPress code into an MIT core without a licence boundary. A browser TypeScript core can be MIT; the WordPress distribution should be GPL-2.0-or-later and include notices for permitted dependencies.

## Benchmark warning

[A 2025 detector evaluation](https://aclanthology.org/2025.findings-naacl.271/) found severe performance loss in realistic settings, including near-zero true-positive performance at stringent false-positive rates for some detectors. Opace's benchmark should therefore report false positives, model/version, threshold, date, corpus and meaning retention instead of publishing a single “human score”.
