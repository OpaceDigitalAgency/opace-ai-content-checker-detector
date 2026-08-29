"""Pass-2 prompt bank: the registers added by the owner update.

Social media posts, academic and student writing, press releases, newsletters,
landing pages and category pages. Same three prompt styles as pass 1 so the
plain / house-brief / human-voice comparison holds across the whole corpus.

Short registers get their own word targets and a length_band tag, because a
180-word LinkedIn post is not a failed 800-word article.
"""

from __future__ import annotations

# (topic_id, register, domain, subject, detail)
TOPICS: list[tuple[str, str, str, str, str]] = [
    # --- social-linkedin (6) ---
    ("s01", "social-linkedin", "business", "what three years of hybrid working actually did to our onboarding", "a concrete anecdote, one number, a clear opinion"),
    ("s02", "social-linkedin", "technology", "why your AI proof-of-concept keeps stalling at procurement", "name the blocker, offer one fix"),
    ("s03", "social-linkedin", "finance", "the moment a client realised their debtor days were the whole problem", "short story, one lesson"),
    ("s04", "social-linkedin", "local-services", "hiring an apprentice when you are a five-person trade business", "cost, time, what surprised us"),
    ("s05", "social-linkedin", "education", "why we stopped running full-day training sessions", "what we do instead, what improved"),
    ("s06", "social-linkedin", "health", "a small change to shift handovers that cut incident reports", "the change, the number, the caveat"),

    # --- social-x-thread (5) ---
    ("s07", "social-x-thread", "technology", "the seven things that break when you move to a monorepo", "numbered thread, 6-9 posts, punchy"),
    ("s08", "social-x-thread", "finance", "how UK VAT registration actually works, in plain terms", "numbered thread, 6-9 posts"),
    ("s09", "social-x-thread", "ecommerce", "why your product pages convert badly, ranked by how common it is", "numbered thread, 6-9 posts"),
    ("s10", "social-x-thread", "travel", "booking European rail without getting fleeced", "numbered thread, 6-9 posts"),
    ("s11", "social-x-thread", "business", "red flags in a supplier tender response", "numbered thread, 6-9 posts"),

    # --- social-facebook (4) ---
    ("s12", "social-facebook", "local-services", "a plumbing firm announcing weekend emergency cover", "friendly, local, clear call to action"),
    ("s13", "social-facebook", "ecommerce", "a homeware shop announcing a new autumn range", "warm, visual, shoppable"),
    ("s14", "social-facebook", "health", "a dental practice explaining its new evening appointments", "reassuring, practical"),
    ("s15", "social-facebook", "education", "a nursery announcing its open morning", "warm, parent-facing, details and date"),

    # --- social-instagram (4) ---
    ("s16", "social-instagram", "travel", "a boutique hotel caption for a shoulder-season offer", "caption plus hashtags"),
    ("s17", "social-instagram", "ecommerce", "a merino base layer caption for a hiking brand", "caption plus hashtags"),
    ("s18", "social-instagram", "health", "a physiotherapy clinic caption about desk posture", "caption plus hashtags"),
    ("s19", "social-instagram", "local-services", "a landscaping company caption showing a finished garden", "caption plus hashtags"),

    # --- academic-essay (6) ---
    ("s20", "academic-essay", "business", "To what extent does organisational culture determine the success of post-merger integration?", "undergraduate essay answer, argued position, referenced in author-date style"),
    ("s21", "academic-essay", "health", "Critically evaluate the role of social determinants in health inequality in the UK.", "undergraduate essay answer, argued position, referenced"),
    ("s22", "academic-essay", "education", "Discuss the evidence for and against setting by ability in secondary schools.", "undergraduate essay answer, argued position, referenced"),
    ("s23", "academic-essay", "finance", "Assess whether central bank independence improves inflation outcomes.", "undergraduate essay answer, argued position, referenced"),
    ("s24", "academic-essay", "technology", "Evaluate the claim that algorithmic transparency is a sufficient safeguard against automated discrimination.", "undergraduate essay answer, argued position, referenced"),
    ("s25", "academic-essay", "travel", "Analyse the economic and social costs of overtourism in European heritage cities.", "undergraduate essay answer, argued position, referenced"),

    # --- academic-lit-review (4) ---
    ("s26", "academic-lit-review", "health", "workplace interventions for lower back pain", "literature review section, synthesis not summary, author-date citations"),
    ("s27", "academic-lit-review", "education", "retrieval practice and long-term retention in schools", "literature review section, synthesis, citations"),
    ("s28", "academic-lit-review", "technology", "explainability methods for deep learning in clinical settings", "literature review section, synthesis, citations"),
    ("s29", "academic-lit-review", "business", "psychological safety and team performance", "literature review section, synthesis, citations"),

    # --- academic-discussion (4) ---
    ("s30", "academic-discussion", "health", "a study finding no effect of a workplace step-count intervention on blood pressure", "discussion section: interpretation, limitations, future work"),
    ("s31", "academic-discussion", "education", "a study finding modest gains from spaced homework in year 9 maths", "discussion section: interpretation, limitations, future work"),
    ("s32", "academic-discussion", "finance", "a study finding weak association between ESG scores and cost of capital", "discussion section: interpretation, limitations, future work"),
    ("s33", "academic-discussion", "technology", "a study finding developer productivity gains from AI assistants concentrated in junior staff", "discussion section: interpretation, limitations, future work"),

    # --- press-release (4) ---
    ("s34", "press-release", "business", "a logistics group opening a new distribution centre", "dateline, boilerplate, two quotes, contact block"),
    ("s35", "press-release", "technology", "a cybersecurity firm achieving ISO 27001 certification", "dateline, boilerplate, quotes, contact block"),
    ("s36", "press-release", "health", "a dental group acquiring three practices", "dateline, boilerplate, quotes, contact block"),
    ("s37", "press-release", "education", "a multi-academy trust launching a regional teacher training hub", "dateline, boilerplate, quotes, contact block"),

    # --- newsletter (3) ---
    ("s38", "newsletter", "ecommerce", "a monthly customer newsletter for a homeware retailer", "intro, three short items, one offer, sign-off"),
    ("s39", "newsletter", "business", "a monthly client newsletter from an accountancy practice", "intro, deadlines, one explainer, sign-off"),
    ("s40", "newsletter", "travel", "a seasonal newsletter from a walking holiday operator", "intro, three trips, practical note, sign-off"),

    # --- landing-page (3) ---
    ("s41", "landing-page", "technology", "a paid-search landing page for a managed IT support package", "hero, proof, objections, single call to action"),
    ("s42", "landing-page", "finance", "a paid-search landing page for bridging finance enquiries", "hero, proof, objections, single call to action"),
    ("s43", "landing-page", "local-services", "a paid-search landing page for emergency drain unblocking", "hero, proof, objections, single call to action"),

    # --- category-page (3) ---
    ("s44", "category-page", "ecommerce", "an ecommerce category page for men's waterproof walking jackets", "intro copy, buying guidance, below-grid SEO copy"),
    ("s45", "category-page", "ecommerce", "an ecommerce category page for solid oak dining tables", "intro copy, buying guidance, below-grid SEO copy"),
    ("s46", "category-page", "health", "an ecommerce category page for magnesium supplements", "intro copy, buying guidance, below-grid SEO copy"),
]

REGISTER_NOUN = {
    "social-linkedin": "a LinkedIn post from a named professional",
    "social-x-thread": "an X (Twitter) thread, numbered, one post per line",
    "social-facebook": "a Facebook business page post",
    "social-instagram": "an Instagram caption for a business account",
    "academic-essay": "a university essay answer",
    "academic-lit-review": "the literature review section of a postgraduate dissertation",
    "academic-discussion": "the discussion section of an academic paper",
    "press-release": "a press release",
    "newsletter": "an email newsletter",
    "landing-page": "a paid-search landing page for a company website",
    "category-page": "an ecommerce category page",
}

# (min_words, max_words, length_band, max_tokens)
REGISTER_LENGTH = {
    "social-linkedin": (120, 300, "short", 900),
    "social-x-thread": (150, 350, "short", 1000),
    "social-facebook": (80, 220, "short", 800),
    "social-instagram": (60, 180, "short", 700),
    "academic-essay": (700, 1200, "long", 2600),
    "academic-lit-review": (600, 1000, "long", 2400),
    "academic-discussion": (600, 1000, "long", 2400),
    "press-release": (400, 700, "medium", 2000),
    "newsletter": (400, 700, "medium", 2000),
    "landing-page": (450, 800, "medium", 2200),
    "category-page": (450, 800, "medium", 2200),
}

STYLES = ("plain", "house-brief", "human-voice")

HUMAN_RULES = (
    "Important: this needs to read as though a human specialist wrote it, not "
    "an AI. Please:\n"
    "- Avoid AI-tell vocabulary and constructions: delve, tapestry, landscape, "
    "realm, leverage, robust, seamless, elevate, unlock, harness, empower, "
    "streamline, game-changer, testament to, 'it's not just X, it's Y', "
    "'in today's fast-paced world'.\n"
    "- Do not open a sentence with Moreover, Furthermore, Additionally or "
    "In conclusion.\n"
    "- Vary sentence length hard. Some very short. Some long and winding.\n"
    "- Use em dashes sparingly, if at all.\n"
    "- Avoid neat lists of three and avoid a closing that restates what you "
    "just said.\n"
    "- Let the writing be slightly uneven. Specific, opinionated, willing to "
    "leave a loose end.\n"
    "- British English throughout.\n"
)

HOUSE_RULES = (
    "House style brief:\n"
    "- Audience: UK readers who are already reasonably informed. Do not "
    "over-explain basics.\n"
    "- Voice: confident, specific, commercially aware.\n"
    "- British English spelling and punctuation throughout.\n"
    "- Use concrete figures, timescales and named steps rather than general "
    "claims. Invent plausible specifics where needed.\n"
    "- Do not open with a rhetorical question.\n"
)

ACADEMIC_NOTE = (
    "Write it as a student or researcher would submit it: continuous academic "
    "prose, an argued line, author-date citations to plausible sources, no "
    "bullet lists, no headings unless the section requires one."
)


def render(topic, style) -> str:
    _tid, register, _domain, subject, detail = topic
    noun = REGISTER_NOUN[register]
    lo, hi, _band, _mt = REGISTER_LENGTH[register]
    is_academic = register.startswith("academic")

    if is_academic:
        head = f'Write {noun} on the following: "{subject}"'
    else:
        head = f"Write {noun} about {subject}"
    detail_clause = f" Cover: {detail}." if detail else "."

    tail = (
        f"Target {lo} to {hi} words. Return only the finished piece itself. "
        "No preamble, no notes to me, no commentary about the task, no "
        "options or alternatives."
    )
    if is_academic:
        tail = ACADEMIC_NOTE + " " + tail

    if style == "plain":
        return f"{head}{detail_clause} {tail}"
    if style == "house-brief":
        return f"{head}{detail_clause}\n\n{HOUSE_RULES}\n{tail}"
    if style == "human-voice":
        return f"{head}{detail_clause}\n\n{HUMAN_RULES}\n{tail}"
    raise ValueError(style)


def build_tasks(n_per_model: int = 100, seed: int = 20260828) -> list[dict]:
    import random

    all_tasks = []
    for topic in TOPICS:
        for style in STYLES:
            lo, hi, band, mt = REGISTER_LENGTH[topic[1]]
            all_tasks.append({
                "prompt_id": f"{topic[0]}-{style}",
                "topic_id": topic[0],
                "register": topic[1],
                "domain": topic[2],
                "prompt_style": style,
                "length_band": band,
                "target_words": [lo, hi],
                "max_tokens": mt,
                "prompt": render(topic, style),
            })
    rng = random.Random(seed)
    rng.shuffle(all_tasks)
    # guarantee at least a third human-voice: take all human-voice first, then fill
    hv = [t for t in all_tasks if t["prompt_style"] == "human-voice"]
    rest = [t for t in all_tasks if t["prompt_style"] != "human-voice"]
    need_hv = max(1, n_per_model // 3)
    tasks = hv[:max(need_hv, 0)] + rest
    tasks = tasks[:n_per_model]
    rng.shuffle(tasks)
    temps = [0.7, 0.7, 1.0, 1.0, 1.0, 1.2]
    for i, t in enumerate(tasks):
        t["temperature"] = temps[i % len(temps)]
    return tasks


if __name__ == "__main__":
    import collections
    import json

    ts = build_tasks()
    print(json.dumps({
        "n_topics": len(TOPICS),
        "n_tasks": len(ts),
        "by_style": collections.Counter(t["prompt_style"] for t in ts),
        "by_register": collections.Counter(t["register"] for t in ts),
        "by_band": collections.Counter(t["length_band"] for t in ts),
        "by_temp": collections.Counter(t["temperature"] for t in ts),
    }, indent=2, default=str))
