# Team 8 checklist

## Current state

- **Phase:** practitioner-informed concept update; no concept selected or code started.
- **Clock:** as of 2026-10-08 2:33 p.m. EDT, about 2 hours 27 minutes until the event starts at 5:00 p.m. EDT. The exact build and submission cutoffs are not published.
- **Done:** public event page and Team 8 thread reviewed; Shameeka identified slow post-session notes and weak identifier protection in AI note tools; Shay reported prior trial-matching work. Updated Track 2 candidates are in `CONCEPT_SCORECARD.md`.
- **Next action:** validate the clinician Epic-note diagnosis rule with Breanne and Shameeka, and ask whether trial visit SOAP drafting or protocol-to-note QA is the closer Track 2 pain. At the event, lock one concept in 10 minutes and spike it before building the interface.
- **Blockers / unknowns:** how the Epic note requirement fits trial operations, Breanne's trial-operations view, exact venue address, Luma attendee status, rubric, submission method, and credit availability remain unverified.

## EHR mockup: voice and trial-match ideas (discussed 2026-10-08, not built)

Mockup file: `ehr-notes-mockup.html`. Placeholder patients only; swap in the team's synthetic dataset after the screen layout is final.

### Voice plan (decided 2026-10-08)

Built in `app/voice/` (see `app/voice/README.md`). The patient listens on the doctor's screen in the clinic. English first, Spanish second.

- [x] **Trial script:** Claude writes a plain-language script in English and Spanish ("may qualify", voluntary, study team decides). The doctor approves it before anything plays.
- [x] **Spoken summary:** ElevenLabs reads the approved script in English or Spanish.
- [x] **A. Doctor's message dubbed:** the doctor records a short message; ElevenLabs dubbing turns it into Spanish in the doctor's own voice.
- [x] **B. Trial Q&A agent:** the patient asks questions; the agent answers only from the trial record.
- [x] **C. Teach-back check:** the agent asks the patient to explain the study back; Claude scores each key point for the doctor.
- [x] **Name (decided 2026-10-09):** the product is now Triright (was "right"). UI copy and docs use the new name; code identifiers such as `window.RightVoice` and `RIGHT_VOICE_URL` are unchanged.
- [ ] Test A–C end to end with real keys, then connect them to the Triright tab in `app/`.
- [ ] Make one finished dub before the demo and keep its project ID as a backup.
- [ ] **Back burner, D:** voice pre-screening for the "confirm with patient" items.
- [ ] **Lowest priority:** dictation with Scribe (doctor talks, note is drafted).

### Risks to resolve

- [ ] Scope: four voice/AI features in a two-hour build. Pick at most two for the live demo.
- [ ] Eligibility claim: software can't decide eligibility; the coordinator does. Show unknown criteria.
- [ ] No-diagnosis rule vs. matching: most trial criteria need a diagnosis. Decide whether matching reads the Problem List or only symptoms and screener scores.
- [ ] Recording the patient (ambient listening) needs patient consent, and real health data to ElevenLabs needs their enterprise BAA and zero retention. Demo with a teammate reading a synthetic script.
- [ ] Translated trial materials normally need ethics-board (IRB) approval. Dubbed summary is demo / info only.
- [ ] Claude must have a visible role: transcript to SOAP draft, and criterion-by-criterion evidence.
- [ ] Timing: show trials in a quiet side panel during the visit, not a pop-up after the patient leaves (alert fatigue).

### Open questions for the team

- [ ] ElevenLabs test screen under Wrap-Up, or the real flow built into the Notes screen?
- [ ] Voice agent audience: the doctor, or the patient? In the room or after the visit?
- [ ] Where does the diagnosis for matching come from, given the note can't include it?
- [ ] Real ClinicalTrials.gov trials or hand-written demo trials?
- [ ] Which language for the dubbed summary? Ask Breanne and Shameeka.
- [ ] Have the practitioners confirmed that trial recruitment at the visit is a real gap?
- [ ] Owners: voice integrations, Claude note drafting, and trial matching are three separate pieces of work.

## Before arrival

- [ ] Verify Luma approval and exact Fabrik NYC address in the attendee view.
- [ ] Sign in to Claude with the registration email; create/check an Anthropic Console organization with that same email. Do not record credentials here.
- [ ] Check Claude Code and the chosen local runtime on the actual laptop.
- [ ] Confirm whether the team has a shared repository, deployment account, and a person who can operate the final demo.
- [ ] Ask the practitioners for one real workflow, a concrete failure case, what humans must approve, and a safe synthetic example. Do not request patient information.
- [ ] Decide whether the ElevenLabs coupon and Discord are worth setup time. Do not start paid use or create production credentials early.
- [ ] Bring laptop, charger, network backup, and a local demo fallback. Verify venue access and any adapter needed.

## Event workback (relative to the two-hour build window)

1. **Minutes 0–15:** concept lock. State user, problem, product and technical theses, sponsor mechanism, demo moment, owners, risk, and fallback. Update this file.
2. **Minutes 15–35:** test the hardest claim with real public or synthetic input. Record output, latency, invalid cases, and continue/redesign decision in `CONCEPT_SCORECARD.md`.
3. **Minutes 35–85:** build one end-to-end loop. Claude handles interpretation; deterministic code enforces rules and approval. One engineer owns integration; others can work on sample cases and demo.
4. **Minutes 85–105:** freeze features, run realistic cases, and verify one safe failure/recovery. Prepare a local fallback.
5. **Minutes 105–120:** rehearse the 2–3 minute demo and deliver any required link or form with a buffer. Confirm submission, rather than leaving a draft.

## Delivery and evidence

- [ ] Get official rubric, submission rules, and deadline from hosts; record them in `EVENT_BRIEF.md`.
- [ ] Record source and date for every public dataset or trial shown.
- [ ] Measure at least one outcome against a rules/templates baseline and show an abstention or escalation case.
- [ ] Test the exact demo build, public links logged out, and local fallback.
- [ ] Record exact commit, live URL, video, project page, team roster, and official submission confirmation after delivery.
- [ ] After the event, create one `FINAL_CLOSEOUT.md` with results, evidence limits, and reusable lessons.
