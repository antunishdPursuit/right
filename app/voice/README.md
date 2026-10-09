# Triright: voice

Voice features for the trial-match tab. Claude writes a plain-language script about one trial in English and Spanish. The doctor approves it, then ElevenLabs:

- reads the approved script to the patient,
- **A:** dubs a short recorded message from the doctor into Spanish in the doctor's own voice,
- **B:** runs a voice agent that answers the patient's questions using only the trial record,
- **C:** runs a teach-back check. The agent asks the patient to explain the study back, and Claude scores which key points they understood.

Everything plays on the doctor's screen in the clinic. The script and agents are built from trial information only, never the patient record. During the Q&A and teach-back calls, the patient's own voice goes to ElevenLabs and the teach-back transcript goes to Claude, so use synthetic patients only.

In the Epic screen (`app/`, http://localhost:8000): open **Triright · Trial Match**, run a match, expand a trial, and click **Explain to patient**. The panel (`app/static/voice-panel.js`) walks through the same steps.

## Set up (once)

Needs Python 3.10 or newer (on a Mac, use Homebrew's `python3`, not the system 3.9). From the `voice` folder:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Put the keys in the repo-level `.env` (shared with the trial-match app): `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, and `ANTHROPIC_WORKSPACE_ID` if your Anthropic key is an organization key that isn't scoped to a workspace. `voice/.env` also works, but don't leave empty `KEY=` lines in it: an empty value hides the repo-level one. Both files are git-ignored; never commit them.

The two ElevenLabs agents already exist on the team account, and their IDs are built into `agents.py`, so there's nothing to create. After editing the agent prompts, push them to the shared agents with:

```bash
.venv/bin/python agents.py
```

To make your own pair instead, run `.venv/bin/python agents.py --new`; it writes their IDs into `voice/.env`.

## Run

```bash
.venv/bin/uvicorn server:app --port 8001
```

Open http://localhost:8001 for the test page. It runs top to bottom: load a trial, draft the script, approve it, play it, then try A, B and C. The microphone is needed for recording and for both agents.

## How it fits with the trial-match app

The trial-match app (`app/app.py`) runs on port 8000. This service runs on port 8001 and allows calls from port 8000. To voice a trial from the match app, post it as-is:

```
POST /api/trials            {"trial": <trial object from /api/match>, "criteria_summary": <its "criteria" object>}
```

That also works for the team reference trial (`REF-GAD-01`), which isn't on ClinicalTrials.gov. A real trial can also be loaded by ID with `GET /api/trials/NCT...`.

## API

| Endpoint | What it does |
|---|---|
| `GET /api/config` | Which keys and agents are set |
| `GET /api/trials/{id}` | Load a trial (fetched from ClinicalTrials.gov if new) with its draft and approved script |
| `POST /api/trials` | Register a trial object from the match app |
| `POST /api/trials/{id}/script` | Claude drafts the script and key points (`?refresh=true` to redo) |
| `POST /api/trials/{id}/approve` | Save the doctor's edited script. Everything below needs this. |
| `POST /api/trials/{id}/speech` | `{"language": "en"\|"es"}` returns MP3 of the approved script |
| `POST /api/dub` | Form upload `file` (+ `target_language`, default `es`) starts a dub and returns `project_id` |
| `GET /api/dub/{project_id}` | Dub status, and the English/Spanish transcript when done |
| `GET /api/dub/{project_id}/audio` | The dubbed audio (FLAC) |
| `GET /api/agents/{qa\|teachback}/session?trial_id=&language=` | One-time WebRTC token plus the trial details for the agent |
| `POST /api/teachback/grade` | `{"conversation_id", "trial_id"}` returns the score per key point and a note for the doctor |

## Things to know

- **Dubbing takes a minute or more,** and each new dub is billed for one language up front. Before the demo, make one and keep its project ID. The test page can reload a finished dub by ID.
- **Agent speed:** both agents use `claude-opus-5-5`. If replies feel slow in conversation, change `LLM` in `agents.py` to `claude-sonnet-5-5` or `claude-haiku-5-5`, then rerun `agents.py`.
- **Cache:** drafts and approved scripts are saved in `.cache.json` (git-ignored), so restarting the server doesn't re-bill Claude. Delete the file to start fresh.
- **Vercel:** `app/api/voice.py` serves this service under `/voice` on the deployed site. Needs `ELEVENLABS_API_KEY` (and `ANTHROPIC_WORKSPACE_ID` for an organization key) in the Vercel environment variables. Each request may hit a fresh instance, so the panel sends the trial and approved script along with every call.
- **Restart after code changes:** the server runs without auto-reload. Spoken audio is cached in memory only, so a restart re-generates it on first play.
- **Not for real patients:** the free ElevenLabs plan has no BAA or zero-retention mode, and the translated script is information only. Signing a patient up needs a qualified interpreter and the study's approved consent materials.
