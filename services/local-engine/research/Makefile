# Local-engine model-tier research pipeline (offline foundation).
# One command end-to-end:  make all  (or step targets below).
#
# PY must point at a venv with: torch, transformers, numpy, scipy, pandas,
# pyarrow, scikit-learn, onnx, onnxruntime. See README.md.

PY ?= /private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins/1fc732d4-98d7-4177-8945-5a9833d4621d/scratchpad/synthid-venv/bin/python
export EVAL_SAMPLES_PATH ?= /private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins/1fc732d4-98d7-4177-8945-5a9833d4621d/scratchpad/eval-samples.json

.PHONY: all corpus tier2 tier3 onnx golden eval

all: corpus tier2 tier3 onnx golden eval

corpus:
	cd corpus && $(PY) generate_gpt2.py && $(PY) build_corpus.py

tier2:
	cd tier2 && $(PY) compute_features.py && $(PY) train_head.py

tier3:
	cd tier3 && $(PY) train_classifier.py

onnx:
	cd tier3 && $(PY) export_onnx.py

golden:
	cd tier2 && $(PY) golden_vectors.py

eval:
	cd eval && $(PY) run_eval.py
