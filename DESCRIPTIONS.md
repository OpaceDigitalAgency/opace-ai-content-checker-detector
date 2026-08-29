# Canonical listing descriptions

Ready-to-copy descriptions for every distribution channel. This file is the single source listing copy is pasted from, so WordPress.org, the Chrome Web Store, npm and the Astro integrations directory never drift from the engine's real capabilities. Check every claim against [docs/CAPABILITIES.md](docs/CAPABILITIES.md) before publishing; the claims ladder at the end of this file governs which claims are currently allowed.

**Mandatory footer lines** — include all three, verbatim in spirit, on every listing:

> The character, lookalike, protected-fact and writing checks run on your device and send nothing. The AI model check runs on our EU server by default, or entirely on your device if you choose — each result says which ran and how many words were sent. · Free, with no account and no API key. · Results are named evidence from named checks, not proof of authorship.


**Why the first line is worded that way.** It used to read "Your text is analysed locally and never
uploaded." That was true when every check ran in the browser and became false the day the AI model
check started defaulting to our EU server. Because this footer is required on every listing, the
false version propagated to WordPress, Chrome, npm and the website at once. **A privacy claim must
name the route it applies to.** No absolute that holds for only one route may ship here.

---

## 1. WordPress.org (readme.txt)

### Short description (under 150 characters)

> Find hidden AI fingerprints, flag AI-style writing signals and protect your facts. Local, private, explainable. Never uploads your content.

### Long description

**Opace AI Content Integrity** checks your content before you publish, entirely inside your own WordPress admin. Nothing is sent to a detection company. Nothing needs an account or an API key.

**What it finds**

- **Hidden characters.** Invisible Unicode characters (zero-width spaces, joiners, direction marks, tag characters and more: 415 code points across 38 rules) that AI pipelines and copy-paste chains leave behind, plus 60 lookalike-letter substitutions. The paid detectors do not even look for these.
- **Writing suggestions.** 116 named editorial rules (113 weighted categories including sentence-rhythm, cadence and chat-export formatting measures; 95 of the 116 fire on real documents, one is recorded inactive and twenty dormant — see docs/CAPABILITIES.md §3.4a) highlight exactly which phrases, structures and rhythms are worth a second look, so you can fix the writing rather than argue with a percentage. These are editing observations, not a detection result: measured on 5,558 fresh long-form documents the same rules flag 24.8% of genuine human writing, so they are shown as suggestions and never counted toward an AI reading.
- **Chatbot artefacts.** Left-behind citation tokens, unfilled placeholders, tell-tale URL parameters and other near-certain traces of an AI drafting tool, several attributed to the model family that leaves them.
- **Protected facts.** Names, prices, dates, times, URLs, email addresses, quotations, citations and code are extracted and locked, so nothing important gets broken while the writing is improved.
- **A receipt.** A hash-based report of exactly which checks ran, at which versions, with which results: evidence you can hand to a client.

**What it will honestly not tell you**

No rule-based tool can prove who wrote a text, and this plugin never pretends to. A clean result means "no strong AI-style signals", not "written by a human". The writing rules detect register and formatting rather than authorship, which is why they are presented as editing feedback and not as a verdict: on fresh long-form documents they reach 45.1% detection at a 24.8% human false-positive rate. Catching carefully prompted prose needs a trained model. That model runs locally in the free Opace web checker, measured at 90.3% detection and 1.34% false positives on 5,558 documents it had never seen, with those figures disclosed on every result; a plugin release follows the same local, consent-first rules. Hidden characters are reported as evidence that something wrote into the text, never as evidence that a machine composed it. Checks that cannot run are shown as unavailable, never as passed.

**Where it is weakest, measured.** Human fiction is the worst case for the trained model in the browser checker: 33 of 260 human stories were wrongly flagged, 12.69%, and the model was deliberately never trained on human fiction because no matched human corpus existed. Detection collapses on short text: 67% at 200 words, 50% at 150, 19% at 100, although short human text is not falsely flagged (0 of 400 at 60-200 words). A machine rewrite of a human original is caught about one time in three, 30-35%. Human academic prose is wrongly flagged at 3.81% for discussion sections (16 of 420) and 2.78% for conclusions (10 of 360); literature reviews and student essays are clean at 0 of 225 and 0 of 420. Business reports rest on 72 held-out rows at AUROC 0.69 and are not settled. Do not rely on this tool if you write fiction, if you are checking text under 200 words, or if you are about to make an academic misconduct decision about a single student.

Built by [Opace Digital Agency](https://opace.agency/) on open, credited foundations, because reusing existing open-source work was a deliberate choice: avoid-ai-writing (MIT, Conor Bronsdon and contributors) for the rules, stylometrics and classifier logic; watermarks-remover (MIT, Guillaume Meyer) for the carrier and confusable tables; Unicode Consortium character data; antislop-sampler (Apache-2.0), slop-forensics (MIT), SLOP_Detector (Apache-2.0), slop-gate (MIT), anti-ai-writing (MIT), anti-slop (MIT) and claude-slop-detector (MIT) for phrase and structural rule data; Wikipedia's *Signs of AI writing* (CC BY-SA 4.0); google-deepmind/synthid-text (Apache-2.0) and OpenAI GPT-2 (MIT) for the watermark lab; intfloat/e5-small (MIT) and the published Pangram Labs training recipe behind the model; and Project Gutenberg public-domain texts for the human-prose reference corpus. Several well-known detector repositories were cloned and read during research and are credited as read, not used: nothing derives from fast-detect-gpt, Binoculars, RADAR, DIPPER, ai-detector-bench, BIRA, SIRA or MarkLLM. Full records: [THIRD_PARTY_NOTICES.md](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/THIRD_PARTY_NOTICES.md).

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
> Opace AI Content Integrity inspects the text you select (or the visible page) for invisible Unicode characters that AI pipelines leave behind (38 rules, 415 code points), lookalike-letter substitutions, chatbot artefacts such as exposed citation tokens and unfilled placeholders, and 116 named AI-style writing signals (95 of which fire on real documents; the inventory is published) with a 0–100 score and highlighted evidence.
>
> Everything runs inside the extension. No account, no API key, no server, no telemetry. Results name each check, its version and its limitations, and a clean result is reported honestly as "no strong AI-style signals", never as proof a human wrote it.
>
> Where it is weakest, measured: the writing rules flag 24.8% of genuine human writing (1,200 human long-form documents), which is why they are shown as suggestions and never counted toward an AI reading. The trained model in the browser checker wrongly flags 12.69% of human fiction (33 of 260 stories), falls to 19% detection at 100 words, and catches a machine rewrite of a human original only 30-35% of the time. Do not rely on it if you write fiction, if your text is under 200 words, or for an academic misconduct decision about one student. Full list: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#honest-limitations
>
> Built by Opace Digital Agency on credited open-source foundations, by deliberate choice: avoid-ai-writing (MIT), watermarks-remover (MIT), Unicode Consortium data, antislop-sampler, slop-forensics, SLOP_Detector, slop-gate, anti-ai-writing, anti-slop, claude-slop-detector, Wikipedia's Signs of AI writing (CC BY-SA 4.0), google-deepmind/synthid-text (Apache-2.0) and OpenAI GPT-2 (MIT). Detector repositories such as fast-detect-gpt and Binoculars were read during research and are credited as read, not used. Full records: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/THIRD_PARTY_NOTICES.md
>
> Your text is analysed locally and never uploaded. Not proof of authorship.

---

## 3. npm package blurbs

**@opace/content-integrity-core**

> Deterministic, offline content-integrity engine: invisible-Unicode and homoglyph forensics (415 code points, 60 confusables), 113 weighted writing-signal categories (116 named rules, including rhythm, cadence and chat-export formatting measures; 95 fire on real documents, 1 inactive and 20 dormant, inventory published) with a 0–100 editorial score, 12 protected-span kinds, reviewed safe fixes, diffs and RFC 8785 hash-only receipts. Browser and Node ESM, no network calls, no telemetry, MIT. Evidence, not authorship verdicts.

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

Every npm README carries the same two blocks verbatim: an **Attribution** list naming every project the engine reuses, with links and licences, and a **Where this is weakest** table carrying the measured figures with their denominators. A developer installing from npm should not have to find the repository to learn where the tool is weak or whose work it stands on.

---

## 4. Astro integration directory

> **Content-integrity evidence in your Dev Toolbar and build.**
>
> The Opace AI Content Integrity integration adds a user-triggered Dev Toolbar check and hash-only build reports to any Astro site. It runs the same deterministic engine as every other Opace surface: invisible-Unicode and homoglyph forensics, named writing-signal rules with highlighted evidence, protected-fact extraction and versioned receipts. Checks run locally in the toolbar or the build process; content is never transmitted, and reports contain hashes rather than text. Results are named evidence with explicit unsupported states, not an authorship verdict. MIT-licensed, from Opace Digital Agency.
>
> Measured limits: the writing rules flag 24.8% of genuine human long-form writing, so they are editorial suggestions and never an AI reading. The trained model, which runs in the browser checker rather than in this integration, wrongly flags 12.69% of human fiction (33 of 260 stories) and falls to 19% detection at 100 words. Full list: https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#honest-limitations
>
> Built on credited open-source work: avoid-ai-writing (MIT), watermarks-remover (MIT), Unicode Consortium data and around a dozen other projects named in https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/THIRD_PARTY_NOTICES.md.

---

## 5. Generic boilerplate

### One-liner

> Free, local-first content-integrity checking: hidden AI fingerprints, named writing signals, protected facts and client-ready receipts, with no upload and no false certainty.

### 50-word

> Opace AI Content Integrity checks content before you publish: invisible Unicode fingerprints AI tools leave behind, named AI-style writing signals with highlighted evidence, and locked protection for names, prices, dates and links. Everything runs locally, free, with a receipt showing exactly what was checked. Evidence, never fake authorship verdicts.

### 200-word

> Opace AI Content Integrity is a free, open-source family of tools that checks content before publication, without uploading a word. One engine powers a web checker, WordPress plugin, Chrome extension, Astro integration and command line, so the same text gets the same answer everywhere.
>
> It finds what commercial AI detectors do not look for: invisible Unicode characters left behind by AI pipelines (415 code points across 38 rules), lookalike-letter substitutions, and chatbot artefacts such as exposed citation tokens and unfilled placeholders. Its writing-suggestion tier runs 113 weighted editorial rule categories (116 named rules, including sentence-rhythm, cadence and chat-export formatting measures; 95 of them fire on real documents, and the one rule that cannot and the twenty that lie dormant are named in the published inventory), highlighting the exact phrases and structures worth revisiting, so writers fix the writing instead of arguing with a percentage. Those rules are editing feedback, not detection: measured on 5,558 fresh long-form documents they flag 24.8% of genuine human writing, so they are never counted toward an AI reading. Protected-fact extraction locks names, figures, dates, quotations, citations and code through any rewrite, and every analysis produces a hash-based receipt recording precisely which checks ran, at which versions, with which results. On the web checker, uploaded images and PDF files also get a local C2PA Content Credentials read; a trained model can be downloaded on explicit consent to score clean prose, with its measured accuracy always shown; and every assessment runs the published SynthID-Text watermark mathematics against three public demo keys in the browser, reporting the per-key result rather than a claim. Provider production keys are private, so that watermark is reported as not assessed rather than guessed.
>
> The honesty is the point. A clean result reads "no strong AI-style signals", never "human-written", because no rule tier can prove authorship. The AI reading comes from the trained local model alone, which runs in the browser checker on explicit consent with its measured accuracy disclosed on every result: 90.3% of AI writing detected and 1.34% of human writing wrongly flagged, measured through the shipped browser runtime on 5,558 long-form documents the model had never seen. Detection falls away below 200 words and the page says so. Checks that cannot run are shown as unavailable, never as passed. Built by Opace Digital Agency on credited MIT and Apache-2.0 foundations.

---

## 6. Claims ladder (binding)

**Currency note, 29 August 2026.** The 90.3% / 1.34% pair below was measured through the shipped
browser runtime on 5,558 unseen documents *before segmentation existed* — one truncated pass per
document rather than segment by segment. On the same 5,558 documents the segmented fp32 reference
route now reads 96.9% detection at 2.09% false positives at threshold 0.980, and 95.1% at 1.21%
at 0.984. The browser runtime's own segmented curve over the full corpus has not been measured
(about five hours of compute), so the browser figures remain the ones quoted publicly and should
be read as a floor rather than as current. Do not swap in the fp32 figures on a listing: they
come from a different route at a different threshold.


From the commercial-detector study, each claim becomes usable only when its evidence exists. Listing copy above uses only the first row.

| Claim | Status | Evidence gate |
|---|---|---|
| "The most complete free content checker" (detection signals + hidden characters + fact protection + receipts in one) | **Claimable now** | Feature truth: no free tool combines these today |
| "Beats every free tool" / "the most capable free AI checker" | Not yet | Public benchmark run against the free field, published with the corpus version |
| "Real AI detection, free and private" | **Claimable now** | Cycle-2 model, browser-measured 90.3% detection at 1.34% human false positives on 5,558 unseen long-form documents (`services/local-engine/research/longform-corpus/`, `services/local-engine/research/cycle2-train/`) |
| A specific measured rate, stated with its corpus, its false-positive rate and its conditions (for example "90.3% of AI writing detected and 1.34% of human writing wrongly flagged, measured through the shipped browser runtime on 5,558 long-form documents the model had never seen, with detection falling to 67% at 200 words and 19% at 100, and 12.69% of human fiction wrongly flagged") | **Claimable now** | `services/local-engine/research/cycle2-train/CYCLE2-REPORT.md` and `services/local-engine/research/longform-corpus/` |
| The same rate quoted without its false-positive figure, its corpus or the short-text caveat | Never | A rate without its conditions is a marketing number, not a measurement |
| Any rules-tier detection rate quoted as an AI-detection figure (for example the superseded "66.7% at zero false positives") | Never | The rules tier measures 45.1% detection at a 24.8% human false-positive rate on fresh long-form data and was demoted to editorial suggestions on 28 August 2026 |
| "This text contains hidden characters, therefore it is AI" | Never | Character forensics prove text manipulation, not AI origin; the engine keeps the two on separate axes and enforces it at runtime |
| "Matches the paid tools when you connect them" | Not yet | BYOK adapters live and rendering providers' attributed scores |
| "As accurate as the leading paid detectors" (unqualified) | Not near-term | Only if the published Integrity Index proves it; never pre-claim |

Every listing must also carry the weakest-case figure for the register it is most likely to be read by. A listing that quotes 90.3% detection without the 12.69% fiction false-positive rate, the short-text collapse and the 30-35% rewrite figure is a marketing number with the conditions stripped off, and is not permitted.

Never claim, on any channel: "guaranteed human", "undetectable", detector clearance by any provider not genuinely called, watermark removal, SEO safety, or that a probability proves authorship. The full boundary list is BRIEF §5 in the programme documents; the honest-limitations section of the [README](README.md) is its public form.
