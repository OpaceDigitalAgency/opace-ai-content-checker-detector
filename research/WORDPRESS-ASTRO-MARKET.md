# WordPress and Astro market gap

> **Public research snapshot.** This market scan preserves observations from 26 August 2026. Listings and package availability change. Use the [current architecture](../docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md), [research index](../docs/RESEARCH-INDEX.md) and current registry checks before quoting a present-day fact.

Checked against the WordPress.org plugin API, plugin ZIPs and npm on 26 August 2026.

## WordPress findings

The market is not empty, but it is fragmented and very small:

| Plugin | Observed active installs | What it actually provides |
|---|---:|---|
| Opace AI Scribe | 100 | AI writing and prompt-based humaniser; no detector-in-loop or watermark verifier |
| ContentsOps AI Humanizer & Content Writer | 0 | Authenticated SaaS-to-WordPress publishing bridge |
| HumanAIEdit Draft Rewriter | 0 | Remote editor service; explicitly does not guarantee detector results |
| Uncertify AI | 0 | Remote proprietary detect/humanise API |
| Winston AI WordPress | 30 | Connection to Winston's external platform/scanner |
| SEONAI AI Image Checkmark | 100 | Image-origin checking/marking, not text watermark verification |
| EU AI Label | 70 | Visual/attachment labels; explicitly no C2PA cryptography |

No WordPress.org result reviewed combined local text hygiene, deterministic quality linting, C2PA verification, explicit detector-version receipts, future Claude detector support and a guarded editorial rewrite workflow.

That is the opportunity: aim to be the **first credible verification-first WordPress content-integrity plugin**, rather than claiming to be the first AI humaniser or watermark remover.

## Astro and JavaScript findings

No Astro-specific text-watermark product was found. The official packages are suitable building blocks:

- `@contentauth/c2pa-web` 0.14.3 for browser reading and validation.
- `@contentauth/c2pa-wasm` 0.11.3 for the WebAssembly layer.
- `@contentauth/c2pa-node` 0.9.1 for supported server-side validation/signing.
- [contentauth/c2pa-js](https://github.com/contentauth/c2pa-js) is the maintained MIT source repository.

An Astro release can run Unicode/pattern checks locally in the browser, use a client-only C2PA component, and call server endpoints only for paid detector APIs. This gives a fast public demo with low privacy risk.

## Recommended public MVP

Input: pasted text or uploaded supported asset.

Output:

- known invisible-Unicode carriers, with exact code points;
- AI-writing-pattern findings as editorial hints, never provenance proof;
- C2PA presence, signer and validation state;
- detector results only when an exact live adapter was invoked;
- factual-content checklist covering claims, sources, quotations, links and first-party evidence;
- downloadable JSON/HTML audit receipt with tool and detector versions;
- “Anthropic verification unavailable” until the official detector can be called.

The local-only free tool is useful and shareable without uploading client content. Optional BYOK adapters create a paid path for agencies and publishers.
