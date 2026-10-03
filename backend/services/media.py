import os
import re
import logging
import asyncio
import subprocess
import httpx
from pathlib import Path
from typing import List, Optional, Dict

from backend.config import get_pixabay_key, FFMPEG_BIN
from backend.models import Scene, Theme, PromptUnderstanding
from backend.services.media_provider.engine import HybridVideoEngine

logger = logging.getLogger("media")



def get_orientation_for_aspect_ratio(aspect_ratio: str) -> str:
    if aspect_ratio in ("9:16", "4:5", "2:3"):
        return "vertical"
    elif aspect_ratio in ("16:9", "21:9", "16:10", "1.91:1"):
        return "horizontal"
    return "horizontal"


# ------------------------------------------------------------------
# PIXABAY VIDEO API
# ------------------------------------------------------------------
async def fetch_pixabay_video(
    query: str,
    min_duration: float,
    output_path: Path,
    aspect_ratio: str = "9:16"
) -> bool:
    """Fetches a relevant video from the Pixabay Video API with multi-query fallback."""
    api_key = get_pixabay_key()
    if not api_key:
        logger.error("[VIDEO] PIXABAY_API_KEY is not configured — cannot fetch video")
        return False

    orientation = get_orientation_for_aspect_ratio(aspect_ratio)

    # Build multiple query variants for progressive fallback
    queries_to_try = [query]
    words = query.strip().split()
    if len(words) > 3:
        queries_to_try.append(" ".join(words[:3]))
    if len(words) > 2:
        queries_to_try.append(" ".join(words[:2]))
    if len(words) > 1:
        queries_to_try.append(words[0])

    for q in queries_to_try:
        try:
            encoded_q = "+".join(q.strip().split())
            url = (
                f"https://pixabay.com/api/videos/"
                f"?key={api_key}"
                f"&q={encoded_q}"
                f"&video_type=all"
                f"&orientation={orientation}"
                f"&safesearch=true"
                f"&per_page=10"
            )

            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.get(url)
                if resp.status_code == 429:
                    logger.warning("[VIDEO] Pixabay rate-limited. Waiting 3 s …")
                    await asyncio.sleep(3.0)
                    continue
                if resp.status_code != 200:
                    logger.warning("[VIDEO] Pixabay video search '%s' → HTTP %d", q, resp.status_code)
                    continue

                data = resp.json()
                hits = data.get("hits", [])
                if not hits:
                    logger.info("[VIDEO] No Pixabay video results for '%s'", q)
                    continue

                # Select best available quality across all hits
                best_url = None
                best_hit_id = None
                for hit in hits:
                    videos = hit.get("videos", {})
                    for quality in ("large", "medium", "small", "tiny"):
                        vid_info = videos.get(quality, {})
                        vid_url = vid_info.get("url")
                        if vid_url:
                            best_url = vid_url
                            best_hit_id = hit.get("id", "?")
                            break
                    if best_url:
                        break

                if not best_url:
                    continue

                logger.info("[VIDEO] Downloading Pixabay video (id=%s) for '%s' …", best_hit_id, q)
                async with client.stream("GET", best_url, follow_redirects=True) as stream_resp:
                    if stream_resp.status_code != 200:
                        logger.warning("[VIDEO] Download failed: HTTP %d", stream_resp.status_code)
                        continue
                    with open(output_path, "wb") as f:
                        async for chunk in stream_resp.aiter_bytes():
                            f.write(chunk)

                if output_path.exists() and output_path.stat().st_size > 5000:
                    logger.info("[VIDEO] ✓ Pixabay video acquired for '%s' (%d bytes)",
                                q, output_path.stat().st_size)
                    return True
                else:
                    logger.warning("[VIDEO] Downloaded file too small for '%s'", q)

        except Exception as e:
            logger.warning("[VIDEO] Pixabay video error for '%s': %s", q, e)

    return False


# ------------------------------------------------------------------
# PIXABAY PHOTO API (for Ken Burns fallback)
# ------------------------------------------------------------------
async def fetch_pixabay_photo(
    query: str,
    output_path: Path,
    aspect_ratio: str = "9:16"
) -> bool:
    """Fetches a high-resolution photo from the Pixabay Image API."""
    api_key = get_pixabay_key()
    if not api_key:
        return False

    orientation = get_orientation_for_aspect_ratio(aspect_ratio)

    queries = [query]
    words = query.strip().split()
    if len(words) > 2:
        queries.append(" ".join(words[:2]))

    for q in queries:
        try:
            encoded_q = "+".join(q.strip().split())
            url = (
                f"https://pixabay.com/api/"
                f"?key={api_key}"
                f"&q={encoded_q}"
                f"&image_type=photo"
                f"&orientation={orientation}"
                f"&safesearch=true"
                f"&per_page=5"
                f"&min_width=1280"
            )
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue
                data = resp.json()
                hits = data.get("hits", [])
                if not hits:
                    continue

                photo = hits[0]
                img_url = photo.get("largeImageURL") or photo.get("webformatURL")
                if not img_url:
                    continue

                async with client.stream("GET", img_url, follow_redirects=True) as stream_resp:
                    if stream_resp.status_code != 200:
                        continue
                    with open(output_path, "wb") as f:
                        async for chunk in stream_resp.aiter_bytes():
                            f.write(chunk)

                if output_path.exists() and output_path.stat().st_size > 1000:
                    logger.info("[VIDEO] ✓ Pixabay photo acquired for '%s'", q)
                    return True
        except Exception as e:
            logger.warning("[VIDEO] Pixabay photo error for '%s': %s", q, e)

    return False


# ------------------------------------------------------------------
# KEN BURNS (photo → cinematic video via FFmpeg)
# ------------------------------------------------------------------
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
        f"zoompan=z='min(zoom+0.0015,1.25)':d={total_frames}"
        f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps={fps},"
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
        logger.error("[VIDEO] Ken Burns render failed: %s", e)
        return False


_video_engine = HybridVideoEngine()

from backend.services.asset_intelligence import (
    render_intelligent_motion,
    process_uploaded_video_clip,
    match_uploaded_assets_to_scenes,
)

async def prepare_scene_visual(
    scene: Scene,
    duration: float,
    theme: Theme,
    job_dir: Path,
    uploaded_asset_path: Optional[Path] = None,
    matched_asset_info: Optional[Dict[str, Any]] = None,
    aspect_ratio: str = "16:9",
    understanding: Optional[PromptUnderstanding] = None
) -> Optional[Path]:
    """
    Acquires visual clip for a scene using User Assets or the HybridVideoEngine.
    Enforces semantic relevance scoring and intelligent camera motions.
    """
    target_clip = job_dir / f"scene_{scene.id}_raw.mp4"

    try:
        # Priority 1: User Uploaded Asset (Matched via Semantic Intelligence)
        if matched_asset_info and matched_asset_info.get("asset"):
            asset = matched_asset_info["asset"]
            asset_path = Path(asset.get("file_path", ""))
            if asset_path.exists():
                logger.info("[Scene %d] ✓ Using matched user-uploaded asset: %s (score=%.2f, motion=%s)",
                            scene.id, asset.get("filename"), matched_asset_info.get("score", 1.0),
                            matched_asset_info.get("motion"))
                ext = asset_path.suffix.lower()
                motion = matched_asset_info.get("motion") or getattr(scene, "camera_motion", "slow_zoom_in")

                if ext in (".jpg", ".jpeg", ".png", ".webp"):
                    if render_intelligent_motion(asset_path, duration, target_clip, aspect_ratio, motion_type=motion):
                        scene.selectedMedia = f"upload_{asset.get('filename')}"
                        scene.relevanceScore = matched_asset_info.get("score", 1.0)
                        scene.status = "matched"
                        setattr(scene, "asset_used", asset.get("filename"))
                        return target_clip
                elif ext in (".mp4", ".webm", ".mov"):
                    if process_uploaded_video_clip(asset_path, duration, target_clip, aspect_ratio, preserve_audio=True):
                        scene.selectedMedia = f"upload_{asset.get('filename')}"
                        scene.relevanceScore = matched_asset_info.get("score", 1.0)
                        scene.status = "matched"
                        setattr(scene, "asset_used", asset.get("filename"))
                        return target_clip

        # Direct single uploaded asset path fallback
        if uploaded_asset_path and uploaded_asset_path.exists():
            logger.info("[Scene %d] Using user-uploaded asset fallback: %s",
                        scene.id, uploaded_asset_path.name)
            ext = uploaded_asset_path.suffix.lower()
            if ext in (".jpg", ".jpeg", ".png", ".webp"):
                motion = getattr(scene, "camera_motion", "slow_zoom_in")
                if render_intelligent_motion(uploaded_asset_path, duration, target_clip, aspect_ratio, motion_type=motion):
                    scene.selectedMedia = f"upload_{uploaded_asset_path.name}"
                    scene.relevanceScore = 1.0
                    scene.status = "matched"
                    setattr(scene, "asset_used", uploaded_asset_path.name)
                    return target_clip
            elif ext in (".mp4", ".webm", ".mov"):
                if process_uploaded_video_clip(uploaded_asset_path, duration, target_clip, aspect_ratio, preserve_audio=True):
                    scene.selectedMedia = f"upload_{uploaded_asset_path.name}"
                    scene.relevanceScore = 1.0
                    scene.status = "matched"
                    setattr(scene, "asset_used", uploaded_asset_path.name)
                    return target_clip

        # Priority 2: Provider-Agnostic Hybrid Visual Engine (AI Gen or Verified Stock)
        if not understanding:
            understanding = PromptUnderstanding(
                mainSubject=scene.visual_query,
                topic=scene.intent or scene.narration,
                environment="cinematic setting"
            )

        match_res = await _video_engine.acquire_scene_visual(
            scene=scene,
            target_duration=duration,
            aspect_ratio=aspect_ratio,
            output_path=target_clip,
            understanding=understanding
        )

        scene.relevanceScore = match_res.relevance_score
        scene.status = match_res.status
        scene.selectedMedia = match_res.selected_media

        if match_res.status in ("matched", "ai_generated") and match_res.media_path:
            p = Path(match_res.media_path)
            if p.exists() and p.stat().st_size > 1000:
                logger.info("[Scene %d] ✓ Acquired %s visual (score=%.2f): %s",
                            scene.id, match_res.media_type, match_res.relevance_score, match_res.selected_media)
                return p

        # Fallback to intelligent Ken Burns if no stock video
        logger.warning("[Scene %d] Sourcing visual fallback for intent: '%s'",
                       scene.id, scene.intent or scene.visual_query)
        return None

    except Exception as exc:
        logger.error("[Scene %d] Visual acquisition error: %s", scene.id, exc)
        scene.status = "no_relevant_media"
        return None


async def prepare_all_visuals(
    scenes: List[Scene],
    scene_durations: List[float],
    theme: Theme,
    job_dir: Path,
    uploaded_asset_paths: Optional[List[Path]] = None,
    assets_metadata: Optional[List[Dict[str, Any]]] = None,
    aspect_ratio: str = "16:9",
    understanding: Optional[PromptUnderstanding] = None
) -> List[Optional[Path]]:
    """
    Matches uploaded assets semantically to scenes, generating intelligent motion
    for photos and preserving audio for video clips.
    """
    matched_map: Dict[int, Dict[str, Any]] = {}
    if assets_metadata:
        matched_map = match_uploaded_assets_to_scenes(scenes, assets_metadata)

    tasks = []
    for i, scene in enumerate(scenes):
        dur = scene_durations[i] if i < len(scene_durations) else scene.duration_sec
        matched_info = matched_map.get(scene.id)
        
        fallback_path = None
        if not matched_info and uploaded_asset_paths and i < len(uploaded_asset_paths):
            fallback_path = uploaded_asset_paths[i]

        tasks.append(
            prepare_scene_visual(
                scene=scene,
                duration=dur,
                theme=theme,
                job_dir=job_dir,
                uploaded_asset_path=fallback_path,
                matched_asset_info=matched_info,
                aspect_ratio=aspect_ratio,
                understanding=understanding
            )
        )
    return await asyncio.gather(*tasks)

