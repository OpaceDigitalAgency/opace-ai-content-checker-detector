#!/usr/bin/env python3
"""Does the humanise prompt actually reproduce the owner's 80.8% article?

Compares his article against the humanise samples the prompt produced, on cheap
surface features. If his article sits outside the distribution of what the
prompt generated, the pilot measures his INSTRUCTIONS, not that ARTICLE.
"""
import os, re, json, statistics, collections

HERE = os.path.dirname(os.path.abspath(__file__))
SAMP = ("/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-"
        "other-plugins/3d333977-d6e8-4c79-83bd-ca366ac347bb/scratchpad/samples")

DISCOURSE = ["however","moreover","furthermore","therefore","nonetheless",
    "nevertheless","notably","thus","ultimately","consequently","additionally",
    "meanwhile","similarly","conversely","accordingly","on the other hand",
    "in addition","as a result","for example","for instance","in contrast",
    "that said","in other words","of course","indeed","besides","hence",
    "instead","although","whereas","despite","in particular","overall","finally"]
_DR = [re.compile(r"\b"+re.escape(m)+r"\b", re.I) for m in DISCOURSE]
_SENT = re.compile(r"(?<=[.!?])\s+")


def feats(text):
    words = text.split()
    n = max(1, len(words))
    sents = [s for s in _SENT.split(re.sub(r"\s+", " ", text.strip())) if s.strip()]
    sl = [len(s.split()) for s in sents] or [0]
    paras = [p for p in re.split(r"\n\s*\n", text.strip()) if p.strip()]
    toks = [w.lower().strip(".,;:!?\"'()") for w in words]
    return {
        "words": len(words),
        "sent_mean": round(statistics.mean(sl), 2),
        "sent_sd": round(statistics.pstdev(sl), 2) if len(sl) > 1 else 0.0,
        "sent_max": max(sl),
        "discourse_per_1k": round(1000*sum(len(r.findall(text)) for r in _DR)/n, 2),
        "emdash_per_1k": round(1000*(text.count("—")+text.count("--"))/n, 2),
        "comma_per_1k": round(1000*text.count(",")/n, 2),
        "link_per_1k": round(1000*len(re.findall(r"https?://|\]\(", text))/n, 2),
        "paras": len(paras),
        "words_per_para": round(n/max(1, len(paras)), 1),
        "ttr": round(len(set(toks))/n, 3),
    }


def pctile(v, xs):
    xs = sorted(xs)
    below = sum(1 for x in xs if x < v)
    return 100.0 * below / max(1, len(xs))


def main():
    art = open(os.path.join(SAMP, "9-ai-with-humanise-instructions.txt"),
               encoding="utf-8", errors="replace").read()
    af = feats(art)

    rows = [json.loads(l) for l in open(os.path.join(HERE, "pilot-ai-samples.jsonl"))]
    hum = [r for r in rows if r["style"] == "humanise"
           and r["target_len"] in (400, 600)]
    others = [r for r in rows if r["style"] != "humanise"
              and r["target_len"] in (400, 600)]
    hf = [feats(r["text"]) for r in hum]
    of = [feats(r["text"]) for r in others]

    human6 = []
    for i in range(1, 7):
        for fn in os.listdir(SAMP):
            if fn.startswith(f"{i}-") and fn.endswith(".txt"):
                human6.append(feats(open(os.path.join(SAMP, fn), encoding="utf-8",
                                         errors="replace").read()))
    keys = ["words","sent_mean","sent_sd","sent_max","discourse_per_1k",
            "emdash_per_1k","comma_per_1k","link_per_1k","words_per_para","ttr"]

    print("Does the humanise prompt reproduce the owner's 80.8% article?")
    print(f"his article vs {len(hf)} generated humanise samples (400/600w bands), "
          f"{len(of)} other-style samples, {len(human6)} of his human samples\n")
    print(f"{'feature':18s} {'HIS ARTICLE':>12s} {'humanise med':>13s} "
          f"{'[p10,p90]':>16s} {'his %ile':>9s} {'other med':>10s} {'human med':>10s}")
    print("-"*94)
    outside = []
    for k in keys:
        hv = [f[k] for f in hf]; ov = [f[k] for f in of]; uv = [f[k] for f in human6]
        p10 = sorted(hv)[int(0.10*(len(hv)-1))]
        p90 = sorted(hv)[int(0.90*(len(hv)-1))]
        pc = pctile(af[k], hv)
        mark = ""
        if af[k] < p10 or af[k] > p90:
            mark = "  <-- OUTSIDE p10-p90"
            outside.append(k)
        print(f"{k:18s} {af[k]:12.2f} {statistics.median(hv):13.2f} "
              f"[{p10:6.2f},{p90:7.2f}] {pc:8.1f}% {statistics.median(ov):10.2f} "
              f"{statistics.median(uv):10.2f}{mark}")
    print(f"\nfeatures where his article falls outside the generated humanise "
          f"p10-p90 band: {len(outside)}/{len(keys)}")
    print("  " + (", ".join(outside) if outside else "(none)"))
    json.dump({"his_article": af, "outside": outside},
              open(os.path.join(HERE, "surface-compare.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
