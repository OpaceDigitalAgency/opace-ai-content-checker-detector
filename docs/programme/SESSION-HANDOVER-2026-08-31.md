# Session handover — 31 August 2026

For a fresh agent picking this up. Read `HANDOVER.md` first for the programme;
this covers only what changed on 31 August, what is still open, and what the
owner has asked for that is not yet done.

**Owner:** David Bryan, Opace. He wants short, plain answers, no jargon, and to
be told when something is wrong rather than reassured. He has repeatedly and
correctly caught over-claiming. Treat every figure as unverified until you have
read it at source — roughly twenty published figures were corrected on 31 August
and several "corrections" were themselves wrong.

---

## 1. The one thing to fix first

**The rule-tell aggregate figures are live on the checker and are not
reproducible.**

`MERGED_ROW_RATES` in
`opace-website/astro-latest/src/lib/content-integrity/rule-tell-table.ts`
publishes: 40.8% of AI documents carry a row, 11.4% of human ones, phrases alone
4.3%, and a claimed basis of "5,743 AI and 4,353 human documents".

Verified as real: the six per-rule counts, which match `tests/battery/rule-liveness.json`
exactly (`signals.chatbot` 151/4, `hollow_intensifier` 1028/292, `cutoff_disclaimer`
22/0, `not_just_contrast` 118/8, `ai_placeholder` 95/3, `token_cutoff` 232/22), and
the denominators 5,743/4,353.

**Not verified, and not present anywhere:** the union rates, the per-document
funnel (mean 0.29, median 0, "73.1% of AI documents show none"), and the
independence claim. There is no measurement document under `docs/measurements/`,
no results file and no script. `find . -name '*rule-tell*'` returns nothing in the
engine repo.

So a panel whose entire purpose is auditable evidence is itself resting on
figures nobody can re-derive. Either produce the measurement and commit it, or
take the aggregate sentence off the panel. **Do not leave it as it is.**

The per-rule rows are fine and can stay.

---

## 2. What is live and believed correct

- **13 research papers + index**, `/tools/ai/content-verification-integrity/research/`.
  48 charts. Interlinked, with a shared nav strip on every page.
- **Checker**: plain-English rule messages (all 113 rewritten), merged evidence
  panel, sentence underlines (browser route only, WASM floor 0.945), section
  deep-dive spine, PDF/share/print controls.
- **Detector** `opace-detector-00027-yuq` — validation-error handler (no longer
  echoes submitted text), `nosniff`. Rollback revision `00006-qch`.
- **Report-only CSP** on the site. Not enforcing. `wasm-unsafe-eval` is required —
  without it the in-browser route cannot compile the model.
- **WordPress 1.0.7**, site version matched. All gates open and stated as open.
- **Claim guard** now scans `docs/`, `packages/`, `wordpress/`, `extensions/`,
  `public/`, reads `.html`/`.mjs`/`.php`/`.txt`, no longer stops at first match,
  and ratchets via `UNCORRECTED`.

**Shipped operating point: 0.9855 primary / 0.9763 secondary.** Figures at 0.984,
0.980, 0.857 or 0.9110 are retired. The cycle-4a retrain is **rejected** and must
never be described as current.

---

## 3. Open — the owner has asked for these

1. **Rule names are internal identifiers and reach the user.**
   "hollow-intensifier", "cutoff-disclaimer", "not-just-contrast". His words:
   *"language like this means nothing to a human, we need really simple human
   naming."* The messages were rewritten into plain English; the **names** were
   not. Fix before anyone tests it again.
2. **Train on the paired corpus** (`cycle4-humaniser-pairs/`, 1,702 variants from
   600 sources, lineage IDs, group-aware splits by source slug). He has approved
   this. It buys robustness to LLM rewording — see §4 for why that is a smaller
   prize than it looked.
3. **Publish the humaniser weakness** as research, and check whether anything else
   measured has gone unpublished. He asked: *"If this wasn't covered, have we
   missed anything else?"* — that sweep has not been done.
4. **Licence-constrained option into the phase docs** — subscriptions to two or
   three humanisers, ~£20–50/month, to train on genuine humaniser output.
   Partially done in `PHASE-2-NEXT-STEPS.md` §11; confirm it is there and costed.

---

## 3b. Near-term work on the shipped tool — not Phase 2

These are checks and changes to what is live now. In rough priority order.

1. **Rule names reach the user as internal identifiers.** `hollow-intensifier`,
   `cutoff-disclaimer`, `not-just-contrast`, `ai-placeholder`, `token-cutoff`,
   `chatbot`. The rule *messages* were rewritten into plain English on 31 August;
   the *names* were missed and now render in the evidence panel. The owner:
   *"language like this means nothing to a human."* Rename to plain descriptions
   in the same register as the messages.
2. **The unreproducible aggregate figures** — see §1. Fix or remove.
3. **Three site-copy corrections** proposed by the humaniser re-measurement and
   not applied: the paired corpus has **three** rewrite strengths, not two; one
   published row carries no denominator or runtime; and one heading merges two
   opposite attacks that read 21.0% and 95.6%. A replacement row and wording are
   drafted in that document's §5 for a human to accept.
4. **Publish the humaniser weakness** as research (owner asked), and sweep for
   anything else measured but never published. That sweep has not been done.
5. **`IntegritySuiteNav` has no research entry.** Every tool page carries it, so
   this is the highest-value remaining internal link. It is a shared component —
   coordinate before editing.
6. **Watermark lab spin-out repository** — decided long ago, never built.
7. **Build reproducibility remains open.** Of nine builds at 1.0.6, eight were
   byte-identical and one was not; cause unidentified. Later builds agreeing among
   themselves does not resolve it. This blocks plugin submission.
8. **Release gates are open on every surface.** WordPress 1.0.7, Chrome, Astro,
   CLI: rebuilding changed the bytes, so Plugin Check, readme validation, axe and
   lifecycle evidence recorded against earlier builds do not carry. Every affected
   page states this honestly — **do not restore any "checks passed" claim.**

## 3c. Work that was running when this session ended

- **Four-way verdict separability — SCORING COMPLETE, ANALYSIS NOT RUN.**
  Harness proof passed exactly (883/922, 45/4,636). **2,302 pairs scored.** The
  run finished before the session closed and nothing is still executing.

  **The results were written to a session scratchpad and have been copied into the
  repository at `services/local-engine/research/fourway-separability-2026-08-31/`**
  — scores, baseline, scripts and logs, with a README stating the question, what
  remains, and the constraints. Without that copy an hour of compute would have
  been lost with the session. **Check the scratchpad for anything else before
  ending a session; it does not survive.**

  What remains is `analyse.py`, written and never run. The question: can
  pure-human, pure-AI and AI-then-rewritten be separated at all? All three answers
  are acceptable, including "no" — and "no" closes a request the owner has raised
  repeatedly.
- **Humaniser re-measurement, browser arm**: deliberately cancelled. The server
  answer is decisive and the browser agreed within 2 pp on 1,576 matched rows.
  Resumable; its §6 documents how. Low value.
- **JustDone evaluation**: blocked at a terms boundary, not a technical one. A
  12-document manual pack awaits the owner at
  `services/local-engine/research/justdone-eval-2026-08-31/manual-run/`.

## 4. What was measured on 31 August

**Cycle 4 rejected, all four arms.** On this corpus the quantisation gate and
short-form capability cannot both be had by choosing an epoch: epoch 0 passes the
gate (0.00741 against 0.01) and collapses 100-word detection to 1/57; epoch 1
reaches 66.7% and fails it. The compression is a **corpus property** (T=1.7137 at
epoch 0 against cycle 3's 1.2095), so every future cycle on this data inherits it.
Next cycle must treat **calibration spread as a training objective**.

**A parameter was inherited rather than fitted**, and it distorted a whole cycle's
verdict: the secondary flag point was pinned in *probability* space, so the same
"ratio" bought a margin gap of 0.4168 on the shipped model and 0.3804 on cycle 4a.
Fitting in margin space changed the conclusion. Recorded in `HANDOVER.md`.

**The 30–35% humaniser figure was wrong for the shipped tool.** It came from a
different export, unsegmented, at a retired threshold. Re-measured at the shipped
pair: **95.6% (526/550) of detected AI documents survive an LLM rewrite**, 92.0%
after a full rewrite. Rewriting AI text *raised* detection, 65.3% → 74.1%.

**But commercial humanisers are a different threat.** Undetectable.ai escaped
**27 of 28 (96.4%)** and StealthGPT 96.0% against this exact build. QuillBot's
free humaniser **failed** on its one direct test. JustDone untested — its terms
forbid automated access; a 12-document manual pack is prepared at
`services/local-engine/research/justdone-eval-2026-08-31/manual-run/`.

**Human text rewritten by an LLM flags 21.0% of the time** (57/272 at full
rewrite). Worth publishing: polish your own writing through a chatbot and there
is a one-in-five chance of being called machine-written.

**Per-sentence evidence measured and largely declined.** 269,732 sentences.
Sentence AUROC 0.764 against 0.9695 for documents. 57.4% of sentences in AI
documents score below 0.5. No per-sentence percentage ships. The floor-gated
underline layer does: WASM floor 0.945, 25/200,890 human sentences (0.012%)
against 1,292/68,916 AI (1.875%).

---

## 5. The untapped angle

The owner pushed back on being told the humaniser gap cannot be closed by
innovation, and he was right to.

**Rewriting AI text made it *more* detectable, not less** — 65.3% → 74.1% on the
same sources. Rewriting leaves its own trace. Nothing in this programme hunts that
trace directly; the paired corpus has 1,702 examples of exactly it, with lineage
IDs, and has never been trained on. That is a genuinely under-explored direction
and it is free.

Also unexplored: whether the 21% flag rate on LLM-rewritten human text and the
96.4% commercial escape are the *same* phenomenon at different intensities, or
different mechanisms. Nobody has looked.

---

## 6. Running tasks — keep or cancel

| Task | Recommendation |
|---|---|
| Four-way verdict separability (`afa53aa`) | **Let it finish.** ~50 min in, it answers whether "Likely AI but human edited" is supportable at all. Closing that question with evidence is worth more than the feature. |
| Humaniser re-measurement browser shards (`a19702`) | **Cancel.** The server-route answer is in and decisive; the browser arm agreed within 2 pp everywhere on 1,576 matched rows. It ran out of swap because three sessions were scoring at once. Resumable, documented in its §6. |

Everything else is complete. **Start nothing new until the weekly usage limit
resets** (Sunday 6 September) unless the owner says otherwise — he raised this
directly.

---

## 7. Traps that cost time on 31 August

All of these are now in `HANDOVER.md` §6. Repeated here because a fresh agent
will meet them within the hour.

- **`gcloud logging read` defaults to `--freshness=1d`.** The same query returned
  0 rows at 1d and 90 at 30d. An unbounded query returns a comfortable zero that
  means nothing.
- **`npm install` reports "up to date" and restores the *old* bundle from cache**
  on the lockfile's integrity hash. Verify file contents, never an exit code.
- **`grep` in this shell is a ripgrep shim honouring `.gitignore`**, so it silently
  skips `dist/` and `node_modules/`. Use `command grep` for build output.
- **`requestAnimationFrame` never fires in a hidden tab** — a run hangs for ever
  with no error. And the same hazard returns as a *timing artefact*: one throttled
  run read 37,913 ms and would have dragged a mean to 225 ms/sentence. Medians,
  discard above 3× median, report the discard count.
- **Concurrent `astro build` runs corrupt `dist`.** Six were running at once.
  Build to a private `--outDir`.
- **One shared git index across sessions.** `git status --porcelain` is not
  sufficient — another session may have pre-staged files. Always
  `git commit -F msg -- <paths>`. This swept up others' work three times.
- **Symlinks under `node_modules`**: `packages/browser/node_modules/@opace/content-integrity-core`
  and the CLI equivalent point at `packages/core`. `rm -rf` on their `dist` deletes
  the real build output.
- **A glob that fails to expand returns nothing, which reads exactly like "already
  fixed".** Read the actual lines.
- **`ListAgents` does not show background Bash tasks.** It lists agents only. On
  31 August this produced two confident wrong answers to the owner: first that
  eight running tasks belonged to another session, then that they were idle
  waiters safe to kill. **The task panel is the only reliable count**, and
  `ps -eo pid,etime,pcpu,command` is the only reliable way to tell a live
  computation from a stale waiter. One of those "idle" tasks was scoring at 647%
  CPU. Check before advising anyone to stop anything.
- **Agents here spawn blocking waiter shells** (`while kill -0 <pid>; do sleep`)
  that outlive the agent that created them and clutter the task list. They are
  usually harmless, but they make the panel unreadable. Prefer a single chained
  command to a chain of waiters.
- **Duplicate documents outside the repo.** The root `HANDOVER.md` was retired on
  31 August after an agent copied it over the tracked one and silently reverted a
  fix. `PHASE-2-NEXT-STEPS.md` has the same problem and now carries a banner.
  **Sync outward from the repository only.**

---

## 8. Working conventions

- **Verify at source before quoting.** Second-hand figures were wrong repeatedly
  on 31 August, in both directions — including two "corrections" that compared
  different corpora and would have introduced errors.
- **Prove a probe can fail before trusting a clean result.** A guard nobody has
  watched fail is not known to work. Several passed all day while reading almost
  nothing.
- **Never loosen a rule for a green run.** If it fires on correct copy that is a
  rule bug; if it fires on a wrong claim, the claim changes.
- **Append corrections, do not rewrite history.** Mark superseded in the same
  sentence as the figure — the claim guard's marker window is ±400 characters and
  is now structural (same paragraph, list item, table row or governing heading).
- **A measured decline is a good outcome.** This programme has published four.
