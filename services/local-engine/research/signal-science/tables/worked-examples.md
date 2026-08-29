# Worked examples: the scorecard's arithmetic, line by line

Three real documents from the fresh long-form corpus, none of which either model was trained on. The **prose-only** scorecard is used throughout, because that is the variant recommended for shipping. Its operating threshold on this split, at a 1% human false-positive budget, is **0.9816**.

Only openly licensed or owner-generated documents are quoted; the evaluation-licence human battery is never excerpted.

## clearly machine-written

- id `qwen-2026-longform-77640951da` — **truly ai**
- register: longform-journalism (journalism), 1,569 words
- source: openrouter-longform-2026-08-28; licence: owner-generated; unrestricted internal use
- **scorecard score 0.9997** (flagged at the 1% operating point)
- deployed neural score 0.9879 (flagged at the shipped 0.984)

Opening of the document:

> The video was fourteen seconds long. A man in a kitchen, ordinary kitchen, the kind with a faded calendar on the wall and a kettle that needed descaling. He was holding a cat. What he did to the cat is not something I can describe here, and it is not something that Elena — not her real name — can stop seeing when she c …

| signal | this document | training mean | SD | z | weight | contribution |
|---|---:|---:|---:|---:|---:|---:|
| sentence count | 101 | 25 | 20.96 | +3.53 | +0.823 | **+2.904** |
| em dashes per 1,000 words | 10.99 | 1.064 | 2.931 | +3.39 | +0.392 | **+1.326** |
| em dashes per 1,000 characters | 1.886 | 0.1655 | 0.4594 | +3.75 | +0.332 | **+1.244** |
| third person per 1,000 words | 66.58 | 23.22 | 19.7 | +2.20 | +0.379 | **+0.833** |
| 'a' per 1,000 words | 38.78 | 24.68 | 12.29 | +1.15 | +0.457 | **+0.524** |
| mean word length | 4.615 | 4.974 | 0.5798 | -0.62 | +0.769 | **-0.477** |
| 95th-percentile word surprisal | 16.43 | 17.88 | 1.629 | -0.89 | -0.472 | **+0.419** |
| word-unigram entropy | 8.207 | 6.955 | 0.6681 | +1.87 | +0.207 | **+0.387** |
| first-person singular per 1,000 words | 18.75 | 8.98 | 20.18 | +0.48 | +0.441 | **+0.214** |
| sentence-length standard deviation | 12.24 | 8.764 | 3.36 | +1.03 | -0.191 | **-0.197** |
| share of quotes/apostrophes that are curly | 0 | 0.2179 | 0.3995 | -0.55 | -0.333 | **+0.181** |
| distinct sentence openers / sentences | 0.4356 | 0.7409 | 0.1583 | -1.93 | -0.092 | **+0.177** |
| word-pair surprisal spread | 3.148 | 3.203 | 0.2462 | -0.22 | -0.703 | **+0.158** |
| vocabulary variety in a 100-word window (MATTR) | 0.7403 | 0.729 | 0.05823 | +0.19 | +0.772 | **+0.150** |
| discourse markers per 1,000 words | 0 | 2.066 | 3.341 | -0.62 | +0.163 | **-0.101** |
| 'AI vocabulary' words per 1,000 | 0 | 0.9454 | 2.39 | -0.40 | +0.224 | **-0.089** |
| exclamations | 0 | 0.01708 | 0.0553 | -0.31 | -0.240 | **+0.074** |
| pun_ampersand_per1kc | 0 | 0.04901 | 0.2041 | -0.24 | -0.246 | **+0.059** |
| 'to' per 1,000 words | 23.92 | 26.68 | 12.97 | -0.21 | -0.203 | **+0.043** |
| 'the' per 1,000 words | 52.36 | 51.46 | 22.84 | +0.04 | +0.825 | **+0.032** |
| share of vocabulary used exactly twice | 0.1348 | 0.1415 | 0.03513 | -0.19 | -0.159 | **+0.031** |
| content-word overlap between neighbouring sentences | 0.03508 | 0.03934 | 0.03009 | -0.14 | -0.210 | **+0.030** |
| second person per 1,000 words | 6.464 | 10.77 | 17.44 | -0.25 | -0.044 | **+0.011** |
| pun_serial_comma_rate | 6.464 | 6.253 | 6.109 | +0.03 | +0.294 | **+0.010** |
| _intercept_ | | | | | | **+0.172** |
| **total log-odds** | | | | | | **+8.116** |

score = 1 / (1 + exp(−8.116)) = **0.9997**

Machine-leaning evidence totals +8.808; human-leaning evidence totals -0.863. The three largest single contributions are sentence count (+2.904), em dashes per 1,000 words (+1.326), em dashes per 1,000 characters (+1.244).

## clearly human-written

- id `human-longform-088610407381` — **truly human**
- register: student-essay (academic), 616 words
- source: persuade-2.0; licence: CC BY 4.0 (PERSUADE 2.0, The Learning Agency Lab); HF mirror declares MIT
- **scorecard score 0.0002** (not flagged at the 1% operating point)
- deployed neural score 0.0139 (not flagged at the shipped 0.984)

Opening of the document:

> Do you think students would benfit from beign able to attend classes frommhome ? I beleive students should'not take online classes at home. online claases are not like regular claases you take. online classes have their own specfic time that you have to be on your computer and also how long you have stay on your comput …

| signal | this document | training mean | SD | z | weight | contribution |
|---|---:|---:|---:|---:|---:|---:|
| vocabulary variety in a 100-word window (MATTR) | 0.5913 | 0.729 | 0.05823 | -2.36 | +0.772 | **-1.826** |
| mean word length | 4.082 | 4.974 | 0.5798 | -1.54 | +0.769 | **-1.183** |
| 'the' per 1,000 words | 21.24 | 51.46 | 22.84 | -1.32 | +0.825 | **-1.092** |
| 95th-percentile word surprisal | 20.96 | 17.88 | 1.629 | +1.89 | -0.472 | **-0.891** |
| sentence-length standard deviation | 29.88 | 8.764 | 3.36 | +4.34 | -0.191 | **-0.829** |
| 'a' per 1,000 words | 11.44 | 24.68 | 12.29 | -1.08 | +0.457 | **-0.492** |
| 'to' per 1,000 words | 52.29 | 26.68 | 12.97 | +1.97 | -0.203 | **-0.400** |
| sentence count | 16 | 25 | 20.96 | -0.43 | +0.823 | **-0.353** |
| word-pair surprisal spread | 3.321 | 3.203 | 0.2462 | +0.48 | -0.703 | **-0.335** |
| content-word overlap between neighbouring sentences | 0.08523 | 0.03934 | 0.03009 | +1.53 | -0.210 | **-0.320** |
| share of vocabulary used exactly twice | 0.1989 | 0.1415 | 0.03513 | +1.63 | -0.159 | **-0.260** |
| pun_serial_comma_rate | 1.634 | 6.253 | 6.109 | -0.76 | +0.294 | **-0.222** |
| share of quotes/apostrophes that are curly | 0 | 0.2179 | 0.3995 | -0.55 | -0.333 | **+0.181** |
| distinct sentence openers / sentences | 0.4375 | 0.7409 | 0.1583 | -1.92 | -0.092 | **+0.176** |
| second person per 1,000 words | 98.04 | 10.77 | 17.44 | +3.91 | -0.044 | **-0.174** |
| em dashes per 1,000 words | 0 | 1.064 | 2.931 | -0.36 | +0.392 | **-0.142** |
| em dashes per 1,000 characters | 0 | 0.1655 | 0.4594 | -0.36 | +0.332 | **-0.120** |
| word-unigram entropy | 6.602 | 6.955 | 0.6681 | -0.53 | +0.207 | **-0.109** |
| discourse markers per 1,000 words | 0 | 2.066 | 3.341 | -0.62 | +0.163 | **-0.101** |
| third person per 1,000 words | 17.97 | 23.22 | 19.7 | -0.27 | +0.379 | **-0.101** |
| 'AI vocabulary' words per 1,000 | 0 | 0.9454 | 2.39 | -0.40 | +0.224 | **-0.089** |
| exclamations | 0 | 0.01708 | 0.0553 | -0.31 | -0.240 | **+0.074** |
| pun_ampersand_per1kc | 0 | 0.04901 | 0.2041 | -0.24 | -0.246 | **+0.059** |
| first-person singular per 1,000 words | 11.44 | 8.98 | 20.18 | +0.12 | +0.441 | **+0.054** |
| _intercept_ | | | | | | **+0.172** |
| **total log-odds** | | | | | | **-8.322** |

score = 1 / (1 + exp(−-8.322)) = **0.0002**

Machine-leaning evidence totals +0.544; human-leaning evidence totals -9.038. The three largest single contributions are vocabulary variety in a 100-word window (MATTR) (-1.826), mean word length (-1.183), 'the' per 1,000 words (-1.092).

## borderline

- id `meta-2026-longform-5f52308164` — **truly ai**
- register: story (creative), 1,120 words
- source: openrouter-longform-2026-08-28; licence: owner-generated; unrestricted internal use
- **scorecard score 0.9815** (not flagged at the 1% operating point)
- deployed neural score 0.9895 (flagged at the shipped 0.984)

Opening of the document:

> The sun had barely risen over the rooftops of Ashwood when Jack Harris stepped out into the chill morning air, the dew on the grass still heavy with the night's moisture. He breathed deeply, the smell of damp earth and cut grass filling his lungs, a scent that usually lifted his spirits. But today it did little to shak …

| signal | this document | training mean | SD | z | weight | contribution |
|---|---:|---:|---:|---:|---:|---:|
| 'the' per 1,000 words | 99.73 | 51.46 | 22.84 | +2.11 | +0.825 | **+1.744** |
| third person per 1,000 words | 81.92 | 23.22 | 19.7 | +2.98 | +0.379 | **+1.128** |
| sentence count | 52 | 25 | 20.96 | +1.29 | +0.823 | **+1.060** |
| 'a' per 1,000 words | 46.3 | 24.68 | 12.29 | +1.76 | +0.457 | **+0.803** |
| mean word length | 4.487 | 4.974 | 0.5798 | -0.84 | +0.769 | **-0.646** |
| 95th-percentile word surprisal | 18.96 | 17.88 | 1.629 | +0.66 | -0.472 | **-0.312** |
| word-pair surprisal spread | 3.29 | 3.203 | 0.2462 | +0.35 | -0.703 | **-0.247** |
| distinct sentence openers / sentences | 0.3654 | 0.7409 | 0.1583 | -2.31 | -0.092 | **+0.213** |
| first-person singular per 1,000 words | 0 | 8.98 | 20.18 | -0.45 | +0.441 | **-0.196** |
| vocabulary variety in a 100-word window (MATTR) | 0.7146 | 0.729 | 0.05823 | -0.25 | +0.772 | **-0.192** |
| content-word overlap between neighbouring sentences | 0.01192 | 0.03934 | 0.03009 | -0.91 | -0.210 | **+0.191** |
| share of quotes/apostrophes that are curly | 0 | 0.2179 | 0.3995 | -0.55 | -0.333 | **+0.181** |
| 'to' per 1,000 words | 15.14 | 26.68 | 12.97 | -0.89 | -0.203 | **+0.180** |
| word-unigram entropy | 7.532 | 6.955 | 0.6681 | +0.86 | +0.207 | **+0.178** |
| em dashes per 1,000 words | 0 | 1.064 | 2.931 | -0.36 | +0.392 | **-0.142** |
| pun_serial_comma_rate | 3.562 | 6.253 | 6.109 | -0.44 | +0.294 | **-0.129** |
| sentence-length standard deviation | 6.538 | 8.764 | 3.36 | -0.66 | -0.191 | **+0.126** |
| em dashes per 1,000 characters | 0 | 0.1655 | 0.4594 | -0.36 | +0.332 | **-0.120** |
| discourse markers per 1,000 words | 0 | 2.066 | 3.341 | -0.62 | +0.163 | **-0.101** |
| 'AI vocabulary' words per 1,000 | 0 | 0.9454 | 2.39 | -0.40 | +0.224 | **-0.089** |
| exclamations | 0 | 0.01708 | 0.0553 | -0.31 | -0.240 | **+0.074** |
| pun_ampersand_per1kc | 0 | 0.04901 | 0.2041 | -0.24 | -0.246 | **+0.059** |
| second person per 1,000 words | 0 | 10.77 | 17.44 | -0.62 | -0.044 | **+0.027** |
| share of vocabulary used exactly twice | 0.1396 | 0.1415 | 0.03513 | -0.06 | -0.159 | **+0.009** |
| _intercept_ | | | | | | **+0.172** |
| **total log-odds** | | | | | | **+3.973** |

score = 1 / (1 + exp(−3.973)) = **0.9815**

Machine-leaning evidence totals +5.975; human-leaning evidence totals -2.173. The three largest single contributions are 'the' per 1,000 words (+1.744), third person per 1,000 words (+1.128), sentence count (+1.060).

