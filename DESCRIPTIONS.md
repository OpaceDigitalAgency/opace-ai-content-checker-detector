# Canonical listing descriptions

Ready-to-copy descriptions for every distribution channel. This file is the single source listing copy is pasted from, so WordPress.org, the Chrome Web Store, npm and the Astro integrations directory never drift from the engine's real capabilities. Check every claim against [docs/CAPABILITIES.md](docs/CAPABILITIES.md) before publishing; the claims ladder at the end of this file governs which claims are currently allowed.

**Mandatory footer lines** — include all three, verbatim in spirit, on every listing:

> Your text is analysed locally and never uploaded. · Local-first: works without an account, an API key or an internet round-trip. · Results are named evidence from named checks, not proof of authorship.

---

## 1. WordPress.org (readme.txt)

### Short description (under 150 characters)

> Find hidden AI fingerprints, flag AI-style writing signals and protect your facts. Local, private, explainable. Never uploads your content.

### Long description

**Opace AI Content Integrity** checks your content before you publish, entirely inside your own WordPress admin. Nothing is sent to a detection company. Nothing needs an account or an API key.

**What it finds**

- **Hidden characters.** Invisible Unicode characters (zero-width spaces, joiners, direction marks, tag characters and more: 415 code points across 38 rules) that AI pipelines and copy-paste chains leave behind, plus 60 lookalike-letter substitutions. The paid detectors do not even look for these.
- **AI-style writing signals.** More than one hundred named editorial rules (103 weighted categories in the current signal set) score your draft from 0 to 100 and highlight exactly which phrases, structures and rhythms triggered, so you can fix the writing rather than argue with a percentage.
- **Chatbot artefacts.** Left-behind citation tokens, unfilled placeholders, tell-tale URL parameters and other near-certain traces of an AI drafting tool.
- **Protected facts.** Names, prices, dates, times, URLs, email addresses, quotations, citations and code are extracted and locked, so nothing important gets broken while the writing is improved.
- **A receipt.** A hash-based report of exactly which checks ran, at which versions, with which results: evidence you can hand to a client.

**What it will honestly not tell you**

No rule-based tool can prove who wrote a text, and this plugin never pretends to. A clean result means "no strong AI-style signals", not "written by a human". Carefully prompted AI text often carries no style tells at all; catching that class needs a trained model, which is in development and will also run locally. Checks that cannot run are shown as unavailable, never as passed.

Built by [Opace Digital Agency](https://opace.agency/) on open, credited foundations: the avoid-ai-writing rule research (MIT), the watermarks-remover character tables (MIT) and Unicode Consortium data.

### FAQ seeds

- **Is this an AI detector like Copyleaks or Originality?** No. Those services upload your text to their servers and return a probability from a closed model. This plugin runs named, explainable checks locally and shows you the evidence for each one. If you already pay for a commercial detector, a future release will let you connect your own account and see its attributed score alongside ours.
- **Does my content leave my site?** No. Analysis runs in your browser's admin session. There is no telemetry and no remote fallback.
- **Can it prove my article was written by a human?** No tool can, and any tool claiming to is overreaching. This plugin reports evidence: what was found, what was checked, and what could not be checked.
- **Why did legitimate text get flagged?** Invisible characters and lookalike letters have legitimate uses in multilingual text; the plugin's context rules exempt emoji sequences, cursive scripts and French typography, and everything else is presented for review, not auto-deleted.
- **What are the hidden characters it finds?** Zero-width spaces and joiners, direction marks, variation selectors, tag characters, unusual spaces and other invisible code points that survive copy-paste from AI tools. Each finding names the exact character and offers a safe fix.
- **Is it really free?** Yes. The engine is MIT-licensed and open source.

---

## 2. Chrome Web Store

> **Check any page or selection for hidden AI fingerprints and writing signals, without your text leaving the browser.**
>
> Opace AI Content Integrity inspects the text you select (or the visible page) for invisible Unicode characters that AI pipelines leave behind (38 rules, 415 code points), lookalike-letter substitutions, chatbot artefacts such as exposed citation tokens and unfilled placeholders, and more than fifty named AI-style writing signals with a 0–100 score and highlighted evidence.
>
> Everything runs inside the extension. No account, no API key, no server, no telemetry. Results name each check, its version and its limitations, and a clean result is reported honestly as "no strong AI-style signals", never as proof a human wrote it.
>
> Built by Opace Digital Agency on credited open-source foundations (avoid-ai-writing, watermarks-remover, Unicode data). Your text is analysed locally and never uploaded. Not proof of authorship.

---

## 3. npm package blurbs

**@opace/content-integrity-core**

> Deterministic, offline content-integrity engine: invisible-Unicode and homoglyph forensics (415 code points, 60 confusables), 103 weighted writing-signal categories with a 0–100 editorial score, 12 protected-span kinds, reviewed safe fixes, diffs and RFC 8785 hash-only receipts. Browser and Node ESM, no network calls, no telemetry, MIT. Evidence, not authorship verdicts.

**@opace/content-integrity-browser**

> Browser adapter for @opace/content-integrity-core: deterministic visible-text projection from the DOM and a module Worker client with cancellation. No telemetry, no remote modules; the Worker asset ships in the package. MIT.

**@opace/content-integrity-contracts**

> Frozen contract 1.0.0 types, constants and JSON Schema references for the Opace AI Content Integrity family. Build compatible clients without copying algorithms. MIT.

**@opace/content-integrity-client**

> Typed client for the Opace AI Content Integrity loopback API (127.0.0.1 only, bearer-token authenticated). MIT.

**@opace/content-integrity-cli**

> `opace-integrity`: scriptable offline content-integrity checks, protected-span extraction, comparisons and receipt verification, with text, JSON, JSONL and HTML output. Same deterministic engine as the browser surfaces. Node 20+, MIT.

**@opace/watermark-lab**

> A real, browser-runnable SynthID-Text known-key demo detector: faithful TypeScript port of Google DeepMind's Apache-2.0 reference detection mathematics plus a GPT-2 BPE tokeniser. Score any text against named public demo keys, watch the wrong-key collapse to the 0.5 null, and inspect per-token g-values. Demo keys only: this cannot verify or rule out Gemini or Claude watermarks, and a score near 0.5 never proves text is human-written. MIT (ported mathematics credited Apache-2.0).

---

## 4. Astro integration directory

> **Content-integrity evidence in your Dev Toolbar and build.**
>
> The Opace AI Content Integrity integration adds a user-triggered Dev Toolbar check and hash-only build reports to any Astro site. It runs the same deterministic engine as every other Opace surface: invisible-Unicode and homoglyph forensics, named writing-signal rules with highlighted evidence, protected-fact extraction and versioned receipts. Checks run locally in the toolbar or the build process; content is never transmitted, and reports contain hashes rather than text. Results are named evidence with explicit unsupported states, not an authorship verdict. MIT-licensed, from Opace Digital Agency.

---

## 5. Generic boilerplate

### One-liner

> Free, local-first content-integrity checking: hidden AI fingerprints, named writing signals, protected facts and client-ready receipts, with no upload and no false certainty.

### 50-word

> Opace AI Content Integrity checks content before you publish: invisible Unicode fingerprints AI tools leave behind, named AI-style writing signals with highlighted evidence, and locked protection for names, prices, dates and links. Everything runs locally, free, with a receipt showing exactly what was checked. Evidence, never fake authorship verdicts.

### 200-word

> Opace AI Content Integrity is a free, open-source family of tools that checks content before publication, without uploading a word. One engine powers a web checker, WordPress plugin, Chrome extension, Astro integration and command line, so the same text gets the same answer everywhere.
>
> It finds what commercial AI detectors do not look for: invisible Unicode characters left behind by AI pipelines (415 code points across 38 rules), lookalike-letter substitutions, and chatbot artefacts such as exposed citation tokens and unfilled placeholders. Its writing-signal tier scores drafts against 103 weighted editorial rule categories, highlighting the exact phrases and structures that triggered, so writers fix the writing instead of arguing with a percentage. Protected-fact extraction locks names, figures, dates, quotations, citations and code through any rewrite, and every analysis produces a hash-based receipt recording precisely which checks ran, at which versions, with which results.
>
> The honesty is the point. A clean result reads "no strong AI-style signals", never "human-written", because no rule tier can prove authorship; a trained local model for that harder class is in development. Checks that cannot run are shown as unavailable, never as passed. Built by Opace Digital Agency on credited MIT and Apache-2.0 foundations.

---

## 6. Claims ladder (binding)

From the commercial-detector study, each claim becomes usable only when its evidence exists. Listing copy above uses only the first row.

| Claim | Status | Evidence gate |
|---|---|---|
| "The most complete free content checker" (detection signals + hidden characters + fact protection + receipts in one) | **Claimable now** | Feature truth: no free tool combines these today |
| "Beats every free tool" / "the most capable free AI checker" | Not yet | Public benchmark run against the free field, published with the corpus version, after the Tier C model ships |
| "Real AI detection, free and private, approaching commercial accuracy" | Not yet | First calibrated model cycle with a versioned benchmark publishing FPR/TPR |
| "Matches the paid tools when you connect them" | Not yet | BYOK adapters live and rendering providers' attributed scores |
| "As accurate as the leading paid detectors" (unqualified) | Not near-term | Only if the published Integrity Index proves it; never pre-claim |

Never claim, on any channel: "guaranteed human", "undetectable", detector clearance by any provider not genuinely called, watermark removal, SEO safety, or that a probability proves authorship. The full boundary list is BRIEF §5 in the programme documents; the honest-limitations section of the [README](README.md) is its public form.
