from __future__ import annotations

import copy
import json
import re
import unittest
from pathlib import Path

from opace_integrity import __version__
from opace_integrity.report import checker_html, count_phrase, pluralise
from opace_integrity.signals import measure_section_signals

ROOT = Path(__file__).resolve().parents[4]


class ReportTests(unittest.TestCase):
    def fixture(self):
        return json.loads(ROOT.joinpath("fixtures/contracts/valid/checker-result.json").read_text())["data"]

    @staticmethod
    def visible(document: str) -> str:
        return re.sub(r"<style>.*?</style>", "", document, flags=re.S)

    def test_branded_report_carries_the_complete_evidence_baseline(self):
        result = self.fixture()
        document = checker_html(result)
        visible = self.visible(document)
        self.assertTrue(document.startswith('<!doctype html><html lang="en-GB">'))
        self.assertIn("<title>Opace AI Content Checker &amp; Detector evidence report</title>", document)
        for marker in (
            "Opace AI Content Checker &amp; Detector",
            "Evidence, not guarantees",
            f"Local engine {__version__}",
            "Strongly AI",
            "0.969",
            "not a percentage of the text",
            "The strongest evidence is in section 2 of 2, which scored 0.969 and sits in the Strongly AI band.",
            "Three independent readings",
            "Text integrity",
            "Editorial signals",
            "style.repeated_opening",
            "How each part of the draft scored",
            "Why it reads this way",
            "This was the strongest scored section.",
            "segments-v3, raw-v1, features-v1, margin-v1",
            "Opace EU server, europe-west1",
            "tier3-cycle5-v1",
            "fp32",
            "sha256:45e00978b10d1df6b24db3770a228701f6c5d63e99d96aa1c0458e5932566057",
            "max(m1, m2 + 0.34) &gt;= 3.570935",
            "The text was processed for this request and was not retained.",
            "60–8,000 words",
            "100,000 UTF-16 characters",
            "250,000 bytes",
            "120 words · 120 characters · 2 sections",
            "3 protected items were identified and left untouched.",
            "Categories: organisation, date, link.",
            "1 named check ran in this run.",
            "organisation, date, link",
            "watermark.opace.public-test",
            "watermark.anthropic",
            "Opace Cycle-5 AI-pattern model",
            "detector.cycle5",
            "Review evidence",
            "it does not prove authorship",
            "Complete machine record",
            "result_cycle5_fixture_001",
            "https://opace.agency/tools/ai/content-verification-integrity/",
            "This draft very strongly matches AI writing",
            "No AI checker can prove who wrote a text.",
            "What this means",
            "What this does not mean",
            "Human writing polished with an AI tool is deliberately not flagged.",
            "It is not the percentage of the draft written by AI.",
            "Recorded limitations",
        ):
            self.assertIn(marker, visible, marker)
        for section in result["sections"]:
            self.assertIn(section["passage"], visible)
            self.assertIn(f"Raw margin {section['raw_margin']}", visible)
            self.assertIn(f">{section['display_score']}<", visible)

    def test_report_is_self_contained_and_never_shows_a_percentage(self):
        document = checker_html(self.fixture())
        visible = self.visible(document)
        for forbidden in ("<script", "<iframe", "<img", "<link", "@import", " src="):
            self.assertNotIn(forbidden, document, forbidden)
        self.assertNotIn("%", re.sub(r"<[^>]+>", " ", visible))
        for url in re.findall(r"https?://[^\"'\s<]+", document):
            self.assertTrue(url.startswith("https://opace.agency/"), url)

    def test_dial_and_band_strips_follow_the_recorded_level(self):
        result = self.fixture()
        document = checker_html(result)
        self.assertIn('<svg class="oaci-dial"', document)
        self.assertIn('aria-label="Five-band AI-pattern dial reading Strongly AI"', document)
        self.assertIn("<line ", document)
        self.assertEqual(document.count('fill-opacity='), 5)
        self.assertIn('<li aria-current="true" style="--band:#a31f17">Strongly AI</li>', document)
        self.assertIn('<i data-on="true" style="--band:#bf4705"></i>', document)
        self.assertIn('<i data-on="true" style="--band:#a31f17"></i>', document)

    def test_unassessed_result_states_the_gap_without_a_score(self):
        result = copy.deepcopy(self.fixture())
        result["axes"]["ai_pattern"] = {
            **result["axes"]["ai_pattern"],
            "assessment_status": "not_assessed",
            "raw_score": None,
            "raw_margin": None,
            "display_score": None,
            "level": None,
            "strongest_section_index": None,
            "reason": "No trained model ran on this text.",
        }
        result["sections"] = []
        visible = self.visible(checker_html(result))
        self.assertIn("Not assessed", visible)
        self.assertIn("No model-scored passage was recorded in this run.", visible)
        self.assertIn("No section was scored by a trained model in this run.", visible)
        self.assertIn('<p class="oaci-score">—</p>', visible)
        self.assertIn('aria-label="Five-band AI-pattern dial, not assessed"', visible)


# The shape of the count/verb defect Lane B reported against the Chrome report, guarded here so a
# new count-bearing sentence in the Python report cannot reintroduce it. Same four patterns as
# `shared/report/test/pluralisation.test.mjs`.
AGREEMENT_FAULTS = (
    (re.compile(r"\b1 [a-z]+s\b"), "a count of one followed by a plural noun"),
    (re.compile(r"\b1 [a-z]+ were\b"), 'a count of one followed by "were"'),
    (re.compile(r"\b(?:0|[2-9]|\d\d+) [a-z]+ was\b"), 'a count other than one followed by "was"'),
    (re.compile(r"\(s\)"), 'an "(s)" escape hatch instead of a real plural'),
)


class PluralisationTests(unittest.TestCase):
    def fixture(self):
        return json.loads(ROOT.joinpath("fixtures/contracts/valid/checker-result.json").read_text())["data"]

    def prose(self, document: str) -> str:
        """Reader-visible sentences only: the stylesheet and the raw machine record are data."""
        without_style = re.sub(r"<style>.*?</style>", "", document, flags=re.S)
        without_record = re.sub(r"<details>.*?</details>", "", without_style, flags=re.S)
        return re.sub(r"<[^>]+>", " ", without_record)

    def singular_fixture(self):
        """Every rendered count is exactly one."""
        result = copy.deepcopy(self.fixture())
        result["source"]["word_count"] = 1
        result["source"]["character_count"] = 1
        result["source"]["section_count"] = 1
        result["sections"] = [
            {
                "index": 0,
                "start_utf16": 0,
                "end_utf16": 1,
                "word_count": 1,
                "raw_score": 0.9685,
                "raw_margin": 3.6,
                "display_score": "0.969",
                "level": "signal-strongly-ai",
                "band_id": "very_likely_ai",
                "passage": "Word.",
                "evidence": [
                    {"id": "section-0-model", "kind": "trained_model", "summary": "This was the strongest scored section."}
                ],
            }
        ]
        result["axes"]["ai_pattern"]["strongest_section_index"] = 0
        result["axes"]["text_integrity"]["findings"] = [{"rule_id": "unicode.zero_width"}]
        result["axes"]["editorial"]["findings"] = [{"rule_id": "style.repeated_opening"}]
        result["provenance"]["protected_facts"] = {"count": 1, "categories": ["organisation"]}
        result["provenance"]["c2pa_files"] = [(result["provenance"].get("c2pa_files") or [{}])[0]]
        result["methods"] = [result["methods"][0]]
        result["abuse_controls"] = {**result["abuse_controls"], "max_request_bytes": 1}
        return result

    def zero_fixture(self):
        """No protected facts, no categories, no findings, no named check, no scored section."""
        result = copy.deepcopy(self.fixture())
        result["provenance"]["protected_facts"] = {"count": 0, "categories": []}
        result["provenance"]["c2pa_files"] = []
        result["axes"]["text_integrity"]["findings"] = []
        result["axes"]["editorial"]["findings"] = []
        result["methods"] = []
        return result

    def assert_agrees(self, text: str, label: str) -> None:
        for pattern, description in AGREEMENT_FAULTS:
            match = pattern.search(text)
            self.assertIsNone(match, f"{label}: {description} — {match.group(0) if match else ''}")

    def test_helpers_take_the_singular_only_for_exactly_one(self):
        self.assertEqual(pluralise(1, "word"), "word")
        self.assertEqual(pluralise(0, "word"), "words")
        self.assertEqual(pluralise(2, "word"), "words")
        self.assertEqual(pluralise(1.5, "word"), "words")
        self.assertEqual(pluralise(1, "was", "were"), "was")
        self.assertEqual(pluralise(3, "was", "were"), "were")
        self.assertEqual(pluralise(1, "Category", "Categories"), "Category")
        self.assertEqual(pluralise(True, "word"), "words")

        self.assertEqual(count_phrase(1, "word"), "1 word")
        self.assertEqual(count_phrase(0, "word"), "0 words")
        self.assertEqual(count_phrase(1200, "word"), "1,200 words")
        self.assertEqual(count_phrase(1, "protected item"), "1 protected item")
        self.assertEqual(count_phrase(None, "word"), "Not recorded")
        self.assertEqual(count_phrase(float("nan"), "word", "words", "None"), "None")

    def test_every_count_agrees_when_every_count_is_one(self):
        prose = self.prose(checker_html(self.singular_fixture()))
        self.assertIn("1 protected item was identified and left untouched.", prose)
        self.assertIn("Category: organisation.", prose)
        self.assertIn("1 word · 1 character · 1 section", prose)
        self.assertIn("Section 1 · 1 word", prose)
        self.assertIn("1 named check ran in this run. It is recorded with", prose)
        self.assertIn("1 finding was recorded.", prose)
        self.assertIn("1 file", prose)
        self.assertIn("request body up to 1 byte.", prose)
        self.assertIn("The strongest evidence is in section 1 of 1, which scored 0.969", prose)
        self.assert_agrees(prose, "singular report")

    def test_every_count_agrees_when_the_counts_are_plural(self):
        prose = self.prose(checker_html(self.fixture()))
        self.assertIn("3 protected items were identified and left untouched.", prose)
        self.assertIn("Categories: organisation, date, link.", prose)
        self.assertIn("120 words · 120 characters · 2 sections", prose)
        self.assertIn("250,000 bytes", prose)
        self.assert_agrees(prose, "plural report")

    def test_every_count_agrees_when_the_counts_are_zero(self):
        prose = self.prose(checker_html(self.zero_fixture()))
        self.assertIn("No protected items were identified in this draft.", prose)
        self.assertIn("No categories were recorded.", prose)
        self.assertIn("No finding was recorded.", prose)
        self.assertIn("No named check was recorded.", prose)
        self.assertIn("0 files", prose)
        self.assert_agrees(prose, "zero report")



LONG_PASSAGE = (
    "Ask someone what COPD stands for and you will often get a blank look."
    " It is sitting quietly in the background of more households than most people realise."
    " Chronic obstructive pulmonary disease is now the second most common lung condition in the country."
    " Around one and a quarter million people live with a diagnosis today."
    " The condition narrows the airways and makes every breath harder than it should be."
    " Smoking remains the largest single cause, though it is far from the only one."
    " Air quality, occupational dust and inherited factors all play a measurable part in who develops it."
    " Diagnosis often arrives late, after years of a cough that everyone had dismissed as ordinary."
    " Treatment started early slows the decline in lung function considerably, which is why the delay matters so much."
    " Pulmonary rehabilitation, inhaled medicines and stopping smoking are the three things that change the outlook."
)


class HeroLegendTests(unittest.TestCase):
    """Lane D3 section 1: the five band names are their own full-width row."""

    def fixture(self):
        return json.loads(ROOT.joinpath("fixtures/contracts/valid/checker-result.json").read_text())["data"]

    def test_the_legend_is_its_own_row_beneath_the_dial_and_the_copy(self):
        document = checker_html(self.fixture())
        self.assertIn(
            '<ul class="oaci-bands" aria-label="The five bands of the scale, from likely human to strongly AI">',
            document,
        )
        self.assertIn(".oaci-bands{grid-row:2;grid-column:1/-1;", document)
        self.assertIn('<div class="oaci-gauge">', document)
        self.assertIn('<div class="oaci-verdict-body">', document)
        # The legend is emitted after the verdict copy, not inside the dial's own column.
        self.assertLess(document.index('class="oaci-verdict-body"'), document.index('class="oaci-bands"'))
        self.assertLess(document.index("Evidence, not guarantees. No AI checker"), document.index('class="oaci-bands"'))
        # Narrow gives the legend a row of its own in two columns; print restores the five.
        self.assertIn(".oaci-bands{grid-row:3;grid-column:1;grid-template-columns:repeat(2,minmax(0,1fr))}", document)
        self.assertIn(".oaci-bands{grid-row:2;grid-column:1/-1;grid-template-columns:repeat(5,minmax(0,1fr))}", document)


class NamedCheckRowTests(unittest.TestCase):
    """Lane D3 section 3: one row per check, grouped, with a Details disclosure."""

    def fixture(self):
        return json.loads(ROOT.joinpath("fixtures/contracts/valid/checker-result.json").read_text())["data"]

    def test_each_check_is_a_row_with_a_plain_sentence_and_a_disclosure(self):
        document = checker_html(self.fixture())
        self.assertIn('<h3 class="oaci-subhead">AI-pattern reading</h3>', document)
        self.assertIn("<details><summary>Details</summary>", document)
        self.assertIn("detector.cycle5 · tier3-cycle5-v1 · hub provider route", document)
        self.assertIn("This check found something worth reading before you act on the result.", document)
        self.assertIn("The model provides a pattern reading, not proof of authorship.", document)
        self.assertIn("a disclosure holding its id, its version and its limits", document)

    def test_checks_are_grouped_by_the_reading_they_feed(self):
        result = self.fixture()
        result["methods"] = [
            {"id": "detector.cycle5", "provider_or_method": "Cycle-5 model", "status": "attention"},
            {"id": "unicode.invisible", "provider_or_method": "Invisible character scan", "status": "pass"},
            {"id": "pattern.editorial", "provider_or_method": "Editorial patterns", "status": "not_run"},
            {"id": "novel.family", "provider_or_method": "Something new", "status": "inconclusive"},
        ]
        document = checker_html(result)
        for label in ("AI-pattern reading", "Text integrity", "Editorial signals", "Other named checks"):
            self.assertIn(f'<h3 class="oaci-subhead">{label}</h3>', document)
        # An unrecognised family is filed under "Other", never dropped or filed under a reading.
        self.assertIn("Something new", document)
        self.assertLess(document.index("Something new"), document.index("</body>"))
        # A check that did not run says so; it is never counted as a pass.
        self.assertIn("This check did not run. Nothing is inferred from its silence.", document)
        self.assertIn("No limitation was recorded for this check.", document)


class MeasuredSignalTests(unittest.TestCase):
    """Lane D3 section 4: what the model measured, computed here from the passage."""

    def fixture(self):
        return json.loads(ROOT.joinpath("fixtures/contracts/valid/checker-result.json").read_text())["data"]

    def long_fixture(self):
        result = self.fixture()
        result["sections"][0]["passage"] = LONG_PASSAGE
        result["sections"][0]["word_count"] = 160
        return result

    def test_the_three_meters_are_measured_from_the_passage(self):
        meters = measure_section_signals(LONG_PASSAGE)
        self.assertEqual([meter.id for meter in meters], ["adjacent_overlap", "vocabulary_variety", "sentence_length_cv"])
        self.assertEqual(meters[1].value, 0.772)
        self.assertEqual((meters[0].ai_median, meters[0].human_median, meters[0].auroc), (2.1, 6.3, 0.912))
        self.assertEqual((meters[1].ai_median, meters[1].human_median, meters[1].auroc), (0.776, 0.694, 0.911))
        # Sentence-length evenness carries no markers, because none was measured.
        self.assertIsNone(meters[2].ai_median)
        self.assertIsNone(meters[2].human_median)
        self.assertFalse(meters[2].informative)
        self.assertIn("AUROC 0.521 against 0.500 for chance", meters[2].basis)

    def test_a_passage_too_short_to_read_honestly_shows_no_meter(self):
        self.assertEqual(measure_section_signals("The second complete passage is the strongest section."), [])
        self.assertEqual(measure_section_signals(None), [])
        document = checker_html(self.fixture())
        self.assertNotIn('<div class="oaci-measured"', document)
        self.assertNotIn("<h4>What the model measured</h4>", document)

    def test_the_report_draws_every_meter_it_measured(self):
        document = checker_html(self.long_fixture())
        self.assertIn('<div class="oaci-measured" data-oaci-measured="3">', document)
        self.assertIn("<h4>What the model measured</h4>", document)
        for signal in ("adjacent_overlap", "vocabulary_variety", "sentence_length_cv"):
            self.assertIn(f'data-oaci-signal="{signal}"', document)
        self.assertIn("typical AI ~2.1%", document)
        self.assertIn("typical human ~6.3%", document)
        self.assertIn("typical AI ~0.776", document)
        self.assertIn("typical human ~0.694", document)
        self.assertIn('data-oaci-signal="sentence_length_cv" data-oaci-informative="false"', document)
        evenness = document[document.index('data-oaci-signal="sentence_length_cv"'):]
        evenness = evenness[: evenness.index("oaci-measured-why")]
        self.assertNotIn("typical AI ~", evenness)
        self.assertNotIn("typical human ~", evenness)
        self.assertIn("with no typical AI or typical human marker, because none was measured", evenness)
        self.assertIn("AUROC 0.521 against 0.500 for chance", evenness)
        # The block is descriptive and says so; it never claims a signal set the reading.
        self.assertIn("What stands out when this passage is measured", document)
        self.assertIn("They did not set the reading", document)
        self.assertIn("read them as context for one passage rather than as a verdict on it", document)

    def test_the_report_stays_self_contained_with_the_measured_block(self):
        document = checker_html(self.long_fixture())
        self.assertEqual(document.count("<style>"), 1)
        for marker in ("<script", "<iframe", "<img", "<link", "@import", " src="):
            self.assertNotIn(marker, document)
        for url in re.findall(r"https?://[^\"\'\s<]+", document):
            self.assertTrue(url.startswith("https://opace.agency/"), url)


if __name__ == "__main__":
    unittest.main()
