# Opace AI Content Integrity — Project Brief

> **Working documents for v0.2** (added 27 August 2026): this brief is the standing statement of intent. The independent audit of the v0.1 build is [`v0.1-REVIEW.md`](v0.1-REVIEW.md) (test evidence, target architecture, phased plan) and the commercial-detector analysis is [`PAID-TOOLS.md`](PAID-TOOLS.md) (how Copyleaks/Originality/GPTZero/Pangram work, realistic accuracy targets, differentiation strategy). The three documents are consistent and together define the v0.2 scope; where the brief is silent on implementation, the review's architecture (§8) governs. See also the §21 addendum below.

## Goal

Build the strongest practical free solution for checking and improving AI-assisted content: writing patterns, repetitive phrasing, invisible characters, public watermark experiments, provenance, local detector signals and future official Anthropic verification.

## Executive Summary

Opace has a narrow opportunity to establish itself as an early, credible authority on **AI content integrity** while Anthropic text-watermarking discussion and viral watermark-removal interest are still current.

The project will turn that attention into a useful, evidence-led product family rather than another superficial “AI humaniser”. The aim is to build the strongest practical **free, local-first workflow for inspecting and improving AI-assisted content** while protecting facts, names, figures, links, quotations, citations and code.

At the centre is one simple promise: **Improve and check — with evidence, not guarantees.** The system will identify measurable signals such as writing patterns, repetition, invisible Unicode, provenance metadata, supported detector outputs and public watermark experiments; generate safer rewrite candidates; reject factual damage; compare results; and require editorial approval before changes are applied.

The same trusted core will power Opace web tools, a standalone WordPress plugin, future AI-Scribe and AI Hub integrations, an Astro integration, CLI/SDK packages, an optional local engine and browser extensions. This creates multiple legitimate discovery channels while keeping one methodology, one evidence model and one set of tests.

The commercial objective is wider than software adoption. The project should create **search visibility, backlinks, GitHub activity, package downloads, WordPress installs, browser-extension users, research citations and qualified agency enquiries**, then convert that authority into AI content audits, editorial remediation, provenance reviews, governance and content-quality services.

The credibility of the project depends on restraint. Opace must never claim to prove human authorship, remove Anthropic production watermarking, guarantee SEO safety or pass detectors that were not actually run. Every result must say what was tested, how, with which version, what remains unknown and whether the result is unsupported, not configured, not run, inconclusive or verified by a named method.

**Timing matters, but trust matters more.** The opportunity is to publish something genuinely useful while the subject is fresh, then become the source people cite because the tooling, methodology and benchmark evidence are transparent and reproducible.

---

# Detailed Project Brief

## 1. Project Objective

Build **Opace AI Content Integrity** as one coherent, evidence-led product and research family that helps publishers, marketers, developers and agencies inspect, improve and document AI-assisted content without pretending that AI authorship or watermark removal can be proven where the evidence does not support it.

The project should position Opace as an authority at the intersection of:

- AI-assisted writing quality;
- editorial integrity;
- AI detector behaviour and false positives;
- text watermark research and readiness;
- content provenance;
- factual preservation;
- WordPress publishing workflows;
- reproducible AI-content benchmarking;
- practical AI governance for organisations.

The immediate opportunity is driven by current interest around Anthropic text watermarking and public watermark-removal projects. Opace should move quickly enough to benefit from that attention, while publishing something materially more useful and credible than a basic cleaner, detector wrapper or “humaniser”.

## 2. Core Product Principle

The product promise is:

> **Free and open source. Local-first where supported. Facts and citations protected. Evidence, not guarantees.**

The primary user action is **Improve and check**.

That action must run a controlled editorial pipeline rather than blindly rewriting content to chase a detector score.

The system should:

1. inspect the original content;
2. identify measurable integrity and AI-writing signals;
3. protect facts and sensitive spans;
4. propose bounded changes;
5. generate rewrite candidates where appropriate;
6. reject candidates that damage meaning or protected information;
7. run supported local and authorised external checks;
8. compare evidence clearly;
9. require editorial approval;
10. produce an auditable receipt of what happened.

A lower detector score must never take priority over factual accuracy.

## 3. Why Opace Is Building It

The project should create value in four connected ways.

### 3.1 Authority

Establish Opace early as a credible source on AI content integrity, watermark readiness, detector limitations, false positives, provenance and editorial quality.

### 3.2 Distribution

Create several legitimate routes through which people can discover Opace:

- organic search;
- AI/search citations;
- editorial coverage;
- backlinks;
- GitHub stars, forks and contributors;
- npm and PyPI downloads;
- WordPress.org installs and reviews;
- browser-extension users;
- Astro/developer adoption;
- research references;
- AI-Scribe and AI Hub ecosystem discovery.

### 3.3 Product Value

Provide a genuinely useful free toolset that works without mandatory commercial detector fees and remains valuable before an official Anthropic detector is publicly available.

### 3.4 Agency Revenue

Turn the methodology and evidence into higher-value Opace services such as:

- AI content audits;
- editorial remediation;
- content-quality improvement;
- provenance and watermark-readiness checks;
- AI publishing governance;
- detector-risk and false-positive reviews;
- AI-assisted content policy and workflow consulting.

## 4. Research and Evidence Rules

Research quality is a product feature, not background work.

The project must investigate Anthropic watermark claims, viral watermark-removal projects and a broad range of current open-source work covering:

- text watermarking;
- watermark attacks and removal experiments;
- provenance and C2PA;
- Unicode and invisible-character sanitisation;
- AI-writing classifiers;
- detector ensembles;
- humanisers and rewrite systems;
- factuality and semantic preservation;
- benchmark datasets and evaluation methods.

For every external repository or component considered, record:

- exact repository;
- relevant commit;
- licence;
- project status;
- claims made by its author;
- available test evidence;
- reproducibility evidence;
- known limitations;
- whether Opace reuses, adapts, references or excludes it.

Keep these evidence classes separate:

- provider facts;
- repository claims;
- academic findings;
- commercial vendor claims;
- Opace benchmark results;
- Opace inference or interpretation.

No unlicensed, misleading or legally unclear code should be incorporated.

**Reuse-first rule (binding, added 27 August 2026).** Where a researched component is permissively licensed, maintained and materially more capable than an Opace-written equivalent, the default is to adapt or wrap it with attribution. Building from scratch requires a recorded reason (licence, security, size or quality), per component. Rule data, carrier tables, confusable maps and pattern libraries are data, not invention: adopt the fullest available licensed source rather than rewriting a smaller version.

## 5. Truthfulness and Claim Boundaries

The product must be unusually precise about what it knows and what it does not know.

It may state that it can:

- detect supported invisible Unicode and homoglyph patterns;
- inspect supported provenance metadata;
- identify documented writing-pattern signals;
- protect configured names, figures, dates, URLs, quotations, citations and code;
- generate and compare rewrite candidates;
- run named local/open detector implementations;
- run supported public watermark experiments;
- record exactly which checks were run and which were not;
- integrate official Anthropic verification if and when a supported interface becomes available.

It must not claim:

- “guaranteed human”;
- “undetectable”;
- “all detectors passed” unless every named detector was genuinely run;
- “SynthID removed” without the relevant official supported verification;
- that metadata cleanup equals text-watermark removal;
- that detector probability proves authorship;
- that detector evasion improves rankings;
- guaranteed SEO safety;
- clearance by Copyleaks, Originality, Pangram, GPTZero, Turnitin, Anthropic or any other provider that was not actually called.

Use explicit result states such as:

- `pass`;
- `attention`;
- `fail`;
- `inconclusive`;
- `unsupported`;
- `not_configured`;
- `not_run`;
- `error`.

Unsupported, unrun and failed checks must never be visually collapsed into a pass.

## 6. Product Family

Create one connected product family rather than several thin, unrelated tools.

### 6.1 Opace Website

Create one card on:

`/tools/`

That card should link to one parent hub:

`/tools/ai/content-integrity/`

The parent page then leads to four primary public experiences:

1. **AI Content Integrity Checker**
2. **Claude Watermark Readiness Lab**
3. **Editorial Rewrite Lab**
4. **Opace AI Content Integrity Index**

Supporting product pages can cover the WordPress plugin, Astro integration and browser extension once authorised and available.

Research and methodology pages should support the tool family, including topics such as:

- Claude/Anthropic text watermarking;
- AI detector false positives;
- AI content integrity methodology.

Every public page should link naturally to the relevant methodology, source code, package, plugin or research evidence once those destinations are genuinely live.

### 6.2 WordPress Plugin

Build one standalone **Opace AI Content Integrity** plugin containing the core public-facing editorial modules plus:

- Checker;
- Claude Lab;
- Rewrite Lab;
- Integrity evidence/results;
- Receipts;
- Settings.

The plugin must remain genuinely useful on its own.

It must not require:

- AI Hub;
- AI-Scribe;
- a paid detector;
- an Opace account;
- a commercial API key.

When AI Hub is present in a compatible future release, the plugin can use Hub services and provider configuration.

When AI-Scribe is present in a compatible future release, it should automatically recognise the integrity service and expose the appropriate editorial workflow without duplicating ownership of the core logic.

### 6.3 Future AI Hub Integration

The same WordPress plugin should become the installable **AI Content Integrity add-on** presented through a future Opace AI Hub release.

AI Hub should own shared provider services such as:

- encrypted credentials;
- provider discovery;
- generation requests;
- cost estimates;
- shared usage records.

It should not become the editorial writing interface.

### 6.4 Future AI-Scribe Integration

AI-Scribe should own:

- article creation;
- editorial state;
- publishing;
- selective acceptance of suggested changes.

Its Content Integrity surface should expose the shared **Editorial Rewrite Lab** workflow rather than create a competing implementation.

### 6.5 Astro Integration

Create an Astro integration exposing equivalent developer-facing analysis and build-time/dev-toolbar functionality, backed by the same shared contracts and test fixtures.

### 6.6 Shared Open-Source Core

Create one shared codebase containing the portable integrity contracts and reusable engine components.

Expected outputs include:

- shared GitHub repository;
- SDK/packages;
- Node CLI;
- npm packages;
- optional Python/local service where heavyweight analysis requires it;
- test fixtures;
- benchmark tooling;
- reproducible example data.

Final organisation, repository and package names should remain subject to owner approval before public release.

### 6.7 Browser Extensions

Release browser support in this order:

1. Chrome;
2. Edge;
3. Firefox;
4. Safari.

Do not assume cross-browser compatibility purely because one Chromium build works. Each version must be separately packaged and tested.

The extension should only exist where it adds a recurring page-level workflow that is more useful than returning to the website tool.

## 7. Canonical Improve-and-Check Workflow

All major surfaces should share the same conceptual pipeline.

### Capture

Accept authorised content from text input, a WordPress block selection, post, URL, file or supported development surface.

### Inspect

Analyse without changing the source. Report supported Unicode, homoglyph, provenance, writing-pattern, detector and watermark signals independently.

### Protect

Identify and lock protected content such as:

- people and company names;
- figures;
- dates;
- units;
- URLs;
- quotations;
- citations;
- code;
- manually protected spans.

### Plan

Show what the system proposes to do, including privacy route, model/provider and any possible cost before content leaves the local environment.

### Generate

Create a bounded number of candidates using deterministic edits, a local model or a user-authorised configured provider.

### Reject

Automatically eliminate candidates that fail any required gate, including:

- protected-span integrity;
- semantic similarity;
- contradiction checks;
- factual consistency;
- citation preservation;
- readability requirements;
- code integrity where applicable.

### Score

Run the versioned Opace local signal set and only those external providers the user has explicitly authorised and configured.

### Compare

Keep important dimensions separate rather than manufacturing one misleading “human score”. Compare:

- factual fidelity;
- protected-span fidelity;
- naturalness;
- writing-pattern changes;
- detector sensitivity;
- watermark experiment results;
- edit distance;
- readability;
- reading level;
- provenance changes.

### Approve

Allow the editor to accept changes by candidate or sentence. Never overwrite silently.

### Receipt

Store or export evidence such as:

- input hash;
- methods used;
- versions;
- checks run;
- checks not run;
- result states;
- limitations;
- privacy route;
- approval metadata.

## 8. Free and Local-First Requirement

The useful core must remain free.

Browser-safe deterministic checks should run locally where practical and should not require uploading content.

The optional local engine can support heavier workloads such as:

- open detector models;
- embeddings;
- contradiction/NLI checks;
- local rewrite models;
- benchmark execution.

Paid providers such as Copyleaks, Originality, Pangram and similar services may be supported through optional **bring-your-own-key adapters**.

They are enhancements, not dependencies.

The product must deliver meaningful value with no paid scan provider configured.

Any outbound request must clearly disclose:

- the provider;
- what content is sent;
- why;
- likely cost where known;
- privacy implications.

No external request should occur before consent.

## 9. Benchmark and Integrity Index

The **Opace AI Content Integrity Index** should become the evidence engine behind public performance claims.

Build a reproducible benchmark capable of comparing, where legally and technically permitted:

- detectors;
- local detector implementations;
- rewrite/humaniser approaches;
- false positives on verified human writing;
- public watermark experiments;
- factual preservation;
- citation preservation;
- semantic fidelity;
- readability;
- naturalness;
- edit distance;
- human editorial preference.

Benchmark results must be versioned and reproducible.

Do not publish comparative performance claims until the required gates have passed, including suitable corpus quality, provider coverage, human review and statistical confidence.

Confidence percentages should be calibrated from actual evidence, not invented marketing values.

The benchmark should publish enough methodology and raw-enough supporting data for competent third parties to reproduce key findings.

## 10. UX and Visual Direction

Every public Opace page must look native to the existing Opace site.

Reuse the current site’s real:

- header and footer;
- typography;
- colours;
- content widths;
- spacing;
- buttons;
- cards;
- hero patterns;
- numbered sections;
- FAQ patterns;
- breadcrumbs;
- responsive behaviour;
- dark/light section rhythm.

Do not create a disconnected microsite aesthetic.

The product itself should feel like **editorial forensics**, not a generic AI dashboard.

A strong signature interaction is a two-rail evidence view:

- left: source content, protected spans and sentence-level changes;
- right: independently labelled checks, evidence and reasons a candidate passed or failed.

Dense technical evidence should use progressive disclosure rather than endless cards.

Preferred primary action language includes:

- Inspect draft;
- Protect facts;
- Improve and check;
- Compare candidates;
- Apply selected changes;
- Export receipt.

## 11. Accessibility and Responsive Requirements

Accessibility and mobile usability are release gates, not polish tasks.

Each critical experience must prove:

- desktop behaviour;
- tablet behaviour;
- 375 px behaviour;
- 320 px / 400%-equivalent behaviour;
- no horizontal overflow;
- full keyboard completion;
- visible focus states;
- screen-reader compatible status messaging;
- sufficient contrast;
- non-colour-only result communication;
- reduced-motion support;
- WCAG 2.2 AA compliance.

The full two-rail view can appear at wider widths, but the complete workflow must remain usable on mobile.

## 12. SEO, Distribution and Publication Strategy

The project should follow the successful logic established by Opace’s Preferred Sources work: respond to a current platform topic with something useful, open and independently discoverable.

The launch should combine:

- a plain-language free tool targeting active search interest;
- authoritative research pages;
- an independent WordPress.org plugin;
- reusable open-source packages;
- GitHub documentation built for discovery and contribution;
- Astro/developer packages;
- browser extensions where justified;
- reproducible benchmark data;
- carefully connected internal linking.

Apply the `plugin-repo-seo` workflow to every release-facing repository, package and listing.

Prepare complete release surfaces for:

- GitHub;
- WordPress.org;
- npm;
- PyPI where used;
- Astro integrations;
- Chrome Web Store;
- later browser stores.

Each release surface should include, as relevant:

- searchable product name;
- strong one-line proposition;
- accurate feature summary;
- 60-second getting-started route;
- screenshots;
- limitations;
- privacy information;
- support route;
- methodology link;
- licence;
- changelog;
- security policy;
- contribution guide;
- roadmap;
- `CITATION.cff`;
- third-party notices;
- SBOM where appropriate;
- reproducible commands;
- correctly authorised live links only.

Avoid link spam. Cross-links should exist because they genuinely help the user understand or reproduce the work.

## 13. Success Measures

Success should be measured across authority, adoption and commercial outcomes rather than traffic alone.

Track metrics such as:

- backlinks to Opace research/tool pages;
- organic search visibility;
- AI/search citations;
- press/editorial references;
- GitHub stars;
- forks;
- contributors;
- issues/discussions;
- npm downloads;
- PyPI downloads where relevant;
- WordPress installs;
- WordPress reviews;
- extension installs and active users;
- benchmark citations;
- methodology citations;
- qualified agency enquiries;
- audit/remediation opportunities created;
- conversion from free tools into relevant Opace services.

Analytics must measure what actually happened without implying a detector or provider pass that was never observed.

## 14. Release Boundary — Current AI-Scribe and AI Hub Work

This boundary is binding.

All AI-Scribe and AI Hub changes described by this project belong to **future releases only**.

They must not be:

- added to the current release candidates;
- merged into them;
- bundled with them;
- used to delay them;
- used to change their versioning;
- used to alter their acceptance criteria.

The currently prepared **AI-Scribe 3.2.36** and **AI Hub 1.0.13** work remains separate.

Future integration implementation may begin only after the owner confirms those releases are frozen and verified, and future work must use fresh branches/worktrees from their accepted heads.

## 15. Publication and Approval Boundary

Research, specifications, code and local release candidates may be prepared in advance.

However, do not silently:

- publish;
- push;
- deploy;
- submit to stores/directories;
- contact third parties;
- alter live Opace pages;
- change current AI-Scribe/AI Hub release lanes.

Treat these as separate states:

- researched;
- specified;
- implemented;
- tested;
- locally packaged;
- committed;
- publication-ready;
- submitted;
- approved by a platform;
- deployed;
- verified live;
- owner accepted.

Owner approval is required before consequential external publication or release actions.

## 16. Security and Privacy Requirements

The architecture must assume content may be confidential.

Requirements include:

- local processing by default where practical;
- explicit consent before external calls;
- no provider secrets in browser output, logs or receipts;
- secure credential ownership by the appropriate host product;
- clear data-retention settings;
- clear receipt-retention controls;
- minimal storage by default;
- documented threat model;
- dependency review;
- SBOM where appropriate;
- secure update and packaging processes;
- no hidden telemetry.

## 17. Shared Technical Ownership

The system should have clear boundaries so each integration remains maintainable.

### Portable Core

Owns:

- schemas/contracts;
- Unicode analysis;
- homoglyph analysis;
- pattern rules;
- protected-span logic;
- deterministic validation;
- diffing;
- receipt format;
- shared fixtures.

### Optional Local Service

Owns heavyweight capabilities such as:

- open detector models;
- embeddings;
- NLI/contradiction checks;
- local rewrite models;
- heavier benchmark execution.

### AI Hub

Owns shared provider infrastructure only where present.

### AI-Scribe

Owns the article/editorial/publishing experience only where present.

### Standalone WordPress Plugin

Owns its independent editing and inspection workflow and must remain useful without the other Opace products.

### Public Web Tools

Must remain useful without WordPress, an account or a commercial detector.

## 18. Required Documentation Before Implementation

Document first, then implement.

Every surface must have a specification detailed enough that another agent can build it without reinventing product decisions.

Each specification should include:

1. purpose;
2. target users;
3. business goal;
4. SEO/distribution role;
5. USPs;
6. non-goals;
7. dependency relationships;
8. MVP and later-release scope;
9. information architecture;
10. screen inventory;
11. word-based wireframes;
12. field-level controls;
13. user-facing copy;
14. loading states;
15. empty states;
16. error states;
17. unsupported/not-run states;
18. desktop behaviour;
19. tablet behaviour;
20. mobile behaviour;
21. accessibility requirements;
22. component/service architecture;
23. data contracts;
24. storage model;
25. privacy model;
26. security model;
27. APIs/hooks;
28. migration and compatibility behaviour;
29. analytics events;
30. SEO/store/GitHub assets;
31. internal-link requirements;
32. automated tests;
33. manual tests;
34. package tests;
35. regression tests;
36. release gates;
37. dependencies;
38. risks;
39. open decisions;
40. implementation sequence;
41. executable definition of done.

No implementation should begin from a specification that leaves a material user journey, result state, data owner, privacy route or release gate undefined.

## 19. Quality Gates

At minimum, release candidates should pass:

- licence review for copied dependencies, datasets and models;
- model-card review where applicable;
- deterministic unit tests;
- golden Unicode fixtures;
- protected-span fixtures;
- receipt serialisation fixtures;
- verified-human false-positive tests;
- factual fidelity checks;
- names/figures/dates/units preservation checks;
- URL preservation checks;
- quotation preservation checks;
- citation preservation checks;
- code preservation checks;
- held-out human review;
- meaning/factuality review;
- naturalness review;
- brand-voice review where relevant;
- exact-package WordPress activation testing;
- upgrade testing;
- uninstall testing;
- mixed-version integration testing;
- desktop testing;
- real 375 px testing;
- keyboard-only testing;
- accessibility testing;
- privacy/network-request testing;
- secret-leakage testing;
- regression testing against current Opace products.

No public provider badge may appear unless that provider was actually called.

No public performance claim may be made unless supported by the versioned Opace benchmark and sufficient reproducible evidence.

## 20. Definition of Success

The project succeeds when Opace has more than a topical content page or another AI rewrite tool.

It should become a recognisable, useful and citable **AI content integrity platform** with:

- a trusted free core;
- practical editorial workflows;
- transparent limitations;
- reproducible research;
- open-source adoption;
- multiple ecosystem entry points;
- strong Opace search visibility;
- credible benchmark evidence;
- clear agency-service conversion routes;
- no compromise to current AI-Scribe or AI Hub release work.

The differentiator is not a promise to “beat AI detectors”. It is the combination of **editorial improvement, factual protection, transparent evidence, provenance awareness, reproducible testing and honest uncertainty** in one coherent Opace product family.

## 21. v0.2 Addendum — Detection Capability Tiers (added 27 August 2026)

Evidence from the v0.1 audit ([`v0.1-REVIEW.md`](v0.1-REVIEW.md)) and the commercial-detector study ([`PAID-TOOLS.md`](PAID-TOOLS.md)) establishes a fact the original brief did not state: **rule-based and stylometric checks cannot detect well-prompted current-model AI text at all** — a 100% GPT-5.6 article scored clean on the v0.1 engine and 98.9% "human" on the best open-source rule detector, while Copyleaks and Originality both correctly scored it 100% AI using trained transformer classifiers. Detection therefore has tiers, and every product surface must be honest about which tier it runs:

1. **Tier A — deterministic evidence** (carriers, homoglyphs, protected content, provenance, receipts): runs everywhere, local, exact. This is where Opace can objectively exceed every tool, paid or free.
2. **Tier B — rules and stylometrics** (pattern packs, burstiness, phrase-frequency evidence): explains and improves writing; catches careless AI output; **must never be presented as authorship detection**.
3. **Tier C — trained local models** (distilled classifier in-browser via ONNX; heavier open detectors via the local engine): genuine AI-writing signals, free and private; below commercial ceiling, above everything else free.
4. **Tier D — authorised external verification** (BYOK Copyleaks/Originality/GPTZero/Pangram adapters; future official Anthropic verifier): commercial-grade scores, clearly attributed, on explicit consent only.

The one-brain/many-shells architecture, channel-compliance rules and accuracy targets for these tiers are specified in `v0.1-REVIEW.md` §8 and `PAID-TOOLS.md` §6, which govern v0.2 implementation.

### §21 correction — 28 August 2026

Two things in the tier framing above have since been measured and must be read with this note.

**Tier B is no longer a detection tier.** Re-tested on 5,558 fresh long-form documents, the
113-rule writing-signal pack detected 45.1% of AI writing while flagging 24.8% of human writing:
worse than the trained model on both axes at once. It was demoted on 28 August 2026 to editorial
suggestions and no longer contributes to the AI verdict at all. The prohibition above — "must
never be presented as authorship detection" — is now enforced in the engine rather than only
stated here. Burstiness in particular, named in the Tier B description, measures AUROC 0.521 on a
modern corpus and is worthless as a signal.

**Tier C is live and measured**, not an aspiration. The shipped cycle-2 classifier detects 90.3%
of AI writing at a 1.34% human false-positive rate, measured through the browser runtime that
ships, on documents it had never seen. The binding record is [`OBJECTIVE.md`](OBJECTIVE.md).

**Route note.** The canonical suite routes are `/tools/ai/content-verification-integrity/` and
`/tools/ai/content-verification-integrity/checker/`. The `/tools/ai/content-integrity/` paths
planned in §7 above were never built and return 404; privacy is `/privacy-policy/` and support is
`/get-in-touch/`.
