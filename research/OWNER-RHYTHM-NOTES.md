# Owner rhythm notes — punchline-led contrast writing (28 August 2026)

> **Public research snapshot.** This first-party note records owner-supplied hypotheses, not authorship proof. Use the [current architecture](../docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md), [research index](../docs/RESEARCH-INDEX.md) and measured cadence reports before quoting a capability.

Source: the owner's separate ChatGPT conversation analysing why AI drafts of a LinkedIn Pulse article "didn't sound like him", with worked before/after examples. Owner-supplied evidence for the human-perception angle of the clean-prose detection work (`CLEAN-PROSE-DETECTION-PLAN.md`); complements `OWNER-DOCS-TELLS.md`.

## The identified macro-rhythm (AI signature)

"Binary contrast writing" / "LinkedIn thought-leader cadence": short dramatic setup sentences building to a neat two-sided contrast and a quotable closer. Structure: *We did X. That mattered. But the real value was Y. Here is the punchline.* Every sentence built to be quotable; the paragraph exists to serve its final line ("mic-drop" / manufactured insight). Canonical example: "The difference was not the AI. It was who was controlling it."

## The human counter-pattern (the owner's actual style)

Procedural, grounded, commercially specific: *what was done → where AI helped → where manual judgement was needed → the specific revision steps (itemised) → the business outcome.* Longer connected sentences carrying cause-and-effect; concrete actions ("making contact and quote requests simple") over polished abstractions ("generate real enquiries"); written like someone reviewing work, not presenting a slogan. Also noted: the owner avoids the colon-led polished clause and distrusts even "natural-sounding" short fragments ("That was useful, but it was only the starting point." is still AI-like).

## Implementable candidate tells (feed to en-signals v-next and the breakthrough synthesis)

1. `punchline_fragment_density` — rate of very short (≤8-word) high-abstraction declarative sentences, especially paragraph-final; humans use fragments sparingly and concretely.
2. `mic_drop_paragraph` — paragraph shape: several mid-length setup sentences ending in a much shorter, abstract, contrast-bearing closer. The whole-paragraph-serves-the-last-line signature.
3. `contrast_construction_density` — existing `not_just_contrast` upgraded to a per-1000-words rate across all variants ("not X, but Y", "The difference was not A. It was B.", "This isn't about X. It's about Y."). Single uses are human; the rhythm comes from repetition.
4. `rhetorical_vs_procedural_ratio` — sentences making abstract claims vs sentences naming concrete actions/objects/numbers; AI-polished copy skews rhetorical, human project writing skews procedural. (Relates to the eval plan's specificity score; this evidence supports promoting it.)
5. Heuristic for docs/UX copy, not a rule: "would this sentence sit on a motivational graphic?" — the human-review question our evidence panel can teach users to ask.

## Guardrails

Skilled human copywriters legitimately use punchlines — these must land as corroboration-weight (tier B) signals with density thresholds, never single-instance flags; calibrate against professional human marketing copy (Opace pre-AI archive) before any severity above low.
