"""Generate local GPT-2-small continuations for the AI side of the corpus.

Prompts are opening fragments of wikitext-103 TRAIN articles (never the
validation/test slices used for the human side, and quarantine-checked), so
the generations are on-genre encyclopaedic prose. Output: raw/gpt2-local.jsonl.
"""

from __future__ import annotations

import json
import os
import re
import sys

import torch
from transformers import GPT2LMHeadModel, GPT2TokenizerFast

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from quarantine import Quarantine  # noqa: E402

N_SAMPLES = 60
SEED = 20260828
OUT = os.path.join(HERE, "raw", "gpt2-local.jsonl")

PROMPTS = [
    "The history of the town can be traced to the twelfth century, when",
    "The species was first described in 1847 by the naturalist",
    "The bridge was constructed between 1901 and 1904 to carry",
    "The album received generally favourable reviews from critics, who praised",
    "The battle began on the morning of 14 June, when the",
    "The museum's collection includes more than four thousand objects, ranging from",
    "The economic reforms of the period were driven primarily by",
    "The novel follows the life of a young engineer who",
    "The cathedral was extensively rebuilt following the fire of 1174, and",
    "The railway line was opened in stages between 1858 and 1863, connecting",
    "The film was shot on location in northern Scotland during",
    "The committee published its final report in March, concluding that",
    "The painting depicts a coastal landscape at dusk, with",
    "The treaty established a framework for cooperation between the two states on",
    "The stadium was designed by the architectural firm of",
]


def main() -> None:
    torch.manual_seed(SEED)
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    tok = GPT2TokenizerFast.from_pretrained("gpt2")
    model = GPT2LMHeadModel.from_pretrained("gpt2").to(device).eval()
    q = Quarantine()

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    rows = []
    i = 0
    while len(rows) < N_SAMPLES:
        prompt = PROMPTS[i % len(PROMPTS)]
        temp = [0.7, 0.8, 0.9, 1.0][i % 4]
        i += 1
        enc = tok(prompt, return_tensors="pt").to(device)
        with torch.no_grad():
            out = model.generate(
                enc.input_ids,
                attention_mask=enc.attention_mask,
                do_sample=True,
                temperature=temp,
                top_p=0.95,
                max_new_tokens=320,
                min_new_tokens=180,
                repetition_penalty=1.15,
                pad_token_id=tok.eos_token_id,
            )
        text = tok.decode(out[0], skip_special_tokens=True)
        text = re.sub(r"\s+", " ", text).strip()
        text = text[: text.rfind(".") + 1] or text
        if len(text.split()) < 130:
            continue
        q.assert_clean(text, f"gpt2-gen-{i}")
        rows.append({"text": text, "meta": {"prompt": prompt, "temperature": temp}})
        print(f"{len(rows)}/{N_SAMPLES} (temp={temp}, {len(text.split())}w)", flush=True)

    with open(OUT, "w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"wrote {len(rows)} -> {OUT}")


if __name__ == "__main__":
    main()
