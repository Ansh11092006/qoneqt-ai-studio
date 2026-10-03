import os
import re
import logging
import subprocess
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple

from backend.config import FFMPEG_BIN, FFPROBE_BIN
from backend.models import Theme, Scene

logger = logging.getLogger("composer")

# Exact format specifications mapping ratio strings to target canvas, safe areas & subtitles
FORMAT_SPECS: Dict[str, Dict[str, Any]] = {
    "9:16":  {"w": 1080, "h": 1920, "label": "TikTok/Reels/Shorts",  "subtitle_style": "vertical",    "text_safe_y": 1400, "cta_box": (60, 600, 960, 720)},
    "16:9":  {"w": 1920, "h": 1080, "label": "YouTube/Landscape",     "subtitle_style": "horizontal",  "text_safe_y": 900,  "cta_box": (80, 300, 1760, 480)},
    "1:1":   {"w": 1080, "h": 1080, "label": "Instagram Feed",         "subtitle_style": "square",      "text_safe_y": 850,  "cta_box": (60, 400, 960, 680)},
    "4:5":   {"w": 1080, "h": 1350, "label": "Instagram Portrait",     "subtitle_style": "portrait",    "text_safe_y": 1100, "cta_box": (60, 500, 960, 700)},
    "21:9":  {"w": 2560, "h": 1080, "label": "Cinematic",              "subtitle_style": "cinematic",   "text_safe_y": 900,  "cta_box": (80, 300, 2400, 480)},
    "16:10": {"w": 1920, "h": 1200, "label": "Presentation",           "subtitle_style": "horizontal",  "text_safe_y": 1000, "cta_box": (80, 350, 1760, 500)},
    "2:3":   {"w": 1080, "h": 1620, "label": "Pinterest",              "subtitle_style": "portrait",    "text_safe_y": 1300, "cta_box": (60, 550, 960, 720)},
    "1.91:1":{"w": 1200, "h": 628,  "label": "LinkedIn",              "subtitle_style": "horizontal",  "text_safe_y": 500,  "cta_box": (60, 200, 1080, 280)},
}

RESOLUTION_SCALE: Dict[str, float] = {
    "720p":  0.667,
    "1080p": 1.0,
    "1440p": 1.333,
    "4K":    2.0,
    "8K":    2.0, # Cap at 2x for memory efficiency
}

def get_dimensions(aspect_ratio: str = "9:16", resolution: str = "1080p") -> Tuple[int, int]:
    spec = FORMAT_SPECS.get(aspect_ratio, FORMAT_SPECS["9:16"])
    scale = RESOLUTION_SCALE.get(resolution, 1.0)
    w = int(spec["w"] * scale)
    h = int(spec["h"] * scale)
    # Ensure dimensions are divisible by 2 for libx264
    w = w - (w % 2)
    h = h - (h % 2)
    return w, h

def normalize_scene_clip(
    input_video: Path,
    audio_file: Path,
    target_duration: float,
    output_clip: Path,
    aspect_ratio: str = "9:16",
    resolution: str = "1080p"
) -> bool:
    """
    Normalizes a scene video into exactly target dimensions according to aspect_ratio & resolution,
    30fps, yuv420p, loops/trims video to match target_duration, and attaches the audio track.
    """
    w, h = get_dimensions(aspect_ratio, resolution)
    
    # Scale to cover then center crop without distortion
    vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=increase,"
        f"crop={w}:{h},"
        f"fps=30,"
        f"format=yuv420p"
    )

    cmd = [
        FFMPEG_BIN, "-y",
        "-stream_loop", "-1",
        "-i", str(input_video),
        "-i", str(audio_file),
        "-vf", vf,
        "-t", f"{target_duration:.2f}",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "44100",
        "-ac", "2",
        "-shortest",
        str(output_clip)
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except subprocess.CalledProcessError as e:
        logger.error("Failed to normalize scene clip %s: %s", input_video, e.stderr.decode('utf-8', errors='ignore'))
        return False

def render_cta_clip(
    cta_text: str,
    theme: Theme,
    output_clip: Path,
    duration: float = 1.5,
    aspect_ratio: str = "9:16",
    resolution: str = "1080p"
) -> bool:
    """Renders a 1.5s polished CTA end card matching target aspect ratio and theme colors."""
    w, h = get_dimensions(aspect_ratio, resolution)
    spec = FORMAT_SPECS.get(aspect_ratio, FORMAT_SPECS["9:16"])
    scale = RESOLUTION_SCALE.get(resolution, 1.0)
    
    base_box = spec.get("cta_box", (60, 600, 960, 720))
    bx = int(base_box[0] * scale)
    by = int(base_box[1] * scale)
    bw = int(base_box[2] * scale)
    bh = int(base_box[3] * scale)
    
    fps = 30
    bg_hex = theme.palette.bg1.lstrip("#")
    accent_hex = theme.palette.accent.lstrip("#")
    
    vf = (
        f"color=c=0x{bg_hex}:s={w}x{h}:r={fps}:d={duration:.2f},"
        f"drawbox=x={bx}:y={by}:w={bw}:h={bh}:color=0x{accent_hex}@0.2:t=fill,"
        f"drawbox=x={bx}:y={by}:w={bw}:h={bh}:color=0x{accent_hex}@0.8:t=4"
    )

    cmd = [
        FFMPEG_BIN, "-y",
        "-f", "lavfi",
        "-i", vf,
        "-f", "lavfi",
        "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-t", f"{duration:.2f}",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-shortest",
        str(output_clip)
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception as e:
        logger.error("Failed to render CTA clip: %s", e)
        return False

def generate_thumbnail(video_path: Path, thumb_path: Path) -> bool:
    """Extracts a high quality frame at ~1.0s as a thumbnail JPG."""
    cmd = [
        FFMPEG_BIN, "-y",
        "-ss", "00:00:01.000",
        "-i", str(video_path),
        "-vframes", "1",
        "-q:v", "2",
        str(thumb_path)
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception as e:
        logger.warning("Failed to extract thumbnail at 1s, trying 0s: %s", e)
        cmd[2] = "00:00:00.100"
        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            return True
        except Exception:
            return False

def build_watermark_filter(
    w: int, 
    h: int, 
    watermark_config: Optional[Dict[str, Any]], 
    accent_hex: str = "ff0055",
    logo_path: Optional[Path] = None
) -> str:
    """Builds an FFmpeg drawbox/drawtext or logo overlay filter string based on watermark config."""
    cfg = watermark_config or {}
    wm_text = cfg.get("text", "Qoneqt AI Studio")
    pos = cfg.get("position", "top-right")
    opacity = float(cfg.get("opacity", 0.8))
    size = cfg.get("size", "medium")
    
    # Calculate box sizes relative to video resolution
    if size == "small":
        bw, bh = int(w * 0.22), int(h * 0.035)
    elif size == "large":
        bw, bh = int(w * 0.38), int(h * 0.055)
    else: # medium
        bw, bh = int(w * 0.30), int(h * 0.045)
    
    margin_x = int(w * 0.035)
    margin_y = int(h * 0.025)
    
    if pos == "top-left":
        bx = margin_x
        by = margin_y
    elif pos == "bottom-left":
        bx = margin_x
        by = h - bh - margin_y
    elif pos == "bottom-right":
        bx = w - bw - margin_x
        by = h - bh - margin_y
    elif pos == "center":
        bx = (w - bw) // 2
        by = (h - bh) // 2
    else: # top-right
        bx = w - bw - margin_x
        by = margin_y

    accent_clean = accent_hex.lstrip("#")
    
    if logo_path and logo_path.exists():
        return f"movie='{logo_path.name}',scale={bw}:-1[logo];[in][logo]overlay={bx}:{by}[out]"
    else:
        return (
            f"drawbox=x={bx}:y={by}:w={bw}:h={bh}:color=black@{opacity*0.6:.2f}:t=fill,"
            f"drawbox=x={bx}:y={by}:w={bw}:h={bh}:color=0x{accent_clean}@{opacity:.2f}:t=2"
        )

def apply_watermark_to_master(
    master_path: Path,
    output_path: Path,
    watermark_config: Optional[Dict[str, Any]],
    aspect_ratio: str = "9:16",
    resolution: str = "1080p",
    accent_hex: str = "ff0055"
) -> bool:
    """Applies watermark to an existing master video file without re-rendering scenes."""
    w, h = get_dimensions(aspect_ratio, resolution)
    vf = build_watermark_filter(w, h, watermark_config, accent_hex)
    
    cmd = [
        FFMPEG_BIN, "-y",
        "-i", str(master_path),
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-movflags", "+faststart",
        str(output_path)
    ]
    try:
        subprocess.run(cmd, cwd=str(master_path.parent), stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception as e:
        logger.error("Failed to apply watermark to master: %s", e)
        return False

def compose_final_video(
    scene_clips: List[Path],
    ass_subtitles_path: Path,
    theme: Theme,
    job_dir: Path,
    cta_text: str,
    aspect_ratio: str = "9:16",
    resolution: str = "1080p",
    watermark_config: Optional[Dict[str, Any]] = None,
    logo_path: Optional[Path] = None,
    output_filename: str = "final.mp4"
) -> Path:
    """
    Concatenates normalized scene clips + CTA end card, burns subtitles to create master.mp4,
    then applies watermark to generate delivery final.mp4. Preserves master for instant re-watermarking.
    """
    w, h = get_dimensions(aspect_ratio, resolution)
    master_output = job_dir / "master.mp4"
    final_output = job_dir / output_filename
    cta_clip = job_dir / "cta_endcard.mp4"
    
    render_cta_clip(cta_text, theme, cta_clip, duration=1.5, aspect_ratio=aspect_ratio, resolution=resolution)

    all_clips = list(scene_clips) + [cta_clip]

    # Concat demuxer file
    concat_list_file = job_dir / "concat_list.txt"
    with open(concat_list_file, "w", encoding="utf-8") as f:
        for clip in all_clips:
            f.write(f"file '{clip.name}'\n")

    concat_raw = job_dir / "concat_raw.mp4"
    
    # 1. Concat all normalized clips
    concat_cmd = [
        FFMPEG_BIN, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", "concat_list.txt",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        str(concat_raw.name)
    ]
    
    logger.info("Concatenating %d clips for ratio %s in %s...", len(all_clips), aspect_ratio, job_dir)
    subprocess.run(concat_cmd, cwd=str(job_dir), stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    # 2. Burn subtitles -> Create clean MASTER video (no watermark)
    sub_rel_name = ass_subtitles_path.name
    master_cmd = [
        FFMPEG_BIN, "-y",
        "-i", str(concat_raw.name),
        "-vf", f"ass={sub_rel_name}",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-movflags", "+faststart",
        str(master_output.name)
    ]
    logger.info("Rendering clean MASTER MP4 without watermark...")
    subprocess.run(master_cmd, cwd=str(job_dir), stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    # 3. Apply watermark onto master -> Create DELIVERY video (final.mp4)
    apply_watermark_to_master(
        master_path=master_output,
        output_path=final_output,
        watermark_config=watermark_config,
        aspect_ratio=aspect_ratio,
        resolution=resolution,
        accent_hex=theme.palette.accent
    )

    # 4. Generate thumbnail
    thumb_path = job_dir / "thumb.jpg"
    generate_thumbnail(final_output, thumb_path)

    return final_output
