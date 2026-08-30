# Correctness audit — published surfaces, 30 August 2026

Scope: every published surface of the content-integrity programme across two repositories —
the website (`opace-website/astro-latest`) and this engine repository — audited for broken
links, dead repository paths, superseded figures, internal contradictions, and version and
date coherence. Commissioned as the correctness gate before a single-pass owner test.

**This was a read-and-report pass.** Nothing was edited. Every finding below names a file and
a line so it can be routed to whoever owns it. Where a figure is wrong but the correct value
could not be traced to an artefact, that is said explicitly rather than guessed.

Both repositories were at `origin/main` with nothing to pull at audit time
(website `293cbe09`, engine `11e3821`).

**Re-verified at engine `b237993`.** Two commits landed mid-audit — `ec3f24e` and `b237993`,
which imported 45 documents into `docs/measurements/` and `docs/programme/design/`, repointed
the bulk of the `.agent/` citations, fixed relative links under `docs/`, and widened the claim
guard. Every finding that touches those areas (1, 7, 9, 20, 21, 22) was re-run against the new
tree and the numbers below are the post-commit ones. Findings 2–6 are in the website repo or in
files those commits did not touch.

**Evidence basis of each finding.** Findings marked **[verified]** were checked by me directly
against the file or by HTTP request. Findings marked **[reported]** came from a parallel sweep
and were spot-checked but not exhaustively re-read line by line; where a spot-check corrected
the original, that is recorded in place. One relayed citation was wrong and is corrected in
finding 9 — treat the **[reported]** tier accordingly.

---

## How the probes were proved

An audit that would stay silent through a 404 is broken by definition, so each probe was
shown to detect failure before any clean result from it was trusted.

| Probe | Negative control | Result |
|---|---|---|
| Production HTTP | `https://opace.agency/definitely-not-a-real-page-xyz-9182/` | **404** |
| Production HTTP | `.../research/nope/` | **404** |
| GitHub anonymous | `.../blob/main/docs/NO-SUCH-FILE.md` | **404** |
| External link probe | `https://opace.agency/definitely-not-real-xyz-9182` vs `https://example.com/` | **404 / 200** |
| Claims guard | its own built-in "can detect a banned claim" test | **passes** |

Repository-path resolution was done by script against `git ls-files`, resolving each cited
path relative to both the git root and the citing file's own directory, rather than by eye.

---

## Test result

Run twice: once at engine `11e3821` (audit start) and again at `b237993`, after another
session widened the guard's scope mid-audit.

```
# at 11e3821                          # at b237993 (current)
✔ website source carries no banned…   ✔ website source carries no banned claim
✔ the guard can actually detect a…    ✔ the guard can actually detect a banned claim
✔ a retraction may quote the claim…   ✔ the guard does not fire on the honest, negated form
                                      ✔ the guard reads the imported design corpus, mockups included
                                      ✔ a retraction may quote the claim it retracts
ℹ tests 3  pass 3  fail 0             ℹ tests 5  pass 5  fail 0
```

**Green both times — and that result is not evidence the surfaces are clean.** See finding 1.

---

## Ranked findings

### Tier 1 — user-facing and wrong

#### 1. The shipped-claims guard passes while every one of today's defects walks past it — [verified]

`implementation/tests/battery/shipped-claims-guard.test.mjs`

The guard has six rules. Not one of them covers this programme's actual recurring defect
class. Each of the following strings was tested against every rule in the file; all six were
**caught by nothing**:

| Live string | File | Caught? |
|---|---|---|
| `calibrated to zero false positives on a 44-text verified-human corpus` | `packages/core/README.md:11` | no |
| `detection at 200 / 150 / 100 words \| 67% / 50% / 19%` | 4 × `packages/*/README.md` | no |
| `Short text defeats it: 67% detected at 200 words, 50% at 150, 19% at 100.` | `extensions/submission/chrome-web-store/store-listing.md:41` | no |
| `33 of 260 human stories wrongly flagged, 12.69%` | same file, `:40` | no |
| `the shipped 0.984 flag point under segments-v2` | `astro-latest/public/models/local-signals-v1/thresholds.json:145` | no |
| `5,558 long-form documents the model had never seen` | same file, `:16` | no |

**Re-verified at `b237993`.** Another session widened the guard mid-audit: `.html` was added to
`SCANNED` (`:49`) and `docs/programme/design/` to a new `EXTRA_DIRS` (`:64`), so the imported
mockup corpus is now read. That is a real improvement and it closes a different hole. **Both
holes below survive it**, and the six probes above were re-run against the current rule set
with the same result: caught by nothing.

Two separate holes:

- **Scope.** `EXTRA_FILES` (`:66-72`) still covers only `DESCRIPTIONS.md`, `README.md`,
  `docs/WATERMARK-LAB.md`, the WordPress `readme.txt` and the Chrome `README.md`, plus the
  one new `EXTRA_DIRS` entry. It does **not** cover `packages/*/README.md` (five public npm
  listing surfaces) or `extensions/submission/**` (the Chrome Web Store copy) — confirmed by
  reading the current arrays. Those are exactly where the live banned claim in finding 3 sits.
  A further widening to all of `docs/` is reported as in flight by another session.
- **Rules.** The rule set is unchanged at six. There is a rule for `66.7%` and none for the
  retired operating points
  (`0.984`, `0.980`, `0.857`), the withdrawn length figures (`67% / 50% / 19%`), the
  retracted corpus wording (`had never seen`, `hash-quarantined`), or the superseded fiction
  figure (`12.69%`, `33 of 260`).

Note also that each rule uses `pattern.exec(text)` once per file, so a file with five
instances reports one.

**Route to:** whoever owns the battery. This is the highest-leverage fix in the report:
widening scope and adding rules would have caught findings 2, 3, 4 and 5 automatically.

---

#### 2. The WordPress plugin version on the live website is two releases behind the artefact — [verified]

The site states **1.0.4**. The plugin is **1.0.6**, and the engine repo is internally
consistent at 1.0.6 across header, `Stable tag`, `OPACE_CONTENT_INTEGRITY_VERSION`,
`package.json`, `CITATION.cff` and the newest changelog entry.

Live and wrong, verified by request — `https://opace.agency/tools/ai/content-verification-integrity/wordpress-plugin/`
returns `1.0.4` four times, and the suite index renders `Submission candidate 1.0.4`.

| Where | Line |
|---|---|
| `astro-latest/src/data/content-integrity.ts` | `:13`, `:52` |
| `astro-latest/src/pages/tools/ai/content-verification-integrity/wordpress-plugin.astro` | `:5`, `:7`, `:10` |

Correct value **1.0.6**, traced to
`implementation/wordpress/opace-ai-content-integrity/opace-ai-content-integrity.php:6`
and `readme.txt:7`.

The other three states are correct: Chrome 1.0.0, Astro 0.1.0 both match their artefacts.
The CLI is shown as "Publication candidate 0.1.0" against a source `package.json` of
`0.0.0-private`; that is by design (versions are rewritten at pack time,
`scripts/pack-public-developer-candidate.mjs:15`), so it is not a defect.

**Route to:** website owner. Not edited here — `content-integrity.ts` sits beside files
another session is actively changing.

---

#### 3. Withdrawn length figures and a banned zero-false-positive claim are live on public store listings — [verified]

The brief states the 67% / 50% / 19% length figures are **withdrawn** and must not be
quoted. They are quoted on six public distribution surfaces.

| File | Line | Text |
|---|---|---|
| `packages/core/README.md` | `:156` | `detection at 200 / 150 / 100 words \| 67% / 50% / 19% \| denominator not recorded; flagged for re-measurement` |
| `packages/cli/README.md` | `:101` | same row |
| `packages/browser/README.md` | `:111` | same row |
| `packages/astro/README.md` | `:153` | same row |
| `packages/watermark-lab/README.md` | `:56` | `detection collapsing to 19% at 100 words` |
| `extensions/submission/chrome-web-store/store-listing.md` | `:41` | `Short text defeats it: 67% detected at 200 words, 50% at 150, 19% at 100.` |

Each of the four table rows says the denominator was "not recorded; flagged for
re-measurement". **The re-measurement has since been done**: the shipped figures are
29/172 (16.9%) at 100–199 words and 193/228 (84.6%) at 300–399, with denominators, in
`astro-latest/public/models/local-signals-v1/thresholds.json` under
`measured.length_sensitivity`. That is a "not yet measured" note for something since
measured — the exact shape the brief asked for.

The same six surfaces carry the superseded fiction figure **12.69% / 33 of 260**
(`packages/core/README.md:155` and the four parallel rows; `store-listing.md:40`). The
current figure is 23/260 (8.8%) server, 26/260 (10.0%) browser, which the WordPress
`readme.txt` and `extensions/chrome/README.md:64-72` already carry — so the Chrome
submission bundle contradicts itself internally.

Separately, `packages/core/README.md:11` states the writing rules are
`calibrated to zero false positives on a 44-text verified-human corpus and on 169 held-out
human documents`. The same file at `:148` says those rules flag **24.8% of human writing**.
`DESCRIPTIONS.md:191` places any rules-tier zero-false-positive claim in the "Never" row of
the binding claims ladder, and this is precisely the claim the `no-human-flagged` guard rule
exists to block — it is simply not scanned there, and would not match the pattern even if it
were (finding 1).

**Route to:** listing owner. High priority: these are pasted into npm and the Chrome Web
Store, and are hard to retract once public.

---

#### 4. Per-register detection rates are 0.984 data rendered inside shipped-pair copy — [verified]

`astro-latest/public/models/local-signals-v1/thresholds.json:145` (and the identical copy
inlined into the deployed bundle) says:

> Both per-register blocks are the fp32 EU server route at **the shipped 0.984 flag point
> under segments-v2**, over the whole corpus, and **they sum to the corpus figures above**.

Both halves are false, provably and from the file's own contents:

- **0.984 is not shipped.** The shipped rule is the minimum-evidence pair 0.9855 / 0.9763,
  as the same file states at `:2`–`:11` and in `secondary_threshold`.
- **They do not sum to the corpus figures above.** The eight per-register values sum to
  **877**. The `headline` field immediately above (`measured.headline`) states **883/922**
  "at the operating point that ships". 877 is the 0.984 figure; 883 is the shipped one.
- `segments-v2` is stated where the shipped contract is `segments-v3` (which the same file
  uses at `:11`, `:25`, `:77`, `:98`).

This matters beyond the JSON. `per_register_ai_detected` is read by
`astro-latest/src/lib/local-signals/measured-figures.ts:222` (`registersByRate`) and
interpolated into the checker's measurement disclosure at
`astro-latest/src/components/tools/content-integrity/local-signals/local-signals-ui.ts:159`:

> `It is weakest on ${registersByRate(config,"weakest",2)}, and strongest on ${registersByRate(config,"strongest",3)}.`

That sentence sits in the same paragraph as `accuracySentence(route,threshold)`, which
describes the **shipped pair**, with no label marking the register rates as belonging to a
different operating point. `detection-rates.astro:106` warns in terms about exactly this:
*"Two operating points: do not place a row from one beside a row from the other."*

The code path is live: `TIER2_ENABLED` is `false` (`model-store.ts:63`), so the branch at
line 159 is the one that runs, and `local-signals-ui.ts` is imported by
`integrity-controller.ts:7`.

**Scope of what was verified, stated honestly.** The disclosure only renders once a result
exists, so it is not in the page's initial HTML and I did not observe it in a browser —
running a check requires a 34.5 MB model download. I confirmed the deployed bundle does
fetch `thresholds.json` at runtime and does read `per_register_ai_detected`. The arithmetic
mismatch (877 vs 883) is provable from the data regardless of when the sentence paints.

**Route to:** the session working in `local-signals-ui.ts` / `integrity-controller.ts`
(that file is modified in the working tree), plus whoever owns `thresholds.json`. Not
edited here: correcting it means writing new claim prose, not fixing a typo.

---

#### 5. The retracted "never seen" wording is still in the shipped artefact, served publicly — [verified]

Same file, `astro-latest/public/models/local-signals-v1/thresholds.json`, which is served at
`https://opace.agency/models/local-signals-v1/thresholds.json` (verified 200, and byte-identical
to `public/`).

| Line | Field | Stale text |
|---|---|---|
| `:14` | `training_data_note` | "The evaluation corpora **were never trained on**." |
| `:16` | `measured.note` | "5,558 long-form documents **the model had never seen** … **Threshold 0.984**, segmentation contract **segments-v2**" |
| `:61` | `server_fp32_segmented.note` | `segments-v2` |
| `:82` | `browser_int8_segmented.note` | `segments-v2` |

Line 14 is flatly contradicted 16 lines below by `corpus.independence_note` (`:30`), which
correctly records that 268 of 922 AI documents sit in a cycle-2 split, **168 of them in the
training split**. Two adjacent fields in one public file assert opposite things.

Neither `measured.note` nor `training_data_note` is rendered into page copy — only
`human_fiction_worst_case.note` is (`measured-figures.ts:346`) — so this is public-but-not-in-prose.
It is still the artefact the research pages send readers to as the open record.

`:16` also cites its source of record as a bare `CORPUS-RECONCILIATION-2026-08-29.md` with no
path, while `:30` cites `services/local-engine/research/corpus-reconciliation-2026-08-29/analysis.txt`
— an engine-repo-relative path quoted from a website file, unresolvable in either clone.

**Route to:** owner of `thresholds.json`.

---

### Tier 2 — internal, but load-bearing

#### 6. The published-claims registry is anchored to the retired operating point — [verified]

`astro-latest/src/lib/local-signals/measured-figures.ts:326-373`

`REQUIRED_CLAIM_KEYS` registers `by_threshold["0.984"]` rates for both runtimes
(`:340`, `:341`, `:344`, `:345`) and **does not register the shipped pair**
`by_threshold["0.9855/0.9763"]` at all. The mechanism whose stated purpose is that "adding a
surface that prints a new figure means adding its key here" therefore guards the retired
figures and not the shipped ones — and the retired block cannot be deleted from
`thresholds.json` without failing the assertion.

`per_register_ai_detected` is not registered either, despite being rendered (finding 4). The
registry has a hole precisely where the defect is.

**Route to:** owner of `measured-figures.ts`.

---

#### 7. Programme status documents still describe the retired operating point as live — [verified]

These are the source-of-truth documents other agents read first.

| File | Line | Text |
|---|---|---|
| `docs/programme/PROGRAMME-OVERVIEW.md` | `:15` | "At **the live operating point of 0.984** … on a fresh 5,558-document long-form corpus **the model had never seen** … **90.3%** detected, **1.34%** falsely flagged. Those are the figures the live page discloses." |
| `docs/programme/PROGRAMME-STATUS.md` | `:27` | "At **the live operating point 0.984** … **90.3% AI detection at 1.34% human false positives**. These are the figures the live page discloses." |

`PROGRAMME-STATUS.md:29` goes further and carries a whole passage headed **"Why the threshold
is 0.984 and not 0.98"**, arguing for the retired threshold as the current choice.

Both claims about what the live page discloses are false: the live pages disclose 883/922
(95.8%) and 45/4,636 (0.97%) at the shipped pair, verified in production.

**Re-verified at `b237993`**, after the docs rescue: all three lines are unchanged.

The retracted corpus wording appears in **17 further tracked documents**, including
`docs/CAPABILITIES.md:324,334,628`, `docs/TEST-EVIDENCE.md:99`,
`docs/EVIDENCE-INDEX.md:139`, `docs/decisions/OWNER-DECISIONS.md:14`,
`docs/programme/OBJECTIVE.md:213` and `docs/programme/BRIEF.md:835`. A separate group
(`docs/PER-MODEL-DETECTION.md:4,257`, `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md:4`,
`docs/research-drafts/how-the-corpus-was-built.md`) already carries the correction properly
and should be left alone.

`docs/legal/LAWFUL-BASIS-AND-TRANSPARENCY.md:515` quotes the retracted "documents the model
had never seen" wording inside a legal transparency document. Worth prioritising within this
group for that reason.

---

#### 8. `DESCRIPTIONS.md` — the declared single source for all listing copy — is behind its own artefact — [reported, key lines spot-checked]

| Line | Issue |
|---|---|
| `:75`, `:166` | WordPress long description and 200-word boilerplate quote **90.3% / 1.34%**, which the same file at `:47-51` classifies as the pre-segmentation `segments-v1` browser runtime, and which `:24-27` supersedes with 883/922 and 889/922. The shipped `readme.txt:55-60` already carries the correct figures. |
| `:144` | Astro directory blurb quotes "12.69% of human fiction (33 of 260 stories)" and "19% detection at 100 words" with no flag point named — which `:196` explicitly forbids. |
| `:188-189` | Claims-ladder evidence gates still gate on 90.3% / 1.34%. |
| `:59` | Under a heading reading "Short description (under 150 characters)", the line is **240 characters**. The shipped `readme.txt:11` is a compliant 111. |
| `:98` vs `:104` | "Everything runs inside the extension. No account, no API key, **no server**, no telemetry" — then four lines later, "The AI model runs on our EU server". The extension ships no model and no network: `extensions/chrome/dist/manifest.json` requests no `host_permissions`, `extensions/shared/capabilities.json` declares `"optional_host_permissions": []`. Root cause is `:5-7`, which makes the EU-server footer mandatory on every listing including two that have no server route. `readme.txt` and `store-listing.md` correctly omit it, so only `DESCRIPTIONS.md` is wrong. |

---

#### 9. "The browser segmented curve has not been measured" — false, stated three times — [verified — citation corrected]

`DESCRIPTIONS.md:176`, `README.md:79`, `README.md:590`.

It was measured. `docs/measurements/CORPUS-RECONCILIATION-2026-08-29.md:27` — "Both runtime
figures are new measurements made here, **both on all 5,558 documents**" — and section 6.2 at
`:316` is headed "The same curve, **int8 browser route, all 5,558 documents**", which is
precisely the curve the three passages say does not exist. It produced the 889/922 and
90/4,636 browser figures that `README.md:21-22` prints **58 lines above** the denial at
`README.md:79`.

*(Corrected during this audit: an earlier draft cited `:449` of that file for the
counter-evidence. That line does not carry it; `:27` and `:316` do. The finding stands, the
citation did not.)* Each
passage also calls the public browser figures `segments-v1` and "a floor", contradicting the
headline tables in the same documents.

---

#### 10. `README.md` "Honest limitations" is an operating point behind the listings that link to it — [verified]

`README.md:446` "current as of the `segments-v2` change"; `:451` "one human story in eight";
`:460` "**29 of 260 human stories were wrongly flagged: 11.2%** … at the server flag point of
**0.980**, under `segments-v2`".

`readme.txt`, `extensions/chrome/README.md` and `README.md:28` all say one in eleven, 23/260,
8.8%. A store reviewer following the "honest limitations" link from either listing lands on
the contradicting number.

---

#### 11. Stale submission bundles and hashes — [reported, not re-verified]

| Finding | Evidence |
|---|---|
| WordPress prep bundle is three versions behind | `dist/wordpress-submission-prep-1.0.4/readme.txt:7` Stable tag 1.0.4; `SUBMISSION-HANDOFF.md:13` instructs uploading the 1.0.4 zip; `LISTING-FIELDS.md:5`. Shipped is 1.0.6. `docs/RELEASE-STATE.md:193` already says the bundle needs regenerating. |
| Wrong URLs and wrong repo in the prep bundle | `LISTING-FIELDS.md:12-15` uses `/tools/ai/content-integrity/…` and repo `OpaceDigitalAgency/opace-content-integrity`; every current surface uses `/tools/ai/content-verification-integrity/…` and `opace-ai-content-verification-integrity-checker`. |
| Runbook creates the wrong repo | `submission-prep/submission-runbook.md:2`. Following it produces 404s inside a live listing. |
| Tags disagree | `LISTING-FIELDS.md:7` vs `readme.txt` tag list. |
| Chrome evidence hash does not match the ZIP | `extensions/EXT-30-EVIDENCE.md:5` names `061f5306…`; both on-disk ZIPs hash to `27272820…`, which `docs/TEST-EVIDENCE.md:79` and `docs/RELEASE-STATE.md:195` call current. |
| WP.org assets ZIP still 1.0.4 | `dist/opace-ai-content-integrity-wordpress-org-assets-1.0.4.zip` |

---

#### 12. Three source-of-truth documents disagree on whether the public GitHub repository exists — [verified by HTTP probe]

- `docs/RELEASE-STATE.md:27` — "public and MIT licensed since 29 August 2026 … The GitHub URL gate is met" (`:193`)
- `docs/TEST-EVIDENCE.md:81` — "the public repository does not exist"
- `STATUS.md:9` — lists it as still open
- `README.md:64` — "This repository is public"

**Resolved by probe: the repository is public.** Anonymous requests return 200 for the repo
root and for `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md`, `docs/PER-MODEL-DETECTION.md`,
`docs/WATERMARK-LAB.md` and `docs/EVIDENCE-INDEX.md`, with a 404 negative control. All nine
evidence documents linked from `detection-rates.astro:101-109` are tracked and pushed
(`origin/main` == `HEAD`), so every "open repository" citation on the research pages resolves.

`TEST-EVIDENCE.md:81` and `STATUS.md:9` are the stale ones.

---

#### 13. `segments-v2` / `segments-v3` labelling drift, and a third state for the same fact — [reported; website half verified]

`README.md:61,68,78,89,168,174,446,461,482,532` and `docs/CAPABILITIES.md:753,762,794` say
`segments-v2`; the shipped contract is `segments-v3`
(`services/local-engine/research/model-shrink/reference-server/segments.py:60`,
`docs/programme/HANDOVER.md:65`). Quantities are unaffected — v3 produces the identical
21,093 sections. Already logged unfixed at `docs/programme/RESEARCH-PAGES-PLAN.md:496,902`.

Three states for one fact: `docs/RELEASE-STATE.md:17` says a `segments-v3` deploy "is queued
by another session"; `HANDOVER.md:65` says both routes already run `segments-v3`;
`CHANGELOG.md:29` records a deployed `/v1/health` reporting `segments-v1`.

The `segments-v1` and `segments-v2` mentions in the **website** repo are all code comments
describing implementation history (`server-route.ts:425`, `engine.ts:120`,
`model-store.ts:226`, `verify/segment-ab.mts`) and are correct as written.

---

#### 14. Human corpus source count: three different numbers for the same corpus — [verified]

| Claim | Where |
|---|---|
| 7 sources named | `thresholds.json:24` — Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR, PERSUADE 2.0 |
| "**8** sources" | `astro-latest/src/data/content-integrity-detection-tables.json:11`; `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md:313` |
| "**9** sources" | same JSON `:12`; `DETECTION-BY-LENGTH-AND-MODEL.md:91`; `docs/programme/HANDOVER.md:151` |

The 9-source figure describes short-form human passages that are explicitly "cut from the
long-form corpus", so they cannot come from more sources than the long-form corpus has.

**I could not trace the correct value.** Checked `thresholds.json`,
`content-integrity-detection-tables.json`, `docs/CAPABILITIES.md:825`,
`docs/EVIDENCE-INDEX.md:139`, `docs/PER-MODEL-DETECTION.md:262` and
`docs/research-drafts/how-the-corpus-was-built.md:47`. The corpus manifest
(`services/local-engine/research/longform-corpus/MANIFEST.md`) is the place to settle it.
No correction is proposed here.

---

#### 15. Model config version disagrees with its own training report — [reported, not re-verified]

`services/local-engine/research/models/tier3-cycle2-config.json:2` and
`MODEL_AND_DATA_PROVENANCE.md:18` say `tier3-cycle2-v1`;
`services/local-engine/research/cycle2-train/train-report.json:2` and `train.py:242` emit
`tier3-cycle2-v2`. The shipped string is `tier3-cycle2-v1` (`thresholds.json:2`), so the
public surfaces are right and the training report is the outlier. Not quoted on any store
surface.

Also `MODEL_AND_DATA_PROVENANCE.md:26` gives the operating point as "0.984 calibrated
probability" under a header reading "Current as of 29 August 2026". The shipped rule is the
0.9855 / 0.9763 pair.

---

#### 16. e5-small licence status contradicts across public documents — [reported, not re-verified]

`README.md:637` and `DESCRIPTIONS.md:79` assert **MIT** on a store listing;
`MODEL_AND_DATA_PROVENANCE.md:39` says the licence "is not recorded in this repository — it
must be confirmed before public release", and `docs/legal/DEPENDENCY-LEDGER.md:80` says its
acceptable-use terms are not recorded anywhere.

---

#### 17. `STATUS.md` is stale on four rows — [reported, not re-verified]

`:5` says WordPress **1.0.4** passed its gates — shipped is 1.0.6, and
`docs/RELEASE-STATE.md:193` says none of the 1.0.4 evidence carries. `:9` lists Cloud Run
hosting and the public GitHub repository as open; both are live. `:19` npm and Astro manifest
hashes `f2e09e2e…` / `4a45e453…` are superseded by `ae143295…` / `0fd6716e…`.

---

### Tier 3 — repository paths that no clone can resolve

A scripted resolution pass over every tracked text file in both repositories, resolving each
cited path against both the git root and the citing file's own directory.

#### 18. A fresh clone of the website cannot build the content-integrity tool — [verified]

`astro-latest/src/components/tools/content-integrity/integrity-controller.ts:25` imports
`./ui/ShareResult`. `ShareResult.ts` exists on disk but is **untracked**, while its six
sibling `ui/*.ts` modules are tracked. This is in-flight work by another session and will
resolve when it commits — noted so nobody else chases it.

#### 19. Broken images on live project pages — [verified by HTTP probe]

Five assets, twelve citations, confirmed **404 in production**:

- `src/data/projects-relational/justice-upheld.json:37` → `justice-upheld_gallery_01_3-27.png`
  (siblings `_02`–`_10` exist; `_01` never landed)
- `src/data/projects-relational/really-awesome-coffee.json:53,57,61,65` → gallery `_10`–`_13`
  (only `_03`–`_07` exist)
- The same five duplicated in `src/data/projects-relational/_index.json:1366,2040,2044,2048,2052`

Not corrected here because the right remedy — supply the assets or delete the entries — is a
content decision, not a typo fix.

#### 20. The `.agent/` class — largely rescued; 7 citations remain — [verified]

At audit start the engine carried 81 raw `.agent/` occurrences. The rescue (`ec3f24e`,
`b237993`) has landed and **7 remain**, in 5 tracked files:

| File | Line |
|---|---|
| `docs/WATERMARK-LAB.md` | `:318` |
| `docs/programme/PROGRAMME-OVERVIEW.md` | `:87` |
| `docs/programme/design/README.md` | `:4`, `:40`, `:56` |
| `docs/programme/design/REDESIGN-BUILD-NOTES-2026-08-29.md` | `:7` |
| `services/local-engine/research/paraphrase-resilience/README.md` | `:4` |

Two notes for whoever signs that work off. First, the "68" the rescue was sized against was
never quite right: the defensible figure at audit start was **66 unique file+path pairs**
across 81 raw occurrences. Second, the **website** repo has its own 17 `.agent/` citations,
and there `.agent/` *is* tracked — so those are genuinely absent files, a different fault
from the engine's tracking failure, and they are not covered by this rescue.

#### 21. Distributed files citing paths that do not resolve — [verified]

| File | Line | Cited | Problem |
|---|---|---|---|
| `services/local-engine/README.md` | `:71` | `../../openapi/oaci-v1.yaml`, "the OpenAPI source of truth" | no such file anywhere in the repo. Correct path not traceable — not proposed. |
| `extensions/chrome/README.md` | `:127` | `../EXT-30-EVIDENCE.md` | **confirmed**: resolves on disk, `git ls-files` says **untracked** (gitignored by `.gitignore:19`, `**/*EVIDENCE*.md`) — invisible to anyone receiving the extension package |
| `extensions/submission/chrome-web-store/SUBMISSION-README.md` | `:34` | `../../EXT-30-EVIDENCE.md` | same |
| `THIRD_PARTY_NOTICES.md` | `:38` | `research/AI-TELLS-MEGA-PACK.md` | lives above `implementation/`, outside the repo |
| `CONTRIBUTING.md` | `:31` | `../v0.2-BUILD-LOG.md` | **confirmed**: resolves on disk in the outer workspace, untracked by this repo — unresolvable from a clone |
| `MODEL_AND_DATA_PROVENANCE.md` | `:74` | `services/local-engine/research/cycle2-corpus/corpus.jsonl` | on disk, gitignored |
| `docs/legal/LAWFUL-BASIS-AND-TRANSPARENCY.md` | `:577` | `src/components/tools/content-integrity/PrivacyRoute.ts` | exists in neither repo — a legal document citing a non-existent privacy route |
| `CHANGELOG.md` | `:14,17` | `assets/js/core.mjs`, `bin/build-plugin.sh` | WordPress-plugin-relative; real files are under `wordpress/opace-ai-content-integrity/` |
| `docs/RELEASE-STATE.md` | `:98,158,193` | same class | same |
| `docs/TEST-EVIDENCE.md` | `:81` | `tests/js/cross-runtime-parity.test.mjs` | same |
| `astro-latest/src/content/blog/vibe-coding-vs-agentic-coding.md` | `:175` | `src/data/locations.js` | published blog post citing a file that does not exist |

#### 22. Systematic path classes worth one scripted pass each — [verified]

- **`implementation/` prefixes, re-counted at `b237993`: 66 unique paths** cited across
  `docs/**/*.md`. **64 of them resolve by stripping the leading `implementation/` and nothing
  else** — a one-line scripted fix. Only two do not (`implementation/release`, and one
  truncated `corpus-reconciliation-.../raw/lf-` match), and those need a person. Sample sites —
  `docs/measurements/IMPLEMENTATION-RESEARCH-TRACEABILITY-MATRIX-2026-08-27.md:180,181,205-207`,
  `docs/programme/PROGRAMME-OVERVIEW.md:61,62,67`,
  `docs/programme/PHASE-2-NEXT-STEPS.md:85,139,183,261,282,284`,
  `docs/programme/HANDOVER.md:54,56`, `docs/programme/CLOUD-RUN-SETUP.md:110,170`,
  `docs/measurements/C2PA-TEXT-CREDENTIAL-CONFLICT-2026-08-29.md:36,190,191`,
  `docs/legal/LAWFUL-BASIS-AND-TRANSPARENCY.md:566`, `docs/EVIDENCE-INDEX.md:7`.
  Targets are tracked; only the leading `implementation/` needs stripping.
- **68 engine-doc citations into the outer workspace** (`specs/`, `strategy/`, `research/`,
  `evidence/`) — unresolvable from a clone. Largest cluster
  `docs/programme/PROGRAMME-OVERVIEW.md:42-68` (21 refs).
- **31 cross-repo citations into `astro-latest`** with no marker saying so.
- **297 citations in website agent-written audit docs** under `.agent/docs/opace/` — 205
  doubled `src/content/src/content/…` prefixes and 92 `services/<slug>.md` paths missing their
  `src/content/` prefix. Both fixable by string edit.
- **19 website docs** point at an absolute path outside the repo,
  `/Users/davidbryan/Dropbox/Opace-Sales-Marketing/_governance/WRITING_GUIDELINES_ANTI_AI_CONTENT.md`.

**Structural note.** Engine `.gitignore:17-19` (`.agent/`, `**/evidence/`, `**/*EVIDENCE*.md`)
plus `**/STATUS.md` and `PROJECT.md` guarantees this class keeps regenerating. The existing
`docs/EVIDENCE-INDEX.md` un-ignore exception shows the pattern has already been hit once.

---

## What checks out

Recorded so a later reader can tell a verified clean result from an unchecked one.

**Research page move — clean.** Both new URLs return **200**; all four redirects in
`public/_redirects:1017-1020` return **301** to the right destinations, verified against
production. (The repo-root `_redirects` is dead; `public/_redirects` is the live mechanism.)

**Research pages — figures correct in production.** `methodology` and `detection-rates` both
serve the shipped pair, 883/922, 45/4,636, 29/172 (16.9%), 193/228 (84.6%), and the
independence split 654 / 268. The 0.980 trade renders as *"buys **10** more AI documents and
costs **52** more human ones"* — the corrected figure, not the retired +16/+41. Every
occurrence of 66.7%, 67.0%, 50.3% and 19.0% on those pages sits inside an explicit
"Correction" or "Withdrawn on 30 August 2026" paragraph, which is what it should do. Both
pages are data-driven from `thresholds.json` rather than hardcoded.

**All seven tool pages — no retired figures** in served HTML: index, checker,
wordpress-plugin, chrome-extension, cli-local-service, astro-integration and
claude-watermark-readiness-lab all return 200 and none contains `0.984`, `98.4%`, `0.857`,
`66.7`, `877/922`, `56/4,636`, `90.3%`, `1.34%`, `segments-v2` or any `cycle-4` string.

**The production model artefact is current.** `https://opace.agency/models/local-signals-v1/thresholds.json`
is byte-identical to `public/`, at `tier3-cycle2-v1`, 0.9855 / 0.9763, 883/922 and 45/4,636.
The deploy is not behind. (Its stale *notes* are finding 5; the *figures* are right.)

**External links — nothing dead.** 173 unique external URLs extracted from 270 in-scope files,
144 probed, **0 hard 404s, 0 5xx, 0 DNS failures**. Every attribution and credit link resolves:
`google-deepmind/synthid-text`, `THU-BPM/MarkLLM`, `ahans30/Binoculars`,
`baoguangsheng/fast-detect-gpt`, `IBM/RADAR`, `contentauth/c2pa-js`, `trailofbits/rfc8785.py`,
`sam-paech/antislop-sampler` and `slop-forensics`,
`martiansideofthemoon/ai-detection-paraphrases`, `ml-postech/Bias-Inversion-Rewriting-Attack`,
`openai/gpt-2`, nine arXiv papers, two ACL Anthology papers, ten Hugging Face
datasets/models, the C2PA 2.4 spec and RFC 8785. The four store-listing files carry zero dead
external links. Seven 403s are publisher bot-blocking (Science, ScienceDirect ×2,
crsreports.congress.gov, sec.gov, copyleaks) — unverifiable by script, no evidence of death.
The Cloud Run root 404 across 17 files is correct API behaviour; `/v1/health` returns 200.

**`cycle-4a` is correctly contained.** Roughly 20 references across both repos, every one
labelled "measured and not shipped". **Zero on the website. No user-facing surface describes
cycle-4a as current or shipped.** No serious finding.

**Signal-set version is coherent.** `en-signals:2026.08.6` is the only version on any live
surface; `.2`–`.5` appear only in chronological build logs and in two documents explicitly
recording a resolved stale-assertion issue (`docs/CAPABILITIES.md:706`,
`docs/EVIDENCE-INDEX.md:21`).

**WordPress `readme.txt` is WP.org-valid.** All required headers present; 5 tags against a
limit of 12; short description 111 characters; Description, Installation, FAQ, Screenshots,
Changelog and Upgrade Notice all present; 8 screenshot captions matching 8 files;
`Tested up to: 7.1` corroborated by a real test cell (`tests/gate/g4-wp-runtime.sh:84`);
newest changelog entry 1.0.6 matching Stable tag; measured figures are the shipped ones.

**Chrome manifest and README agree exactly** — `activeTab, scripting, storage, sidePanel,
contextMenus, clipboardWrite`, no `host_permissions`, described in the README and nowhere
overstated. **CLI commands match the npm blurb** (`packages/cli/src/main.ts:26-29`).

**No future-dated claims.** The only post-2026-08-30 dates are scheduled reviews and a
log-retention expiry (`docs/legal/DPIA.md:311,554`,
`docs/programme/design/PROVIDER-STATUS-PANEL-2026-08-29.md:319`).

### False positives — do not "fix" these

- `tests/gate/README.md:16-18` lists four `packages/contracts/…semantic-validat*` paths. It is
  a **menu of acceptable module locations** ("expose … from one of:"), not a claim that all
  four exist. Only `src/semantic-validation.mjs` exists, and that is correct.
- `README.md:643`, `THIRD_PARTY_NOTICES.md:39`, `packages/watermark-lab/README.md:28` cite
  `src/encoder.py` — a file in OpenAI's gpt-2 repository inside an attribution table, not a
  local path.
- `astro-latest/src/components/tools/content-integrity/ui/ShareResult.ts:268` — three
  `twitter.com` / `wa.me` / `linkedin.com` strings inside JS template literals. Correct at runtime.
- 39 unresolved import specifiers pointing into `dist/` — build output produced before tests run.

---

## Already in flight — noted, not duplicated

- **`docs/CAPABILITIES.md:283-284` and `docs/programme/HANDOVER.md:197`** carry claims of the
  `fired on no human control` class, all of them **retracted** wordings. Another session is
  correcting them. On reading, all three already present as **correction tables that quote the
  retracted claim in order to give the measured denominator** (`artefact_floor`: 4 of 4,144; `formatting_cluster`: 0 of 4,144,
  which held). That is the honest form the guard's `RETRACTION_MARKERS` exists to permit. The
  owning session should confirm whether anything is left to change.
- **The claim guard's widening to all of `docs/`** is reported as in progress. Finding 1 is
  written against the state at `b237993` and should be re-read once that lands — it closes the
  `docs/` scope hole but not the `packages/` and `extensions/submission/` one, and not the
  missing rules.
- **`ShareResult.ts`** (finding 18) and the `local-signals-ui.ts` half of finding 4 belong to
  the peer session working in the checker. Untouched.

## Not completed

**A systematic internal-link sweep of the website was commissioned and did not report back
before this document was written.** What that leaves unproven: site-wide `href` resolution
across all pages, redirect-chain depth, and dead in-page anchors. What *is* proven by direct
request is narrower but covers this programme's surfaces: the two new research URLs (200), all
four research redirects (301 to correct destinations), all seven content-integrity tool pages
(200), the nine GitHub evidence links (200, negative control 404), the production model
artefact (200, byte-identical to source), and the five broken project images (404). Anyone
picking this up should run the site-wide sweep rather than assume it was covered.

## Routing summary

| Owner | Findings |
|---|---|
| Battery / test owner | **1** (guard scope and rules — highest leverage) |
| Website copy owner | **2** (WP version 1.0.4 → 1.0.6), **19** (broken project images) |
| Listing owner | **3** (withdrawn figures live on npm and Chrome Web Store), **8**, **10**, **11** |
| `thresholds.json` owner | **4**, **5** |
| `measured-figures.ts` owner | **6** |
| Programme docs owner | **7**, **9**, **12**, **13**, **17** |
| Unresolved — needs a measurement decision | **14** (source count), **15**, **16** |
| Path-rescue agent in flight | **20** (7 citations remain), **21**, **22** (66 paths, 64 fix by prefix strip) |
| Peer session in flight — do not touch | **18** (`ShareResult` untracked), the `local-signals-ui.ts` half of **4** |

## Changes made by this audit

**None.** Every candidate fix turned out to be either a claim edit requiring a traced
replacement value, or a file another session is actively working in. The one class that
looked mechanical — `tests/gate/README.md` — was a false positive on inspection. This
document is the only file added.

The two changes I would make first, if handed ownership: the WordPress version string
(finding 2 — a one-token edit in two files, correct value traced to the plugin header) and
`thresholds.json:145`, where "the shipped 0.984 flag point" is wrong on a word I can trace
and "they sum to the corpus figures above" is arithmetically false at 877 against 883.
