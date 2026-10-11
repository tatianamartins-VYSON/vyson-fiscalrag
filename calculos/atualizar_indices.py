"""Baixa os índices direto da API oficial do Banco Central (SGS) e grava em calculos/indices/.

Uso:
  python -m calculos.atualizar_indices                 # todas as séries do catálogo
  python -m calculos.atualizar_indices IPCA SELIC      # só algumas
  python -m calculos.atualizar_indices --drive arquivo.csv IPCA   # importa CSV exportado do SGS/Drive

API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.<n>/dados?formato=json&dataInicial=dd/mm/aaaa
(o BCB limita cada consulta a 10 anos, então o download é feito em janelas).
Cada arquivo gerado tem um .meta.json com série, fonte, URL, data do download e SHA-256.
"""
from __future__ import annotations

import csv
import hashlib
import json
import sys
import urllib.request
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo

INDICES_DIR = Path(__file__).parent / "indices"
API = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{n}/dados?formato=json&dataInicial={ini}&dataFinal={fim}"

# nome do arquivo → (série SGS, descrição, primeiro ano útil)
CATALOGO = {
    "IPCA": (433, "IPCA, variação % mensal (IBGE)", 1980),
    "IPCA-E": (10764, "IPCA-E, variação % mensal (IBGE)", 1992),
    "INPC": (188, "INPC, variação % mensal (IBGE)", 1979),
    "IPCA-15": (7478, "IPCA-15, variação % mensal (IBGE)", 2000),
    "IGP-M": (189, "IGP-M, variação % mensal (FGV)", 1989),
    "SELIC": (4390, "SELIC acumulada no mês, % (BCB)", 1986),
    "TR": (7811, "TR mensal, % (BCB)", 1991),
}


def _mes(txt: str) -> str:
    """'01/02/2024' ou '02/2024' → '2024-02'."""
    partes = txt.strip().split("/")
    return f"{partes[-1]}-{partes[-2]}"


def _num(txt: str) -> str:
    return str(Decimal(str(txt).replace(",", ".")))


def baixar_api(serie: int, desde: int) -> list[tuple[str, str]]:
    linhas, ano, hoje = {}, desde, date.today()
    while ano <= hoje.year:
        fim = min(ano + 9, hoje.year)
        url = API.format(n=serie, ini=f"01/01/{ano}", fim=f"31/12/{fim}")
        req = urllib.request.Request(url, headers={"User-Agent": "TatianaBot-calculos/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            for item in json.load(r):
                linhas[_mes(item["data"])] = _num(item["valor"])
        ano = fim + 1
    return sorted(linhas.items())


def ler_csv_sgs(arq: Path) -> list[tuple[str, str]]:
    """CSV exportado do SGS/Google Drive: 1ª linha título, 'mm/aaaa,"0,42"', última linha 'Fonte,...'."""
    out = {}
    for row in csv.reader(arq.read_text(encoding="utf-8-sig").splitlines()):
        if len(row) >= 2 and "/" in row[0] and row[1].strip():
            out[_mes(row[0])] = _num(row[1])
    return sorted(out.items())


def gravar(nome: str, linhas: list[tuple[str, str]], fonte: str, url: str) -> Path:
    INDICES_DIR.mkdir(exist_ok=True)
    arq = INDICES_DIR / f"{nome}.csv"
    corpo = "mes,percentual\n" + "".join(f"{m},{p}\n" for m, p in linhas)
    arq.write_text(corpo, encoding="utf-8")
    meta = {"indice": nome, "fonte": fonte, "url": url, "meses": len(linhas),
            "primeiro": linhas[0][0], "ultimo": linhas[-1][0],
            "baixado_em": datetime.now(ZoneInfo("America/Maceio")).isoformat(timespec="seconds"),
            "sha256": hashlib.sha256(corpo.encode()).hexdigest()}
    (INDICES_DIR / f"{nome}.meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return arq


def validar(linhas: list[tuple[str, str]]) -> list[str]:
    """Meses faltando no meio da série ou valores absurdos."""
    avisos, anterior = [], None
    for m, p in linhas:
        y, mm = map(int, m.split("-"))
        if anterior:
            ey, em = anterior
            esperado = (ey + (em == 12), em % 12 + 1)
            if (y, mm) != esperado:
                avisos.append(f"lacuna antes de {m}")
        if abs(Decimal(p)) > 100:
            avisos.append(f"valor fora do padrão em {m}: {p}%")
        anterior = (y, mm)
    return avisos


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["--drive"]:
        arq, nome = Path(args[1]), args[2]
        serie, desc, _ = CATALOGO[nome]
        linhas = ler_csv_sgs(arq)
        gravar(nome, linhas, f"{desc}; cópia do SGS série {serie} salva no Google Drive", f"drive:{arq.name}")
    else:
        for nome in args or CATALOGO:
            serie, desc, desde = CATALOGO[nome]
            linhas = baixar_api(serie, desde)
            gravar(nome, linhas, f"{desc}; API SGS série {serie}", API.format(n=serie, ini="...", fim="..."))
    for nome in ([args[2]] if args[:1] == ["--drive"] else args or CATALOGO):
        linhas = [tuple(r.split(",")) for r in (INDICES_DIR / f"{nome}.csv").read_text().splitlines()[1:]]
        print(nome, len(linhas), "meses", linhas[0][0], "→", linhas[-1][0], "| avisos:", validar(linhas) or "nenhum")
