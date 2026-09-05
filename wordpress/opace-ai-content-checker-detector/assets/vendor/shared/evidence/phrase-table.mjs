// Research data copied without changing counts, exclusions or gates.
export default {
  "version": "phrase-ratios-v1",
  "measured": "2026-08-30",
  "corpus": {
    "ai_documents": 922,
    "human_documents": 4636,
    "mining_half": {
      "ai": 467,
      "human": 2315
    },
    "held_out_half": {
      "ai": 455,
      "human": 2321
    },
    "source": "the 5,558-document long-form corpus of 28 August 2026"
  },
  "method": "Document frequency, not raw frequency. Phrases are three-word sequences appearing in at least 5 documents on BOTH sides of the mining half, ranked there by smoothed document-rate ratio, required to lean AI inside every register with enough documents to test (at least 3 such registers), and then REPORTED on a held-out half they were never selected on. Spelling is normalised to one convention on both sides first.",
  "limitations": [
    "Ratios are reported as intervals because at this corpus size the point estimate is not meaningful on its own. The intervals are wide.",
    "922 AI documents is small for phrase statistics. A commercial panel of this kind is built on millions; ours is built on hundreds, and the minimum-count floor that keeps the arithmetic honest is what limits the table to three-word phrases.",
    "Only 251 four-word phrases and 21 five-word phrases in the whole corpus met the minimum count in both halves, so longer phrases are not published at all.",
    "A phrase appearing in your draft is not evidence that your draft is machine-written. These are tendencies across thousands of documents, not marks against a sentence.",
    "Measured on long-form prose. Short marketing, SEO and social copy are not represented."
  ],
  "excluded_by_judgement": {
    "the bank of": "topical residue: our AI half writes about banking across several registers, so the within-register control does not separate subject from style"
  },
  "phrases": [
    {
      "phrase": "the literature is",
      "held_out_ratio_low": 7.1,
      "held_out_ratio_high": 55.5,
      "held_out_ratio": 19.8,
      "ai_documents": 17,
      "human_documents": 4,
      "registers_tested": 3,
      "weakest_register_ratio": 5.3
    },
    {
      "phrase": "the evidence base",
      "held_out_ratio_low": 19.9,
      "held_out_ratio_high": 174.8,
      "held_out_ratio": 58.9,
      "ai_documents": 40,
      "human_documents": 3,
      "registers_tested": 4,
      "weakest_register_ratio": 8.1
    },
    {
      "phrase": "the result is",
      "held_out_ratio_low": 10.6,
      "held_out_ratio_high": 65.4,
      "held_out_ratio": 26.4,
      "ai_documents": 28,
      "human_documents": 5,
      "registers_tested": 4,
      "weakest_register_ratio": 11.3
    },
    {
      "phrase": "rather than an",
      "held_out_ratio_low": 5.2,
      "held_out_ratio_high": 19.1,
      "held_out_ratio": 10,
      "ai_documents": 26,
      "human_documents": 13,
      "registers_tested": 3,
      "weakest_register_ratio": 16.5
    },
    {
      "phrase": "not the same",
      "held_out_ratio_low": 7.8,
      "held_out_ratio_high": 50.5,
      "held_out_ratio": 19.9,
      "ai_documents": 21,
      "human_documents": 5,
      "registers_tested": 6,
      "weakest_register_ratio": 9
    },
    {
      "phrase": "but as a",
      "held_out_ratio_low": 6,
      "held_out_ratio_high": 35.2,
      "held_out_ratio": 14.5,
      "ai_documents": 18,
      "human_documents": 6,
      "registers_tested": 5,
      "weakest_register_ratio": 5.2
    },
    {
      "phrase": "is not simply",
      "held_out_ratio_low": 11.9,
      "held_out_ratio_high": 161.6,
      "held_out_ratio": 43.8,
      "ai_documents": 21,
      "human_documents": 2,
      "registers_tested": 3,
      "weakest_register_ratio": 9.1
    },
    {
      "phrase": "rather than as",
      "held_out_ratio_low": 10.2,
      "held_out_ratio_high": 75.4,
      "held_out_ratio": 27.7,
      "ai_documents": 24,
      "human_documents": 4,
      "registers_tested": 4,
      "weakest_register_ratio": 4.6
    },
    {
      "phrase": "question of whether",
      "held_out_ratio_low": 4.1,
      "held_out_ratio_high": 14.5,
      "held_out_ratio": 7.7,
      "ai_documents": 23,
      "human_documents": 15,
      "registers_tested": 3,
      "weakest_register_ratio": 5.3
    },
    {
      "phrase": "the gap between",
      "held_out_ratio_low": 5.2,
      "held_out_ratio_high": 18.1,
      "held_out_ratio": 9.7,
      "ai_documents": 27,
      "human_documents": 14,
      "registers_tested": 7,
      "weakest_register_ratio": 3.8
    },
    {
      "phrase": "a fraction of",
      "held_out_ratio_low": 2.6,
      "held_out_ratio_high": 15.5,
      "held_out_ratio": 6.3,
      "ai_documents": 10,
      "human_documents": 8,
      "registers_tested": 3,
      "weakest_register_ratio": 6.5
    },
    {
      "phrase": "a mixture of",
      "held_out_ratio_low": 3.5,
      "held_out_ratio_high": 23.4,
      "held_out_ratio": 9,
      "ai_documents": 11,
      "human_documents": 6,
      "registers_tested": 4,
      "weakest_register_ratio": 7.6
    },
    {
      "phrase": "evidence from the",
      "held_out_ratio_low": 3.9,
      "held_out_ratio_high": 29.3,
      "held_out_ratio": 10.6,
      "ai_documents": 11,
      "human_documents": 5,
      "registers_tested": 3,
      "weakest_register_ratio": 7.1
    },
    {
      "phrase": "the first is",
      "held_out_ratio_low": 3.9,
      "held_out_ratio_high": 13.5,
      "held_out_ratio": 7.3,
      "ai_documents": 23,
      "human_documents": 16,
      "registers_tested": 5,
      "weakest_register_ratio": 3.2
    },
    {
      "phrase": "rather than a",
      "held_out_ratio_low": 8.5,
      "held_out_ratio_high": 17,
      "held_out_ratio": 12,
      "ai_documents": 100,
      "human_documents": 42,
      "registers_tested": 7,
      "weakest_register_ratio": 4.9
    },
    {
      "phrase": "should therefore be",
      "held_out_ratio_low": 5.6,
      "held_out_ratio_high": 59.2,
      "held_out_ratio": 18.2,
      "ai_documents": 12,
      "human_documents": 3,
      "registers_tested": 3,
      "weakest_register_ratio": 1.5
    },
    {
      "phrase": "the limits of",
      "held_out_ratio_low": 5.1,
      "held_out_ratio_high": 23.6,
      "held_out_ratio": 11,
      "ai_documents": 20,
      "human_documents": 9,
      "registers_tested": 3,
      "weakest_register_ratio": 11.3
    },
    {
      "phrase": "ways that are",
      "held_out_ratio_low": 6.2,
      "held_out_ratio_high": 49.9,
      "held_out_ratio": 17.5,
      "ai_documents": 15,
      "human_documents": 4,
      "registers_tested": 3,
      "weakest_register_ratio": 5.3
    }
  ]
};
