# What is authorised

**Tracked, in-repository, and therefore present in a fresh clone.** The fuller
`STATUS.md` lives at the programme root, is **untracked**, and contains billing
identifiers and spend caps that are deliberately not published. Read this file for
the authorisation position; read `STATUS.md` locally if you have it, and treat the
session transcript as superseding both.

## Authorised, and done — 31 August 2026

The owner authorised these explicitly, in his own words, in the session
transcript:

| what | his words |
|---|---|
| Repository pushes | *"just do as you see fit, but make sure it's all correct, up to date and no broken links / old data"* |
| Cloud Run detector deployment | *"Detector deploy - do it!"* |
| Publishing research pages to the live site | asked for them to be live, and reviewed them there |

All three happened and are in the repository history. Detector revision
`opace-detector-00027-yuq`; rollback is `opace-detector-00006-qch`.

## NOT authorised — unchanged

Tagging a release · WordPress.org submission · Chrome Web Store submission ·
Astro catalogue submission · npm or PyPI publication · outreach · paid calls ·
handling client data · any external message.

**Every release gate is open on every surface.** Rebuilding on 30–31 August
changed the bytes, so Plugin Check, readme validation, axe and lifecycle evidence
recorded against earlier builds does not carry. Build reproducibility is also
unresolved — of nine builds at 1.0.6, eight were byte-identical and one was not,
cause unidentified. **Do not restore any "checks passed" claim.**

## Why this file exists

Until 31 August the authorisation position was recorded only at the programme
root, outside the repository. It said no push or deployment was authorised while
the day's work did both under explicit approval, and no clone could see it either
way. Three governance or handover documents were found in that position on the
same day; one had already caused a silent revert of another session's fix.

**Sync outward from the repository. A file nobody can clone cannot govern
anything.**
