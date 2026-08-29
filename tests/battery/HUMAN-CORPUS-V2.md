# Verified-Human Corpus v2 (`human-corpus-v2.json`)

**4,144 human-written passages, 250–1,500 words each, every one dated before 1 December 2022.** Additive to `human-corpus-v1.json` (40 samples, frozen, untouched): no id, source URL or text hash is shared with v1. Total 2,746,617 words.

v1 rested the entire false-positive claim on 40 samples, 10 of them business-marketing. Every genre-level FP rate carried an error bar of roughly ±30 points. This corpus replaces that with 1,233 business-marketing samples and 4,144 in total, and the numbers it produces are materially worse than v1 implied.

**Collection date:** 2026-08-28. **Language:** English throughout.

## Two provenance routes

Every sample carries `provenance_route`, so the two can be compared or separated.

| route | n | how the date is established |
|---|---|---|
| `verified-snapshot` | 451 | Individually verified: a Wayback Machine snapshot captured before 2022-11-01 (the `archive_url` is the exact `…/<timestamp>id_/<url>` snapshot the text was extracted from), or an on-page publication date corroborated by that snapshot, or an immutable versioned edition. The snapshot timestamp is the evidence: the wording existed on the web on that date. |
| `bulk-pre2022-dataset` | 3,693 | Drawn from corpora published before ChatGPT existed. The dataset's own release date is the provenance: text inside a 2019 release cannot be ChatGPT output. |

## Sources and licence position

| source | n | released | licence | notes |
|---|---|---|---|---|
| `allenai/c4`, English config, shards `c4-train.00000`–`00005-of-01024` | 3,433 | 2019 | ODC-BY 1.0 (dataset); underlying page text remains © its authors | Common Crawl April-2019 snapshot. Each record carries `url` + crawl `timestamp`. 425,213 records scanned across the first three shards plus a top-up pass over three more for the two thinnest genres. |
| PubMed Central Open Access subset | 260 | articles 2020–2022 | per-article Creative Commons licence, checked on each article page and recorded in `source_dataset` | Publication dates taken from the NCBI esummary record, not from the query year; 20 records whose real publication date was 2023 or later were dropped after that check. |
| Individually verified web pages (Wayback) | 366 | 2010–2022 | © original authors; quoted for research evaluation | 105 distinct sites, capped at 5 samples per site. |
| Open-licensed online books (Wayback snapshots of the published editions) | 85 | 2014–2021 | CC BY / CC BY-NC / CC BY-NC-SA / CC BY-SA / CC BY-NC-ND per title, recorded per sample | Saylor Academy and University of Minnesota open business, marketing and management textbooks; The Turing Way; Python Data Science Handbook; Eloquent JavaScript 3rd ed.; Automate the Boring Stuff; Green Tea Press; Hitchhiker's Guide to Python; Runestone. Capped at 14 sections per title. |

**Dropped on licence grounds:** the `cc_news` corpus (HF `vblagoje/cc_news`) was the obvious journalism source and was rejected — its dataset card states the licence as `unknown`, and the brief is to drop doubtful sources rather than include them. Journalism is therefore covered by C4 news-register pages plus 48 individually verified newspaper articles.

**Not used, deliberately:** Project Gutenberg and other pre-1929 literary text (archaic prose would flatter the false-positive rate without testing anything); the Blog Authorship Corpus (2004, outside the 2010–2022 window); Yelp and Amazon review corpora (restrictive terms, and reviews are mostly under 250 words); Wikipedia (encyclopaedic register is already over-represented in evaluation sets and rarely produces false positives).

**Licence position for the corpus as a whole:** this is a **research-evaluation quotation set**. Short verbatim excerpts held privately for detector calibration and false-positive measurement. It makes **no redistribution claims**: it must not be shipped in product artefacts, published, or used as model-training data beyond threshold calibration and hard-negative selection. CC-licensed items keep their own licences; everything else remains © its authors, quoted for research evaluation only.

## Modernity

The corpus is deliberately modern: every sample is dated to a year between 2010 and 2022, with a heavy concentration in 2019 because C4's Common Crawl timestamps all fall in April 2019. That timestamp is the *crawl* date, so it is an upper bound on publication rather than the publication date itself — an honest limitation recorded in each C4 sample's `notes`.

This matters technically. Short paragraphs, subheadings, bullet lists, direct address and conversational asides are now ordinary human web-writing habits, and several of them overlap with what the rules currently treat as AI signals. A corpus skewed towards older prose would leave those rules untested.

## The `difficulty` tag

Every sample carries `difficulty`. `plausibly-confusable` means the passage shows the structural habits that make human writing look machine-made: mostly short paragraphs, heading-like lines, high second-person density, bullet runs, listicle or how-to framing (two or more of those). `clearly-distinctive` is everything else. 1,939 samples are `plausibly-confusable`.

The hard-subset numbers below are the honest ones. A false-positive rate computed over the whole corpus is diluted by writing nobody would ever mistake for AI.

## Verification run (2026-08-28)

Script: `verify_v2.py` (held in the working scratchpad — this task's writable repo files are the corpus JSON and this manifest only). It asserts, and all assertions passed:

- count ≥ 3,000 — **4,144**
- ids unique — 4,144 distinct; no id collision with v1
- full v2 schema present on every row
- no text-hash collision inside v2 (4,144 distinct normalised hashes) and none with v1
- no `source_url` collision inside v2 and none with v1
- word counts within 250–1,500 — min 250, max 1,500, median 518, mean 663
- all dates ISO-formatted and < 2022-12-01 — latest 2022-10-31
- every sample dated to a year in 2010–2022
- `difficulty`, `provenance_route` and `source_dataset` present on every sample
- business-marketing ≥ 800 — **1,233**
- verified-snapshot route: ≤ 5 samples per web site, ≤ 14 sections per open book — 105 sites

**Archive-URL spot check.** A random sample of 120 of the 451 `verified-snapshot` archive URLs was re-fetched: **96 returned HTTP 200**. The other 24 returned connection errors, not 404s, and web.archive.org was visibly rate-limiting throughout — this is a throttled probe, not evidence of dead snapshots. It has not been re-run to completion. Treat 96/120 as a floor, not a measurement.

## Scoring

Rules layer: `computeEditorialSignals` and `inspectSignalsV2` from `packages/core/dist` (`en-signals:2026.08.6`). "Rules FP" counts samples whose published classification is not `human_like` — every one of them landed on `mixed_signals`; none reached `ai_like`.

Tier 3: `services/local-engine/research/models/tier3-e5small-int8-perchannel.onnx`, tokenizer from `tier3/checkpoint`, max_len 512, softmax over two logits, CPU int8 — the scoring path adapted from `provider-eval/score_tier3.py` (which was read, not edited).

Rules score distribution: min 0, p25 1, median 1, p75 3, p90 4, p99 6, max 11, mean 1.77.
Tier 3 distribution: min 0.1421, p10 0.1464, p25 0.1562, median 0.7321, p75 0.8529, p90 0.8556, p99 0.8570, max 0.8578.

Overall: **139 of 4,144 (3.4%) trip the rules layer. 973 (23.5%) score at or above the Tier 3 threshold 0.8533, 1,631 (39.4%) above 0.8397, and 2,180 (52.6%) above 0.6256.** At the shipped 0.857 threshold, 37 samples still score at or above it.

**Every sample, by genre**

| slice | n | rules FP | ≥0.8533 | ≥0.8397 | ≥0.6256 | median Tier 3 |
|---|---|---|---|---|---|---|
| business-marketing | 1233 | 38 (3.1%) | 526 (42.7%) | 774 (62.8%) | 926 (75.1%) | 0.8517 |
| blog-editorial | 638 | 11 (1.7%) | 102 (16.0%) | 202 (31.7%) | 295 (46.2%) | 0.4182 |
| journalism | 513 | 2 (0.4%) | 25 (4.9%) | 83 (16.2%) | 169 (32.9%) | 0.1939 |
| technical | 671 | 11 (1.6%) | 133 (19.8%) | 250 (37.3%) | 338 (50.4%) | 0.6418 |
| casual-forum | 298 | 3 (1.0%) | 24 (8.1%) | 42 (14.1%) | 62 (20.8%) | 0.1495 |
| non-native | 292 | 14 (4.8%) | 67 (22.9%) | 107 (36.6%) | 150 (51.4%) | 0.7076 |
| academic | 499 | 60 (12.0%) | 96 (19.2%) | 173 (34.7%) | 240 (48.1%) | 0.4722 |
| **all** | 4144 | 139 (3.4%) | 973 (23.5%) | 1631 (39.4%) | 2180 (52.6%) | 0.7321 |

**By difficulty tag**

| slice | n | rules FP | ≥0.8533 | ≥0.8397 | ≥0.6256 | median Tier 3 |
|---|---|---|---|---|---|---|
| plausibly-confusable | 1939 | 50 (2.6%) | 667 (34.4%) | 1019 (52.6%) | 1277 (65.9%) | 0.8447 |
| clearly-distinctive | 2205 | 89 (4.0%) | 306 (13.9%) | 612 (27.8%) | 903 (41.0%) | 0.2237 |

**By provenance route**

| slice | n | rules FP | ≥0.8533 | ≥0.8397 | ≥0.6256 | median Tier 3 |
|---|---|---|---|---|---|---|
| verified-snapshot | 451 | 28 (6.2%) | 103 (22.8%) | 162 (35.9%) | 224 (49.7%) | 0.6032 |
| bulk-pre2022-dataset | 3693 | 111 (3.0%) | 870 (23.6%) | 1469 (39.8%) | 1956 (53.0%) | 0.7373 |

**Hard subset only (plausibly-confusable), by genre — the honest headline**

| slice | n | rules FP | ≥0.8533 | ≥0.8397 | ≥0.6256 | median Tier 3 |
|---|---|---|---|---|---|---|
| business-marketing | 847 | 29 (3.4%) | 403 (47.6%) | 569 (67.2%) | 676 (79.8%) | 0.8530 |
| blog-editorial | 228 | 6 (2.6%) | 50 (21.9%) | 91 (39.9%) | 130 (57.0%) | 0.8011 |
| journalism | 77 | 0 (0.0%) | 12 (15.6%) | 23 (29.9%) | 37 (48.1%) | 0.5576 |
| technical | 406 | 5 (1.2%) | 109 (26.8%) | 189 (46.6%) | 249 (61.3%) | 0.8271 |
| casual-forum | 158 | 0 (0.0%) | 14 (8.9%) | 25 (15.8%) | 34 (21.5%) | 0.1514 |
| non-native | 153 | 7 (4.6%) | 46 (30.1%) | 76 (49.7%) | 99 (64.7%) | 0.8395 |
| academic | 70 | 3 (4.3%) | 33 (47.1%) | 46 (65.7%) | 52 (74.3%) | 0.8528 |
| **hard subset, all** | 1939 | 50 (2.6%) | 667 (34.4%) | 1019 (52.6%) | 1277 (65.9%) | 0.8447 |

**Corpus composition**

| genre | n | plausibly-confusable | clearly-distinctive | median words |
|---|---|---|---|---|
| business-marketing | 1233 | 847 | 386 | 513 |
| blog-editorial | 638 | 228 | 410 | 496 |
| journalism | 513 | 77 | 436 | 472 |
| technical | 671 | 406 | 265 | 486 |
| casual-forum | 298 | 158 | 140 | 500 |
| non-native | 292 | 153 | 139 | 470 |
| academic | 499 | 70 | 429 | 1382 |
| **total** | **4144** | **1939** | **2205** | **518** |

**Publication year (`era`)**

| year | n |
|---|---|
| 2010 | 10 |
| 2011 | 16 |
| 2012 | 20 |
| 2013 | 9 |
| 2014 | 49 |
| 2015 | 35 |
| 2016 | 26 |
| 2017 | 39 |
| 2018 | 62 |
| 2019 | 3468 |
| 2020 | 148 |
| 2021 | 157 |
| 2022 | 105 |

**Top 40 Tier-3 scores on verified human text — cycle-2 hard negatives**

| id | genre | difficulty | Tier 3 | rules | rules verdict | year | source |
|---|---|---|---|---|---|---|---|
| `hc2-blog-0253` | blog-editorial | plausibly-confusable | 0.8578 | 0 | human_like | 2019 | https://bloodredpencil.blogspot.com/2019/03/dialogue-tags-and-action-t |
| `hc2-tech-0276` | technical | plausibly-confusable | 0.8578 | 2 | human_like | 2019 | https://docs.microsoft.com/en-us/MicrosoftTeams/upgrade-define-project |
| `hc2-biz-0649` | business-marketing | plausibly-confusable | 0.8578 | 1 | human_like | 2019 | https://truebotanicals.com/products/nourishing-shampoo-fresh |
| `hc2-cas-0119` | casual-forum | plausibly-confusable | 0.8577 | 2 | human_like | 2019 | https://dgrin.com/discussion/264893/results-dgrin-mini-challenge-281-r |
| `hc2-acad-0024` | academic | clearly-distinctive | 0.8576 | 1 | human_like | 2019 | http://publications.aston.ac.uk/37798/ |
| `hc2-nn-0129` | non-native | plausibly-confusable | 0.8576 | 3 | human_like | 2019 | https://earthtravels.eu/hi-visi/flame-retardant-fabric-for-clothing.ht |
| `hc2-biz-0982` | business-marketing | plausibly-confusable | 0.8575 | 2 | human_like | 2019 | https://www.richmelheim.com/the-blog/?category=Communication |
| `hc2-tech-0648` | technical | plausibly-confusable | 0.8575 | 3 | human_like | 2021 | https://laravel.com/docs/5.1/routing?fbclid=IwAR3AtLACEAYNy43usFklrMVx |
| `hc2-biz-0983` | business-marketing | plausibly-confusable | 0.8575 | 3 | mixed_signals | 2019 | https://www.robinfogarty.com/twentyFirst.html |
| `hc2-cas-0016` | casual-forum | plausibly-confusable | 0.8574 | 0 | human_like | 2019 | http://explorersunlimited.com/eu/viewtopic.php?f=387&p=1350267&sid=4b6 |
| `hc2-acad-0116` | academic | plausibly-confusable | 0.8574 | 1 | human_like | 2019 | https://www.apmillerlawgroup.com/pittsfield/ |
| `hc2-biz-0443` | business-marketing | plausibly-confusable | 0.8574 | 1 | human_like | 2019 | https://de.crimethinc.com/podcast/hotwire-8 |
| `hc2-blog-0036` | blog-editorial | clearly-distinctive | 0.8574 | 2 | human_like | 2019 | http://designmeets.ca/2012/04/recap-decades-of-design/ |
| `hc2-acad-0410` | academic | clearly-distinctive | 0.8574 | 2 | human_like | 2022 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9991766/ |
| `hc2-blog-0245` | blog-editorial | clearly-distinctive | 0.8573 | 2 | human_like | 2019 | https://blog.joemanna.com/tsa-evolution-of-security-blog-review/ |
| `hc2-nn-0203` | non-native | plausibly-confusable | 0.8573 | 8 | mixed_signals | 2019 | https://www.emirateshomenursing.ae/expert/year-in-review/ |
| `hc2-acad-0211` | academic | clearly-distinctive | 0.8573 | 3 | human_like | 2021 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12966153/ |
| `hc2-acad-0278` | academic | clearly-distinctive | 0.8573 | 2 | human_like | 2020 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC13070663/ |
| `hc2-biz-0130` | business-marketing | clearly-distinctive | 0.8573 | 0 | human_like | 2019 | http://printinggraphicarts.name/4-axis-engraver-usb-cnc6040z-router-en |
| `hc2-tech-0649` | technical | plausibly-confusable | 0.8573 | 4 | human_like | 2017 | https://laravel.com/docs/5.3/application-testing |
| `hc2-tech-0222` | technical | clearly-distinctive | 0.8573 | 1 | human_like | 2019 | https://developer.moxtra.com/docs/docs-bot-sdk/ |
| `hc2-acad-0365` | academic | clearly-distinctive | 0.8572 | 2 | human_like | 2022 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8660938/ |
| `hc2-blog-0080` | blog-editorial | clearly-distinctive | 0.8572 | 3 | human_like | 2019 | http://qosmo.net/2018/04/24/associated-with-motion-for-corporations/ |
| `hc2-biz-0460` | business-marketing | plausibly-confusable | 0.8572 | 2 | human_like | 2019 | https://dui.findlaw.com/dui-laws-resources/iowa-dui-owi-laws.html |
| `hc2-biz-1137` | business-marketing | plausibly-confusable | 0.8572 | 5 | human_like | 2021 | https://baremetrics.com/blog/customer-analytics-tools-to-take-your-bus |
| `hc2-biz-1189` | business-marketing | plausibly-confusable | 0.8572 | 3 | human_like | 2018 | https://www.brafton.com/blog/advanced-writing-techniques/eroding-the-e |
| `hc2-acad-0344` | academic | clearly-distinctive | 0.8572 | 2 | human_like | 2020 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7526573/ |
| `hc2-blog-0286` | blog-editorial | plausibly-confusable | 0.8571 | 1 | human_like | 2019 | https://fellowworkersfarm.com/2012/12/26/in-praise-of-the-fever-dream/ |
| `hc2-tech-0158` | technical | plausibly-confusable | 0.8571 | 1 | human_like | 2019 | http://www.wikitude.com/external/doc/documentation/latest/xamarin/targ |
| `hc2-acad-0409` | academic | clearly-distinctive | 0.8571 | 1 | human_like | 2022 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9991763/ |
| `hc2-blog-0611` | blog-editorial | clearly-distinctive | 0.8571 | 1 | human_like | 2014 | http://www.nngroup.com/articles/accordions-complex-content/?utm_source |
| `hc2-acad-0411` | academic | clearly-distinctive | 0.8571 | 1 | human_like | 2022 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9991773/ |
| `hc2-biz-1163` | business-marketing | plausibly-confusable | 0.8571 | 2 | human_like | 2020 | https://stripe.com/blog/dashboard-updates-oct-2020 |
| `hc2-nn-0133` | non-native | clearly-distinctive | 0.8571 | 6 | mixed_signals | 2019 | https://flatfy.my/condo-for-rent-subang-jaya |
| `hc2-biz-0730` | business-marketing | plausibly-confusable | 0.8571 | 1 | human_like | 2019 | https://www.challenger.com/Careers/Drivers |
| `hc2-biz-1125` | business-marketing | plausibly-confusable | 0.8570 | 5 | human_like | 2014 | http://www.orbitmedia.com:80/blog/7-reasons-to-wireframe/ |
| `hc2-tech-0244` | technical | plausibly-confusable | 0.8570 | 1 | human_like | 2019 | https://docs.aspnetzero.com/documents/aspnet-core-mvc/latest/Overview- |
| `hc2-acad-0382` | academic | clearly-distinctive | 0.8570 | 1 | human_like | 2022 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8883781/ |
| `hc2-blog-0509` | blog-editorial | clearly-distinctive | 0.8570 | 3 | human_like | 2019 | https://www.joomlart.com/blog/joomla-extensions/ja-joomla-gdpr-extensi |
| `hc2-acad-0133` | academic | plausibly-confusable | 0.8570 | 2 | human_like | 2019 | https://www.fordham.edu/info/23746/social_innovation_collaboratory/992 |

**All 139 rules-layer false positives — top 25 by score**

| id | genre | difficulty | rules score | escalation | Tier 3 | categories that fired | source |
|---|---|---|---|---|---|---|---|
| `hc2-blog-0091` | blog-editorial | clearly-distinctive | 11 | finding_breadth | 0.8547 | adjacent-lemma-repeat, focal-density, hashtag-stuff, neg-parallelism, tier1, tier1-clarity | http://studiopax.io/2018/08/27/artists-in-the-world-of-insta |
| `hc2-biz-1010` | business-marketing | plausibly-confusable | 9 | finding_breadth | 0.8554 | adjacent-lemma-repeat, focal-density, proximity-cluster, tier1, tier1-clarity | https://www.somewhatcreative.net/inspiration/logos/finding-i |
| `hc2-biz-1095` | business-marketing | plausibly-confusable | 9 | finding_breadth | 0.3183 | adjacent-lemma-repeat, formulaic-opener, smart-punct-signature, tier1, tier1-clarity, transition | https://www.zesty.io/mindshare/marketing-technology/what-is- |
| `hc2-biz-1195` | business-marketing | clearly-distinctive | 9 | finding_breadth | 0.8551 | adjacent-lemma-repeat, cross-para-burstiness, tier1, transition | https://www.campaignmonitor.com/blog/customers/rip-curl-uses |
| `hc2-tech-0446` | technical | clearly-distinctive | 9 | finding_breadth | 0.8550 | low-ttr, quote-inconsistency, real-actual-inflation, smart-punct-signature, tier1, tier1-clarity, transition | https://www.aha.io/roadmapping/guide/enterprise-transformati |
| `hc2-nn-0283` | non-native | plausibly-confusable | 9 | finding_breadth | 0.8431 | adjacent-lemma-repeat, hollow-intensifier, low-ttr, neg-parallelism, owner-phrase-b, setup-expansion-cadence, tier1, tier1-clarity, transition | https://ruder.io/nlp-beyond-english/ |
| `hc2-biz-1212` | business-marketing | plausibly-confusable | 8 | finding_breadth | 0.8391 | adjacent-lemma-repeat, confidence-calibration, filler, lets-construction, tier1, tier1-clarity, transition | https://www.helpscout.com/blog/5-things-your-customers-can-d |
| `hc2-nn-0203` | non-native | plausibly-confusable | 8 | finding_breadth | 0.8573 | adjacent-lemma-repeat, power-verb-compound, sentence-flatline, tier1, transition | https://www.emirateshomenursing.ae/expert/year-in-review/ |
| `hc2-acad-0111` | academic | clearly-distinctive | 8 | finding_breadth | 0.8430 | adjacent-lemma-repeat, em-dash-density, real-actual-inflation, smart-punct-signature, tier1, tier1-clarity, vague-attribution | https://viewpoint.pointloma.edu/the-mystery-and-power-of-the |
| `hc2-acad-0149` | academic | clearly-distinctive | 8 | finding_breadth | 0.8545 | adjacent-lemma-repeat, low-ttr, tier1, tier1-clarity, tier2, transition, vague-attribution | https://www.kent.edu/ir-dp-lab/current-research-projects |
| `hc2-acad-0246` | academic | clearly-distinctive | 8 | finding_breadth | 0.8291 | adjacent-lemma-repeat, filler, tier1, tier1-clarity, tier2, transition, valuable-insights | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC13038090/ |
| `hc2-acad-0441` | academic | clearly-distinctive | 8 | finding_breadth | 0.8493 | adjacent-lemma-repeat, tier1, tier1-clarity, tricolon-density | http://open.lib.umn.edu:80/affordablecontent/chapter/afforda |
| `hc2-biz-0219` | business-marketing | plausibly-confusable | 7 | finding_breadth | 0.2567 | adjacent-lemma-repeat, tier1, tier1-clarity, transition, tricolon-density | http://www.chenbro.com/en-global/Page/Happy_Chenbro_People |
| `hc2-biz-0691` | business-marketing | plausibly-confusable | 7 | finding_breadth | 0.8551 | cross-para-burstiness, filler, hollow-intensifier, tier1, tier1-clarity, transition | https://www.appzbizz.com/getresponse-bounces/ |
| `hc2-biz-1114` | business-marketing | plausibly-confusable | 7 | artefact_floor | 0.8536 | adjacent-lemma-repeat, ai-placeholder, tier1, transition | http://www.hallaminternet.com/2012/get-a-clearer-picture-of- |
| `hc2-biz-1155` | business-marketing | plausibly-confusable | 7 | finding_breadth | 0.5566 | confidence-calibration, em-dash-density, parenthetical-hedge, tier1, tier1-clarity | https://moz.com/blog/10-illustrations-on-search-engines-valu |
| `hc2-biz-1175` | business-marketing | plausibly-confusable | 7 | finding_breadth | 0.8551 | didactic-note, low-ttr, owner-vocab-b, real-actual-inflation, smart-punct-signature, tier1, valuable-insights | https://www.animalz.co/blog/mental-models-for-content-market |
| `hc2-biz-1228` | business-marketing | plausibly-confusable | 7 | finding_breadth | 0.8560 | adjacent-lemma-repeat, owner-phrase, tier1, tier1-clarity, title-case-header | https://www.semrush.com/blog/15-ways-to-use-facebooks-new-ev |
| `hc2-blog-0212` | blog-editorial | clearly-distinctive | 7 | finding_breadth | 0.1587 | em-dash-density, filler, hedge-stack, hollow-intensifier, quote-inconsistency, tier1 | http://www.toddseavey.com/2011/08/take-me-to-riot-crown-heig |
| `hc2-blog-0262` | blog-editorial | plausibly-confusable | 7 | finding_breadth | 0.3505 | adjacent-lemma-repeat, focal-density, low-ttr, neg-parallelism, proximity-cluster, rhetorical-question, tier1 | https://concurrency.com/blog/june-2017/first-look-at-communi |
| `hc2-nn-0015` | non-native | clearly-distinctive | 7 | finding_breadth | 0.1429 | em-dash-density, setup-expansion-cadence, staccato-fragments, tier1, tier1-clarity | http://demartin.polito.it/blog/156 |
| `hc2-nn-0035` | non-native | clearly-distinctive | 7 | finding_breadth | 0.8489 | em-dash-density, owner-phrase, punct-distribution, sentence-flatline, smart-punct-signature, vague-attribution | http://huntdnut.unblog.fr/2014/09/23/landhaus-san-sebastian- |
| `hc2-acad-0208` | academic | clearly-distinctive | 7 | finding_breadth | 0.1514 | adjacent-lemma-repeat, confidence-calibration, low-ttr, staccato-fragments, tier1, transition | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12966140/ |
| `hc2-biz-0461` | business-marketing | plausibly-confusable | 6 | finding_breadth | 0.8498 | low-ttr, smart-punct-signature, staccato-fragments, tier1, tier1-clarity, transition | https://dzone.com/articles/kotlin-vs-scala-vs-java?fromrel=t |
| `hc2-biz-0570` | business-marketing | plausibly-confusable | 6 | finding_breadth | 0.8498 | filler, low-ttr, neg-parallelism, tier1-clarity, transition | https://newdecortrends.com/chandeliers-2020-the-latest-trend |

**Rule categories firing inside those false positives**

| category | times fired in an FP |
|---|---|
| transition | 93 |
| tier1-clarity | 89 |
| tier1 | 89 |
| low-ttr | 88 |
| adjacent-lemma-repeat | 59 |
| filler | 33 |
| smart-punct-signature | 28 |
| confidence-calibration | 27 |
| hollow-intensifier | 23 |
| setup-expansion-cadence | 21 |
| staccato-fragments | 20 |
| em-dash-density | 19 |
| neg-parallelism | 12 |
| tier2 | 11 |
| cross-para-burstiness | 10 |
| quote-inconsistency | 10 |
| vague-attribution | 10 |
| passive-ratio | 7 |

## What to do with this

1. **The `finding_breadth` escalation is falsified as written.** Its own reason string tells the user that "human evaluation controls peaked at 2" categories. In this corpus human writing reaches 5, 6, and in one case 11 categories, and that escalation alone accounts for 135 of the 139 rules-layer false positives. Either the escalation threshold moves, or that sentence has to stop claiming what it claims.
2. **No accuracy claim about business-marketing copy should ship on the current Tier 3 thresholds.** 42.7% of human business-marketing samples score at or above 0.8533; 47.6% of the hard subset does. Half of genuine agency and marketing copy is on the wrong side of that line.
3. **Use the high-scoring samples as hard negatives.** The 40 listed above, and more usefully all 973 samples at or above 0.8533, are exactly what cycle-2 training needs. They are human, dated, and the model is confident they are not.
4. **Report rates on the hard subset as well as overall.** The overall Tier 3 rate at 0.8533 is 23.5%; on the plausibly-confusable subset it is 34.4%. The second number is the one a customer will experience, because customers send us structured, modern, promotional writing.

## Residual doubt — where this corpus is weakest

Listed roughly worst-first. Nothing here is hidden in a footnote; these are the samples I would attack if I were reviewing this work.

**1. C4's date is a crawl date, not a publication date (3,433 samples, 83% of the corpus).** Every C4 record is stamped April 2019, which proves the page existed then and therefore cannot be ChatGPT output. It does not tell us when the page was written. A page crawled in 2019 could have been published in 2005. The corpus is *provably pre-AI*; it is only *presumptively modern*.

**2. Pre-2022 does not mean pre-machine-generation.** GPT-2 (2019), GPT-3 (2020) and the first marketing-copy generators (Jasper, Copy.ai, 2021) all predate the cutoff. Machine-written marketing copy from 2019–2022 is a live possibility, and business-marketing — the genre the owner cares most about — is exactly where such tools were used first. C4's own construction filtered spam, not generated text. I applied additional filters for spun and templated prose (6-gram near-duplicate rejection across the pool, a common-bigram fluency floor, repeated-4-gram rejection, an essay-mill and adult/gambling/pharma domain blocklist) and re-ran the extraction three times after finding junk each time. Some spun or partly-generated marketing text almost certainly survives. **If any single figure in this document is optimistic in the wrong direction, it is the business-marketing rules-FP rate, for this reason.**

**3. Author identity is unknown for the bulk route (3,693 samples).** `author_type` is `unattributed-web-author` for C4 samples. We know the text is human-era; we do not know who wrote it, whether it was ghostwritten, or whether it was translated. The `verified-snapshot` route (451 samples) is the one with named authors and checkable bylines.

**4. The non-native slice is a heuristic, not an identification.** 260 of the 292 non-native samples were selected because the URL sits on a non-anglophone ccTLD and the text is English. That catches genuine second-language writing (Italian university pages, Turkish and Emirati company sites) but it also catches English-native expatriate writers, agency-translated copy and machine translation. The 32 verified non-native samples are properly identified — named authors writing in a second language, plus translated-author blogs. **This is the fairness guard, and it is the weakest-evidenced part of the corpus.** Treat the non-native FP rate as indicative, not measured.

**5. Genre labels are machine-assigned for the bulk route.** URL and text heuristics decide genre. Spot checks found real misfires before tightening (a software product page classed as journalism because "Express" contains "press"; a university FAQ page classed as academic). The current rules are stricter, but a few hundred samples are probably in the wrong genre bucket. Genre-level rates carry that noise.

**6. Extraction is mechanical, and boilerplate can survive it.** Passages are contiguous runs of paragraphs from the archived page with markup, navigation, code blocks and furniture removed. Adjacent sidebar or promo text sometimes sat inside the article container and was stitched into the passage; a cohesion trim (dropping leading and trailing paragraphs that share under 10% of their content vocabulary with the rest) removes the clear cases. Passages also start at a sentence start and end at a sentence end, which was added after discovering that trailing headings were firing the `token-cutoff` rule — an artefact of my extraction, not of the source text. Earlier versions of the corpus would have overstated that rule's false-positive rate.

**7. The academic slice is bimodal and the PMC half is unrepresentative of what people actually check.** 260 of 499 academic samples are PubMed Central research articles: biomedical, statistics-dense, and stylistically nothing like a student essay or a marketing white paper. Median academic sample length is 1,382 words against roughly 500 for every other genre, so academic results are not comparable like-for-like. Only 70 academic samples are tagged `plausibly-confusable`. Student essay and dissertation corpora, which the brief asked for, were not obtained — no licence-clear, year-dated source was found in the time available. **This is the clearest gap against the brief.**

**8. Books coverage is thin and skewed technical.** 85 sections from 9 open-licensed titles. The business and management side (Saylor, University of Minnesota) contributes 25 sections; the rest are programming and data-science books. OpenStax, DOAB and OAPEN were attempted and largely failed to extract — OpenStax serves its text through JavaScript, and DOAB/OAPEN publish PDFs with no PDF extractor available in this environment. Modern open-access non-fiction is under-represented relative to the brief.

**9. PMC records with recent PMCIDs.** Several PMC samples carry identifiers issued in 2025–2026 while their publication date is 2020–2021 — later deposits of older articles. I checked four of them directly against the `citation_date` metadata on the article page (2020-09-04, 2021-08-13, 2021-08-11, 2021-10-06) and the dates hold, but I did not check all 260 individually.

**10. The `difficulty` tag is my heuristic, not a human judgement.** It counts structural features (paragraph length, heading-like lines, second-person density, bullets, listicle and how-to framing). It has not been validated against human raters. The hard-subset numbers inherit whatever bias that heuristic has.

**11. Two samples surfaced as false positives for reasons that are genuine, not artefacts, and are worth reading directly.** `hc2-biz-1114` (Hallam Internet, 2012) fires `ai-placeholder` on the string "[Enter your IP address]" — a real instruction in a real tutorial. A Redis documentation page fires `reasoning-leak` on the phrase "the user requested". Both are honest human text caught by rules that assume those strings only appear in machine output.

**12. Not checked at all:** whether any sample duplicates content held in the quarantined REAL-WORLD-EVAL-2026-08 evaluation set beyond the v1 overlap checks; whether C4 pages were themselves scraped copies of other sites (C4 deduplicates at line level, not document level); and whether any verified-snapshot page was edited between publication and the snapshot I captured.

## Appendix — the 451 individually verified samples, by site

Per-sample evidence lives in the JSON itself: every row carries `archive_url` (the exact snapshot), `date`, `era`, `verification` and `notes`. This table is the site-level summary.

| site | n | genre(s) | years | verification |
|---|---|---|---|---|
| jakevdp.github.io | 14 | technical 14 | 2017 | wayback-snapshot |
| saylordotorg.github.io | 14 | academic 14 | 2020 | wayback-snapshot |
| eloquentjavascript.net | 13 | technical 13 | 2018 | wayback-snapshot |
| open.lib.umn.edu | 11 | academic 11 | 2018 | wayback-snapshot |
| docs.python-guide.org | 10 | technical 10 | 2014-2020 | wayback-snapshot |
| automatetheboringstuff.com | 8 | technical 8 | 2015-2021 | wayback-snapshot |
| the-turing-way.netlify.app | 7 | academic 7 | 2020-2021 | wayback-snapshot |
| greenteapress.com | 6 | technical 6 | 2020 | wayback-snapshot |
| aeon.co | 5 | academic 5 | 2016-2021 | publication-date+wayback-snapshot, wayback-snapshot |
| ahrefs.com | 5 | business-marketing 5 | 2015-2020 | publication-date+wayback-snapshot |
| animalz.co | 5 | business-marketing 5 | 2018-2021 | publication-date+wayback-snapshot |
| atlassian.com | 5 | business-marketing 5 | 2012 | publication-date+wayback-snapshot |
| baremetrics.com | 5 | business-marketing 5 | 2021-2022 | publication-date+wayback-snapshot |
| bbc.co.uk | 5 | journalism 5 | 2010 | publication-date+wayback-snapshot |
| bicycles.stackexchange.com | 5 | casual-forum 5 | 2015-2021 | wayback-snapshot |
| bigcommerce.com | 5 | business-marketing 5 | 2013-2015 | publication-date+wayback-snapshot |
| blog.golang.org | 5 | technical 5 | 2014-2015 | wayback-snapshot |
| brafton.com | 5 | business-marketing 5 | 2013-2019 | publication-date+wayback-snapshot |
| builtvisible.com | 5 | business-marketing 5 | 2012-2021 | publication-date+wayback-snapshot |
| campaignmonitor.com | 5 | business-marketing 5 | 2021-2022 | publication-date+wayback-snapshot, wayback-snapshot |
| cooking.stackexchange.com | 5 | casual-forum 5 | 2019-2021 | wayback-snapshot |
| crazyegg.com | 5 | business-marketing 5 | 2015-2018 | publication-date+wayback-snapshot |
| digitalocean.com | 5 | technical 5 | 2014-2022 | publication-date+wayback-snapshot, wayback-snapshot |
| distilled.net | 5 | business-marketing 5 | 2018-2019 | wayback-snapshot |
| fabiensanglard.net | 5 | non-native 5 | 2014-2022 | wayback-snapshot |
| gardening.stackexchange.com | 5 | casual-forum 5 | 2014-2021 | wayback-snapshot |
| git-scm.com | 5 | technical 5 | 2014-2021 | wayback-snapshot |
| groovehq.com | 5 | business-marketing 5 | 2015-2017 | wayback-snapshot |
| hallaminternet.com | 5 | business-marketing 5 | 2011-2013 | publication-date+wayback-snapshot |
| helpscout.com | 5 | business-marketing 5 | 2011-2022 | publication-date+wayback-snapshot |
| impression.co.uk | 5 | business-marketing 5 | 2018-2019 | publication-date+wayback-snapshot |
| jvns.ca | 5 | blog-editorial 5 | 2017-2019 | publication-date+wayback-snapshot |
| karpathy.github.io | 5 | non-native 5 | 2014-2016 | publication-date+wayback-snapshot |
| koozai.com | 5 | business-marketing 5 | 2014-2018 | publication-date+wayback-snapshot, wayback-snapshot |
| kubernetes.io | 5 | technical 5 | 2017-2022 | wayback-snapshot |
| mailchimp.com | 5 | business-marketing 5 | 2019-2022 | wayback-snapshot |
| martinfowler.com | 5 | blog-editorial 5 | 2015-2021 | wayback-snapshot |
| money.stackexchange.com | 5 | casual-forum 5 | 2015-2021 | wayback-snapshot |
| moz.com | 5 | business-marketing 5 | 2010-2013 | publication-date+wayback-snapshot |
| mrmoneymustache.com | 5 | blog-editorial 5 | 2011 | publication-date+wayback-snapshot |
| nature.com | 5 | academic 5 | 2018-2022 | publication-date+wayback-snapshot, wayback-snapshot |
| neilpatel.com | 5 | business-marketing 5 | 2015-2017 | publication-date+wayback-snapshot, wayback-snapshot |
| news.ycombinator.com | 5 | casual-forum 5 | 2022 | api-timestamp |
| nngroup.com | 5 | blog-editorial 5 | 2014 | wayback-snapshot |
| optinmonster.com | 5 | business-marketing 5 | 2015-2022 | publication-date+wayback-snapshot |
| orbitmedia.com | 5 | business-marketing 5 | 2014 | wayback-snapshot |
| parenting.stackexchange.com | 5 | casual-forum 5 | 2015-2020 | wayback-snapshot |
| plato.stanford.edu | 5 | academic 5 | 2018-2021 | versioned-archive-edition |
| ruder.io | 5 | non-native 5 | 2017-2021 | publication-date+wayback-snapshot |
| screamingfrog.co.uk | 5 | business-marketing 5 | 2014-2022 | publication-date+wayback-snapshot, wayback-snapshot |
| semrush.com | 5 | business-marketing 5 | 2013-2017 | publication-date+wayback-snapshot |
| texasmonthly.com | 5 | journalism 5 | 2017-2020 | publication-date+wayback-snapshot |
| theconversation.com | 5 | academic 5 | 2018-2020 | publication-date+wayback-snapshot |
| theverge.com | 5 | journalism 5 | 2011 | publication-date+wayback-snapshot |
| w3.org | 5 | technical 5 | 2014-2016 | wayback-snapshot |
| wistia.com | 5 | business-marketing 5 | 2013-2021 | publication-date+wayback-snapshot |
| workplace.stackexchange.com | 5 | casual-forum 5 | 2017-2022 | wayback-snapshot |
| zenhabits.net | 5 | blog-editorial 5 | 2014 | wayback-snapshot |
| baeldung.com | 4 | non-native 4 | 2016-2021 | publication-date+wayback-snapshot |
| blog.google | 4 | business-marketing 4 | 2022 | publication-date+wayback-snapshot |
| elifesciences.org | 4 | academic 4 | 2012-2013 | publication-date+wayback-snapshot |
| independent.co.uk | 4 | journalism 4 | 2020-2021 | publication-date+wayback-snapshot |
| laravel.com | 4 | technical 4 | 2015-2021 | wayback-snapshot |
| propublica.org | 4 | journalism 4 | 2012-2014 | publication-date+wayback-snapshot |
| reactjs.org | 4 | technical 4 | 2017-2021 | wayback-snapshot |
| redis.io | 4 | technical 4 | 2022 | wayback-snapshot |
| reuters.com | 4 | journalism 4 | 2012-2021 | publication-date+wayback-snapshot |
| standard.co.uk | 4 | journalism 4 | 2010-2021 | publication-date+wayback-snapshot |
| stripe.com | 4 | business-marketing 4 | 2016-2020 | wayback-snapshot |
| zapier.com | 4 | business-marketing 4 | 2014-2022 | publication-date+wayback-snapshot, wayback-snapshot |
| zwischenzugs.com | 4 | non-native 4 | 2017-2018 | publication-date+wayback-snapshot |
| bothsidesofthetable.com | 3 | blog-editorial 3 | 2010-2016 | publication-date+wayback-snapshot |
| cbc.ca | 3 | journalism 3 | 2013-2017 | publication-date+wayback-snapshot, wayback-snapshot |
| developer.wordpress.org | 3 | technical 3 | 2019-2020 | wayback-snapshot |
| kottke.org | 3 | blog-editorial 3 | 2020 | wayback-snapshot |
| phys.org | 3 | journalism 3 | 2015-2016 | wayback-snapshot |
| sivers.org | 3 | blog-editorial 3 | 2016 | wayback-snapshot |
| smh.com.au | 3 | journalism 3 | 2018-2021 | publication-date+wayback-snapshot |
| tonsky.me | 3 | non-native 3 | 2019-2020 | publication-date+wayback-snapshot |
| unbounce.com | 3 | business-marketing 3 | 2014 | publication-date+wayback-snapshot, wayback-snapshot |
| wired.com | 3 | journalism 3 | 2017-2018 | publication-date+wayback-snapshot |
| apnews.com | 2 | journalism 2 | 2020-2021 | publication-date+wayback-snapshot |
| blog.dropbox.com | 2 | business-marketing 2 | 2011-2014 | publication-date+wayback-snapshot |
| blog.frankel.ch | 2 | non-native 2 | 2014-2015 | publication-date+wayback-snapshot, wayback-snapshot |
| fs.blog | 2 | blog-editorial 2 | 2011-2012 | publication-date+wayback-snapshot |
| irishtimes.com | 2 | journalism 2 | 2011-2015 | publication-date+wayback-snapshot, wayback-snapshot |
| levels.io | 2 | non-native 2 | 2014-2019 | publication-date+wayback-snapshot |
| matklad.github.io | 2 | non-native 2 | 2020-2022 | publication-date+wayback-snapshot |
| ncbi.nlm.nih.gov | 2 | academic 2 | 2020 | publication-date+pmcid |
| runestone.academy | 2 | technical 2 | 2022 | wayback-snapshot |
| stackoverflow.com | 2 | technical 2 | 2015-2018 | wayback-snapshot |
| travel.stackexchange.com | 2 | casual-forum 2 | 2015-2019 | wayback-snapshot |
| wiki.archlinux.org | 2 | technical 2 | 2021-2022 | wayback-snapshot |
| css-tricks.com | 1 | blog-editorial 1 | 2020 | publication-date+wayback-snapshot |
| developer.mozilla.org | 1 | technical 1 | 2013 | publication-date+wayback-snapshot |
| docs.python.org | 1 | technical 1 | 2014 | wayback-snapshot |
| drift.com | 1 | business-marketing 1 | 2021 | publication-date+wayback-snapshot |
| journals.plos.org | 1 | academic 1 | 2019 | publication-date+doi |
| kk.org | 1 | blog-editorial 1 | 2021 | wayback-snapshot |
| nginx.org | 1 | technical 1 | 2022 | wayback-snapshot |
| npr.org | 1 | journalism 1 | 2011 | publication-date+wayback-snapshot |
| postgresql.org | 1 | technical 1 | 2019 | wayback-snapshot |
| realpython.com | 1 | technical 1 | 2018 | publication-date+wayback-snapshot |
| scifi.stackexchange.com | 1 | casual-forum 1 | 2021 | wayback-snapshot |
| sqlite.org | 1 | technical 1 | 2014 | wayback-snapshot |
