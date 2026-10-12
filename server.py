"""Local/container server: static pages from public/ plus the /api/fiscal_ask endpoint (same code Vercel runs)."""
import os
import pathlib
from http.server import ThreadingHTTPServer
from urllib.parse import urlparse

from api.fiscal_ask import handler as Api

PUBLIC = pathlib.Path(__file__).resolve().parent / "public"
TIPOS = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json",
         ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml"}


class App(Api):
    def _base(self) -> str:
        return f"http://localhost:{os.getenv('PORT', '8080')}"

    def do_GET(self):
        path = urlparse(self.path).path
        if path.startswith("/api/fiscal_ask"):
            return super().do_GET()
        if path in ("/", ""):
            path = "/fiscal/perguntar"
        f = (PUBLIC / path.lstrip("/")).resolve()
        if f.is_dir():
            f = f / "index.html"
        if not f.suffix:
            f = f.with_suffix(".html")
        if PUBLIC not in f.parents or not f.is_file():
            return self._send(404, {"erro": "not found"})
        self.send_response(200)
        self.send_header("Content-Type", TIPOS.get(f.suffix, "application/octet-stream"))
        self.end_headers()
        self.wfile.write(f.read_bytes())


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    print(f"Vyson FiscalRAG on http://localhost:{port}/fiscal/perguntar")
    ThreadingHTTPServer(("0.0.0.0", port), App).serve_forever()
