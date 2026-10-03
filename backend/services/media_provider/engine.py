import logging
from pathlib import Path
from typing import Optional, List

from backend.models import Scene, PromptUnderstanding
from backend.services.media_provider.base import VideoProvider, VisualMatchResult
from backend.services.media_provider.pixabay_provider import PixabayProvider
from backend.services.media_provider.ai_provider import AITextToVideoProvider

logger = logging.getLogger("hybrid_engine")

class HybridVideoEngine(VideoProvider):
    """
    Provider-Agnostic Video Engine (Step 8):
    1. Tests existing visual media against strict semantic relevance (threshold 0.70).
    2. If no matching footage exists, cascades to generative AI video provider.
    3. If neither can deliver relevant visuals, marks scene as 'no_relevant_media'.
    4. Guarantees that random or unrelated footage is NEVER forced into the video.
    """
    def __init__(self):
        self.stock_provider = PixabayProvider()
        self.ai_provider = AITextToVideoProvider()

    async def acquire_scene_visual(
        self,
        scene: Scene,
        target_duration: float,
        aspect_ratio: str,
        output_path: Path,
        understanding: PromptUnderstanding
    ) -> VisualMatchResult:
        # Step A: Intelligent Semantic Stock Matching
        result = await self.stock_provider.acquire_scene_visual(
            scene=scene,
            target_duration=target_duration,
            aspect_ratio=aspect_ratio,
            output_path=output_path,
            understanding=understanding
        )

        if result.status == "matched" and result.relevance_score >= 0.70:
            return result

        # Step B: AI Generative Text-To-Video Fallback (Step 8)
        logger.info("[HYBRID] Scene %d: Existing footage did not reach threshold (score %.2f). Trying AI Video Generator...",
                    scene.id, result.relevance_score)
        ai_result = await self.ai_provider.acquire_scene_visual(
            scene=scene,
            target_duration=target_duration,
            aspect_ratio=aspect_ratio,
            output_path=output_path,
            understanding=understanding
        )

        if ai_result.status == "ai_generated" and ai_result.media_path:
            return ai_result

        # Step C: If both fail, return no_relevant_media (Do NOT force random footage)
        logger.warning("[HYBRID] Scene %d: No relevant media could be matched or generated. Status: no_relevant_media",
                       scene.id)
        return result
