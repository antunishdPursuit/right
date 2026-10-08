# Team 8 concept portfolio

Updated 2026-10-08. These are **discussion candidates**, not a selected build. Team 8 is assigned to Track 2. Tracks 1 and 3 are comparison ideas unless hosts permit a track change. No technical spike has run.

## October 8 practitioner update: lead with documentation

Shameeka reported two problems from her work as a provider: post-session notes take a long time, and AI note tools may fail to protect identifying information. Her recent behavioral-health product work involved model evaluation sets and risk mitigation. This is direct practitioner evidence for a documentation workflow; it is not evidence that trial-site documentation is identical. Shay reported that she has already built an award-winning clinical trial matching platform. Avoid a basic matcher and ask whether her existing work can supply criteria or evaluation cases. Sources: team Gmail thread `1a11407826df8a17`, Shameeka message `1a11b6d782f777f4`, Shay message `1a11883c29968e4d`.

### Confirmed team notes for the concept

- Dennys means **SOAP notes**: Subjective, Objective, Assessment, Plan.
- For the workflow Dennys described, **the clinician's Epic note must omit the diagnosis**. Treat this as a project-specific requirement to validate with the practitioners, not a general HIPAA rule. The Assessment section can contain only clinician-approved observations or language; the product must not infer or insert a diagnosis.
- Epic is the named healthcare application/workflow context. Treat a synthetic Epic-style screen as a mockup unless a real Epic sandbox integration is tested. Do not claim production Epic access or writeback.
- Revised candidate: **SOAP note draft and diagnosis guard**. Enter a synthetic session summary; Claude drafts the four sections. A deterministic check blocks the preview if it contains a seeded diagnosis phrase or identifying detail, and flags uncertain cases for clinician review. The clinician edits and approves the draft. Do not claim the detector catches every diagnosis or identifier, and do not send real notes to the event API.
- ElevenLabs extension to spike: replace pasted text with a short synthetic clinician dictation transcribed by Scribe v2 Medical (`scribe_v2_medical`). Display and let the clinician correct the transcript before Claude drafts the note. For the two-hour build, prefer the batch Speech to Text API over a live agent; only add ElevenAgents or Speech Engine if the team confirms that an interactive voice prompt solves a specific missing-information problem. The Creator coupon is for synthetic data only; production PHI would need vendor BAAs and eligible configurations before upload.
- The distinction matters: HHS describes SOAP notes as chart notes and distinguishes them from psychotherapy notes; a general ban on diagnoses in all clinical notes is not established by the sources checked. See https://www.hhs.gov/hipaa/for-professionals/faq/right-to-access-and-research/index.html and https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html . Epic's developer site provides a sandbox with test patient data, but this project has not used it: https://open.epic.com/DeveloperResources .

### Updated Track 2 ideas for team discussion

| Candidate | First 30 seconds | Mechanism and safety boundary | Measurable spike / open question |
| --- | --- | --- | --- |
| **A. Trial-visit SOAP note preflight** | Paste a synthetic session summary; show a SOAP draft and block an Epic-style clinician-note preview when a seeded diagnosis phrase or identifying detail appears. | Claude drafts the four sections from synthetic input. Deterministic checks enforce the project-specific no-diagnosis rule, require source support, and flag uncertainty. A clinician edits and approves; the demo does not write to Epic. **Do not call this HIPAA de-identification or send real patient notes to the event API.** | Time to produce a reviewed draft; seeded diagnosis/identifier detection; unsupported facts and missing trial fields. Confirm with Breanne whether this is a real trial-operations bottleneck and the no-diagnosis rule fits this note type. |
| **B. Protocol-to-note quality check** | Show a synthetic draft trial visit note beside a public protocol; the tool flags one missing required observation and one unsupported statement with exact source references. | Claude maps protocol requirements to note evidence; rules preserve unknowns and create a human review queue. It never signs notes, decides clinical significance, or changes trial records. | Detection on 5–10 seeded omissions and false alarms versus a checklist baseline. Confirm whether trial staff have a repetitive note QA step. |
| **C. Screening-note evidence packet** | A synthetic screening conversation becomes criterion-level evidence and unanswered questions, without declaring the person eligible. | Extend Shay's matching experience toward documentation: Claude extracts evidence, unknowns, and citations; local checks block identifiers before export; coordinator decides next questions. | Agreement with practitioner-labeled criteria; number of unsupported eligibility claims. Confirm whether this adds value beyond Shay's existing platform. |

**Working preference:** A is closest to Shameeka's stated pain and gives Dennys's Referral Ready review pattern a useful new role. B may fit Track 2 more clearly and is safer to demo in two hours because it does not need a transcription step. C is a fallback if the team wants to build on Shay's matcher. All remain conditional until the practitioners confirm the trial workflow and a short spike works. No voice integration is necessary for the core proof.

**Privacy basis:** [HHS de-identification guidance](https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html) defines formal Safe Harbor and Expert Determination methods; a prototype identifier detector is neither. [Anthropic's BAA guidance](https://support.anthropic.com/en/articles/8114513-business-associate-agreements-baa-for-commercial-customers) limits PHI use to eligible services under an agreement. Event API credit alone does not establish that setup. Use synthetic cases and show a blocked export as a product behavior, not a compliance claim.

## Evidence and strategy

- The event page repeatedly asks for a real care or clinical workflow, a build with Claude, and a short demo. It names three tracks but publishes **no judging rubric**; the internal criteria below are our decision aid, not judge criteria.
- BetterHelp describes preference-aware matching and culturally responsive care at scale. This suggests expertise Breanne can apply to engagement and handoff concepts; it does not prove she sees these exact problems in her job. Source: https://www.betterhelp.com/advice/therapy/how-expert-therapist-matching-and-culturally-concordant-care-improve-clinical-outcomes/
- Ayush says in the team email that he builds agentic data pipelines. Mogean publicly describes customer data analysis and behavior-to-insight workflows. The transferable skill is data quality, event processing, and measurement, not using consumer location data for health. Sources: Gmail thread `1a11407826df8a17`; https://www.linkedin.com/company/mogean-inc-
- Shay is a Columbia genetics PhD candidate per the team email and publicly discusses Nucleate bioinnovation and clinical trial decision support. This suggests value in protocol nuance and validation, not access to private Columbia or Nucleate data. Sources: Gmail thread `1a11407826df8a17`; https://www.linkedin.com/in/shaghayegh-beheshti ; https://nucleate.org/
- Shameeka's team-email role is behavioral science and clinical prompt engineering in mental health; no current employer was confirmed. Use her expertise to define safe language and human review, without assigning her an unverified company background.
- Recruitment and screening are plausible pains, but not established Team 8 priorities. A published surgical-trial analysis found frequent enrollment shortfalls and delays in its study population; do not generalize its rates to mental health trials. Source: https://pmc.ncbi.nlm.nih.gov/articles/9857498/
- An analogous Anthropic winner, PostVisit.ai, focused on one after-visit workflow, and another winner made permit corrections traceable to documents. Transfer the narrow, inspectable mechanism, not their products. Source: https://claude.com/blog/meet-the-winners-of-our-built-with-opus-4-6-claude-code-hackathon
- A publicly described Claude life-sciences hackathon winner already offers patient-to-trial matching. A plain match list would be generic; a Team 8 screening concept needs a sharper claim such as missing-evidence triage and safe abstention. Source: https://www.linkedin.com/posts/hey-jules-park_life-sciences-hackathon-winners-activity-7484003392810418176-oYXl

## Reusable work from Dennys's GitHub

- **[Referral Ready](https://github.com/antunishdPursuit/referral-ready):** A synthetic healthcare referral demo that identifies missing administrative information, prepares a consolidated request, and moves a case to ready-for-scheduling only after human approval. Reuse its evidence display, bounded model output, and review pattern for Track 2. Its README does not claim a live clinical integration.
- **[Landline](https://github.com/antunishdPursuit/Landline):** A hotel concierge demo using an ElevenLabs voice agent and a staff request board. Reuse voice and handoff lessons if a voice flow solves a real Team 8 problem; do not present it as a healthcare deployment.
- **[Esme](https://github.com/antunishdPursuit/applied-ai-system-project):** A music assistant combining Claude tool use with optional ElevenLabs speech. This demonstrates prior work with both event technologies, though its product domain is unrelated.

Source: current public default-branch GitHub READMEs, checked 2026-10-07. No live deployment check was done for these projects during this intake.

## Initial six ideas: two per event track (before practitioner reply)

| Track and idea | Team-background prompt and user pain | Claude's necessary work; real input and system | Safety, 30-second demo, measure | Sponsor use and access fallback |
| --- | --- | --- | --- | --- |
| **1A. Between-visit check-in router** | BetterHelp-style continuity plus Shameeka's behavioral-science judgment: a participant sends a free-text update between visits, and staff need to know what needs attention. | Claude extracts the stated issue, urgency evidence, and uncertainty from a synthetic message; a deterministic router chooses only approved follow-up categories. Optional ElevenLabs voice input/output. | No diagnosis or treatment advice; concerning or unclear messages go to a human. Show one routine check-in and one escalation. Measure correct routing and missed escalations on a small labeled set. | Claude is core; ElevenLabs voice is a spike only. If voice fails, use text input and speech-free output. |
| **1B. Meaning-preserving multilingual reminder** | Breanne's international clinical operations and BetterHelp's language/fit focus: participants may misunderstand visit instructions. | Claude adapts one approved trial reminder for language and reading level; a rules layer checks required dates, prohibitions, and contact details against the source. ElevenLabs can read the approved version aloud. | Never invent a clinical instruction. Human approves mismatches. Demo a deliberately altered instruction caught by the validator. Measure required-fact preservation and comprehension questions. | Claude transformation and verification are visible; ElevenLabs is useful only if audio comprehension is tested. Text-only fallback. |
| **2A. Screening evidence-gap triage** | Shay's research context plus Ayush's pipeline skills: coordinators need to find what information is missing before they spend time on a full screen. This is a question-preparation tool, not a final eligibility decider. | Pull a public ClinicalTrials.gov study's criteria; Claude maps each criterion to a synthetic intake note with quoted evidence and status: supported, contradicted, or unknown. A schema and rules engine reject unsupported eligibility claims. | Unknown stays unknown; coordinator owns screening. Demo a patient who looks like a match until an exclusion criterion lacks evidence. Measure criterion-level agreement with a practitioner-labeled set and unsupported assertions. | Claude is necessary for nuanced criterion mapping; event credit supports the API. If live ClinicalTrials.gov access fails, use a cited, saved public record. |
| **2B. Protocol-change impact ledger** | Breanne's clinical operations and Shay's research lens: a protocol amendment can leave screening questions and staff documents out of sync. | Claude compares two public or permission-cleared protocol versions, extracts changed criteria/visit steps with citations, and a deterministic dependency map shows which synthetic forms or tasks need review. | Never change live trial operations automatically; human approves every task. Demo one changed exclusion rule producing a precise review queue and one false-positive correction. Measure recall of seeded changes and time to find affected artifacts. | Claude is core; event credit supports it. If versioned protocols are unavailable, use a small public protocol plus a clearly labeled synthetic amendment for the spike. |
| **3A. Intake-to-handoff consistency checker** | Shameeka's clinical prompt work and BetterHelp's care workflow: a patient repeats context when a visit changes hands, and action items get lost. | Claude compares a synthetic intake summary with a provider-approved plan; a schema produces only missing questions, appointment tasks, and cited conflicts. | No independent care plan or diagnosis. Demo a missing follow-up item caught before handoff. Measure detection against seeded omissions and false alarms. | Claude is core; no second service needed. Local deterministic comparison is the baseline. |
| **3B. Referral friction queue** | Breanne's international operations and Ayush's event-pipeline experience: referral requests can stall on missing forms, scheduling, or unclear responsibility. | Claude classifies a synthetic referral thread and extracts the next administrative action; a state machine assigns a human owner and tracks resolution. | Clinical urgency or ambiguity goes to staff. Demo a stuck referral advancing only after a coordinator approves the action. Measure task extraction and time-to-resolution on simulated cases. | Claude handles messy language; event credit supports it. Use a local task queue if no external workflow account exists. |

**Scope note:** Ideas 1A and 1B align with Track 1, and 3A and 3B align with Track 3. They should not replace the assigned Track 2 plan without host approval. None needs private employer data, patient records, or a clinical integration for the demo.

## Initial internal selection scorecard (superseded by practitioner update)

Score 1–5. The minimum for **model necessity, competition fit, measurable proof, and delivery confidence** is 3 each. A passing recommendation also needs practitioner-confirmed pain, a safe failure, a visible official resource, and a successful spike. An official rubric was not available to weight the score. The first three columns are our most useful initial comparisons, not final recommendations.

| Criterion | 2A Evidence-gap triage | 2B Change ledger | 1A Check-in router |
| --- | ---: | ---: | ---: |
| User pain | 4 | 3 | 4 |
| Direct user evidence | 2 | 2 | 2 |
| Model necessity | 4 | 5 | 4 |
| Competition fit | 5 | 5 | 1 |
| Technical differentiation | 3 | 4 | 3 |
| Systems depth | 4 | 5 | 4 |
| Real input / external action | 4 | 3 | 3 |
| Safe failure and recovery | 4 | 4 | 4 |
| Measurable proof | 4 | 4 | 4 |
| First-30-second demo clarity | 5 | 4 | 4 |
| Sponsor-resource leverage | 4 | 4 | 4 |
| Two-hour build feasibility | 4 | 2 | 3 |
| Delivery confidence | 3 | 2 | 3 |

Rationale at the time of the initial pass: 2A had public study criteria and a narrow loop, but user pain and model quality still needed practitioner and API checks. 2B had a stronger operational mechanism but needed suitable versioned inputs and could exceed two hours. 1A was off Team 8's assigned track. The October 8 practitioner reply changes the priority toward documentation. No candidate is marked as passing yet. A team can choose a lower-scoring idea, but must record the failed gate, reason, risk owner, mitigation, and fallback at concept lock. Official track and submission rules cannot be waived internally.

## First questions and spike

1. Ask Breanne and Shameeka: Which step costs the most coordinator time in your real workflows: finding candidates, gathering missing screening evidence, handling protocol changes, or something else? What is the one handoff where a mistake matters most?
2. If 2A fits, use one public study and 3–5 synthetic intake notes, including a clear match, a clear exclusion, an unknown, a contradictory note, and a missing field. Compare Claude's criterion map with a rules/templates baseline and practitioner labels.
3. If 2B fits better, obtain two safe protocol versions. First prove one amendment can be extracted with exact source spans and correctly mapped to one downstream document.
4. Record model/runtime, latency, outputs, invalid results, setup cost, and continue/redesign/reject decision here. No spike has been run as of this note.

## Innovation gate for the eventual selection

At concept lock, write one product thesis and one technical thesis. Show why Claude is necessary, one deep mechanism, one state-changing input or action, one safety invariant, one measured result, one failure/recovery, and one memorable first 30 seconds. Compare with a rules/templates baseline. If the model can be removed without weakening the claim or no measurable proof exists, narrow or redesign before coding.
