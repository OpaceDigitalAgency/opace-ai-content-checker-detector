"""The cycle-3 evaluation sets. None of these documents is used in training.

1. hat-test      — the full HAT-Bench held-out group split (~9,200 docs, v0..v8),
                   real LLM edits at nine measured AI-token ratios.
2. gradtex-test  — cycle-2's own test-split edit bands (real LLM edits, the other
                   direction: human base, AI polish).
3. fresh-human   — 4,636 long-form humans from longform-corpus. Sets the operating
                   threshold; never trained on by cycle 2 or cycle 3.
4. fresh-ai      — 922 fully-generated long-form AI, ditto.
5. fresh-edited  — synthetic: the fresh AI long-form put through the human-edit
                   editor at six intensities. HELD-OUT documents, but the editor is
                   the same one used in training, so this measures generalisation
                   to new documents, NOT to new edit styles. Read it with that caveat.
"""
from __future__ import annotations

import os

import common3 as C
import editor
import hat_full
import score_sets as S

FRESH_EDIT_TARGETS = [0.04, 0.08, 0.12, 0.18, 0.25, 0.35]
FRESH_MIX_SHARES = [0.15, 0.3, 0.45, 0.6]


def hat_test():
    return [r for r in hat_full.load() if r["split"] == "test" and r["words"] >= 100]


def fresh():
    return S.longform()


def fresh_edited(ai_rows, human_rows, seed=424242):
    """AI long-form, lightly edited; and the same editor on fresh humans as control."""
    out = []
    for i, r in enumerate(ai_rows):
        tgt = FRESH_EDIT_TARGETS[i % len(FRESH_EDIT_TARGETS)]
        txt, frac = editor.edit(r["text"], tgt, seed=seed + i)
        out.append({"id": f"fe-{r['id']}", "text": txt, "ai_ratio": 1.0 - frac,
                    "band": f"edited-{tgt:.2f}", "register": r["register"], "side": "ai"})
    for i, r in enumerate(human_rows):
        tgt = FRESH_EDIT_TARGETS[i % len(FRESH_EDIT_TARGETS)]
        txt, frac = editor.edit(r["text"], tgt, seed=seed + 31337 + i)
        out.append({"id": f"fh-{r['id']}", "text": txt, "ai_ratio": 0.0,
                    "band": "human-edited-control", "register": r["register"], "side": "human"})
    return out


def fresh_mixed(ai_rows, human_rows, seed=515151):
    pool = []
    for r in human_rows:
        for p in editor.split_paras(r["text"]):
            if 25 <= len(p.split()) <= 140:
                pool.append(p)
    out = []
    for i, r in enumerate(ai_rows):
        share = FRESH_MIX_SHARES[i % len(FRESH_MIX_SHARES)]
        txt, ratio = editor.mix_paragraphs(r["text"], pool, share, seed=seed + i)
        out.append({"id": f"fm-{r['id']}", "text": txt, "ai_ratio": ratio,
                    "band": f"mix-h{share:.2f}", "register": r["register"], "side": "ai"})
    return out
