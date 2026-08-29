"""Measure real single-request inference latency for the deployed cycle-2 model.
Feeds actual held-out documents; reports cold-start (session creation + first
inference) and warm per-request latency at 1, 2 and 4 intra-op threads."""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, onnxruntime as ort
from transformers import AutoTokenizer
from common import CKPT, DEPLOYED_INT8, DEPLOYED_FP32, load_longform, save, size_mb

rows = load_longform()
# realistic ~500-word documents
docs = [r["text"] for r in rows if 400 <= r["word_count"] <= 700][:40]
print(f"{len(docs)} documents of 400-700 words", flush=True)
tok = AutoTokenizer.from_pretrained(CKPT)

def run(path, threads):
    t0 = time.perf_counter()
    o = ort.SessionOptions(); o.intra_op_num_threads = threads
    sess = ort.InferenceSession(path, o, providers=["CPUExecutionProvider"])
    load_s = time.perf_counter() - t0
    names = [i.name for i in sess.get_inputs()]
    def one(text):
        enc = tok(text, truncation=True, max_length=512, padding="max_length", return_tensors="np")
        feed = {n: enc[n].astype(np.int64) for n in names if n in enc}
        return sess.run(None, feed)[0]
    t0 = time.perf_counter(); one(docs[0]); first_s = time.perf_counter() - t0
    lat = []
    for d in docs[1:26]:
        t0 = time.perf_counter(); one(d); lat.append((time.perf_counter()-t0)*1000)
    lat = np.array(lat)
    return {"session_load_ms": round(load_s*1000,1), "first_inference_ms": round(first_s*1000,1),
            "warm_p50_ms": round(float(np.percentile(lat,50)),1),
            "warm_p95_ms": round(float(np.percentile(lat,95)),1),
            "warm_mean_ms": round(float(lat.mean()),1), "n": len(lat)}

out = {"machine": "Apple Silicon (darwin), onnxruntime CPUExecutionProvider",
       "note": "reference numbers only; cloud x86 vCPUs are typically 1.5-2.5x slower per core",
       "results": {}}
for label, path in (("int8-perchannel-34.3MB", DEPLOYED_INT8), ("fp32-133.8MB", DEPLOYED_FP32)):
    for th in (1, 2, 4):
        k = f"{label}@{th}thread"
        out["results"][k] = run(path, th)
        out["results"][k]["size_mb"] = size_mb(path)
        print(k, out["results"][k], flush=True)
save("latency-bench.json", out)
