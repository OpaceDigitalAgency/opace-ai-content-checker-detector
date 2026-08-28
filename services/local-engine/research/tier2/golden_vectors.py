"""Produce golden test vectors for the TypeScript reimplementation.

Five fixed texts -> full 22-dim feature vector + head probability, written to
models/golden-vectors.json. A TS port matching these (surprisal from the same
quantised gpt2 via transformers.js, features to ~1e-4, probability to ~1e-3)
is considered spec-compliant. Note: transformers.js int8 gpt2 will shift
surprisal slightly; the spec allows a documented tolerance re-check against
the fp32 vectors here.
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from surprisal_features import FEATURE_NAMES, SurprisalScorer, extract  # noqa: E402

TEXTS = {
    "golden-1-formal-report": (
        "The committee reviewed the quarterly figures in detail before reaching a decision. "
        "Revenue rose by four per cent, driven largely by the northern region, while costs "
        "remained flat. Two members dissented from the final recommendation, arguing that the "
        "underlying data was incomplete. The chair asked for a revised analysis to be "
        "circulated before the next meeting, together with a note on methodology. No further "
        "commitments were made at this stage, although the finance team agreed to publish its "
        "assumptions. The minutes record that the vote was carried by six votes to two, with "
        "one abstention, and that the decision will be reviewed again in March."
    ),
    "golden-2-ai-register": (
        "Artificial intelligence is transforming the way businesses operate across every "
        "industry. By leveraging advanced algorithms and machine learning techniques, "
        "organisations can unlock valuable insights from their data. Moreover, these "
        "technologies enable companies to streamline their operations, enhance customer "
        "experiences, and drive innovation at an unprecedented pace. However, it is important "
        "to note that successful implementation requires careful planning and a clear "
        "strategy. In conclusion, embracing artificial intelligence is no longer optional for "
        "businesses that wish to remain competitive in today's rapidly evolving digital "
        "landscape. The future belongs to organisations that can adapt quickly and "
        "effectively to these transformative changes."
    ),
    "golden-3-casual-human": (
        "Honestly I didn't expect the trip to go the way it did. We missed the first train, "
        "then the replacement bus dropped us miles from the hotel, and by the time we walked "
        "in the rain had properly set in. But the odd thing is those are the bits I remember "
        "fondly now. The receptionist lent us towels. Some bloke in the bar drew us a map of "
        "shortcuts his dad used when he worked the docks. You can't plan for that stuff. The "
        "castle itself was fine, I suppose, worth an hour, but ask me about that week and "
        "I'll tell you about the bus and the map and the towels before anything else."
    ),
    "golden-4-wiki-lead": (
        "The parish church of St Aldhelm stands on a low rise at the western edge of the "
        "village, overlooking the water meadows of the River Stour. The present building "
        "dates largely from the fourteenth century, although fragments of Norman masonry "
        "survive in the north wall of the nave. The tower, completed around 1420, holds a "
        "ring of six bells, the oldest cast in 1598 by a Salisbury founder. Restoration work "
        "in 1868 under the direction of a local architect removed the box pews and replaced "
        "the chancel roof. The church was designated a Grade I listed building in 1961 and "
        "remains in regular use for worship."
    ),
    "golden-5-tech-answer": (
        "The short answer is that your loop allocates a new list on every iteration, which "
        "forces the garbage collector to run far more often than it should. Move the "
        "allocation outside the loop and reuse the buffer. In my tests that single change "
        "cut the run time from ninety seconds to eleven. If you need the intermediate "
        "results, preallocate the outer list with a known capacity instead of appending "
        "blindly. And measure before you optimise anything else: the profiler output you "
        "posted shows almost all the remaining time is spent in string formatting, not in "
        "the numeric code you were worried about."
    ),
}


def main() -> None:
    head = json.load(open(os.path.join(HERE, "..", "models", "tier2-head.json")))
    mu = np.array(head["standardise"]["mean"])
    sd = np.array(head["standardise"]["std"])
    w = np.array(head["logistic"]["coef"])
    b = head["logistic"]["intercept"]
    sc = SurprisalScorer()

    out = {"feature_names": FEATURE_NAMES, "surprisal_base": "log2", "vectors": {}}
    for name, text in TEXTS.items():
        s, r = sc.score(text)
        feats = extract(s, r)
        z = (np.array(feats) - mu) / sd
        p = float(1.0 / (1.0 + np.exp(-(z @ w + b))))
        out["vectors"][name] = {
            "text": text,
            "n_scored_tokens": int(s.size),
            "surprisal_first10_bits": [round(float(x), 6) for x in s[:10]],
            "features": {k: round(float(v), 6) for k, v in zip(FEATURE_NAMES, feats)},
            "head_probability": round(p, 6),
            "flagged_at_threshold": bool(p >= head["threshold"]),
        }
        print(f"{name}: p={p:.4f}")
    path = os.path.join(HERE, "..", "models", "golden-vectors.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"golden vectors -> {path}")


if __name__ == "__main__":
    main()
