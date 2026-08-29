"""Long-form prompt bank for the 2026 long-form gap run.

Registers here are exactly the ones the shipped Tier 3 model fails on:
academic essays, literature reviews, discussion sections, white papers,
research summaries, long-form journalism, stories and company updates.

Three prompt styles, matching the earlier generated-corpus run so the
plain / house-brief / human-voice comparison carries across both runs.
Word targets are deliberately higher than the earlier run (800-2,000)
because long-form is the target register.
"""

from __future__ import annotations

import random

# (topic_id, register, domain, subject, detail)
TOPICS: list[tuple[str, str, str, str, str]] = [
    # --- academic-essay (10) ---
    ("L01", "academic-essay", "history", "To what extent was the 1944 Education Act a break with pre-war schooling in England?", "undergraduate history essay, argued position, author-date citations, engagement with historiography"),
    ("L02", "academic-essay", "sociology", "Critically assess Bourdieu's concept of cultural capital as an explanation of educational inequality.", "undergraduate sociology essay, argued position, engagement with critics, author-date citations"),
    ("L03", "academic-essay", "philosophy", "Is moral luck a genuine problem for Kantian ethics?", "undergraduate philosophy essay, argument and counter-argument, worked examples"),
    ("L04", "academic-essay", "politics", "Assess the claim that proportional representation produces more responsive government than first past the post.", "undergraduate politics essay, comparative cases, argued position, citations"),
    ("L05", "academic-essay", "economics", "Evaluate the evidence that minimum wage increases reduce employment.", "undergraduate economics essay, empirical evidence, argued position, citations"),
    ("L06", "academic-essay", "literature", "Discuss the function of unreliable narration in twentieth-century English fiction.", "undergraduate literature essay, close reading of two or three texts, critical sources"),
    ("L07", "academic-essay", "law", "Critically evaluate the proportionality test in UK judicial review.", "undergraduate law essay, case authorities, argued position"),
    ("L08", "academic-essay", "psychology", "To what extent does the replication crisis undermine social priming research?", "undergraduate psychology essay, methods critique, argued position, citations"),
    ("L09", "academic-essay", "geography", "Assess the effectiveness of managed retreat as a coastal adaptation strategy.", "undergraduate geography essay, case studies, argued position, citations"),
    ("L10", "academic-essay", "health", "Critically discuss whether screening programmes do more good than harm at population level.", "postgraduate public-health essay, evidence appraisal, argued position, citations"),

    # --- academic-lit-review (8) ---
    ("L11", "academic-lit-review", "education", "teacher professional development and pupil attainment", "literature review section: themes, tensions, methodological critique, gap statement, author-date citations"),
    ("L12", "academic-lit-review", "sociology", "precarious work and household formation in high-income economies", "literature review section: synthesis by theme, contested findings, gap statement"),
    ("L13", "academic-lit-review", "health", "loneliness interventions for older adults living at home", "literature review section: synthesis, quality appraisal, gap statement"),
    ("L14", "academic-lit-review", "technology", "adversarial robustness evaluation in deployed vision systems", "literature review section: synthesis, methodological critique, gap statement"),
    ("L15", "academic-lit-review", "economics", "the pass-through of corporate tax changes to wages", "literature review section: competing identification strategies, synthesis, gap statement"),
    ("L16", "academic-lit-review", "psychology", "sleep and emotion regulation in adolescence", "literature review section: synthesis, measurement problems, gap statement"),
    ("L17", "academic-lit-review", "politics", "descriptive representation and legislative behaviour", "literature review section: synthesis, contested findings, gap statement"),
    ("L18", "academic-lit-review", "environment", "behavioural interventions for household energy demand reduction", "literature review section: synthesis, effect-size heterogeneity, gap statement"),

    # --- academic-discussion (8) ---
    ("L19", "academic-discussion", "health", "a cluster-randomised trial finding no effect of a community pharmacy blood-pressure check on one-year control", "discussion section: interpretation against prior literature, mechanisms, limitations, generalisability, implications, future work"),
    ("L20", "academic-discussion", "education", "a quasi-experiment finding small positive effects of a tutoring programme concentrated in the lowest attainment quartile", "discussion section: interpretation, heterogeneity, limitations, policy implications"),
    ("L21", "academic-discussion", "psychology", "an experiment failing to replicate an ego-depletion effect at higher power", "discussion section: interpretation, alternative explanations, limitations, implications for theory"),
    ("L22", "academic-discussion", "economics", "a difference-in-differences study finding a null employment effect of a regional wage floor", "discussion section: interpretation, identification threats, limitations, policy implications"),
    ("L23", "academic-discussion", "environment", "a monitoring study finding urban tree planting delivered less cooling than modelled", "discussion section: interpretation, model-data gap, limitations, future work"),
    ("L24", "academic-discussion", "technology", "an evaluation finding automated code review reduced defects but increased review latency", "discussion section: interpretation, trade-offs, threats to validity, future work"),
    ("L25", "academic-discussion", "sociology", "a longitudinal study finding neighbourhood effects on employment attenuate after controlling for selection", "discussion section: interpretation, selection, limitations, implications"),
    ("L26", "academic-discussion", "health", "a cohort study finding an association between shift work and metabolic syndrome that weakens with adjustment", "discussion section: interpretation, confounding, limitations, future work"),

    # --- white-paper (8) ---
    ("L27", "white-paper", "technology", "a vendor-neutral white paper on migrating public sector case-management systems off end-of-life platforms", "executive summary, problem framing, options appraisal, risks, recommendations, references"),
    ("L28", "white-paper", "finance", "a white paper on operational resilience requirements for mid-sized UK financial firms", "executive summary, regulatory context, gap analysis, implementation roadmap, recommendations"),
    ("L29", "white-paper", "health", "a white paper on integrating remote monitoring into chronic disease pathways", "executive summary, evidence base, service model, costs, risks, recommendations"),
    ("L30", "white-paper", "environment", "a white paper on procurement levers for reducing embodied carbon in public construction", "executive summary, policy context, levers, evidence, recommendations"),
    ("L31", "white-paper", "education", "a white paper on assessment design in the era of generative AI", "executive summary, problem statement, options, evidence, recommendations for institutions"),
    ("L32", "white-paper", "business", "a white paper on supply chain due diligence obligations for mid-market manufacturers", "executive summary, obligations, maturity model, implementation steps, recommendations"),
    ("L33", "white-paper", "technology", "a standards-body style white paper on provenance metadata for published media", "scope, terminology, requirements, conformance, security considerations, references"),
    ("L34", "white-paper", "politics", "a think-tank report on devolved transport funding settlements in England", "executive summary, evidence, options, distributional analysis, recommendations"),

    # --- research-summary (8) ---
    ("L35", "research-summary", "health", "a plain-language research summary of a trial of social prescribing in primary care", "what was studied, how, what was found, what it means, what it does not show"),
    ("L36", "research-summary", "education", "a research briefing summarising evidence on phonics instruction for a policy audience", "what the evidence says, strength of evidence, caveats, implications"),
    ("L37", "research-summary", "environment", "a research briefing on heat-related mortality projections for UK cities", "methods in brief, findings, uncertainty, policy implications"),
    ("L38", "research-summary", "economics", "an evidence summary on the labour market effects of automation in manufacturing regions", "findings, contested points, evidence quality, implications"),
    ("L39", "research-summary", "technology", "a research summary on the measured accuracy of AI text detectors", "methods, findings, limitations, what practitioners should conclude"),
    ("L40", "research-summary", "sociology", "a research summary on housing insecurity and children's school outcomes", "findings, mechanisms, evidence quality, implications"),
    ("L41", "research-summary", "psychology", "a research summary on digital mental health interventions for young people", "findings, effect sizes, evidence quality, caveats"),
    ("L42", "research-summary", "politics", "an evidence summary on citizens' assemblies and policy legitimacy", "findings, evidence quality, contested claims, implications"),

    # --- longform-journalism (10) ---
    ("L43", "longform-journalism", "business", "a feature on how a family-owned bakery chain survived three years of cost shocks", "reported feature: scene, characters, quotes, numbers, structural analysis, no listicle formatting"),
    ("L44", "longform-journalism", "health", "an investigative feature on waiting lists for adult ADHD assessment", "reported feature: cases, data, institutional response, wider context"),
    ("L45", "longform-journalism", "environment", "a feature on a town rebuilding after repeated flooding", "reported feature: scene-setting, voices, policy backdrop, unresolved ending"),
    ("L46", "longform-journalism", "technology", "a feature on the people who moderate content for a living", "reported feature: interviews, working conditions, industry context"),
    ("L47", "longform-journalism", "politics", "a feature on what happened to a devolution deal after the cameras left", "reported feature: chronology, competing accounts, analysis"),
    ("L48", "longform-journalism", "education", "a feature on a school that abolished its behaviour points system", "reported feature: classroom scenes, staff and pupil voices, evidence, scepticism"),
    ("L49", "longform-journalism", "travel", "a travel feature on an overnight rail route most people no longer take", "narrative travel feature: journey structure, people met, history, sensory detail"),
    ("L50", "longform-journalism", "finance", "a feature on how a mutual building society decided not to demutualise", "reported feature: history, decision, characters, consequences"),
    ("L51", "longform-journalism", "local-services", "a feature on the last independent hardware shop on a high street", "reported feature: scene, owner's voice, retail economics, ending without a moral"),
    ("L52", "longform-journalism", "sociology", "a feature on what happened to a mining village forty years on", "reported feature: history, voices across generations, data, analysis"),

    # --- story (8): fiction and creative non-fiction ---
    ("L53", "story", "fiction", "a short story about a night shift in a hospital laundry", "literary short fiction: scene, interiority, dialogue, no moral, open ending"),
    ("L54", "story", "fiction", "a short story about two siblings clearing out a parent's flat", "literary short fiction: dialogue-led, restrained, unresolved"),
    ("L55", "story", "fiction", "a speculative short story about a town where the water supply is metered by the litre", "speculative short fiction: world implied not explained, character-led"),
    ("L56", "story", "fiction", "a short story about a football referee in the week after a contested decision", "literary short fiction: close third person, small-town texture, ambiguous ending"),
    ("L57", "story", "creative-nonfiction", "a personal essay about learning to sail badly in middle age", "creative non-fiction: first person, specific, self-deprecating, no tidy lesson"),
    ("L58", "story", "creative-nonfiction", "a memoir piece about a grandmother's ration-book cooking", "creative non-fiction: sensory, first person, historical texture"),
    ("L59", "story", "creative-nonfiction", "a nature-writing essay about a canal towpath through an industrial estate", "creative non-fiction: observational, unsentimental, place-specific"),
    ("L60", "story", "creative-nonfiction", "an essay about leaving a career in academia", "creative non-fiction: first person, ambivalent, concrete detail"),

    # --- company-update (8) ---
    ("L61", "company-update", "business", "the narrative business review section of a mid-cap distribution group's annual report", "chair and chief executive style narrative: performance, markets, strategy, risks, outlook"),
    ("L62", "company-update", "technology", "a quarterly investor update from a listed enterprise software company", "results narrative, segment commentary, guidance, risk commentary"),
    ("L63", "company-update", "finance", "an annual report strategic review for a building society", "narrative review: members, capital, lending, risks, outlook"),
    ("L64", "company-update", "health", "an annual review narrative from a private healthcare group", "narrative review: activity, quality, workforce, investment, outlook"),
    ("L65", "company-update", "environment", "a sustainability report narrative section for a food manufacturer", "narrative: targets, progress against baseline, setbacks, methodology notes"),
    ("L66", "company-update", "business", "a chief executive's letter to shareholders after a difficult year", "letter: candid performance account, decisions taken, priorities"),
    ("L67", "company-update", "technology", "an engineering organisation's annual public update on reliability", "narrative: incidents, causes, structural changes, metrics, what is still unsolved"),
    ("L68", "company-update", "education", "an annual report narrative from a multi-academy trust", "narrative: outcomes, finances, staffing, governance, priorities"),
]

BANDS = {
    "long": (800, 1200, 2600),
    "very-long": (1400, 2000, 3600),
}

# Registers where the very-long band is most useful (the hardest failures).
VERY_LONG_REGISTERS = {
    "academic-essay", "academic-lit-review", "academic-discussion",
    "white-paper", "longform-journalism", "story",
}

HOUSE_BRIEF = (
    "House style brief:\n"
    "- British English spelling and punctuation throughout.\n"
    "- No bulleted summary at the end, no 'In conclusion', no rhetorical questions as headings.\n"
    "- Prose paragraphs. Headings only where a real publication would use them.\n"
    "- Specific: real-sounding numbers, dates, named institutions, concrete examples.\n"
    "- Vary sentence length. Do not open consecutive paragraphs the same way.\n"
    "- Do not hedge every claim; take positions and defend them.\n"
)

HUMAN_VOICE = (
    "Write it the way a human specialist actually writes for publication. "
    "Uneven paragraph lengths, the occasional aside or subordinate clause that runs long, "
    "a digression that earns its place, an admission of what is not known. "
    "Avoid the register of an assistant summarising: no tidy tricolons, no 'not only X but Y', "
    "no closing paragraph that restates the piece. British English. "
    "Do not announce structure before delivering it.\n"
)


def _prompt(style: str, register: str, subject: str, detail: str, lo: int, hi: int) -> str:
    name = register.replace("-", " ")
    art = "an" if name[0] in "aeiou" else "a"
    base = (
        f"Write {art} {name} of {lo}-{hi} words.\n\n"
        f"Subject: {subject}\n"
        f"Required content and form: {detail}\n"
    )
    if style == "plain":
        return base + "\nOutput only the piece itself."
    if style == "house-brief":
        return base + "\n" + HOUSE_BRIEF + "\nOutput only the piece itself."
    return base + "\n" + HUMAN_VOICE + "\nOutput only the piece itself."


STYLES = ("plain", "house-brief", "human-voice")


def build_all() -> list[dict]:
    tasks = []
    for topic_id, register, domain, subject, detail in TOPICS:
        for style in STYLES:
            band = "very-long" if register in VERY_LONG_REGISTERS else "long"
            lo, hi, maxtok = BANDS[band]
            tasks.append({
                "prompt_id": f"{topic_id}-{style}",
                "topic_id": topic_id,
                "register": register,
                "domain": domain,
                "prompt_style": style,
                "length_band": band,
                "target_words": [lo, hi],
                "max_tokens": maxtok,
                "temperature": 1.0,
                "prompt": _prompt(style, register, subject, detail, lo, hi),
            })
    return tasks


def sample_for(model_id: str, n: int) -> list[dict]:
    """Deterministic per-model subset, so models differ in coverage but the
    run is reproducible."""
    tasks = build_all()
    rng = random.Random(f"longform-2026-08-28::{model_id}")
    if n >= len(tasks):
        out = list(tasks)
        rng.shuffle(out)
        return out
    return rng.sample(tasks, n)
