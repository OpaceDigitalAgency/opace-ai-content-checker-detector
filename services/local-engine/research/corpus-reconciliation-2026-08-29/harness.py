"""Local replica of the deployed server scoring path.

fp32 ONNX (the exact file under reference-server/model), the shipped tokeniser,
segments-v2 segmentation, temperature 0.8324, maximum across segments.
Nothing here talks to the production service.
"""
import os, sys, json, hashlib
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

REF = "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/ai-watermark-and-content-authenticity/implementation/services/local-engine/research/model-shrink/reference-server"
sys.path.insert(0, REF)
from segments import segment_text, SEGMENTATION_CONTRACT  # noqa: E402

MODEL_PATH = os.path.join(REF, "model", "tier3-cycle2-e5small-fp32.onnx")
TOKENIZER_DIR = os.path.join(REF, "model", "tokenizer")
TEMPERATURE = 0.8324
THRESHOLD = 0.984

_opts = ort.SessionOptions()
_opts.intra_op_num_threads = int(os.environ.get("ORT_THREADS", "8"))
_opts.log_severity_level = 3
SESSION = ort.InferenceSession(MODEL_PATH, _opts, providers=["CPUExecutionProvider"])
INPUT_NAMES = [i.name for i in SESSION.get_inputs()]
TOKENIZER = AutoTokenizer.from_pretrained(TOKENIZER_DIR)

with open(MODEL_PATH, "rb") as fh:
    MODEL_SHA = hashlib.sha256(fh.read()).hexdigest()


def count_tokens(strings):
    strings = list(strings)
    if not strings:
        return []
    return [len(ids) for ids in TOKENIZER(
        strings, add_special_tokens=False, truncation=False)["input_ids"]]


def score_batch(texts):
    """Calibrated AI probability for each text, one 512-token pass each."""
    if not texts:
        return []
    enc = TOKENIZER(list(texts), truncation=True, max_length=512,
                    padding="max_length", return_tensors="np")
    feed = {n: enc[n].astype(np.int64) for n in INPUT_NAMES if n in enc}
    logits = SESSION.run(None, feed)[0]
    margin = logits[:, 1] - logits[:, 0]
    return (1.0 / (1.0 + np.exp(-margin / TEMPERATURE))).tolist()


def score_document(text, batch=16):
    parts = segment_text(text, count_tokens)
    probs = []
    for i in range(0, len(parts), batch):
        probs.extend(score_batch([p.text for p in parts[i:i + batch]]))
    return {
        "segmentation_contract": SEGMENTATION_CONTRACT,
        "segments": [
            {"index": p.index, "words": p.words, "tokens": p.tokens,
             "probability_ai": round(pr, 4)}
            for p, pr in zip(parts, probs)],
        "probability_ai": round(max(probs), 6) if probs else 0.0,
        "flagged": bool(probs and max(probs) >= THRESHOLD),
    }
