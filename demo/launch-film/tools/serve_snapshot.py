"""Capture server for the launch film: the Triright app on :8010, pinned to the Oct 8 snapshot (no live trial fetch, so
the numbers match the film), with /voice/* forwarded to a voice service on :8011. It never touches the team's servers
on :8000/:8001. Run from the repo root with the voice venv:  app/voice/.venv/bin/python demo/launch-film/tools/serve_snapshot.py
"""
import os
import sys
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

os.environ["VERCEL"] = "1"  # app.py then reads trials and cached Claude results from app/snapshot/
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "app"))
import app  # noqa: E402

VOICE = "http://127.0.0.1:8011"


class Handler(app.Handler):
    def proxy(self):
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0)) if self.command == "POST" else None
        req = urllib.request.Request(VOICE + self.path[len("/voice"):], data=body, method=self.command,
                                     headers={"Content-Type": self.headers.get("Content-Type", "application/json")})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                code, data, ctype = r.status, r.read(), r.headers.get("Content-Type", "application/json")
        except urllib.error.HTTPError as e:
            code, data, ctype = e.code, e.read(), e.headers.get("Content-Type", "application/json")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        return self.proxy() if self.path.startswith("/voice/") else super().do_GET()

    def do_POST(self):
        return self.proxy() if self.path.startswith("/voice/") else super().do_POST()


if __name__ == "__main__":
    print(f"{len(app.PATIENTS)} patients, {len(app.TRIALS)} snapshot trials. http://127.0.0.1:8010", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 8010), Handler).serve_forever()
