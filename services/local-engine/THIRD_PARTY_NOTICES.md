# Third-party notices

The Python 0.2.0 distribution declares four direct runtime dependencies. Exact transitive versions are locked and audited in `requirements.lock`. The model files are downloaded separately only after explicit consent and are not included in the wheel or source archive.

| Package | Version | Licence | Purpose |
|---|---:|---|---|
| `jsonschema` | 4.25.1 | MIT | Draft 2020-12 request and response validation. |
| `numpy` | 2.3.4 | BSD-3-Clause | Cycle-5 tensor preparation and local output handling. |
| `onnxruntime` | 1.29.0 | MIT | CPU-only local inference for the exact Cycle-5 ONNX model. |
| `rfc8785` | 0.1.4 | Apache-2.0 | Canonical JSON used by stable hashes and receipts. |
| `attrs` | 26.1.0 | MIT | `jsonschema` support. |
| `flatbuffers` | 25.12.19 | Apache-2.0 | ONNX Runtime model serialisation support. |
| `jsonschema-specifications` | 2025.9.1 | MIT | JSON Schema vocabularies. |
| `packaging` | 26.3 | Apache-2.0 OR BSD-2-Clause | ONNX Runtime version and platform metadata. |
| `protobuf` | 7.36.1 | BSD-3-Clause | ONNX Runtime protocol data support. |
| `referencing` | 0.37.0 | MIT | JSON reference resolution. |
| `rpds-py` | 2026.6.3 | MIT | Persistent data structures. |
| `typing-extensions` | 4.16.0 | PSF-2.0 | Python typing compatibility. |

The separately installed model is `tier3-cycle5-v1`, derived from `intfloat/e5-small` (MIT). The recommended int8 bytes are 34,301,767 bytes with SHA-256 `9f57d6a8fe48a329170c5272f4f09a08ed383f9f461e7900fecd70f9fb15ef1b`; the vocabulary is 231,508 bytes with SHA-256 `07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3`. The fp32 compatibility profile is also supported but never downloaded by `model install`. This notice does not imply endorsement. Benchmark corpora are not package dependencies.
