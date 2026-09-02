# Opace Cycle-5 browser runtime

Private source candidate for Chrome and the interactive Astro toolbar. It runs the pinned Cycle-5 int8 model only after explicit consent, verifies the remote manifest plus every downloaded byte, and returns the canonical checker result through the shared core semantics.

It contains no model, vocabulary or WebAssembly binary and has no install/postinstall downloader. Hosts must configure one exact HTTPS model base from their own fixed allowlist. Chrome supplies its pinned WebAssembly runtime locally; Astro may use the same allowlisted asset base. The one-off consent transfer is 34.5 MB for model plus vocabulary, plus 14–26 MB for the selected onnxruntime-web runtime. Draft text never leaves the browser route.

This is source-level work, not a packaged or published release. The `@opace/content-integrity-browser` primitive remains model-free.

The package also validates the dedicated Chrome EU-service response and composes it into the same canonical result without classifying from rounded probabilities. The service path uses the distinct `chrome_extension_challenge_token` authentication class. `renderCompleteCheckerHtml()` produces the shared complete printable report; a host that requires a generated PDF must still implement and validate that export itself.
