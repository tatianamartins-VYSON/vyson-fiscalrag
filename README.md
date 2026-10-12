# Vyson FiscalRAG: cited tax answers on AMD Instinct GPUs

Ask a Brazilian tax question in plain Portuguese and get the rate, the service code and the law,
**every statement cited to an official source**. Built for the AMD Developer Hackathon ACT III
(lablab.ai) by Tatiana Tenório, accountant and court expert (Vyson Fyconsult, Maceió, Brazil).

- Pitch video (2 min 19 s): https://youtu.be/Kjyhllysrgs
- Home with all modules: https://tatianabot-dashboard.vercel.app/fiscal/painel
- Live demo: https://tatianabot-dashboard.vercel.app/fiscal/perguntar
- Monetary-correction calculator (official indices): https://tatianabot-dashboard.vercel.app/fiscal/calculadora
- Legislation updates (agent, every 6 h): https://tatianabot-dashboard.vercel.app/fiscal/novidades
- Companion app by the same author, Precatórios Nacional (court-ordered debt calculations, in testing): https://calculadora-precatorios-nacional.vercel.app/app/

## How it works

```
browser ─► /fiscal/perguntar (static page)
             │ POST /api/fiscal_ask {q}
             ▼
      api/fiscal_ask.py  (Python stdlib only)
        ├─ corpus: public/fiscal/leis.json (85 federal laws + case law), data.json (full LC 116
        │          list, IBS/CBS), maceio.json (906 codes), saopaulo.json (410 codes) = 1,533 docs
        ├─ BM25 retrieval with accountant synonyms, ~4 ms
        └─ POST {RAG_BASE_URL}/chat/completions ─► vLLM on ROCm, AMD Instinct GPU
                                                     Qwen/Qwen2.5-7B-Instruct
           answer + cited titles ◄────────────────┘
      citations kept only when the source title appears in the answer;
      GPU off → answer built only from official passages (nothing generated)
```

Production test on an **AMD Instinct MI350X**: "ISS on software in Maceió?" → **2%, code 0102010**, cited, in **0.77 s**.

## Run in a container

```bash
docker build -t vyson-fiscalrag .
docker run -p 8080:8080 -e RAG_BASE_URL=http://<amd-gpu>:8000/v1 -e RAG_API_KEY=... \
  -e RAG_MODEL=Qwen/Qwen2.5-7B-Instruct vyson-fiscalrag
# open http://localhost:8080/fiscal/perguntar
```
Without `RAG_BASE_URL` it still answers by quoting the official passages. Secrets only come from environment variables.

## Run on the AMD GPU

1. **AMD GPU** (ROCm): `VLLM_API_KEY=... bash gpu_amd/serve_vllm.sh` (Qwen2.5-7B-Instruct on vLLM, port 8000).
2. **API** environment variables: `RAG_BASE_URL=http://<gpu>:8000/v1`, `RAG_API_KEY`, `RAG_MODEL=Qwen/Qwen2.5-7B-Instruct`, `RAG_GPU="AMD Instinct MI350X (ROCm, vLLM)"`.
3. **Evaluation** (30 real accountant questions): `python3 avaliacao/eval.py --local` (retrieval only) or `--base <deployed site>`.

| Round | Source recall (top 6) | Cited answers | Claims without source |
|---|---|---|---|
| Retrieval only (local) | 27/30 | n/a | n/a |
| With Qwen on AMD GPU | first production answer correct and cited | to be measured on all 30 | target 0 |

## Official data

- `calculos/atualizar_indices.py`: IPCA, IPCA-E, INPC, IPCA-15, IGP-M, SELIC and TR from the Central Bank SGS API, each saved with source, download date and SHA-256 (`calculos/indices/*.meta.json`). IPCA and INPC are cross-checked against IBGE.
- `public/fiscal/calculo.js` + `calculadora.html`: monetary correction with exact integer arithmetic (factor with 9 decimals, half-up each month, values in cents), deflation, simple interest and a printable calculation memo.
- `legislacao/agente.py`: checks Senate and Chamber open data and municipal gazettes (Querido Diário), and sorts new tax laws by topic (ISS, IBS/CBS, PIS/Cofins/CSLL, income tax, Simples, taxpayer procedure, interest/SELIC, special regimes).

## License

MIT for the code. Legal texts and indices belong to their official publishers. The content is informational: always check the official norm.
