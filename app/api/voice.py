"""Vercel entry point for the voice service: serves voice/server.py under /voice on the same site."""
import sys
from pathlib import Path

from fastapi import FastAPI

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "voice"))
from server import app as voice_app  # noqa: E402

app = FastAPI()
app.mount("/voice", voice_app)
