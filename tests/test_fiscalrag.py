"""Testes da trava de citação, do modo exibido e da prova congelada (sem GPU, sem rede externa)."""
import hashlib
import importlib.util
import json
import pathlib
import sys
import unittest

RAIZ = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))
from api import fiscal_ask as fa  # noqa: E402

sys.path.insert(0, str(RAIZ / "avaliacao"))
spec = importlib.util.spec_from_file_location("ev", RAIZ / "avaliacao" / "eval.py")
ev = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ev)

T = ["ISS Maceió código 0102010", "LC 116/2003 subitem 1.02"]


class Trava(unittest.TestCase):
    def test_aprova_afirmacao_citada(self):
        r = fa.trava_citacao("A alíquota é 2% [ISS Maceió código 0102010].\nFontes: ISS Maceió código 0102010", T)
        self.assertTrue(r["aprovado"])
        self.assertEqual(r["afirmacoes"], 1)

    def test_recusa_afirmacao_sem_fonte(self):
        r = fa.trava_citacao("A alíquota é 5%. Programação está no subitem 1.02 [LC 116/2003 subitem 1.02].", T)
        self.assertFalse(r["aprovado"])
        self.assertEqual(len(r["sem_fonte"]), 1)

    def test_recusa_citacao_inventada(self):
        r = fa.trava_citacao("A alíquota é 2% [Lei 99.999/2030 art. 7].", T)
        self.assertFalse(r["aprovado"])
        self.assertIn("Lei 99.999/2030 art. 7", r["citacoes_desconhecidas"])

    def test_frase_sem_afirmacao_nao_precisa_citar(self):
        self.assertTrue(fa.trava_citacao("Confira com o seu contador.", T)["aprovado"])


class Modo(unittest.TestCase):
    def setUp(self):
        ev.ask_local("aquecer índice")  # sobe o servidor local de arquivos e carrega o corpus

    def _ask(self, texto):
        orig = fa.call_llm
        ev._LOCAL["m"].call_llm = lambda q, h: None if texto is None else {
            "texto": texto(h), "modelo": "teste", "latencia_s": 0.1, "tokens": 10}
        try:
            return ev._LOCAL["m"].ask("Qual a alíquota de ISS em Maceió para programação de software?", ev._LOCAL["base"])
        finally:
            ev._LOCAL["m"].call_llm = orig

    def test_sem_gpu_modo_fontes(self):
        r = self._ask(None)
        self.assertEqual(r["modo"], "fontes")

    def test_llm_citado_passa(self):
        r = self._ask(lambda h: f"A alíquota é 2% [{h[0][1]['titulo']}].")
        self.assertEqual(r["modo"], "llm-amd")
        self.assertTrue(r["trava"]["aprovado"])

    def test_llm_sem_fonte_recusado(self):
        r = self._ask(lambda h: "A alíquota é 5% em todo o Brasil.")
        self.assertEqual(r["modo"], "fontes")
        self.assertIn("recusado", r)

    def test_saude_mostra_modo(self):
        self.assertIn(fa.saude()["modo"], ("fontes", "llm-amd"))


class Prova(unittest.TestCase):
    def test_prova_congelada(self):
        raw = (RAIZ / "avaliacao" / "eval_questions.json").read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), (RAIZ / "avaliacao" / "eval_questions.sha256").read_text().strip())
        self.assertEqual(len(json.loads(raw)["perguntas"]), 30)

    def test_recuperacao_minima(self):
        ok = 0
        for p in ev.QS:
            ids = [f["id"] for f in ev.ask_local(p["q"])["fontes"]]
            ok += all(any(i.startswith(a) for i in ids for a in e.split("|")) for e in p["esperado"])
        self.assertGreaterEqual(ok, 27)


if __name__ == "__main__":
    unittest.main()
