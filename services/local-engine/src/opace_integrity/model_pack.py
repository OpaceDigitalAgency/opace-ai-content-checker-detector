"""Prepare a local Cycle-5 model directory from already-authorised files."""
from __future__ import annotations

import json
import hashlib
import os
import shutil
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from .cycle5_model import (
    EXPECTED_CONTRACTS,
    EXPECTED_FEATURE_NAMES,
    EXPECTED_FEATURE_NORM,
    EXPECTED_RULE,
    MODEL_ARTEFACTS,
    MODEL_IDENTITY,
    REGISTRY_IDENTITY,
    VOCAB_BYTES,
    VOCAB_SHA256,
    Cycle5LocalModel,
    ModelUnavailable,
    _sha256,
)

MODEL_BASE_URL = "https://opace.agency/models/local-signals-v1/"
MODEL_DOWNLOAD_BYTES = MODEL_ARTEFACTS["int8"]["bytes"] + VOCAB_BYTES
MODEL_DOWNLOAD_URLS = frozenset({
    MODEL_BASE_URL + MODEL_ARTEFACTS["int8"]["path"],
    MODEL_BASE_URL + "vocab.txt",
})


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        return None


def _open_url(url: str, timeout: float):
    return urllib.request.build_opener(_NoRedirect).open(
        urllib.request.Request(url, headers={"Accept-Encoding": "identity", "User-Agent": "opace-content-integrity/0.1.0"}),
        timeout=timeout,
    )


def _download_exact(url: str, target: Path, expected_bytes: int, expected_sha256: str, timeout: float) -> None:
    if url not in MODEL_DOWNLOAD_URLS or urllib.parse.urlsplit(url).scheme != "https":
        raise ModelUnavailable("model_download_url_not_allowlisted")
    digest = hashlib.sha256()
    try:
        with _open_url(url, timeout) as response, target.open("xb") as output:
            if getattr(response, "status", None) != 200 or response.geturl() != url:
                raise ModelUnavailable("model_download_redirect_or_status_refused")
            encoding = response.headers.get("Content-Encoding")
            if encoding and encoding.lower() != "identity":
                raise ModelUnavailable("model_download_encoding_refused")
            length = response.headers.get("Content-Length")
            if length is None or not length.isdigit() or int(length) != expected_bytes:
                raise ModelUnavailable("model_download_size_mismatch")
            size = 0
            while True:
                chunk = response.read(min(1024 * 1024, expected_bytes + 1 - size))
                if not chunk:
                    break
                size += len(chunk)
                if size > expected_bytes:
                    raise ModelUnavailable("model_download_size_mismatch")
                digest.update(chunk)
                output.write(chunk)
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        raise ModelUnavailable("model_download_failed") from error
    if size != expected_bytes or digest.hexdigest() != expected_sha256:
        raise ModelUnavailable("model_download_hash_mismatch")
    os.chmod(target, 0o600)


def model_manifest(precision: str, model_path: str | None = None) -> dict:
    try:
        artefact = MODEL_ARTEFACTS[precision]
    except KeyError as error:
        raise ModelUnavailable("model_precision_unsupported") from error
    return {
        "schema_version": "1.0",
        "model": {
            "identity": MODEL_IDENTITY,
            "registry_identity": REGISTRY_IDENTITY,
            "precision": precision,
            "path": model_path or artefact["path"],
            "bytes": artefact["bytes"],
            "sha256": artefact["sha256"],
        },
        "tokenizer": {
            "vocab_path": "tokenizer/vocab.txt",
            "bytes": VOCAB_BYTES,
            "sha256": VOCAB_SHA256,
        },
        "runtime": {"onnxruntime": "1.29.0", "provider": "CPUExecutionProvider"},
        "contracts": dict(EXPECTED_CONTRACTS),
        "flag_rule": dict(EXPECTED_RULE),
        "display": {
            "temperature": 1.0479,
            "primary_threshold": 0.9679444972866822,
            "secondary_threshold": 0.9561964051006938,
            "bands": [
                {"id": "very_likely_ai", "min": 0.9679444972866822},
                {"id": "uncertain", "min": 0.95},
                {"id": "likely_human", "min": 0.5},
                {"id": "very_likely_human", "min": 0.0},
            ],
        },
        "feature_names": list(EXPECTED_FEATURE_NAMES),
        "feature_norm": {
            "mean": list(EXPECTED_FEATURE_NORM["mean"]),
            "sd": list(EXPECTED_FEATURE_NORM["sd"]),
            "clip": EXPECTED_FEATURE_NORM["clip"],
        },
        "licence": {"base_model": "intfloat/e5-small", "spdx": "MIT"},
    }


def _authorised_file(path: str | Path, expected_bytes: int, expected_sha256: str) -> Path:
    source = Path(path).expanduser()
    if not source.is_absolute():
        raise ModelUnavailable("model_source_must_be_absolute")
    if source.is_symlink():
        raise ModelUnavailable("model_source_symlink_refused")
    try:
        source = source.resolve(strict=True)
    except (FileNotFoundError, OSError) as error:
        raise ModelUnavailable("model_source_unavailable") from error
    if not source.is_file() or source.stat().st_size != expected_bytes or _sha256(source) != expected_sha256:
        raise ModelUnavailable("model_source_mismatch")
    return source


def prepare_model_pack(
    destination: str | Path,
    model_source: str | Path,
    vocab_source: str | Path,
    precision: str,
    accepted_licence: bool,
) -> Path:
    """Copy exact local bytes into an atomic, self-verifying directory.

    This function intentionally has no network route. The caller is responsible for
    obtaining and being authorised to use the input files.
    """
    if not accepted_licence:
        raise ModelUnavailable("model_licence_acceptance_required")
    destination = Path(destination).expanduser()
    if not destination.is_absolute():
        raise ModelUnavailable("model_destination_must_be_absolute")
    if destination.exists():
        raise ModelUnavailable("model_destination_exists")
    artefact = MODEL_ARTEFACTS.get(precision)
    if artefact is None:
        raise ModelUnavailable("model_precision_unsupported")
    model_source = _authorised_file(model_source, artefact["bytes"], artefact["sha256"])
    vocab_source = _authorised_file(vocab_source, VOCAB_BYTES, VOCAB_SHA256)
    destination.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=f".{destination.name}-", dir=destination.parent))
    try:
        tokenizer = staging.joinpath("tokenizer")
        tokenizer.mkdir(mode=0o700)
        model_target = staging.joinpath(artefact["path"])
        vocab_target = tokenizer.joinpath("vocab.txt")
        shutil.copyfile(model_source, model_target)
        shutil.copyfile(vocab_source, vocab_target)
        os.chmod(model_target, 0o600)
        os.chmod(vocab_target, 0o600)
        manifest = model_manifest(precision)
        manifest_path = staging.joinpath("manifest.json")
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        os.chmod(manifest_path, 0o600)
        Cycle5LocalModel._validate_manifest(manifest)
        os.replace(staging, destination)
    except Exception:
        shutil.rmtree(staging, ignore_errors=True)
        raise
    return destination


def install_model_pack(destination: str | Path, accepted_download: bool, accepted_licence: bool, timeout: float = 30.0) -> Path:
    """Download the allowlisted int8 model and vocabulary after explicit consent."""
    if not accepted_download:
        raise ModelUnavailable("model_download_consent_required")
    if not accepted_licence:
        raise ModelUnavailable("model_licence_acceptance_required")
    if not 1 <= timeout <= 120:
        raise ModelUnavailable("model_download_timeout_invalid")
    destination = Path(destination).expanduser()
    if not destination.is_absolute():
        raise ModelUnavailable("model_destination_must_be_absolute")
    if destination.exists():
        raise ModelUnavailable("model_destination_exists")
    destination.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=f".{destination.name}-", dir=destination.parent))
    artefact = MODEL_ARTEFACTS["int8"]
    try:
        tokenizer = staging.joinpath("tokenizer")
        tokenizer.mkdir(mode=0o700)
        model_target = staging.joinpath(artefact["path"])
        vocab_target = tokenizer.joinpath("vocab.txt")
        _download_exact(MODEL_BASE_URL + artefact["path"], model_target, artefact["bytes"], artefact["sha256"], timeout)
        _download_exact(MODEL_BASE_URL + "vocab.txt", vocab_target, VOCAB_BYTES, VOCAB_SHA256, timeout)
        manifest = model_manifest("int8")
        manifest_path = staging.joinpath("manifest.json")
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        os.chmod(manifest_path, 0o600)
        Cycle5LocalModel._validate_manifest(manifest)
        _authorised_file(model_target, artefact["bytes"], artefact["sha256"])
        _authorised_file(vocab_target, VOCAB_BYTES, VOCAB_SHA256)
        os.replace(staging, destination)
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise
    return destination
