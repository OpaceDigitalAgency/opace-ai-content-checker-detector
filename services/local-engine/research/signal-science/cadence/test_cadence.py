"""Probe test for the synthetic-cadence signals.

The three passages the owner picked out by ear must score high. Paragraphs from
his six genuine human articles must not. Anything less than that and the module
is not measuring what he is hearing.

The last test is the one that matters most: it BREAKS each detector in turn and
asserts the probe then fails. This project has already shipped a kill switch
that passed three tests while being dead. A test that cannot fail is not a test.

Run: python3 -m unittest discover -s . -p 'test_*.py'
"""

from __future__ import annotations

import glob
import json
import os
import unittest

import cadence

# The nine sample documents were rescued from a session scratchpad on
# 31 August 2026 — the path here used to point at one, and a scratchpad does
# not survive its session. They now live beside this test.
SAMPLES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples")

# The owner's own three quotations, verbatim, each with the minimum score the
# probe requires of it. The two three-sentence body passages are the ones he
# called "100% AI" and they must clear a higher bar than the two-sentence
# conclusion, which has fewer detectors available to it.
OWNER_PASSAGES = [
    (6, "statement -> instruction -> consequence",
     "A business owner may build a website to explain an offer, collect "
     "enquiries, manage appointments or sell online. Write the priority "
     "customer tasks into the brief before asking for web design prices. "
     "Otherwise, each web designer may price a different solution."),
    (6, "qualification -> counter-example -> instruction",
     "Page count affects effort but is not a complete measure. More complex "
     "sites do not always have more pages: five researched sections can take "
     "more work than 20 template-led pages using approved copy. Separate "
     "reusable layouts from per-page content, entry and review."),
    (4, "declaration -> balanced taxonomy",
     "A specialist platform changes the operating model. The WordPress website "
     "cost UK guide covers hosting, themes, plugins, licences and support; the "
     "eCommerce website cost UK guide covers catalogue work, payments, "
     "shipping, tax and integrations."),
]

HUMAN_SAMPLES = ["1-panda-penguin", "2-social-objectives", "3-esports",
                 "4-facebook-stale", "5-mobile-algorithm", "6-eu-ranking"]

FIRE = 4           # a paragraph at or above this is called synthetic
HUMAN_CEILING = 4  # no paragraph of his human writing may reach the gate
# The closest any of his human paragraphs comes is 3, in 1-panda-penguin:
# "It appears this is being heavily penalised. So remove any content that is
# not original (for example, ...). Make sure product descriptions are unique."
# Claim, consequence, instruction — his own writing, in the shape the module
# is looking for. The parenthetical aside is what keeps it under the gate.


def human_paragraphs():
    out = []
    for name in HUMAN_SAMPLES:
        path = os.path.join(SAMPLES, name + ".json")
        if not os.path.exists(path):
            continue
        text = json.load(open(path))["text"]
        for p in cadence.split_paragraphs(text):
            if len(cadence.split_sentences(p)) >= 2:
                out.append((name, p))
    return out


class TestOwnerPassages(unittest.TestCase):

    def test_roles_match_the_shapes_he_described(self):
        seqs = ["".join(r for r, _ in cadence.role_annotate(p))
                for _, _, p in OWNER_PASSAGES]
        self.assertEqual(seqs[0], "CIS")   # claim, instruction, consequence
        self.assertEqual(seqs[1], "XXI")   # qualification, contrast, instruction
        self.assertEqual(seqs[2], "CC")    # declaration, balanced taxonomy

    def test_each_quoted_passage_fires(self):
        for floor, label, p in OWNER_PASSAGES:
            with self.subTest(label):
                self.assertGreaterEqual(cadence.paragraph_cadence(p), floor)

    def test_the_balanced_taxonomy_is_detected(self):
        s = cadence.analyse_sentence(
            "The WordPress website cost UK guide covers hosting, themes, "
            "plugins, licences and support; the eCommerce website cost UK guide "
            "covers catalogue work, payments, shipping, tax and integrations.")
        self.assertTrue(s.balanced)
        self.assertTrue(s.enumeration)

    def test_the_assertive_utility_voice_is_detected(self):
        for s in ("Page count affects effort but is not a complete measure.",
                  "A specialist platform changes the operating model.",
                  "Good planning reduces unnecessary development."):
            with self.subTest(s):
                self.assertTrue(cadence.analyse_sentence(s).utility)


class TestHumanSamples(unittest.TestCase):

    def test_samples_are_present(self):
        self.assertEqual(len(HUMAN_SAMPLES), 6)
        self.assertGreaterEqual(len(human_paragraphs()), 20)

    def test_no_human_paragraph_reaches_the_gate(self):
        worst = max(((cadence.paragraph_cadence(p), name, p)
                     for name, p in human_paragraphs()),
                    key=lambda t: t[0])
        self.assertLess(worst[0], HUMAN_CEILING,
                        f"{worst[1]} scored {worst[0]}: {worst[2][:120]}")

    def test_the_humanised_ai_article_separates_from_all_six(self):
        text = json.load(open(os.path.join(
            SAMPLES, "9-ai-with-humanise-instructions.json")))["text"]
        ai = max(cadence.paragraph_cadence(p)
                 for p in cadence.split_paragraphs(text))
        hu = max(cadence.paragraph_cadence(p) for _, p in human_paragraphs())
        self.assertGreaterEqual(ai, FIRE)
        self.assertGreater(ai - hu, 3)


class TestTheProbeCanFail(unittest.TestCase):
    """Break each detector and assert the probe stops passing.

    Without this the suite above would still pass against a module that
    returned a constant, which is exactly how a dead control ships.
    """

    def _probe_passes(self):
        return (all(cadence.paragraph_cadence(p) >= floor
                    for floor, _, p in OWNER_PASSAGES)
                and all(cadence.paragraph_cadence(p) < HUMAN_CEILING
                        for _, p in human_paragraphs()))

    def setUp(self):
        self.assertTrue(self._probe_passes(), "probe does not pass unbroken")
        self.saved = {
            "IMPERATIVE_VERBS": set(cadence.IMPERATIVE_VERBS),
            "UTILITY_VERBS": set(cadence.UTILITY_VERBS),
            "CONSEQUENCE_OPENERS": list(cadence.CONSEQUENCE_OPENERS),
            "_is_balanced": cadence._is_balanced,
            "_count_enumeration": cadence._count_enumeration,
        }

    def tearDown(self):
        for k, v in self.saved.items():
            setattr(cadence, k, v)

    def test_breaks_when_imperatives_are_not_recognised(self):
        cadence.IMPERATIVE_VERBS = set()
        self.assertFalse(self._probe_passes())

    def test_breaks_when_instruction_and_consequence_are_both_dead(self):
        cadence.IMPERATIVE_VERBS = set()
        cadence.CONSEQUENCE_OPENERS = []
        self.assertFalse(self._probe_passes())

    def test_breaks_when_the_utility_voice_is_not_recognised(self):
        cadence.UTILITY_VERBS = set()
        self.assertFalse(self._probe_passes())

    def test_breaks_when_balanced_construction_is_not_recognised(self):
        cadence._is_balanced = lambda s: False
        self.assertFalse(self._probe_passes())

    def test_breaks_when_the_score_is_a_constant(self):
        saved = cadence.paragraph_cadence
        try:
            cadence.paragraph_cadence = lambda p: 9
            self.assertFalse(self._probe_passes())
            cadence.paragraph_cadence = lambda p: 0
            self.assertFalse(self._probe_passes())
        finally:
            cadence.paragraph_cadence = saved


if __name__ == "__main__":
    unittest.main(verbosity=2)
