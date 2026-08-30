# Stale-document reconciliation — 29 August 2026

Agent B3. Current as of 29 August 2026, 17:00.

Five documents stated things that had stopped being true. Anyone following the project's
standing rule of "read MASTER/PROJECT/STATUS first" reached them before `HANDOVER.md` and acted
on false facts. This records what was changed, the evidence behind each change, what could not
be verified, and what needs handing to the sessions that own the other files.

Files rewritten, and nothing else touched:

- `STATUS.md`
- `PROJECT.md`
- `PHASE-2-NEXT-STEPS.md`
- `CLOUD-RUN-SETUP.md`
- `implementation/docs/RELEASE-STATE.md`

Nothing was committed, staged or pushed. Only read-only git commands were run.

---

## 1. Live checks run, and what they returned

| # | Check | Result |
|---|---|---|
| E1 | `GET https://opace-detector-877422072168.europe-west1.run.app/v1/health` with `Origin: https://opace.agency` and a browser UA | 200 `{"ok":true,"model":"tier3-cycle2","precision":"fp32","model_build":"e313ab00de1fffd2","threads":2,"segmentation_contract":"segments-v2"}` |
| E2 | `gcloud run services describe opace-detector --region europe-west1 --project opace-ai-detector` | latest ready revision `opace-detector-00004-dlb`, 100% of traffic |
| E3 | `GET …/v1/status` | 200; cap 12,000 inferences, remaining estimate 11,904; per-connection 5/30/100 requests and 20/150/500 inferences; `max_chars` 50,000; `max_words` 4,000; `max_inferences_per_request` 99; `segments-v2`; `token_required: true`; browser fallback advertised at 34.3 MB |
| E4 | `GET api.github.com/repos/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker` | `private: false`, `visibility: "public"`, MIT, default branch `main`, pushed `2026-08-29T14:24:59Z` |
| E5 | `GET …/tags` on the same repo | `v0.1.2`, `v0.1.1`, `v0.1.0` |
| E6 | `git remote -v` in `implementation/` | `origin` → that repository URL |
| E7 | `GET registry.npmjs.org/@opace%2f{content-integrity-core, astro-content-integrity, watermark-lab}` | 404 each |
| E8 | `GET pypi.org/pypi/opace-content-integrity/json` | 404 |
| E9 | `GET wordpress.org/plugins/opace-ai-content-integrity/` | 301 → `/plugins/search/opace-ai-content-integrity/` (200). No listing |
| E10 | `public/models/local-signals-v1/thresholds.json` | `threshold` 0.984; `bands.list[very_likely_ai].min` 0.984 |
| E11 | `src/lib/local-signals/engine.ts` | `bandFor` selects on `probability >= band.min`; `flagged: probability >= tier3Threshold` — same comparator |
| E12 | `src/lib/local-signals/server-route.ts` `serverBands` | rewrites the `very_likely_ai` floor to the threshold the server returns per response |
| E13 | `reference-server/app.py` | `THRESHOLD_PROB = 0.984`, with a 2026-08-29 comment recording the raise from 0.980 and the route-parity reasoning |
| E14 | `local-signals-ui.ts` `ROUTE_PRIVACY` | route-specific privacy wording exists; server sentence names europe-west1, HTTPS, in-memory scoring, neither stored nor logged |
| E15 | Website repo: `git merge-base --is-ancestor HEAD origin/main` | yes. HEAD `3fd9ef00`, preceded by `88af6f6d` "Checker: EU server by default…" — deployed |
| E16 | `shasum -a 256` on all eleven recorded frozen artefacts | every one matched; nothing rebuilt |

---

## 2. Claims changed, with evidence

### 2.1 "No public GitHub repository … exists"

`STATUS.md` line 7 and `PHASE-2-NEXT-STEPS.md` §7 ("The implementation repository has no
configured remote and nothing is published"). **False.** Corrected in both against E4, E5, E6.
The repository is public and MIT licensed, tagged `v0.1.0`–`v0.1.2`, renamed 29 August from
`opace-ai-content-integrity`. `RELEASE-STATE.md`'s GitHub row moved from three "no" columns to
committed and published.

### 2.2 The browser described as the only route

`PROJECT.md` and `PHASE-2-NEXT-STEPS.md` predated the hosted-inference work entirely.
Server-side fp32 inference on Cloud Run is the **default**, browser is one click away
(E1, E2, E15). Both files now say so, and `PHASE-2` carries an explicit warning that its
phase-1 reasoning assumed a browser-only tool.

### 2.3 Cloud Run revision and contract

`CLOUD-RUN-SETUP.md` and `RELEASE-STATE.md` recorded `opace-detector-00003-bfq` and
`segmentation_contract: "segments-v1"`. Live values are `opace-detector-00004-dlb` and
`segments-v2` (E1, E2). `model_build` is unchanged at `e313ab00de1fffd2`. `STATUS.md` also
recorded `max_inferences_per_request` 12; live is 99, and `max_chars` 50,000 was absent (E3).
All corrected, with the old values kept as superseded observations rather than deleted.

### 2.4 "Not yet wired to the checker"

`RELEASE-STATE.md`'s Cloud Run row gave a blocking reason: the site-wide "text never leaves your
browser" copy had to change first. It changed, then the checker was wired (E14, E15). The row
now records the wiring, names `ROUTE_PRIVACY` as the single source of the per-route sentence,
and keeps the DPIA, lawful-basis notice and unprobed refusal/error paths as genuinely open.
`STATUS.md`'s matching "remains open" line was replaced the same way, and `CLOUD-RUN-SETUP.md`'s
"the honest trade-off" section rewritten from a thing to do into a thing done, with the legal
work still listed as outstanding.

### 2.5 The band-boundary presentation defect

Recorded as an open defect in `RELEASE-STATE.md` and as open item 1 and the "current next
action" in `STATUS.md`. **Fixed.** Three independent confirmations: the band floor equals the
flag point (E10); the band selector and the flag both use `>=`, so exactly 0.984 cannot fall
between them (E11); and the server route rewrites the top band's floor to the threshold it
returns, so the routes agree (E12). Marked fixed in both files, with the mechanism recorded so a
future reader can re-check it rather than trust the note.

### 2.6 Detection figures

Every headline rate was removed and replaced with corpus-qualified statements.

`PROJECT.md`, `STATUS.md` and `RELEASE-STATE.md` all led with **90.3% detection at 1.34% false
positives**. `HANDOVER.md` §9 already lists that pair under "superseded figures — do not quote":
it is the opening-only pre-segmentation pass, one truncated pass per document. The four
measurements that exist on the 5,558-document held-out corpus, none of them interchangeable:

| Pass | Runtime | Threshold | AI detected | Human false positives |
|---|---|---|---|---|
| Opening-only | int8, onnxruntime-web | 0.984 | 833/922 (90.3%) | 62/4,636 (1.34%) |
| Opening-only | int8, Python onnxruntime | 0.980 | 835/922 (90.6%) | 64/4,636 (1.38%) |
| Segmented | fp32, Python reference | 0.980 | 893/922 (96.9%) | 97/4,636 (2.09%) |
| Segmented | fp32, Python reference | 0.984 | 877/922 (95.1%) | 56/4,636 (1.21%) |

Segmented rows from `implementation/docs/measurements/SEGMENT-TOKEN-FIX.md` lines 303–306.
Neither segmented row was measured on a runtime a visitor gets: the browser's own segmented
curve over the full corpus has never been run, at roughly five hours of compute, and
`thresholds.json`'s `measured` block still carries the v1-derived browser figures. All three
files now carry the table or its substance, plus the open-reconciliation note, and none states a
single rate.

The 0.984 threshold is marked **provisional** in all four relevant files, with the owner
decision between lowering it and retraining recorded as asked and unanswered.

### 2.7 A correction to the brief this agent was given

The task brief described the two corpora as telling "contradictory stories" — held-out 92.4%
academic against fresh-corpus 1.1% academic. **They are not directly comparable, and saying they
are would itself be a false claim.** The 1.1% (5/457) academic and 37.5% (467/1,244) article
figures, and grok-4.6's 0/86 on human-voice prompts, are at threshold **0.8533** on the
**superseded cycle-1 model** — `GENERATED-CORPUS-EVAL.md` §"Question 4" and the report header,
which names `models/tier3-e5small-int8-perchannel.onnx` as the scored artefact.
`implementation/docs/MEASURED-FINDINGS.md` already states this plainly: "These figures are from
the superseded model. Publishing them as current would overstate the weakness, which is its own
kind of dishonesty."

Confirmed directly: `generated-corpus/scored-tier3.json` holds 4,050 records whose scores run
from 0.143 to a **maximum of 0.858**. Not one clears 0.984. Those probabilities are on the
cycle-1 scale and cannot be read at the shipped threshold at all.

What genuinely is open, and what the five files now say, is narrower and more precise:

- Cycle 2 reads 269/274 (98.2%) on human-voice prompts at a 2% false-positive budget, but those
  held-out samples come from the same generation run, split group-aware by content hash. **No
  prompt-style split has been measured on an independent corpus.** In-distribution only.
- The two corpora have never been re-scored against each other on the deployed model at the
  shipped threshold. That, not a raw contradiction, is the reconciliation that is missing.
- The reported reproducible miss (a real 512-word GPT-5.6 Sol article at 0.8082, unflagged,
  opening section 0.4993) is on the deployed model and is the case that forces the threshold
  decision.

### 2.8 Deferral reasoning kept, with corrections attached

`PHASE-2-NEXT-STEPS.md` keeps every deferral and its rationale. Changes made:

- §1 teacher mode: the short-text figures now carry their measurement conditions (300 AI and 400
  human documents truncated, Python onnxruntime at 0.980, false positives 0.00% at every
  length). The claim that academic false positives are "the highest of any genre" was corrected:
  it was measured at the **training** threshold 0.9110, which does not ship. At 0.984 the worst
  genre is stories, 16/260 (6.15%), against academic discussion 14/420 (3.33%).
- §3 segment-aware training: the 88.5% → 96.2% pair it was written against is superseded by the
  token-segmentation report, and the word-bounded-to-token-bounded fix is recorded (1,348 of
  23,318 segments, 5.78%, overflowed; now 0 of 21,093).
- New §5a, the corpus reconciliation and threshold decision, marked as the priority and not a
  deferral.
- §7 marked GitHub **DONE** with its evidence, registries re-checked and tabulated, publication
  order preserved.
- New §8 (watermark generation and the lab spin-out, decided and not done) and §9 (the privacy
  and legal work the hosted route created).

### 2.9 Hashes

Every SHA-256 in `RELEASE-STATE.md` and `STATUS.md` was re-checked with `shasum -a 256` against
the file on disk. **Nothing was rebuilt.** All eleven matched: WordPress 1.0.4 ZIP
`084556a7…f8520ec` (and its byte-identical copy under `dist/wordpress-submission-prep-1.0.4/`),
Chrome 1.0.0 ZIP `061f5306…fba7a1a93`, Astro tarball `4a45e453…1e82da5`, npm manifest
`f2e09e2e…5193fe20`, Python wheel `ddd0b160…d3b943d`, Python sdist `34c65f6e…40587f7d46`,
local-engine `final5` wheel `a0605c3e…b07a753` and sdist `1fb6ec80…6f0377003d4`, TS client
`d8fdc64e…c395dd4`, TS CLI `2176463b…5ffb2825ef`, BENCH tarball `68b6c65c…11612c49d` and its
`package-set.json` `b2e9e517…f7d3661bc`, ASTRO-25 `final-k` and `final-l` both
`170e3520…3dd66c26d81`. No mismatch to report and no hash was altered.

---

## 3. Could not verify

Recorded rather than asserted, because two claims in this project were retracted for being
inherited rather than checked.

1. **The threshold the running container actually applies.** Source sets `THRESHOLD_PROB = 0.984`
   (E13) and the deployed contract is `segments-v2` (E1), but reading the value back needs a
   scored `/v1/check` response, which needs a proof-of-work token and a browser-like client.
   Scripted clients are refused `automation_detected`. Not attempted, to avoid burning quota and
   tripping abuse controls. The four files say "inferred from source, not observed".
2. **The kill switch and the zero-body-logging probe on `opace-detector-00004-dlb`.** Both were
   proven against `00003-bfq` only. Agent B1 is re-verifying. Marked placeholders are left in
   `STATUS.md`, `CLOUD-RUN-SETUP.md` and `RELEASE-STATE.md`, each saying the control is unproven
   on the running revision until the placeholder is replaced. Deliberately not duplicated here.
3. **The GPT-5.6 Sol 0.8082 miss.** Reported by a parallel session. Recorded as received and
   labelled as not independently reproduced.
4. **The browser runtime's own segmented curve** over the full 5,558-document corpus. Never
   measured, roughly five hours of compute. Recorded as a gap, not estimated.
5. **Per-length AI denominators** in the short-text sensitivity table. `thresholds.json` gives
   the pooled counts (300 AI, 400 human truncated documents) but not the per-row denominators.
   Marked indicative.
6. **Whether the remaining nine suite routes are live** individually. `RELEASE-STATE.md` already
   recorded that they are not individually re-verified; left as is, not upgraded.

---

## 4. Hand-off — stale or contested claims in files this agent does not own

Ordered by how much damage the claim does if acted on.

| # | File | Line | Claim | Correction needed |
|---|---|---|---|---|
| H1 | `implementation/docs/CAPABILITIES.md` | ~728–729 | "Band boundaries do not align with the flag point. A score of exactly 98.4% displays 'Uncertain' while being flagged. Cosmetic, confusing, and **open**." | Fixed. Band floor is 0.984, both comparators are `>=`, and the server route rewrites the top floor to its own threshold. Mark closed with that evidence. |
| H2 | `README.md` (programme root) | 15 | Leads with "**90.3% of AI documents detected, 1.34% of human documents falsely flagged**. Those are the figures the live page discloses." | Superseded opening-only pre-segmentation pair. Replace with the corpus/threshold/runtime table and the open-reconciliation note. |
| H3 | `README.md` (programme root) | 17 | "No public GitHub repository, npm or PyPI release, Chrome Web Store listing or Astro catalogue entry exists." | GitHub is public, MIT, tagged `v0.1.0`–`v0.1.2`. npm, PyPI, Chrome and Astro remain correct as unpublished. |
| H4 | `BRIEF.md` | 833 | "**Tier C is live and measured** … the shipped cycle-2 classifier detects 90.3%…" | Same superseded pair as H2. Qualify or replace. |
| H5 | `implementation/docs/TEST-EVIDENCE.md` | 99 | Carries 90.3%/1.34% as "the browser figures above", with the segmentation caveat attached | The caveat is correct and well written; the figures above it still read as headline. Add the open-reconciliation note and the provisional status of 0.984. |
| H6 | `opace-website/astro-latest/src/components/tools/content-integrity/local-signals/local-signals-ui.ts` | ~20–23 (file docblock) | "The two routes **do not share a flag point**: the browser reads 0.984 from thresholds.json and the server reads **0.98** from the field it returns" | Stale comment. The server was raised to 0.984 on 29 August (`THRESHOLD_PROB` in `app.py`). Behaviour is correct — the UI reads the threshold from the response — but the comment now contradicts the code it documents. |
| H7 | `implementation/docs/CAPABILITIES.md` | ~742–743 | States the segmented fp32 figures (96.9% / 95.1%) | Correct as written and well qualified. Add that reconciliation with the generated corpus is open and that 0.984 is provisional, so the figures are not read as settled. |
| H8 | `implementation/submission-prep/submission-manifest.json` | 5–6 | `"state": "local_submission_preparation"`, `"public_action_authorised": false`, with `repository.target` naming the now-live URL | The repository action has been taken. The manifest still describes it as unauthorised preparation. Split the repository row from the still-unauthorised registry rows, or the manifest will read as blocking something already done. |
| H9 | `implementation/docs/MEASURED-FINDINGS.md` | 55–70 | Correctly labels the generated-corpus figures as from the superseded model | No correction needed. Flagged because it is the best statement of that caveat in the repository, and the other documents quoting 1.1% / 37.5% should point at it. |
| H10 | `implementation/docs/programme/HANDOVER.md` | 245 | Mirrored copy of the programme-root `HANDOVER.md` | Whatever lands in the root file needs mirroring here, or the two diverge. |

Item H6 sits in the website repository, not `implementation/`, and is owned by neither session's
declared file list. It needs assigning.

**Mid-pass change by the other session.** `implementation/docs/legal/DPIA.md` appeared untracked
during this work — version 0.1, 29 August 2026, engineering-written and explicitly not signed
off. The four files that said "DPIA outstanding" were updated to say a draft exists and needs
qualified review. The other session's HEAD also advanced to `b8b8d7f` during the pass; no file
this agent owns was touched by it, and `docs/RELEASE-STATE.md` is left modified and unstaged in
the working tree as instructed.

---

## 5. What a future reader should not undo

- The five files no longer state a single headline detection rate. That is deliberate. Do not
  restore one until the corpus reconciliation in `PHASE-2-NEXT-STEPS.md` §5a closes.
- 0.984 is written as provisional everywhere. Do not promote it to settled without the owner's
  answer.
- The `B1 RESULT PENDING` placeholders are load-bearing. Do not delete them to tidy the
  documents; replace them with observed results, or the kill switch and the logging claim
  silently become assertions again. That is the exact failure shape that took the service down
  twice, once with no signal at all.
