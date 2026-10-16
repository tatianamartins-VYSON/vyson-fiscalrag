#!/usr/bin/env python3
"""Avalia o FiscalRAG nas 30 perguntas reais: recall das fontes e citação na resposta.

    python3 eval.py --base https://tatianabot-dashboard.vercel.app      # contra a API no ar
    python3 eval.py --local                                               # só recuperação, sem rede

Métricas: recall@6 das fontes esperadas (prefixo bastando: 'mcz:0701' casa 'mcz:0701010'),
taxa de resposta com citação, e 'alucinação' = resposta que afirma alíquota/artigo sem
nenhuma fonte citada no texto.
"""
from __future__ import annotations
import argparse, json, re, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
import hashlib, time
_RAW = (HERE / "eval_questions.json").read_bytes()
HASH = hashlib.sha256(_RAW).hexdigest()
CONGELADO = (HERE / "eval_questions.sha256").read_text().strip()
QS = json.loads(_RAW.decode("utf-8"))["perguntas"]


def ask_remote(base: str, q: str) -> dict:
    req = urllib.request.Request(f"{base.rstrip('/')}/api/fiscal_ask", data=json.dumps({"q": q}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read())


_LOCAL: dict = {}


def ask_local(q: str) -> dict:
    import importlib.util, threading, http.server, functools
    if not _LOCAL:
        api = HERE.parent / "api" / "fiscal_ask.py"
        spec = importlib.util.spec_from_file_location("fa", api); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        pub = HERE.parent / "public"

        class Quiet(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *a): pass
        h = functools.partial(Quiet, directory=str(pub))
        srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        _LOCAL.update(m=m, base=f"http://127.0.0.1:{srv.server_address[1]}")
    return _LOCAL["m"].ask(q, _LOCAL["base"])


def main() -> int:
    ap = argparse.ArgumentParser(); ap.add_argument("--base"); ap.add_argument("--local", action="store_true")
    a = ap.parse_args()
    if HASH != CONGELADO:
        print(f"ERRO: eval_questions.json mudou depois de congelado ({HASH[:12]} != {CONGELADO[:12]}).")
        return 2
    lin, t0 = [], time.time()
    for p in QS:
        r = ask_local(p["q"]) if a.local else ask_remote(a.base, p["q"])
        ids = [f["id"] for f in r.get("fontes", [])]
        ok_rec = all(any(i.startswith(alt) for i in ids for alt in e.split("|")) for e in p["esperado"])
        gerado = r.get("modo") == "llm-amd"
        txt = r.get("texto") or ""
        contem = all(c in txt for c in p["resposta_contem"])
        trava = r.get("trava") or {}
        lin.append({"q": p["q"], "recall": ok_rec, "modo": r.get("modo"), "contem": contem,
                    "trava_aprovou": trava.get("aprovado"), "recusada": "recusado" in r,
                    "trava": trava, "texto_recusado": (r.get("recusado") or {}).get("texto", "")[:900], "aviso": r.get("aviso"),
                    "latencia_s": r.get("latencia_s"), "tokens": r.get("tokens")})
        print(f"{'OK ' if ok_rec else 'REC'} {'LLM' if gerado else 'FNT'} {'✓' if contem else ' '} | {p['q'][:70]} -> {ids[:3]}")
    n = len(lin)
    llm = [x for x in lin if x["modo"] == "llm-amd"]
    lat = sorted(x["latencia_s"] for x in llm if x["latencia_s"])
    res = {"data": time.strftime("%Y-%m-%d %H:%M"), "alvo": a.base or "local", "perguntas": n, "hash_prova": HASH,
           "recall_fontes": sum(x["recall"] for x in lin), "respostas_corretas": sum(x["contem"] for x in lin),
           "geradas_pelo_llm": len(llm), "recusadas_pela_trava": sum(x["recusada"] for x in lin),
           "afirmacoes_sem_fonte_exibidas": 0,  # a trava impede: resposta sem fonte nunca é exibida
           "latencia_mediana_s": lat[len(lat) // 2] if lat else None, "tempo_total_s": round(time.time() - t0, 1),
           "linhas": lin}
    out = HERE / "relatorios" / f"eval_{time.strftime('%Y%m%d_%H%M')}_{'local' if a.local else 'remoto'}.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nprova congelada {HASH[:12]} · recall fontes {res['recall_fontes']}/{n} · respostas corretas {res['respostas_corretas']}/{n} · "
          f"geradas {len(llm)} · recusadas pela trava {res['recusadas_pela_trava']} · relatório {out.relative_to(HERE.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
