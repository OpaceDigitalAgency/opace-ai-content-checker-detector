# Opace Cycle-5 browser runtime

## On-device AI content detector runtime

This internal component supplies model loading, verified caching and section-level AI-pattern analysis to Opace's browser-based checker integrations. It is for maintainers connecting a full trained detector to a host interface, not an independently published npm product. The similarly named browser adapter only extracts text and manages a Worker; it does not contain this detector.

Use the host application's consent and error states. A missing model must remain not assessed, rather than returning a reassuring score. Full reports may include scored passages; content-free sharing must use the separate receipt representation.

[Main AI content checker guide](../../README.md) · [Model and data provenance](../../MODEL_AND_DATA_PROVENANCE.md) · [Security](../../SECURITY.md) · [Contributing](../../CONTRIBUTING.md) · [Opace AI services](https://opace.agency/services/artificial-intelligence/)

Private source candidate for Chrome and the interactive Astro toolbar. It runs the pinned Cycle-5 int8 model only after explicit consent, verifies the remote manifest plus every downloaded byte, and returns the canonical checker result through the shared core semantics.

It contains no model, vocabulary or WebAssembly binary and has no install/postinstall downloader. Hosts must configure one exact HTTPS model base from their own fixed allowlist. Chrome supplies its pinned WebAssembly runtime locally; Astro may use the same allowlisted asset base. The one-off consent transfer is 34.5 MB for model plus vocabulary, plus 14–26 MB for the selected onnxruntime-web runtime. Draft text never leaves the browser route.

This is source-level work, not a packaged or published release. The `@opacedev/ai-content-checker-browser` primitive remains model-free.

The package also validates the dedicated Chrome EU-service response and composes it into the same canonical result without classifying from rounded probabilities. The service path uses the distinct `chrome_extension_challenge_token` authentication class. `renderCompleteCheckerHtml()` produces the shared complete printable report; a host that requires a generated PDF must still implement and validate that export itself.
