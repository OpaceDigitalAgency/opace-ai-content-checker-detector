"""List lead-in frame repetition (owner extension).

Per structured doc (>=500 words, >=1 list):
  a) leadin_share  -- share of bullet-list blocks whose immediately
     preceding block is a paragraph ending in ':' with a short final line
  b) frame diversity -- each lead-in normalised to its verb frame
     ("may include", "can involve", "including", "as follows", ...);
     distinct frames / total lead-ins, and max same-frame repeat count
  c) modal_include_rate -- lead-ins matching modal + include/involve/
     cover/create/offer/require + ':' (the "may include:" family)

Usage: python3 measure_leadins.py
"""
import json
import os
import re
import statistics
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(RESEARCH, "document-tells-2026-08-31"))
from tells_lib import iter_jsonl  # noqa: E402
from measure_scaffold_v2 import classify_blocks  # noqa: E402

FRAME_RE = re.compile(
    r"\b(?:(may|might|can|could|will|would|should|typically|often|usually|"
    r"generally|commonly)\s+)?"
    r"(includes?|including|involves?|involving|covers?|covering|creates?|"
    r"offers?|requires?|provides?|consists? of|comprises?|such as|like|"
    r"as follows|are|is|be)\s*:?\s*$", re.I)
MODAL_INCLUDE_RE = re.compile(
    r"\b(may|might|can|could|will|would|should)\s+"
    r"(include|involve|cover|create|offer|require|provide)s?\s*:\s*$", re.I)


def doc_leadins(text):
    blocks = classify_blocks(text)
    lists = 0
    leadins = []          # normalised frames
    modal_include = 0
    for i, (k, c) in enumerate(blocks):
        if k != "bullets":
            continue
        lists += 1
        if i == 0 or blocks[i - 1][0] != "para":
            continue
        prev = blocks[i - 1][1].strip()
        last_line = prev.split("\n")[-1].strip()
        # final sentence of the preceding paragraph
        last_sent = re.split(r"(?<=[.!?])\s+", last_line)[-1] if last_line else ""
        if not last_sent.endswith(":"):
            continue
        if len(last_sent.split()) > 30:
            continue
        m = FRAME_RE.search(last_sent[:-1] + " :")
        m2 = FRAME_RE.search(last_sent)
        frame = None
        if m2:
            frame = ((m2.group(1) or "") + " " + m2.group(2)).strip().lower()
        elif m:
            frame = ((m.group(1) or "") + " " + m.group(2)).strip().lower()
        leadins.append(frame or "<other>")
        if MODAL_INCLUDE_RE.search(last_sent):
            modal_include += 1
    out = {"n_lists": lists, "n_leadins": len(leadins),
           "modal_include": modal_include}
    if lists:
        out["leadin_share"] = len(leadins) / lists
    if leadins:
        cnt = Counter(leadins)
        out["frame_distinct"] = len(cnt)
        out["frame_diversity"] = len(cnt) / len(leadins)
        out["max_frame_repeat"] = cnt.most_common(1)[0][1]
        out["top_frame"] = cnt.most_common(1)[0][0]
    return out


def agg(rows, name):
    e = [r for r in rows if r["words"] >= 500 and r["n_lists"] >= 1]
    if not e:
        return {"name": name, "n": 0}
    ls = [r["leadin_share"] for r in e]
    rep3 = [r for r in e if r.get("max_frame_repeat", 0) >= 3]
    mi = [r for r in e if r["modal_include"] >= 2]
    multi = [r for r in e if r["n_leadins"] >= 2]
    div = [r["frame_diversity"] for r in multi]
    return {
        "name": name,
        "docs_ge500w_with_list": len(e),
        "leadin_share_mean": round(statistics.mean(ls), 3),
        "docs_with_2plus_leadins": len(multi),
        "frame_diversity_mean": round(statistics.mean(div), 3) if div else None,
        "same_frame_3plus_rate": round(len(rep3) / len(e), 4),
        "modal_include_2plus_rate": round(len(mi) / len(e), 4),
        "top_frames": Counter(r.get("top_frame") for r in e
                              if r.get("top_frame")).most_common(6),
    }


def main():
    ai_rows, hu_rows = [], []
    by_model = {}
    for d in iter_jsonl(os.path.join(RESEARCH, "generated-corpus", "generated.jsonl")):
        if not d.get("usable"):
            continue
        r = doc_leadins(d["text"])
        r["words"] = len(d["text"].split())
        ai_rows.append(r)
        by_model.setdefault(d["model"], []).append(r)
    for d in iter_jsonl(os.path.join(HERE, "corpus.jsonl")):
        r = doc_leadins(d["text"])
        r["words"] = len(d["text"].split())
        r["register"] = d["register"]
        hu_rows.append(r)

    out = {
        "ai": agg(ai_rows, "ai"),
        "new_human": agg(hu_rows, "new_human"),
        "new_human_hard_neg_faq": agg([r for r in hu_rows
                                       if r.get("register") in ("faq", "faq-qa")],
                                      "hard_neg"),
        "ai_by_model": {m: agg(v, m) for m, v in sorted(by_model.items())},
    }
    with open(os.path.join(HERE, "leadin-frames.json"), "w") as f:
        json.dump(out, f, indent=1)
    for k in ("ai", "new_human", "new_human_hard_neg_faq"):
        print(json.dumps(out[k]))
    print("\nper-model same_frame_3plus / modal_include_2plus:")
    for m, a in out["ai_by_model"].items():
        if a.get("docs_ge500w_with_list"):
            print(f"  {m:<38} {a['same_frame_3plus_rate']:.3f}  "
                  f"{a['modal_include_2plus_rate']:.3f}  n={a['docs_ge500w_with_list']}")


if __name__ == "__main__":
    main()
