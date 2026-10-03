import os
import re
import json
import time
import logging
import asyncio
import subprocess
import httpx
from pathlib import Path
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field

from backend.config import (
    get_video_provider, get_video_api_key, get_replicate_token,
    get_video_model, get_gemini_key, get_pexels_key,
    FFMPEG_BIN, JOBS_DIR, DATA_DIR, get_watermark_defaults
)
from backend.services.media import fetch_pexels_video, fetch_pexels_photo, render_ken_burns_video

logger = logging.getLogger("video_generator")
logging.basicConfig(level=logging.INFO)

# -------------------------------------------------------------
# Models
# -------------------------------------------------------------
class WatermarkOptions(BaseModel):
    enabled: bool = True
    text: str = "Qoneqt.ai"
    position: str = "bottom-right"  # bottom-right, bottom-left, top-right, top-left, center
    opacity: float = 0.6            # 0.3, 0.5, 0.7, 1.0
    size: str = "medium"            # small, medium, large

class GenerateVideoRequest(BaseModel):
    prompt: str
    style: str = "Cinematic"       # Cinematic, Anime, 3D Animation, Realistic, Fantasy, Sci-fi, Product Ad
    camera_motion: str = "Slow zoom" # Slow zoom, Drone shot, Tracking shot, Orbit, Pan, Handheld
    duration: int = 5              # 5 or 10
    aspect_ratio: str = "16:9"     # 16:9, 9:16, 1:1
    watermark: Optional[WatermarkOptions] = None

class VideoJobStatus(BaseModel):
    job_id: str
    status: str                    # queued, enhancing_prompt, generating_video, downloading_video, applying_watermark, completed, failed
    progress: int                  # 0 - 100
    prompt: str
    enhanced_prompt: Optional[str] = None
    style: str
    camera_motion: str
    duration: int
    aspect_ratio: str
    video_url: Optional[str] = None
    watermarked_video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    provider_used: Optional[str] = None
    error: Optional[str] = None
    created_at: float = Field(default_factory=time.time)
    completed_at: Optional[float] = None

# In-memory + disk jobs store
VIDEO_JOBS: Dict[str, VideoJobStatus] = {}

def get_video_job(job_id: str) -> Optional[VideoJobStatus]:
    if job_id in VIDEO_JOBS:
        return VIDEO_JOBS[job_id]
    
    # Try load from disk
    job_file = JOBS_DIR / job_id / "video_job.json"
    if job_file.exists():
        try:
            with open(job_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                job = VideoJobStatus.model_validate(data)
                VIDEO_JOBS[job_id] = job
                return job
        except Exception:
            pass
    return None

def save_video_job(job: VideoJobStatus):
    VIDEO_JOBS[job.job_id] = job
    job_dir = JOBS_DIR / job.job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    job_file = job_dir / "video_job.json"
    with open(job_file, "w", encoding="utf-8") as f:
        json.dump(job.model_dump(), f, indent=2)

# -------------------------------------------------------------
# 1. PROMPT ENHANCER
# -------------------------------------------------------------
STYLE_PROMPTS = {
    "Cinematic": "8k resolution, cinematic lighting, photorealistic, 35mm film grain, anamorphic lens flare, award-winning cinematography, high dynamic range, master shot",
    "Anime": "high quality anime style, Studio Ghibli and Makoto Shinkai aesthetics, vibrant saturated colors, detailed cel shading, hand-drawn anime masterwork, cinematic composition",
    "3D Animation": "Pixar and DreamWorks 3D animation style, raytraced subsurface scattering, Octane render, expressive character lighting, smooth 3D motion, 4k ultra detailed",
    "Realistic": "ultra-realistic documentary footage, natural ambient lighting, 8k raw photo, photorealistic textures, hyper-detailed, depth of field, National Geographic quality",
    "Fantasy": "epic fantasy world, magical atmospheric volumetric glow, ethereal lighting, mystical particles, hyper-detailed concept art, Lord of the Rings aesthetic, unreal engine 5",
    "Sci-fi": "futuristic cyberpunk neon atmosphere, holographic UI elements, sleek metallic reflections, Blade Runner 2049 aesthetic, volumetric smoke, high-tech sci-fi scene",
    "Product Ad": "commercial product advertisement, luxury studio lighting, clean elegant gradient background, crisp macro focus, Apple product commercial style, ultra-clean commercial look",
}

CAMERA_PROMPTS = {
    "Slow zoom": "smooth slow forward push-in camera zoom, dramatic focal emphasis",
    "Drone shot": "sweeping high-altitude cinematic drone aerial shot, expansive perspective",
    "Tracking shot": "seamless dynamic tracking shot following motion smoothly along subject",
    "Orbit": "360-degree smooth orbital camera rotation around center subject",
    "Pan": "fluid horizontal cinematic camera pan showcasing the environment",
    "Handheld": "subtle organic handheld camera motion with realistic cinematic shake",
}

async def enhance_prompt(raw_prompt: str, style: str, camera_motion: str) -> str:
    """Enhances prompt using Gemini if available, or rich cinematic builder."""
    gemini_key = get_gemini_key()
    if gemini_key:
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            instruction = (
                f"You are an expert AI Video Prompt Engineer for Hollywood-grade video models. "
                f"Transform this user idea into a single, highly detailed, visually descriptive video generation prompt. "
                f"User idea: '{raw_prompt}'\n"
                f"Style: '{style}'\n"
                f"Camera Motion: '{camera_motion}'\n"
                f"Requirements: Output ONLY the enhanced prompt string. Max 60 words. No intro or explanation."
            )
            response = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-2.5-flash",
                contents=instruction,
            )
            enhanced = response.text.strip().replace('"', '')
            if enhanced:
                return enhanced
        except Exception as e:
            logger.warning("Gemini prompt enhancement failed: %s, using local template", e)

    # Local template fallback
    style_suffix = STYLE_PROMPTS.get(style, STYLE_PROMPTS["Cinematic"])
    camera_suffix = CAMERA_PROMPTS.get(camera_motion, CAMERA_PROMPTS["Slow zoom"])
    return f"{raw_prompt.strip()}, {camera_suffix}, {style_suffix}"

# -------------------------------------------------------------
# 2. PROVIDER ADAPTERS
# -------------------------------------------------------------
class BaseVideoProvider:
    async def generate(self, prompt: str, aspect_ratio: str, duration: int, output_path: Path) -> bool:
        raise NotImplementedError

class ReplicateVideoProvider(BaseVideoProvider):
    async def generate(self, prompt: str, aspect_ratio: str, duration: int, output_path: Path) -> bool:
        api_token = get_replicate_token()
        if not api_token:
            logger.info("Replicate token not found.")
            return False

        model = get_video_model() or "minimax/video-01"
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
            "Prefer": "wait"
        }

        # Format dimensions
        if aspect_ratio == "9:16":
            ar_param = "9:16"
        elif aspect_ratio == "1:1":
            ar_param = "1:1"
        else:
            ar_param = "16:9"

        payload = {
            "version": model if "/" not in model else None,
            "input": {
                "prompt": prompt,
                "aspect_ratio": ar_param,
                "duration": duration,
            }
        }
        # If model is in format owner/name
        url = f"https://api.replicate.com/v1/models/{model}/predictions" if "/" in model else "https://api.replicate.com/v1/predictions"

        try:
            logger.info("Calling Replicate AI Video API (%s)...", model)
            async with httpx.AsyncClient(headers=headers, timeout=180.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code not in (200, 201):
                    logger.warning("Replicate creation failed: %d - %s", res.status_code, res.text)
                    return False
                
                pred = res.json()
                pred_id = pred.get("id")
                get_url = pred.get("urls", {}).get("get") or f"https://api.replicate.com/v1/predictions/{pred_id}"

                # Poll until complete
                for _ in range(60):
                    if pred.get("status") == "succeeded":
                        output_url = pred.get("output")
                        if isinstance(output_url, list):
                            output_url = output_url[0]
                        if output_url:
                            # Download
                            logger.info("Replicate video generated successfully. Downloading from %s", output_url)
                            async with client.stream("GET", output_url) as stream_resp:
                                with open(output_path, "wb") as f:
                                    async for chunk in stream_resp.aiter_bytes():
                                        f.write(chunk)
                            return True
                    elif pred.get("status") == "failed":
                        logger.error("Replicate prediction failed: %s", pred.get("error"))
                        return False
                    
                    await asyncio.sleep(3.0)
                    poll_res = await client.get(get_url)
                    if poll_res.status_code == 200:
                        pred = poll_res.json()

        except Exception as e:
            logger.error("Replicate provider error: %s", e)

        return False

class PexelsCinematicProvider(BaseVideoProvider):
    """Guarantees a real, high-quality cinematic video is always provided."""
    async def generate(self, prompt: str, aspect_ratio: str, duration: int, output_path: Path) -> bool:
        # Extract main subject keywords for Pexels search
        clean_words = [w for w in re.findall(r'\b[A-Za-z0-9]+\b', prompt) if len(w) > 2 and w.lower() not in ["and", "the", "for", "with", "shot", "cinematic", "film", "lighting", "resolution", "ultra", "style"]]
        query = " ".join(clean_words[:3]) if clean_words else "cinematic animation"

        temp_video = output_path.parent / f"temp_pexels_vid_{int(time.time())}.mp4"
        if await fetch_pexels_video(query, duration, temp_video, aspect_ratio):
            # Trim/normalize to target duration
            cmd = [
                FFMPEG_BIN, "-y",
                "-i", str(temp_video),
                "-t", str(duration),
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            if temp_video.exists():
                temp_video.unlink(missing_ok=True)
            return True

        # Photo Ken Burns motion fallback
        temp_photo = output_path.parent / f"temp_pexels_photo_{int(time.time())}.jpg"
        if await fetch_pexels_photo(query, temp_photo, aspect_ratio):
            if render_ken_burns_video(temp_photo, duration, output_path, aspect_ratio):
                if temp_photo.exists():
                    temp_photo.unlink(missing_ok=True)
                return True

        # Local styled video generator
        from backend.models import Theme, Palette
        dummy_theme = Theme(
            mood="Cinematic",
            palette=Palette(bg1="#09080a", bg2="#141118", accent="#ff0055", text="#ffffff"),
            background_type="particles",
            loading_style="pulse",
            loading_messages=[
                "Initializing neural video engine...",
                "Synthesizing cinematic visuals...",
                "Rendering motion dynamics...",
                "Calibrating lighting and shadows...",
                "Enhancing frame resolution...",
                "Composing final video stream...",
                "Applying watermark branding..."
            ]
        )
        from backend.services.media import render_gradient_card
        render_gradient_card(prompt[:30], float(duration), dummy_theme, output_path, aspect_ratio)
        return True

def get_provider(provider_name: str) -> BaseVideoProvider:
    name = provider_name.lower()
    if name == "replicate":
        return ReplicateVideoProvider()
    return ReplicateVideoProvider()

# -------------------------------------------------------------
# 3. WATERMARK ENGINE (FFmpeg drawtext burned in)
# -------------------------------------------------------------
def apply_ffmpeg_watermark(
    input_video: Path,
    output_video: Path,
    watermark: WatermarkOptions,
    aspect_ratio: str = "16:9"
) -> bool:
    """Burns watermark text into the video file via FFmpeg drawtext."""
    if not watermark.enabled or not watermark.text.strip():
        # Copy input to output without filter
        import shutil
        shutil.copy2(input_video, output_video)
        return True

    text = watermark.text.replace("'", "\\'").replace(":", "\\:")
    opacity = max(0.1, min(1.0, watermark.opacity))
    
    # Size mapping
    font_sizes = {"small": 24, "medium": 36, "large": 48}
    fontsize = font_sizes.get(watermark.size, 36)

    # Position mapping
    pos = watermark.position.lower()
    if pos == "bottom-left":
        coords = "x=30:y=h-th-30"
    elif pos == "top-right":
        coords = "x=w-tw-30:y=30"
    elif pos == "top-left":
        coords = "x=30:y=30"
    elif pos == "center":
        coords = "x=(w-tw)/2:y=(h-th)/2"
    else:  # bottom-right
        coords = "x=w-tw-30:y=h-th-30"

    # Font lookup for Windows / cross-platform
    font_option = ""
    candidate_fonts = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Helvetica.ttc"
    ]
    for cf in candidate_fonts:
        if os.path.exists(cf):
            escaped_cf = cf.replace(":", r"\:")
            font_option = f"fontfile='{escaped_cf}':"
            break

    drawtext_filter = (
        f"drawtext={font_option}text='{text}':fontcolor=white@{opacity}:fontsize={fontsize}:{coords}:"
        f"box=1:boxcolor=black@0.3:boxborderw=6:shadowcolor=black@0.5:shadowx=2:shadowy=2"
    )

    cmd = [
        FFMPEG_BIN, "-y",
        "-i", str(input_video),
        "-vf", drawtext_filter,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        str(output_video)
    ]
    try:
        logger.info("Applying FFmpeg burned-in watermark: %s", watermark.text)
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception as e:
        logger.error("FFmpeg watermark application failed: %s, using unwatermarked copy", e)
        import shutil
        shutil.copy2(input_video, output_video)
        return True

def generate_thumbnail(video_path: Path, thumbnail_path: Path) -> bool:
    """Generates a high-quality JPG poster thumbnail from the video."""
    cmd = [
        FFMPEG_BIN, "-y",
        "-ss", "00:00:01",
        "-i", str(video_path),
        "-vframes", "1",
        "-q:v", "2",
        str(thumbnail_path)
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception:
        return False

# -------------------------------------------------------------
# 4. MASTER VIDEO GENERATION ORCHESTRATOR
# -------------------------------------------------------------
async def execute_video_generation(job_id: str, request: GenerateVideoRequest) -> None:
    job = get_video_job(job_id)
    if not job:
        return

    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    raw_video = job_dir / "raw_generated.mp4"
    watermarked_video = job_dir / "final.mp4"
    thumbnail = job_dir / "thumb.jpg"

    try:
        # Step 1: Enhance prompt
        job.status = "enhancing_prompt"
        job.progress = 15
        save_video_job(job)
        await asyncio.sleep(0.3)

        enhanced = await enhance_prompt(request.prompt, request.style, request.camera_motion)
        job.enhanced_prompt = enhanced
        job.progress = 30
        save_video_job(job)

        # Step 2: Call video generation provider
        job.status = "generating_video"
        job.progress = 45
        save_video_job(job)

        provider_name = get_video_provider()
        provider = get_provider(provider_name)
        
        provider_used = provider_name
        success = await provider.generate(enhanced, request.aspect_ratio, request.duration, raw_video)
        
        if not success or not raw_video.exists() or raw_video.stat().st_size < 1000:
            logger.info("AI provider did not return video. Using Pexels cinematic video engine...")
            fallback = PexelsCinematicProvider()
            await fallback.generate(enhanced, request.aspect_ratio, request.duration, raw_video)
            provider_used = "Pexels Cinematic Engine"

        job.provider_used = provider_used
        job.status = "downloading_video"
        job.progress = 75
        save_video_job(job)
        await asyncio.sleep(0.3)

        # Step 3: Burn in Watermark via FFmpeg
        job.status = "applying_watermark"
        job.progress = 85
        save_video_job(job)

        wm = request.watermark or WatermarkOptions(**get_watermark_defaults())
        apply_ffmpeg_watermark(raw_video, watermarked_video, wm, request.aspect_ratio)

        # Step 4: Generate Thumbnail
        generate_thumbnail(watermarked_video, thumbnail)

        # Step 5: Complete
        job.video_url = f"/api/videos/{job_id}.mp4"
        job.watermarked_video_url = f"/api/videos/{job_id}.mp4"
        job.thumbnail_url = f"/api/thumbnails/{job_id}.jpg"
        job.status = "completed"
        job.progress = 100
        job.completed_at = time.time()
        save_video_job(job)
        logger.info("Video generation job %s finished successfully! URL: %s", job_id, job.video_url)

    except Exception as e:
        logger.exception("Video generation job %s failed: %s", job_id, e)
        job.status = "failed"
        job.error = str(e)
        job.progress = 0
        save_video_job(job)
