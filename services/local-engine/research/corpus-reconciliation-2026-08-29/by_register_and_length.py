"""Derive every long-form cell of Tables 1, 2 and 3 from the full-precision re-score.

Nothing here is transcribed from a document. The re-score is proved first against
883/922 and 45/4,636 at the shipped pair, and 877/922 and 56/4,636 at the prior
0.984 maximum-only rule, before a single cell is emitted.
"""
import json, math, statistics, sys, collections

SRC, OUT = sys.argv[1], sys.argv[2]
PRIMARY, SECONDARY = 0.9855, 0.9763
FLOOR = 30

REGISTER_LABEL = {
    "story": "stories / fiction",
    "academic-essay": "academic essays",
    "academic-discussion": "academic discussion",
    "academic-lit-review": "academic literature reviews",
    "academic-introduction": "academic introductions",
    "academic-conclusion": "academic conclusions",
    "student-essay": "student essays",
    "longform-journalism": "long-form journalism",
    "white-paper": "white papers",
    "company-update": "company updates",
    "research-summary": "research summaries",
}
BANDS = [(400, 599, "400–599"), (600, 849, "600–849"), (850, 1199, "850–1,199"),
         (1200, 1699, "1,200–1,699"), (1700, 2399, "1,700–2,399"),
         (2400, 3499, "2,400–3,499"), (3500, 4999, "3,500–4,999"),
         (5000, 10**9, "5,000 and above")]

rows = [json.loads(l) for l in open(SRC)]
for r in rows:
    s = sorted(r["seg_p"], reverse=True)
    r["p_max"] = s[0]
    r["flag"] = s[0] >= PRIMARY or (len(s) > 1 and s[1] >= SECONDARY)

ai = [r for r in rows if r["side"] == "ai"]
hu = [r for r in rows if r["side"] == "human"]

# --- harness proof, before anything is emitted ---------------------------
proof = {
    "ai_shipped": (sum(r["flag"] for r in ai), len(ai)),
    "hu_shipped": (sum(r["flag"] for r in hu), len(hu)),
    "ai_0984": (sum(1 for r in ai if r["p_max"] >= 0.984), len(ai)),
    "hu_0984": (sum(1 for r in hu if r["p_max"] >= 0.984), len(hu)),
}
print("HARNESS PROOF")
for k, v in proof.items():
    print(f"  {k:12} {v[0]}/{v[1]}")
expect = {"ai_shipped": (883, 922), "hu_shipped": (45, 4636),
          "ai_0984": (877, 922), "hu_0984": (56, 4636)}
bad = [k for k in expect if proof[k] != expect[k]]
if bad:
    sys.exit(f"HARNESS DID NOT REPRODUCE: {bad} — no figure from this run may be used.")
print("  all four reproduce exactly. Cells may be emitted.\n")

def wilson(k, n, z=1.96):
    p = k / n; d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (100 * (c - h), 100 * (c + h))

def comma(n): return f"{n:,}"

def side(rows_, kind):
    """One population's cell. Rate only above the 30-document floor."""
    n = len(rows_)
    if n == 0:
        return {"note": "no documents"}
    k = sum(r["flag"] for r in rows_)
    mean = f"{100 * statistics.mean(r['p_max'] for r in rows_):.1f}%"
    median = f"{100 * statistics.median(r['p_max'] for r in rows_):.1f}%"
    cell = {"mean": mean, "median": median, "count": f"{comma(k)}/{comma(n)}"}
    if n < FLOOR:
        cell["note"] = f"n below {FLOOR} — no rate quoted"
    else:
        lo, hi = wilson(k, n)
        cell["figure"] = f"{comma(k)}/{comma(n)} ({100 * k / n:.1f}%)"
        cell["interval"] = f"{lo:.1f} to {hi:.1f}%"
    return cell

def ai_only(rows_):
    n = len(rows_)
    if n == 0: return {"note": "no documents"}
    k = sum(r["flag"] for r in rows_)
    cell = {"mean": f"{100 * statistics.mean(r['p_max'] for r in rows_):.1f}%",
            "median": f"{100 * statistics.median(r['p_max'] for r in rows_):.1f}%",
            "count": f"{comma(k)}/{comma(n)}"}
    if n < FLOOR:
        cell["note"] = f"n below {FLOOR} — no rate quoted"
    else:
        lo, hi = wilson(k, n)
        cell["figure"] = f"{comma(k)}/{comma(n)} ({100 * k / n:.1f}%)"
        cell["interval"] = f"{lo:.1f} to {hi:.1f}%"
    return cell

# --- Table 3: by register -------------------------------------------------
regs = sorted({r["register"] for r in rows})
register_rows = []
for reg in regs:
    a = [r for r in ai if r["register"] == reg]
    h = [r for r in hu if r["register"] == reg]
    register_rows.append({"register": REGISTER_LABEL.get(reg, reg),
                          "ai": side(a, "ai"), "human": side(h, "human"),
                          "_hu_rate": (sum(r["flag"] for r in h) / len(h)) if h else -1})
register_rows.sort(key=lambda r: -r["_hu_rate"])
for r in register_rows: r.pop("_hu_rate")
register_rows.append({"register": "all registers", "ai": side(ai, "ai"), "human": side(hu, "human"), "total": True})

# --- Table 1 long-form rows ----------------------------------------------
length_rows = []
for lo, hi, label in BANDS:
    a = [r for r in ai if lo <= r["word_count"] <= hi]
    h = [r for r in hu if lo <= r["word_count"] <= hi]
    if not a and not h: continue
    length_rows.append({"words": label, "ai": side(a, "ai"), "human": side(h, "human")})
length_rows.append({"words": "all lengths", "ai": side(ai, "ai"), "human": side(hu, "human"), "total": True})

# --- Table 2: model and provider -----------------------------------------
def group(rows_, key):
    out = []
    for name, _ in collections.Counter(r[key] for r in rows_).most_common():
        sel = [r for r in rows_ if r[key] == name]
        out.append({key: name, "ai": ai_only(sel),
                    "_rate": sum(r["flag"] for r in sel) / len(sel)})
    out.sort(key=lambda r: -r["_rate"])
    for r in out: r.pop("_rate")
    return out

model_rows = group(ai, "model")
model_rows.append({"model": "all models", "ai": ai_only(ai), "total": True})
provider_rows = group(ai, "provider")
provider_rows.append({"provider": "all providers", "ai": ai_only(ai), "total": True})

data = {"register": register_rows, "length_longform": length_rows,
        "model": model_rows, "provider": provider_rows,
        "word_count_max_ai": max(r["word_count"] for r in ai)}
json.dump(data, open(OUT, "w"), indent=1)

# --- readable dump --------------------------------------------------------
def show(title, rows_, cols):
    print("##", title)
    for r in rows_:
        parts = []
        for c in cols:
            cell = r.get(c[0])
            if isinstance(cell, dict):
                parts.append(f"{cell.get('figure') or cell.get('count','')+' '+cell.get('note','')} mean {cell.get('mean','—')} med {cell.get('median','—')}")
            else:
                parts.append(str(cell))
        print("  " + " | ".join(parts))
    print()

show("Table 3 — by register (ordered by human false-positive rate, worst first)",
     register_rows, [("register",), ("ai",), ("human",)])
show("Table 1 — long-form rows by length", length_rows, [("words",), ("ai",), ("human",)])
show("Table 2 — by model", model_rows, [("model",), ("ai",)])
show("Table 2 — by provider", provider_rows, [("provider",), ("ai",)])
print("longest AI document:", data["word_count_max_ai"], "words")
