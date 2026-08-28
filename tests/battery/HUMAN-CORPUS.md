# Verified-Human Corpus v1 (`human-corpus-v1.json`)

40 verbatim human-written passages (250–1200 words each) with pre-December-2022 provenance, assembled as the calibration control set required by `research/CLEAN-PROSE-DETECTION-PLAN.md` §3.1 (Tier 1 gate: "re-run signals against 30–50 genre-matched human controls"). The prior eval had only 4 human controls; this corpus is the fix.

**Collection date:** 2026-08-28 (Workstream HC). All texts fetched from live sources, platform APIs, immutable archives, or content-addressed git commits on that date.

## Genre spread (matches the workstream brief)

| Genre | n |
|---|---|
| business-marketing (UK/US agency copy, product pages, company blogs) | 10 |
| blog-editorial (professional blogs) | 8 |
| technical (docs, books, Stack Overflow-era answers) | 6 |
| journalism | 6 |
| casual-forum / personal | 4 |
| non-native English writers (false-positive guard) | 4 |
| academic | 2 |

Non-native coverage is wider than the 4 labelled samples: `hc-biz-005` (DHH, Danish) and `hc-cas-004` (Torvalds, Finnish) are also non-native authors filed under their genre.

## Provenance rules used

1. **No post-November-2022 text.** Every sample's date is verifiably < 2022-12-01. Mutable pages were only used where the platform provides hard dating or immutability:
   - Stack Overflow answers were taken from **pre-2022 revisions via the Stack Exchange revisions API** (current bodies carry post-2022 edits and were rejected).
   - Book/handbook texts (Rust book, Pro Git, Basecamp handbook) are pinned at **pre-2022 git commit SHAs** (content-addressed, immutable).
   - Hacker News comments carry API `created_at` timestamps and are uneditable after 2 hours.
   - Eloquent JavaScript was taken from the frozen `/3rd_edition/` (2018) path because the live site is now the 2024 4th edition.
   - Signal v. Noise is a frozen archive (blog closed 2021).
   - RFCs and arXiv/PLOS papers are immutable once published.
2. **Rejected during collection** (post-2022 contamination risk): Help Scout blog (page "Updated March 2025"), Copyblogger headline guide ("posted on March 8, 2024"), James Clear article pages (undated, known to be revised), current Stack Overflow answer bodies (last_edit_date 2023–2025), live eloquentjavascript.net (4th ed. 2024), Beej's Guide (revised 2023).
3. **Quarantine respected:** no overlap with the held-out REAL-WORLD-EVAL-2026-08 set. Its four human controls (Orwell 1946, SO bobince 2009, SO Mysticial 2012, Workplace SE non-native 2019) and all its AI samples are excluded; no source URL overlaps.
4. **Wayback caveat:** web.archive.org page-serving was rate-limited/unavailable during collection, so live-page text was not byte-diffed against snapshots. `archive_url` records the snapshot pointer (or API/commit URL) supporting each item's dating; the two NPR items were CDX-verified against specific pre-2022 snapshots. The weakest provenance in the corpus is flagged in-row (`hc-biz-003` Mailchimp style guide: undated page, approximate date; `hc-biz-010` First Round: date from contemporaneous citations).
5. **Verbatim, with mechanical cleanup only:** HTML/Markdown/AsciiDoc markup stripped, hard-wrapped lines re-joined into their original paragraphs, code blocks replaced by `[code]` placeholders, image captions/nav/footer furniture removed, one drop-cap letter restored (noted in-row). No wording altered.

## Licence position

This corpus is a **research-evaluation quotation set**: short verbatim excerpts (250–1200 words) from published sources, held privately for detector calibration and false-positive measurement (fair-dealing/fair-use research and quotation basis). It makes **no redistribution claims**: it must not be shipped in product artefacts, published, used as model-training data beyond threshold calibration, or re-licensed. Some items carry their own licences (PLOS: CC BY; Zen Habits: uncopyrighted by author; Rust book/Pro Git/Basecamp handbook: repo licences); everything else remains © its authors, quoted for research evaluation only.

## Samples

| id | genre | date | words | verification | source | notes |
|---|---|---|---|---|---|---|
| hc-biz-001 | business-marketing | 2019-09-10 | 674 | publication-date | [www.apple.com](https://www.apple.com/newsroom/2019/09/iphone-11-pro-and-iphone-11-pro-max-the-most-powerful-and-advanced-smartphones/) | Apple press release, dated on page; punchy product-launch copy with short sentences and superlatives. |
| hc-biz-002 | business-marketing | 2006-03-01 | 695 | publication-date | [basecamp.com](https://basecamp.com/gettingreal/01.1-what-is-getting-real) | Getting Real (37signals book, published March 2006); frozen book text served on basecamp.com. Deliberately punchy marketing register with rhetorical contrast. |
| hc-biz-003 | business-marketing | 2019-06-30 | 637 | publication-date | [styleguide.mailchimp.com](https://styleguide.mailchimp.com/voice-and-tone/) | Mailchimp Content Style Guide (launched 2015, stable since ~2019; no on-page date - date approximate, WEAKEST provenance in corpus, flagged). Marketing voice/tone copy. |
| hc-biz-004 | business-marketing | 2013-12-19 | 698 | publication-date | [buffer.com](https://buffer.com/resources/introducing-open-salaries-at-buffer-including-our-transparent-formula-and-all-individual-salaries/) | "Published Dec 19, 2013" on page; passage taken from original narrative body below the later editorial note (note excluded). |
| hc-biz-005 | business-marketing | 2017-07-27 | 851 | publication-date | [m.signalvnoise.com](https://m.signalvnoise.com/how-we-pay-people-at-basecamp/) | DHH (Danish, non-native English) on Signal v. Noise; blog frozen since 2021. Company-policy business copy; doubles as non-native FP guard. |
| hc-biz-006 | business-marketing | 2017-12-21 | 760 | publication-date | [m.signalvnoise.com](https://m.signalvnoise.com/the-presence-prison/) | Jason Fried, Signal v. Noise (frozen archive). Opinionated company-blog copy with short sentences. |
| hc-biz-007 | business-marketing | 2017-02-16 | 1165 | publication-date | [m.signalvnoise.com](https://m.signalvnoise.com/why-we-choose-profit/) | Jason Fried, Signal v. Noise (frozen archive). Listicle-style business copy with heavy rhetorical parallelism - a deliberate rules-honesty stressor. |
| hc-biz-008 | business-marketing | 2021-05-24 | 760 | publication-date | [github.com](https://github.com/basecamp/handbook/blob/ff3a2c729034783867a15cb6fac4e27b6e2e3695/how-we-work.md) | Basecamp employee handbook pinned at pre-2022 git commit ff3a2c7 (2021-05-24); immutable content-addressed text. |
| hc-biz-009 | business-marketing | 2013-07-03 | 683 | publication-date | [www.intercom.com](https://www.intercom.com/blog/product-strategy-means-saying-no/) | Des Traynor, Intercom blog; "Published Jul 3, 2013" on page. SaaS product-marketing editorial. |
| hc-biz-010 | business-marketing | 2018-11-15 | 695 | publication-date | [firstround.com](https://firstround.com/review/how-superhuman-built-an-engine-to-find-product-market-fit/) | Rahul Vohra in First Round Review; page undated - November 2018 date from contemporaneous public citations (HN discussion Nov 2018); flagged approximate day. |
| hc-blog-001 | blog-editorial | 2013-07-01 | 616 | publication-date | [www.paulgraham.com](https://www.paulgraham.com/ds.html) | Paul Graham, "Do Things that Don't Scale", dated July 2013 in essay header; essays are never edited post-publication. |
| hc-blog-002 | blog-editorial | 2000-04-06 | 459 | publication-date | [www.joelonsoftware.com](https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/) | Joel Spolsky; date in URL and page. |
| hc-blog-003 | blog-editorial | 2007-05-30 | 585 | publication-date | [blog.codinghorror.com](https://blog.codinghorror.com/the-best-code-is-no-code-at-all/) | Jeff Atwood, Coding Horror; datePublished 2007-05-30 in page schema. |
| hc-blog-004 | blog-editorial | 2015-12-11 | 787 | publication-date | [waitbutwhy.com](https://waitbutwhy.com/2015/12/the-tail-end.html) | Tim Urban, Wait But Why, "The Tail End"; dated on page December 11, 2015. |
| hc-blog-005 | blog-editorial | 2014-09-30 | 408 | publication-date | [slatestarcodex.com](https://slatestarcodex.com/2014/09/30/i-can-tolerate-anything-except-the-outgroup/) | Scott Alexander, Slate Star Codex; date in URL. |
| hc-blog-006 | blog-editorial | 2015-07-21 | 426 | publication-date | [stratechery.com](https://stratechery.com/2015/aggregation-theory/) | Ben Thompson, Stratechery, "Aggregation Theory" (July 2015; year in URL). |
| hc-blog-007 | blog-editorial | 2005-03-05 | 265 | publication-date | [seths.blog](https://seths.blog/2005/03/dont_shave_that/) | Seth Godin, "Don't shave that yak!"; March 2005 in URL. Very short paragraphs - stylistic outlier by design. |
| hc-blog-008 | blog-editorial | 2014-09-02 | 628 | publication-date | [zenhabits.net](https://zenhabits.net/zen-to-done-ztd-the-ultimate-simple-productivity-system/) | Leo Babauta, Zen Habits; page datePublished 2014-09-02 (post originally from 2007; uncopyrighted by author). Repetitive Problem/Solution structure - honest human uniformity stressor. |
| hc-tech-001 | technical | 2021-07-01 | 1159 | publication-date | [stackoverflow.com](https://stackoverflow.com/a/487278) | cletus's canonical "plain English Big-O" Stack Overflow answer (written 2009-01-28); text taken from revision 44 (2021-07-01) via the Stack Exchange revisions API, guaranteeing pre-2022 wording. |
| hc-tech-002 | technical | 2021-07-24 | 410 | publication-date | [stackoverflow.com](https://stackoverflow.com/a/6866485) | Ryan Lundy's "undo a commit" Stack Overflow answer (written 2011-07-28); text from revision 17 (2021-07-24) via the revisions API. Code blocks replaced with [code] placeholders. |
| hc-tech-003 | technical | 2018-12-04 | 478 | publication-date | [eloquentjavascript.net](https://eloquentjavascript.net/3rd_edition/03_functions.html) | Marijn Haverbeke, Eloquent JavaScript 3rd edition (2018), served from the frozen /3rd_edition/ path (live site is now the 2024 4th edition - deliberately avoided). |
| hc-tech-004 | technical | 2021-07-09 | 497 | publication-date | [github.com](https://github.com/rust-lang/book/blob/4921fde29ae8ccf67d5893d4e43d74284626fded/src/ch00-00-introduction.md) | The Rust Programming Language book intro pinned at pre-2022 commit 4921fde (2021-07-09); immutable content-addressed text. |
| hc-tech-005 | technical | 2020-09-16 | 957 | publication-date | [github.com](https://github.com/progit/progit2/blob/714da4b2ad20f12e94ec7d5715607445259ea2b0/book/01-introduction/sections/what-is-git.asc) | Pro Git 2nd ed. "What is Git?" section pinned at pre-2022 commit 714da4b (2020-09-16). AsciiDoc markup stripped; cross-references smoothed to "later chapters". |
| hc-tech-006 | technical | 2018-08-01 | 465 | publication-date | [www.rfc-editor.org](https://www.rfc-editor.org/rfc/rfc8446.txt) | RFC 8446 (TLS 1.3), IETF, August 2018; RFCs are immutable once published. Introduction section. |
| hc-jour-001 | journalism | 2017-11-24 | 334 | publication-date | [www.theguardian.com](https://www.theguardian.com/news/2017/nov/24/how-the-sandwich-consumed-britain) | Sam Knight, Guardian Long Read; date in URL. UK feature journalism. |
| hc-jour-002 | journalism | 2017-10-05 | 658 | publication-date | [www.theguardian.com](https://www.theguardian.com/technology/2017/oct/05/smartphone-addiction-silicon-valley-dystopia) | Paul Lewis, The Guardian; date in URL. Opening drop-cap restored ("Justin"). |
| hc-jour-003 | journalism | 2019-05-14 | 704 | publication-date | [www.bbc.com](https://www.bbc.com/future/article/20190513-it-only-takes-35-of-people-to-change-the-world) | David Robson, BBC Future; date in URL slug (20190513). |
| hc-jour-004 | journalism | 2018-08-22 | 702 | publication-date | [www.wired.com](https://www.wired.com/story/notpetya-cyberattack-ukraine-russia-code-crashed-the-world/) | Andy Greenberg, WIRED, "The Untold Story of NotPetya" (Aug 2018; excerpted from Sandworm). |
| hc-jour-005 | journalism | 2021-05-29 | 707 | wayback-snapshot | [text.npr.org](https://text.npr.org/1001023637) | Scott Horsley, NPR (May 29, 2021, dated on page); Wayback snapshot 2021-11-22 confirms pre-2022 existence (CDX-verified). Transcript block excluded. |
| hc-jour-006 | journalism | 2021-06-05 | 719 | wayback-snapshot | [text.npr.org](https://text.npr.org/1002085012) | NPR Kabul dispatch (June 5, 2021, dated on page); Wayback snapshot 2021-06-06 confirms pre-2022 existence (CDX-verified). |
| hc-cas-001 | casual-forum | 2021-12-04 | 602 | publication-date | [news.ycombinator.com](https://news.ycombinator.com/item?id=29437977) | patio11 (Patrick McKenzie) Hacker News comment; created_at 2021-12-04T02:03:07Z from the HN Algolia API. HN comments are uneditable after 2 hours. |
| hc-cas-002 | casual-forum | 2021-12-30 | 663 | publication-date | [news.ycombinator.com](https://news.ycombinator.com/item?id=29740332) | tptacek (Thomas Ptacek) Hacker News comment; created_at 2021-12-30T19:21:06Z from the HN Algolia API. |
| hc-cas-003 | casual-forum | 2016-09-23 | 443 | publication-date | [ask.metafilter.com](https://ask.metafilter.com/300838/) | Ask MetaFilter question "Help me understand these bank wire instructions", dated on page September 23, 2016. Untidy genuine casual prose including a quoted wire-instruction block. |
| hc-cas-004 | casual-forum | 2007-09-06 | 431 | publication-date | [harmful.cat-v.org](http://harmful.cat-v.org/software/c++/linus) | Linus Torvalds (Finnish, non-native English) git mailing-list email, 2007-09-06, as archived on cat-v.org. Profane, hard-wrapped mailing-list register; extra non-native coverage. |
| hc-nn-001 | non-native | 2019-05-16 | 672 | publication-date | [antirez.com](http://antirez.com/news/129) | Salvatore Sanfilippo (Italian), "The struggles of an open source maintainer"; date computed from the page's "2660 days ago" stamp relative to 2026-08-28 collection date. |
| hc-nn-002 | non-native | 2016-04-27 | 1119 | publication-date | [neopythonic.blogspot.com](https://neopythonic.blogspot.com/2016/04/kings-day-speech.html) | Guido van Rossum (Dutch), King's Day speech, April 2016 (year/month in URL). |
| hc-nn-003 | non-native | 2014-02-17 | 401 | publication-date | [levels.io](https://levels.io/how-i-build-my-minimum-viable-products/) | Pieter Levels (Dutch); page datetime 2014-02-17. |
| hc-nn-004 | non-native | 2015-11-25 | 695 | publication-date | [m.signalvnoise.com](https://m.signalvnoise.com/the-day-i-became-a-millionaire/) | DHH (David Heinemeier Hansson, Danish), Signal v. Noise (frozen archive), dated on page November 25, 2015. |
| hc-acad-001 | academic | 2017-06-12 | 280 | publication-date | [arxiv.org](https://arxiv.org/abs/1706.03762) | Vaswani et al., "Attention Is All You Need", arXiv 1706.03762 (June 2017); introduction. Citation brackets retained as in source. |
| hc-acad-002 | academic | 2005-08-30 | 675 | publication-date | [journals.plos.org](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.0020124) | Ioannidis, "Why Most Published Research Findings Are False", PLOS Medicine 2005 (CC BY). Four consecutive body paragraphs; intervening figure/table furniture removed. |
## Verification run (2026-08-28)

`node` structural checks against `human-corpus-v1.json`: **PASS** — count = 40, ids unique, every passage 250–1200 words, every date < 2022-12-01, all schema fields present.

Engine run: every sample scored with `computeEditorialSignals` from `implementation/packages/core/dist/index.js`.

- **Verdicts: 40/40 `human_like`. Zero samples scored ≥ 20.** (Report-don't-filter policy: nothing needed reporting-out; the ceiling was 6.)
- Score distribution: min 0, p25 1, median 2, p75 3, p90 5, max 6, mean 1.85.
- Per-genre means: business-marketing 2.4 (max 6), academic 3.5 (max 5), technical 1.8, journalism 1.7, blog-editorial 1.6, non-native 1.5, casual-forum 0.8.
- Highest scorers are exactly the intended rules-honesty stressors: `hc-biz-002` Getting Real (6 — staccato-fragments, tier1, title-case-header), `hc-biz-007` Fried "Why we choose profit" (5 — not-just-contrast, hollow-intensifier, low-ttr), `hc-acad-002` Ioannidis (5 — em-dash-density, adjacent-lemma-repeat, normalization-flag), `hc-blog-006` Stratechery (5). These are the most valuable calibration rows: genuine human copy that legitimately trips short-sentence, rhetorical-contrast and uniformity signals.
- FP-sensitive categories that fired on humans (union): smart-punct-signature, staccato-fragments, tier1/tier1-clarity, not-just-contrast, hollow-intensifier, low-ttr, em-dash-density, adjacent-lemma-repeat, cross-para-burstiness, setup-expansion-cadence, punct-distribution, normalization-flag, transition, vague-attribution, quote-inconsistency, filler, parenthetical-hedge, buzzword-phrase, arrow-decoration, title-case-header. Any future threshold must hold FPR at zero across this list.

Regenerate the run with a script that loads this JSON, asserts the bounds above, and maps `computeEditorialSignals` over each `text` (see Workstream HC session notes).
