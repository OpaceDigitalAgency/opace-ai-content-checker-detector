# Lessons from the parallel `google-preferred-sources` project

> **Public research snapshot.** This first-party comparison preserves the evidence and decisions available on its stated review date. Use the [current architecture](../docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md) and [research index](../docs/RESEARCH-INDEX.md) for current product state.

Review date: 26 August 2026. This is a read-only comparison. The parallel project was not changed or release-tested during this work.

## What the project does well

### 1. It turns one timely announcement into several discovery routes

The project does not rely on one plugin page. It defines:

- an independently searchable WordPress plugin;
- two indexable Opace web tools;
- a reusable TypeScript core, web component and framework packages;
- a dedicated Chrome extension;
- a pillar guide, store copy, screenshots and outreach plan.

This is the correct strategic model for the content-integrity opportunity. Anthropic/SynthID interest can produce separate search, WordPress, GitHub, package, browser-store and editorial routes, but only if they share a canonical method and product identity.

### 2. It treats speed and gatekeepers separately

The Preferred Sources plan sends the WordPress candidate into its external review queue while publishing web tools through an owner-controlled route. The equivalent here is:

- launch a browser-based Claude Watermark Readiness Lab and GitHub core first;
- submit the independently useful WordPress plugin as soon as its exact package passes;
- continue local-engine and AI-Scribe work without implying WordPress approval.

### 3. It makes the owned Opace page the canonical backlink target

Each listing/package points to the appropriate `opace.agency` page. That is stronger than expecting a repository profile to deliver direct SEO value. The public methodology/tool should be the reference implementation, while GitHub provides reproducibility and contribution proof.

### 4. It specifies launch assets at build time

The four Preferred Sources specs include product identity, exact screen copy, wireframes, schema, internal links, analytics, store descriptions, screenshot storyboards, privacy wording, responsive states and numbered acceptance criteria. This prevents a technically finished tool arriving at launch without searchable copy or usable evidence.

### 5. Its limitation is a product feature

The Preferred Sources SDK has no confirmed-add callback, and the specs require every analytics surface to say clicks are not confirmed additions. The content-integrity equivalent is the absent Anthropic detector: `unsupported` must remain a visible result, not be converted into a green pass or buried in a footnote.

### 6. It favours one core and thin integrations

The open-source specification defines one core, a web component and thin Astro/React/Vue/Svelte wrappers. The same principle should govern Opace AI Content Integrity:

- one canonical contract and deterministic core;
- one optional heavyweight local service;
- one independent WordPress plugin that is also an AI Hub add-on;
- host-specific UI in AI-Scribe and public Astro tools;
- no separate detector logic copied into every surface.

## What to improve rather than copy

### 1. Documentation state and build state need one explicit register

The parallel folder contains substantial code as well as four large specs: 22 WordPress files, 11 web-tool files, 69 open-source-package files and 21 extension files were present at review. There is no central project/status document stating which acceptance criteria have actually passed. Therefore the existence of those files cannot be treated as a completed or released product.

The content-integrity project must maintain a release matrix that separates specification, implementation, test, exact package, GitHub tag, directory submission, approved listing, deployed page, indexation and owner acceptance.

### 2. Four near-simultaneous builds need an explicit dependency graph

The Preferred Sources specs are thorough per surface, but shared ownership and contract/version negotiation are less prominent than the surface detail. Content integrity is more complex because WordPress, browser and local-model environments cannot run the same heavyweight code. Its shared architecture must be agreed before parallel implementation.

### 3. Exact copy can become stale before release

The Preferred Sources specs freeze dates, competitor installs, platform versions and claims inside long execution documents. These are useful snapshots, but every external fact needs a pre-release refresh rather than being copied unchanged from a dated spec.

Content-integrity listings must keep volatile detector/model/version statements in a refreshable facts layer and show an observation date.

### 4. Many packages can create maintenance debt without adoption

Framework wrappers are valuable when the underlying task genuinely differs by framework. For content integrity, the immediate developer demand is more likely to be the browser core, CLI/local service, JSON contracts and WordPress integration. React/Vue/Svelte wrappers should follow observed demand rather than merely increasing package count.

### 5. SEO pages need unique jobs, not keyword variants

The parallel project has clearly distinct checker and generator functions. The same standard must apply here. A checker, readiness lab, rewrite lab, detector comparison and methodology page each need a distinct user job and dataset. Do not publish several near-identical “AI humanizer” pages to occupy wording variations.

## Adopted rules for Opace AI Content Integrity

1. Public lab plus GitHub method before heavyweight completeness.
2. Standalone WordPress discovery plus integrated AI-Scribe/Hub use from one plugin codebase.
3. Canonical `opace.agency` pages for each distinct job; GitHub and directories link back to them.
4. A shared brief, contracts and result states govern every surface.
5. Listing/SEO/privacy/analytics/test assets are part of each implementation spec.
6. Dated market claims are refreshed at the release gate.
7. Original benchmark data sustains attention after the launch spike.
8. No surface claims SynthID removal until the named authorised detector ran and returned that result.
