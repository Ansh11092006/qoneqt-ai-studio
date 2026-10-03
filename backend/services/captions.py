import re
from pathlib import Path
from typing import List, Dict

def hex_to_ass_color(hex_str: str) -> str:
    """Converts a standard hex color like #00ff66 or #fb923c to ASS format &H00BBGGRR&."""
    hex_clean = hex_str.strip().lstrip("#")
    if len(hex_clean) == 3:
        hex_clean = "".join([c * 2 for c in hex_clean])
    if len(hex_clean) != 6:
        return "&H0000FF00&"  # default green
    r = hex_clean[0:2]
    g = hex_clean[2:4]
    b = hex_clean[4:6]
    return f"&H00{b}{g}{r}&"

def format_ass_timestamp(seconds: float) -> str:
    """Converts seconds into ASS timestamp format: H:MM:SS.cc"""
    if seconds < 0:
        seconds = 0
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centis = int(round((seconds - int(seconds)) * 100))
    if centis >= 100:
        centis = 99
    return f"{hrs}:{mins:02d}:{secs:02d}.{centis:02d}"

def generate_ass_subtitles(
    scene_timings: List[Dict],
    accent_hex: str,
    output_file: Path
) -> Path:
    """
    Generates a full .ass subtitle file for 1080x1920 vertical video.
    scene_timings: list of dicts with:
      - scene_start_time: float
      - scene_duration: float
      - word_boundaries: list of {"word": str, "start": float, "end": float} (relative to scene start)
      - fallback_text: str (if word_boundaries are empty)
    """
    ass_accent = hex_to_ass_color(accent_hex)
    ass_primary = "&H00FFFFFF&"      # Bright White
    ass_outline = "&H00050505&"      # Deep Dark Outline
    ass_shadow = "&H80000000&"       # Semi-transparent Shadow

    ass_header = f"""[Script Info]
Title: Qoneqt AI Studio Dynamic Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial Black,76,{ass_primary},&H000000FF&,{ass_outline},{ass_shadow},-1,0,0,0,100,100,1,0,1,6,3,2,60,60,420,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []

    for item in scene_timings:
        scene_start = item.get("scene_start_time", 0.0)
        scene_dur = item.get("scene_duration", 5.0)
        boundaries = item.get("word_boundaries", [])
        fallback_text = item.get("fallback_text", "")

        if not boundaries and fallback_text:
            words = fallback_text.strip().split()
            if words:
                step = scene_dur / len(words)
                boundaries = [
                    {"word": w, "start": i * step, "end": (i + 1) * step}
                    for i, w in enumerate(words)
                ]

        if not boundaries:
            continue

        # Chunk into 2 to 4 words at a time
        chunk_size = 3
        chunks = [boundaries[i:i + chunk_size] for i in range(0, len(boundaries), chunk_size)]

        for chunk in chunks:
            chunk_start = scene_start + chunk[0]["start"]
            chunk_end = scene_start + chunk[-1]["end"]
            
            # Add micro-padding
            chunk_end = max(chunk_end, chunk_start + 0.4)

            # Generate highlighted events per active word in this chunk
            for active_idx, active_word in enumerate(chunk):
                w_start = scene_start + active_word["start"]
                # Active word ends when next word begins or chunk ends
                if active_idx + 1 < len(chunk):
                    w_end = scene_start + chunk[active_idx + 1]["start"]
                else:
                    w_end = scene_start + active_word["end"]
                    
                w_end = max(w_end, w_start + 0.15)
                
                # Format text with current word highlighted in accent color
                chunk_parts = []
                for idx, w in enumerate(chunk):
                    clean_word = re.sub(r'[{}\\]', '', w["word"]).upper()
                    if idx == active_idx:
                        chunk_parts.append(f"{{\\c{ass_accent}\\fscx112\\fscy112}}{clean_word}{{\\c{ass_primary}\\fscx100\\fscy100}}")
                    else:
                        chunk_parts.append(clean_word)
                
                line_text = " ".join(chunk_parts)
                start_ts = format_ass_timestamp(w_start)
                end_ts = format_ass_timestamp(w_end)
                
                events.append(
                    f"Dialogue: 0,{start_ts},{end_ts},Default,,0,0,0,,{line_text}"
                )

    ass_content = ass_header + "\n".join(events) + "\n"
    
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(ass_content)

    return output_file
