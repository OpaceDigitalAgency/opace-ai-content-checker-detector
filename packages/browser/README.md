# @opace/content-integrity-browser

![Opace AI Content Integrity evidence workflow](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-content-integrity/main/docs/assets/opace-ai-content-integrity-hero-v2.png)

Browser adapter for Opace AI Content Integrity. It provides deterministic DOM visible-text projection and a module Worker client over the frozen core and contracts.

- Consumes `@opace/content-integrity-core` and `@opace/content-integrity-contracts`
- No analysis-time telemetry, provider call or remote module
- Default Worker target is packaged at `dist/worker/entry.js`
- Licence: MIT for the Opace-authored package

Dependency and provenance evidence is recorded in the project-root `THIRD_PARTY_NOTICES.md`, `MODEL_AND_DATA_PROVENANCE.md` and `docs/legal/DEPENDENCY-LEDGER.md`.

> Release state: a 0.1.0 npm candidate is prepared locally but is not published. The install command below applies only after owner-approved publication.

## Install

```sh
npm install @opace/content-integrity-browser
```

## Use

The adapter projects rendered, visible body text with stable block and line-break semantics, excluding scripts, styles, templates, noscript and hidden descendants. Its Worker client carries schema-valid messages and supports cancellation without retaining content.

```js
import {
  projectDomVisibleText,     // (document) => DomVisibleTextProjection
  createInspectionWorker,    // () => InspectionWorkerClient
  supportsWorkerInspection,  // () => boolean feature test
} from '@opace/content-integrity-browser';

if (supportsWorkerInspection()) {
  const projection = projectDomVisibleText(document);
  // hand projection.text to the Worker client for inspection
}
```

Create the Worker only after an explicit user action. The default worker asset is packaged at `dist/worker/entry.js`, so consumers do not need a remote script or CDN. `supportsWorkerInspection()` returns `false` outside a Worker-capable environment (verified: it returns `false` under plain Node), letting a consumer fall back to calling the core directly, as the live checker's watchdog does.

The package targets modern ESM browsers with module Worker support. It does not render a toolbar, request host permissions or read a page by itself; the consuming product must obtain an explicit user action and pass the intended document.

## Verify

```sh
npm ci
npm run typecheck
npm test
```

Rendered consumers should also test their own CSP, Worker URL resolution, cancellation, narrow layouts and network boundary. A successful projection does not authorise content storage or transmission.

## Accessibility, security and licence

This library does not render controls. The consuming toolbar or extension owns accessible names, focus order, live status and reduced-motion behaviour. Report vulnerabilities through the repository [security policy](https://github.com/OpaceDigitalAgency/opace-content-integrity/blob/main/SECURITY.md). Opace-authored code is available under the [MIT Licence](https://github.com/OpaceDigitalAgency/opace-content-integrity/blob/main/LICENSE).

For non-sensitive help, use [Content Integrity support](https://opace.agency/tools/ai/content-integrity/support/). Changes should follow the repository [contribution guide](../../CONTRIBUTING.md) and [changelog](../../CHANGELOG.md).

## Troubleshooting and links

- **Worker creation fails:** confirm the built `dist/worker/entry.js` asset is copied and allowed by the site's Content Security Policy.
- **Projected text is shorter than expected:** hidden descendants, scripts, styles, templates and `noscript` content are excluded deliberately.
- **Cancellation appears late:** abort the request through the client and dispose of the Worker when the surface closes.

[Opace AI Content Integrity](https://opace.agency/tools/ai/content-integrity/) · [Browser checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) · [Capability register](../../docs/CAPABILITIES.md) · [Chrome extension](https://opace.agency/tools/ai/content-integrity/browser-extension/) · [AI and automation services](https://opace.agency/services/artificial-intelligence/) · [Opace](https://opace.agency/) · [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency) · [Related core package](../core/README.md)
