"""ElevenLabs agent definitions: trial Q&A (idea B) and teach-back check (idea C).

Edit the prompts here, then run `python agents.py` to update the team's two shared agents in place.
`python agents.py --new` creates your own pair instead and writes their IDs to voice/.env.
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

HERE = Path(__file__).parent
LLM = "claude-opus-5-5"
# ElevenLabs requires English agents to use flash/turbo v2; the Spanish preset switches to the
# multilingual v2.5 model automatically.
TTS_MODEL = "eleven_flash_v2"
# Stand-in voices until we have the doctor's own. Override either in .env.
DOCTOR_VOICE = "cjVigY5qzO86Huf0OWal"  # "Eric - Smooth, Trustworthy": reads the summary as the doctor
AGENT_VOICE = "SAz9YHcvj6GT2YYXdXww"  # "River - Relaxed, Neutral, Informative": the assistant agents

SAFETY = """- Never say the patient is eligible or will be accepted. Say their doctor thinks they may qualify and the study \
team decides after screening.
- Joining is voluntary. Saying no will not change their regular care.
- Never give medical advice or comment on the patient's own health, diagnosis, or medicines. Suggest they ask their \
doctor, who is in the room.
- Do not ask for or repeat personal details such as name, birthday, or address.
- If the patient sounds very upset, mentions hurting themselves, or describes an emergency, stop talking about the \
study and tell them to speak to their doctor right now. Their doctor is in the room.
- Calm, neutral tone. No pressure, no urgency, no selling.
- Speak in the language this conversation started in."""

QA_PROMPT = f"""You are a patient information assistant on a doctor's screen in a mental health clinic. The doctor has \
asked you to answer the patient's questions about one clinical trial. You are speaking with the patient.

Study: {{{{trial_title}}}} (ClinicalTrials.gov {{{{trial_id}}}})

Script the doctor approved and the patient just heard:
{{{{trial_summary}}}}

Facts from the official trial record:
{{{{trial_facts}}}}

How to answer:
- Answer only from the script and facts above. If the answer is not there, say you don't know and that the study team \
can answer it. Never guess numbers, dates, payments, side effects, or locations.
- Use short, plain sentences at about a 6th-grade reading level. Keep each answer to one to three sentences, then ask \
if they have another question.
- When the patient says they have no more questions or says goodbye, say goodbye once and end the call.
{SAFETY}"""

TEACHBACK_PROMPT = f"""You are a patient information assistant on a doctor's screen in a mental health clinic. The \
patient just heard a short explanation of a clinical trial: {{{{trial_title}}}}. Your job is a teach-back check: make \
sure the explanation was clear. This is not a test of the patient.

Key points the patient should be able to explain:
{{{{key_points}}}}

Script they heard:
{{{{trial_summary}}}}

Steps:
1. Your first message already asked them to explain the study in their own words. Listen to the answer.
2. For each key point they did not mention, ask one open question, one at a time. For example: "What happens if you \
decide not to join?" Ask at most four follow-up questions.
3. If an answer is wrong or unsure, kindly give the correct information in one sentence, using only the key points \
and script above, and move on.
4. When you are done, thank them, say their doctor will go over anything still unclear, and end the call.
5. If the patient is very upset or mentions hurting themselves, tell them to speak to their doctor right now, then \
end the call.
{SAFETY}"""

AGENTS = {
    "qa": {
        "env": "QA_AGENT_ID",
        "id": "agent_7001m4ex14sqfp9taxva3r9d2dgc",  # the team's agent; private, so the ID alone grants nothing
        "name": "Triright: trial questions",
        "prompt": QA_PROMPT,
        "first": {
            "en": "Hi. I can answer questions about the study your doctor mentioned. What would you like to know?",
            "es": "Hola. Puedo responder sus preguntas sobre el estudio que mencionó su médico. ¿Qué le gustaría saber?",
        },
        "placeholders": {"trial_title": "A study of a new anxiety medicine", "trial_id": "NCT00000000",
                         "trial_summary": "(approved script)", "trial_facts": "(facts from the trial record)"},
    },
    "teachback": {
        "env": "TEACHBACK_AGENT_ID",
        "id": "agent_1601m4ex17b1e6zajq9mnjty1k5q",
        "name": "Triright: teach-back check",
        "prompt": TEACHBACK_PROMPT,
        "first": {
            "en": "Thanks for listening. To make sure we explained it clearly, could you tell me in your own words "
                  "what this study is about and what taking part would involve?",
            "es": "Gracias por escuchar. Para asegurarnos de que lo explicamos bien, ¿podría decirme con sus propias "
                  "palabras de qué trata este estudio y qué implicaría participar?",
        },
        "placeholders": {"trial_title": "A study of a new anxiety medicine", "trial_summary": "(approved script)",
                         "key_points": "- (key points)"},
    },
}


def agent_id(kind):
    """The agent to use: .env override first, then the team's shared agent."""
    return os.environ.get(AGENTS[kind]["env"]) or AGENTS[kind]["id"]


def config(kind, voice_id):
    a = AGENTS[kind]
    prompt = {"prompt": a["prompt"], "llm": LLM, "temperature": 0,
              # Lets the agent hang up after goodbye; the page then ends the session (and scores a teach-back).
              "built_in_tools": {"end_call": {"type": "system", "name": "end_call", "description": "",
                                              "params": {"system_tool_type": "end_call"}}}}
    return {
        "name": a["name"],
        "tags": ["triright", "hackathon"],
        "conversation_config": {
            "agent": {
                "first_message": a["first"]["en"],
                "language": "en",
                "prompt": prompt,
                "dynamic_variables": {"dynamic_variable_placeholders": a["placeholders"]},
            },
            "tts": {"model_id": TTS_MODEL, "voice_id": voice_id, "speed": 0.95},
            "language_presets": {"es": {"overrides": {"agent": {"first_message": a["first"]["es"]}}}},
        },
        # The page picks English or Spanish when it starts a session, so allow that one override.
        "platform_settings": {"overrides": {"conversation_config_override": {"agent": {"language": True}}}},
    }


def main():
    for env_file in (HERE / ".env", HERE.parent / ".env", HERE.parent.parent / ".env"):
        load_dotenv(env_file)
    import eleven

    voice_id = os.environ.get("ELEVENLABS_AGENT_VOICE_ID") or AGENT_VOICE
    new = "--new" in sys.argv  # create your own agents instead of updating the team's shared ones
    for kind, a in AGENTS.items():
        aid = None if new else agent_id(kind)
        if aid:
            eleven.update_agent(aid, config(kind, voice_id))
            print(f"Updated {a['name']}: {aid}")
        else:
            aid = eleven.create_agent(config(kind, voice_id))
            with open(HERE / ".env", "a") as f:
                f.write(f"\n{a['env']}={aid}\n")
            print(f"Created {a['name']}: {aid} (saved to .env as {a['env']})")


if __name__ == "__main__":
    main()
