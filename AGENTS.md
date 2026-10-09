# Triright

Triright is Team 8's demo for Claude Build Day: Mental Health & Wellness (October 8, 2026, Track 2: Accelerate Clinical Trials). It is a "Triright · Trial Match" tab inside a mock EHR called ClinicView. A clinician picks a synthetic patient, runs a match against recruiting anxiety trials near Midtown Manhattan, reads the criterion-by-criterion reasoning, and can open a voice panel that explains one trial to the patient in English or Spanish.

The team has a two-hour build and a 2–3 minute live demo. A demo that works every time is worth more than another feature, so keep the main flow working after every change: select a patient, click "Run trial match", expand a trial, click "Explain to patient". The safety behavior in [Product rules](#product-rules) is part of what the demo shows, not something to work around.

## Where things are

| Path | What it is |
| --- | --- |
| `app/app.py` | Standard-library HTTP server on port 8000. Loads the synthetic patients, fetches trials from ClinicalTrials.gov API v2, and calls Claude to parse criteria and screen patients. |
| `app/static/index.html` | The whole EHR mockup, including the trial-match tab. This is the live UI. |
| `app/static/voice-panel.js` | The "Explain to patient" side panel. Calls the voice service: `http://localhost:8001` when the page runs on localhost, `/voice` on the same site when deployed (override with `window.RIGHT_VOICE_URL`). |
| `app/synthetic-patient-data.md` | 24 synthetic patients, the team reference trial (`REF-GAD-01`), and an answer key in section 3. `app.py` parses this file by its headings and field labels and asserts there are 24 patients, so keep that format. The answer key is for checking results and is never sent to the model. |
| `app/voice/` | FastAPI service: port 8001 locally, `/voice` on Vercel (via `app/api/voice.py`). Claude writes the patient script and grades teach-back; ElevenLabs handles speech, dubbing, and two voice agents. `app/voice/README.md` lists the endpoints. |
| `ehr-notes-mockup.html` | Earlier standalone mockup, superseded by `app/static/index.html`. |
| `CHECKLIST.md` | Current decisions, open risks, and what is in scope. Read it before deciding what to build, and record new decisions there. |
| `PRD.md`, `SYSTEM_FLOW.md` | The full product vision. Much of it (SMART on FHIR, Postgres, wearables, a 12-week plan) is beyond the demo. |
| `EVENT_BRIEF.md`, `CONCEPT_SCORECARD.md` | Event facts and the concept options the team weighed. |

## Run it

Keys go in a git-ignored `.env`: `app/.env`, `app/voice/.env`, or one at the repo root. Set `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY`, plus `ANTHROPIC_WORKSPACE_ID` only if the Anthropic key isn't scoped to a workspace; `app/voice/.env.example` lists the optional ones. This repository is public on GitHub, so a key that reaches a commit is exposed immediately. Check `git status` for stray files before committing.

Trial-match app, from `app/`:

```bash
uv run --with anthropic app.py
```

Wait for `prewarm done` in the output (about 40 seconds) before opening http://localhost:8000.

Voice service, from `app/voice/`, after the one-time setup in `app/voice/README.md`:

```bash
.venv/bin/uvicorn server:app --port 8001
```

There is no test suite. `app.py` checks the parsed data with assertions at startup; beyond that, verify changes by running the main flow in a browser.

## Deploy

`app/` deploys to Vercel with `app` as the project root. `api/index.py` reuses the handler in `app.py`, and `vercel.json` routes `/api/*` to it and `/` to the EHR page. `ANTHROPIC_API_KEY` is set in the Vercel project's environment variables, not in a file.

The Vercel function disk is read-only, so the trial list and parsed criteria come from `app/snapshot/`, a frozen copy taken on 2026-10-08, and only patient screening calls Claude live. Cached Claude results are keyed on the exact prompt text, so editing a prompt in `app.py` makes every snapshot entry miss and each trial gets re-parsed live on the next match. After changing a prompt, rebuild both snapshot files from one local run so they stay in step.

The voice service deploys with it: `api/voice.py` serves `app/voice/server.py` under `/voice`, and the panel calls `/voice` when it isn't on localhost. It also needs `ELEVENLABS_API_KEY` (and `ANTHROPIC_WORKSPACE_ID` for an organization Anthropic key) in the Vercel environment variables. Each request may reach a fresh function instance, so the panel sends the trial and the approved script with every call; the server enforces approval from what it receives.

## Product rules

These come from the team's clinicians and from the event's privacy limits. Each one shows up in the demo, so carry them through any change to code, prompts, or copy.

- **Synthetic data only.** The ElevenLabs plan has no BAA or zero-retention mode, and event API credit is not a BAA, so no real patient information goes into code, prompts, fixtures, or examples.
- **Screening aid, not an eligibility decision.** The study team decides eligibility. Clinician- and patient-facing text says "likely fit", "possible fit", or "may qualify", never that a patient is eligible or qualifies; internal status codes such as `ELIGIBLE` are fine. Keep the footer "Screening aid only. Final eligibility is determined by the study team."
- **Unknown stays unknown.** A fact the record doesn't state becomes a "confirm with patient" item, not a pass. Code applies the hard gates (age and sex) before any model call; Claude interprets criteria and records.
- **Diagnoses live on the Problem List, not in the note.** This clinic's progress notes leave the diagnosis out, and the Assessment section holds clinician-approved observations only. Note drafts follow the same rule.
- **Only trial information goes to the voice service.** The patient script describes the study, not the patient, so no name, diagnosis, or other patient detail is sent to Claude or ElevenLabs from the voice panel.
- **The doctor approves before anything plays.** Speech and both voice agents use only the approved script. Patient-facing wording is calm and neutral: joining is voluntary, saying no doesn't change their care, and nothing is urgent or promised.

## Calling Claude

Every Claude call uses `claude-opus-5-5`: `MODEL` in `app/app.py` and `app/voice/claude_text.py`, and `LLM` in `app/voice/agents.py` for the ElevenLabs agents. On this model:

- Forced tool use (`tool_choice` of `any` or `tool`) returns a 400. `app.py` uses `tool_choice: auto` and names the tool in the system prompt; `app/voice/claude_text.py` uses structured outputs through `messages.parse`. Follow the pattern the file already uses.
- Thinking is always on. Sending `thinking: {type: "disabled"}`, `budget_tokens`, `temperature`, `top_p`, or an assistant prefill returns a 400. Effort controls depth and cost, and its default is `medium`, so set `output_config.effort` explicitly where it matters.
- Thinking counts toward `max_tokens`, so size it for the thinking as well as the reply.
- A safety classifier can decline with `stop_reason: "refusal"`, so check `stop_reason` before reading the content. `app/voice/claude_text.py` also opts into server-side fallback with `fallbacks="default"`.

Both services cache Claude results in a git-ignored `.cache.json` keyed on the prompt, which keeps demo re-runs instant and free. Delete the file to force fresh calls.

## UI

`app/static/index.html` is a single file of HTML, CSS, and JavaScript with no build step. It is styled with CSS variables on `:root` (`--bg`, `--panel`, `--border`, `--text`, `--muted`, `--accent`, and the `--chrome-*` set) and shared classes such as `pill ok`, `pill warn`, and `pill neutral`. New UI reuses them so it reads as part of the EHR: dense, neutral, and quick to scan between visits. Load any external script from a CDN at a pinned version, as `voice-panel.js` does.

## Working in this repo

Several people push to `main` during the build. Pull before you start, keep commits small, and ask before rewriting or reverting a teammate's work. The app has no framework or build step; keep it that way, because setup time comes out of a two-hour build.

When you report back, say what changed, how you checked it (which flow you ran, and whether real keys were set), and anything you couldn't verify.
