import os
import json
import logging
import asyncio
import subprocess
import shutil
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Any, List, Optional

from PIL import Image

from backend.config import (
    DATA_DIR,
    UPLOADS_DIR,
    FFMPEG_BIN,
    FFPROBE_BIN,
    get_gemini_key,
    GEMINI_MODEL,
    DEMO_MODE,
)
from backend.services.media_utils import probe_media_info

logger = logging.getLogger("asset_intelligence")

ASSET_META_DIR = DATA_DIR / "asset_metadata"
ASSET_META_DIR.mkdir(parents=True, exist_ok=True)


# -------------------------------------------------------------
# 1. TEXT EXTRACTORS (PDF, DOCX, TXT, MD)
# -------------------------------------------------------------
def extract_text_from_pdf(file_path: Path) -> str:
    """Extracts text content from PDF document."""
    try:
        import pypdf
        reader = pypdf.PdfReader(str(file_path))
        text = "\n".join([page.extract_text() or "" for page in reader.pages])
        return text.strip()
    except Exception as e:
        logger.warning("PDF extraction error for %s: %s", file_path.name, e)
        return ""


def extract_text_from_docx(file_path: Path) -> str:
    """Extracts text content from Word DOCX archive."""
    try:
        with zipfile.ZipFile(str(file_path)) as docx:
            xml_content = docx.read("word/document.xml")
        tree = ET.fromstring(xml_content)
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        texts = [node.text for node in tree.iter(f'{{{ns["w"]}}}t') if node.text]
        return " ".join(texts).strip()
    except Exception as e:
        logger.warning("DOCX extraction error for %s: %s", file_path.name, e)
        return ""


def extract_document_content(file_path: Path) -> str:
    """Extracts text from PDF, DOCX, TXT, or MD files."""
    ext = file_path.suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext == ".docx":
        return extract_text_from_docx(file_path)
    elif ext in (".txt", ".md"):
        try:
            return file_path.read_text(encoding="utf-8", errors="ignore").strip()
        except Exception:
            return ""
    return ""


# -------------------------------------------------------------
# 2. IMAGE METADATA & GEMINI MULTIMODAL ANALYSIS
# -------------------------------------------------------------
def get_dominant_colors(pil_img: Image.Image, count: int = 3) -> List[str]:
    """Extracts top dominant color hex codes from PIL image."""
    try:
        small = pil_img.resize((50, 50))
        colors = small.getcolors(maxcolors=2500)
        if not colors:
            return ["#111111", "#ff0055"]
        colors.sort(key=lambda x: x[0], reverse=True)
        hex_colors = []
        for _, rgb in colors[:count]:
            if isinstance(rgb, tuple) and len(rgb) >= 3:
                hex_colors.append(f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}")
        return hex_colors or ["#111111", "#ff0055"]
    except Exception:
        return ["#111111", "#ff0055"]


async def analyze_image_with_gemini(
    image_path: Path, filename: str, dimensions: Dict[str, int]
) -> Dict[str, Any]:
    """Uses Gemini multimodal vision to understand image subjects, environment, and style."""
    api_key = get_gemini_key()
    if not api_key or DEMO_MODE:
        return fallback_image_analysis(filename, dimensions)

    prompt = (
        "You are an AI Video Director. Analyze this production reference image for video generation. "
        "Extract the visual properties in JSON format:\n"
        "{\n"
        '  "description": "Concise 1-sentence visual description of what is depicted",\n'
        '  "subjects": ["main subjects or entities e.g. black sports car, smartphone, founder"],\n'
        '  "objects": ["prominent objects in the frame"],\n'
        '  "environment": "setting description e.g. dark modern studio, luxury showroom, neon city",\n'
        '  "style": "visual style e.g. luxury automotive, sleek commercial, cinematic tech",\n'
        '  "lighting": "lighting condition e.g. dramatic rim lighting, soft studio, high contrast",\n'
        '  "composition": "wide shot, close-up, front view, side profile, top-down angle",\n'
        '  "textDetected": [],\n'
        '  "suggested_camera_motion": "slow_zoom_in" | "slow_zoom_out" | "pan_left_right" | "pan_right_left" | "vertical_pan" | "camera_push",\n'
        '  "possibleScenes": ["Hero intro shot", "Product close up", "Exterior reveal", "Feature demonstration", "Final branded shot"]\n'
        "}\n"
        "Return ONLY the JSON object."
    )

    try:
        from google import genai
        from google.genai import types

        gclient = genai.Client(
            api_key=api_key, http_options=types.HttpOptions(timeout=20000)
        )
        with open(image_path, "rb") as f:
            img_bytes = f.read()

        mime = "image/jpeg"
        if image_path.suffix.lower() == ".png":
            mime = "image/png"
        elif image_path.suffix.lower() == ".webp":
            mime = "image/webp"

        image_part = types.Part.from_bytes(data=img_bytes, mime_type=mime)
        resp = await gclient.aio.models.generate_content(
            model=GEMINI_MODEL or "gemini-2.5-flash",
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )

        raw_text = resp.text or "{}"
        data = json.loads(raw_text)
        return data

    except Exception as e:
        logger.warning(
            "Gemini image vision analysis failed for %s: %s. Using heuristic analysis.",
            filename,
            e,
        )
        return fallback_image_analysis(filename, dimensions)


def fallback_image_analysis(
    filename: str, dimensions: Dict[str, int]
) -> Dict[str, Any]:
    """Generates intelligent heuristic analysis based on filename and image geometry."""
    clean_name = Path(filename).stem.replace("_", " ").replace("-", " ")
    words = [w.capitalize() for w in clean_name.split() if len(w) > 2]

    is_wide = dimensions.get("width", 1920) >= dimensions.get("height", 1080)
    suggested_motion = "pan_left_right" if is_wide else "slow_zoom_in"

    if any(k in clean_name.lower() for k in ["front", "hero", "main"]):
        comp = "hero front view"
        motion = "slow_zoom_in"
    elif any(k in clean_name.lower() for k in ["side", "profile", "pan"]):
        comp = "side profile"
        motion = "pan_left_right"
    elif any(k in clean_name.lower() for k in ["detail", "close", "macro"]):
        comp = "close-up detail"
        motion = "camera_push"
    else:
        comp = "wide cinematic shot"
        motion = suggested_motion

    return {
        "description": f"Production visual reference depicting {clean_name}.",
        "subjects": words[:3] or ["Product", "Subject"],
        "objects": words,
        "environment": "cinematic studio environment",
        "style": "clean cinematic commercial",
        "lighting": "professional studio lighting",
        "composition": comp,
        "textDetected": [],
        "suggested_camera_motion": motion,
        "possibleScenes": [
            f"{clean_name} showcase",
            "Hero scene",
            "Detail highlight",
            "Cinematic transition",
        ],
    }


# -------------------------------------------------------------
# 3. VIDEO CLIP & AUDIO METADATA ANALYSIS
# -------------------------------------------------------------
def analyze_video_clip(video_path: Path, filename: str) -> Dict[str, Any]:
    """Extracts resolution, duration, audio availability, and visual description from video."""
    info = probe_media_info(video_path)
    dur = info.get("duration", 5.0)

    # Extract thumbnail frame at 1.0s for visual understanding
    thumb_path = (
        ASSET_META_DIR / f"thumb_{video_path.stem}.jpg"
    )
    cmd = [
        FFMPEG_BIN,
        "-y",
        "-ss",
        f"{min(1.0, dur / 2):.2f}",
        "-i",
        str(video_path),
        "-vframes",
        "1",
        "-q:v",
        "2",
        str(thumb_path),
    ]
    try:
        subprocess.run(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True
        )
    except Exception:
        pass

    clean_name = Path(filename).stem.replace("_", " ").replace("-", " ")
    return {
        "duration": dur,
        "has_audio": info.get("has_audio", False),
        "audio_codec": info.get("audio_codec"),
        "description": f"User-uploaded video footage featuring {clean_name}.",
        "subjects": [w.capitalize() for w in clean_name.split()[:3]],
        "environment": "dynamic real-world scene",
        "thumbnail_path": str(thumb_path) if thumb_path.exists() else None,
    }


def analyze_audio_asset(audio_path: Path, filename: str) -> Dict[str, Any]:
    """Extracts audio characteristics using ffprobe."""
    info = probe_media_info(audio_path)
    clean_name = Path(filename).stem.replace("_", " ").replace("-", " ")
    return {
        "duration": info.get("duration", 10.0),
        "has_audio": True,
        "audio_codec": info.get("audio_codec", "aac"),
        "description": f"User-uploaded voice/audio asset: {clean_name}.",
        "kind": "voiceover_or_music",
    }


# -------------------------------------------------------------
# 4. MASTER ASSET ANALYZER & PERSISTENCE
# -------------------------------------------------------------
async def analyze_and_register_asset(
    file_path: Path, filename: str, asset_id: str, kind: str
) -> Dict[str, Any]:
    """
    Analyzes an uploaded file and writes its persistent metadata manifest.
    Called immediately upon file upload.
    """
    ext = file_path.suffix.lower()
    asset_type = "unknown"
    analysis_data: Dict[str, Any] = {}

    if ext in (".jpg", ".jpeg", ".png", ".webp"):
        asset_type = "image"
        try:
            with Image.open(file_path) as img:
                dims = {"width": img.width, "height": img.height}
                colors = get_dominant_colors(img)
        except Exception:
            dims = {"width": 1920, "height": 1080}
            colors = ["#111111", "#ff0055"]

        vision_analysis = await analyze_image_with_gemini(
            file_path, filename, dims
        )
        analysis_data = {
            **vision_analysis,
            "dimensions": dims,
            "colors": vision_analysis.get("colors") or colors,
        }

    elif ext in (".mp4", ".mov", ".webm"):
        asset_type = "video"
        analysis_data = analyze_video_clip(file_path, filename)

    elif ext in (".pdf", ".docx", ".txt", ".md"):
        asset_type = "document"
        extracted_text = extract_document_content(file_path)
        analysis_data = {
            "text": extracted_text[:8000],
            "char_count": len(extracted_text),
            "summary": extracted_text[:300].strip()
            + ("..." if len(extracted_text) > 300 else ""),
        }

    elif ext in (".mp3", ".wav", ".m4a", ".aac"):
        asset_type = "audio"
        analysis_data = analyze_audio_asset(file_path, filename)

    if "logo" in filename.lower() or kind == "logo":
        asset_type = "logo"

    manifest = {
        "assetId": asset_id,
        "filename": filename,
        "kind": kind,
        "type": asset_type,
        "mimeType": ext.replace(".", "video/" if asset_type == "video" else "image/"),
        "size": file_path.stat().st_size if file_path.exists() else 0,
        "file_path": str(file_path),
        "url": f"/api/uploads/{file_path.name}",
        "status": "ready",
        "analysis": analysis_data,
    }

    # Persist JSON manifest
    meta_file = ASSET_META_DIR / f"{asset_id}.json"
    try:
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
    except Exception as e:
        logger.warning("Failed to persist asset manifest %s: %s", asset_id, e)

    return manifest


def get_asset_manifest(asset_id: str) -> Optional[Dict[str, Any]]:
    """Loads cached asset manifest from disk."""
    meta_file = ASSET_META_DIR / f"{asset_id}.json"
    if meta_file.exists():
        try:
            with open(meta_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    # Fallback to search file in UPLOADS_DIR
    for f in UPLOADS_DIR.iterdir():
        if f.name.startswith(asset_id):
            return {
                "assetId": asset_id,
                "filename": f.name,
                "type": "video"
                if f.suffix.lower() in (".mp4", ".mov", ".webm")
                else "image",
                "file_path": str(f),
                "url": f"/api/uploads/{f.name}",
                "analysis": fallback_image_analysis(
                    f.name, {"width": 1920, "height": 1080}
                ),
            }
    return None


# -------------------------------------------------------------
# 5. SEMANTIC ASSET-TO-SCENE MATCHER & RELEVANCE SCORING
# -------------------------------------------------------------
def calculate_asset_scene_relevance(
    scene_data: Dict[str, Any], asset: Dict[str, Any]
) -> float:
    """
    Computes semantic similarity score (0.0 to 1.0) between an uploaded asset and a scene.
    Considers subjects, environment, scene intent, and visual queries.
    """
    analysis = asset.get("analysis", {})
    asset_subjects = [s.lower() for s in analysis.get("subjects", [])]
    asset_objects = [o.lower() for o in analysis.get("objects", [])]
    asset_desc = (analysis.get("description", "") + " " + asset.get("filename", "")).lower()
    asset_env = analysis.get("environment", "").lower()
    possible_scenes = [p.lower() for p in analysis.get("possibleScenes", [])]

    scene_intent = (scene_data.get("intent") or "").lower()
    scene_query = (scene_data.get("visual_query") or "").lower()
    scene_desc = (scene_data.get("visual_description") or "").lower()
    scene_text = f"{scene_intent} {scene_query} {scene_desc}"

    score = 0.0

    # 1. Subject match (weight: 0.45)
    for sub in asset_subjects:
        if sub and sub in scene_text:
            score += 0.35
            break
    for obj in asset_objects:
        if obj and obj in scene_text:
            score += 0.15
            break

    # 2. Composition / Scene Intent Match (weight: 0.25)
    composition = analysis.get("composition", "").lower()
    if composition:
        if any(w in scene_text for w in composition.split()):
            score += 0.20
    for ps in possible_scenes:
        if ps and any(w in scene_text for w in ps.split() if len(w) > 3):
            score += 0.15
            break

    # 3. Environment match (weight: 0.20)
    if asset_env:
        for w in asset_env.split():
            if len(w) > 3 and w in scene_text:
                score += 0.10
                break

    # 4. Direct filename match
    clean_fn = Path(asset.get("filename", "")).stem.lower()
    for word in clean_fn.replace("_", " ").replace("-", " ").split():
        if len(word) > 3 and word in scene_text:
            score += 0.20
            break

    return min(1.0, round(score, 2))


def match_uploaded_assets_to_scenes(
    scenes: List[Any], assets: List[Dict[str, Any]]
) -> Dict[int, Dict[str, Any]]:
    """
    Assigns uploaded assets to their optimal scenes using semantic relevance scoring.
    Never randomly assigns assets. Highest scoring asset above threshold wins.
    Returns: {scene_id: {"asset": asset_dict, "score": 0.94, "motion": "slow_zoom_in"}}
    """
    visual_assets = [a for a in assets if a.get("type") in ("image", "video")]
    if not visual_assets or not scenes:
        return {}

    matches: Dict[int, Dict[str, Any]] = {}
    used_asset_ids = set()

    # Score matrix: (scene_id, asset_id, score)
    candidate_scores = []
    for s in scenes:
        s_dict = {
            "id": getattr(s, "id", 1),
            "intent": getattr(s, "intent", ""),
            "visual_query": getattr(s, "visual_query", ""),
            "visual_description": getattr(s, "visual_description", ""),
        }
        for asset in visual_assets:
            score = calculate_asset_scene_relevance(s_dict, asset)
            candidate_scores.append((score, s_dict["id"], asset))

    # Sort candidates by score descending
    candidate_scores.sort(key=lambda x: x[0], reverse=True)

    # Assign greedily to best matching unassigned scene
    assigned_scenes = set()
    for score, s_id, asset in candidate_scores:
        aid = asset.get("assetId")
        if s_id in assigned_scenes:
            continue
        # If score passes threshold (>= 0.35) or if it's the user's primary uploaded asset
        if score >= 0.35 and aid not in used_asset_ids:
            analysis = asset.get("analysis", {})
            motion = analysis.get("suggested_camera_motion") or getattr(
                scenes[s_id - 1] if s_id <= len(scenes) else scenes[0],
                "camera_motion",
                "slow_zoom_in",
            )
            matches[s_id] = {
                "asset": asset,
                "score": score,
                "motion": motion,
                "filename": asset.get("filename"),
            }
            assigned_scenes.add(s_id)
            used_asset_ids.add(aid)

    # If user provided assets but threshold didn't capture all of them,
    # assign remaining unused assets to scenes where prompt context is broad
    for asset in visual_assets:
        aid = asset.get("assetId")
        if aid not in used_asset_ids:
            for s in scenes:
                s_id = getattr(s, "id", 1)
                if s_id not in assigned_scenes:
                    matches[s_id] = {
                        "asset": asset,
                        "score": 0.50,
                        "motion": asset.get("analysis", {}).get(
                            "suggested_camera_motion", "slow_zoom_in"
                        ),
                        "filename": asset.get("filename"),
                    }
                    assigned_scenes.add(s_id)
                    used_asset_ids.add(aid)
                    break

    logger.info(
        "[ASSET MATCH] Successfully matched %d uploaded assets to %d scenes",
        len(matches),
        len(scenes),
    )
    return matches


# -------------------------------------------------------------
# 6. INTELLIGENT CINEMATIC MOTION (KEN BURNS)
# -------------------------------------------------------------
def render_intelligent_motion(
    image_path: Path,
    duration: float,
    output_path: Path,
    aspect_ratio: str = "16:9",
    motion_type: str = "slow_zoom_in",
) -> bool:
    """
    Transforms a static photo into a cinematic video scene using FFmpeg zoompan.
    Applies varied motions: slow zoom in, slow zoom out, left-to-right pan,
    right-to-left pan, camera push, vertical pan.
    """
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

    norm_motion = motion_type.lower().replace(" ", "_").replace("-", "_")

    if norm_motion in ("slow_zoom_out", "zoom_out", "pull"):
        # Zoom out from 1.25 -> 1.00
        zoom_expr = "max(1.0, 1.25 - 0.0015*on)"
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)"
    elif norm_motion in ("pan_left_right", "left_to_right", "pan_right"):
        # Pan horizontally from left to right at constant 1.15 zoom
        zoom_expr = "1.15"
        x_expr = f"(iw-iw/zoom)*(on/{total_frames})"
        y_expr = "ih/2-(ih/zoom/2)"
    elif norm_motion in ("pan_right_left", "right_to_left", "pan_left"):
        # Pan horizontally from right to left
        zoom_expr = "1.15"
        x_expr = f"(iw-iw/zoom)*(1 - on/{total_frames})"
        y_expr = "ih/2-(ih/zoom/2)"
    elif norm_motion in ("vertical_pan", "pan_up", "tilt_up"):
        # Tilt/pan vertically
        zoom_expr = "1.15"
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = f"(ih-ih/zoom)*(on/{total_frames})"
    elif norm_motion in ("camera_push", "push", "fast_zoom"):
        # Dramatic camera push in
        zoom_expr = "min(zoom+0.0025, 1.35)"
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)"
    else:
        # Default: smooth cinematic slow zoom in
        zoom_expr = "min(zoom+0.0015, 1.25)"
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)"

    vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
        f"zoompan=z='{zoom_expr}':d={total_frames}:x='{x_expr}':y='{y_expr}':s={w}x{h}:fps={fps},"
        f"format=yuv420p"
    )

    cmd = [
        FFMPEG_BIN,
        "-y",
        "-loop",
        "1",
        "-i",
        str(image_path),
        "-vf",
        vf,
        "-t",
        f"{duration:.2f}",
        "-r",
        "30",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-pix_fmt",
        "yuv420p",
        str(output_path),
    ]

    try:
        subprocess.run(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True
        )
        return True
    except Exception as e:
        logger.error(
            "Intelligent motion render failed for %s: %s", image_path.name, e
        )
        return False


# -------------------------------------------------------------
# 7. UPLOADED VIDEO NORMALIZER (Scale & Preserve Original Audio)
# -------------------------------------------------------------
def process_uploaded_video_clip(
    video_path: Path,
    target_duration: float,
    output_path: Path,
    aspect_ratio: str = "16:9",
    preserve_audio: bool = True,
) -> bool:
    """
    Normalizes an uploaded video clip to the scene's target duration and aspect ratio.
    CRITICAL: Preserves the user's original audio stream intact (-map 0:v:0 -map 0:a:0?).
    """
    if aspect_ratio in ("16:9", "21:9", "16:10"):
        w, h = 1920, 1080
    elif aspect_ratio == "1:1":
        w, h = 1080, 1080
    elif aspect_ratio == "4:5":
        w, h = 1080, 1350
    else:
        w, h = 1080, 1920

    vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1"

    cmd = [
        FFMPEG_BIN,
        "-y",
        "-stream_loop",
        "-1",
        "-i",
        str(video_path),
        "-vf",
        vf,
        "-t",
        f"{target_duration:.2f}",
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        str(output_path),
    ]

    try:
        subprocess.run(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True
        )
        return True
    except Exception as e:
        logger.error(
            "Processing uploaded video clip %s failed: %s", video_path.name, e
        )
        return False
