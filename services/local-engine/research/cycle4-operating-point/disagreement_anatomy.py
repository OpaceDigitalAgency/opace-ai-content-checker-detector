"""What the documents that change verdict between the two routes have in common.

Two different comparisons get called "the flips" and they are not the same
thing, so both are produced here and each is labelled:

  PYTHON int8   fp32 ONNX against int8 ONNX, both under Python onnxruntime.
                This is what the export gate and `int8_at_operating_point.py`
                measure. It is a property of the FILE.
  BROWSER int8  fp32 ONNX under Python onnxruntime against the int8 file under
                onnxruntime-web's WASM provider - the two runtimes a visitor
                actually gets. This is the one §4.4 is about, and it is the
                larger of the two, because the web build does not apply the
                extended int8 fusions Python applies at ORT_ENABLE_ALL.

For each set it reports register, length band, and how far the decision key sat
from the primary - the question being whether the disagreements are documents
sitting on the fence, or documents the two runtimes genuinely score apart.
"""
from __future__ import annotations
import argparse, collections, json, os

RATIO = 0.9763 / 0.9855


def load(p):
    return [json.loads(l) for l in open(p)]


def key(seg_p):
    q = sorted(seg_p, reverse=True)
    if not q:
        return 0.0
    return max(q[0], q[1] / RATIO) if len(q) > 1 else q[0]


def flagged(seg_p, pri, sec):
    q = sorted(seg_p, reverse=True)
    return bool(q) and (q[0] >= pri or (len(q) > 1 and q[1] >= sec))


def lband(w):
    for lo, hi, nm in ((0, 600, "<600"), (600, 850, "600-849"), (850, 1200, "850-1199"),
                       (1200, 2000, "1200-1999"), (2000, 10**9, ">=2000")):
        if lo <= (w or 0) < hi:
            return nm
    return ">=2000"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fp32-dir", required=True)
    ap.add_argument("--web-dir", required=True)
    ap.add_argument("--prefix-fp32", default="c4a")
    ap.add_argument("--prefix-web", default="c4a-web")
    ap.add_argument("--primary", type=float, required=True)
    ap.add_argument("--secondary", type=float, required=True)
    a = ap.parse_args()

    fp, web, meta = {}, {}, {}
    for name in ("lf-hu", "lf-ai"):
        for r in load(os.path.join(a.fp32_dir, f"{a.prefix_fp32}-{name}.jsonl")):
            fp[r["id"]] = r
            meta[r["id"]] = r
        for r in load(os.path.join(a.web_dir, f"{a.prefix_web}-{name}.jsonl")):
            web[r["id"]] = r

    ids = [i for i in fp if i in web]
    dis = [i for i in ids
           if flagged(fp[i]["seg_p"], a.primary, a.secondary)
           != flagged(web[i]["seg_p"], a.primary, a.secondary)]
    print(f"BROWSER int8 vs fp32 server, pair {a.primary}/{a.secondary}")
    print(f"  documents compared {len(ids)}   disagreeing {len(dis)} = "
          f"{100*len(dis)/len(ids):.2f}%")
    side = collections.Counter(meta[i].get("side") for i in dis)
    print(f"  by side: {dict(side)}")
    print(f"  direction: browser-only flag "
          f"{sum(1 for i in dis if flagged(web[i]['seg_p'], a.primary, a.secondary))}, "
          f"server-only flag "
          f"{sum(1 for i in dis if flagged(fp[i]['seg_p'], a.primary, a.secondary))}")

    reg = collections.Counter(meta[i].get("genre") or meta[i].get("register") for i in dis)
    tot = collections.Counter(meta[i].get("genre") or meta[i].get("register") for i in ids)
    print("\n  by register (disagreeing / all):")
    for k, v in reg.most_common():
        print(f"    {str(k):<24} {v:3d}/{tot[k]:<5} = {100*v/tot[k]:5.2f}%")
    lb = collections.Counter(lband(meta[i].get("n_words")) for i in dis)
    tl = collections.Counter(lband(meta[i].get("n_words")) for i in ids)
    print("\n  by length band:")
    for k in ("<600", "600-849", "850-1199", "1200-1999", ">=2000"):
        if tl[k]:
            print(f"    {k:<12} {lb[k]:3d}/{tl[k]:<5} = {100*lb[k]/tl[k]:5.2f}%")

    print("\n  how close to the primary did the decision sit?")
    d = sorted(min(abs(key(fp[i]["seg_p"]) - a.primary),
                   abs(key(web[i]["seg_p"]) - a.primary)) for i in dis)
    import statistics
    print(f"    |key - primary|, nearer route: median {statistics.median(d):.5f} "
          f"p90 {d[int(.9*len(d))]:.5f} max {d[-1]:.5f}")
    within = sum(1 for x in d if x <= 0.01)
    print(f"    within 0.01 of the primary: {within}/{len(d)}")
    allk = sorted(abs(key(fp[i]["seg_p"]) - a.primary) for i in ids)
    near = sum(1 for x in allk if x <= 0.01)
    print(f"    for scale, ALL documents within 0.01 of the primary on the "
          f"server route: {near}/{len(ids)}")

    print("\n  per-segment probability difference between the routes, "
          "disagreeing documents only:")
    ds = []
    for i in dis:
        for x, y in zip(sorted(fp[i]["seg_p"], reverse=True),
                        sorted(web[i]["seg_p"], reverse=True)):
            ds.append(abs(x - y))
    ds.sort()
    print(f"    n={len(ds)} median {statistics.median(ds):.4f} "
          f"p90 {ds[int(.9*len(ds))]:.4f} max {ds[-1]:.4f}")
    da = []
    for i in ids:
        for x, y in zip(sorted(fp[i]["seg_p"], reverse=True),
                        sorted(web[i]["seg_p"], reverse=True)):
            da.append(abs(x - y))
    da.sort()
    print(f"    all documents: n={len(da)} median {statistics.median(da):.4f} "
          f"p90 {da[int(.9*len(da))]:.4f} max {da[-1]:.4f}")


if __name__ == "__main__":
    main()
