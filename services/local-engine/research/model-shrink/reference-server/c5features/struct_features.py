"""Cycle-5 structural feature extraction.

The seven measured fingerprint components from
docs/measurements/DOCUMENT-TELLS-2026-08-31.md (final addendum), computed by
IMPORTING the code that measured them, never by re-implementation:

  0 wpp_cv            words-per-paragraph CV            measure_new_human.word_metrics
  1 sec_within15      body-section length uniformity    measure_new_human.word_metrics
  2 pps_var           paras-per-section within-doc var  measure_fingerprint.fingerprint
  3 body_mode_share   section-shape mode share          measure_scaffold_v2.doc_metrics
  4 spp_cv            sentence-length CV                measure_scaffold_v2.doc_metrics
  5 adj_overlap       adjacent-sentence content-word    signal-science features.py
                      overlap (dis_adjacent_sent_cohesion code path)
  6 cadence_rate      paragraph cadence rate            signal-science cadence.compute
  7 has_structure     1 if the doc parses to >=1 heading or >=3 paragraph
                      blocks (missingness indicator for 0-4)

Missing components are NaN here; the training pipeline imputes with the
TRAIN-split mean after z-normalisation (i.e. zero), with feature 7 carrying
the missingness signal for the structure-dependent components.

CLI: struct_features.py <in.jsonl> <out.jsonl> [text_key]
  reads jsonl with a text field, writes {sha_norm, feats:[8]} rows.
  Resumable: rows already present in out.jsonl are skipped.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# Vendored copy (cycle-5 server deploy): every module this file measured with
# lives verbatim in THIS directory, so the research-tree sibling paths of the
# original are replaced by HERE and nothing else is changed.
sys.path.insert(0, HERE)

from measure_scaffold_v2 import doc_metrics, classify_blocks  # noqa: E402
from measure_new_human import word_metrics  # noqa: E402
from measure_fingerprint_bridge import fingerprint_pps_var  # noqa: E402
import features as ss_features  # noqa: E402  (signal-science)
import cadence as ss_cadence  # noqa: E402

N_FEATS = 8
FEAT_NAMES = ["wpp_cv", "sec_within15", "pps_var", "body_mode_share",
              "spp_cv", "adj_overlap", "cadence_rate", "has_structure"]


def _adjacent_overlap(text: str) -> float:
    """The dis_adjacent_sent_cohesion computation from signal-science
    features.py, using that module's own sentence splitter, word regex and
    stopword list so the value is the measured one."""
    sents = ss_features._sentences(text)
    sentsets = []
    for s in sents:
        cs = {w.lower() for w in ss_features.WORD_RE.findall(s)
              if w.lower() not in ss_features.STOPWORDS}
        sentsets.append(cs)
    ov, k = 0.0, 0
    for i in range(len(sentsets) - 1):
        a, b = sentsets[i], sentsets[i + 1]
        if a and b:
            ov += len(a & b) / len(a | b)
            k += 1
    return ov / k if k else float("nan")


def extract(text: str) -> list:
    nan = float("nan")
    out = [nan] * N_FEATS
    try:
        wm = word_metrics(text)
        out[0] = wm.get("wpp_cv", nan) if wm.get("wpp_cv") is not None else nan
        out[1] = wm.get("sec_within15", nan) if wm.get("sec_within15") is not None else nan
    except Exception:
        pass
    try:
        out[2] = fingerprint_pps_var(text)
    except Exception:
        pass
    try:
        dm = doc_metrics(text)
        v = dm.get("body_mode_share")
        out[3] = v if v is not None else nan
        v = dm.get("spp_cv")
        out[4] = v if v is not None else nan
    except Exception:
        dm = {}
    try:
        out[5] = _adjacent_overlap(text)
    except Exception:
        pass
    try:
        c = ss_cadence.compute(text)
        v = c.get("paragraph_cadence_rate")
        out[6] = v if v is not None and not (isinstance(v, float) and math.isnan(v)) else nan
    except Exception:
        pass
    try:
        blocks = classify_blocks(text)
        n_head = sum(1 for k, _ in blocks if k == "heading")
        n_para = sum(1 for k, _ in blocks if k == "para")
        out[7] = 1.0 if (n_head >= 1 or n_para >= 3) else 0.0
    except Exception:
        out[7] = 0.0
    return [float(v) for v in out]


def norm_key(text: str) -> str:
    return hashlib.sha256(" ".join(text.split()).lower().encode("utf-8")).hexdigest()


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    tkey = sys.argv[3] if len(sys.argv) > 3 else "text"
    done = set()
    if os.path.exists(dst):
        for line in open(dst):
            if line.strip():
                done.add(json.loads(line)["sha_norm"])
    rows = []
    for line in open(src, errors="replace"):
        line = line.strip()
        if not line:
            continue
        r = json.loads(line)
        t = r.get(tkey) or ""
        if not t:
            continue
        rows.append(t)
    print(f"{src}: {len(rows)} texts, {len(done)} already cached", flush=True)
    import time
    t0, n = time.time(), 0
    with open(dst, "a") as fh:
        for t in rows:
            k = norm_key(t)
            if k in done:
                continue
            done.add(k)
            fh.write(json.dumps({"sha_norm": k, "feats": extract(t)}) + "\n")
            n += 1
            if n % 500 == 0:
                print(f"  {n} new in {time.time()-t0:.0f}s", flush=True)
                fh.flush()
    print(f"DONE {dst}: +{n} rows in {time.time()-t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
