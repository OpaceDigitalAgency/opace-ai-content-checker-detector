"""Cold start, measured as a fresh OS process: interpreter start -> imports ->
tokenizer load -> ORT session creation -> first inference returned. This is the
number every hosting vendor declines to publish for a 133 MB ONNX model."""
import subprocess, sys, os, json, statistics
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import DEPLOYED_FP32, DEPLOYED_INT8, CKPT, save

CHILD = r'''
import time; T0 = time.perf_counter()
import os, sys, json
os.environ["OMP_NUM_THREADS"] = "2"; os.environ["TOKENIZERS_PARALLELISM"] = "false"
import numpy as np, onnxruntime as ort
from transformers import AutoTokenizer
t_import = time.perf_counter() - T0
MODEL, CKPT = sys.argv[1], sys.argv[2]
t = time.perf_counter(); tok = AutoTokenizer.from_pretrained(CKPT); t_tok = time.perf_counter() - t
t = time.perf_counter()
o = ort.SessionOptions(); o.intra_op_num_threads = 2
s = ort.InferenceSession(MODEL, o, providers=["CPUExecutionProvider"])
t_sess = time.perf_counter() - t
names = [i.name for i in s.get_inputs()]
text = "The quick brown fox. " * 260
t = time.perf_counter()
enc = tok(text, truncation=True, max_length=512, padding="max_length", return_tensors="np")
s.run(None, {n: enc[n].astype(np.int64) for n in names if n in enc})
t_first = time.perf_counter() - t
print(json.dumps({"import_s": round(t_import,3), "tokenizer_s": round(t_tok,3),
                  "session_s": round(t_sess,3), "first_inference_s": round(t_first,3),
                  "total_s": round(time.perf_counter()-T0,3)}))
'''
p = os.path.join(HERE, "_cold_child.py")
open(p, "w").write(CHILD)
out = {"note": "fresh Python process each run, page cache warm (model already read once). "
               "A cloud container also pays image pull and OS/runtime start on top of this. "
               "Apple Silicon; cloud x86 vCPU typically 1.5-2.5x slower.", "runs": {}}
for label, model in (("fp32-133.8MB", DEPLOYED_FP32), ("int8-34.3MB", DEPLOYED_INT8)):
    rs = []
    for _ in range(5):
        r = subprocess.run([sys.executable, p, model, CKPT], capture_output=True, text=True)
        rs.append(json.loads(r.stdout.strip().splitlines()[-1]))
    out["runs"][label] = {k: round(statistics.median(x[k] for x in rs), 3) for k in rs[0]}
    out["runs"][label]["n"] = len(rs)
    print(label, out["runs"][label], flush=True)
os.remove(p)
save("coldstart-bench.json", out)
