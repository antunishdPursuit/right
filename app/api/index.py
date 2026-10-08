"""Vercel entry point: reuse the local server's handler for /api/* routes."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import Handler  # noqa: E402


class handler(Handler):
    pass
