#!/usr/bin/env bash
# Full reproduction. Requires .venv (python -m venv .venv &&
# .venv/bin/pip install onnxruntime transformers numpy pandas pyarrow) and node.
set -euo pipefail
cd "$(dirname "$0")"
./fetch_sources.sh
.venv/bin/python build_current_set.py
.venv/bin/python build_stripped.py
.venv/bin/python build_control_set.py
node score_rules.mjs current-eval-set.jsonl          rules-raw.jsonl
node score_rules.mjs current-eval-set-stripped.jsonl rules-stripped.jsonl
node score_rules.mjs control-eval-set.jsonl          rules-control.jsonl
.venv/bin/python score_tier3.py current-eval-set.jsonl          tier3-raw.jsonl
.venv/bin/python score_tier3.py current-eval-set-stripped.jsonl tier3-stripped.jsonl
.venv/bin/python score_tier3.py control-eval-set.jsonl          tier3-control.jsonl
# secondary probe (unlicensed source, fetched to /tmp, text not stored in repo)
.venv/bin/python build_prose_probe.py
.venv/bin/python score_tier3.py /tmp/eqbench-probe/prose-probe.jsonl /tmp/eqbench-probe/tier3-probe-raw.jsonl
.venv/bin/python analyse.py
