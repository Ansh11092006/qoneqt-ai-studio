import os
import sys
import json
import asyncio
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.services.director import generate_content_plan
from backend.models import JobOptions, ContentPlan

async def main():
    test_topic = "5 Cybersecurity Mistakes College Students Make"
    print("=" * 60)
    print("PHASE 1 CLI TEST: Qoneqt AI Content Director")
    print(f"Topic: '{test_topic}'")
    print("=" * 60)

    options = JobOptions(
        duration=30,
        tone="Educational",
        language="en",
        voice="M"
    )

    print("Generating Content Plan...")
    plan = await generate_content_plan(
        mode="topic",
        user_input=test_topic,
        options=options
    )

    # Validate with Pydantic
    assert isinstance(plan, ContentPlan), "Result is not an instance of ContentPlan!"
    assert plan.title, "Title is missing!"
    assert plan.hook, "Hook is missing!"
    assert len(plan.scenes) >= 4, f"Expected at least 4 scenes, got {len(plan.scenes)}"
    assert len(plan.theme.loading_messages) == 7, f"Expected 7 loading messages, got {len(plan.theme.loading_messages)}"
    assert plan.theme.background_type in [
        "matrix_rain", "aurora", "particles", "stars",
        "sunrise_clouds", "embers", "neon_grid", "waves"
    ], f"Invalid background_type: {plan.theme.background_type}"
    assert plan.theme.loading_style in [
        "terminal", "globe", "rocket", "film_reel", "chart", "pulse"
    ], f"Invalid loading_style: {plan.theme.loading_style}"

    print("\n Content Plan Successfully Generated & Validated!")
    print(f" Title:            {plan.title}")
    print(f" Hook:             {plan.hook}")
    print(f" Theme Mood:       {plan.theme.mood}")
    print(f" Background Type:  {plan.theme.background_type}")
    print(f" Loading Style:    {plan.theme.loading_style}")
    print(f" Accent Color:     {plan.theme.palette.accent}")
    print(f" Background Color: {plan.theme.palette.bg1}")
    print(f" Scene Count:      {len(plan.scenes)}")
    print(f" Hashtags:         {', '.join(plan.hashtags)}")
    print(f" Call to Action:   {plan.cta}")
    print("\n--- Scenes Breakdown ---")
    for s in plan.scenes:
        print(f" [Scene {s.id}] ({s.duration_sec}s) On-Screen: '{s.on_screen_text}' | Query: '{s.visual_query}'")
        print(f"   Narration: \"{s.narration}\"")

    print("\n--- 7 Themed Loading Messages ---")
    for i, msg in enumerate(plan.theme.loading_messages, 1):
        print(f" Step {i}: {msg}")

    print("\n--- Full Formatted JSON Plan Output ---")
    print(json.dumps(plan.model_dump(), indent=2))
    print("\n" + "=" * 60)
    print("PHASE 1 VERIFICATION PASSED SUCCESSFULLY")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
