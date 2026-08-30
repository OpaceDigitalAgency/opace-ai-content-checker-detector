"""Blind rephrase of each watermarked fixture with a local instruct model.

Model, revision and decoding settings are recorded in the output manifest so the
run can be named exactly. No network at generation time; weights come from the
local Hugging Face cache.
"""
import json, os, time, sys, torch
from transformers import AutoModelForCausalLM, AutoTokenizer

REPO = "Qwen/Qwen3-4B-Instruct-2507"
N_VARIANTS = 3
GEN = dict(do_sample=True, temperature=0.7, top_p=0.8, top_k=20,
           repetition_penalty=1.05)

SYSTEM = "You rewrite text. You output only the rewritten text and nothing else."
USER = ("Rewrite the passage below in different words. Keep the meaning and the "
        "level of detail the same, and keep the length within about ten per cent "
        "of the original. Do not add commentary, headings or quotation marks.\n\n"
        "Passage:\n{passage}")

def main():
    corpus = json.load(open("corpus.json"))
    tok = AutoTokenizer.from_pretrained(REPO)
    t0 = time.time()
    model = AutoModelForCausalLM.from_pretrained(REPO, dtype=torch.bfloat16).to("mps")
    model.eval()
    load_s = time.time() - t0
    print(f"loaded in {load_s:.1f}s", flush=True)

    rows = json.load(open("variants-qwen.json")) if os.path.exists("variants-qwen.json") else []
    done = {(r["id"], r["variant"]) for r in rows}
    timings = [r["seconds"] for r in rows if "seconds" in r]
    for k in range(N_VARIANTS):
        for c in corpus:
            if (c["id"], f"qwen3-4b-p{k+1}") in done:
                continue
            seed = 20260829 + k
            torch.manual_seed(seed)
            msgs = [{"role": "system", "content": SYSTEM},
                    {"role": "user", "content": USER.format(passage=c["text"].strip())}]
            prompt = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
            ids = tok([prompt], return_tensors="pt").to(model.device)
            budget = max(160, int(len(c["text"].split()) * 3.0) + 96)
            t = time.time()
            with torch.no_grad():
                out = model.generate(**ids, max_new_tokens=budget, **GEN)
            dt = time.time() - t
            gen = out[0][ids["input_ids"].shape[1]:]
            text = tok.decode(gen, skip_special_tokens=True).strip()
            rows.append({"id": c["id"], "variant": f"qwen3-4b-p{k+1}", "seed": seed,
                         "seconds": round(dt, 1), "text": text})
            timings.append(dt)
            print(f"{c['id']} p{k+1} {dt:.1f}s  {len(text)}ch", flush=True)
            json.dump(rows, open("variants-qwen.json", "w"), indent=1)

    json.dump({
        "paraphraser": REPO,
        "revision": "cdbee75f17c01a7cc42f958dc650907174af0554",
        "dtype": "bfloat16", "device": "mps",
        "transformers": __import__("transformers").__version__,
        "torch": torch.__version__,
        "decoding": GEN,
        "n_variants_per_passage": N_VARIANTS,
        "seeds": [20260829 + k for k in range(N_VARIANTS)],
        "system_prompt": SYSTEM, "user_prompt_template": USER,
        "load_seconds": round(load_s, 1),
        "generation_seconds_total": round(sum(timings), 1),
        "generation_seconds_mean": round(sum(timings) / len(timings), 1),
    }, open("manifest-qwen.json", "w"), indent=1)
    print("DONE", round(sum(timings), 1), "s generation")

main()
