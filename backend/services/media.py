import os
import re
import logging
import asyncio
import subprocess
import httpx
from pathlib import Path
from typing import List, Optional, Dict

from backend.config import get_pexels_key, FFMPEG_BIN, UPLOADS_DIR
from backend.models import Scene, Theme

logger = logging.getLogger("media")

def get_pexels_headers() -> Dict[str, str]:
    key = get_pexels_key()
    return {"Authorization": key} if key else {}

def get_orientation_for_aspect_ratio(aspect_ratio: str) -> str:
    if aspect_ratio in ("9:16", "4:5", "2:3"):
        return "portrait"
    elif aspect_ratio in ("16:9", "21:9", "16:10", "1.91:1"):
        return "landscape"
    return "square"

async def fetch_pexels_video(
    query: str, 
    min_duration: float, 
    output_path: Path,
    aspect_ratio: str = "9:16"
) -> bool:
    """Fetches a high-quality video from Pexels API with multi-query fallback."""
    api_key = get_pexels_key()
    if not api_key:
        return False

    orientation = get_orientation_for_aspect_ratio(aspect_ratio)
    
    # Try multiple query variants if specific query yields no results
    queries_to_try = [query]
    words = query.strip().split()
    if len(words) > 2:
        queries_to_try.append(" ".join(words[:2]))
    if len(words) > 1:
        queries_to_try.append(words[0])
    queries_to_try.append("cinematic background")

    headers = {"Authorization": api_key}

    for q in queries_to_try:
        try:
            url = f"https://api.pexels.com/videos/search?query={q}&orientation={orientation}&per_page=8"
            async with httpx.AsyncClient(headers=headers, timeout=14.0) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning("Pexels video query '%s' status: %d", q, resp.status_code)
                    continue

                data = resp.json()
                videos = data.get("videos", [])
                if not videos:
                    continue

                best_file_url = None
                for vid in videos:
                    files = vid.get("video_files", [])
                    if orientation == "portrait":
                        matched_files = [
                            f for f in files 
                            if (f.get("height") or 0) >= (f.get("width") or 0) and (f.get("width") or 0) >= 540
                        ]
                    elif orientation == "landscape":
                        matched_files = [
                            f for f in files 
                            if (f.get("width") or 0) >= (f.get("height") or 0) and (f.get("height") or 0) >= 540
                        ]
                    else:
                        matched_files = files

                    if matched_files:
                        matched_files.sort(key=lambda x: (x.get("width") or 0) * (x.get("height") or 0), reverse=True)
                        best_file_url = matched_files[0].get("link")
                        break
                    elif files:
                        best_file_url = files[0].get("link")
                        break

                if not best_file_url:
                    continue

                # Stream and save video file
                async with client.stream("GET", best_file_url) as stream_resp:
                    if stream_resp.status_code != 200:
                        continue
                    with open(output_path, "wb") as f:
                        async for chunk in stream_resp.aiter_bytes():
                            f.write(chunk)
                logger.info("Successfully acquired Pexels video using query '%s'", q)
                return True
        except Exception as e:
            logger.warning("Pexels video search error on query '%s': %s", q, e)

    return False

async def fetch_pexels_photo(
    query: str, 
    output_path: Path,
    aspect_ratio: str = "9:16"
) -> bool:
    """Fetches a high-resolution photo from Pexels API."""
    api_key = get_pexels_key()
    if not api_key:
        return False

    orientation = get_orientation_for_aspect_ratio(aspect_ratio)
    headers = {"Authorization": api_key}
    
    queries = [query]
    words = query.strip().split()
    if len(words) > 2:
        queries.append(" ".join(words[:2]))

    for q in queries:
        try:
            url = f"https://api.pexels.com/v1/search?query={q}&orientation={orientation}&per_page=6"
            async with httpx.AsyncClient(headers=headers, timeout=12.0) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue
                data = resp.json()
                photos = data.get("photos", [])
                if not photos:
                    continue

                photo = photos[0]
                src = photo.get("src", {})
                img_url = src.get("large2x") or src.get("portrait") or src.get("landscape") or src.get("original")
                if not img_url:
                    continue

                async with client.stream("GET", img_url) as stream_resp:
                    if stream_resp.status_code != 200:
                        continue
                    with open(output_path, "wb") as f:
                        async for chunk in stream_resp.aiter_bytes():
                            f.write(chunk)
                return True
        except Exception as e:
            logger.warning("Pexels photo search error on '%s': %s", q, e)

    return False

def render_ken_burns_video(
    photo_path: Path, 
    duration: float, 
    output_path: Path,
    aspect_ratio: str = "9:16"
) -> bool:
    """Applies a smooth cinematic Ken Burns pan/zoom to transform a photo into video."""
    fps = 30
    total_frames = max(1, int(duration * fps))
    
    if aspect_ratio in ("16:9", "21:9", "16:10"):
        w, h = 1920, 1080
    elif aspect_ratio == "1:1":
        w, h = 1080, 1080
    elif aspect_ratio == "4:5":
        w, h = 1080, 1350
    else:
        w, h = 1080, 1920

    vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
        f"zoompan=z='min(zoom+0.0015,1.25)':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps={fps},"
        f"format=yuv420p"
    )
    cmd = [
        FFMPEG_BIN, "-y",
        "-loop", "1",
        "-i", str(photo_path),
        "-vf", vf,
        "-t", f"{duration:.2f}",
        "-r", "30",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        str(output_path)
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception as e:
        logger.error("Ken Burns render failed: %s", e)
        return False

def render_gradient_card(
    title_text: str,
    duration: float,
    theme: Theme,
    output_path: Path,
    aspect_ratio: str = "9:16"
) -> bool:
    """Generates an aesthetic animated background card with styled layout."""
    fps = 30
    bg_hex = theme.palette.bg1.lstrip("#")
    accent_hex = theme.palette.accent.lstrip("#")
    
    if aspect_ratio in ("16:9", "21:9"):
        w, h = 1920, 1080
        box_y = 400
    elif aspect_ratio == "1:1":
        w, h = 1080, 1080
        box_y = 400
    else:
        w, h = 1080, 1920
        box_y = 760

    filter_complex = (
        f"color=c=0x{bg_hex}:s={w}x{h}:r={fps}:d={duration:.2f},"
        f"drawbox=x=80:y={box_y}:w={w-160}:h=320:color=0x{accent_hex}@0.15:t=fill,"
        f"drawbox=x=80:y={box_y}:w={w-160}:h=320:color=0x{accent_hex}@0.7:t=4"
    )
    
    cmd = [
        FFMPEG_BIN, "-y",
        "-f", "lavfi",
        "-i", filter_complex,
        "-t", f"{duration:.2f}",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        str(output_path)
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception as e:
        logger.error("Gradient card render failed: %s", e)
        fallback_cmd = [
            FFMPEG_BIN, "-y",
            "-f", "lavfi",
            "-i", f"color=c=0x0f172a:s={w}x{h}:r=30:d={duration:.2f}",
            "-t", f"{duration:.2f}",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-pix_fmt", "yuv420p",
            str(output_path)
        ]
        subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True

async def prepare_scene_visual(
    scene: Scene,
    duration: float,
    theme: Theme,
    job_dir: Path,
    uploaded_asset_path: Optional[Path] = None,
    aspect_ratio: str = "9:16"
) -> Path:
    """
    Prepares visual clip for a scene according to priority:
    1. User upload override
    2. Pexels video clip
    3. Pexels high-res photo + Ken Burns animation
    4. Generated styled dynamic card
    """
    target_clip = job_dir / f"scene_{scene.id}_raw.mp4"
    
    # Priority 1: User Upload
    if uploaded_asset_path and uploaded_asset_path.exists():
        logger.info("[Scene %d] Using user uploaded asset: %s", scene.id, uploaded_asset_path.name)
        ext = uploaded_asset_path.suffix.lower()
        if ext in [".jpg", ".jpeg", ".png", ".webp"]:
            if render_ken_burns_video(uploaded_asset_path, duration, target_clip, aspect_ratio):
                return target_clip
        elif ext in [".mp4", ".webm", ".mov"]:
            return uploaded_asset_path

    # Priority 2: Pexels Video
    query = scene.visual_query or "cinematic futuristic background"
    temp_video = job_dir / f"scene_{scene.id}_pexels_video.mp4"
    if await fetch_pexels_video(query, duration, temp_video, aspect_ratio):
        logger.info("[Scene %d] Downloaded Pexels video for '%s'", scene.id, query)
        return temp_video

    # Priority 3: Pexels Photo + Ken Burns
    temp_photo = job_dir / f"scene_{scene.id}_pexels_photo.jpg"
    if await fetch_pexels_photo(query, temp_photo, aspect_ratio):
        logger.info("[Scene %d] Downloaded Pexels photo for '%s', rendering Ken Burns animation", scene.id, query)
        if render_ken_burns_video(temp_photo, duration, target_clip, aspect_ratio):
            return target_clip

    # Priority 4: Generated Dynamic Card
    logger.info("[Scene %d] Generating dynamic gradient card for '%s'", scene.id, scene.on_screen_text)
    render_gradient_card(scene.on_screen_text, duration, theme, target_clip, aspect_ratio)
    return target_clip

async def prepare_all_visuals(
    scenes: List[Scene],
    scene_durations: List[float],
    theme: Theme,
    job_dir: Path,
    uploaded_asset_paths: Optional[List[Path]] = None,
    aspect_ratio: str = "9:16"
) -> List[Path]:
    """Fetches and prepares all scene visual clips concurrently using asyncio.gather."""
    tasks = []
    for i, scene in enumerate(scenes):
        dur = scene_durations[i] if i < len(scene_durations) else scene.duration_sec
        upload_path = None
        if uploaded_asset_paths and i < len(uploaded_asset_paths):
            upload_path = uploaded_asset_paths[i]
        tasks.append(
            prepare_scene_visual(scene, dur, theme, job_dir, upload_path, aspect_ratio)
        )
    return await asyncio.gather(*tasks)
