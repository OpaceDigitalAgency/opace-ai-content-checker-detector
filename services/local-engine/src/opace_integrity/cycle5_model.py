"""Pinned, no-network Cycle-5 inference for the loopback engine."""
from __future__ import annotations

import hashlib
import json
import math
import threading
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .cycle5_features.struct_features import extract as extract_features
from .cycle5_segments import count_words, segment_text

MODEL_IDENTITY = "tier3-cycle5-v1"
REGISTRY_IDENTITY = "tier3-cycle5-full"
MODEL_ARTEFACTS = {
    "int8": {
        "path": "tier3-cycle5-full-e5small-int8-perchannel.onnx",
        "bytes": 34_301_767,
        "sha256": "9f57d6a8fe48a329170c5272f4f09a08ed383f9f461e7900fecd70f9fb15ef1b",
    },
    "fp32": {
        "path": "tier3-cycle5-full-e5small-fp32.onnx",
        "bytes": 133_766_349,
        "sha256": "45e00978b10d1df6b24db3770a228701f6c5d63e99d96aa1c0458e5932566057",
    },
}
# Kept as compatibility exports for callers that explicitly use the fp32 profile.
ARTEFACT_SHA256 = MODEL_ARTEFACTS["fp32"]["sha256"]
ARTEFACT_BYTES = MODEL_ARTEFACTS["fp32"]["bytes"]
VOCAB_SHA256 = "07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3"
VOCAB_BYTES = 231_508
MODEL_MAX_TOKENS = 512
MAX_WORDS = 8_000
MAX_CHARACTERS = 100_000
MIN_WORDS = 60

EXPECTED_CONTRACTS = {
    "segmentation": "segments-v3",
    "input": "raw-v1",
    "features": "features-v1",
    "scoring": "margin-v1",
}
EXPECTED_RULE = {
    "expression": "max(m1, m2 + 0.34) >= 3.570935",
    "primary_margin": 3.570935,
    "secondary_gap": 0.34,
}
EXPECTED_FEATURE_NAMES = [
    "wpp_cv", "sec_within15", "pps_var", "body_mode_share",
    "spp_cv", "adj_overlap", "cadence_rate", "has_structure",
]
EXPECTED_FEATURE_NORM = {
    "mean": [0.4083594134418581, 0.3858695169470864, 3.972885878050851, 0.47256837589441686, 0.3761888885414563, 0.04671324010389126, 0.43453264073828046, 0.4892945080826464],
    "sd": [0.21248020231631692, 0.26923918696432436, 41.53045781679202, 0.20330337201399315, 0.16477298430411097, 0.04122616971543623, 1.3061158641315476, 0.49988537930490373],
    "clip": 4.0,
}


class ModelUnavailable(RuntimeError):
    """The explicitly configured model cannot be proved to match the contract."""


class InputOutsideModelBounds(ValueError):
    pass


def _strict_object(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ModelUnavailable("model_manifest_duplicate_key")
        value[key] = item
    return value


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _verified_file(root: Path, relative: Any, size: Any, sha256: Any) -> Path:
    if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
        raise ModelUnavailable("model_manifest_path_invalid")
    candidate = root.joinpath(relative)
    try:
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(root)
    except (FileNotFoundError, OSError, ValueError) as error:
        raise ModelUnavailable("model_manifest_file_unavailable") from error
    if candidate.is_symlink() or any(parent.is_symlink() for parent in candidate.parents if parent != root.parent):
        raise ModelUnavailable("model_manifest_symlink_refused")
    if not resolved.is_file() or resolved.stat().st_size != size or _sha256(resolved) != sha256:
        raise ModelUnavailable("model_manifest_file_mismatch")
    return resolved


class WordPieceTokenizer:
    """BERT WordPiece matching the canonical website's dependency-free runtime."""

    def __init__(self, vocab_text: str):
        tokens = vocab_text.splitlines()
        self.vocab = {token: index for index, token in enumerate(tokens)}
        try:
            self.cls_id = self.vocab["[CLS]"]
            self.sep_id = self.vocab["[SEP]"]
            self.unk_id = self.vocab["[UNK]"]
            self.pad_id = self.vocab["[PAD]"]
        except KeyError as error:
            raise ModelUnavailable("tokenizer_special_token_missing") from error

    @staticmethod
    def _is_whitespace(character: str) -> bool:
        code = ord(character)
        return code in {9, 10, 11, 12, 13, 32, 0x85, 0xA0, 0x1680, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000} or 0x2000 <= code <= 0x200A

    @classmethod
    def _clean(cls, text: str) -> str:
        output = []
        for character in text:
            category = unicodedata.category(character)
            if ord(character) in (0, 0xFFFD) or (category in {"Cc", "Cf", "Co", "Cn"} and not cls._is_whitespace(character)):
                continue
            output.append(" " if cls._is_whitespace(character) else character)
        return "".join(output)

    @staticmethod
    def _is_cjk(codepoint: int) -> bool:
        return any(start <= codepoint <= end for start, end in (
            (0x4E00, 0x9FFF), (0x3400, 0x4DBF), (0x20000, 0x2A6DF),
            (0x2A700, 0x2B73F), (0x2B740, 0x2B81F), (0x2B820, 0x2CEAF),
            (0xF900, 0xFAFF), (0x2F800, 0x2FA1F),
        ))

    @classmethod
    def _basic_tokens(cls, text: str) -> list[str]:
        spaced = "".join(f" {character} " if cls._is_cjk(ord(character)) else character for character in cls._clean(text))
        output = []
        for word in spaced.split(" "):
            if not word:
                continue
            word = "".join(character.lower() for character in word)
            word = "".join(character for character in unicodedata.normalize("NFD", word) if unicodedata.category(character) != "Mn")
            current = ""
            for character in word:
                code = ord(character)
                punctuation = (33 <= code <= 47) or (58 <= code <= 64) or (91 <= code <= 96) or (123 <= code <= 126) or unicodedata.category(character).startswith("P")
                if punctuation:
                    if current:
                        output.append(current)
                        current = ""
                    output.append(character)
                else:
                    current += character
            if current:
                output.append(current)
        return output

    def _wordpiece(self, word: str) -> list[int]:
        if len(word) > 100:
            return [self.unk_id]
        ids, start = [], 0
        while start < len(word):
            end, found = len(word), None
            while start < end:
                found = self.vocab.get(("##" if start else "") + word[start:end])
                if found is not None:
                    break
                end -= 1
            if found is None:
                return [self.unk_id]
            ids.append(found)
            start = end
        return ids

    def pieces(self, text: str) -> list[int]:
        return [item for word in self._basic_tokens(text) for item in self._wordpiece(word)]

    def count_tokens(self, strings) -> list[int]:
        return [len(self.pieces(text)) for text in strings]

    def encode(self, text: str) -> tuple[list[int], list[int]]:
        pieces = self.pieces(text)
        if len(pieces) > MODEL_MAX_TOKENS - 2:
            raise InputOutsideModelBounds("segment_exceeded_token_window")
        ids = [self.cls_id, *pieces, self.sep_id]
        mask = [1] * len(ids)
        padding = MODEL_MAX_TOKENS - len(ids)
        return ids + [self.pad_id] * padding, mask + [0] * padding


@dataclass(frozen=True)
class ScoredSection:
    index: int
    start_utf16: int
    end_utf16: int
    word_count: int
    passage: str
    raw_margin: float
    raw_score: float
    band_id: str


@dataclass(frozen=True)
class ScoredDocument:
    sections: tuple[ScoredSection, ...]
    raw_margin: float
    raw_score: float
    band_id: str
    primary_display_threshold: float
    secondary_display_threshold: float
    flagged: bool
    flag_reason: str | None
    artefact_hash: str
    precision: str = "fp32"
    registry_identity: str = REGISTRY_IDENTITY


class Cycle5LocalModel:
    def __init__(self, manifest: dict[str, Any], model_path: Path, tokenizer: WordPieceTokenizer, session, np):
        self.manifest = manifest
        self.model_path = model_path
        self.tokenizer = tokenizer
        self.session = session
        self.np = np
        self._lock = threading.Lock()

    @classmethod
    def load(cls, model_directory: str | Path) -> "Cycle5LocalModel":
        root = Path(model_directory).expanduser()
        if not root.is_absolute():
            raise ModelUnavailable("model_directory_must_be_absolute")
        try:
            root = root.resolve(strict=True)
        except (FileNotFoundError, OSError) as error:
            raise ModelUnavailable("model_directory_unavailable") from error
        manifest_path = root.joinpath("manifest.json")
        if manifest_path.is_symlink() or not manifest_path.is_file():
            raise ModelUnavailable("model_manifest_unavailable")
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"), object_pairs_hook=_strict_object)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ModelUnavailable("model_manifest_invalid") from error
        cls._validate_manifest(manifest)
        artefact = MODEL_ARTEFACTS[manifest["model"]["precision"]]
        model_path = _verified_file(root, manifest["model"]["path"], artefact["bytes"], artefact["sha256"])
        vocab_path = _verified_file(root, manifest["tokenizer"]["vocab_path"], VOCAB_BYTES, VOCAB_SHA256)
        try:
            import numpy as np
            import onnxruntime as ort
        except ImportError as error:
            raise ModelUnavailable("cycle5_runtime_not_installed") from error
        if ort.__version__ != manifest["runtime"]["onnxruntime"]:
            raise ModelUnavailable("cycle5_runtime_version_mismatch")
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1
        options.inter_op_num_threads = 1
        options.log_severity_level = 3
        session = ort.InferenceSession(str(model_path), options, providers=["CPUExecutionProvider"])
        if [item.name for item in session.get_inputs()] != ["input_ids", "attention_mask", "feats"]:
            raise ModelUnavailable("cycle5_model_input_contract_mismatch")
        return cls(manifest, model_path, WordPieceTokenizer(vocab_path.read_text(encoding="utf-8")), session, np)

    @staticmethod
    def _validate_manifest(value: Any) -> None:
        expected = {
            "schema_version", "model", "tokenizer", "runtime", "contracts",
            "flag_rule", "display", "feature_names", "feature_norm", "licence",
        }
        if not isinstance(value, dict) or set(value) != expected:
            raise ModelUnavailable("model_manifest_shape_mismatch")
        model, tokenizer = value.get("model", {}), value.get("tokenizer", {})
        precision = model.get("precision")
        artefact = MODEL_ARTEFACTS.get(precision)
        if value["schema_version"] != "1.0" or artefact is None or model != {
            "identity": MODEL_IDENTITY, "registry_identity": REGISTRY_IDENTITY,
            "precision": precision, "path": model.get("path"), "bytes": artefact["bytes"],
            "sha256": artefact["sha256"],
        }:
            raise ModelUnavailable("model_manifest_identity_mismatch")
        if tokenizer != {"vocab_path": tokenizer.get("vocab_path"), "bytes": VOCAB_BYTES, "sha256": VOCAB_SHA256}:
            raise ModelUnavailable("model_manifest_tokenizer_mismatch")
        if value["contracts"] != EXPECTED_CONTRACTS or value["flag_rule"] != EXPECTED_RULE:
            raise ModelUnavailable("model_manifest_contract_mismatch")
        if value["runtime"] != {"onnxruntime": "1.29.0", "provider": "CPUExecutionProvider"}:
            raise ModelUnavailable("model_manifest_runtime_mismatch")
        if value["licence"] != {"base_model": "intfloat/e5-small", "spdx": "MIT"}:
            raise ModelUnavailable("model_manifest_licence_mismatch")
        display = value["display"]
        if display != {
            "temperature": 1.0479,
            "primary_threshold": 0.9679444972866822,
            "secondary_threshold": 0.9561964051006938,
            "bands": [
                {"id": "very_likely_ai", "min": 0.9679444972866822},
                {"id": "uncertain", "min": 0.95},
                {"id": "likely_human", "min": 0.5},
                {"id": "very_likely_human", "min": 0.0},
            ],
        }:
            raise ModelUnavailable("model_manifest_display_mismatch")
        norm = value["feature_norm"]
        if value["feature_names"] != EXPECTED_FEATURE_NAMES or norm != EXPECTED_FEATURE_NORM:
            raise ModelUnavailable("model_manifest_feature_contract_mismatch")
        if any(not isinstance(item, (int, float)) or not math.isfinite(item) for item in [*norm["mean"], *norm["sd"]]) or any(item <= 0 for item in norm["sd"]):
            raise ModelUnavailable("model_manifest_feature_norm_invalid")

    def _features(self, text: str) -> list[float]:
        raw = extract_features(text)
        norm = self.manifest["feature_norm"]
        output = []
        for feature, mean, sd in zip(raw, norm["mean"], norm["sd"]):
            value = (float(feature) - mean) / sd
            if not math.isfinite(value):
                value = 0.0
            output.append(max(-norm["clip"], min(norm["clip"], value)))
        return output

    def _score_section(self, text: str) -> tuple[float, float]:
        ids, mask = self.tokenizer.encode(text)
        feed = {
            "input_ids": self.np.asarray([ids], dtype=self.np.int64),
            "attention_mask": self.np.asarray([mask], dtype=self.np.int64),
            "feats": self.np.asarray([self._features(text)], dtype=self.np.float32),
        }
        logits = self.session.run(None, feed)[0][0]
        margin = float(logits[1] - logits[0])
        probability = 1.0 / (1.0 + math.exp(-margin / self.manifest["display"]["temperature"]))
        if not math.isfinite(margin) or not math.isfinite(probability):
            raise ModelUnavailable("cycle5_non_finite_output")
        return margin, probability

    def score(self, text: str) -> ScoredDocument:
        # JavaScript and the canonical browser contract count UTF-16 code units,
        # not Python Unicode code points. Astral characters therefore count as two.
        if len(text.encode("utf-16-le")) // 2 > MAX_CHARACTERS:
            raise InputOutsideModelBounds("model_input_too_many_characters")
        word_count = count_words(text)
        if word_count > MAX_WORDS:
            raise InputOutsideModelBounds("model_input_too_many_words")
        if word_count < MIN_WORDS:
            raise InputOutsideModelBounds("model_input_too_short")
        segments = segment_text(text, self.tokenizer.count_tokens)
        rows = []
        with self._lock:
            for segment in segments:
                margin, probability = self._score_section(segment.text)
                band = next(item["id"] for item in self.manifest["display"]["bands"] if probability >= item["min"])
                rows.append(ScoredSection(segment.index, segment.start, segment.end, segment.words, segment.text, margin, probability, band))
        strongest = max(rows, key=lambda item: item.raw_score)
        margins = sorted((item.raw_margin for item in rows), reverse=True)
        rule = self.manifest["flag_rule"]
        primary = margins[0] >= rule["primary_margin"]
        secondary = len(margins) > 1 and margins[1] + rule["secondary_gap"] >= rule["primary_margin"]
        return ScoredDocument(
            tuple(rows), strongest.raw_margin, strongest.raw_score, strongest.band_id,
            self.manifest["display"]["primary_threshold"], self.manifest["display"]["secondary_threshold"],
            primary or secondary, "primary" if primary else "secondary" if secondary else None,
            "sha256:" + self.manifest["model"]["sha256"],
            self.manifest["model"]["precision"],
            self.manifest["model"]["registry_identity"],
        )
