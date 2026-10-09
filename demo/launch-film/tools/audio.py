"""ElevenLabs audio for the launch film: narration lines (with word timings), a music bed, and a few UI sounds.
Reads ELEVENLABS_API_KEY from the repo's git-ignored .env. Results are cached by file, so re-runs cost nothing.
  python3 demo/launch-film/tools/audio.py vo|music|sfx
"""
import base64
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
FILM = ROOT / "demo/launch-film"
OUT = FILM / "assets/audio"
KEY = next(l.split("=", 1)[1].strip() for l in (ROOT / ".env").read_text().splitlines() if l.startswith("ELEVENLABS_API_KEY="))
VOICE = "XrExE9yKIg1WjnnlVkGX"  # Matilda: professional, warm alto (ElevenLabs premade)

# Narration, one file per line. Product names are spelled for the speech engine; the screen shows "Triright".
LINES = {
    "vo01": "Fifty-four anxiety trials are recruiting near Midtown Manhattan.",
    "vo02": "Between them, seven hundred sixty-nine eligibility criteria.",
    "vo03": "And you have one visit.",
    "vo04": "Meet Try-right. Clinical trial matching, built into the chart.",
    "vo05": "Open your patient, run a match, and Claude screens them against every recruiting trial nearby.",
    "vo06": "You see the possible fits, ranked, and a reason for every trial it rules out.",
    "vo07": "Each criterion is checked against the record, with the evidence right beside it.",
    "vo08": "If the chart doesn't say, Try-right doesn't guess. It becomes a question to confirm with the patient.",
    "vo09": "Then explain the study in English or Spanish. Claude drafts the script, and nothing plays until you approve it.",
    "vo10": "Patients can ask questions out loud, and every answer comes only from the trial record.",
    "vo11": "Try-right is a screening aid. The study team always makes the final call.",
    "vo12": "Try-right. Claude reads the criteria. Your clinicians decide.",
}

MUSIC_PROMPT = (
    "Instrumental underscore for a calm, trustworthy healthcare technology product launch film. Warm felt piano motif "
    "over soft analog synth pads, a gentle muted pulse and light percussion entering after the intro, building slowly "
    "with quiet optimism, a clear lift around two thirds of the way through, then resolving warmly to a soft final "
    "chord. Modern, clean, hopeful, never dramatic. No vocals. 92 BPM."
)
SFX = {
    "click": ("Soft, crisp computer mouse click, single, close and clean, no reverb", 0.5),
    "whoosh": ("Very soft airy whoosh transition, short, smooth, subtle, modern UI", 1.0),
    "tick": ("Tiny soft digital tick, like a counter incrementing, single, very quiet and clean", 0.5),
    "chime": ("Gentle positive confirmation chime, two soft notes, warm and calm, short", 1.2),
}


def post(path, body, accept="application/json"):
    req = urllib.request.Request("https://api.elevenlabs.io" + path, data=json.dumps(body).encode(), method="POST",
                                 headers={"xi-api-key": KEY, "Content-Type": "application/json", "Accept": accept})
    with urllib.request.urlopen(req, timeout=600) as r:
        return r.read()


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return round(float(out), 3)


def words(alignment):
    """Character alignment -> [{w, start, end}] words, for syncing on-screen text to the voice."""
    out, cur = [], None
    for ch, s, e in zip(alignment["characters"], alignment["character_start_times_seconds"], alignment["character_end_times_seconds"]):
        if ch.isspace():
            if cur:
                out.append(cur)
            cur = None
        elif cur is None:
            cur = {"w": ch, "start": s, "end": e}
        else:
            cur["w"] += ch
            cur["end"] = e
    if cur:
        out.append(cur)
    return [dict(w, start=round(w["start"], 3), end=round(w["end"], 3)) for w in out]


def vo():
    meta_path = OUT / "vo.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    for name, text in LINES.items():
        mp3 = OUT / f"{name}.mp3"
        if mp3.exists() and meta.get(name, {}).get("text") == text:
            continue
        r = json.loads(post(f"/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128", {
            "text": text, "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.55, "similarity_boost": 0.8, "style": 0.15, "speed": 0.97}}))
        mp3.write_bytes(base64.b64decode(r["audio_base64"]))
        meta[name] = {"text": text, "duration": duration(mp3), "words": words(r["alignment"])}
        print(name, meta[name]["duration"], "s")
    meta_path.write_text(json.dumps(meta, indent=1))
    print("total speech", round(sum(m["duration"] for m in meta.values()), 2), "s")


def music(seconds):
    mp3 = OUT / "music.mp3"
    mp3.write_bytes(post("/v1/music", {"prompt": MUSIC_PROMPT, "music_length_ms": int(seconds * 1000),
                                        "model_id": "music_v1"}, accept="audio/mpeg"))
    print("music", duration(mp3), "s")


def sfx():
    for name, (text, secs) in SFX.items():
        mp3 = OUT / f"sfx-{name}.mp3"
        if mp3.exists():
            continue
        mp3.write_bytes(post("/v1/sound-generation", {"text": text, "duration_seconds": secs, "prompt_influence": 0.6},
                             accept="audio/mpeg"))
        print("sfx", name, duration(mp3), "s")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    {"vo": vo, "music": lambda: music(float(sys.argv[2]) if len(sys.argv) > 2 else 75), "sfx": sfx}[sys.argv[1]]()
