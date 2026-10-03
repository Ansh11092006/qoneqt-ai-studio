import sys
import asyncio
import json
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.models import JobOptions
from backend.services.prompt_engine import understand_prompt, generate_semantic_storyboard
from backend.services.media import prepare_all_visuals

PROMPT = """Create a cinematic 30-second video about a cybersecurity analyst detecting a ransomware attack inside a futuristic SOC at night. Show the analyst discovering suspicious network traffic, tracing the infected server, isolating the compromised system, and finally stopping the attack. Use dramatic blue lighting, cinematic camera movements, close-ups of security dashboards, and a tense atmosphere."""

async def run_test():
    print("=" * 60)
    print("TESTING FULL INTELLIGENT VIDEO PIPELINE")
    print("=" * 60)
    print(f"Prompt:\n{PROMPT}\n")

    options = JobOptions(duration=30, aspect_ratio="9:16", video_style="Cinematic")

    # STEP 1: Understand prompt
    print("\n--- STEP 1: UNDERSTANDING PROMPT ---")
    understanding = await understand_prompt(PROMPT, options)
    print(json.dumps(understanding.model_dump(), indent=2))

    # STEP 2 & 3: Storyboard & Specific Visual Queries
    print("\n--- STEP 2 & 3: STORYBOARD & SEARCH QUERIES ---")
    plan = await generate_semantic_storyboard(understanding, PROMPT, options)
    print(f"Title: {plan.title}")
    print(f"Hook: {plan.hook}")
    print(f"Scene count: {len(plan.scenes)}")
    for s in plan.scenes:
        print(f"\nScene {s.id}:")
        print(f"  Intent: {s.intent}")
        print(f"  Narration: {s.narration}")
        print(f"  Query: '{s.visual_query}'")
        print(f"  Fallback Queries: {s.fallback_queries}")
        print(f"  Required Visuals: {s.requiredVisuals}")
        print(f"  Negative Concepts: {s.negativeConcepts}")
        print(f"  Duration: {s.duration_sec}s")

    # STEP 4: Visuals & Multi-Signal Relevance Matching
    print("\n--- STEP 4: SEMANTIC VISUAL SOURCING & MATCHING ---")
    test_dir = ROOT_DIR / "data" / "test_run"
    test_dir.mkdir(parents=True, exist_ok=True)

    durations = [s.duration_sec for s in plan.scenes]
    clips = await prepare_all_visuals(
        scenes=plan.scenes,
        scene_durations=durations,
        theme=plan.theme,
        job_dir=test_dir,
        aspect_ratio="9:16",
        understanding=understanding
    )

    print("\n--- RESULTS SUMMARY ---")
    for i, s in enumerate(plan.scenes):
        clip = clips[i]
        print(f"Scene {s.id}: status={s.status} | score={s.relevanceScore} | media={s.selectedMedia} | clip={clip is not None}")
        if clip:
            print(f"  File size: {clip.stat().st_size} bytes")

    # STEP 13 Structure Check
    scene_records = []
    for s in plan.scenes:
        scene_records.append({
            "scene": s.id,
            "intent": s.intent or s.visual_description,
            "query": s.visual_query,
            "selectedMedia": s.selectedMedia,
            "relevanceScore": s.relevanceScore or 0.0,
            "status": s.status or "matched"
        })

    job_structure = {
        "jobId": "test_job_123",
        "originalPrompt": PROMPT,
        "understanding": understanding.model_dump(),
        "storyboard": [s.model_dump() for s in plan.scenes],
        "scenes": scene_records,
        "finalVideoUrl": "/api/videos/test_job_123.mp4",
        "qualityScore": 92,
        "status": "completed"
    }

    print("\n--- STEP 13 BACKEND JOB STRUCTURE VALIDATION ---")
    print(json.dumps(job_structure, indent=2)[:800] + "... (truncated)")

if __name__ == "__main__":
    asyncio.run(run_test())
