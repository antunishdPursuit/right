# Triright

Triright helps behavioral health clinicians find recruiting clinical trials a patient may fit, see why, and explain a trial to the patient in plain language, without leaving the chart.

**[▶ Watch the 66-second launch film](https://github.com/antunishdPursuit/right/releases/tag/launch-film)**

## Try it

[right-trial-match.vercel.app](https://right-trial-match.vercel.app/)

> This demo site is temporary. It may be taken down, or some features may stop working.

## How it works

1. Open a patient and click **Run trial match**. Triright screens them against recruiting anxiety trials near Midtown Manhattan.
2. Open a trial to see each eligibility criterion checked against the chart.
3. Click **Explain to patient** to walk the patient through the trial by voice, in English or Spanish.

## Reading the results

| Label | Meaning |
| --- | --- |
| **Likely fit** | Every criterion checks out against the chart. |
| **Possible fit · confirm** | Nothing rules the patient out, but some criteria aren't in the chart. |
| **Ruled out** | At least one criterion clearly doesn't fit. |

Each criterion is marked ✓ met, ✗ not met, or **?** not in the chart. Every **?** becomes a question to ask the patient.

## Explaining a trial to the patient

- You review and approve the script before anything plays.
- The patient hears a short summary, can ask questions, then explains the study back so you can see what they understood.
- The tone is calm and neutral: joining is voluntary, and saying no doesn't change their care.

## What Triright doesn't do

- **Decide eligibility.** It's a screening aid; the study team makes the final call.
- **Contact patients.** You decide whether and when to raise a trial.
- **Share patient details with the voice assistant.** It only knows about the trial.

## About this prototype

- Built by Team 8 at Claude Build Day: Mental Health & Wellness, October 2026.
- Runs in a mock EHR called ClinicView. It isn't connected to Epic or any real record.
- Uses synthetic patients and a snapshot of ClinicalTrials.gov from October 8, 2026.

Developers: see [app/README.md](app/README.md).
