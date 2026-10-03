import abc
from pathlib import Path
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from backend.models import Scene, PromptUnderstanding, SceneRecord

class VisualMatchResult(BaseModel):
    scene_id: int
    intent: str
    query_used: str
    selected_media: Optional[str] = None
    media_path: Optional[str] = None
    media_type: str = "video" # video, photo_ken_burns, ai_generated, none
    relevance_score: float = 0.0
    status: str = "matched" # matched, no_relevant_media, ai_generated, retry_failed
    details: Optional[str] = None

class VideoProvider(abc.ABC):
    """
    Provider-agnostic abstraction for scene visual acquisition.
    Can be backed by stock video matching, generative AI video, or hybrid pipelines.
    """
    @abc.abstractmethod
    async def acquire_scene_visual(
        self,
        scene: Scene,
        target_duration: float,
        aspect_ratio: str,
        output_path: Path,
        understanding: PromptUnderstanding
    ) -> VisualMatchResult:
        pass
