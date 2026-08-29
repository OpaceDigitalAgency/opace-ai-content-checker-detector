"""Render GENERATED-CORPUS-EVAL.md from analysis.json + manifest.json."""
import json

a = json.load(open("analysis.json"))
man = json.load(open("manifest.json"))
o = a["overall"]
b = a["baseline_provider_eval"]
L = []
W = L.append

def f(v, n):   # "12.4% (498/4,016)"
    return f"{v}% ({n:,}/{o['n']:,})"

W("# Generated corpus - current-model article evaluation")
W("")
W("**Opace AI Content Integrity - local engine research**  ")
W("Corpus generated 28 August 2026 via OpenRouter. Scored with the shipped rules stack")
W("(`packages/core` dist `computeEditorialSignals` / `inspectSignalsV2`) and the shipped")
W("Tier 3 model (`models/tier3-e5small-int8-perchannel.onnx`).")
W("")
W(f"**{man['n_usable']:,} usable samples** ({man['n_requested']:,} generated, "
  f"{man['n_quarantined']} quarantined) across **{man['n_models']} models** from "
  f"**{len(set(m.split('/')[0] for m in man['models']))} providers**, "
  f"{man['total_words']:,} words. **Actual spend $61.70** against a $75 cap.")
W("")
W("Every rate below shows its denominator. British English throughout.")
W("")
W("---")
W("")
W("## Why this corpus exists")
W("")
W("The existing AI corpus is 1,727 samples whose newest models date to roughly July 2025,")
W("and every one of them is a **chat reply**. Nobody runs an authenticity check on a chat")
W("reply. People check what gets published or submitted. This run fixes both problems at")
W("once: current models, and only the registers users actually paste.")
W("")
W("That means the comparison against `provider-eval/analysis.json` in this report changes")
W("**two variables at once** - model era *and* register. Where that matters, it is called")
W("out. It is the single most important caveat in this document.")
W("")
W("## What was generated")
W("")
W("| | |")
W("|---|---|")
W(f"| Samples (usable / generated) | {man['n_usable']:,} / {man['n_requested']:,} |")
W(f"| Models | {man['n_models']} |")
W(f"| Words | {man['total_words']:,} (mean {o['mean_words']}, median {a['corpus']['words']['median']}, max {a['corpus']['words']['max']}) |")
W(f"| Registers | 19, in 5 families |")
W(f"| Prompt styles | plain {man['prompt_styles']['plain']:,} / house-brief {man['prompt_styles']['house-brief']:,} / human-voice {man['prompt_styles']['human-voice']:,} |")
W(f"| Temperatures | 0.7 ({man['temperatures']['0.7']:,}), 1.0 ({man['temperatures']['1.0']:,}), 1.2 ({man['temperatures']['1.2']:,}) |")
W(f"| Topic prompts | 106 (60 article/marketing, 46 social/academic/other), identical across every model |")
W("")
W("Registers, by family:")
W("")
W("| Family | Registers | Samples | Mean words |")
W("|---|---|---:|---:|")
for fam, regs in [
    ("article", "company blog, news piece, how-to explainer, thought-leadership"),
    ("marketing-seo", "SEO service page, landing page, category page, product description"),
    ("other-shared", "press release, newsletter, case study, FAQ page"),
    ("social-post", "LinkedIn, X thread, Facebook, Instagram"),
    ("academic", "essay answer, literature review, discussion section"),
]:
    v = a["by_register_family"][fam]
    W(f"| `{fam}` | {regs} | {v['n']:,} | {v['mean_words']} |")
W("")
W("---")
W("")
W("## Headline result")
W("")
W(f"| Measure | Value |")
W("|---|---|")
W(f"| Tier 3 flag rate @ 0.8533 | {f(o['tier3_flag_rate_t_8533'], o['tier3_flag_n_t_8533'])} |")
W(f"| Tier 3 flag rate @ 0.8397 | {f(o['tier3_flag_rate_t_8397'], o['tier3_flag_n_t_8397'])} |")
W(f"| Tier 3 flag rate @ 0.6256 | {f(o['tier3_flag_rate_t_6256'], o['tier3_flag_n_t_6256'])} |")
W(f"| Tier 3 flag rate @ 0.857 (shipped) | {f(o['tier3_flag_rate_t_857'], o['tier3_flag_n_t_857'])} |")
W(f"| Tier 3 mean probability | {o['tier3_mean']} |")
W(f"| Rules score mean / median / p90 / max | {o['rules_score']['mean']} / {o['rules_score']['median']} / {o['rules_score']['p90']} / {o['rules_score']['max']} |")
W(f"| Rules classification: mixed or above | {o['pct_mixed_or_above']}% |")
W(f"| Rules classification: ai_like | {o['pct_ai_like']}% |")
W(f"| Rules score >= 10 | {o['pct_score_ge_10']}% |")
W(f"| Rules score >= 25 | {o['pct_score_ge_25']}% |")
W(f"| Mean findings per sample | {o['mean_findings']} |")
W("")
W("At the shipped 0.857 threshold the Tier 3 model flags **12.4% of current-model article")
W("prose**. The rules stack calls **0.4%** of it `ai_like`. Neither number is a working")
W("detector on its own; both are consistent with the calibration file's own recorded")
W("`corpus_test_ai_tpr` of 0.167.")
W("")
W("---")
W("")

# ---- Q1
W("## Question 1 - has detection degraded on current models?")
W("")
W("**No. It has improved slightly, or held flat, for every provider except xAI.**")
W("")
W("Comparison at the shipped 0.857 threshold, against the two eras in")
W("`provider-eval/analysis.json`. Baseline slices are 150 chat replies each; the 2026")
W("column is this corpus.")
W("")
W("| Provider | 2024-25 chat | 2025-26 chat | 2026 articles (this run) | n (2026) | Direction |")
W("|---|---|---|---|---:|---|")
pmap = [("anthropic","anthropic"),("openai","openai"),("google","google"),
        ("xai","grok"),("deepseek","deepseek"),("meta","meta"),("mistral","mistral"),
        ("qwen",None),("moonshot",None),("zai",None)]
for mine, base in pmap:
    v = a["by_provider"][mine]
    b1 = b.get(f"{base}|2024-25", {}).get("tier3_flag_rate_0857") if base else None
    b2 = b.get(f"{base}|2025-26", {}).get("tier3_flag_rate_0857") if base else None
    cur = v["tier3_flag_rate_t_857"]
    ref = b2 if b2 is not None else b1
    if ref is None:
        d = "no baseline - new coverage"
    elif cur > ref + 1:
        d = f"**up {cur-ref:+.1f} pt**"
    elif cur < ref - 1:
        d = f"**down {cur-ref:+.1f} pt**"
    else:
        d = "flat"
    s1 = f"{b1}%" if b1 is not None else "-"
    s2 = f"{b2}%" if b2 is not None else "-"
    W(f"| {mine} | {s1} | {s2} | **{cur}%** ({v['tier3_flag_n_t_857']}/{v['n']}) | {v['n']} | {d} |")
W("")
W("Same comparison on the rules stack, mean score:")
W("")
W("| Provider | 2024-25 chat | 2025-26 chat | 2026 articles | Mean findings 2025-26 -> 2026 |")
W("|---|---|---|---|---|")
for mine, base in pmap:
    v = a["by_provider"][mine]
    b1 = b.get(f"{base}|2024-25", {}) if base else {}
    b2 = b.get(f"{base}|2025-26", {}) if base else {}
    W(f"| {mine} | {b1.get('rules_score',{}).get('mean','-')} | "
      f"{b2.get('rules_score',{}).get('mean','-')} | **{v['rules_score']['mean']}** | "
      f"{b2.get('mean_findings','-')} -> {v['mean_findings']} |")
W("")
W("### Reading this honestly")
W("")
W("- **Detection has not degraded with model generation.** Claude Opus 5 and Sonnet 5, the")
W("  biggest gap in the corpus, flag at 5.6% and 12.0% at the shipped threshold - above,")
W("  not below, the 2.7% and 5.3% recorded for Claude in 2024-25 and 2025-26.")
W("- **The one genuine regression is xAI.** Grok 4.6 flags at 3.6% (9/250) versus 6.7% for")
W("  Grok in 2025-26, and its rules mean collapses to 1.86 with 4.0% mixed-or-above. It is")
W("  by a wide margin the hardest model in this corpus, and the only one where a")
W("  human-voice prompt drives detection to exactly zero (0/86).")
W("- **The improvement is register, not virtue.** Articles carry markdown headings, bold")
W("  labels and section furniture that chat replies often do not; those are what the rules")
W("  stack is mostly firing on. Read the per-register table before drawing conclusions")
W("  about model families.")
W("- Absolute recall remains poor everywhere: 3.6% to 17.5% by provider at 0.857.")
W("")
W("### Per model")
W("")
W("| Model | Tier | n | Rules mean | Mixed+ | Findings | Tier3 mean | @0.8533 | @0.8397 | @0.6256 | @0.857 |")
W("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
for k, v in sorted(a["by_model"].items(), key=lambda kv: -kv[1]["tier3_flag_rate_t_8533"]):
    tier = man["models"][k]["tier"]
    W(f"| `{k}` | {tier} | {v['n']} | {v['rules_score']['mean']} | {v['pct_mixed_or_above']}% | "
      f"{v['mean_findings']} | {v['tier3_mean']} | {v['tier3_flag_rate_t_8533']}% | "
      f"{v['tier3_flag_rate_t_8397']}% | {v['tier3_flag_rate_t_6256']}% | {v['tier3_flag_rate_t_857']}% |")
W("")
W("### Per tier - the free-versus-paid question")
W("")
W("| Tier | n | Rules mean | Mixed+ | Tier3 mean | @0.8533 | @0.8397 | @0.6256 | @0.857 |")
W("|---|---:|---:|---:|---:|---:|---:|---:|---:|")
for k in ("flash-or-mini", "standard", "pro-flagship"):
    v = a["by_tier"][k]
    W(f"| {k} | {v['n']:,} | {v['rules_score']['mean']} | {v['pct_mixed_or_above']}% | "
      f"{v['tier3_mean']} | {v['tier3_flag_rate_t_8533']}% ({v['tier3_flag_n_t_8533']}/{v['n']}) | "
      f"{v['tier3_flag_rate_t_8397']}% | {v['tier3_flag_rate_t_6256']}% | {v['tier3_flag_rate_t_857']}% |")
W("")
W("**The more capable the model, the harder it is to detect.** Flash and mini models flag")
W("at 51.8% (505/975) at 0.8533; pro and flagship models at 35.3% (358/1,015). A 16.5-point")
W("gap in the same registers, on the same prompts. Free-tier users are the ones we catch.")
W("Agencies paying for Opus 5 and Grok 4.6 are not.")
W("")
W("---")
W("")

# ---- Q2
W("## Question 2 - are the cliche-vocabulary rules obsolete?")
W("")
W("**Partly. Tier 1 is alive but no longer discriminating. Tier 2 is nearly dead. Tier 3")
W("is completely dead.**")
W("")
W("| Vocabulary list | Samples firing | Rate |")
W("|---|---:|---:|")
W(f"| `tier1` (delve, tapestry, landscape, realm ...) | {o['vocab_n_tier1']:,}/{o['n']:,} | **{o['vocab_tier1_pct']}%** |")
W(f"| `tier2` | {o['vocab_n_tier2']}/{o['n']:,} | {o['vocab_tier2_pct']}% |")
W(f"| `tier3` | {o['vocab_n_tier3']}/{o['n']:,} | **{o['vocab_tier3_pct']}%** |")
W(f"| any of the three | {o['vocab_n_any']:,}/{o['n']:,} | {o['vocab_any_pct']}% |")
W(f"| `tier1_clarity` (related) | - | {o['category_fire_pct'].get('tier1-clarity')}% |")
W("")
W("So the owner's belief is half right, and the half that is wrong matters more.")
W("")
W("**Tier 1 has not gone away.** It fires on a quarter of all current-model prose, and on")
W("41.2% (538/1,307) of plainly-prompted samples. Compared with the chat-reply baselines")
W("(`signals.tier1` at 12.7-32.7% across the 2024-25 and 2025-26 provider slices) it is")
W("firing at the same rate or higher. Per model it ranges from 12.0% for")
W("`openai/gpt-5.6-sol` to 58.0% for `meta-llama/llama-4-maverick`. Deleting it would lose")
W("real signal.")
W("")
W("**But it does not separate AI from human in the register that matters.** The")
W("`human|business-marketing` baseline slice fires `signals.tier1` on 40.0% (4/10) of")
W("genuine human marketing copy - a higher rate than 15 of the 21 models in this corpus.")
W("Human marketing writers use 'landscape' and 'unlock' too. Tier 1 is a register detector")
W("wearing an AI detector's badge. On a 10-sample human denominator that is weak evidence,")
W("and it is the gap most worth closing next.")
W("")
W("**Tier 3 is genuinely obsolete.** Zero fires in 4,016 samples. Whatever it lists, no")
W("current model writes it. Tier 2 at 1.3% (53/4,016) is close behind.")
W("")
W("What actually carries the rules stack now is structure, not vocabulary:")
W("")
W("| Category | Fires on |")
W("|---|---:|")
for c in ("markdown-furniture","markdown-heading","markdown-bold","formatting",
          "setup-expansion-cadence","tier1","em-dash-density","hollow-intensifier",
          "bold-label-bullets","uniform-list-items","tier1-clarity","uniform-sections"):
    W(f"| `{c}` | {o['category_fire_pct'].get(c)}% |")
W("")
W("Five of the top six are formatting. That is a fragile place to stand: a user who pastes")
W("plain text, or whose CMS strips markdown, removes most of the engine's evidence.")
W("")
W("---")
W("")

# ---- Q3
W('## Question 3 - does "write like a human" defeat detection?')
W("")
W("**Yes, decisively. It roughly cuts detection by two thirds, and at the shipped")
W("threshold it cuts it by six sevenths.**")
W("")
W("Same models, same 106 topics, same temperatures. Only the instruction changes.")
W("")
W("| Prompt style | n | Rules mean | Mixed+ | Tier1 vocab | Em dash /1k | Tier3 mean | @0.8533 | @0.8397 | @0.6256 | @0.857 |")
W("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
for k in ("plain", "house-brief", "human-voice"):
    v = a["by_prompt_style"][k]
    W(f"| {k} | {v['n']:,} | {v['rules_score']['mean']} | {v['pct_mixed_or_above']}% | "
      f"{v['vocab_tier1_pct']}% ({v['vocab_n_tier1']}/{v['n']}) | {v['em_dash_per_1000']} | {v['tier3_mean']} | "
      f"**{v['tier3_flag_rate_t_8533']}%** ({v['tier3_flag_n_t_8533']}/{v['n']}) | "
      f"{v['tier3_flag_rate_t_8397']}% ({v['tier3_flag_n_t_8397']}/{v['n']}) | "
      f"{v['tier3_flag_rate_t_6256']}% ({v['tier3_flag_n_t_6256']}/{v['n']}) | "
      f"{v['tier3_flag_rate_t_857']}% ({v['tier3_flag_n_t_857']}/{v['n']}) |")
W("")
pl = a["by_prompt_style"]["plain"]; hv = a["by_prompt_style"]["human-voice"]
W(f"**The cost of one sentence in the prompt:**")
W("")
W(f"- Tier 3 @ 0.8533: {pl['tier3_flag_rate_t_8533']}% -> {hv['tier3_flag_rate_t_8533']}% "
  f"(**-{pl['tier3_flag_rate_t_8533']-hv['tier3_flag_rate_t_8533']:.1f} points**, a "
  f"{100*(1-hv['tier3_flag_rate_t_8533']/pl['tier3_flag_rate_t_8533']):.0f}% relative drop)")
W(f"- Tier 3 @ 0.857 (shipped): {pl['tier3_flag_rate_t_857']}% -> {hv['tier3_flag_rate_t_857']}% "
  f"(**-{pl['tier3_flag_rate_t_857']-hv['tier3_flag_rate_t_857']:.1f} points**, an "
  f"{100*(1-hv['tier3_flag_rate_t_857']/pl['tier3_flag_rate_t_857']):.0f}% relative drop)")
W(f"- Rules mixed-or-above: {pl['pct_mixed_or_above']}% -> {hv['pct_mixed_or_above']}%")
W(f"- Tier 1 cliche vocabulary: {pl['vocab_tier1_pct']}% -> {hv['vocab_tier1_pct']}%")
W(f"- Em dashes per 1,000 words: {pl['em_dash_per_1000']} -> {hv['em_dash_per_1000']}")
W("")
W("Note the house-style brief sits between the two and is closer to plain. It is the")
W("explicit anti-AI instruction, not general prompt sophistication, that does the damage.")
W("")
W("### Per model, Tier 3 @ 0.8533")
W("")
W("| Model | plain | house-brief | human-voice | Drop (plain - human) |")
W("|---|---|---|---|---:|")
ms = a["by_model_style"]
rowsd = []
for m in sorted({k.split("|")[0] for k in ms}):
    c = []
    for stl in ("plain", "house-brief", "human-voice"):
        v = ms.get(f"{m}|{stl}")
        c.append((v["tier3_flag_rate_t_8533"], v["tier3_flag_n_t_8533"], v["n"]) if v else (0,0,0))
    rowsd.append((m, c, c[0][0]-c[2][0]))
for m, c, d in sorted(rowsd, key=lambda x: -x[2]):
    cells = " | ".join(f"{x[0]}% ({x[1]}/{x[2]})" for x in c)
    W(f"| `{m}` | {cells} | **{d:+.1f}** |")
W("")
W("`x-ai/grok-4.6` goes to **zero** - 0 of 86 human-voice samples flag at 0.8533. The")
W("smallest drop is `openai/gpt-5.6-sol` at 12.0 points, and it is the only model that")
W("stays above 50% detection under an anti-AI prompt.")
W("")
W("---")
W("")

# ---- Q4
W("## Question 4 - detection by register")
W("")
W("**Register dominates everything else in this data - more than model, more than tier,")
W("more than temperature.**")
W("")
W("| Register family | n | Mean words | Rules mean | Mixed+ | Tier1 vocab | Tier3 mean | @0.8533 | @0.8397 | @0.6256 | @0.857 |")
W("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
for k in ("marketing-seo","other-shared","article","social-post","academic"):
    v = a["by_register_family"][k]
    W(f"| **{k}** | {v['n']:,} | {v['mean_words']} | {v['rules_score']['mean']} | "
      f"{v['pct_mixed_or_above']}% | {v['vocab_tier1_pct']}% | {v['tier3_mean']} | "
      f"**{v['tier3_flag_rate_t_8533']}%** ({v['tier3_flag_n_t_8533']}/{v['n']}) | "
      f"{v['tier3_flag_rate_t_8397']}% | {v['tier3_flag_rate_t_6256']}% | {v['tier3_flag_rate_t_857']}% |")
W("")
W("| Register | n | Mean words | Rules mean | @0.8533 | @0.6256 | Tier1 vocab |")
W("|---|---:|---:|---:|---:|---:|---:|")
for k, v in sorted(a["by_register"].items(), key=lambda kv: -kv[1]["tier3_flag_rate_t_8533"]):
    W(f"| {k} | {v['n']} | {v['mean_words']} | {v['rules_score']['mean']} | "
      f"{v['tier3_flag_rate_t_8533']}% ({v['tier3_flag_n_t_8533']}/{v['n']}) | "
      f"{v['tier3_flag_rate_t_6256']}% | {v['vocab_tier1_pct']}% |")
W("")
W("### What this says")
W("")
W("- **Marketing and SEO copy is the one place detection works.** 77.9% (621/797) at")
W("  0.8533, 94.5% at 0.6256, and category pages hit 88.5%. This is also the highest-value")
W("  register commercially. Good news, with one caveat: the human business-marketing")
W("  baseline scores a Tier 3 mean of 0.613 against the general human mean of 0.226, so")
W("  some of what we are catching is 'marketing copy', not 'machine'.")
W("- **Academic writing is effectively invisible.** 1.1% (5/457) at 0.8533; academic essays")
W("  flag 0 of 193 at 0.8533 and 7 of 193 even at 0.6256. Continuous argued prose with")
W("  citations, no headings and no bullets removes nearly every structural signal the")
W("  engine relies on. If students are a target market, the engine currently cannot serve")
W("  them. This is the largest single blind spot the run found.")
W("- **Social posts are unreliable in a different way.** 11.5% at 0.8533, but 73.1% at")
W("  0.6256 - the short-text scores cluster in an unstable middle band. Instagram captions")
W("  average 124 words and post the highest rules mean in the whole corpus (12.26), driven")
W("  by `hashtag-stuff` firing rather than by anything about authorship. Below roughly 200")
W("  words the Tier 3 probability should not be treated as a verdict at all.")
W("- **Length band tracks this directly**: long 43.8% (2,865), medium 60.9% (430),")
W("  short 11.5% (721) at 0.8533.")
W("- **Temperature barely matters**: 38.2% at 0.7 (n=1,351), 41.3% at 1.0 (n=2,008),")
W("  39.0% at 1.2 (n=657).")
W("")
W("---")
W("")
W("## Spend")
W("")
W("| Item | Amount |")
W("|---|---:|")
W("| Cap authorised | $75.00 |")
W("| **Actual spend (OpenRouter `/auth/key` usage)** | **$61.70** |")
W("| Remaining against cap | $13.30 |")
W("| Requests billed | 4,102 |")
W("| Cost per usable sample | $0.0154 |")
W("")
W("| Run | Requests | Cost |")
W("|---|---:|---:|")
for s, label in zip(man["spend_breakdown"],
                    ["pilot (2 models, 10 calls)", "cost probe (12 models)",
                     "pass 1 - articles and marketing, 12 models x 150",
                     "cost probe (9 added models)",
                     "pass 3c - claude-fable-5 x 150",
                     "pass 3b - 4 models x 75", "pass 3a - 4 models x 150",
                     "pass 2 - social, academic, other, 12 models x 100"]):
    W(f"| {label} | {s['requests']:,} | ${s['cost_usd']:.4f} |")
W(f"| **Sum of run logs** | | **${sum(x['cost_usd'] for x in man['spend_breakdown']):.4f}** |")
W("")
W("The authoritative $61.6996 exceeds the run-log sum of $61.4649 by $0.23; the difference")
W("is requests that were billed and then errored or were retried. The higher figure is the")
W("one reported.")
W("")
W("The pilot projected $20.48 for the original 12-model, 1,800-sample plan; that plan")
W("landed at $21.36. The overshoot against the original $40 brief came entirely from the")
W("owner's mid-run expansion to 21 models and 4,050 samples, under the raised $75 cap.")
W("")
W("---")
W("")
W("## Limitations - read before citing any number here")
W("")
W("1. **The era comparison changes two variables.** The 2024-25 and 2025-26 baselines are")
W("   chat replies; this corpus is articles. Any per-provider delta in Question 1 confounds")
W("   model generation with register. The direction of travel (no degradation) is robust")
W("   because it holds across every provider bar one, but the magnitudes are not clean.")
W("2. **No human control was generated.** Every sample here is AI. False-positive rates are")
W("   quoted from `provider-eval/analysis.json`, whose human business-marketing slice is")
W("   **10 samples**. A precision claim on this corpus alone is not available, and the next")
W("   piece of work should be a matched human article set in the same registers.")
W("3. **Thresholds 0.8533, 0.8397 and 0.6256 do not appear anywhere in this repository.**")
W("   They were supplied in the brief and applied as given. The shipped threshold in")
W("   `models/tier3-calibration.json` is 0.856437 raw / 0.921765 calibrated; 0.857 is")
W("   reported alongside so these figures stay comparable with existing analysis. Note also")
W("   that 0.8533 and 0.8397 sit inside the knife-edge band the calibration file warns")
W("   about (verdicts within ~0.01 raw can flip across int8 runtimes).")
W("4. **Tier 3 truncates at 512 tokens.** Roughly the first 380 words of each sample are")
W("   scored. For the 2,865 long samples, most of the text is never seen by the model.")
W("5. **34 samples (0.8%) were quarantined** and 28 more hit the token ceiling. See")
W("   `manifest.json` for the per-model breakdown. `z-ai/glm-5.3` produced 21 degenerate")
W("   outputs; `anthropic/claude-fable-5` had 9 cut by a content filter mid-piece. No model")
W("   refused a task.")
W("6. **Batch pricing was unavailable.** OpenRouter's `:batch` model ids return 404 from")
W("   `/chat/completions` and require the separate `/api/beta/batches` endpoint. Everything")
W("   was billed at synchronous rates.")
W("7. **Google Gemini was run with reasoning enabled** (effort `low`) because those")
W("   endpoints reject `reasoning:{enabled:false}`. Their token counts include reasoning")
W("   tokens; other models were run with reasoning off.")
W("8. **Two slices are not 2026 models.** `meta-llama/llama-4-maverick` (April 2025) is the")
W("   newest Meta instruct model on OpenRouter, and `google/gemini-3.1-pro-preview`")
W("   (February 2026) is the newest Gemini Pro id. Neither gap is ours to close.")
W("9. **Sample sizes differ by model** - 250 for the original twelve, 150 or 75 for the")
W("   nine added later. Denominators are shown on every rate; do not read the 75-sample")
W("   rows as precisely as the 250-sample ones.")
W("10. **These are prompted articles, not deployed content.** Real users edit, re-prompt")
W("    and paste through a CMS. This corpus is an upper bound on how machine-like current")
W("    models are when asked once.")
W("")
W("---")
W("")
W("## Files")
W("")
W("| Path | What |")
W("|---|---|")
for k, v in man["outputs"].items():
    W(f"| `{k}` | {v} |")
W("")
W("`INDEX.md` lists all 105 sample files with provider, exact model id, tier, register")
W("family, prompt-style split, sample count and word count.")
W("")

open("GENERATED-CORPUS-EVAL.md", "w").write("\n".join(L) + "\n")
print("wrote GENERATED-CORPUS-EVAL.md", len(L), "lines")
