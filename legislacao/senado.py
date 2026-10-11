"""Legislação federal pela API de Dados Abertos do Senado (oficial, sem cadastro, sem bloqueio anti-robô).

Uso: python -m legislacao.senado              # leis complementares e leis do ano + LC 214/2025 e LC 116/2003
Endpoints:
  https://legis.senado.leg.br/dadosabertos/legislacao/lista.json?tipo=LCP&ano=2025
  https://legis.senado.leg.br/dadosabertos/legislacao/LCP/2025/214.json
"""
import json
import re
import urllib.request
from datetime import date
from pathlib import Path

BASE = "https://legis.senado.leg.br/dadosabertos/legislacao"
UA = {"User-Agent": "TatianaBot-legislacao/1.0", "Accept": "application/json"}
TEMAS = re.compile(r"tribut|imposto|\b(iss|ibs|cbs|pis|cofins|csll|selic)\b|contribuição social|simples nacional|juros|correção monetária|contribuinte", re.I)


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.load(r)


def documentos(obj):
    """Acha, em qualquer nível do JSON, os registros que têm ementa (cada um é uma norma)."""
    if isinstance(obj, dict):
        if any("ementa" in k.lower() for k in obj):
            yield obj
        for v in obj.values():
            yield from documentos(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from documentos(v)


def campo(d, *nomes):
    for k, v in d.items():
        if (k.lower() in nomes or any(n in k.lower() for n in nomes if n == "ementa")) and isinstance(v, (str, int)):
            return str(v)
    return ""


def resumo(d):
    return {"norma": campo(d, "descricao", "nome", "normanome", "identificacao", "tipo"),
            "numero": campo(d, "numero"), "data": campo(d, "dataassinatura", "data", "datapublicacao"),
            "ementa": campo(d, "ementa")[:220], "chaves": sorted(d)[:12]}


if __name__ == "__main__":
    banco, ano = {}, date.today().year
    for tipo in ("LCP", "LEI"):
        dados = get(f"{BASE}/lista.json?tipo={tipo}&ano={ano}")
        docs = [resumo(d) for d in documentos(dados)]
        tributarias = [d for d in docs if TEMAS.search(d["ementa"])]
        print(f"\n== {tipo} {ano}: {len(docs)} normas, {len(tributarias)} com tema tributário")
        if docs:
            print("   campos disponíveis:", docs[0]["chaves"])
        for d in tributarias[:8]:
            print(f"   {d['data']} | {d['norma']} {d['numero']} | {d['ementa']}")
        banco[f"{tipo}_{ano}"] = docs
    for tipo, a, n in (("LCP", 2025, 214), ("LCP", 2003, 116)):
        det = get(f"{BASE}/{tipo}/{a}/{n}.json")
        d = next(documentos(det), {})
        print(f"\n== {tipo} {n}/{a}: {resumo(d)['ementa'] if d else 'sem ementa'}")
        if not d:
            print("   estrutura:", json.dumps(det, ensure_ascii=False)[:600])
        banco[f"{tipo}_{n}_{a}"] = det
    Path("legislacao/banco_senado.json").write_text(json.dumps(banco, ensure_ascii=False, indent=2), encoding="utf-8")
