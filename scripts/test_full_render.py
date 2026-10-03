import asyncio
import json
import logging
from pathlib import Path

# Setup logging to console
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

import sys
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.models import JobOptions, CreateJobRequest
from backend.services.jobs import create_job, get_job
from backend.services.pipeline import execute_job_pipeline

PROMPT = """Create a cinematic 30-second video about a cybersecurity analyst detecting a ransomware attack inside a futuristic SOC at night. Show the analyst discovering suspicious network traffic, tracing the infected server, isolating the compromised system, and finally stopping the attack. Use dramatic blue lighting, cinematic camera movements, close-ups of security dashboards, and a tense atmosphere."""

async def main():
    print("=" * 70)
    print("TESTING FULL END-TO-END VIDEO GENERATION PIPELINE")
    print("=" * 70)
    
    options = JobOptions(
        duration=30,
        aspect_ratio="9:16",
        resolution="720p", # Fast render for acceptance test
        video_style="Cinematic",
        language="en",
        voice="M"
    )
    
    # 1. Create Job
    job = create_job(CreateJobRequest(input=PROMPT, options=options))
    job_id = job.job_id
    print(f"Created job: {job_id}")
    
    # 2. Run Complete Pipeline
    await execute_job_pipeline(job_id)
    
    # 3. Verify Job Completion & Step 13 Structure
    updated_job = get_job(job_id)
    print("\n--- PIPELINE EXECUTION COMPLETED ---")
    print(f"Status: {updated_job.status}")
    print(f"Error: {updated_job.error}")
    print(f"Video URL: {updated_job.video_url}")
    print(f"QC Score: {updated_job.qc_report.score if updated_job.qc_report else 'N/A'}")
    
    # Verify Step 13 JSON fields
    step13_data = {
        "jobId": updated_job.jobId,
        "originalPrompt": updated_job.originalPrompt,
        "understanding": updated_job.understanding,
        "storyboard": [s if isinstance(s, dict) else s.model_dump() for s in (updated_job.storyboard or [])],
        "scenes": [s if isinstance(s, dict) else s.model_dump() for s in (updated_job.scenes or [])],
        "finalVideoUrl": updated_job.finalVideoUrl,
        "qualityScore": updated_job.qualityScore,
        "status": updated_job.status
    }
    
    print("\n--- STEP 13 JSON STRUCTURE ---")
    print(json.dumps(step13_data, indent=2)[:1200] + "\n... (truncated)")
    
    # Verify Video File on Disk
    video_file = ROOT_DIR / "data" / "jobs" / job_id / "final.mp4"
    if video_file.exists():
        size_mb = video_file.stat().st_size / (1024 * 1024)
        print(f"\nSUCCESS! final.mp4 successfully created: {video_file} ({size_mb:.2f} MB)")
    else:
        print(f"\nFAILURE! final.mp4 not found at {video_file}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
