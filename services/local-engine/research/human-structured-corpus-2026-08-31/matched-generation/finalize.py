"""Post-bulk finalisation: adherence stats, manifest with SHA-256, README.

Usage: python3 finalize.py
"""
import hashlib
import json
import os
import time
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    rows = [json.loads(l) for l in open(os.path.join(HERE, "matched.jsonl"))]
    ledger = [json.loads(l) for l in open(os.path.join(HERE, "cost-ledger.jsonl"))]
    spend = round(sum(r.get("cost_usd", 0) for r in ledger), 4)
    n = len(rows)
    len_ok = sum(1 for r in rows if r["length_ok_pm20"])
    sec_ok = sum(1 for r in rows if r["structure_adherence"]["sections_ok"])
    bul_ok = sum(1 for r in rows if r["structure_adherence"]["bullets_ok"])
    eval_only = [r for r in rows if r["eval_only"]]
    by_model = Counter(r["model_requested"] for r in rows)
    by_reason = Counter(r.get("heldout_reason") for r in eval_only)
    by_reg = Counter(r["register"] for r in rows)
    dup_partners = n - len({r["human_partner_id"] for r in rows})

    stats = {
        "pairs_total": n,
        "training_eligible": n - len(eval_only),
        "eval_only": len(eval_only),
        "eval_only_by_reason": dict(by_reason),
        "length_within_pm20pct": f"{len_ok}/{n} = {len_ok/n:.1%}",
        "sections_adherent": f"{sec_ok}/{n} = {sec_ok/n:.1%}",
        "bullets_adherent": f"{bul_ok}/{n} = {bul_ok/n:.1%}",
        "attempts_mean": round(sum(r.get("attempts") or 1 for r in rows) / n, 2),
        "by_model": dict(by_model),
        "by_register": dict(by_reg),
        "duplicate_partner_rows": dup_partners,
        "total_spend_usd": spend,
        "cost_per_pair_usd": round(spend / n, 4),
    }
    files = sorted(f for f in os.listdir(HERE)
                   if f.endswith((".jsonl", ".py")))
    manifest = {
        "built_at": time.strftime("%Y-%m-%d %H:%M"),
        "design": "matched human-AI pairs: model receives ONLY the extracted "
                  "brief (topic, type, length, structure outline, tone, "
                  "audience), never the human text; keep-best of up to 3 "
                  "attempts (temp 0.9/0.6/0.4), corrective retry on length "
                  "miss; degenerate outputs (<50% of target) discarded; "
                  "dedupe on content sha256",
        "status": "BULK COMPLETE",
        "hard_cap_usd": 20.0,
        "spend_usd": spend,
        "quality_gate_history": {
            "pilot_20": "10/20 length, 17/20 sections (weak prompt)",
            "repilot_rounds": "3/10, 5/10, 3/12, 7/12 during prompt/routing "
                              "iteration; final gate 10/12 (83%) with "
                              "retry+google token-headroom fix",
            "exclusions": "google/gemini-3.1-pro-preview dropped (degenerate "
                          "<100-word outputs on the OpenRouter endpoint even "
                          "at reasoning effort low); replaced by "
                          "google/gemini-3.5-flash to preserve the held-out "
                          "google family",
        },
        "length_bands": {
            "openai/gpt-5.6-terra": "600+ words (overshoots short briefs)",
            "meta-llama/llama-4-maverick": "<=1200 (fails very long)",
            "anthropic/claude-opus-5": "<=600",
            "google/gemini-3.5-flash": "<=2000",
            "x-ai/grok-4.6": "any",
        },
        "eval_only_boundary": "entire google model family + topics with "
                              "slug-sha256 mod 100 < 15; fixed before "
                              "generation; NEVER train on eval_only rows",
        "stats": stats,
        "sha256": {f: hashlib.sha256(
            open(os.path.join(HERE, f), "rb").read()).hexdigest()
            for f in files},
    }
    with open(os.path.join(HERE, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(json.dumps(stats, indent=1))


if __name__ == "__main__":
    main()
