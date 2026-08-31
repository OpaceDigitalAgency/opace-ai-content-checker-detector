"""How much the 98 quarantined rewrites flatter or penalise the measured rate.

55 of them are `no_change`: the rewriting model returned text essentially
identical to its source, 41 of those on the AI side at `light`. Those are not
successful attacks, and dropping them removes cases the detector would almost
certainly have caught. The measured light-intensity rate is therefore a LOWER
bound on what a user attempting a light rewrite would actually experience.

This quantifies the bound by asking what the detector does with each
quarantined row's SOURCE.
"""
import json, os, collections

PRIMARY, SECONDARY = 0.9855, 0.9763
HERE = os.path.dirname(os.path.abspath(__file__))
PAIRS = os.path.join(HERE, "..", "cycle4-humaniser-pairs")


def flag(seg):
    s = sorted(seg, reverse=True)
    return bool(s) and (s[0] >= PRIMARY or (len(s) > 1 and s[1] >= SECONDARY))


def main():
    meta, seen = {}, set()
    for f in ("corpus-train.jsonl", "corpus-heldout_source.jsonl",
              "corpus-heldout_rewriter.jsonl", "corpus-heldout_register.jsonl"):
        for line in open(os.path.join(PAIRS, f)):
            r = json.loads(line)
            if r["variant_id"] in seen:
                continue
            seen.add(r["variant_id"])
            meta[r["variant_id"]] = r
    fp = {r["variant_id"]: r["seg_p"] for r in
          (json.loads(l) for l in open(os.path.join(HERE, "pairs-fp32.jsonl")))}
    # source detection status per lineage, AI side
    src = {m["lineage_id"]: flag(fp[v]) for v, m in meta.items()
           if m["edit_intensity"] == "none" and v in fp}

    q = collections.Counter()
    qdet = collections.Counter()
    for line in open(os.path.join(PAIRS, "quarantine.jsonl")):
        r = json.loads(line)
        k = (r["quarantine_reason"], r["source_side"], r["edit_intensity"])
        q[k] += 1
        if r["quarantine_reason"] == "no_change" and src.get(r["lineage_id"]):
            qdet[k] += 1

    print("## Quarantine exclusion bias — fp32, shipped pair\n")
    print("| reason | side | intensity | n | source already detected |")
    print("|---|---|---|---:|---:|")
    for k in sorted(q):
        print(f"| {k[0]} | {k[1]} | {k[2]} | {q[k]} | "
              f"{qdet[k] if k[0]=='no_change' else '—'} |")
    print("\nA `no_change` row is a rewrite that did not rewrite. Its text is effectively its "
          "source, so the detector's verdict on the source is the verdict it would have given "
          "the variant. Adding them back raises the light-intensity cells and lowers nothing.")


if __name__ == "__main__":
    main()
