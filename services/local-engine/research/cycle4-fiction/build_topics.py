"""Topic seeds for the cycle-4 register generation.

Every seed is derived from the HUMAN corpus's own metadata - the `discipline`
and `section_title` fields of the 260 long-form `story` documents and the
registers of the eight non-Opace short-form sources - so the AI side cannot be
separated from the human side on subject matter. Seeds describe a genre and a
situation; no human text is copied into a prompt.

Writes topics.json: [{register, topic, group}].
"""
from __future__ import annotations

import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))

# Genre labels lifted from the `discipline` field of the human story documents.
FICTION_GENRES = [
    "literary short story", "science fiction short story", "fantasy short story",
    "young adult fiction", "vampire and urban horror fiction", "crime thriller",
    "espionage thriller", "romance fiction", "fan fiction",
    "dystopian political satire", "folklore retelling", "historical fiction",
    "rural family novel excerpt", "autobiographical memoir",
    "sailing and travel memoir", "prison memoir", "coming-of-age fiction",
    "ghost story", "magical realism", "detective fiction",
    "war fiction", "psychological suspense", "comic fiction",
    "flash fiction", "epistolary fiction", "adventure fiction",
    "regional short story in translation", "speculative metafiction",
    "children's story", "gothic fiction",
]

FICTION_SITUATIONS = [
    "a woman returns to the coastal town where she grew up and finds the house sold",
    "two brothers argue over an inheritance during a long car journey",
    "a lighthouse keeper notices a light that should not be there",
    "a translator begins to suspect the manuscript she is working on is a forgery",
    "an old soldier is recognised in a supermarket by someone he wronged",
    "a courier delivers a parcel to an address that does not exist",
    "a teenager hides a stray dog from her mother for three weeks",
    "a retired detective is sent a photograph of his own front door",
    "a colony ship's gardener discovers the seed vault has been emptied",
    "a village agrees to stop speaking for one day each year",
    "a nurse works the night shift during a power cut",
    "a musician loses the use of her left hand and takes up teaching",
    "a fisherman finds a wedding ring inside a fish",
    "two strangers share a train compartment and one of them is lying",
    "a widower keeps writing letters to his wife's old address",
    "a girl inherits a beehive and the bees will not settle",
    "a bookshop owner finds annotations in her own handwriting in a book she has never read",
    "an archivist uncovers a file that names her father",
    "a boy who cannot swim is chosen to carry the offering to the river",
    "a chef returns to the restaurant that sacked him, as a customer",
    "a caretaker in an empty school hears a piano at night",
    "a couple house-sit for a neighbour and open a locked room",
    "a driver stops for a hitchhiker on a road that has been closed for years",
    "a woman is mistaken for her twin at a funeral",
    "an interpreter deliberately mistranslates one sentence",
    "a mountain guide leaves a client behind in fog",
    "a mother teaches her daughter to lie convincingly",
    "an actor is cast as a man he used to know",
    "a beekeeper and a developer meet over a boundary hedge",
    "a coastguard listens to a distress call that repeats every night",
    "a market trader is given a coin that is not currency",
    "a student takes a summer job clearing a dead man's flat",
    "two sisters return a borrowed boat after forty years",
    "a farmer refuses to sell the last field on the ridge",
    "a night porter befriends a guest who never leaves",
    "a photographer develops a roll of film from a stranger's camera",
    "a monk is asked to burn the library's duplicate copies",
    "a signalman on a rural line changes one lever out of habit",
    "a woman's shadow arrives home before she does",
    "a family drives to the border with everything they own",
]

NON_FICTION = {
    "gov-guidance": (
        "UK government guidance and public-service explanatory prose",
        [
            "how to apply for a licence to keep dangerous wild animals",
            "changes to statutory sick pay for employers",
            "guidance for landlords on electrical safety inspections",
            "reporting a lost or stolen passport from abroad",
            "eligibility for the winter fuel payment",
            "rules for transporting livestock across borders",
            "how councils decide on planning enforcement action",
            "what to do when a business becomes insolvent",
            "registering a death and arranging a funeral",
            "flood warnings and what each level means",
            "guidance on the safe disposal of clinical waste",
            "appealing a school admission decision",
            "rules on drone flights near airports",
            "how the coroner service works",
            "support available for carers of disabled adults",
        ],
    ),
    "medical-research": (
        "open-access biomedical research prose",
        [
            "outcomes of early mobilisation after hip replacement",
            "antimicrobial resistance in urinary tract infections in primary care",
            "the association between sleep duration and glycaemic control",
            "screening uptake for colorectal cancer in deprived areas",
            "adverse events in paediatric anaesthesia",
            "vitamin D supplementation and respiratory infection",
            "telemedicine follow-up after cardiac surgery",
            "gut microbiome composition and irritable bowel syndrome",
            "risk factors for post-partum haemorrhage",
            "cognitive decline and hearing aid use in older adults",
            "occupational exposure and adult-onset asthma",
            "biomarkers for early detection of sepsis",
            "physiotherapy protocols after anterior cruciate ligament repair",
            "the effect of air quality on childhood wheeze",
            "adherence to statin therapy after myocardial infarction",
        ],
    ),
    "environmental-journalism": (
        "environmental and conservation journalism",
        [
            "illegal gold mining in a protected Amazon reserve",
            "mangrove restoration and the fishers who depend on it",
            "a pangolin trafficking route through West Africa",
            "peatland drainage and carbon loss in northern Europe",
            "the return of beavers to a British river catchment",
            "palm oil concessions bordering an orangutan corridor",
            "coral bleaching monitoring by local dive operators",
            "wind farm siting and migratory bird routes",
            "community forestry rights in the Congo Basin",
            "plastic waste imports and informal recycling labour",
            "a dam proposal on a Mekong tributary",
            "drought and pastoralist migration in the Horn of Africa",
            "rewilding on a Scottish sporting estate",
            "sea turtle nesting beaches and coastal development",
            "seed banks and the loss of traditional crop varieties",
        ],
    ),
    "corporate-filing": (
        "corporate annual-report management discussion and analysis",
        [
            "management discussion of segment revenue and margin pressure",
            "liquidity and capital resources for the fiscal year",
            "the effect of foreign currency movements on reported results",
            "restructuring charges and workforce reduction costs",
            "critical accounting estimates for goodwill impairment",
            "supply chain disruption and inventory provisions",
            "results of operations for the retail segment",
            "contractual obligations and off-balance-sheet arrangements",
            "the impact of interest rate changes on borrowing costs",
            "customer concentration and credit risk",
            "research and development expenditure and capitalisation policy",
            "the outcome of a material legal proceeding",
            "acquisitions completed during the period and purchase accounting",
            "cash flows from operating, investing and financing activities",
            "regulatory developments affecting the insurance segment",
        ],
    ),
    "policy-report": (
        "legislative research service policy analysis",
        [
            "federal funding mechanisms for rural broadband",
            "the statutory basis for emergency drought declarations",
            "congressional oversight of arms transfers",
            "policy options for critical mineral supply chains",
            "the structure of the national flood insurance programme",
            "background on semiconductor manufacturing incentives",
            "trade remedies and anti-dumping procedure",
            "veterans' healthcare eligibility and appropriations",
            "the legal framework for offshore wind leasing",
            "immigration court backlogs and possible responses",
            "the appropriations process for disaster relief",
            "regulation of per- and polyfluoroalkyl substances",
            "spectrum allocation policy and public safety networks",
            "student loan repayment plans and their fiscal cost",
            "cybersecurity requirements for federal contractors",
        ],
    ),
    "world-journalism": (
        "citizen and international journalism",
        [
            "a local election dispute in a small Balkan municipality",
            "language activism among a minority community in Central Asia",
            "street vendors organising against a new city by-law",
            "an internet shutdown during regional protests",
            "a community radio station facing licence renewal",
            "migrant workers' remittances and a currency devaluation",
            "a heritage building slated for demolition",
            "young farmers returning to a depopulated region",
            "a court ruling on indigenous land title",
            "independent bookshops under a new import tariff",
            "a disability rights campaign over transport access",
            "the reopening of a cross-border railway",
            "a strike by hospital cleaners",
            "a festival revived after two decades",
            "flooding in an informal settlement and the response to it",
        ],
    ),
    "student-essay": (
        "school and undergraduate argumentative essay prose",
        [
            "whether schools should require community service",
            "the case for and against banning phones in classrooms",
            "does homework improve learning outcomes",
            "should driving licences require retesting in later life",
            "the value of studying a foreign language",
            "whether zoos can be justified today",
            "should voting be compulsory",
            "the effect of social media on friendship",
            "whether university should be free",
            "should school days start later",
            "the argument for a four-day week",
            "whether advertising to children should be restricted",
            "does competitive sport belong in schools",
            "should public transport be free at the point of use",
            "the case for teaching personal finance",
        ],
    ),
}


def main() -> None:
    rng = random.Random(20260830)
    out = []
    # Fiction: genre x situation, one group per pairing so a scenario cannot
    # straddle train and test.
    pairs = [(g, s) for g in FICTION_GENRES for s in FICTION_SITUATIONS]
    rng.shuffle(pairs)
    for i, (g, s) in enumerate(pairs[:400]):
        out.append({
            "register": "fiction",
            "genre_label": g,
            "topic": f"{g}. Scenario: {s}",
            "group": f"fic-{i:04d}-" + g.replace(" ", "-"),
        })
    for reg, (desc, topics) in NON_FICTION.items():
        for j, t in enumerate(topics):
            out.append({
                "register": reg,
                "genre_label": desc,
                "topic": t,
                "group": f"{reg}-{j:02d}",
            })
    json.dump(out, open(os.path.join(HERE, "topics.json"), "w"), indent=1)
    import collections
    print(collections.Counter(r["register"] for r in out), len(out))


if __name__ == "__main__":
    main()
