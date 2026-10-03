import os
import sys
import json
import logging
import asyncio
import subprocess
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import edge_tts
from gtts import gTTS

from backend.config import FFPROBE_BIN

logger = logging.getLogger("tts")

# Ultra-realistic neural voice mappings
VOICE_MAP = {
    ("en", "M"): "en-US-ChristopherNeural",  # Deep, ultra-engaging male host
    ("en", "F"): "en-US-JennyNeural",        # Dynamic, highly natural female creator
    ("hi", "M"): "hi-IN-MadhurNeural",       # Expressive Hindi male narrator
    ("hi", "F"): "hi-IN-SwaraNeural",        # Conversational Hindi female host
}

def get_audio_duration_ffprobe(audio_path: Path) -> float:
    """Uses ffprobe to extract exact duration of an audio file in seconds."""
    cmd = [
        FFPROBE_BIN,
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(audio_path)
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return float(res.stdout.strip())
    except Exception as e:
        logger.warning("ffprobe failed on %s: %s. Estimating duration.", audio_path, e)
        # Fallback approximation: 150 words per minute ~ 2.5 words/sec
        return 4.0

async def generate_speech_edge_tts(
    text: str,
    output_path: Path,
    voice: str
) -> List[Dict]:
    """
    Generates speech using edge-tts and extracts word-level boundary events.
    Returns list of dicts: [{"word": str, "start": float, "end": float}]
    """
    communicate = edge_tts.Communicate(text, voice)
    word_boundaries = []
    audio_data = bytearray()

    async for chunk in communicate.stream():
        chunk_type = chunk.get("type")
        if chunk_type == "audio":
            audio_data.extend(chunk.get("data", b""))
        elif chunk_type == "WordBoundary":
            # offset and duration are in 100-nanosecond units (10,000,000 per second)
            offset_sec = chunk.get("offset", 0) / 10_000_000.0
            dur_sec = chunk.get("duration", 0) / 10_000_000.0
            word_text = chunk.get("text", "").strip()
            if word_text:
                word_boundaries.append({
                    "word": word_text,
                    "start": offset_sec,
                    "end": offset_sec + dur_sec
                })

    with open(output_path, "wb") as f:
        f.write(audio_data)

    return word_boundaries

def generate_speech_gtts(text: str, output_path: Path, lang: str = "en") -> List[Dict]:
    """Fallback TTS generator using gTTS with estimated even word distribution."""
    tts = gTTS(text=text, lang="hi" if lang == "hi" else "en")
    tts.save(str(output_path))
    
    duration = get_audio_duration_ffprobe(output_path)
    words = text.strip().split()
    boundaries = []
    if words:
        step = duration / len(words)
        for i, w in enumerate(words):
            boundaries.append({
                "word": w,
                "start": i * step,
                "end": (i + 1) * step
            })
    return boundaries

async def synthesize_scene_audio(
    scene_id: int,
    narration: str,
    output_dir: Path,
    language: str = "en",
    voice_gender: str = "M"
) -> Tuple[Path, float, List[Dict]]:
    """
    Generates scene audio file and word timings.
    Returns: (audio_path, final_scene_duration, word_boundaries)
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    audio_file = output_dir / f"scene_{scene_id}.mp3"
    voice = VOICE_MAP.get((language, voice_gender), "en-US-GuyNeural")
    
    word_boundaries = []
    try:
        word_boundaries = await generate_speech_edge_tts(narration, audio_file, voice)
    except Exception as e:
        logger.warning("edge-tts failed for scene %d (%s). Falling back to gTTS.", scene_id, e)
        word_boundaries = await asyncio.to_thread(generate_speech_gtts, narration, audio_file, language)

    # Calculate real duration + 0.3s padding
    raw_duration = get_audio_duration_ffprobe(audio_file)
    final_duration = max(3.0, raw_duration + 0.3)

    return audio_file, final_duration, word_boundaries
