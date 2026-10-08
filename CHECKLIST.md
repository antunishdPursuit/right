# Team 8 checklist

## Current state

- **Phase:** practitioner-informed concept update; no concept selected or code started.
- **Clock:** as of 2026-10-08 2:33 p.m. EDT, about 2 hours 27 minutes until the event starts at 5:00 p.m. EDT. The exact build and submission cutoffs are not published.
- **Done:** public event page and Team 8 thread reviewed; Shameeka identified slow post-session notes and weak identifier protection in AI note tools; Shay reported prior trial-matching work. Updated Track 2 candidates are in `CONCEPT_SCORECARD.md`.
- **Next action:** validate the clinician Epic-note diagnosis rule with Breanne and Shameeka, and ask whether trial visit SOAP drafting or protocol-to-note QA is the closer Track 2 pain. At the event, lock one concept in 10 minutes and spike it before building the interface.
- **Blockers / unknowns:** how the Epic note requirement fits trial operations, Breanne's trial-operations view, exact venue address, Luma attendee status, rubric, submission method, and credit availability remain unverified.

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
