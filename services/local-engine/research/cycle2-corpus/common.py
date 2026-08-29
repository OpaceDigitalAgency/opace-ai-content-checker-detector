"""Normalisation, filtering, quarantine and split logic shared by the builders."""

from __future__ import annotations

import hashlib
import json
import os
import re
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
BATTERY = os.path.abspath(os.path.join(RESEARCH, "..", "..", "..", "tests", "battery"))

EVAL_SAMPLES_PATH = os.environ.get(
    "EVAL_SAMPLES_PATH",
    "/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins/"
    "1fc732d4-98d7-4177-8945-5a9833d4621d/scratchpad/eval-samples.json",
)

# ---------------------------------------------------------------- normalisation

_WS = re.compile(r"\s+")
_WORD = re.compile(r"[a-z0-9']+")


def clean_text(t: str) -> str:
    """Light surface clean-up. Deliberately does NOT strip markdown or rewrite
    prose: the classifier must see documents as a user would paste them."""
    if not isinstance(t, str):
        return ""
    t = unicodedata.normalize("NFKC", t)
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def norm_for_hash(t: str) -> str:
    """Canonical form used for dedupe, quarantine and split assignment."""
    t = unicodedata.normalize("NFKD", t or "").lower()
    t = "".join(c for c in t if not unicodedata.combining(c))
    return " ".join(_WORD.findall(t))


def text_hash(t: str) -> str:
    return hashlib.sha256(norm_for_hash(t).encode("utf-8")).hexdigest()


def words(t: str) -> list[str]:
    return _WORD.findall((t or "").lower())


def ngrams(t: str, n: int = 8) -> set[tuple[str, ...]]:
    w = words(t)
    return {tuple(w[i : i + n]) for i in range(len(w) - n + 1)}


# ---------------------------------------------------------------- prose filter

_BAD_CHARS = re.compile(r"[Ѐ-ӿ一-鿿؀-ۿऀ-ॿ]")
_URLISH = re.compile(r"https?://|www\.")


def is_english_prose(t: str) -> bool:
    if not t or _BAD_CHARS.search(t):
        return False
    letters = sum(c.isalpha() for c in t)
    if letters < 0.55 * max(len(t), 1):
        return False
    # reject nav/link dumps and list-only pages
    lines = [l for l in t.split("\n") if l.strip()]
    if not lines:
        return False
    shortish = sum(1 for l in lines if len(l.split()) < 6)
    if len(lines) >= 6 and shortish / len(lines) > 0.6:
        return False
    if len(_URLISH.findall(t)) > 6:
        return False
    # needs real sentences
    if len(re.findall(r"[.!?][\s\"')\]]", t)) < 3:
        return False
    return True


def acceptable(t: str, min_words: int, max_words: int) -> bool:
    n = len(words(t))
    return min_words <= n <= max_words and is_english_prose(t)


# ---------------------------------------------------------------- quarantine

class Quarantine:
    """Hard exclusion index.

    Built from three held-out sets:
      1. eval-samples.json                     (the frozen 34-sample eval set)
      2. provider-eval/eval-set.jsonl test rows (corpus_split == "test")
      3. tests/battery/human-corpus-v*.json     (the shipped regression battery)

    Two tiers, deliberately:

    * HARD (1 and 2) - the frozen evaluation sets. An exact normalised-hash
      match raises and ABORTS the build. Eval leakage is never recoverable, so
      it must stop the run rather than be quietly filtered.
    * SOFT (3) - the shipped regression battery. This file is being extended by
      another workstream from the same public archives this corpus draws on, so
      collisions are expected rather than exceptional; a colliding candidate is
      DROPPED and counted. The battery rows themselves are still admitted, as
      themselves, pinned to the test split.

    Both tiers also get an 8-gram containment check (>10% drops the candidate),
    which catches near-duplicates differing only in surface punctuation.
    """

    def __init__(self) -> None:
        self.hashes: dict[str, str] = {}
        self.hard_hashes: dict[str, str] = {}
        self.grams: set[tuple[str, ...]] = set()
        self.sources: dict[str, int] = {}
        self.battery_hashes: set[str] = set()
        # The battery files are being extended by another workstream while this
        # builds. Snapshot them ONCE here so the index and the admitted rows can
        # never disagree about which rows exist.
        self.battery_rows: list[tuple[str, dict]] = []
        self._load()

    def _add(self, text: str, origin: str, hard: bool = True) -> None:
        h = text_hash(text)
        if not h:
            return
        self.hashes[h] = origin
        if hard:
            self.hard_hashes[h] = origin
        self.grams |= ngrams(text)
        self.sources[origin] = self.sources.get(origin, 0) + 1

    def _load(self) -> None:
        if not os.path.exists(EVAL_SAMPLES_PATH):
            raise FileNotFoundError(
                f"Quarantined eval set missing at {EVAL_SAMPLES_PATH}; refusing to build. "
                "Set EVAL_SAMPLES_PATH."
            )
        for s in json.load(open(EVAL_SAMPLES_PATH)):
            self._add(s["text"], "eval-samples.json")

        es = os.path.join(RESEARCH, "provider-eval", "eval-set.jsonl")
        if not os.path.exists(es):
            raise FileNotFoundError(f"provider-eval/eval-set.jsonl missing at {es}; refusing to build.")
        n = 0
        for line in open(es):
            r = json.loads(line)
            if r.get("corpus_split") == "test":
                self._add(r["text"], "provider-eval/eval-set.jsonl:test")
                n += 1
        if n == 0:
            raise RuntimeError("eval-set.jsonl yielded zero test rows; the quarantine index would be incomplete.")

        found = False
        for fn in sorted(os.listdir(BATTERY)):
            if fn.startswith("human-corpus-v") and fn.endswith(".json"):
                found = True
                for s in json.load(open(os.path.join(BATTERY, fn))):
                    t = s.get("text") or s.get("body") or ""
                    self._add(t, f"tests/battery/{fn}", hard=False)
                    self.battery_hashes.add(text_hash(t))
                    self.battery_rows.append((fn, s))
        if not found:
            raise FileNotFoundError(f"No human-corpus-v*.json under {BATTERY}; refusing to build.")

    def check(self, text: str, doc_id: str, source: str) -> str | None:
        """Return None if clean, or a reason string if the row must be dropped.
        Raises on an exact normalised-hash collision (the hard rule)."""
        h = text_hash(text)
        if h in self.hard_hashes:
            raise RuntimeError(
                f"QUARANTINE VIOLATION: '{doc_id}' from source '{source}' is an exact "
                f"normalised-text match for a held-out row in {self.hard_hashes[h]}. "
                "Evaluation data must never enter training or calibration."
            )
        if h in self.hashes:
            return "battery-exact-match"
        g = ngrams(text)
        if g and len(g & self.grams) / len(g) > 0.10:
            return "8gram-overlap"
        return None


# ---------------------------------------------------------------- split

SPLIT_BOUNDS = (0.70, 0.85)  # train / cal / test


def assign_splits(records: list[dict]) -> None:
    """Content-hash split, stratified by (register, side, provider, era).

    Never index-based. Rows that share a `group` (e.g. all nine HAT-Bench
    versions of one essay, or a human source and its AI derivatives) are kept
    together so an edited copy of a training document cannot land in test.
    Within each stratum, groups are ordered by the SHA-256 of their group key
    and cut at the 70/85 quantiles, so every stratum gets the same proportions
    regardless of its size.
    """
    groups: dict[str, list[dict]] = {}
    for r in records:
        groups.setdefault(r["group"], []).append(r)

    strata: dict[tuple, list[str]] = {}
    for gid, rows in groups.items():
        r0 = rows[0]
        key = (r0["register"], r0["side"], r0["provider"], r0["era"])
        strata.setdefault(key, []).append(gid)

    for key, gids in strata.items():
        ordered = sorted(gids, key=lambda g: hashlib.sha256(g.encode()).hexdigest())
        n = len(ordered)
        a, b = int(n * SPLIT_BOUNDS[0]), int(n * SPLIT_BOUNDS[1])
        if n >= 3:
            a, b = max(a, 1), max(b, 2)
            b = min(b, n - 1)
            a = min(a, b - 1) if b >= 1 else a
        for i, gid in enumerate(ordered):
            split = "train" if i < a else ("cal" if i < b else "test")
            for r in groups[gid]:
                r["split"] = r.get("split_pin") or split


# ---------------------------------------------------------------- balancing

def balance_registers(records: list[dict], targets: dict[str, int]) -> dict:
    """Trim each (register, side) cell to a common per-register size.

    Collect generously, then balance, rather than guessing per-source caps:
    the axis that has to come out even is register x side, because register is
    exactly the axis on which the cycle-1 model failed. Each register's kept
    size is min(target, available AI, available human), so every register is
    class-balanced by construction and any shortfall is visible rather than
    papered over with one side's surplus.

    Rows carrying `split_pin` (the shipped regression battery) are exempt: they
    are pinned to test and must all survive.
    """
    pinned = [r for r in records if r.get("split_pin")]
    pool = [r for r in records if not r.get("split_pin")]

    cells: dict[tuple, dict[str, list[dict]]] = {}
    for r in pool:
        cells.setdefault((r["register"], r["side"]), {}).setdefault(r["group"], []).append(r)

    avail = {k: sum(len(v) for v in g.values()) for k, g in cells.items()}
    registers = sorted({k[0] for k in cells})
    effective = {
        reg: min(targets.get(reg, 10 ** 9), avail.get((reg, "ai"), 0), avail.get((reg, "human"), 0))
        for reg in registers
    }

    keep: set[int] = set(id(r) for r in pinned)
    report: dict[str, dict] = {}
    for (register, side), groups in cells.items():
        target = effective[register]
        ordered = sorted(groups, key=lambda g: hashlib.sha256((register + side + g).encode()).hexdigest())
        taken = 0
        for gid in ordered:
            if taken >= target:
                break
            for r in groups[gid]:
                keep.add(id(r))
            taken += len(groups[gid])
        report[f"{register}/{side}"] = {
            "available": avail[(register, side)],
            "asked_for": targets.get(register),
            "balanced_target": target,
            "kept": taken,
        }
    report["_pinned_battery_rows_exempt"] = {"kept": len(pinned)}
    records[:] = [r for r in records if id(r) in keep]
    return report
