import os
import logging
import asyncio
import httpx
from pathlib import Path
from typing import Optional

from backend.config import get_video_provider, get_video_api_key, get_replicate_token, get_video_model
from backend.models import Scene, PromptUnderstanding
from backend.services.media_provider.base import VideoProvider, VisualMatchResult

logger = logging.getLogger("ai_video_provider")

class AITextToVideoProvider(VideoProvider):
    """
    Generative Text-to-Video Provider Adapter (Step 8).
    Pluggable provider for Replicate / Minimax / Luma / Runway when real generative AI video is needed.
    """
    async def acquire_scene_visual(
        self,
        scene: Scene,
        target_duration: float,
        aspect_ratio: str,
        output_path: Path,
        understanding: PromptUnderstanding
    ) -> VisualMatchResult:
        token = get_replicate_token() or get_video_api_key()
        if not token:
            logger.info("[AI_VIDEO] No video generation API key configured")
            return VisualMatchResult(
                scene_id=scene.id,
                intent=scene.intent or scene.visual_description,
                query_used=scene.visual_query,
                status="provider_unavailable",
                relevance_score=0.0,
                details="AITextToVideoProvider has no active API key configured"
            )

        model = get_video_model() or "minimax/video-01"
        prompt = (
            f"{scene.visual_description}, {scene.shot_type}, {scene.camera_movement}, "
            f"{understanding.lighting}, {understanding.visualStyle}, photorealistic 8k"
        )
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "wait"
        }
        ar_param = "9:16" if aspect_ratio in ("9:16", "4:5") else "16:9"

        payload = {
            "version": model if "/" not in model else None,
            "input": {
                "prompt": prompt,
                "aspect_ratio": ar_param,
                "duration": int(target_duration),
            }
        }
        url = f"https://api.replicate.com/v1/models/{model}/predictions" if "/" in model else "https://api.replicate.com/v1/predictions"

        try:
            logger.info("[AI_VIDEO] Dispatching Scene %d to AI Video Model (%s)...", scene.id, model)
            async with httpx.AsyncClient(headers=headers, timeout=120.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code in (200, 201):
                    pred = res.json()
                    pred_id = pred.get("id")
                    get_url = pred.get("urls", {}).get("get") or f"https://api.replicate.com/v1/predictions/{pred_id}"

                    for _ in range(40):
                        if pred.get("status") == "succeeded":
                            output_url = pred.get("output")
                            if isinstance(output_url, list):
                                output_url = output_url[0]
                            if output_url:
                                async with client.stream("GET", output_url) as stream_resp:
                                    if stream_resp.status_code == 200:
                                        output_path.parent.mkdir(parents=True, exist_ok=True)
                                        with open(output_path, "wb") as f:
                                            async for chunk in stream_resp.aiter_bytes():
                                                f.write(chunk)
                                        if output_path.exists() and output_path.stat().st_size > 5000:
                                            return VisualMatchResult(
                                                scene_id=scene.id,
                                                intent=scene.intent or scene.visual_description,
                                                query_used=prompt[:40],
                                                selected_media=f"ai_gen_{pred_id}",
                                                media_path=str(output_path),
                                                media_type="ai_generated",
                                                relevance_score=0.95,
                                                status="ai_generated",
                                                details=f"AI Generated via {model}"
                                            )
                        elif pred.get("status") == "failed":
                            break
                        await asyncio.sleep(3.0)
                        poll_res = await client.get(get_url)
                        if poll_res.status_code == 200:
                            pred = poll_res.json()
        except Exception as e:
            logger.warning("[AI_VIDEO] Generation error for Scene %d: %s", scene.id, e)

        return VisualMatchResult(
            scene_id=scene.id,
            intent=scene.intent or scene.visual_description,
            query_used=scene.visual_query,
            status="no_relevant_media",
            relevance_score=0.0,
            details="AI generation failed or timed out"
        )
