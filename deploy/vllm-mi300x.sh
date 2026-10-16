#!/usr/bin/env bash
# Serve an OpenAI-compatible vLLM endpoint on AMD Instinct (MI300X) with ROCm.
# Run this on the GPU machine, not on a laptop.
#
# Recommended model: Qwen/Qwen2.5-7B-Instruct
#   Open weights, no gating, reliable JSON for the floor agent, comfortable on one MI300X.
# Quality option:  VLLM_MODEL=Qwen/Qwen2.5-32B-Instruct
# Llama option:    VLLM_MODEL=meta-llama/Llama-3.1-8B-Instruct  (gated; export HF_TOKEN)
#
# Image: vllm/vllm-openai-rocm (official). The older rocm/vllm images are deprecated.
set -euo pipefail

MODEL="${VLLM_MODEL:-Qwen/Qwen2.5-7B-Instruct}"
PORT="${VLLM_PORT:-8000}"
IMAGE="${VLLM_IMAGE:-vllm/vllm-openai-rocm:latest}"
MAX_LEN="${VLLM_MAX_MODEL_LEN:-8192}"

if [[ ! -e /dev/kfd || ! -e /dev/dri ]]; then
  echo "No /dev/kfd or /dev/dri. This script has to run on an AMD GPU host with the ROCm driver loaded." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed." >&2
  exit 1
fi

echo "Pulling ${IMAGE}"
docker pull "${IMAGE}"

echo "Serving ${MODEL} on port ${PORT}"
echo "First completion compiles HIP kernels and can take about a minute on gfx942 (MI300X)."

exec docker run --name vitrine-vllm --rm \
  --group-add=video \
  --cap-add=SYS_PTRACE \
  --security-opt seccomp=unconfined \
  --device /dev/kfd \
  --device /dev/dri \
  -v "${HOME}/.cache/huggingface:/root/.cache/huggingface" \
  --env "HF_TOKEN=${HF_TOKEN:-}" \
  -p "${PORT}:8000" \
  --ipc=host \
  "${IMAGE}" \
  --model "${MODEL}" \
  --host 0.0.0.0 \
  --port 8000 \
  --max-model-len "${MAX_LEN}"
