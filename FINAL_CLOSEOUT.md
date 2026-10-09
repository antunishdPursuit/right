# Triright: final closeout

Closed out 2026-10-09. Team 8, Claude Build Day: Mental Health & Wellness (October 8, 2026), Track 2: Accelerate Clinical Trials.

Triright is a trial-match tab inside a mock EHR. A clinician picks a synthetic patient, sees which recruiting anxiety trials near Midtown Manhattan the patient may fit and why, and can explain one trial to the patient by voice in English or Spanish.

## Links

| What | Where |
| --- | --- |
| Repository | https://github.com/antunishdPursuit/right (`main`, tag `launch-film`) |
| Live demo | https://right-trial-match.vercel.app/ (temporary; still serves the October 8 build, see below) |
| Launch film | Plays in the [README](README.md); full quality on the [`launch-film` release](https://github.com/antunishdPursuit/right/releases/tag/launch-film) |
| Team | Breanne Kaiser and Shameeka Marc (practitioners); Ayush Sharma, Dennys Antunish, Shay Beheshti (engineers) |

## What shipped

- **October 8 (event night):** EHR mockup (ClinicView), trial-match app over live ClinicalTrials.gov data and 24 synthetic patients, voice service with the Explain to patient panel, and a Vercel deployment of both.
- **October 9 (polish):** renamed to Triright, redesigned the voice panel and its button, made a 66-second launch film, and added a practitioner README with the film embedded.

## What went well

- **One clear flow.** Match, read the reasoning, explain to the patient, all without leaving the chart.
- **Safety rules held everywhere.** "May fit" wording, unknowns become questions for the patient, the doctor approves before anything plays, and only trial details reach the voice service. Writing them into `AGENTS.md` early made every later change inherit them.
- **Reliable demo.** A frozen trial snapshot and prompt-keyed caching made re-runs instant and free.
- **Claude did the judgment work.** It parses criteria, screens patients with quoted evidence, writes the patient script, and grades teach-back. In testing, the grader caught a patient reading the script back word for word instead of explaining it.
- **No secrets leaked.** A scan of the full public history found no keys, and no `.env` file was ever committed.

## What went wrong

- **The live site is out of date.** Nothing pushed since October 8 has been deployed, so the public link still shows "right", the old panel, and the old button. The README links to it.
- **Parallel work collided.** The launch film was built in a separate session that edited shared files at the same time, and a 15-second demo was committed and then removed 11 minutes later.
- **The October 9 voice changes weren't tested with a real microphone.** The Claude app's browser has no mic, so the agents were tested with synthetic audio.
- **Loose ends in the app.** The "✓ Approved" button state resets on page reload, and the ElevenLabs agents keep their old "right:" names until `app/voice/agents.py` is rerun.
- **The checklist went stale.** Its pre-event planning items were never closed.

## Evidence limits

- **Match accuracy is unmeasured.** The data file has an answer key, and the PRD describes a prescriber-labeled review, but neither was run.
- **No practitioner validation is recorded.** Whether trial recruitment at the visit is a real gap is still open.
- **Narrow coverage.** Anxiety trials only, within 15 miles of Midtown Manhattan, from an October 8 snapshot.
- **Not recorded:** event outcome, judging feedback, how the live demo went, and spend.

## To close

- [ ] Redeploy the site from `main`, or take it down, which the README already allows for.
- [ ] Rotate or revoke the Anthropic and ElevenLabs keys used during the build.
- [ ] Fill in the event outcome above if anyone has it.

## Lessons to reuse

- **Write product rules down before building.** Every prompt, label, and screen then follows them.
- **Check the deployed site after every push.** Don't assume deploys are connected.
- **Give each parallel agent session its own files**, or have it work on a branch.
- **Serverless needs full context per request.** The voice panel sends the trial and approved script with every call, so a fresh Vercel instance can answer.
- **Videos in a GitHub README must be uploaded through github.com.** Release files and `<video>` tags don't play.
