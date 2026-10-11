#!/usr/bin/env bash
# Sobe o LLM do FiscalRAG numa GPU AMD (ROCm) com vLLM, expondo um endpoint
# compatível com OpenAI em :8000. Rodar na máquina com a GPU (devcloud MI300X,
# RunPod MI300X ou qualquer host ROCm com Docker).
#
#   export VLLM_API_KEY=<uma-chave-longa>       # a mesma vai em RAG_API_KEY na Vercel
#   bash serve_vllm.sh                          # modelo padrão: Qwen/Qwen2.5-7B-Instruct
#   MODEL=Qwen/Qwen2.5-14B-Instruct bash serve_vllm.sh
#
# Teste: curl -s localhost:8000/v1/models -H "Authorization: Bearer $VLLM_API_KEY"
set -euo pipefail
MODEL="${MODEL:-Qwen/Qwen2.5-7B-Instruct}"
: "${VLLM_API_KEY:?defina VLLM_API_KEY}"
mkdir -p "$HOME/hf-cache"
docker run -d --name fiscalrag-llm --restart unless-stopped \
  --device=/dev/kfd --device=/dev/dri --group-add video --ipc=host --shm-size 16g \
  -p 8000:8000 -v "$HOME/hf-cache:/root/.cache/huggingface" \
  -e HF_HUB_ENABLE_HF_TRANSFER=1 \
  rocm/vllm:latest \
  vllm serve "$MODEL" --host 0.0.0.0 --port 8000 --api-key "$VLLM_API_KEY" \
    --dtype bfloat16 --max-model-len 8192 --gpu-memory-utilization 0.85
echo "subindo $MODEL; acompanhe com: docker logs -f fiscalrag-llm"
echo "na Vercel: RAG_BASE_URL=http://<ip-publico>:8000/v1  RAG_MODEL=$MODEL  RAG_API_KEY=<chave>  RAG_GPU='AMD Instinct MI300X (ROCm)'"
