"""Exporta os índices oficiais (calculos/indices/*.csv) para o site: public/fiscal/indices.json."""
import csv
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "calculos" / "indices"
SAIDA = RAIZ / "public" / "fiscal" / "indices.json"


def main():
    out = {}
    for arq in sorted(PASTA.glob("*.csv")):
        if arq.stem.startswith("EXEMPLO"):
            continue
        meta_arq = arq.with_suffix(".meta.json")
        meta = json.loads(meta_arq.read_text(encoding="utf-8")) if meta_arq.exists() else {}
        serie = {r["mes"]: float(r["percentual"]) for r in csv.DictReader(arq.read_text(encoding="utf-8").splitlines())}
        out[arq.stem] = {"fonte": meta.get("fonte", ""), "baixado_em": meta.get("baixado_em", ""),
                         "sha256": meta.get("sha256", ""), "primeiro": min(serie), "ultimo": max(serie), "serie": serie}
    SAIDA.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("indices.json:", {k: f"{v['primeiro']}→{v['ultimo']}" for k, v in out.items()})


if __name__ == "__main__":
    main()
