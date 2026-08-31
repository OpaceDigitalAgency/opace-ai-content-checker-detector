"""Harness proof: reproduce the shipped 883/922 and 45/4,636 exactly.

Uses the reference harness at research/corpus-reconciliation-2026-08-29/harness.py
(fp32 ONNX, shipped tokeniser, temperature 0.8324, segments-v3) and the shipped
minimum-evidence PAIR rule 0.9855 / 0.9763. Full precision throughout: the 4 dp
segment store rounds 884/922 where the truth is 883/922.
"""
import json, os, sys, time

RESEARCH = "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/ai-watermark-and-content-authenticity/implementation/services/local-engine/research"
HARNESS = os.path.join(RESEARCH, "corpus-reconciliation-2026-08-29")
CORPUS = os.path.join(RESEARCH, "longform-corpus")
sys.path.insert(0, HARNESS)
_cwd = os.getcwd(); os.chdir(HARNESS)
import harness  # noqa
os.chdir(_cwd)

PRIMARY, SECONDARY = 0.9855, 0.9763


def score_doc(text):
    parts = harness.segment_text(text, harness.count_tokens)
    probs = []
    for i in range(0, len(parts), 16):
        probs.extend(harness.score_batch([p.text for p in parts[i:i + 16]]))
    return probs


def flagged(seg, primary=PRIMARY, secondary=SECONDARY):
    s = sorted(seg, reverse=True)
    if not s:
        return False
    return s[0] >= primary or (len(s) > 1 and s[1] >= secondary)


def main(out_path):
    print(f"model      {harness.MODEL_PATH}")
    print(f"model sha  {harness.MODEL_SHA}")
    print(f"segments   {harness.SEGMENTATION_CONTRACT}")
    print(f"temperature{harness.TEMPERATURE}")
    print(f"pair       {PRIMARY}/{SECONDARY}", flush=True)
    rows = []
    t0 = time.time()
    for name, side in (("ai-longform.jsonl", "ai"), ("human-longform.jsonl", "human")):
        n = 0
        for line in open(os.path.join(CORPUS, name)):
            r = json.loads(line)
            rows.append({"side": side, "register": r.get("register"), "seg": score_doc(r["text"])})
            n += 1
            if n % 500 == 0:
                print(f"  {side} {n} in {time.time()-t0:.0f}s", flush=True)
        print(f"DONE {side} {n} in {time.time()-t0:.0f}s", flush=True)

    ai = [r for r in rows if r["side"] == "ai"]
    hu = [r for r in rows if r["side"] == "human"]
    a = sum(1 for r in ai if flagged(r["seg"]))
    h = sum(1 for r in hu if flagged(r["seg"]))
    print()
    print(f"AI detected        {a}/{len(ai)}  (expected 883/922)")
    print(f"human false pos    {h}/{len(hu)}  (expected 45/4636)")
    ok = (a == 883 and len(ai) == 922 and h == 45 and len(hu) == 4636)
    print("HARNESS PROOF:", "PASS" if ok else "FAIL")
    json.dump({"ai_detected": a, "ai_n": len(ai), "human_fp": h, "human_n": len(hu),
               "pass": ok, "model_sha256": harness.MODEL_SHA,
               "segmentation": harness.SEGMENTATION_CONTRACT,
               "temperature": harness.TEMPERATURE,
               "pair": [PRIMARY, SECONDARY],
               "rows": [{"side": r["side"], "register": r["register"], "seg": r["seg"]} for r in rows]},
              open(out_path, "w"))
    print("wrote", out_path)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
