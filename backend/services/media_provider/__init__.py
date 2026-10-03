import os
import re
import json
import hashlib
import logging
import asyncio
import httpx
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from backend.config import get_media_provider_key, MEDIA_CACHE_DIR
from backend.services.media_provider.base import VideoProvider, VisualMatchResult
from backend.services.media_provider.pixabay_provider import PixabayProvider
from backend.services.media_provider.ai_provider import AITextToVideoProvider
from backend.services.media_provider.engine import HybridVideoEngine

logger = logging.getLogger("media_provider")


INDEX_FILE = MEDIA_CACHE_DIR / "media_index.json"

class NormalizedVideo(BaseModel):
    id: str
    title: str
    videoUrl: str
    thumbnailUrl: Optional[str] = None
    duration: int = 15
    width: int = 1920
    height: int = 1080
    category: str = "General"
    views: str = "1.2K"
    likes: str = "340"
    comments: str = "24"
    creatorId: str = "@qoneqt_creator"
    source: str = "discovery"
    isVertical: bool = False

def _load_media_index() -> Dict[str, Dict[str, Any]]:
    if not INDEX_FILE.exists():
        return {}
    try:
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _save_media_index(index: Dict[str, Dict[str, Any]]) -> None:
    try:
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(index, f, indent=2)
    except Exception as e:
        logger.warning("Failed to save media index: %s", e)

def _generate_media_id(remote_url: str, raw_id: Any) -> str:
    raw = f"{raw_id}_{remote_url}"
    h = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]
    return f"qvid_{h}"

class BaseMediaProvider:
    async def search_videos(self, query: str, options: Optional[Dict[str, Any]] = None) -> List[NormalizedVideo]:
        raise NotImplementedError

    async def download_video(self, url: str, output_path: Path) -> bool:
        raise NotImplementedError

class InternalMediaProvider(BaseMediaProvider):
    """
    Concrete adapter for external media API, normalized entirely to Qoneqt format.
    Zero external branding, IDs, or URLs are returned to the client.
    """
    def __init__(self):
        self.api_key = get_media_provider_key()

    async def search_videos(self, query: str, options: Optional[Dict[str, Any]] = None) -> List[NormalizedVideo]:
        if not self.api_key:
            logger.warning("[MEDIA] No media provider key configured")
            return []

        opts = options or {}
        limit = opts.get("limit", 20)
        orientation = opts.get("orientation", "all")
        category = opts.get("category", "General")

        encoded_q = "+".join(query.strip().split())
        url = (
            f"https://pixabay.com/api/videos/"
            f"?key={self.api_key}"
            f"&q={encoded_q}"
            f"&video_type=all"
            f"&safesearch=true"
            f"&per_page={limit}"
        )
        if orientation in ("vertical", "horizontal"):
            url += f"&orientation={orientation}"

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning("[MEDIA] Search error: HTTP %d", resp.status_code)
                    return []

                data = resp.json()
                hits = data.get("hits", [])
                index = _load_media_index()
                results: List[NormalizedVideo] = []

                for hit in hits:
                    videos = hit.get("videos", {})
                    # Select best stream
                    remote_video_url = None
                    width, height = 1920, 1080
                    for q in ("medium", "large", "small", "tiny"):
                        info = videos.get(q, {})
                        if info.get("url"):
                            remote_video_url = info.get("url")
                            width = info.get("width", 1920)
                            height = info.get("height", 1080)
                            break

                    if not remote_video_url:
                        continue

                    # Generate internal Qoneqt media ID
                    raw_id = hit.get("id", "")
                    media_id = _generate_media_id(remote_video_url, raw_id)

                    # Thumbnail (from videos tiny/small/medium or picture_id)
                    remote_thumb_url = (
                        videos.get("tiny", {}).get("thumbnail") or
                        videos.get("small", {}).get("thumbnail") or
                        videos.get("medium", {}).get("thumbnail") or
                        (f"https://i.vimeocdn.com/video/{hit.get('picture_id')}_640x360.jpg" if hit.get("picture_id") else None)
                    )

                    # Store in index for backend proxying & streaming
                    index[media_id] = {
                        "remote_video_url": remote_video_url,
                        "remote_thumb_url": remote_thumb_url,
                        "query": query,
                        "width": width,
                        "height": height,
                        "duration": hit.get("duration", 15),
                    }

                    # Clean title
                    tags = [t.strip().capitalize() for t in hit.get("tags", "").split(",") if t.strip()]
                    title = " • ".join(tags[:3]) if tags else f"{query.capitalize()} Scene"

                    views_cnt = hit.get("views", 1400)
                    likes_cnt = hit.get("likes", 210)
                    views_fmt = f"{views_cnt / 1000:.1f}K" if views_cnt >= 1000 else str(views_cnt)
                    likes_fmt = f"{likes_cnt / 1000:.1f}K" if likes_cnt >= 1000 else str(likes_cnt)

                    # Normalized video with Qoneqt internal streaming endpoints
                    results.append(NormalizedVideo(
                        id=media_id,
                        title=title,
                        videoUrl=f"/api/media/stream/{media_id}",
                        thumbnailUrl=f"/api/media/thumb/{media_id}" if remote_thumb_url else None,
                        duration=hit.get("duration", 15),
                        width=width,
                        height=height,
                        category=category,
                        views=views_fmt,
                        likes=likes_fmt,
                        comments=f"{max(14, int(likes_cnt * 0.08))}",
                        creatorId=f"@creator_{media_id[-4:]}",
                        source="discovery",
                        isVertical=(height > width),
                    ))

                _save_media_index(index)
                return results
        except Exception as e:
            logger.error("[MEDIA] Error searching media: %s", e)
            return []

    async def download_video(self, url_or_id: str, output_path: Path) -> bool:
        remote_url = url_or_id
        if url_or_id.startswith("qvid_"):
            index = _load_media_index()
            entry = index.get(url_or_id)
            if entry and entry.get("remote_video_url"):
                remote_url = entry["remote_video_url"]

        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                async with client.stream("GET", remote_url, follow_redirects=True) as resp:
                    if resp.status_code != 200:
                        return False
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(output_path, "wb") as f:
                        async for chunk in resp.aiter_bytes():
                            f.write(chunk)
            return output_path.exists() and output_path.stat().st_size > 1000
        except Exception as e:
            logger.error("[MEDIA] Download failed: %s", e)
            return False

# Global singleton
_provider = InternalMediaProvider()

async def search_videos(query: str, options: Optional[Dict[str, Any]] = None) -> List[NormalizedVideo]:
    return await _provider.search_videos(query, options)

async def download_video(url_or_id: str, output_path: Path) -> bool:
    return await _provider.download_video(url_or_id, output_path)

def get_media_entry(media_id: str) -> Optional[Dict[str, Any]]:
    index = _load_media_index()
    return index.get(media_id)
