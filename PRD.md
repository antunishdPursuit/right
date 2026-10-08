# right: PRD

Oct 8, 2026

## Summary

right is a clinical trial matching app that lives in a tab inside Epic and tells a mental health clinician which recruiting anxiety trials their patient qualifies for, why, and how far away they are.

- **Users:** psychiatrists, psychiatric NPs, psychologists, and licensed counselors. The patient is a secondary user through the voice note.
- **Indication for MVP:** anxiety disorders (GAD, panic disorder, social anxiety disorder, unspecified anxiety).
- **Two-part core:** (1) an agent extracts coded and free-text facts from the EHR chart, (2) a matching engine checks them against ClinicalTrials.gov eligibility criteria and shows explained matches in the right tab.
- **Optional modules:** wearable stress data (Oura, WHOOP) and an ElevenLabs voice note that explains the trial to the patient.
- **MVP data:** 20 synthetic patients only. A healthcare provider manually reviews every match to measure precision.

One correction to the brief: the ClinicalTrials.gov API (v2) is public and needs no API key. Keys are only needed for the LLM, ElevenLabs, Oura, and WHOOP.

## Goals, non-goals, success metrics

**Goals**

- Surface only trials the patient plausibly qualifies for. A patient who meets any exclusion criterion never sees that trial.
- Show only trials with overall status RECRUITING and at least one recruiting site.
- Explain every match criterion by criterion, with the chart evidence behind it.
- Show distance to the nearest recruiting site and let the clinician sort and filter by it.
- Prompt the clinician to have the conversation. right never contacts the patient on its own.

**Non-goals for MVP**

- No real patient data, no production Epic install.
- No enrollment, consent, or referral submission to trial sites.
- No conditions beyond anxiety disorders.
- No automated eligibility determination. right screens; the study team decides.

**Success metrics**

| Metric | Target | How measured |
| --- | --- | --- |
| Match precision (top 5 per patient) | 80% or higher | Clinician labels each shown match |
| Exclusion leak rate | 0 | Shown trials where the patient meets an exclusion |
| Non-recruiting trials shown | 0 | Status check against the live record |
| Extraction accuracy | 90% or higher per field | Compared to each patient's answer key |
| Explanation quality | 4 of 5 or higher | Clinician rating per match |
| Time to review a match | Under 60 seconds | Timed during evaluation |

## Workflow in Epic

The clinician never leaves the chart: right launches as a SMART on FHIR app embedded in an Epic activity tab, already pointed at the open patient.

1. Clinician opens a patient chart and clicks the **right** tab.
2. Epic launches right with a launch token and the FHIR base URL. right completes the OAuth handshake with no separate login.
3. The extraction agent pulls the chart over FHIR and builds a structured patient profile (Part 1).
4. The matching engine queries ClinicalTrials.gov for recruiting anxiety trials near the patient and evaluates eligibility (Part 2).
5. The tab shows ranked trial cards with the match explanation, distance, and items to confirm with the patient.
6. The clinician sees the prompt **"Talk to your patient about this trial"** with three talking points.
7. Optional: the clinician reviews a plain-language script and plays or shares the voice note with the patient.
8. The clinician records the outcome: discussed and interested, discussed and declined, or not appropriate (with a reason).

For a counselor without prescribing authority, the flow is the same. The card adds a note when a trial needs a prescriber referral or medication washout so they can loop in the psychiatrist.

## Part 1: EHR extraction agent

The agent turns one patient's FHIR record into a structured profile where every fact carries its source, date, and confidence.

**Inputs (FHIR R4 resources)**

| Resource | What the agent pulls | Code system |
| --- | --- | --- |
| Patient | Age, sex, home ZIP, preferred language | n/a |
| Condition | Problem list and encounter diagnoses, onset dates, status | ICD-10-CM, SNOMED CT |
| MedicationRequest | Drug, dose, start and stop dates, status | RxNorm |
| Observation (survey) | GAD-7, PHQ-9, C-SSRS, AUDIT-C scores over time | LOINC |
| Observation (lab, vitals) | TSH, hCG, urine drug screen, ALT, creatinine, BMI, BP, QTc | LOINC |
| Procedure, Encounter | Psychotherapy sessions, hospitalizations, ED visits | CPT |
| AllergyIntolerance | Drug allergies | RxNorm, SNOMED CT |
| DocumentReference | Clinical notes for facts that are not coded | Free text |

**Anxiety code set to recognize**

| Concept | Codes |
| --- | --- |
| Target diagnoses | F41.1 GAD, F41.0 panic disorder, F40.10 and F40.11 social anxiety, F40.0x agoraphobia, F41.9 unspecified, F41.8 other specified |
| Adjacent, flag only | F43.22 adjustment disorder with anxiety, F43.1x PTSD, F42.x OCD |
| Common exclusions | F31.x bipolar, F20 to F29 psychotic disorders, F10 to F19 substance use, F03 dementia, G40 epilepsy, R45.851 suicidal ideation, Z33.1 and O codes for pregnancy |
| Common comorbidity | F32.x and F33.x depression, G47.0x insomnia, F90.x ADHD |
| Scales | GAD-7 total (LOINC 70274-6), PHQ-9 total (LOINC 44261-6). Confirm all LOINC codes against loinc.org before build. |
| Drug classes | SSRIs, SNRIs, buspirone, benzodiazepines, hydroxyzine, beta blockers, pregabalin and gabapentin, antipsychotics, MAOIs, mood stabilizers. Map by RxNorm ingredient. |

**Requirements**

- Structured fields are parsed deterministically. The LLM is used only for notes and for reconciling conflicts.
- Notes are mined for facts that are rarely coded: prior medication trials elsewhere, therapy type and duration (CBT vs supportive), alcohol and cannabis use, suicidal ideation history, pregnancy plans, willingness to change medication.
- Derived fields are computed, not guessed: latest GAD-7 and date, number of adequate antidepressant trials (8 or more weeks at a therapeutic dose), weeks on current stable dose, days since last benzodiazepine fill.
- Every fact stores `value`, `source` (resource ID or note span), `date`, and `confidence`. Note-only facts are labeled as such.
- When structured data and notes conflict, keep both and flag it. Do not silently pick one.
- Anything not found is `unknown`, never assumed negative. Absence of a bipolar code is not proof of no bipolar disorder.

**Output: patient profile (abridged)**

```json
{
  "patient_id": "SYN-007",
  "age": 34, "sex": "female", "zip": "10025",
  "diagnoses": [{"code": "F41.1", "onset": "2023-02", "status": "active", "source": "Condition/123"}],
  "scales": {"gad7": [{"score": 16, "date": "2026-09-12", "source": "Observation/88"}]},
  "medications": [{"ingredient": "sertraline", "dose_mg": 150, "start": "2026-03-01", "status": "active", "weeks_stable": 14}],
  "adequate_trials_failed": 1,
  "psychotherapy": {"type": "CBT", "sessions": 10, "source": "note", "confidence": 0.7},
  "exclusion_flags": {"bipolar": "no_evidence", "psychosis": "no_evidence", "sud_12mo": "unknown", "pregnant": "no (hCG 2026-08-30)", "active_si": "no (C-SSRS 2026-09-12)"},
  "conflicts": []
}
```

## Part 2: trial matching engine

The engine fetches recruiting anxiety trials near the patient, drops any trial the patient is excluded from, and ranks what is left.

**Step 1: fetch candidates from ClinicalTrials.gov API v2**

```
GET https://clinicaltrials.gov/api/v2/studies
  ?query.cond=anxiety disorder OR generalized anxiety OR panic disorder OR social anxiety
  &filter.overallStatus=RECRUITING
  &filter.geo=distance(40.80,-73.96,100mi)
  &fields=NCTId,BriefTitle,BriefSummary,Phase,Condition,InterventionName,EligibilityModule,ContactsLocationsModule
  &pageSize=100
```

- Only `RECRUITING`. Not `NOT_YET_RECRUITING`, `ENROLLING_BY_INVITATION`, or `ACTIVE_NOT_RECRUITING`.
- Overall status is not enough. Each location has its own status, so require at least one site with status RECRUITING inside the radius.
- Cache trial records nightly. Re-check status when the tab opens so a trial that closed today is not shown.

**Step 2: hard gates on structured fields**

Drop the trial with no LLM call if the patient fails `minimumAge`, `maximumAge`, `sex`, or `healthyVolunteers` in the eligibility module.

**Step 3: parse free-text eligibility**

The `eligibilityCriteria` field is one block of text. An LLM splits it into individual inclusion and exclusion criteria once per trial, and the parsed version is cached and versioned with the trial record.

**Step 4: evaluate each criterion against the patient profile**

| Result | Meaning | Effect |
| --- | --- | --- |
| MET | Chart evidence satisfies the criterion | Counts toward the score |
| NOT MET | Chart evidence contradicts it | Inclusion not met: drop the trial |
| EXCLUDED | Patient meets an exclusion criterion | Drop the trial immediately, stop evaluating |
| UNKNOWN | Chart is silent | Keep, list under "confirm with patient" |

- Exclusions are evaluated first and short-circuit. One EXCLUDED result ends the work on that trial.
- Dropped trials are never shown in the tab. They are logged with the reason for the evaluation audit.
- Every result cites the profile fact and its source. No citation means the result is UNKNOWN.
- A trial with more than half its criteria UNKNOWN is shown in a separate "needs more information" group, not as a match.

**Step 5: score and rank**

- Match score = MET criteria divided by total criteria, with inclusion criteria tied to diagnosis and severity weighted double.
- Default sort is best match. Ties break on distance.

**Step 6: distance**

- Compute straight-line (haversine) miles from the patient's home ZIP centroid to each recruiting site's `geoPoint`. Show the nearest site and the count of other sites in range.
- Sort options: Best match, Nearest. Radius filter: 10, 25, 50, 100 miles, Any.
- A "best match within X miles" view applies the radius first, then ranks by score.
- Remote or decentralized trials are tagged "Remote participation" and are not filtered out by radius.
- Option to measure from the clinic address when the patient's ZIP is missing.

**Step 7: explanation**

Each match gets a 2 to 3 sentence summary plus the full criterion table. Example: "Matched because of active GAD (F41.1), GAD-7 of 16 on Sep 12, and 14 weeks on a stable sertraline dose. No exclusions found. Confirm with patient: alcohol use in the past 6 months."

## The right tab

The tab is a ranked list of trial cards built to be read in under a minute between visits.

**Header**

- Patient context line: primary anxiety diagnosis, latest GAD-7 with date, current medications.
- Controls: sort (Best match, Nearest), radius filter, phase filter, intervention type (drug, device, behavioral, digital).
- Count: "4 recruiting trials match. 11 were ruled out."

**Trial card**

| Element | Content |
| --- | --- |
| Title | Brief title, NCT ID linked to ClinicalTrials.gov, phase, sponsor |
| Status | "Recruiting" badge with the date last verified |
| Distance | "3.2 mi, Site name, City" plus "+2 more sites within 25 mi" |
| Match score | Percent with MET, UNKNOWN counts |
| Why matched | 2 to 3 sentence explanation |
| Criteria detail | Expandable table: criterion, result, chart evidence with link to source |
| Confirm with patient | Checklist of UNKNOWN items the clinician can ask about |
| What it involves | Intervention, visit count, duration, placebo yes or no, washout required yes or no |
| Prompt | "Talk to your patient about this trial" with 3 talking points |
| Voice note | Preview script, generate, play |
| Outcome | Interested, Declined, Not appropriate (reason required) |

**Behavior**

- Answering a "confirm with patient" item re-runs the evaluation. If the answer triggers an exclusion, the card is removed.
- Empty state: "No recruiting trials match right now." plus the top 3 reasons trials were ruled out.
- Persistent footer: "Screening aid only. Final eligibility is determined by the study team."
- Layout fits Epic's embedded browser at narrow widths. No pop-ups or new windows.
- "Not appropriate" reasons feed the evaluation dataset.

## Optional: wearable stress data

Wearable data is an opt-in context layer that adds a 30-day stress and recovery trend to the patient profile. It never gates eligibility on its own.

| Source | Auth | Signals to pull |
| --- | --- | --- |
| Oura API v2 | Patient OAuth | `daily_stress` (stress_high, recovery_high, day_summary), `daily_resilience`, sleep with nightly HRV and resting HR |
| WHOOP API v2 | Patient OAuth | Recovery score, HRV, resting HR, sleep performance, strain |

**Requirements**

- Off by default. Turned on per patient, only after the patient connects their own account.
- Normalize both sources to one schema: date, HRV (ms), resting HR, sleep duration, a 3-level daily stress label, and the source device.
- Show a 30-day sparkline and one line of summary on the header, for example "HRV down 18% vs prior 30 days, 11 high-stress days."
- Use in matching in two ways only: (1) tag trials that use wearables or digital endpoints, since the patient already owns a device, (2) add supporting context to the explanation.
- Label it clearly: consumer stress scores are not validated anxiety measures and do not replace GAD-7 or HAM-A.
- The app works fully with the module off.

**MVP approach:** generate synthetic 90-day wearable series for 8 of the 20 patients, in the same shape the two APIs return. Oura also offers sandbox endpoints with canned data for testing the integration without a ring.

## Patient voice note (ElevenLabs)

The voice note is a 60 to 90 second plain-language audio explanation of one trial, generated only after the clinician approves the script.

1. Clinician clicks "Create voice note" on a trial card.
2. An LLM writes a script from the trial record: 150 to 220 words, 6th to 8th grade reading level.
3. The clinician reads and can edit the script. Nothing is generated without approval.
4. The approved script goes to the ElevenLabs text to speech API. Audio is returned and stored with the script.
5. The clinician plays it in the room or shares it with the patient.

**Script must cover**

- What the study is testing and why.
- What taking part involves: visits, length, whether there is a placebo, whether current medication changes.
- Where the nearest site is.
- That joining is voluntary and saying no does not affect their care.
- That the study team makes the final decision on eligibility, and who to contact.

**Guardrails**

- No patient name, diagnosis, or other PHI in the text sent to ElevenLabs. The script is about the trial, not the patient.
- No efficacy promises, no "you qualify." Use "you may be a fit."
- Calm, neutral voice. No urgency or persuasion, which matters for an anxious listener.
- The saved script is the audit record of exactly what the patient heard.
- This is recruitment material. Check with the IRB of each study whether patient-facing content needs approval before real use.
- English for MVP. Spanish next.

## Synthetic patient build plan

Build the 20 charts backward from real trial criteria: design the cohort on paper first, generate structured data second, write the notes last, and keep a hidden answer key for each patient.

**Step 1: survey real criteria before inventing patients**

- Pull every currently recruiting anxiety trial from ClinicalTrials.gov (expect a few dozen in any one metro radius).
- Tabulate the 15 to 20 most common inclusion and exclusion criteria: diagnosis, severity cutoffs (GAD-7, HAM-A), stable medication duration, failed prior trials, bipolar, psychosis, substance use window, suicidality, pregnancy, benzodiazepine use, prohibited medications, labs, age caps.
- Every one of those criteria must be exercised by at least 2 patients, one who passes and one who fails.

**Step 2: design the cohort matrix (20 patients)**

Roughly 8 clean or mostly eligible patients, 8 with one specific exclusion, and 4 with messy or ambiguous charts.

| ID | Age, sex | Primary dx | GAD-7 | Treatment | The twist | Tests |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | 28 F | GAD (F41.1) | 16 | None | Treatment naive | Clean match, first-line trials |
| 02 | 41 M | GAD | 14 | Sertraline 150 mg, 14 wks | Partial response | Adjunctive trials, stable-dose rule |
| 03 | 35 F | GAD + MDD (F33.1) | 17 | Failed escitalopram, venlafaxine | PHQ-9 of 15 | Treatment-resistant trials, MDD comorbidity rules |
| 04 | 52 M | Panic (F41.0) | 12 | Clonazepam daily | Long-term benzo | Benzodiazepine exclusion, washout note |
| 05 | 23 F | Social anxiety (F40.10) | 13 | CBT x 12, no meds | Therapy only in notes | Behavioral and digital trials, note extraction |
| 06 | 30 F | GAD | 15 | Buspirone | Pregnant (Z33.1, hCG positive) | Hard exclusion |
| 07 | 45 M | GAD | 18 | Lamotrigine, quetiapine | Bipolar II (F31.81) | Hard exclusion |
| 08 | 38 M | GAD | 14 | Escitalopram 10 mg | 4 drinks nightly, in notes only | Note-only exclusion, no F10 code |
| 09 | 67 F | GAD | 11 | Duloxetine, propranolol | Age and hypertension | Upper age caps, cardiac rules |
| 10 | 19 M | Social anxiety + panic | 15 | None | Daily cannabis (F12.10) | Substance use exclusion |
| 11 | 33 F | GAD | 6 | Escitalopram 20 mg | In remission | Severity inclusion not met |
| 12 | 29 F | Unspecified (F41.9) | 15 | Sertraline 50 mg, 3 wks | Notes describe clear GAD | Undercoding, new-start med |
| 13 | 48 M | GAD | 17 | Venlafaxine 225 mg | Passive SI on C-SSRS 2 months ago | Suicidality exclusion |
| 14 | 36 F | GAD | 13 | Levothyroxine, no psych meds | TSH 7.8 | Medical exclusion, lab parsing |
| 15 | 26 M | GAD + ADHD | 16 | Lisdexamfetamine, sertraline | Stimulant | Prohibited concomitant medication |
| 16 | 55 F | PTSD (F43.10) | 15 | Prazosin, paroxetine | High GAD-7, wrong primary dx | Diagnosis specificity |
| 17 | 40 M | GAD | 15 | Sertraline 100 mg, 20 wks | Lives 140 miles from the metro | Distance filter, remote trials |
| 18 | 31 F | GAD | 19 | Hydroxyzine as needed | Last GAD-7 is 14 months old | Stale data, UNKNOWN handling |
| 19 | 44 F | Panic | 14 | Sertraline listed active | Note says stopped 3 months ago | Chart conflict flagging |
| 20 | 60 M | GAD | 12 | Citalopram 40 mg | QTc 470, in a drug study 2 months ago | QTc rule, investigational drug window |

Also vary race and ethnicity, insurance, language (2 Spanish-preferring), and occupation so the cohort does not read as one person 20 times.

**Step 3: generate the base chart**

- Use Synthea to produce a FHIR R4 bundle per patient for demographics, addresses, vitals, immunizations, routine primary care history, and unrelated conditions. This gives the background noise a real chart has.
- Synthea's built-in mental health coverage is thin for anxiety, so do not rely on it for the psychiatric story. Strip any Synthea psychiatric content that conflicts with the matrix.
- Set home ZIPs deliberately: about 12 urban, 5 suburban at 15 to 40 miles, 3 rural at 80 or more miles.

**Step 4: script the anxiety layer on top**

A Python script writes these FHIR resources for each patient from a per-patient YAML spec:

- **Conditions:** onset date, who diagnosed it, problem list vs encounter diagnosis. Make onset realistic: symptoms for 1 to 5 years before first diagnosis.
- **Encounters:** one 90791 or 90792 psychiatric intake, then 99213 or 99214 medication visits every 4 to 8 weeks, therapy sessions (90834, 90837) weekly or biweekly where applicable, plus 1 to 2 PCP visits.
- **Scales:** GAD-7 and PHQ-9 at 4 to 8 timepoints with a believable trajectory. Response is a 50% drop, remission is under 5, partial response plateaus around 10 to 12. Scores should wobble by 1 to 3 points, not move in straight lines.
- **Medications:** real titration schedules (sertraline 25, then 50, 100, 150 mg), start and stop dates, stop reasons (nausea, sexual side effects, no response, cost). An adequate trial is 8 or more weeks at a therapeutic dose.
- **Labs and vitals:** TSH, CBC, CMP at baseline. hCG for women 18 to 50. Urine drug screen for some. ECG with QTc for anyone on citalopram or older than 50.
- **Screens:** C-SSRS at intake and when PHQ-9 item 9 is positive. AUDIT-C yearly.

**Step 5: write the notes last, from the structured data**

- Per patient: 1 psychiatric intake (chief complaint, HPI, past psychiatric history, family history, substance use, social history, mental status exam, assessment, plan), 3 to 5 follow-up notes, 1 PCP note, and therapy progress notes for the therapy patients.
- Generate each note with an LLM given the patient spec, a persona for the author (terse psychiatrist, thorough NP, counselor with narrative style), and the visit date. Give each author a consistent voice across that patient's notes.
- Include the patient's own words in the HPI ("I can't shut my brain off at night") and specific life context: job, caregiving, a triggering event.
- Deliberately put some facts only in notes: outside medication trials, therapy modality, alcohol quantity, family history, pregnancy intent.

**Step 6: add real-world mess**

Clean charts overstate performance. Add on purpose:

- Copy-forward text that is out of date in 3 to 4 charts.
- Abbreviations and shorthand: "pt", "h/o", "SI/HI denied", "d/c'd 2/2 GI s/e".
- A medication still active on the list that a note says was stopped.
- Missing scales for stretches of 6 or more months.
- A vague code (F41.9) where the note is specific.
- A resolved problem still listed as active.
- A negated or family-history mention that should not fire ("no h/o mania", "mother with bipolar disorder").

**Step 7: write the answer key**

For each patient, a separate file that is never shown to the agent: the true value of every profile field, where it lives in the chart, and which common criteria the patient passes or fails. This is what extraction accuracy is scored against.

**Step 8: clinician face-validity review**

Before any matching runs, a psychiatrist or psychiatric NP reads all 20 charts and rates realism 1 to 5 with comments. Rewrite anything under 4. Typical fixes: implausible dosing, timelines that move too fast, notes that sound too polished.

**Step 9: validate and load**

- Run every bundle through the HL7 FHIR validator, with US Core profiles.
- Load into a local HAPI FHIR server with a SMART launcher so the app sees the same interface it will see in Epic.
- Watermark every chart "SYNTHETIC" and use obviously fake identifiers (MRN prefix SYN).
- No real patient records, de-identified or otherwise, are used as templates or few-shot examples. Realism comes from published clinical guidelines, public trial criteria, and clinician review.

**Deliverable per patient:** one FHIR bundle (JSON), the notes as DocumentReference resources plus a readable PDF, the YAML spec, and the answer key.

## Evaluation

A licensed mental health prescriber independently labels every match right shows for the 20 patients, and precision is the share they agree the patient is eligible for.

**Protocol**

1. Freeze the trial snapshot on one date so the tool and the reviewer see identical trial records.
2. Run right on all 20 patients. Keep up to 5 matches per patient, so at most 100 patient-trial pairs.
3. The reviewer gets each chart and each trial's full eligibility text, without right's explanation, and labels each pair: Eligible, Not eligible (which criterion), or Cannot tell from chart.
4. The reviewer then sees right's explanation and rates it 1 to 5 for accuracy and usefulness.
5. Disagreements are reviewed together and tagged by cause: extraction error, criterion parsing error, reasoning error, or chart ambiguity.

**Metrics**

| Metric | Definition |
| --- | --- |
| Precision | Pairs labeled Eligible divided by pairs shown. Report strict (Cannot tell counts as wrong) and lenient (Cannot tell dropped). |
| Exclusion leak rate | Shown pairs where the reviewer found a met exclusion. Target 0. |
| Criterion-level accuracy | Agreement on MET, NOT MET, EXCLUDED, UNKNOWN for a sample of 200 criteria |
| Extraction precision and recall | Per profile field, against the answer key |
| False exclusion rate | Reviewer checks 3 randomly sampled dropped trials per patient (60 pairs) and flags any wrongly ruled out |

**Things to know going in**

- Precision alone hides missed trials. The false exclusion sample is the cheap way to see whether the strict exclusion rule is throwing out good matches.
- 20 patients gives wide error bars. At 80 of 100 correct, the 95% interval is roughly 71% to 87%. Report the interval, not just the point estimate.
- Pairs from the same patient are correlated, so also report per-patient precision.
- One reviewer is one opinion. If a second clinician can label even 30 pairs, report agreement (Cohen's kappa).
- The patients were designed around known criteria, so results will be optimistic compared to real charts. Say so in any writeup.

## Architecture, privacy, risks, milestones

**Architecture**

- **Front end:** React SMART on FHIR app (EHR launch, OAuth 2.0 with PKCE), sized for Epic's embedded browser.
- **FHIR source:** HAPI FHIR with the 20 synthetic patients for MVP. Epic's FHIR R4 endpoints later, registered through Epic on FHIR and distributed through Epic Showroom.
- **Back end:** Python service with four modules: extraction, trial sync, eligibility evaluation, voice note.
- **Trial store:** Postgres with nightly sync from ClinicalTrials.gov, parsed criteria cached per trial version.
- **LLM:** used for note extraction, criteria parsing, criterion evaluation, explanations, and scripts. Every call logs prompt, model version, and output.
- **Audit log:** every match shown, every trial dropped and why, every voice note script.

**Privacy and compliance**

- MVP uses synthetic data only, so no PHI is processed.
- Before real data: BAAs with the LLM provider and ElevenLabs, a security review, and the health system's app approval process.
- Psychotherapy notes have extra HIPAA protection and substance use treatment records fall under 42 CFR Part 2. Plan to exclude both unless the site explicitly permits access.
- Wearable data needs the patient's own consent and is stored separately from the chart.
- Because right gives patient-specific output to clinicians, get a regulatory read on FDA clinical decision support criteria. Showing the basis for every match helps here.

**Risks**

| Risk | Mitigation |
| --- | --- |
| LLM misreads a criterion and a patient with an exclusion is shown | Exclusions evaluated first, citation required, leak rate tracked to 0 |
| Strict exclusion logic hides good trials | UNKNOWN is kept, false exclusion sampling in evaluation |
| Registry status is stale | Site-level status check, "last verified" date on the card, contact info shown |
| Key facts live only in notes | Note extraction with confidence, "confirm with patient" checklist |
| Scales live in Epic flowsheets that the FHIR API may not expose at every site | Confirm per site, fall back to note extraction |
| Synthetic results overstate real-world performance | Messy charts by design, state the limitation, plan a real-data pilot |
| Anxious patients feel pressured | Clinician-initiated only, neutral voice note, explicit voluntary language |

**Milestones**

1. Weeks 1 to 2: criteria survey, cohort matrix, patient specs.
2. Weeks 3 to 4: 20 synthetic charts built, validated, clinician face-validity review done.
3. Weeks 5 to 6: extraction agent, scored against answer keys.
4. Weeks 7 to 8: trial sync, matching engine, distance.
5. Weeks 9 to 10: right tab UI in a SMART sandbox, voice note, wearable module.
6. Weeks 11 to 12: clinician evaluation, error analysis, precision report.

**Open questions**

- [ ] Which metro is the pilot geography for patient ZIPs and the trial radius?
- [ ] Who is the clinician evaluator, and can a second one label a subset?
- [ ] Is "Cannot tell from chart" counted as a miss in the headline precision number?
- [ ] Should a trial needing a medication washout be shown with a warning or hidden?
- [ ] Does the pilot Epic site expose GAD-7 and PHQ-9 through FHIR Observation?
- [ ] Can custom patients be loaded into Epic's developer sandbox, or does the Epic demo need to use its stock test patients?
- [ ] Driving distance instead of straight-line distance in v2?

## Sources

- [ClinicalTrials.gov API v2 documentation](https://clinicaltrials.gov/data-api/api)
- [Epic on FHIR](https://fhir.epic.com/)
- [SMART App Launch](https://hl7.org/fhir/smart-app-launch/)
- [Oura API v2 docs](https://cloud.ouraring.com/v2/docs)
- [WHOOP developer docs](https://developer.whoop.com/)
- [Synthea](https://github.com/synthetichealth/synthea)
