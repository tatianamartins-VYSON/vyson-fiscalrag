"""FiscalRAG — pergunta em português, resposta com fonte legal.

GET  /api/fiscal_ask?q=...        POST /api/fiscal_ask  {"q": "..."}

Recuperação (BM25) roda aqui, na Vercel, sobre a mesma base pública do Vyson Fiscal
(leis.json, data.json, maceio.json, saopaulo.json). A geração roda num LLM aberto em
GPU AMD (ROCm + vLLM, endpoint compatível com OpenAI), configurado por variáveis:

    RAG_BASE_URL   ex.: http://<ip-da-gpu-amd>:8000/v1
    RAG_API_KEY    chave do vLLM (--api-key)
    RAG_MODEL      ex.: Qwen/Qwen2.5-7B-Instruct
    RAG_GPU        rótulo exibido, ex.: "AMD Instinct MI300X (ROCm 7)"

Sem LLM configurado devolve só as fontes (modo degradado), nunca erro.
Somente biblioteca padrão: a Vercel não instala dependências aqui.
"""

from __future__ import annotations

import json
import math
import os
import pathlib
import re
import time
import urllib.request
from collections import Counter
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

STOP = set(
    """a o os as um uma de do da dos das em no na nos nas e ou que para por com sem
    sobre ao aos à às se não é são ser como mais menos qual quais seu sua seus suas
    este esta isto esse essa isso aquele aquela lei art arts n serviço serviços""".split()
)
_CACHE: dict = {}


def tokenize(text: str) -> list[str]:
    text = re.sub(r"[^a-z0-9áéíóúâêôãõç\s]", " ", text.lower())
    return [t for t in text.split() if t not in STOP and len(t) > 1]


# sinônimos que o contador usa e a lei não
_EXPAND = {
    "devido": ["incidência", "local"], "paga": ["incidência", "isenção", "imunidade"],
    "exportado": ["exportação"], "exportados": ["exportação"], "importado": ["importação", "exterior"],
    "importados": ["importação", "exterior"], "exterior": ["exportação", "importação"],
    "retenção": ["responsável", "tomador"], "tomador": ["responsável", "retenção"],
    "mínima": ["mínima", "8º-a"], "simples": ["simples", "microempresa"],
    "reforma": ["ibs", "cbs"], "software": ["programação", "sistemas", "programas"],
    "empreitada": ["empreitada", "execução", "obra"], "clínica": ["atividades"], "médica": ["medicina"],
}


def expand(ql: str) -> list[str]:
    out: list[str] = []
    for w, alts in _EXPAND.items():
        if w in ql:
            out.extend(alts)
    return out


_LOCAL_DIRS = [
    pathlib.Path(__file__).resolve().parent.parent / "public" / "fiscal",  # dashboard/public/fiscal
    pathlib.Path("/var/task/public/fiscal"),
    pathlib.Path.cwd() / "public" / "fiscal",
]


def _fetch_json(base: str, name: str) -> dict:
    """Lê do disco (bundle da função) e só cai para HTTP se o arquivo não estiver lá."""
    for d in _LOCAL_DIRS:
        p = d / name
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
    # HTTP: primeiro o próprio host; prévias protegidas por login caem para a produção pública
    last: Exception | None = None
    for b in (base, "https://tatianabot-dashboard.vercel.app"):
        try:
            with urllib.request.urlopen(f"{b}/fiscal/{name}", timeout=20) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            last = e
    raise RuntimeError(f"não consegui ler {name}: {last}")


def load_corpus(base: str) -> list[dict]:
    docs: list[dict] = []
    leis = _fetch_json(base, "leis.json")
    for n in leis["normas"]:
        titulo = f"{n.get('tipo', '')} {n.get('numero', '')} ({n.get('ano', '')})".strip()
        texto = " ".join(
            str(p) for p in [n.get("ementa", ""), "Temas: " + ", ".join(n.get("temas", [])),
                             "Tributos: " + ", ".join(n.get("tributos", [])),
                             " ".join(n.get("casos", [])), n.get("vigencia", "")] if p
        )
        docs.append({"id": f"lei:{n['id']}", "titulo": titulo, "texto": texto,
                     "url": n.get("link", ""), "tipo": "norma", "status": n.get("status", "")})
    data = _fetch_json(base, "data.json")
    for cod, nome in data.get("items", {}).items():
        docs.append({"id": f"lc116:{cod}", "titulo": f"LC 116/2003 item {cod}", "texto": nome,
                     "url": "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm", "tipo": "lc116"})
    for row in data.get("ct", []):
        if len(row) >= 2 and row[0] and row[1]:
            c = row[0]
            sub = f"{int(c[:2])}.{c[2:4]}"
            docs.append({"id": f"lc116:{sub}", "titulo": f"LC 116/2003 subitem {sub}", "texto": row[1],
                         "url": "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm", "tipo": "lc116"})
    for cod, vals in data.get("cls", {}).items():
        docs.append({"id": f"cls:{cod}", "titulo": f"Classificação tributária {cod} (IBS/CBS)",
                     "texto": " | ".join(str(v) for v in vals if v), "url": "", "tipo": "reforma"})
    for name, cidade, fonte in (("maceio.json", "Maceió", "GISS Online"), ("saopaulo.json", "São Paulo", "IN SF/SUREM 08/2011")):
        try:
            m = _fetch_json(base, name)
        except Exception:  # noqa: BLE001
            continue
        for it in m.get("itens", []):
            if it.get("fim"):
                continue
            docs.append({"id": f"{'mcz' if cidade == 'Maceió' else 'sp'}:{it['c']}",
                         "titulo": f"ISS {cidade} código {it['c']} (LC 116 item {it.get('i', '')})",
                         "texto": f"{it.get('d', '')} Alíquota de ISS em {cidade}: {it.get('a')}%. "
                                  f"Fonte: {fonte}. Vigência desde {it.get('ini', '')}.",
                         "url": "", "tipo": "municipal"})
    seen: set[str] = set()
    uniq = []
    for d in docs:
        if d["id"] not in seen:
            seen.add(d["id"]); uniq.append(d)
    return uniq


class BM25:
    def __init__(self, docs: list[dict], k1: float = 1.5, b: float = 0.75):
        self.docs, self.k1, self.b = docs, k1, b
        self.tf = [Counter(tokenize(d["titulo"] + " " + d["texto"])) for d in docs]
        self.dl = [sum(t.values()) for t in self.tf]
        self.avgdl = sum(self.dl) / max(1, len(self.dl))
        df: Counter = Counter()
        for t in self.tf:
            df.update(t.keys())
        n = len(docs)
        self.idf = {w: math.log(1 + (n - f + 0.5) / (f + 0.5)) for w, f in df.items()}

    def search(self, q: str, k: int = 6) -> list[tuple[float, dict]]:
        ql = q.lower()
        qt = tokenize(q) + expand(ql)
        # pistas da pergunta: onde o contador quer a resposta
        quer_lc = bool(re.search(r"lc\s*116|subitem|item da lista|lista de serviços", ql))
        quer_lei = bool(re.search(r"\blei\b|emenda|constitui|decreto|instrução|base legal|jurisprud", ql))
        cidade = "mcz" if "maceió" in ql or "maceio" in ql else ("sp" if "são paulo" in ql or "sao paulo" in ql else "")
        quer_aliq = "alíquota" in ql or "aliquota" in ql
        out = []
        for tf, dl, d in zip(self.tf, self.dl, self.docs):
            s = 0.0
            for w in qt:
                f = tf.get(w)
                if f:
                    s += self.idf[w] * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * dl / self.avgdl))
            if s <= 0:
                continue
            tipo = d.get("tipo")
            if d.get("status") and d["status"] != "vigente":
                s *= 0.6  # revogada
            if tipo == "norma" and d["texto"].lower().startswith("altera"):
                s *= 0.8  # lei que altera perde para a lei original
            if quer_lc and tipo == "lc116":
                s *= 1.5
            if quer_lei and tipo == "norma":
                s *= 1.4
            if cidade:
                if tipo == "municipal":
                    s *= 1.5 if d["id"].startswith(cidade) else 0.5
            elif tipo == "municipal" and not quer_aliq:
                s *= 0.8  # sem cidade e sem alíquota, o código municipal raramente é a resposta
            out.append((s, d))
        out.sort(key=lambda x: -x[0])
        return out[:k]


def index_for(base: str) -> BM25:
    if "idx" not in _CACHE or time.time() - _CACHE.get("t", 0) > 3600:
        _CACHE["idx"] = BM25(load_corpus(base))
        _CACHE["t"] = time.time()
    return _CACHE["idx"]


SYSTEM = (
    "Você é um assistente fiscal brasileiro para contadores. Responda em português, de forma "
    "direta, com base nos trechos fornecidos. Os trechos foram recuperados para esta pergunta: "
    "use o mais específico deles para responder, mesmo que a pergunta use outras palavras "
    "(ex.: 'software' corresponde a 'programação'; 'alíquota em Maceió' corresponde a um trecho "
    "'ISS Maceió código ...'). Comece pela resposta (alíquota, item da LC 116, código ou artigo), "
    "depois explique em 1 a 3 frases. Cite cada fonte usada entre colchetes com o título exato do "
    "trecho, ex.: [LC 116/2003 subitem 1.02] ou [ISS Maceió código 0102010]. Se houver mais de um "
    "código possível, liste as opções com a alíquota de cada uma. Só diga 'A base consultada não "
    "cobre esta pergunta.' se nenhum trecho tratar do assunto. Nunca invente alíquota, artigo ou "
    "número de lei que não esteja nos trechos. Termine com uma linha 'Fontes:' listando os títulos usados."
)


def call_llm(question: str, hits: list[tuple[float, dict]]) -> dict | None:
    base, key, model = os.getenv("RAG_BASE_URL"), os.getenv("RAG_API_KEY", "x"), os.getenv("RAG_MODEL")
    if not (base and model):
        return None
    ctx = "\n\n".join(f"[{d['titulo']}] {d['texto']}" for _, d in hits)
    body = json.dumps({"model": model, "temperature": 0.1, "max_tokens": 700,
                       "messages": [{"role": "system", "content": SYSTEM},
                                    {"role": "user", "content": f"Trechos:\n{ctx}\n\nPergunta: {question}"}]}).encode()
    req = urllib.request.Request(f"{base.rstrip('/')}/chat/completions", data=body, method="POST",
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                                          # o proxy do RunPod (Cloudflare) recusa o User-Agent padrão do urllib
                                          "User-Agent": "VysonFiscalRAG/1.0"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=60) as r:
        j = json.loads(r.read().decode("utf-8"))
    return {"texto": j["choices"][0]["message"]["content"], "modelo": model,
            "latencia_s": round(time.time() - t0, 2), "tokens": j.get("usage", {}).get("completion_tokens")}


def resposta_extrativa(hits: list[tuple[float, dict]]) -> str:
    """Sem GPU: resposta montada só com os trechos oficiais recuperados (nada é gerado)."""
    if not hits:
        return "A base consultada não cobre esta pergunta."
    top = hits[0][1]
    linhas = [f"Pela fonte oficial mais próxima da sua pergunta: {top['texto'][:300].strip()} [{top['titulo']}]"]
    outras = [d for _, d in hits[1:3]]
    if outras:
        linhas.append("\nOutras opções a conferir:")
        linhas += [f"- {d['texto'][:160].strip()} [{d['titulo']}]" for d in outras]
    return "\n".join(linhas)


_CITA = re.compile(r"\[([^\]]+)\]")
_AFIRMA = re.compile(r"\d+(?:[,.]\d+)?\s*%|\bart(?:igo)?\.?\s*\d|\bsubitem\b|\bc[óo]digo\s*\d|\bLC\s*\d|\bLei\s*n?º?\s*\d|\bal[íi]quota\b", re.I)


def trava_citacao(texto: str, titulos: list[str]) -> dict:
    """Trava determinística: toda frase que afirma alíquota, artigo, código ou lei precisa citar,
    entre colchetes, o título exato de um trecho recuperado. Título desconhecido também reprova.
    Confere cobertura e validade das citações; não garante que a conclusão esteja certa."""
    conhecidos = set(titulos)
    unidades, sem_fonte, desconhecidas = 0, [], []
    for linha in (texto or "").splitlines():
        ln = linha.strip().lstrip("-*• ").strip()
        if not ln or ln.lower().startswith("fontes") or ln.startswith("#"):
            continue
        for frase in re.split(r"(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])", ln):
            cit = _CITA.findall(frase)
            desconhecidas += [c for c in cit if c not in conhecidos]
            if _AFIRMA.search(_CITA.sub("", frase)):
                unidades += 1
                if not any(c in conhecidos for c in cit):
                    sem_fonte.append(frase[:160])
    return {"aprovado": not sem_fonte and not desconhecidas, "afirmacoes": unidades,
            "sem_fonte": sem_fonte, "citacoes_desconhecidas": sorted(set(desconhecidas))}


def saude() -> dict:
    on = bool(os.getenv("RAG_BASE_URL") and os.getenv("RAG_MODEL"))
    return {"ok": True, "modo": "llm-amd" if on else "fontes", "modelo": os.getenv("RAG_MODEL", "") if on else "",
            "gpu": os.getenv("RAG_GPU", "") if on else "",
            "trava": "toda afirmação cita um trecho oficial recuperado; senão a resposta gerada é recusada"}


def ask(question: str, base: str, k: int = 6) -> dict:
    q = (question or "").strip()[:500]
    if len(q) < 4:
        return {"erro": "Pergunta muito curta."}
    idx = index_for(base)
    t0 = time.time()
    hits = idx.search(q, k=k)
    out = {
        "pergunta": q,
        "fontes": [{"id": d["id"], "titulo": d["titulo"], "trecho": d["texto"][:400], "url": d.get("url", ""),
                    "score": round(s, 2)} for s, d in hits],
        "recuperacao_s": round(time.time() - t0, 3),
        "corpus": len(idx.docs),
        "gpu": os.getenv("RAG_GPU", ""),
    }
    try:
        llm = call_llm(q, hits) if hits else None
    except Exception as e:  # noqa: BLE001
        llm = None
        detalhe = f" {e.code}" if hasattr(e, "code") else ""
        out["aviso"] = f"LLM indisponível ({type(e).__name__}{detalhe}); exibindo só as fontes."
    if llm:
        trava = trava_citacao(llm["texto"], [d["titulo"] for _, d in hits])
        out["trava"] = trava
        if not trava["aprovado"]:
            out["aviso"] = "Resposta do modelo recusada pela trava de citação; exibindo só as fontes oficiais."
            out["recusado"] = {"texto": llm["texto"], "modelo": llm["modelo"]}
            llm = None
    if llm:
        out.update(llm)
        out["modo"] = "llm-amd"
        # citações efetivas: só as fontes cujo título aparece na resposta
        usadas = [f for f in out["fontes"] if f["titulo"] in llm["texto"]]
        out["citadas"] = usadas or out["fontes"][:2]
    else:
        out.setdefault("aviso", "LLM não configurado; exibindo só as fontes recuperadas.")
        out["texto"] = resposta_extrativa(hits)
        out["modo"] = "fontes"
    return out


class handler(BaseHTTPRequestHandler):
    def _base(self) -> str:
        host = self.headers.get("x-forwarded-host") or self.headers.get("host", "localhost")
        proto = self.headers.get("x-forwarded-proto", "https")
        return f"{proto}://{host}"

    def _send(self, code: int, payload: dict) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    def _ask(self, q: str) -> None:
        try:
            self._send(200, ask(q, self._base()))
        except Exception as e:  # noqa: BLE001
            self._send(500, {"erro": f"{type(e).__name__}: {e}"[:300]})

    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        if "health" in qs or urlparse(self.path).path.endswith("/health"):
            return self._send(200, saude())
        self._ask(parse_qs(urlparse(self.path).query).get("q", [""])[0])

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0) or 0)
        try:
            body = json.loads(self.rfile.read(n) or b"{}")
        except json.JSONDecodeError:
            return self._send(400, {"erro": "JSON inválido"})
        self._ask(body.get("q", ""))

    def log_message(self, *a):  # silencioso
        pass
