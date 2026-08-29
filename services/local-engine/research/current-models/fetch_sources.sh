#!/usr/bin/env bash
# Re-download every source used by build_current_set.py / build_control_set.py.
# All four are ungated and need no Hugging Face token.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p raw

# S1  lmarena-ai/arena-expert-5k  - licence: prompts CC-BY-4.0, outputs under provider ToU
curl -fsSL -o raw/arena-expert-5k.parquet \
  "https://huggingface.co/datasets/lmarena-ai/arena-expert-5k/resolve/main/data/train-00000-of-00001.parquet"

# S2  TeichAI Claude 4.6 reasoning sets - licence: apache-2.0
curl -fsSL -o raw/teichai-claude-opus-4.6-887x.jsonl \
  "https://huggingface.co/datasets/TeichAI/Claude-Opus-4.6-Reasoning-887x/resolve/main/opus_4.6_reasoning_887x.jsonl"
curl -fsSL -o raw/teichai-claude-sonnet-4.6-1100x.jsonl \
  "https://huggingface.co/datasets/TeichAI/Claude-Sonnet-4.6-Reasoning-1100x/resolve/main/sonnet_4.6_reasoning_1100x.jsonl"

# S3  elisabeth-pl-pl/GRADTEX (test split) - licence: cc-by-4.0
curl -fsSL -o raw/gradtex-test.parquet \
  "https://huggingface.co/datasets/elisabeth-pl-pl/GRADTEX/resolve/main/test.parquet"

# S4  mild-rgb/aita-human-vs-ai - licence: apache-2.0
curl -fsSL -o raw/mildrgb-aita-dataset.jsonl \
  "https://huggingface.co/datasets/mild-rgb/aita-human-vs-ai/resolve/main/dataset.jsonl"

echo "done"
