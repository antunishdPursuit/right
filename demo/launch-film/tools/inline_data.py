"""Writes the film's data block into index.html, between the /*DATA*/ markers: element rectangles from the UI
capture, plus the 54 snapshot trials and a sample of their parsed criteria for the opening.
  app/voice/.venv/bin/python demo/launch-film/tools/inline_data.py
"""
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
FILM = ROOT / "demo/launch-film"
os.environ["VERCEL"] = "1"  # read the Oct 8 snapshot, never the live registry
sys.path.insert(0, str(ROOT / "app"))
import app  # noqa: E402


def short(s, n):
    s = " ".join(s.split())
    return s if len(s) <= n else s[: n - 1].rsplit(" ", 1)[0] + "…"


def no_live_calls():
    raise RuntimeError("snapshot cache miss; refusing a live Claude call")


app.get_client = no_live_calls
summaries = [app.summarize(t) for t in app.TRIALS]
criteria = [c["criterion"] for s in summaries for c in s["inclusion"] + s["exclusion"]]
data = {
    "rects": json.loads((FILM / "assets/ui/rects.json").read_text())["rects"],
    "trials": [{"id": t["nctId"], "t": short(t["title"], 52)} for t in app.TRIALS],
    "nCriteria": len(criteria),
    "lines": [short(c, 70) for c in criteria[::max(1, len(criteria) // 84)]][:84],
}
assert len(data["trials"]) == 54 and data["nCriteria"] == 769, (len(data["trials"]), data["nCriteria"])
html = (FILM / "index.html").read_text()
block = "/*DATA*/ " + json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + " /*END DATA*/"
html, n = re.subn(r"/\*DATA\*/.*?/\*END DATA\*/", lambda m: block, html, flags=re.S)
assert n == 1, "index.html needs one /*DATA*/ ... /*END DATA*/ block"
(FILM / "index.html").write_text(html)
print("inlined", len(data["trials"]), "trials,", data["nCriteria"], "criteria,", len(data["rects"]), "UI states")
