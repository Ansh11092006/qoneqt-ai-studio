import os
import logging
import asyncio
import httpx
from pathlib import Path
from typing import Optional, List, Dict, Any

from backend.config import get_pixabay_key
from backend.models import Scene, PromptUnderstanding
from backend.services.media_provider.base import VideoProvider, VisualMatchResult
from backend.services.semantic_matcher import (
    score_candidate_multisignal, MIN_RELEVANCE_THRESHOLD
)
from backend.services.media_utils import render_ken_burns_video, get_orientation_for_aspect_ratio
from backend.services.prompt_engine import refine_scene_query


logger = logging.getLogger("pixabay_provider")

class PixabayProvider(VideoProvider):
    """
    Intelligent Stock Video Matcher:
    - Never blindly accepts the first search result.
    - Evaluates every candidate using multi-signal scoring against scene intent.
    - Eliminates clips containing negative concepts.
    - Enforces MIN_RELEVANCE_THRESHOLD (0.70).
    - Automatically refines queries (3-5 attempts) when results are poor.
    - Falls back to Ken Burns photo only if photo relevance also >= 0.70.
    - Never forces unrelated video if threshold is not met (marks 'no_relevant_media').
    """

    async def _search_pixabay_videos(self, query: str, orientation: str, api_key: str) -> List[Dict[str, Any]]:
        """Queries Pixabay video endpoint safely."""
        try:
            encoded_q = "+".join(query.strip().split())
            url = (
                f"https://pixabay.com/api/videos/"
                f"?key={api_key}"
                f"&q={encoded_q}"
                f"&video_type=all"
                f"&orientation={orientation}"
                f"&safesearch=true"
                f"&per_page=15"
            )
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(url)
                if resp.status_code == 429:
                    await asyncio.sleep(2.0)
                    resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning("[PIXABAY] Video search HTTP %d for '%s'", resp.status_code, query)
                    return []
                data = resp.json()
                return data.get("hits", [])
        except Exception as e:
            logger.warning("[PIXABAY] Search exception for '%s': %s", query, e)
            return []

    async def _search_pixabay_photos(self, query: str, orientation: str, api_key: str) -> List[Dict[str, Any]]:
        """Queries Pixabay photo endpoint safely."""
        try:
            encoded_q = "+".join(query.strip().split())
            url = (
                f"https://pixabay.com/api/"
                f"?key={api_key}"
                f"&q={encoded_q}"
                f"&image_type=photo"
                f"&orientation={orientation}"
                f"&safesearch=true"
                f"&per_page=10"
                f"&min_width=1280"
            )
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    return []
                return resp.json().get("hits", [])
        except Exception as e:
            logger.warning("[PIXABAY] Photo search exception for '%s': %s", query, e)
            return []

    async def acquire_scene_visual(
        self,
        scene: Scene,
        target_duration: float,
        aspect_ratio: str,
        output_path: Path,
        understanding: PromptUnderstanding
    ) -> VisualMatchResult:
        api_key = get_pixabay_key()
        if not api_key:
            logger.error("[PIXABAY] API key missing")
            return VisualMatchResult(
                scene_id=scene.id,
                intent=scene.intent or scene.narration,
                query_used=scene.visual_query,
                status="no_relevant_media",
                relevance_score=0.0,
                details="Pixabay API key not configured"
            )

        orientation = get_orientation_for_aspect_ratio(aspect_ratio)

        # Assemble prioritized query attempts with concise keyword decomposition
        queries_to_try: List[str] = []
        if scene.visual_query and scene.visual_query.strip():
            q_clean = scene.visual_query.strip()
            queries_to_try.append(q_clean)
            words = q_clean.split()
            if len(words) > 2:
                queries_to_try.append(" ".join(words[:2]))
                queries_to_try.append(" ".join(words[-2:]))

        for fq in scene.fallback_queries:
            if fq and fq.strip():
                f_clean = fq.strip()
                if f_clean not in queries_to_try:
                    queries_to_try.append(f_clean)
                f_words = f_clean.split()
                if len(f_words) > 2:
                    short_f = " ".join(f_words[:2])
                    if short_f not in queries_to_try:
                        queries_to_try.append(short_f)

        # Include key required visuals as concise queries
        for rv in scene.requiredVisuals[:2]:
            rv_words = rv.strip().split()
            if rv_words:
                short_rv = " ".join(rv_words[:2])
                if short_rv not in queries_to_try:
                    queries_to_try.append(short_rv)

        best_candidate: Optional[Dict[str, Any]] = None
        best_score = 0.0
        best_query = queries_to_try[0] if queries_to_try else "cybersecurity"
        best_explanation = ""

        # Attempt queries with progressive evaluation
        attempts_done: List[str] = []
        for q in queries_to_try:
            attempts_done.append(q)
            hits = await self._search_pixabay_videos(q, orientation, api_key)
            for hit in hits:
                scores = score_candidate_multisignal(
                    candidate=hit,
                    scene_intent=scene.intent or scene.visual_description,
                    required_visuals=scene.requiredVisuals,
                    negative_concepts=scene.negativeConcepts,
                    main_subject=understanding.mainSubject,
                    topic=understanding.topic,
                    action=understanding.action,
                    environment=understanding.environment,
                    visual_style=understanding.visualStyle,
                    lighting=understanding.lighting
                )
                if scores.composite_score > best_score:
                    best_score = scores.composite_score
                    best_explanation = scores.explanation
                    if scores.is_acceptable:
                        best_candidate = hit
                        best_query = q
                        break

            if best_candidate and best_score >= MIN_RELEVANCE_THRESHOLD:
                logger.info("[PIXABAY] Scene %d: High relevance match found for '%s' (Score: %.2f)",
                            scene.id, best_query, best_score)
                break

        # STEP 6: If no candidate reached threshold, query Gemini for query refinement (up to 3 attempts)
        if (not best_candidate or best_score < MIN_RELEVANCE_THRESHOLD) and len(attempts_done) < 5:
            logger.info("[PIXABAY] Scene %d: Initial queries below threshold (Best: %.2f). Refining queries...",
                        scene.id, best_score)
            refined_queries = await refine_scene_query(
                scene_intent=scene.intent or scene.visual_description,
                required_visuals=scene.requiredVisuals,
                negative_concepts=scene.negativeConcepts,
                attempt_history=attempts_done
            )
            for rq in refined_queries:
                if rq in attempts_done:
                    continue
                attempts_done.append(rq)
                hits = await self._search_pixabay_videos(rq, orientation, api_key)
                for hit in hits:
                    scores = score_candidate_multisignal(
                        candidate=hit,
                        scene_intent=scene.intent or scene.visual_description,
                        required_visuals=scene.requiredVisuals,
                        negative_concepts=scene.negativeConcepts,
                        main_subject=understanding.mainSubject,
                        topic=understanding.topic,
                        action=understanding.action,
                        environment=understanding.environment,
                        visual_style=understanding.visualStyle,
                        lighting=understanding.lighting
                    )
                    if scores.composite_score > best_score:
                        best_score = scores.composite_score
                        best_explanation = scores.explanation
                        if scores.is_acceptable:
                            best_candidate = hit
                            best_query = rq
                            break
                if best_candidate and best_score >= MIN_RELEVANCE_THRESHOLD:
                    logger.info("[PIXABAY] Scene %d: Refined query '%s' reached score %.2f",
                                scene.id, best_query, best_score)
                    break

        # If a video candidate reached threshold, download it
        if best_candidate and best_score >= MIN_RELEVANCE_THRESHOLD:
            videos = best_candidate.get("videos", {})
            remote_url = None
            for quality in ("large", "medium", "small"):
                info = videos.get(quality, {})
                if info.get("url"):
                    remote_url = info.get("url")
                    break

            if remote_url:
                try:
                    async with httpx.AsyncClient(timeout=35.0) as client:
                        async with client.stream("GET", remote_url, follow_redirects=True) as stream_resp:
                            if stream_resp.status_code == 200:
                                output_path.parent.mkdir(parents=True, exist_ok=True)
                                with open(output_path, "wb") as f:
                                    async for chunk in stream_resp.aiter_bytes():
                                        f.write(chunk)
                                if output_path.exists() and output_path.stat().st_size > 5000:
                                    return VisualMatchResult(
                                        scene_id=scene.id,
                                        intent=scene.intent or scene.visual_description,
                                        query_used=best_query,
                                        selected_media=f"pixabay_vid_{best_candidate.get('id')}",
                                        media_path=str(output_path),
                                        media_type="video",
                                        relevance_score=best_score,
                                        status="matched",
                                        details=best_explanation
                                    )
                except Exception as e:
                    logger.warning("[PIXABAY] Download failed: %s", e)

        # Alternative Visual Strategy: Photo + Ken Burns pan/zoom (Step 7)
        # BUT ONLY IF PHOTO RELEVANCE ALSO MEETS MIN_RELEVANCE_THRESHOLD!
        logger.info("[PIXABAY] Scene %d: Attempting Photo + Ken Burns fallback...", scene.id)
        photo_hits = await self._search_pixabay_photos(best_query, orientation, api_key)
        for ph in photo_hits:
            scores = score_candidate_multisignal(
                candidate=ph,
                scene_intent=scene.intent or scene.visual_description,
                required_visuals=scene.requiredVisuals,
                negative_concepts=scene.negativeConcepts,
                main_subject=understanding.mainSubject,
                topic=understanding.topic,
                action=understanding.action,
                environment=understanding.environment,
                visual_style=understanding.visualStyle,
                lighting=understanding.lighting
            )
            if scores.is_acceptable:
                img_url = ph.get("largeImageURL") or ph.get("webformatURL")
                if img_url:
                    temp_photo = output_path.parent / f"temp_photo_{scene.id}.jpg"
                    try:
                        async with httpx.AsyncClient(timeout=20.0) as client:
                            async with client.stream("GET", img_url, follow_redirects=True) as sresp:
                                if sresp.status_code == 200:
                                    with open(temp_photo, "wb") as f:
                                        async for chunk in sresp.aiter_bytes():
                                            f.write(chunk)
                        if temp_photo.exists() and temp_photo.stat().st_size > 2000:
                            if render_ken_burns_video(temp_photo, target_duration, output_path, aspect_ratio):
                                temp_photo.unlink(missing_ok=True)
                                return VisualMatchResult(
                                    scene_id=scene.id,
                                    intent=scene.intent or scene.visual_description,
                                    query_used=best_query,
                                    selected_media=f"pixabay_photo_{ph.get('id')}",
                                    media_path=str(output_path),
                                    media_type="photo_ken_burns",
                                    relevance_score=scores.composite_score,
                                    status="matched",
                                    details=f"Ken Burns animated photo: {scores.explanation}"
                                )
                    except Exception as e:
                        logger.warning("[PIXABAY] Ken Burns photo fallback failed: %s", e)

        # STEP 7: DO NOT FORCE A VIDEO
        # If no relevant footage exists, do not substitute random unrelated footage!
        logger.warning("[PIXABAY] Scene %d: No media met relevance threshold %.2f (Best: %.2f)",
                       scene.id, MIN_RELEVANCE_THRESHOLD, best_score)
        return VisualMatchResult(
            scene_id=scene.id,
            intent=scene.intent or scene.visual_description,
            query_used=best_query,
            selected_media=None,
            media_path=None,
            media_type="none",
            relevance_score=best_score,
            status="no_relevant_media",
            details="No existing visual reached the 0.70 relevance threshold. Unrelated footage rejected."
        )
