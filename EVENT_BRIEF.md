# Claude Build Day | Mental Health & Wellness

Checked: 2026-10-07 (America/New_York). This is the event entry point. Facts below come from the event page and the October 6 Team 8 email; planning ideas are labeled separately.

## Confirmed event facts

- **Event:** Claude Build Day | Mental Health & Wellness, presented by Claude Community Events, in partnership with ElevenLabs.
- **When:** Thursday, October 8, 2026, 5:00–9:00 p.m. EDT, New York City. The team email says Fabrik NYC; the public event page hides the exact address. Verify the address in the attendee view or with the host before travel.
- **Team:** Team 8, assigned to **Track 2 · Accelerate Clinical Trials: Automation & AI Operations**. The event page also lists Track 1, Beyond the Clinic: Continuous Patient Support & Engagement, and Track 3, Frictionless Care: Streamlining Experience for Patients & Providers.
- **Format:** The team email says two hours to build and 2–3 minutes to demo. The public page does not give a detailed hour-by-hour agenda, rubric, prize, or formal submission requirements.
- **Team composition:** Breanne Kaiser and Shameeka Marc are the practitioner members; Ayush Sharma, Dennys Antunish, and Shay Beheshti are the engineer members. See the October 6 team email for the original roster and private coordination details.
- **Preparation requested by hosts:** Reply all with a brief introduction and a problem to explore; use the registration email for Claude and an Anthropic Console organization; bring 1–2 real challenges. API credit is expected on event day and attaches to the Console organization. Credit amount is not stated on this event page.

## Rules and unknowns

- **Official track scope:** Track 2 covers recruitment, screening, documentation, and trial operations. The other tracks are listed above for comparison. Team 8's assigned track should be treated as binding unless hosts approve a change.
- **Unconfirmed:** eligibility rules, judging rubric, judges, prize, required repository or demo link, exact submission mechanism and deadline, whether ElevenLabs use is required, and whether the team can enter another track.
- **Registration:** Team assignment is evidence of participation planning, but Luma registration status was not verified in the signed-in attendee view.
- **Safety boundary:** Use synthetic or explicitly public data for the prototype. ElevenLabs documentation says processing protected health information requires an enterprise BAA and Zero Retention Mode. A free Creator coupon is not evidence of either. Do not load real patient records or clinical conversations into sponsor tools without an approved setup.

## Supplied resources and decisions

| Resource | Decision | Core use / rubric value | Setup cost and dependency | Demo visibility / reason |
| --- | --- | --- | --- | --- |
| Claude and event API credit | **Use** | Necessary interpretation of nuanced free text, with quoted evidence and uncertainty; no official rubric is published | Create Console organization with registration email; verify credit on event day | Show criterion-level reasoning, structured output, and safe abstention; central event technology |
| Claude Code | **Use** | Build and verify a narrow end-to-end prototype | Verify local install and account | Build tool, not a product feature |
| ElevenLabs Creator coupon and hacker guide | **Spike Scribe v2 Medical first** | Synthetic clinician dictation becomes a transcript before Claude drafts a trial-visit SOAP note; optionally show speaker labels and seeded diagnosis/identifier checks | Redeem coupon in Discord, create server-side API key, record synthetic audio, call batch Speech to Text with `scribe_v2_medical`; free Creator coupon does not provide a BAA or Zero Retention Mode | Show raw transcript, reviewed SOAP draft, and blocked Epic-style preview; no Epic write or real patient audio |
| ElevenLabs Discord support | **Use if needed** | Coupon and integration support | Join/access check | Support resource, not a demo feature |
| ClinicalTrials.gov API v2 | **Spike** | Public, current study criteria for Track 2; not an event sponsor resource | Check endpoint and fields before build | Real external source and source links in the demo |
| Practitioners' workflow knowledge | **Use** | Identify actual bottleneck, approval step, and realistic sample case | Requires team conversation | The core claim must reflect a real workflow rather than a guessed one |

## Event and research sources

| Source | Type | Checked | Material finding |
| --- | --- | --- | --- |
| https://luma.com/claude-r5w5 | Official public event page, viewed in browser | 2026-10-07 | Event date, time, three tracks, hosts, Claude credit, ElevenLabs partnership; exact address hidden |
| Gmail thread `1a11407826df8a17`, subject “Important - Meet your Claude Build Day team: Team 8 · Accelerate Clinical Trials” | Host email, Oct 6; teammate reply, Oct 7 | 2026-10-07 | Team roster, assigned track, Fabrik NYC, two-hour build, 2–3 minute demo, account and coupon instructions; Ayush asked the practitioners about the real bottleneck |
| https://docs.google.com/document/d/1mCh5MtOzBw0aJpurQVUmIVFfPMAHW3MjNemE-LNiMto/edit | Sponsor guide linked in host email | 2026-10-07 | Link confirmed; guide contents not yet extracted |
| https://www.nlm.nih.gov/pubs/techbull/ma24/ma24_clinicaltrials_api.html | NLM official technical notice | 2026-10-07 | ClinicalTrials.gov API v2 provides programmatic study data |
| https://elevenlabs.io/docs/eleven-agents/legal/hipaa | ElevenLabs official documentation | 2026-10-07 | BAA and Zero Retention Mode required for permitted PHI use; BAA limited to eligible enterprise customers |
| https://claude.com/blog/meet-the-winners-of-our-built-with-opus-4-6-claude-code-hackathon | Anthropic winner article | 2026-10-07 | Prior winners made one concrete workflow inspectable; this is analogous evidence, not this event's rubric |

## Final artifact links

Not yet built or submitted. Record the exact repository, live demo, video, writeup, and submission confirmation here after they exist.
