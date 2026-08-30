#!/usr/bin/env python3
"""Generate the paired transformations through OpenRouter.

Three controlled intensities per source, one rewriting-model family per source
so lineage and the family holdout stay clean:

  light   copy-edit: grammar, punctuation, word choice, light tightening
  medium  structural paraphrase: sentences and order change, argument intact
  heavy   full rewrite preserving the underlying facts

Class labels follow the Phase 2 brief section 11 exactly:

  ai source, rewritten     -> ai_original_neural_rewrite
  human source, rewritten  -> human_original_ai_edited
  untouched source rows    -> ai_original / human_original

Edit intensity is a SEPARATE field and is never folded into the class label.

Nothing here is a commercial humaniser. No output may be labelled JustDone,
QuillBot, Undetectable.ai or any other product, and no output may be labelled
ai_original_human_edited: an LLM rewriting prose is not a professional human
edit. Existing corpus rows carrying style=humanise are AI ORIGINALS written
under an anti-AI style instruction, not paired humaniser outputs, and are not
used as sources here.

Failed, truncated and meaning-damaged outputs are written to quarantine.jsonl
rather than deleted. A rewrite that destroyed the meaning is a finding about
the rewriting model; dropping it silently biases the corpus towards success.

Usage:
  python3 rewrite.py --pilot 20        # verification run
  python3 rewrite.py --all             # full run
"""
import argparse
import json
import os
import queue
import re
import sys
import threading
import time
import urllib.request
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCES = os.path.join(HERE, "sources.jsonl")
PAIRS = os.path.join(HERE, "pairs.jsonl")
QUARANTINE = os.path.join(HERE, "quarantine.jsonl")
SPEND = os.path.join(HERE, "spend-log.jsonl")

API = "https://openrouter.ai/api/v1/chat/completions"

# Hard ceiling for this task, in US dollars. The credit pool is shared with a
# concurrent generation run, so this is deliberately well under the authorised
# figure. Checked before every request; the run stops rather than overshoots.
HARD_BUDGET_USD = 7.00

INTENSITIES = ("light", "medium", "heavy")

SYSTEM = (
    "You are a professional editor. You return only the edited text. "
    "No preamble, no commentary, no headings you were not given, no markdown "
    "fences, no notes about what you changed."
)

# The protected-span instruction is identical at all three intensities. The
# project treats names, numbers, quotations, URLs and citations as protected
# spans, so compliance is measured rather than assumed.
PROTECT = (
    "Keep every personal name, organisation name, place name, number, date, "
    "statistic, direct quotation, URL and citation exactly as it appears. Do "
    "not add facts that are not in the original."
)

PROMPTS = {
    "light": (
        "Copy-edit the text below. Correct grammar, punctuation, spelling and "
        "awkward word choice, and tighten obvious wordiness. Keep every "
        "sentence where it is and keep the sentence order unchanged. Change "
        "roughly one word in ten and no more. The result must read as the "
        "same text, corrected.\n" + PROTECT
    ),
    "medium": (
        "Paraphrase the text below. Reword each sentence, and merge, split or "
        "reorder sentences within a paragraph where it reads better. Keep the "
        "paragraph plan, the order of the argument, the claims and the "
        "conclusions as they are, and keep roughly the same length. The "
        "reader should recognise the same piece, rewritten.\n" + PROTECT
    ),
    "heavy": (
        "Rewrite the text below from scratch. Do not reuse the original's "
        "phrasing, its sentence structure, its paragraph plan or the order in "
        "which it makes its points. Choose a different voice and a different "
        "way in, reorganise the argument however serves it best, and drop the "
        "original's framing entirely. Preserve only the underlying facts, "
        "claims and conclusions: express all of them and express nothing "
        "else. Keep roughly the same length.\n" + PROTECT
    ),
}

_FENCE = re.compile(r"^```[a-zA-Z]*\s*|\s*```$")
_PREAMBLE = re.compile(
    r"^\s*(here (?:is|'s)[^\n:]{0,80}:|sure[,!][^\n]{0,80}\n|"
    r"(?:edited|revised|rewritten|paraphrased)\s+(?:text|version)\s*:?)\s*",
    re.I)


def _norm(t):
    return re.sub(r"\s+", " ", (t or "")).strip().lower()


def clean(t):
    t = (t or "").strip()
    t = _FENCE.sub("", t).strip()
    prev = None
    while prev != t:
        prev = t
        t = _PREAMBLE.sub("", t).strip()
    return t


class Budget:
    def __init__(self, cap):
        self.cap = cap
        self.spent = 0.0
        self.lock = threading.Lock()

    def may_spend(self, estimate):
        with self.lock:
            return self.spent + estimate <= self.cap

    def record(self, usd):
        with self.lock:
            self.spent += usd
            return self.spent


def REASONING(model):
    """Gemini refuses reasoning.enabled=false outright ("Reasoning is mandatory
    for this model"), so it gets the lowest effort the API will accept and the
    trace excluded. Everything else has reasoning off: this is copy-editing."""
    if model.startswith("google/"):
        return {"effort": "low", "exclude": True}
    return {"enabled": False}


def call(model, prompt, text, key, timeout=240, max_tokens=8000):
    body = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt + "\n\n---\n\n" + text},
        ],
        "temperature": 0.7,
        "max_tokens": max_tokens,
        # This is a copy-editing task, not a reasoning one. Left on,
        # deepseek-v4-pro and gemini-flash spend the entire completion
        # budget thinking and return an empty message: 53 rows lost to
        # the harness rather than to the model.
        "reasoning": REASONING(model),
        "usage": {"include": True},
    }).encode()
    req = urllib.request.Request(API, data=body, headers={
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://opace.agency/",
        "X-Title": "opace-cycle4-humaniser-pairs",
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pilot", type=int, default=0,
                    help="run only the first N sources (verification)")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--out", default=None)
    ap.add_argument("--budget", type=float, default=HARD_BUDGET_USD)
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()

    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        sys.exit("OPENROUTER_API_KEY not in environment")

    out_pairs = args.out or PAIRS
    out_quar = (args.out.replace(".jsonl", "-quarantine.jsonl")
                if args.out else QUARANTINE)

    sources = [json.loads(l) for l in open(SOURCES, encoding="utf-8") if l.strip()]
    if args.pilot:
        # spread the pilot across sides, registers, bands and rewriter families
        seen, pick = set(), []
        for s in sources:
            k = (s["side"], s["register"], s["rewriter_family"])
            if k in seen:
                continue
            seen.add(k)
            pick.append(s)
            if len(pick) >= args.pilot:
                break
        sources = pick
    elif not args.all:
        sys.exit("pass --pilot N or --all")

    # resume: skip work already recorded
    done = set()
    for path in (out_pairs, out_quar):
        if os.path.exists(path):
            for line in open(path, encoding="utf-8"):
                try:
                    r = json.loads(line)
                    done.add((r["source_id"], r["edit_intensity"]))
                except Exception:
                    pass
    if done:
        print(f"resuming: {len(done)} variants already recorded")

    jobs = queue.Queue()
    n_jobs = 0
    for s in sources:
        for it in INTENSITIES:
            if (s["source_id"], it) in done:
                continue
            jobs.put((s, it))
            n_jobs += 1
    print(f"{len(sources)} sources, {n_jobs} rewrites queued, "
          f"budget ${args.budget:.2f}")

    budget = Budget(args.budget)
    wlock = threading.Lock()
    fp = open(out_pairs, "a", encoding="utf-8")
    fq = open(out_quar, "a", encoding="utf-8")
    fs = open(SPEND, "a", encoding="utf-8")
    counters = {"ok": 0, "quarantined": 0, "budget_stop": 0}

    def emit(fh, row):
        with wlock:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
            fh.flush()

    def worker():
        while True:
            try:
                s, it = jobs.get_nowait()
            except queue.Empty:
                return
            try:
                run_one(s, it)
            except Exception as e:                       # noqa: BLE001
                emit(fq, quarantine_row(s, it, "exception",
                                        f"{type(e).__name__}: {e}", ""))
                with wlock:
                    counters["quarantined"] += 1
            finally:
                jobs.task_done()

    def quarantine_row(s, it, reason, detail, text):
        return {
            "source_id": s["source_id"], "lineage_id": s["lineage_id"],
            "edit_intensity": it, "rewriting_model": s["rewriter_model"],
            "rewriting_model_family": s["rewriter_family"],
            "quarantine_reason": reason, "quarantine_detail": detail,
            "source_side": s["side"], "register": s["register"],
            "band": s["band"], "split": s["split"],
            "output_text": text, "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ",
                                                              time.gmtime()),
        }

    def run_one(s, it):
        model = s["rewriter_model"]
        src_words = s["word_count"]
        # crude pre-flight estimate so the cap is never overshot by a whole batch
        est = (src_words * 1.4 * 2) / 1e6 * 12.0
        if not budget.may_spend(est):
            with wlock:
                counters["budget_stop"] += 1
            return

        # Bound the completion budget to the work in hand. Reasoning
        # models otherwise spend the whole 8,000 tokens thinking about a
        # 150-word paragraph and return nothing, which is both a wasted
        # quarantine row and the single most expensive call in the run.
        mt = min(8000, max(2500, int(src_words * 8)))
        started = time.time()
        last = None
        for attempt in range(3):
            try:
                resp = call(model, PROMPTS[it], s["text"], key,
                            max_tokens=mt)
                last = None
                break
            except urllib.error.HTTPError as e:          # noqa: PERF203
                last = f"HTTP {e.code}: {e.read()[:300].decode('utf-8', 'replace')}"
                if e.code in (429, 500, 502, 503, 520, 524):
                    time.sleep(3 * (attempt + 1))
                    continue
                break
            except Exception as e:                       # noqa: BLE001
                last = f"{type(e).__name__}: {e}"
                time.sleep(3 * (attempt + 1))
        if last is not None:
            emit(fq, quarantine_row(s, it, "api_error", last, ""))
            with wlock:
                counters["quarantined"] += 1
            return

        choice = (resp.get("choices") or [{}])[0]
        text = clean((choice.get("message") or {}).get("content") or "")
        finish = choice.get("finish_reason")
        usage = resp.get("usage") or {}
        cost = float(usage.get("cost") or 0.0)
        total = budget.record(cost)
        emit(fs, {"source_id": s["source_id"], "edit_intensity": it,
                  "model": model, "cost_usd": cost,
                  "prompt_tokens": usage.get("prompt_tokens"),
                  "completion_tokens": usage.get("completion_tokens"),
                  "running_total_usd": round(total, 6),
                  "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})

        out_words = len(text.split())
        row = {
            # ---- lineage
            "variant_id": f"{s['source_id']}::{it}",
            "source_id": s["source_id"],
            "lineage_id": s["lineage_id"],
            "split": s["split"],
            # ---- class label and the SEPARATE intensity field
            "class_label": ("ai_original_neural_rewrite" if s["side"] == "ai"
                            else "human_original_ai_edited"),
            "edit_intensity": it,
            "transformation_family": "generic_llm_rewrite",
            "transformation_tool": None,
            "commercial_humaniser": False,
            # ---- the two texts
            "source_text": s["text"],
            "output_text": text,
            # ---- generating side
            "source_side": s["side"],
            "generating_model": s["origin_model"],
            "generating_provider": s["origin_provider"],
            "generating_prompt_style": s["origin_prompt_style"],
            "source_corpus": s["origin_corpus"],
            "source_row_id": s["origin_row_id"],
            "source_date": s["origin_date"],
            "source_licence": s["origin_licence"],
            "measurement_overlap": s["measurement_overlap"],
            "measurement_overlap_note": s["measurement_overlap_note"],
            # ---- rewriting side
            "rewriting_model": model,
            "rewriting_model_family": s["rewriter_family"],
            "rewriting_prompt": PROMPTS[it],
            "rewriting_system_prompt": SYSTEM,
            "rewriting_settings": {"temperature": 0.7, "max_tokens": mt},
            "rewritten_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "finish_reason": finish,
            # ---- shape
            "register": s["register"],
            "length_band": s["band"],
            "source_word_count": src_words,
            "output_word_count": out_words,
            "cut_on": s.get("cut_on"),
            # ---- spend
            "cost_usd": cost,
            "prompt_tokens": usage.get("prompt_tokens"),
            "completion_tokens": usage.get("completion_tokens"),
            "latency_s": round(time.time() - started, 2),
            "corpus_seed": s["corpus_seed"],
        }

        # ---- quarantine gates. Nothing is deleted.
        if not text:
            emit(fq, quarantine_row(s, it, "empty_output", str(finish), text))
            with wlock:
                counters["quarantined"] += 1
            return
        if finish == "length":
            row["quarantine_reason"] = "truncated"
            emit(fq, {**row, "quarantine_reason": "truncated",
                      "quarantine_detail": "finish_reason=length"})
            with wlock:
                counters["quarantined"] += 1
            return
        ratio = out_words / max(1, src_words)
        if ratio < 0.45 or ratio > 2.2:
            emit(fq, {**row, "quarantine_reason": "length_collapse",
                      "quarantine_detail": f"output/source words = {ratio:.2f}"})
            with wlock:
                counters["quarantined"] += 1
            return
        if re.search(r"\b(i (?:cannot|can't|won't)|as an ai|i'm sorry, but)\b",
                     text[:400], re.I):
            emit(fq, {**row, "quarantine_reason": "refusal",
                      "quarantine_detail": text[:200]})
            with wlock:
                counters["quarantined"] += 1
            return
        if _norm(text) == _norm(s["text"]):
            emit(fq, {**row, "quarantine_reason": "no_change",
                      "quarantine_detail": "output is byte-identical to the "
                                           "source after whitespace normalisation"})
            with wlock:
                counters["quarantined"] += 1
            return

        emit(fp, row)
        with wlock:
            counters["ok"] += 1
            n = counters["ok"] + counters["quarantined"]
            if n % 25 == 0:
                print(f"  {n}/{n_jobs}  ok={counters['ok']} "
                      f"quar={counters['quarantined']} "
                      f"spent=${budget.spent:.4f}", flush=True)

    threads = [threading.Thread(target=worker, daemon=True)
               for _ in range(args.workers)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    fp.close()
    fq.close()
    fs.close()
    print(f"\ndone. ok={counters['ok']} quarantined={counters['quarantined']} "
          f"budget_stopped={counters['budget_stop']} "
          f"spent=${budget.spent:.4f} of ${args.budget:.2f}")


if __name__ == "__main__":
    main()
