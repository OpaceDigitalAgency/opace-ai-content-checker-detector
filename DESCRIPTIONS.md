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

## 0. The evidence block (paste this wherever a rate appears)

**Every channel that quotes a detection rate must carry this block, or a link plus the weakest
case.** It exists so the three surfaces stop drifting: change it here, then propagate. A rate
without its weakest case is a marketing number and is not permitted anywhere (see §6).

> **Measured, at the operating point that ships.** On the full 5,558-document long-form evaluation
> corpus, Cycle 5 flags **902 of 922 AI documents (97.8%)** on our EU server route and **900 of 922
> (97.6%)** in the browser, while wrongly flagging **46 of 4,636 human documents (0.99%)** on the
> server and **73 of 4,636 (1.57%)** in the browser. This corpus is not wholly independent: 654 of
> the 922 AI documents are independent of every Cycle 2 split and 268 are not; 11 of 4,636 human
> documents overlap. On the separate topic-matched held-out slice, the server route flags 153 of
> 176 AI documents and 1 of 418 structured human partners.
>
> **Fiction remains higher-risk than the overall human set.** **7 of 227 human stories (3.1%)** are
> wrongly flagged on the server route and **8 of 227 (3.5%)** in the browser. Novelists should
> treat a flagged result as evidence to review, never an authorship decision.
>
> **Short text is improved, but the measured cell is small.** At 100 words the server evaluation
> route detects **43 of 56 held-out AI passages (76.8%)**. Do not generalise that figure without
> its denominator.
>
> **Heavy AI edits of human originals** are deliberately treated as machine-assisted and **39 of
> 137 (28.5%)** are flagged. That boundary is a product judgement, not proof of authorship.
>
> Every measured rate, by document length, by the model that wrote the text and by content type,
> each with its denominator and a 95% confidence interval:
> https://opace.agency/tools/ai/content-verification-integrity/research/detection-rates/

**Where a surface is too small for both halves, it gets the weakest case and the link, never the
headline alone.** That is the rule the claims ladder in §6 enforces.

**Operating points are not interchangeable, and every legacy figure in this file names its own.**
The 90.3%/1.34% pair is the pre-segmentation Cycle 2 browser runtime. The 12.69% fiction figure is
Cycle 2 at the 0.980 flag point, and 11.15% (29/260) is its superseded single-threshold 0.984 rule.
**Cycle 5 at the deployed margin rule reads 7/227 = 3.1% on the server route and 8/227 = 3.5% in
the browser.** Do not place a row from one operating point beside a row from another.

---

## 1. WordPress.org (readme.txt)

### Short description (under 150 characters)

> Find hidden AI fingerprints, flag AI-style writing signals and protect your facts. Explainable, with every check named. Character and writing checks stay on your device; the AI model runs on our EU server, or on your device if you choose.

### Long description

**Opace AI Content Checker & Detector** checks your content before you publish, entirely inside your own WordPress admin. Nothing is sent to a detection company. Nothing needs an account or an API key.

**What it finds**

- **Hidden characters.** Invisible Unicode characters (zero-width spaces, joiners, direction marks, tag characters and more: 415 code points across 38 rules) that AI pipelines and copy-paste chains leave behind, plus 60 lookalike-letter substitutions. The paid detectors do not even look for these.
- **Writing suggestions.** 116 named editorial rules (113 weighted categories including sentence-rhythm, cadence and chat-export formatting measures; 95 of the 116 fire on real documents, one is recorded inactive and twenty dormant — see docs/CAPABILITIES.md §3.4a) highlight exactly which phrases, structures and rhythms are worth a second look, so you can fix the writing rather than argue with a percentage. These are editing observations, not a detection result: measured on 5,558 fresh long-form documents the same rules flag 24.8% of genuine human writing, so they are shown as suggestions and never counted toward an AI reading.
- **Chatbot artefacts.** Left-behind citation tokens, unfilled placeholders, tell-tale URL parameters and other near-certain traces of an AI drafting tool, several attributed to the model family that leaves them.
- **Protected facts.** Names, prices, dates, times, URLs, email addresses, quotations, citations and code are extracted and locked, so nothing important gets broken while the writing is improved.
- **A receipt.** A hash-based report of exactly which checks ran, at which versions, with which results: evidence you can hand to a client.

**What it will honestly not tell you**

No rule-based tool can prove who wrote a text, and this plugin never pretends to. A clean result means "no strong AI-style signals", not "written by a human". The writing rules detect register and formatting rather than authorship, which is why they are presented as editing feedback and not as a verdict: on fresh long-form documents they reach 45.1% detection at a 24.8% human false-positive rate. Catching carefully prompted prose needs a trained model. Cycle 5 runs on our EU server by default in the free Opace web checker, or on your device if you choose: it flags 902/922 AI documents and 46/4,636 human documents on the server, and 900/922 AI plus 73/4,636 human in the browser. The full evaluation corpus includes the measured overlap disclosed in §0, and every result names its route. Hidden characters are reported as evidence that something wrote into the text, never as evidence that a machine composed it. Checks that cannot run are shown as unavailable, never as passed.

**Where it is weakest, measured, at the operating point that ships.** Fiction remains higher-risk than the overall human set: 7/227 stories are wrongly flagged on the server and 8/227 in the browser. The 100-word server cell detects 43/56 AI passages, so its improved 76.8% rate still carries a wide small-sample uncertainty. Heavy AI edits of human originals flag 39/137 (28.5%), while the academic human false-positive rate is 15/1,992 (0.8%) on the Cycle 5 server evaluation view. Every measured rate, by length, by model and by content type, each with its denominator and a 95% confidence interval: https://opace.agency/tools/ai/content-verification-integrity/research/detection-rates/ Do not rely on this tool for an academic misconduct decision about a single student.

Built by [Opace Digital Agency](https://opace.agency/) on open, credited foundations, because reusing existing open-source work was a deliberate choice: avoid-ai-writing (MIT, Conor Bronsdon and contributors) for the rules, stylometrics and classifier logic; watermarks-remover (MIT, Guillaume Meyer) for the carrier and confusable tables; Unicode Consortium character data; antislop-sampler (Apache-2.0), slop-forensics (MIT), SLOP_Detector (Apache-2.0), slop-gate (MIT), anti-ai-writing (MIT), anti-slop (MIT) and claude-slop-detector (MIT) for phrase and structural rule data; Wikipedia's *Signs of AI writing* (CC BY-SA 4.0); google-deepmind/synthid-text (Apache-2.0) and OpenAI GPT-2 (MIT) for the watermark lab; intfloat/e5-small (MIT) and the published Pangram Labs training recipe behind the model; and Project Gutenberg public-domain texts for the human-prose reference corpus. Several well-known detector repositories were cloned and read during research and are credited as read, not used: nothing derives from fast-detect-gpt, Binoculars, RADAR, DIPPER, ai-detector-bench, BIRA, SIRA or MarkLLM. Full records: [THIRD_PARTY_NOTICES.md](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/THIRD_PARTY_NOTICES.md).

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
> Opace AI Content Checker & Detector inspects the text you select (or the visible page) for invisible Unicode characters that AI pipelines leave behind (38 rules, 415 code points), lookalike-letter substitutions, chatbot artefacts such as exposed citation tokens and unfilled placeholders, and 116 named AI-style writing signals (95 of which fire on real documents; the inventory is published) with a 0–100 score and highlighted evidence.
>
> Everything runs inside the extension. No account, no API key, no server, no telemetry. Results name each check, its version and its limitations, and a clean result is reported honestly as "no strong AI-style signals", never as proof a human wrote it.
>
> Where it is weakest, measured at the operating point that ships: the writing rules flag 24.8% of genuine human writing (1,200 human long-form documents), which is why they are shown as suggestions and never counted toward an AI reading. Cycle 5 wrongly flags 7/227 human stories on the server and 8/227 in the browser; the 100-word server cell detects 43/56 AI passages; and heavy AI edits of human originals flag 39/137. Do not rely on it for an academic misconduct decision about one student. Every measured rate, with denominators and confidence intervals: https://opace.agency/tools/ai/content-verification-integrity/research/detection-rates/ · Full weakness list: https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#honest-limitations
>
> Built by Opace Digital Agency on credited open-source foundations, by deliberate choice: avoid-ai-writing (MIT), watermarks-remover (MIT), Unicode Consortium data, antislop-sampler, slop-forensics, SLOP_Detector, slop-gate, anti-ai-writing, anti-slop, claude-slop-detector, Wikipedia's Signs of AI writing (CC BY-SA 4.0), google-deepmind/synthid-text (Apache-2.0) and OpenAI GPT-2 (MIT). Detector repositories such as fast-detect-gpt and Binoculars were read during research and are credited as read, not used. Full records: https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/THIRD_PARTY_NOTICES.md
>
> Character, lookalike and writing checks run on your device. The AI model runs on our EU server, or on your device if you prefer. Not proof of authorship.

---

## 3. npm package blurbs

**@opacedev/ai-content-checker-core**

> Deterministic, offline content-integrity engine: invisible-Unicode and homoglyph forensics (415 code points, 60 confusables), 113 weighted writing-signal categories (116 named rules, including rhythm, cadence and chat-export formatting measures; 95 fire on real documents, 1 inactive and 20 dormant, inventory published) with a 0–100 editorial score, 12 protected-span kinds, reviewed safe fixes, diffs and RFC 8785 hash-only receipts. Browser and Node ESM, no network calls, no telemetry, MIT. Evidence, not authorship verdicts.

**@opacedev/ai-content-checker-browser**

> Browser adapter for @opacedev/ai-content-checker-core: deterministic visible-text projection from the DOM and a module Worker client with cancellation. No telemetry, no remote modules; the Worker asset ships in the package. MIT.

**@opacedev/ai-content-checker-contracts**

> Frozen contract 1.0.0 types, constants and JSON Schema references for the Opace AI Content Checker & Detector family. Build compatible clients without copying algorithms. MIT.

**@opacedev/ai-content-checker-client**

> Typed client for the Opace AI Content Checker & Detector loopback API (127.0.0.1 only, bearer-token authenticated). MIT.

**@opacedev/ai-content-checker-cli**

> `opace-integrity`: scriptable offline content-integrity checks, protected-span extraction, comparisons and receipt verification, with text, JSON, JSONL and HTML output. Same deterministic engine as the browser surfaces. Node 20+, MIT.

**@opace/watermark-lab**

> A real, browser-runnable SynthID-Text known-key demo detector: faithful TypeScript port of Google DeepMind's Apache-2.0 reference detection mathematics plus a GPT-2 BPE tokeniser. Score any text against named public demo keys, watch the wrong-key collapse to the 0.5 null, and inspect per-token g-values. Demo keys only: this cannot verify or rule out Gemini or Claude watermarks, and a score near 0.5 never proves text is human-written. MIT (ported mathematics credited Apache-2.0).

Every npm README carries the same two blocks verbatim: an **Attribution** list naming every project the engine reuses, with links and licences, and a **Where this is weakest** table carrying the measured figures with their denominators. A developer installing from npm should not have to find the repository to learn where the tool is weak or whose work it stands on.

---

## 4. Astro integration directory

> **Content-integrity evidence in your Dev Toolbar and build.**
>
> Opace AI Content Checker & Detector for Astro adds a user-triggered Dev Toolbar checker and hash-only unattended build reports to any Astro site. The toolbar shares the canonical Cycle-5 contracts, five-band result, three evidence axes and complete scored-section presentation used across Opace surfaces. It runs the pinned int8 model in the browser only after explicit consent to the model, vocabulary and runtime download; page text is not uploaded. Its separate build scan stays deterministic and content-free. Results are named evidence with explicit unsupported states, not an authorship verdict. MIT-licensed, from Opace Digital Agency.
>
> Measured limits: the writing rules flag 24.8% of genuine human long-form writing, so they are editorial suggestions and never an AI reading. The Cycle-5 model wrongly flags 7/227 human stories on the fp32 server evaluation route and 5/227 in the int8 browser route; its 100-word cells detect 43/56 and 39/56 held-out AI passages respectively. The routes share contracts but have separately measured precision and do not promise byte-identical scores. Full list: https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#honest-limitations
>
> Built on credited open-source work: avoid-ai-writing (MIT), watermarks-remover (MIT), Unicode Consortium data and around a dozen other projects named in https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/THIRD_PARTY_NOTICES.md.

---

## 5. Generic boilerplate

### One-liner

> Free, local-first content-integrity checking: hidden-character evidence, named writing signals, protected facts and receipts, with explicit route choices and no false certainty.

### 50-word

> Opace AI Content Checker & Detector checks content before you publish: invisible Unicode fingerprints AI tools leave behind, named AI-style writing signals with highlighted evidence, and locked protection for names, prices, dates and links. The character, lookalike and protected-fact checks run on your device; the AI model runs on our EU server by default or on your device if you choose. Free, with a receipt showing exactly what was checked and which route ran. Evidence, never fake authorship verdicts.

### 200-word

> Opace AI Content Checker & Detector is a free, open-source family of tools that checks content before publication. The tools share versioned result, segmentation, input and scoring contracts. User-facing checkers can run Cycle 5 on-device or through a separately consented EU route where that channel is enabled; deterministic libraries and unattended Astro build checks remain clearly labelled primitives. Fp32 server and int8 browser scores are measured separately, so shared semantics do not imply identical bytes or answers on every route.
>
> It finds what commercial AI detectors do not look for: invisible Unicode characters left behind by AI pipelines (415 code points across 38 rules), lookalike-letter substitutions, and chatbot artefacts such as exposed citation tokens and unfilled placeholders. Its writing-suggestion tier runs 113 weighted editorial rule categories (116 named rules, including sentence-rhythm, cadence and chat-export formatting measures; 95 of them fire on real documents, and the one rule that cannot and the twenty that lie dormant are named in the published inventory), highlighting the exact phrases and structures worth revisiting, so writers fix the writing instead of arguing with a percentage. Those rules are editing feedback, not detection: measured on 5,558 fresh long-form documents they flag 24.8% of genuine human writing, so they are never counted toward an AI reading. Protected-fact extraction locks names, figures, dates, quotations, citations and code through any rewrite, and every analysis produces a hash-based receipt recording precisely which checks ran, at which versions, with which results. On the web checker, uploaded images and PDF files also get a local C2PA Content Credentials read; a trained model can be downloaded on explicit consent to score clean prose, with its measured accuracy always shown; and every assessment runs the published SynthID-Text watermark mathematics against three public demo keys in the browser, reporting the per-key result rather than a claim. Provider production keys are private, so that watermark is reported as not assessed rather than guessed.
>
> The honesty is the point. A clean result reads "no strong AI-style signals", never "human-written", because no rule tier can prove authorship. Cycle 5 runs in the browser checker on explicit consent and reports 900/922 AI documents flagged at 73/4,636 human false positives. The full evaluation corpus includes the measured overlap disclosed in §0; the separate topic-matched held-out slice is reported alongside it. Checks that cannot run are shown as unavailable, never as passed. Built by Opace Digital Agency on credited MIT and Apache-2.0 foundations.

---

## 6. Claims ladder (binding)

**Currency note, 1 September 2026.** Cycle 5 and the margin rule `max(m1,m2+0.34) >= 3.571`
supersede the Cycle 2 probability thresholds and every earlier listing figure. Server and browser
results are measured separately and must not be substituted for each other. The full-corpus
headline must carry the measured overlap in §0; the topic-matched held-out slice is the independent
evasion measurement.


From the commercial-detector study, each claim becomes usable only when its evidence exists. Listing copy above uses only the first row.

| Claim | Status | Evidence gate |
|---|---|---|
| "The most complete free content checker" (detection signals + hidden characters + fact protection + receipts in one) | **Claimable now** | Feature truth: no free tool combines these today |
| "Beats every free tool" / "the most capable free AI checker" | Not yet | Public benchmark run against the free field, published with the corpus version |
| "Real AI detection, free and private" | **Claimable now** | Cycle 5 (`tier3-cycle5-v1`, deployed 1 September 2026), browser-measured 97.6% detection (900/922) at 1.57% human false positives (73/4,636) on the full 5,558-document long-form evaluation corpus, with its measured overlap disclosed in §0. The independent topic-matched held-out slice is 153/176 AI at 1/418 structured human false positives on the server route. *Superseded: Cycle 2's 90.3%/1.34% browser pair must not be quoted as current.* |
| A specific measured rate, stated with its corpus, false-positive rate and conditions (for example: "Cycle 5 flags 902/922 AI documents and 46/4,636 human documents on the EU server route at the margin-space operating point deployed 1 September 2026; 654/922 AI documents are independent of every Cycle 2 split and 268 are not, while 11/4,636 human documents overlap") | **Claimable now** | `services/local-engine/research/cycle5-train/CYCLE5-REPORT.md` plus the deployed-manifest overlap record. The current 100-word server cell is 43/56 and current fiction is 7/227 server, 8/227 browser; older Cycle 2 length and fiction figures are historical only. |
| The same rate quoted without its false-positive figure, its corpus or the short-text caveat | Never | A rate without its conditions is a marketing number, not a measurement |
| Any rules-tier detection rate quoted as an AI-detection figure (for example the superseded "66.7% at zero false positives") | Never | The rules tier measures 45.1% detection at a 24.8% human false-positive rate on fresh long-form data and was demoted to editorial suggestions on 28 August 2026 |
| "This text contains hidden characters, therefore it is AI" | Never | Character forensics prove text manipulation, not AI origin; the engine keeps the two on separate axes and enforces it at runtime |
| "Matches the paid tools when you connect them" | Not yet | BYOK adapters live and rendering providers' attributed scores |
| "As accurate as the leading paid detectors" (unqualified) | Not near-term | Only if the published Integrity Index proves it; never pre-claim |

Every listing must also carry the weakest-case figure for the content type it is most likely to be read by, and must name the operating point every figure came from. A listing that quotes a detection rate without the fiction, short-text, heavy-edit and overlap boundaries is a marketing number with the conditions stripped off, and is not permitted. **Use the evidence block in §0 rather than assembling one**: it carries the current per-route figures and the independent matched-slice result. Older Cycle 2 fiction, length and probability-threshold figures are historical only.

Never claim, on any channel: "guaranteed human", "undetectable", detector clearance by any provider not genuinely called, watermark removal, SEO safety, or that a probability proves authorship. The full boundary list is BRIEF §5 in the programme documents; the honest-limitations section of the [README](README.md) is its public form.
