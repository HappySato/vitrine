#!/usr/bin/env bash
# Confirm the OpenAI-compatible endpoint answers. Defaults to a local vLLM port.
set -euo pipefail

BASE="${LLM_BASE_URL:-http://127.0.0.1:8000/v1}"
BASE="${BASE%/}"
MODEL="${LLM_MODEL:-Qwen/Qwen2.5-7B-Instruct}"
KEY="${LLM_API_KEY:-EMPTY}"

echo "GET ${BASE}/models"
curl -fsS "${BASE}/models"
echo
echo "POST ${BASE}/chat/completions"
curl -fsS "${BASE}/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${KEY}" \
  -d "{\"model\":\"${MODEL}\",\"temperature\":0,\"max_tokens\":32,\"messages\":[{\"role\":\"user\",\"content\":\"Reply with the single word ready.\"}]}"
echo
