import os
import sys
import json
import shutil
import asyncio
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.config import DEMO_ASSETS_DIR, DATA_DIR
from backend.models import CreateJobRequest, JobOptions
from backend.services.jobs import create_job, get_job, get_job_dir
from backend.services.pipeline import execute_job_pipeline

DEMO_TOPICS = [
    ("cybersecurity", "5 Cybersecurity Mistakes College Students Make"),
    ("fitness", "3 Workout Mistakes Killing Your Gains"),
    ("travel", "3 Hidden Gems in Japan Tourists Miss")
]

async def make_demo_assets():
    print("=" * 65)
    print("MAKING DEMO ASSETS FOR CYBERSECURITY, FITNESS, TRAVEL")
    print("=" * 65)

    DEMO_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    for slug, topic in DEMO_TOPICS:
        target_dir = DEMO_ASSETS_DIR / slug
        target_dir.mkdir(parents=True, exist_ok=True)
        
        plan_target = target_dir / "plan.json"
        video_target = target_dir / "final.mp4"
        thumb_target = target_dir / "thumb.jpg"

        if plan_target.exists() and video_target.exists() and thumb_target.exists():
            print(f" Demo assets for '{slug}' already exist. Skipping.")
            continue

        print(f"\n Generating demo assets for: '{slug}' ('{topic}')...")
        req = CreateJobRequest(
            mode="topic",
            input=topic,
            options=JobOptions(duration=15, tone="Educational", language="en", voice="M")
        )
        job = create_job(req)
        await execute_job_pipeline(job.job_id)
        
        # Reload finished job
        finished_job = get_job(job.job_id)
        assert finished_job and finished_job.status == "completed", f"Failed to complete job {job.job_id}!"
        
        job_dir = get_job_dir(job.job_id)
        final_mp4 = job_dir / "final.mp4"
        thumb_jpg = job_dir / "thumb.jpg"

        with open(plan_target, "w", encoding="utf-8") as f:
            f.write(finished_job.plan.model_dump_json(indent=2))

        shutil.copy2(final_mp4, video_target)
        shutil.copy2(thumb_jpg, thumb_target)

        print(f" Cached demo assets saved to: {target_dir}")

    print("\n" + "=" * 65)
    print("ALL DEMO ASSETS GENERATED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(make_demo_assets())
