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

## Results

- **Tested end to end with real keys:** matching, the voice panel and approval, English and Spanish playback, dubbing, and both voice agents with a real microphone in Chrome. The panel also works at phone width.
- **Match accuracy against the answer key** (24 synthetic patients, reference trial):
  - All 12 screen fails were ruled out, and 11 of 12 eligible patients were kept.
  - Six patients the key calls "Eligible" came back "Possible fit · confirm", because consent and visit attendance aren't in the chart. This is the "unknown stays unknown" rule working as intended.
  - One miss: P-006 was ruled out for an unnamed OTC sleep aid that the key says to verify. Fixing it means changing the screening prompt and rebuilding the cached results, so it's left as a known issue.

## What went well

- **One clear flow.** Match, read the reasoning, explain to the patient, all without leaving the chart.
- **Safety rules held everywhere.** "May fit" wording, unknowns become questions for the patient, the doctor approves before anything plays, and only trial details reach the voice service. Writing them into `AGENTS.md` early made every later change inherit them.
- **Reliable demo.** A frozen trial snapshot and prompt-keyed caching made re-runs instant and free.
- **Claude did the judgment work.** It parses criteria, screens patients with quoted evidence, writes the patient script, and grades teach-back. In testing, the grader caught a patient reading the script back word for word instead of explaining it.
- **No secrets leaked.** A scan of the full public history found no keys, and no `.env` file was ever committed.

## What went wrong

- **The live site is out of date.** Nothing pushed since October 8 has been deployed, so the public link still shows "right", the old panel, and the old button. The README links to it.
- **Parallel work collided.** The launch film was built in a separate session that edited shared files at the same time, and a 15-second demo was committed and then removed 11 minutes later.
- **Voice testing came late.** The Claude app's browser has no microphone, so the October 9 changes were first tested with synthetic audio. A real-microphone run in Chrome at closeout passed.
- **Loose ends, fixed at closeout.** The "✓ Approved" button reset on page reload, and the ElevenLabs agents still had their old "right:" names.
- **The checklist went stale.** Its pre-event planning items were never closed.

## Evidence limits

- **Accuracy covers one trial.** Only the reference trial has an answer key. The other 54 trials are unscored, and the PRD's prescriber-labeled review wasn't run.
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
- **Score against the answer key early.** From cached results it took seconds, and it surfaced a real miss.
- **Give each parallel agent session its own files**, or have it work on a branch.
- **Serverless needs full context per request.** The voice panel sends the trial and approved script with every call, so a fresh Vercel instance can answer.
- **Videos in a GitHub README must be uploaded through github.com.** Release files and `<video>` tags don't play.
