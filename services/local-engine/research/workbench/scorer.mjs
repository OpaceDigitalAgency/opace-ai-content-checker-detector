// Pure-arithmetic port of the shipped scoring pipeline.
//
// Mirrors packages/core/dist/patterns/en-signals-v2.js:
//   computeEditorialSignals -> classify -> applyEscalationPolicy
//
// This exact source is imported by precompute.mjs (where it is asserted to
// reproduce the engine on all 3,792 sample-views) AND inlined verbatim into
// workbench.html by build.mjs. There is one implementation, not two.
//
// It takes per-sample TRIGGER HITS rather than text. Each hit is a
// [categoryIndex, keyIndex] pair and counts as exactly one issue, which is what
// the engine does after its category:key deduplication. Re-scoring the corpus
// after any change is therefore arithmetic over ~4,000 small arrays.
//
// `keyOff` disables individual triggers (a single word or phrase inside a
// category). `rules` switches the combination and escalation gates that can
// override the weighted score; with every switch on, the output matches the
// shipped engine exactly.

export const RULE_SWITCHES = [
  ["cap", "Stylometric cap", "Caps the combined contribution of rhythm and measured-stylometric categories at the larger of the non-stylometric evidence and 12 raw points, so a document can never reach an AI band on rhythm alone. Added after the Stanford TOEFL finding that stylometric detectors falsely flagged over half of genuine non-native essays."],
  ["corrob", "Strong corroborator band override", "Lets a single strong corroborator (knowledge-cutoff phrase, invisible-character flag, reasoning artefact plus chatbot voice, or dense AI vocabulary) push the probability band to ai_like regardless of score."],
  ["esc_citation", "Citation co-occurrence", "Escalates to ai_like when leaked citation markup and a leaked citation token both appear."],
  ["esc_breadth", "Finding breadth", "Raises the classification one band when there are at least 6 findings across at least 4 categories. Rhythm categories collapse to one contribution, and so do the markdown-furniture categories."],
  ["esc_artefactScore", "Artefact plus score", "Floors at mixed_signals when artefact evidence appears and the score is at least 10."],
  ["esc_artefactFloor", "Artefact floor", "Floors at mixed_signals whenever any core artefact category fires, at any score."],
  ["esc_furniture", "Furniture gate", "Intended to floor at mixed_signals on chat-export markdown furniture. UNREACHABLE in the shipped engine: the gate reads the collapsed breadth set, which excludes the furniture categories, so it never fires. Reproduced as shipped."],
  ["esc_formattingFloor", "Formatting floor", "Floors at mixed_signals when the heavy-bold formatting rule fires."],
  ["esc_formattingCluster", "Formatting cluster", "Floors at mixed_signals when at least 3 formatting-furniture categories fire together."],
];

export const ALL_RULES_ON = Object.fromEntries(RULE_SWITCHES.map(([k]) => [k, true]));

export function createScorer(sets) {
  const { stylo, artCore, artSup, fmtCluster, furniture, v4, index } = sets;
  const MAX_SCORED_WORDS = 10000;
  const RANK = { human_like: 0, mixed_signals: 1, ai_like: 2 };
  const IX = (name) => (index.has(name) ? index.get(name) : -1);
  const I_TIER1 = IX("tier1"), I_TIER2 = IX("tier2"), I_TRANSITION = IX("transition");
  const I_CUTOFF = IX("cutoff-disclaimer"), I_NORM = IX("normalization-flag");
  const I_REASONING = IX("reasoning-artifact"), I_CHATBOT = IX("chatbot");
  const I_PUNCTDIST = IX("punct-distribution"), I_BURST = IX("cross-para-burstiness");
  const I_FNWORD = IX("fnword-trigram-entropy"), I_SMARTPUNCT = IX("smart-punct-signature");
  const I_CITEMARKUP = IX("ai-citation-markup"), I_CITETOKEN = IX("ai-citation-token");
  const I_FURNITURE = IX("markdown-furniture"), I_FORMATTING = IX("formatting");

  return function score(sample, weights, enabled, keyOff, rules) {
    const R = rules || ALL_RULES_ON;
    const words = sample.w;
    if (words < 10 || words > MAX_SCORED_WORDS) {
      return { score: 0, classification: "human_like", confidence: "low", escalation: null,
               status: words < 10 ? "too_short" : "too_long" };
    }

    let styloRaw = 0, otherRaw = 0, issueCount = 0;
    const countMap = Object.create(null);
    for (let k = 0; k < sample.h.length; k++) {
      const cat = sample.h[k][0];
      if (enabled && enabled[cat] === false) continue;
      if (keyOff && keyOff.has(cat * 65536 + sample.h[k][1])) continue;
      const w = weights[cat];
      if (stylo.has(cat)) styloRaw += w; else otherRaw += w;
      issueCount++;
      countMap[cat] = (countMap[cat] || 0) + 1;
    }
    const rawScore = R.cap ? otherRaw + Math.min(styloRaw, Math.max(otherRaw, 12)) : otherRaw + styloRaw;
    const lengthFactor = Math.max(1, Math.log2(words / 50));
    const scoreValue = Math.min(100, Math.round(rawScore / lengthFactor));

    const has = (c) => countMap[c] !== undefined;
    const cnt = (c) => countMap[c] || 0;

    const denseAIVocab = words >= 150 && cnt(I_TIER1) >= 5 && sample.t2 === 1 && has(I_TIER2) && has(I_TRANSITION);

    // ── classify() ──
    const hasCutoff = has(I_CUTOFF);
    const hasNormFlag = has(I_NORM) && (sample.zw >= 2 || sample.hg >= 2);
    let strongCorrob = (hasCutoff ? 1 : 0) + (hasNormFlag ? 1 : 0) +
      (has(I_REASONING) && has(I_CHATBOT) ? 1 : 0) + (denseAIVocab ? 1 : 0);
    if (!R.corrob) strongCorrob = 0;
    let stylometricHits = 0;
    if (has(I_PUNCTDIST)) stylometricHits++;
    if (has(I_BURST)) stylometricHits++;
    if (has(I_FNWORD)) stylometricHits++;
    const weakCorrob = (stylometricHits >= 2 ? 1 : 0) + (has(I_SMARTPUNCT) ? 1 : 0);
    const totalCorrob = strongCorrob + weakCorrob;

    let band;
    if (scoreValue < 15 && strongCorrob === 0) band = "human_like";
    else if (strongCorrob >= 1 || scoreValue >= 70) band = "ai_like";
    else if (scoreValue >= 40 && totalCorrob >= 1) band = "ai_like";
    else band = "mixed_signals";

    const aiSoft = Math.min(0.97, scoreValue / 100 + totalCorrob * 0.06 + strongCorrob * 0.08);
    let p;
    if (band === "human_like") p = { human: Math.max(0.6, 1 - aiSoft), mixed: Math.min(0.35, aiSoft * 0.8), ai: Math.min(0.1, aiSoft * 0.3) };
    else if (band === "ai_like") p = { human: Math.max(0.02, 1 - aiSoft - 0.05), mixed: 0.1, ai: aiSoft };
    else p = { human: Math.max(0.15, 0.6 - aiSoft * 0.5), mixed: 0.5, ai: aiSoft * 0.7 };
    const rawSum = p.human + p.mixed + p.ai;
    const human = +(p.human / rawSum).toFixed(3);
    const mixed = +(p.mixed / rawSum).toFixed(3);
    const ai = Math.max(0, +(1 - human - mixed).toFixed(3));

    let base;
    if (human >= mixed && human >= ai) base = "human_like";
    else if (mixed >= ai) base = "mixed_signals";
    else base = "ai_like";

    let confidence;
    if (strongCorrob >= 2 || hasCutoff || (scoreValue < 8 && words >= 100)) confidence = "high";
    else if (strongCorrob >= 1 || (scoreValue >= 45 && weakCorrob >= 1) || scoreValue < 20) confidence = "medium";
    else confidence = "low";

    // ── applyEscalationPolicy(), on the collapsed breadth view ──
    let v4IssueCount = 0, furnitureIssueCount = 0;
    const breadthCats = new Set();
    let hasV4 = false, hasFurniture = false;
    for (const key in countMap) {
      const c = +key;
      if (v4.has(c)) { v4IssueCount += countMap[key]; hasV4 = true; }
      else if (furniture.has(c)) { furnitureIssueCount += countMap[key]; hasFurniture = true; }
      else breadthCats.add(c);
    }
    const breadthFindingCount = issueCount - Math.max(0, v4IssueCount - 1) - Math.max(0, furnitureIssueCount - 1);
    const breadthSize = breadthCats.size + (hasV4 ? 1 : 0) + (hasFurniture ? 1 : 0);

    let coreArt = 0, supArt = 0, fmtCount = 0;
    for (const c of breadthCats) {
      if (artCore.has(c)) coreArt++;
      if (artSup.has(c)) supArt++;
      if (fmtCluster.has(c)) fmtCount++;
    }
    const artefactHit = coreArt >= 1 || supArt >= 2;

    // Every gate below reads the COLLAPSED breadth set, not the full hit set.
    // That set excludes the markdown-furniture and v4 rhythm categories, which
    // is why `esc_furniture` can never fire in the shipped build.
    const bHas = (c) => breadthCats.has(c);
    const candidates = [];
    if (R.esc_citation && bHas(I_CITEMARKUP) && bHas(I_CITETOKEN)) candidates.push(["citation_co_occurrence", "ai_like"]);
    if (R.esc_breadth && breadthFindingCount >= 6 && breadthSize >= 4) candidates.push(["finding_breadth", base === "human_like" ? "mixed_signals" : "ai_like"]);
    const artefactScore = artefactHit && scoreValue >= 10;
    if (R.esc_artefactScore && artefactScore) candidates.push(["artefact_score", "mixed_signals"]);
    if (R.esc_artefactFloor && artefactHit) candidates.push(["artefact_floor", "mixed_signals"]);
    if (R.esc_furniture && bHas(I_FURNITURE)) candidates.push(["furniture_gate", "mixed_signals"]);
    if (R.esc_formattingFloor && bHas(I_FORMATTING)) candidates.push(["formatting_floor", "mixed_signals"]);
    if (R.esc_formattingCluster && fmtCount >= 3) candidates.push(["formatting_cluster", "mixed_signals"]);

    let finalClass = base, applied = null;
    for (let k = 0; k < candidates.length; k++) {
      if (RANK[candidates[k][1]] > RANK[finalClass]) { finalClass = candidates[k][1]; applied = candidates[k][0]; }
    }
    return {
      score: scoreValue, classification: finalClass,
      confidence: (R.esc_artefactScore && artefactScore && confidence === "low") ? "medium" : confidence,
      escalation: applied, status: "scored",
    };
  };
}
