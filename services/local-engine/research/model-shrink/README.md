# model-shrink

Started as "make the 34.3 MB detector small enough to load by default". Redirected
part-way to "host it instead". Both outcomes are recorded.

- **[`SERVER-INFERENCE-PLAN.md`](SERVER-INFERENCE-PLAN.md)** — the live deliverable.
  Hosting options with verified costs, the API, abuse protection, UK GDPR analysis and
  draft copy, and the default interface behaviour.
- **[`MODEL-SHRINK-REPORT.md`](MODEL-SHRINK-REPORT.md)** — the closed brief. No shrink
  candidate was built; what *was* measured, and the constraints a future attempt inherits
  if the Chrome extension or WordPress plugin needs one.
- `reference-server/` — a working endpoint implementing the plan's decisions.
- `scripts/` — the measurement pipeline. `common.py` is the single code path;
  `01_baseline.py`, `bench_latency2.py`, `bench_coldstart.py` produce `results/`.
- `results/` — raw JSON for every number quoted in either document.

Reproduce:

```sh
PY=<venv with torch, transformers, onnx, onnxruntime, numpy>
cd scripts
$PY 01_baseline.py       # ~15 min: fp32 and int8 over 5,558 held-out documents
$PY bench_latency2.py    # ~2 min
$PY bench_coldstart.py   # ~1 min
```

Nothing here writes to `models/`. `tier3-cycle2-*` and `tier3-e5small-*` were never
opened for writing.
