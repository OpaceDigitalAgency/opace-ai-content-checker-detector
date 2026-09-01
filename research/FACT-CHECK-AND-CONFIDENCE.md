# Fact-check and technical confidence

> **Public research snapshot.** This first-party brief preserves the evidence available on its stated research date. Provider availability and product claims can change. Use the [current architecture](../docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md) and [research index](../docs/RESEARCH-INDEX.md) before quoting a current claim.

Research date: 26 August 2026.

## What is confirmed

- [Anthropic announced](https://www.anthropic.com/news/claude-text-watermark) on 14 August 2026 that future supported Claude models will generate text containing a SynthID-based statistical watermark. It uses token-choice probabilities rather than hidden characters, identifiers or extra tokens.
- Anthropic says substantial rewriting can remove the signal. Its detector API is described as coming “soon”; it is not currently available for this assessment.
- [Anthropic's help article](https://support.claude.com/en/articles/16266773-how-claude-marks-ai-generated-content) says newly launched supported models receive marking at launch while existing-model coverage is in progress. It does not support the claim that every historic or current Claude output is already marked.
- [Google's SynthID documentation](https://ai.google.dev/responsible/docs/safeguards/synthid?hl=en) says detection confidence falls after thorough rewriting or translation and that the system is not designed to withstand motivated adversaries. Google's public reference detector works with known configurations and keys; it is not Anthropic's production detector.
- [Google Search guidance](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content?hl=en) focuses on useful, accurate, original content. Its [spam policy](https://developers.google.com/search/docs/essentials/spam-policies) treats large-scale low-value generation and obfuscation as potential scaled-content abuse.

## Corrections to the supplied note

1. `guillaumemeyer/watermarks-remover` had about 18,380 stars when checked, not 12,300.
2. Hidden-Unicode removal is useful hygiene but irrelevant to Anthropic's announced statistical text watermark.
3. C2PA and EXIF removal concerns file provenance, not the statistical pattern in prose. Opace should inspect and preserve provenance by default, not market stripping as the main feature.
4. The viral repository contains a placeholder Claude detector. Its statistical rewrite can be tested against configured research detectors, but it cannot certify a Claude production pass.
5. The `SynthID-Text-Bypass` repository admits the production detector is private and unknown. Its token substitutions are a research demonstration, not proof against Anthropic.
6. Academic attacks such as [BIRA](https://arxiv.org/abs/2509.23019) and [SIRA](https://arxiv.org/abs/2505.05190) report high removal rates on public research schemes. Those results do not transfer automatically to Claude's private implementation.
7. Commercial classifiers such as Copyleaks and Originality assess different signals. A watermark rewrite may still score as AI, while a low classifier score does not prove a watermark has gone.

## Confidence scale

Each percentage below is a calibrated engineering judgement that the named capability will work under the stated conditions. It is not a promised detector pass rate and not a probability that text is “human”.

| Capability | Confidence | Boundary |
|---|---:|---|
| Remove known invisible-Unicode carriers | 98% | High for enumerated characters; approximately 0–2% relevance to Claude's statistical watermark |
| Read/validate supported C2PA manifests with the official SDK | 95% | File formats and manifests supported by the SDK; says nothing about text watermarking |
| Detect a public SynthID/KGW scheme with the exact configuration and key | 90–95% | Controlled research environment only |
| Thorough rewriting reduces a statistical watermark signal in general | 80–90% | Supported by provider statements and research; meaning can drift |
| Certify that a rewrite clears current production Claude watermarking today | 20–35% | No official detector or production key/configuration is available |
| Public MLM/token-substitution attacks reproduce on their published scheme | 70–90% | Requires matching models, code and detector; transfer to Claude is only 15–35% |
| Current AI Scribe one-pass prompt humaniser reliably clears Copyleaks/Originality | 10–25% | No detector loop or held-out benchmark; vendor models and thresholds change |
| A detector-specific loop passes that exact paid detector at test time | 75–90% | With live API, adequate candidates and quality gates; transfer to another/versioned detector is only 20–40% |
| Human editorial transformation with first-party evidence improves content quality | 85–95% | Quality benefit, not a universal detector guarantee |
| A local keyless “Claude watermark detector” is trustworthy | 5–10% | At present it is stylometry or an unvalidated proxy |
| Add official Anthropic measurement when its API is released | 90–95% | Assuming a documented, stable API and customer eligibility |

## Product wording that remains defensible

Use precise states: `not tested`, `detector unavailable`, `unsupported pending specification`, `signal detected`, and `cleared by [detector/version] at [time]`. Never collapse these into “100% human”, “undetectable”, “SEO safe” or “watermark removed everywhere”.

The useful brand territory is content integrity: provenance, quality, evidence, false-positive testing and transparent measurement. This remains valuable even when detector algorithms change.
