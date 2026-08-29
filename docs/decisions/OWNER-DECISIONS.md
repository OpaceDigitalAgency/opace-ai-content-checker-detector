# Owner decisions still open

Updated 29 August 2026. These do not block the local Phase 0 skeleton unless stated, but they block
the affected implementation or release gate. Two rows below are now settled rather than open and are
marked as such; the rest are genuinely still waiting on the owner.

| Decision | Current recommendation | Blocks |
|---|---|---|
| Final public repository and registry names | Verify `OpaceDigitalAgency` access and name availability read-only before creation | Public repository/packages |
| Final canonical URLs | Re-verify active Astro source and live route conventions | Web implementation/release |
| Local installation | Docker plus documented Python virtual environment; native installers later | Local distribution |
| Benchmark corpus/data terms and DOI/archive | Partly overtaken by events: the 15,514-document cycle-2 training corpus (5,655 AI / 9,859 human) is built, its per-source licences are recorded in `cycle2-corpus/MANIFEST.md`, and it has been used to train a shipped model. What is still unmade is the decision to *publish* a corpus: no DOI, no archive and no public data terms exist, and the wikiHow-derived rows inherited through MAGE/GRADTEX and MAGA still need a legal read | Public corpus release and index/claims |
| Receipt retention and content-bearing storage | Hash-only default; approve duration and reviewed encryption before full content | WordPress/local persistence |
| First semantic model and detector | **Decided and live, 28 August 2026.** cycle-2 `intfloat/e5-small`, 33.36M parameters, per-channel int8 ONNX at 34.3 MB, served from the live checker and run in the visitor's browser. Evidence: browser-measured 90.3% AI detection and 1.34% human false positives at threshold 0.984 on the 5,558-document fresh long-form corpus the model had never seen (922 AI / 4,636 human); held-out training evaluation AUROC 0.9695 on 6,183 rows. The measured-false-positive condition is therefore satisfied. **Still outstanding: the base-checkpoint licence, which is not recorded anywhere in this repository, and a published model card.** CPU review is moot for the browser route but not for the hosted route | Nothing local now; the outstanding licence and model-card review block public and packaged distribution |
| Remote/LAN pairing | Keep out of v1 | Any non-loopback service |
| Multisite network activation | Per-site first | WordPress network support |
| AI-Scribe future branch | Record frozen verified accepted head, then approve fresh worktree | SCRIBE-00/20 |
| AI Hub future branch | Record frozen verified accepted head, then approve fresh worktree | HUB-20 |

Read-only observations supplied by the orchestration lead on 26 August 2026, recorded here as **historical** and not re-verified since are compatibility evidence only: Hub working source is clean `main` aligned with `origin/main` and reports 1.0.14; AI-Scribe reports 3.2.36 on `codex/dependency-installer-3.2.32`, ahead by two commits with untracked `.wp-env.override.json`. Neither is an accepted release base. Do not edit either checkout. These figures are three days old as of 29 August 2026 and must be re-observed before they are relied on.

## Decided since this register was written

| Decision | Outcome | Date | Evidence |
|---|---|---|---|
| First semantic model and detector | cycle-2 `intfloat/e5-small` int8 ONNX chosen, trained, measured and deployed | 28 August 2026 | 90.3% detection and 1.34% human false positives, browser-measured at threshold 0.984 on 5,558 fresh unseen long-form documents (922 AI / 4,636 human); [`OBJECTIVE.md`](../../../OBJECTIVE.md) |
| Web deployment of the checker | Deployed and live-verified | 28 August 2026, 21:20 | Site commits `bb820686`, then `ce56ac54` correcting the disclosure copy; live production test of four documents through the real page |
| The 113 writing rules' role in the verdict | Demoted: they no longer contribute to the AI verdict and are presented as editorial suggestions | 28 August 2026 | On the same 5,558 fresh documents they detected 45.1% of AI writing while flagging 24.8% of human writing |
