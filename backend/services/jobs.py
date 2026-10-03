import json
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any
from fastapi import HTTPException

from backend.config import JOBS_DIR, DATA_DIR
from backend.models import CreateJobRequest, JobStatus, JobOptions, ContentPlan, QCReport

# In-memory registry of active SSE subscriber queues: job_id -> list of asyncio.Queue
_listeners: Dict[str, List[asyncio.Queue]] = {}

def get_job_dir(job_id: str) -> Path:
    p = JOBS_DIR / job_id
    p.mkdir(parents=True, exist_ok=True)
    return p

def get_job_file(job_id: str) -> Path:
    return get_job_dir(job_id) / "job.json"

def create_job(request: CreateJobRequest) -> JobStatus:
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    
    job = JobStatus(
        job_id=job_id,
        mode=request.mode,
        input=request.input,
        options=request.options,
        status="queued",
        current_step="understanding",
        step_status="running",
        message="Job queued for processing...",
        elapsed_sec=0.0,
        created_at=now_iso,
        updated_at=now_iso
    )
    save_job(job)
    return job

def save_job(job: JobStatus) -> None:
    job.updated_at = datetime.now(timezone.utc).isoformat()
    job_file = get_job_file(job.job_id)
    with open(job_file, "w", encoding="utf-8") as f:
        f.write(job.model_dump_json(indent=2))

def get_job(job_id: str) -> Optional[JobStatus]:
    job_file = get_job_file(job_id)
    if not job_file.exists():
        return None
    try:
        with open(job_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return JobStatus.model_validate(data)
    except Exception:
        return None

def list_recent_jobs(limit: int = 15) -> List[JobStatus]:
    jobs = []
    if not JOBS_DIR.exists():
        return []
    for job_folder in JOBS_DIR.iterdir():
        if job_folder.is_dir():
            jf = job_folder / "job.json"
            if jf.exists():
                try:
                    with open(jf, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    jobs.append(JobStatus.model_validate(data))
                except Exception:
                    continue
    # Sort descending by creation date
    jobs.sort(key=lambda j: j.created_at, reverse=True)
    return jobs[:limit]

async def emit_job_event(job_id: str, event_data: Dict[str, Any]) -> None:
    """Emits an SSE event to all connected subscriber queues for a job."""
    if job_id in _listeners:
        for q in _listeners[job_id]:
            await q.put(event_data)

def add_job_listener(job_id: str) -> asyncio.Queue:
    q = asyncio.Queue()
    if job_id not in _listeners:
        _listeners[job_id] = []
    _listeners[job_id].append(q)
    return q

def remove_job_listener(job_id: str, q: asyncio.Queue) -> None:
    if job_id in _listeners and q in _listeners[job_id]:
        _listeners[job_id].remove(q)
        if not _listeners[job_id]:
            del _listeners[job_id]

def delete_job(job_id: str) -> bool:
    """Permanently deletes a job directory and all associated video/audio files."""
    import shutil
    job_dir = JOBS_DIR / job_id
    if job_dir.exists() and job_dir.is_dir():
        try:
            shutil.rmtree(job_dir)
            return True
        except Exception:
            return False
    return False

def delete_jobs_batch(job_ids: List[str]) -> List[str]:
    """Deletes multiple jobs permanently."""
    deleted = []
    for jid in job_ids:
        if delete_job(jid):
            deleted.append(jid)
    return deleted

def duplicate_job(job_id: str) -> Optional[JobStatus]:
    """Duplicates an existing job into a new job entry."""
    original = get_job(job_id)
    if not original:
        return None
    
    new_id = f"job_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    
    new_job = original.model_copy(deep=True)
    new_job.job_id = new_id
    new_job.created_at = now_iso
    new_job.updated_at = now_iso
    new_job.options.category = "Draft"
    save_job(new_job)
    return new_job
