"""Tighter latency comparison: fp32 vs int8-per-channel, interleaved to cancel
machine load drift, 60 warm iterations each, 1 and 2 threads, plus batch-8
throughput. Also 512-token worst case vs a real ~500-word document."""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, onnxruntime as ort
from transformers import AutoTokenizer
from common import CKPT, DEPLOYED_INT8, DEPLOYED_FP32, load_longform, save

rows = load_longform()
docs = [r["text"] for r in rows if 400 <= r["word_count"] <= 700][:80]
tok = AutoTokenizer.from_pretrained(CKPT)
enc1 = tok(docs[0], truncation=True, max_length=512, padding="max_length", return_tensors="np")
FEED1 = {k: v.astype(np.int64) for k, v in enc1.items() if k in ("input_ids", "attention_mask")}
enc8 = tok(docs[:8], truncation=True, max_length=512, padding="max_length", return_tensors="np")
FEED8 = {k: v.astype(np.int64) for k, v in enc8.items() if k in ("input_ids", "attention_mask")}

def mk(path, th):
    o = ort.SessionOptions(); o.intra_op_num_threads = th
    return ort.InferenceSession(path, o, providers=["CPUExecutionProvider"])

sess = {}
for label, path in (("int8", DEPLOYED_INT8), ("fp32", DEPLOYED_FP32)):
    for th in (1, 2):
        s = mk(path, th)
        names = [i.name for i in s.get_inputs()]
        f1 = {n: FEED1[n] for n in names if n in FEED1}
        f8 = {n: FEED8[n] for n in names if n in FEED8}
        for _ in range(3): s.run(None, f1)
        sess[(label, th)] = (s, f1, f8)

lat = {k: [] for k in sess}
lat8 = {k: [] for k in sess}
for r in range(60):                       # interleave to cancel load drift
    for k, (s, f1, f8) in sess.items():
        t0 = time.perf_counter(); s.run(None, f1); lat[k].append((time.perf_counter()-t0)*1000)
for r in range(15):
    for k, (s, f1, f8) in sess.items():
        t0 = time.perf_counter(); s.run(None, f8); lat8[k].append((time.perf_counter()-t0)*1000)

out = {"note": "Apple Silicon M-series, darwin, ORT 1.29 CPUExecutionProvider, 512-token "
               "padded input. Interleaved measurement. Cloud x86 vCPU is typically "
               "1.5-2.5x slower per core.", "per_request_ms": {}, "batch8_ms": {}}
for k in sess:
    a = np.array(lat[k]); b = np.array(lat8[k])
    out["per_request_ms"][f"{k[0]}@{k[1]}thread"] = {
        "p50": round(float(np.percentile(a,50)),1), "p95": round(float(np.percentile(a,95)),1),
        "mean": round(float(a.mean()),1), "n": len(a)}
    out["batch8_ms"][f"{k[0]}@{k[1]}thread"] = {
        "p50_total": round(float(np.percentile(b,50)),1),
        "p50_per_doc": round(float(np.percentile(b,50))/8,1), "n": len(b)}
for k,v in out["per_request_ms"].items(): print("req ",k,v, flush=True)
for k,v in out["batch8_ms"].items(): print("bat8",k,v, flush=True)
save("latency-bench-2.json", out)
