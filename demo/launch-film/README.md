# Triright launch film

A 66-second product launch video for hospital and clinic audiences, built with [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML + GSAP rendered to MP4). The HyperFrames agent skills are installed in `.claude/skills/` at the repo root.

| Path | What it is |
| --- | --- |
| `index.html` | The whole film: eight scenes on one GSAP timeline, audio tracks at the bottom. Scene times are in the comments. |
| `assets/ui/` | 2x screenshots of the real Triright UI and `rects.json`, the on-screen position of every element the camera and cursor aim at. |
| `assets/audio/` | ElevenLabs narration (voice "Matilda", one file per line, word timings in `vo.json`), music bed, and UI sounds. |
| `tools/serve_snapshot.py` | Runs the app on :8010 pinned to the Oct 8 snapshot, with `/voice` forwarded to :8011, so captures never touch the team's servers on :8000/:8001. |
| `tools/capture.mjs` | Drives the real UI in headless Chrome and saves the screenshots and `rects.json`. |
| `tools/audio.py` | Generates narration, music, and sounds with the `ELEVENLABS_API_KEY` from the repo `.env`. Narration text lives in `LINES`. |
| `tools/inline_data.py` | Writes the snapshot numbers (54 trials, 769 parsed criteria) and `rects.json` into `index.html`. |

## Re-render

From this folder, with ffmpeg installed (`brew install ffmpeg`):

```bash
npx --yes hyperframes@0.8.143 preview
```

```bash
npx --yes hyperframes@0.8.143 render --quality high --output renders/triright-launch-film.mp4
```

## After a UI change

The film shows screenshots, so recapture after the app's look changes. Start the `film-voice` and `film-app` servers from `.claude/launch.json`, copy `app/voice/.cache.json` to `/tmp/voice-cache.json` first so the script starts unapproved, then from the repo root:

```bash
node demo/launch-film/tools/capture.mjs
```

```bash
app/voice/.venv/bin/python demo/launch-film/tools/inline_data.py
```

Snapshot a few frames (`npx hyperframes snapshot --at 18,31,44`) to check the camera still lands on the right elements before rendering.

## What's real and what's staged

Every screen is the running app with synthetic patient P-016 and the Oct 8 trial snapshot; the Spanish script is real Claude output. Staged for the film: the screening counter in the caption (labeled "sped up"), the highlight boxes, the cursor, and the pulsing ring around the call button. No voice call happens on screen.
