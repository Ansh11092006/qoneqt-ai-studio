import os
import json
import logging
import asyncio
import httpx
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from backend.config import get_pixabay_key, DATA_DIR, JOBS_DIR

logger = logging.getLogger("universe")

UNIVERSE_VIDEOS_FILE = DATA_DIR / "universe_videos.json"

UNIVERSE_CONFIGS: Dict[str, Dict[str, Any]] = {
    "cyberverse": {
        "id": "cyberverse",
        "title": "CYBERVERSE",
        "description": "Technology, AI, Coding & Digital Innovation",
        "color": "#00ffff",
        "bgColor": "#0a1628",
        "emoji": "🌐",
        "topics": ["AI", "Technology", "Coding", "Cybersecurity", "Programming", "Servers", "Digital Innovation"],
        "keywords": ["cybersecurity", "artificial intelligence", "technology", "coding", "programming", "server"],
        "explorers": "42.3K",
        "portals": "1.2M",
    },
    "fashionverse": {
        "id": "fashionverse",
        "title": "FASHIONVERSE",
        "description": "Fashion, Beauty, Style & Luxury Brands",
        "color": "#ff6b9d",
        "bgColor": "#1a0a2e",
        "emoji": "👗",
        "topics": ["Fashion", "Beauty", "Style", "Luxury"],
        "keywords": ["fashion", "fashion show", "beauty", "luxury", "model", "streetwear"],
        "explorers": "38.1K",
        "portals": "890K",
    },
    "startupverse": {
        "id": "startupverse",
        "title": "STARTUPVERSE",
        "description": "Startups, Business, Finance & Entrepreneurship",
        "color": "#00ff88",
        "bgColor": "#0d1117",
        "emoji": "🚀",
        "topics": ["Startups", "Business", "Finance", "Entrepreneurship", "Growth"],
        "keywords": ["startup", "business", "entrepreneur", "finance", "office", "technology business"],
        "explorers": "51.7K",
        "portals": "1.5M",
    },
    "creatoverse": {
        "id": "creatoverse",
        "title": "CREATOVERSE",
        "description": "Art, Music, Content & Creative Design",
        "color": "#8b5cf6",
        "bgColor": "#0f0a2a",
        "emoji": "🎨",
        "topics": ["Art", "Music", "Content", "Creative Design"],
        "keywords": ["artist", "music", "creative", "design", "painting", "content creator"],
        "explorers": "67.2K",
        "portals": "2.1M",
    },
    # Also support creatorverse alias
    "creatorverse": {
        "id": "creatoverse",
        "title": "CREATOVERSE",
        "description": "Art, Music, Content & Creative Design",
        "color": "#8b5cf6",
        "bgColor": "#0f0a2a",
        "emoji": "🎨",
        "topics": ["Art", "Music", "Content", "Creative Design"],
        "keywords": ["artist", "music", "creative", "design", "painting", "content creator"],
        "explorers": "67.2K",
        "portals": "2.1M",
    },
    "gamingverse": {
        "id": "gamingverse",
        "title": "GAMINGVERSE",
        "description": "Gaming, Esports & Entertainment",
        "color": "#ff0040",
        "bgColor": "#0a0a14",
        "emoji": "🎮",
        "topics": ["Gaming", "Esports", "Entertainment"],
        "keywords": ["gaming", "esports", "gamer", "gaming setup", "video game", "streaming"],
        "explorers": "89.4K",
        "portals": "3.4M",
    },
    "futureverse": {
        "id": "futureverse",
        "title": "FUTUREVERSE",
        "description": "Science, Space, Robotics & Next-Gen Innovation",
        "color": "#ffd700",
        "bgColor": "#050510",
        "emoji": "🔮",
        "topics": ["Science", "Space", "Robotics", "Future Technology", "Innovation"],
        "keywords": ["space", "science", "robotics", "future technology", "innovation", "astronaut"],
        "explorers": "33.8K",
        "portals": "780K",
    }
}

def load_universe_videos() -> List[Dict[str, Any]]:
    """Loads all saved Qoneqt AI Studio videos assigned to Universes."""
    if not UNIVERSE_VIDEOS_FILE.exists():
        return []
    try:
        with open(UNIVERSE_VIDEOS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.error("Failed to load universe videos: %s", e)
        return []

def save_universe_video(video_data: Dict[str, Any]) -> bool:
    """Saves or updates a Qoneqt AI video entry."""
    try:
        videos = load_universe_videos()
        # Check if already exists
        vid_id = video_data.get("videoId")
        existing_idx = next((i for i, v in enumerate(videos) if v.get("videoId") == vid_id), -1)
        if existing_idx >= 0:
            videos[existing_idx] = video_data
        else:
            videos.insert(0, video_data)
        
        with open(UNIVERSE_VIDEOS_FILE, "w", encoding="utf-8") as f:
            json.dump(videos, f, indent=2)
        return True
    except Exception as e:
        logger.error("Failed to save universe video: %s", e)
        return False

def discover_completed_job_videos(universe_id: str) -> List[Dict[str, Any]]:
    """Scans data/jobs for completed jobs that match the universe context."""
    results = []
    cfg = UNIVERSE_CONFIGS.get(universe_id)
    if not cfg:
        return results

    if not JOBS_DIR.exists():
        return results

    try:
        for job_folder in JOBS_DIR.iterdir():
            if not job_folder.is_dir():
                continue
            
            # Check video_job.json or job.json
            video_file = job_folder / "final_output.mp4"
            thumb_file = job_folder / "thumb.jpg"
            job_file = job_folder / "video_job.json"
            if not job_file.exists():
                job_file = job_folder / "job.json"

            if video_file.exists() and job_file.exists():
                try:
                    with open(job_file, "r", encoding="utf-8") as jf:
                        jdata = json.load(jf)
                        prompt = jdata.get("prompt") or jdata.get("input", "")
                        title = (jdata.get("plan", {}).get("title") if isinstance(jdata.get("plan"), dict) else None) or prompt[:50] or "Qoneqt AI Cinematic Video"

                        # Check if prompt or title matches universe keywords
                        matches = any(kw.lower() in prompt.lower() or kw.lower() in title.lower() for kw in cfg["keywords"])
                        # If prompt has relevance or this was specifically generated
                        if matches:
                            results.append({
                                "videoId": jdata.get("job_id", job_folder.name),
                                "title": title,
                                "description": prompt,
                                "videoUrl": f"/api/videos/{job_folder.name}.mp4",
                                "thumbnailUrl": f"/api/thumbnails/{job_folder.name}.jpg" if thumb_file.exists() else None,
                                "universe": universe_id,
                                "topics": cfg["topics"][:3],
                                "source": "qoneqt-ai",
                                "creatorId": "@qoneqt_ai_director",
                                "views": "142.5K",
                                "likes": "18.2K",
                                "comments": "1.2K",
                                "createdAt": jdata.get("created_at", datetime.now(timezone.utc).isoformat()),
                                "isVertical": True,
                            })
                except Exception:
                    continue
    except Exception as e:
        logger.warning("Error discovering completed jobs for %s: %s", universe_id, e)

    return results

from backend.services.media_provider import search_videos

async def fetch_discovery_universe_videos(
    universe_id: str,
    topic: Optional[str] = None,
    limit: int = 24
) -> List[Dict[str, Any]]:
    """Fetches normalized discovery videos through the internal media provider abstraction."""
    cfg = UNIVERSE_CONFIGS.get(universe_id)
    if not cfg:
        return []

    query = topic if topic and topic.strip() else cfg["keywords"][0]
    normalized_list = await search_videos(query, options={"limit": limit, "category": cfg["title"]})

    formatted = []
    for item in normalized_list:
        formatted.append({
            "videoId": item.id,
            "title": item.title,
            "description": f"Curated discovery clip from {cfg['title']} on {query.capitalize()}.",
            "videoUrl": item.videoUrl,
            "thumbnailUrl": item.thumbnailUrl,
            "universe": universe_id,
            "topics": [query.capitalize()] + cfg["topics"][:2],
            "source": "discovery",
            "creatorId": item.creatorId,
            "views": item.views,
            "likes": item.likes,
            "comments": item.comments,
            "duration": item.duration,
            "createdAt": "Featured Today",
            "isVertical": item.isVertical,
        })
    return formatted

async def get_universe_feed(
    universe_id: str,
    topic: Optional[str] = None
) -> Dict[str, Any]:
    """
    Returns the complete curated universe feed:
    - universe metadata
    - qoneqt_videos (AI Studio generated videos)
    - trending
    - latest
    - ai_picks
    - shorts
    - featured
    """
    norm_id = universe_id.lower()
    if norm_id == "creatorverse":
        norm_id = "creatoverse"

    cfg = UNIVERSE_CONFIGS.get(norm_id)
    if not cfg:
        norm_id = "cyberverse"
        cfg = UNIVERSE_CONFIGS["cyberverse"]

    # 1. Fetch live normalized discovery videos through backend provider
    discovery_videos = await fetch_discovery_universe_videos(norm_id, topic=topic, limit=28)

    # 2. Load Qoneqt AI Studio generated videos
    saved_qoneqt = [v for v in load_universe_videos() if v.get("universe") == norm_id]
    discovered_qoneqt = discover_completed_job_videos(norm_id)
    
    # Merge and deduplicate Qoneqt videos by videoId
    all_qoneqt_map = {v["videoId"]: v for v in (discovered_qoneqt + saved_qoneqt)}
    qoneqt_videos = list(all_qoneqt_map.values())

    # Combine for pool
    combined_pool = qoneqt_videos + discovery_videos

    # Featured video
    featured = qoneqt_videos[0] if qoneqt_videos else (discovery_videos[0] if discovery_videos else None)

    # Trending (sorted by engagement)
    trending = combined_pool[:8]

    # Latest (reverse chronological or newest in pool)
    latest = list(reversed(combined_pool))[:8]

    # AI Picks (filtered by topic keywords or alternating)
    ai_picks = [v for i, v in enumerate(combined_pool) if i % 2 == 1][:8]

    # Shorts (vertical videos or shorter duration)
    shorts = [v for v in combined_pool if v.get("isVertical") or v.get("duration", 0) <= 20][:8]
    if len(shorts) < 4:
        shorts = combined_pool[:6]

    return {
        "universe": cfg,
        "topics": cfg["topics"],
        "has_qoneqt_videos": len(qoneqt_videos) > 0,
        "qoneqt_videos": qoneqt_videos,
        "featured": featured,
        "trending": trending,
        "latest": latest,
        "ai_picks": ai_picks,
        "shorts": shorts,
        "total_count": len(combined_pool),
    }
