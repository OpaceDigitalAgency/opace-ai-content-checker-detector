"""Prompt bank for the 2026-generated article corpus.

60 topics spread over 8 registers (the shapes users actually paste into the
plugin) and 8 domains. Each topic is rendered in 3 prompt styles so we can ask
whether "write like a human" instructions defeat detection.

Nothing here touches the engine; this file only builds request payloads.
"""

from __future__ import annotations

# (topic_id, register, domain, subject, extra brief detail)
TOPICS: list[tuple[str, str, str, str, str]] = [
    # --- seo-service-page (8) ---
    ("t01", "seo-service-page", "local-services", "emergency boiler repair in Birmingham", "24/7 callout, Gas Safe engineers, fixed-price diagnostics"),
    ("t02", "seo-service-page", "business", "outsourced bookkeeping for UK limited companies", "Xero and QuickBooks, monthly management accounts, VAT returns"),
    ("t03", "seo-service-page", "technology", "managed cybersecurity for mid-sized manufacturers", "24/7 SOC, endpoint detection, Cyber Essentials Plus"),
    ("t04", "seo-service-page", "health", "private physiotherapy for sports injuries", "sports massage, shockwave therapy, return-to-play plans"),
    ("t05", "seo-service-page", "finance", "commercial mortgage brokerage for property investors", "bridging finance, portfolio landlords, whole-of-market access"),
    ("t06", "seo-service-page", "education", "online GCSE maths tutoring", "one-to-one sessions, exam board specific, progress reporting"),
    ("t07", "seo-service-page", "local-services", "domestic and commercial window cleaning in Leeds", "reach-and-wash poles, gutter clearing, scheduled rounds"),
    ("t08", "seo-service-page", "ecommerce", "Shopify store migration and replatforming", "SEO-safe redirects, theme rebuild, app consolidation"),

    # --- company-blog (8) ---
    ("t09", "company-blog", "business", "why quarterly planning beats annual budgeting for small firms", "practical rollout, common objections"),
    ("t10", "company-blog", "technology", "what we learned migrating a monolith to event-driven services", "team of nine, eighteen months, the parts that hurt"),
    ("t11", "company-blog", "health", "how workplace ergonomics assessments cut absence rates", "desk audits, sit-stand desks, measured outcomes"),
    ("t12", "company-blog", "finance", "five signals your cash flow forecast is wrong", "seasonality, debtor days, VAT timing"),
    ("t13", "company-blog", "travel", "shoulder-season travel and why hotels quietly prefer it", "pricing, staffing, guest experience"),
    ("t14", "company-blog", "education", "the case for shorter, more frequent staff training", "spaced repetition, scheduling, measuring retention"),
    ("t15", "company-blog", "local-services", "how a two-van plumbing firm doubled its callout rate", "scheduling software, review generation, pricing"),
    ("t16", "company-blog", "ecommerce", "returns are a product problem, not a logistics problem", "sizing data, imagery, description accuracy"),

    # --- product-description (8) ---
    ("t17", "product-description", "ecommerce", "a merino wool base layer for winter hiking", "185gsm, flatlock seams, four colourways, sizes XS-XXL"),
    ("t18", "product-description", "technology", "a 27-inch 4K colour-accurate monitor for designers", "99% DCI-P3, hardware calibration, USB-C 96W"),
    ("t19", "product-description", "health", "a magnesium glycinate supplement", "375mg elemental, 120 capsules, vegan, third-party tested"),
    ("t20", "product-description", "business", "a hot-desk booking platform for hybrid offices", "floor plans, Outlook sync, occupancy analytics"),
    ("t21", "product-description", "travel", "a 40-litre carry-on travel backpack", "cabin-legal dimensions, clamshell opening, laptop sleeve"),
    ("t22", "product-description", "finance", "a business expense card with automated receipt capture", "virtual cards, spend limits, Xero integration"),
    ("t23", "product-description", "education", "a phonics reading scheme for reception classes", "44 decodable books, teacher guides, assessment sheets"),
    ("t24", "product-description", "local-services", "a smart thermostat installation package", "supply and fit, two-year warranty, zoning options"),

    # --- howto-explainer (8) ---
    ("t25", "howto-explainer", "technology", "how to set up conditional access policies in Microsoft Entra ID", "pilot groups, break-glass accounts, report-only mode"),
    ("t26", "howto-explainer", "finance", "how to register for VAT in the UK and choose a scheme", "thresholds, flat rate vs standard, Making Tax Digital"),
    ("t27", "howto-explainer", "health", "how to build a return-to-running plan after a calf strain", "load progression, pain rules, cross-training"),
    ("t28", "howto-explainer", "business", "how to run a supplier tender without wasting everyone's time", "scoring matrix, shortlisting, reference checks"),
    ("t29", "howto-explainer", "travel", "how to plan a two-week rail trip across central Europe", "passes, seat reservations, luggage, border quirks"),
    ("t30", "howto-explainer", "education", "how to structure a dissertation literature review", "search strategy, synthesis, common examiner complaints"),
    ("t31", "howto-explainer", "local-services", "how to bleed a radiator and rebalance a heating system", "tools, order of rooms, pressure top-up"),
    ("t32", "howto-explainer", "ecommerce", "how to set up server-side tracking for a Shopify store", "consent mode, GA4, deduplication"),

    # --- news-piece (7) ---
    ("t33", "news-piece", "technology", "a regional data centre planning application being approved", "capacity, water use, local objections, jobs figures"),
    ("t34", "news-piece", "finance", "a high-street bank closing 40 branches", "affected towns, union response, banking hub replacements"),
    ("t35", "news-piece", "health", "a new NHS waiting-list initiative for orthopaedic surgery", "targets, funding, clinician reaction"),
    ("t36", "news-piece", "business", "a manufacturing group acquiring a smaller competitor", "deal value, sites, competition review"),
    ("t37", "news-piece", "travel", "a new direct rail service between two mid-sized cities", "journey times, fares, operator, first-day scenes"),
    ("t38", "news-piece", "education", "a university introducing a four-day teaching week", "rationale, student union response, timetable impact"),
    ("t39", "news-piece", "local-services", "a council rolling out food waste collections", "caddy distribution, cost, phased streets"),

    # --- thought-leadership (7) ---
    ("t40", "thought-leadership", "technology", "why most AI pilots never reach production", "data readiness, ownership, procurement"),
    ("t41", "thought-leadership", "business", "the quiet cost of permanent reorganisation", "institutional memory, middle managers, morale"),
    ("t42", "thought-leadership", "finance", "why forecasting accuracy is overrated and range-planning is not", "scenario bands, decision triggers"),
    ("t43", "thought-leadership", "health", "preventative care is a procurement problem, not a clinical one", "budget cycles, incentives, measurement"),
    ("t44", "thought-leadership", "education", "assessment has not caught up with how students now work", "coursework, orals, portfolio assessment"),
    ("t45", "thought-leadership", "ecommerce", "marketplaces are becoming ad networks and brands should plan for it", "take rates, retail media, margin"),
    ("t46", "thought-leadership", "travel", "overtourism is a scheduling failure before it is a numbers failure", "cruise berths, peak spreading, pricing"),

    # --- faq-page (7) ---
    ("t47", "faq-page", "local-services", "an electrician's EICR inspection service", "duration, cost, landlord obligations, remedial work"),
    ("t48", "faq-page", "finance", "opening a business bank account as a non-resident director", "documents, timescales, refusals"),
    ("t49", "faq-page", "health", "a private GP membership service", "appointment access, referrals, what is not covered"),
    ("t50", "faq-page", "ecommerce", "delivery, returns and warranty for an online furniture retailer", "lead times, two-person delivery, damage claims"),
    ("t51", "faq-page", "education", "an independent school's admissions process", "entry points, assessments, bursaries, deadlines"),
    ("t52", "faq-page", "technology", "a SaaS product's data residency and security posture", "ISO 27001, sub-processors, backups, DPAs"),
    ("t53", "faq-page", "travel", "a small-group walking holiday operator", "fitness levels, luggage transfer, solo travellers, cancellations"),

    # --- case-study (7) ---
    ("t54", "case-study", "business", "a logistics firm cutting fuel spend by 18% in a year", "telematics, driver coaching, route redesign"),
    ("t55", "case-study", "technology", "a housing association replacing a 20-year-old repairs system", "phased rollout, data migration, adoption"),
    ("t56", "case-study", "ecommerce", "a homeware brand rebuilding its product feed and paid search", "feed hygiene, negative keywords, ROAS numbers"),
    ("t57", "case-study", "health", "a dental group reducing missed appointments", "reminder cadence, deposits, staff scripts"),
    ("t58", "case-study", "finance", "an accountancy practice moving 400 clients onto cloud bookkeeping"),
    ("t59", "case-study", "education", "a multi-academy trust standardising its maths curriculum", "training, resourcing, results over three years"),
    ("t60", "case-study", "local-services", "a landscaping company winning its first commercial contracts", "tendering, insurance, crew scaling"),
]

# normalise the one 4-field entry
TOPICS = [t if len(t) == 5 else (*t, "") for t in TOPICS]

REGISTER_NOUN = {
    "seo-service-page": "an SEO-optimised service page for a company website",
    "company-blog": "a company blog post",
    "product-description": "a long-form ecommerce product description page",
    "howto-explainer": "a how-to / technical explainer article",
    "news-piece": "a news article in the style of a regional trade publication",
    "thought-leadership": "an opinion / thought-leadership article",
    "faq-page": "an FAQ page for a company website",
    "case-study": "a customer case study for a company website",
}

COMMON_TAIL = (
    "Target 600 to 1,000 words. Return only the finished page or article body, "
    "starting with its title. Do not add preamble, sign-off, notes to me, or any "
    "commentary about the task."
)

STYLES = ("plain", "house-brief", "human-voice")


def render(topic: tuple[str, str, str, str, str], style: str) -> str:
    _tid, register, _domain, subject, detail = topic
    noun = REGISTER_NOUN[register]
    detail_clause = f" Cover: {detail}." if detail else ""

    if style == "plain":
        return f"Write {noun} about {subject}.{detail_clause} {COMMON_TAIL}"

    if style == "house-brief":
        return (
            f"Write {noun} about {subject}.{detail_clause}\n\n"
            "House style brief:\n"
            "- Audience: UK readers who are comparing options and are already "
            "reasonably informed. Do not over-explain basics.\n"
            "- Voice: confident, specific, commercially aware. First person plural "
            "where a company voice fits.\n"
            "- British English spelling and punctuation throughout.\n"
            "- Use concrete figures, timescales and named steps rather than "
            "general claims. Invent plausible specifics where needed.\n"
            "- Structure: a title, a short opening that states the point, then "
            "clearly signposted sections. Subheadings are fine.\n"
            "- Do not open with a rhetorical question.\n\n"
            + COMMON_TAIL
        )

    if style == "human-voice":
        return (
            f"Write {noun} about {subject}.{detail_clause}\n\n"
            "Important: this needs to read as though a human specialist wrote it, "
            "not an AI. Please:\n"
            "- Avoid AI-tell vocabulary and constructions: delve, tapestry, "
            "landscape, realm, leverage, robust, seamless, elevate, unlock, "
            "harness, empower, streamline, game-changer, testament to, "
            "'it's not just X, it's Y', 'in today's fast-paced world'.\n"
            "- Do not open a sentence with Moreover, Furthermore, Additionally or "
            "In conclusion.\n"
            "- Vary sentence length hard. Some very short. Some long and winding.\n"
            "- Use em dashes sparingly, if at all.\n"
            "- Avoid neat lists of three and avoid a closing paragraph that "
            "restates what you just said.\n"
            "- Let the writing be slightly uneven. Specific, opinionated, willing "
            "to leave a loose end.\n"
            "- British English throughout.\n\n"
            + COMMON_TAIL
        )

    raise ValueError(style)


def build_tasks(n_per_model: int = 150, seed: int = 20260828) -> list[dict]:
    """Deterministic task list, identical for every model."""
    import random

    all_tasks = []
    for topic in TOPICS:
        for style in STYLES:
            all_tasks.append(
                {
                    "prompt_id": f"{topic[0]}-{style}",
                    "topic_id": topic[0],
                    "register": topic[1],
                    "domain": topic[2],
                    "prompt_style": style,
                    "prompt": render(topic, style),
                }
            )
    rng = random.Random(seed)
    rng.shuffle(all_tasks)
    tasks = all_tasks[:n_per_model]
    # temperature cycle: mostly default-ish, a slice hotter
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
        "by_domain": collections.Counter(t["domain"] for t in ts),
        "by_temp": collections.Counter(t["temperature"] for t in ts),
    }, indent=2, default=str))
