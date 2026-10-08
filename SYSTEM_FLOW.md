# right: system flow

How a patient chart becomes a ranked, explained list of recruiting anxiety trials in the right tab. Full requirements are in [PRD.md](PRD.md).

```mermaid
flowchart TD
    A["Clinician opens patient chart in Epic"] --> B["Clicks the right tab"]
    B --> C["SMART on FHIR launch<br/>OAuth 2.0, patient context"]

    subgraph P1["Part 1: EHR extraction agent"]
        D["Pull FHIR R4 resources<br/>Patient, Condition, MedicationRequest,<br/>Observation, Encounter, DocumentReference"]
        E["Parse coded data<br/>ICD-10-CM, RxNorm, LOINC, CPT"]
        F["LLM reads clinical notes<br/>for facts that are not coded"]
        G["Structured patient profile<br/>every fact has source, date, confidence"]
        D --> E --> G
        D --> F --> G
    end

    C --> D

    W["Optional: wearable data<br/>Oura / WHOOP, patient opt-in"] -.-> G

    subgraph P2["Part 2: trial matching engine"]
        H["ClinicalTrials.gov API v2<br/>anxiety trials, status RECRUITING,<br/>geo radius around patient ZIP"]
        I{"Passes age, sex,<br/>recruiting site in range?"}
        J["LLM splits eligibility text into<br/>inclusion and exclusion criteria"]
        K{"Patient meets any<br/>exclusion criterion?"}
        L{"All inclusion criteria<br/>met or unknown?"}
        M["Score match and<br/>compute distance to nearest site"]
        X["Drop trial<br/>logged with reason, never shown"]
        H --> I
        I -- No --> X
        I -- Yes --> J --> K
        K -- Yes --> X
        K -- No --> L
        L -- No --> X
        L -- Yes --> M
    end

    G --> H
    G --> K

    subgraph UI["The right tab in Epic"]
        N["Ranked trial cards<br/>sort by best match or nearest,<br/>filter by radius"]
        O["Why matched: criterion by criterion<br/>with chart evidence"]
        Q["Confirm with patient checklist<br/>for unknown items"]
        R["Prompt: talk to your patient<br/>about this trial"]
        N --> O --> Q --> R
    end

    M --> N
    Q -- "Answer triggers an exclusion" --> X

    subgraph VN["Optional: patient voice note"]
        S["LLM drafts plain-language script<br/>about the trial, no PHI"]
        T["Clinician reviews and approves"]
        U["ElevenLabs text to speech"]
        V["Audio played or shared with patient"]
        S --> T --> U --> V
    end

    R --> S
    R --> Y["Clinician records outcome<br/>interested, declined, not appropriate"]
    V --> Y

    subgraph EV["Evaluation on 20 synthetic patients"]
        Z["Clinician independently labels<br/>each shown match"]
        ZZ["Precision, exclusion leak rate,<br/>false exclusion sample"]
        Z --> ZZ
    end

    N -.-> Z
    X -.-> ZZ
```

## Reading the chart

- **Solid arrows** are the live clinical path. **Dotted arrows** are optional inputs or the offline evaluation.
- **Exclusions are checked before inclusions.** One met exclusion drops the trial and stops evaluation.
- **Unknown is not a failure.** A criterion the chart cannot answer keeps the trial and becomes a "confirm with patient" item.
- **Dropped trials are never shown** to the clinician, but they are logged so the evaluation can sample them for wrongly excluded matches.
