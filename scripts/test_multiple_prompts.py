import sys
import asyncio
import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.models import JobOptions
from backend.services.prompt_engine import understand_prompt, generate_semantic_storyboard

TEST_PROMPTS = [
    {
        "type": "ADVERTISEMENT",
        "prompt": "Create a luxury advertisement for a sleek black sports car gliding through a modern city at dusk."
    },
    {
        "type": "EXPLAINER",
        "prompt": "Explain how solar energy is captured by photovoltaic panels and powers modern homes."
    },
    {
        "type": "DOCUMENTARY",
        "prompt": "Create a nature documentary about deep ocean exploration and mysterious bioluminescent creatures."
    }
]

async def test_diverse_prompts():
    print("=" * 70)
    print("TESTING MULTIPLE DIVERSE PROMPT TYPES")
    print("=" * 70)

    for item in TEST_PROMPTS:
        p_type = item["type"]
        p_text = item["prompt"]
        print(f"\n==================================================")
        print(f"PROMPT TYPE: {p_type}")
        print(f"PROMPT: {p_text}")
        print(f"==================================================")

        options = JobOptions(duration=30, aspect_ratio="16:9" if p_type == "ADVERTISEMENT" else "9:16")

        understanding = await understand_prompt(p_text, options)
        print("\n[Step 1 Understanding]")
        print(f"  Main Subject: {understanding.mainSubject}")
        print(f"  Topic: {understanding.topic}")
        print(f"  Environment: {understanding.environment}")
        print(f"  Lighting & Mood: {understanding.lighting} | {understanding.mood}")
        print(f"  Prompt Type: {understanding.promptType}")

        plan = await generate_semantic_storyboard(understanding, p_text, options)
        print(f"\n[Step 2 & 3 Storyboard: '{plan.title}']")
        print(f"  Hook: {plan.hook}")
        for s in plan.scenes:
            print(f"  Scene {s.id} ({s.duration_sec}s): {s.intent}")
            print(f"    Visual Query: '{s.visual_query}'")
            print(f"    Required: {s.requiredVisuals[:3]}")
            print(f"    Negative: {s.negativeConcepts[:3]}")

if __name__ == "__main__":
    asyncio.run(test_diverse_prompts())
