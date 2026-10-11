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
QS = json.loads((HERE / "eval_questions.json").read_text(encoding="utf-8"))["perguntas"]


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
    rec = cit = alu = 0
    for p in QS:
        r = ask_local(p["q"]) if a.local else ask_remote(a.base, p["q"])
        ids = [f["id"] for f in r.get("fontes", [])]
        ok_rec = all(any(i.startswith(alt) for i in ids for alt in e.split("|")) for e in p["esperado"])
        rec += ok_rec
        txt = (r.get("texto") or "") if r.get("modelo") else ""  # só mede respostas geradas pelo LLM
        has_cit = bool(re.search(r"\[[^\]]+\]", txt))
        cit += has_cit
        afirma = bool(re.search(r"\d+(,\d+)?\s*%|art\.|artigo|subitem \d", txt, re.I))
        contem = all(c in txt for c in p["resposta_contem"]) if txt else False
        if txt and afirma and not has_cit:
            alu += 1
        print(f"{'OK ' if ok_rec else 'REC'}{' C' if has_cit else '  '}{' ✓' if contem else '  '} | {p['q'][:70]} -> {ids[:3]}")
    n = len(QS)
    print(f"\nrecall fontes: {rec}/{n}   respostas com citação: {cit}/{n}   alucinações (afirma sem citar): {alu}/{n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
