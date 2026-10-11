"""Agente de busca de legislação (roda sozinho no GitHub a cada 6 horas).

Fontes oficiais, sem cadastro e sem bloqueio anti-robô:
  - Senado Dados Abertos: leis complementares e leis federais do ano;
  - Câmara Dados Abertos: projetos de lei complementar (PLP) em tramitação;
  - Querido Diário: diários oficiais de Maceió e São Paulo que citam ISS.
Compara com legislacao/visto.json, grava as novidades em legislacao/novidades.md e marca as tributárias.
"""
import json
import re
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from legislacao.senado import TEMAS, documentos, resumo

PASTA = Path(__file__).parent
VISTO = PASTA / "visto.json"
UA = {"User-Agent": "TatianaBot-legislacao/1.0", "Accept": "application/json"}
CIDADES = {"2704302": "Maceió", "3550308": "São Paulo"}
SITE = PASTA.parent / "public" / "fiscal"
# triagem: cada novidade vai para a gaveta certa da ficha tributária
GAVETAS = [
    ("ISS (municipal)", r"\biss\b|imposto sobre serviços|lei complementar n?º? ?116"),
    ("Reforma Tributária: IBS e CBS", r"\b(ibs|cbs)\b|bens e serviços|comitê gestor|imposto seletivo"),
    ("PIS, Cofins e CSLL", r"\b(pis|pasep|cofins|csll)\b|lucro líquido"),
    ("Imposto de Renda", r"imposto sobre a renda|imposto de renda|\birpf?\b|\birpj\b"),
    ("Simples Nacional", r"simples nacional|microempresa|pequeno porte|\bmei\b"),
    ("Processo e direitos do contribuinte", r"contribuinte|processo administrativo|controvérsia|código tributário"),
    ("Juros, SELIC e correção (calculadora)", r"\bselic\b|juros|correção monetária|taxa legal|atualização monetária"),
    ("Regimes especiais e benefícios", r"regime especial|benefício|isenção|incentivo|redução de alíquota"),
]


def gaveta(texto):
    return [nome for nome, rx in GAVETAS if re.search(rx, texto, re.I)] or ["Outros tributários"]


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.load(r)


def senado(ano):
    for tipo in ("LCP", "LEI"):
        for d in documentos(get(f"https://legis.senado.leg.br/dadosabertos/legislacao/lista.json?tipo={tipo}&ano={ano}")):
            r = resumo(d)
            yield {"id": f"senado:{tipo}:{r['numero']}:{ano}", "fonte": "Senado (lei publicada)",
                   "titulo": f"{r['norma']} {r['numero']}", "data": r["data"], "ementa": r["ementa"],
                   "link": f"https://legis.senado.leg.br/norma/{d.get('id', '')}"}


def camara(ano):
    url = f"https://dadosabertos.camara.leg.br/api/v2/proposicoes?siglaTipo=PLP&ano={ano}&ordem=DESC&ordenarPor=id&itens=50"
    for p in get(url).get("dados", []):
        yield {"id": f"camara:{p['id']}", "fonte": "Câmara (projeto em tramitação)",
               "titulo": f"PLP {p['numero']}/{p['ano']}", "data": "", "ementa": p.get("ementa", "")[:220],
               "link": f"https://www.camara.leg.br/propostas-legislativas/{p['id']}"}


def diarios(desde):
    for cod, cidade in CIDADES.items():
        q = urllib.parse.urlencode({"territory_ids": cod, "querystring": "ISS", "published_since": desde, "size": 20})
        for g in get(f"https://queridodiario.ok.org.br/api/gazettes?{q}").get("gazettes", []):
            yield {"id": f"diario:{cod}:{g['date']}:{g.get('edition', '')}", "fonte": f"Diário Oficial de {cidade}",
                   "titulo": f"Diário de {cidade} {g['date']}", "data": g["date"],
                   "ementa": " … ".join(g.get("excerpts", [])[:1])[:220] or "menciona ISS", "link": g.get("url", ""),
                   "tributaria": True}


def main():
    hoje = datetime.now(ZoneInfo("America/Maceio"))
    visto = set(json.loads(VISTO.read_text())) if VISTO.exists() else set()
    primeira_vez = not visto
    itens, erros = [], []
    for nome, gerador in (("Senado", senado(hoje.year)), ("Câmara", camara(hoje.year)),
                          ("Querido Diário", diarios((hoje - timedelta(days=30)).date().isoformat()))):
        try:
            itens += list(gerador)
        except Exception as e:  # noqa: BLE001
            erros.append(f"{nome}: {e}")
    novos = [i for i in itens if i["id"] not in visto]
    for i in novos:
        i["tributaria"] = i.get("tributaria") or bool(TEMAS.search(i["ementa"]))
    trib = [i for i in novos if i["tributaria"]]
    for i in itens:
        i["tributaria"] = i.get("tributaria") or bool(TEMAS.search(i["ementa"]))
        i["gavetas"] = gaveta(i["titulo"] + " " + i["ementa"]) if i["tributaria"] else []
    # alimenta o site: todas as normas tributárias conhecidas, por gaveta, mais recentes primeiro
    painel = {"atualizado_em": hoje.isoformat(timespec="minutes"), "novos_nesta_rodada": len(trib),
              "gavetas": {}}
    for i in sorted((x for x in itens if x["tributaria"]), key=lambda x: x["data"][-4:] + x["data"][3:5] + x["data"][:2]
                    if "/" in x["data"] else x["data"].replace("-", ""), reverse=True):
        for g in i["gavetas"]:
            painel["gavetas"].setdefault(g, []).append({k: i[k] for k in ("titulo", "fonte", "data", "ementa", "link")}
                                                       | {"novo": i["id"] not in visto and not primeira_vez})
    SITE.mkdir(parents=True, exist_ok=True)
    (SITE / "novidades.json").write_text(json.dumps(painel, ensure_ascii=False, indent=1), encoding="utf-8")
    linhas = [f"# Novidades de legislação: {hoje:%d/%m/%Y %H:%M} (Maceió)", "",
              f"Fontes consultadas: {len(itens)} itens. Novos: {len(novos)}. Tributários: {len(trib)}.", ""]
    if primeira_vez:
        linhas += ["Primeira execução: base criada, sem alerta (tudo foi marcado como já visto).", ""]
    for i in (trib if not primeira_vez else trib[:20]):
        linhas.append(f"- **{i['titulo']}** ({i['fonte']}{', ' + i['data'] if i['data'] else ''}): {i['ementa']} [link]({i['link']})")
    if erros:
        linhas += ["", "Fontes com erro nesta rodada:", *[f"- {e}" for e in erros]]
    (PASTA / "novidades.md").write_text("\n".join(linhas) + "\n", encoding="utf-8")
    VISTO.write_text(json.dumps(sorted(visto | {i["id"] for i in itens}), ensure_ascii=False, indent=0))
    print("\n".join(linhas))
    alerta = bool(trib) and not primeira_vez
    Path(PASTA / ".alerta").write_text("1" if alerta else "0")


if __name__ == "__main__":
    main()
