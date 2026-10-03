import os
import json
import logging
import subprocess
import httpx
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import Request, Response, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from backend.config import FFMPEG_BIN, FFPROBE_BIN

logger = logging.getLogger("media_utils")

def get_orientation_for_aspect_ratio(aspect_ratio: str) -> str:
    if aspect_ratio in ("9:16", "4:5", "2:3"):
        return "vertical"
    elif aspect_ratio in ("16:9", "21:9", "16:10", "1.91:1"):
        return "horizontal"
    return "horizontal"

def probe_media_info(file_path: Path) -> Dict[str, Any]:
    """
    Uses FFprobe to accurately inspect media metadata:
    - video stream existence and duration
    - audio stream existence and codec
    """
    if not file_path.exists() or file_path.stat().st_size < 100:
        return {"exists": False, "has_audio": False, "has_video": False, "duration": 0.0}

    cmd = [
        FFPROBE_BIN,
        "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        "-show_format",
        str(file_path)
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(res.stdout) if res.stdout else {}
        format_info = data.get("format", {})
        streams = data.get("streams", [])

        has_audio = any(s.get("codec_type") == "audio" for s in streams)
        has_video = any(s.get("codec_type") == "video" for s in streams)
        duration = float(format_info.get("duration", 0.0))

        audio_codec = None
        for s in streams:
            if s.get("codec_type") == "audio":
                audio_codec = s.get("codec_name")
                break

        return {
            "exists": True,
            "has_audio": has_audio,
            "has_video": has_video,
            "audio_codec": audio_codec,
            "duration": duration,
            "size": file_path.stat().st_size
        }
    except Exception as e:
        logger.warning("FFprobe inspection failed for %s: %s", file_path, e)
        return {"exists": True, "has_audio": False, "has_video": True, "duration": 0.0}

def stream_file_with_range(file_path: Path, request: Request, media_type: str = "video/mp4") -> Response:
    """
    Streams local video files with full RFC 7233 HTTP Range requests support.
    Enables seeking, scrub bar navigation, and full duration playback in all HTML5 browsers.
    """
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")

    file_size = file_path.stat().st_size
    range_header = request.headers.get("range")

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Type": media_type,
    }

    if request.method == "HEAD":
        headers["Content-Length"] = str(file_size)
        return Response(status_code=200, headers=headers)

    if not range_header or "=" not in range_header:
        headers["Content-Length"] = str(file_size)
        return FileResponse(file_path, media_type=media_type, headers=headers)

    try:
        unit, range_val = range_header.split("=", 1)
        if unit.strip().lower() != "bytes":
            headers["Content-Length"] = str(file_size)
            return FileResponse(file_path, media_type=media_type, headers=headers)

        start_str, end_str = range_val.split("-", 1)
        start = int(start_str.strip()) if start_str.strip() else 0
        end = int(end_str.strip()) if end_str.strip() else file_size - 1

        if start >= file_size or start < 0 or end >= file_size or start > end:
            headers["Content-Range"] = f"bytes */{file_size}"
            return Response(status_code=416, headers=headers)

        content_length = end - start + 1
        headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
        headers["Content-Length"] = str(content_length)

        def iter_file():
            with open(file_path, "rb") as f:
                f.seek(start)
                bytes_left = content_length
                chunk_size = 64 * 1024
                while bytes_left > 0:
                    read_amount = min(chunk_size, bytes_left)
                    data = f.read(read_amount)
                    if not data:
                        break
                    bytes_left -= len(data)
                    yield data

        return StreamingResponse(iter_file(), status_code=206, headers=headers, media_type=media_type)
    except Exception as e:
        logger.warning("Range parsing exception: %s, fallback to file response", e)
        headers["Content-Length"] = str(file_size)
        return FileResponse(file_path, media_type=media_type, headers=headers)

_IN_FLIGHT_DOWNLOADS = set()

async def atomic_cache_download(remote_url: str, output_path: Path) -> bool:
    """
    Downloads full source media atomically to a unique .tmp file and renames only on 100% completion.
    Validates stream structure with FFprobe before finalizing.
    Prevents truncated or corrupted files from being saved into the media cache.
    """
    if output_path.exists() and output_path.stat().st_size > 1000:
        return True

    file_key = output_path.name
    if file_key in _IN_FLIGHT_DOWNLOADS:
        return True
    _IN_FLIGHT_DOWNLOADS.add(file_key)

    import uuid
    tmp_path = output_path.with_name(f"{output_path.stem}.{uuid.uuid4().hex[:8]}.tmp")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    try:
        expected_content_length = None
        output_path.parent.mkdir(parents=True, exist_ok=True)
        async with httpx.AsyncClient(timeout=90.0, headers=headers) as client:
            async with client.stream("GET", remote_url, follow_redirects=True) as resp:
                if resp.status_code != 200:
                    logger.warning("[MEDIA] Remote media download failed with status %d", resp.status_code)
                    return False
                expected_content_length = resp.headers.get("content-length")
                with open(tmp_path, "wb") as f:
                    async for chunk in resp.aiter_bytes(chunk_size=128 * 1024):
                        f.write(chunk)

        if tmp_path.exists() and tmp_path.stat().st_size > 1000:
            # Check if all expected bytes were downloaded
            if expected_content_length and expected_content_length.isdigit():
                exp_len = int(expected_content_length)
                if tmp_path.stat().st_size < exp_len:
                    logger.warning("[MEDIA] Download incomplete (%d / %d bytes), discarding: %s", tmp_path.stat().st_size, exp_len, tmp_path.name)
                    tmp_path.unlink()
                    return False

            # Verify stream integrity with ffprobe
            probe = probe_media_info(tmp_path)
            if not probe.get("has_video"):
                logger.warning("[MEDIA] Downloaded media file failed video probe, discarding: %s", tmp_path.name)
                tmp_path.unlink()
                return False

            # Run deep integrity check with ffmpeg to guarantee no partial stream
            check_cmd = [FFMPEG_BIN, "-v", "error", "-i", str(tmp_path), "-f", "null", "-"]
            check_res = subprocess.run(check_cmd, capture_output=True, text=True)
            if check_res.returncode != 0 or "partial file" in check_res.stderr or "Invalid data" in check_res.stderr:
                logger.warning("[MEDIA] Downloaded media file failed ffmpeg stream check, discarding: %s", check_res.stderr.strip()[:120])
                tmp_path.unlink()
                return False

            if output_path.exists():
                output_path.unlink()
            tmp_path.rename(output_path)
            logger.info(
                "[MEDIA] Successfully cached full verified source video (%d bytes, duration: %.2fs, has_audio: %s): %s",
                output_path.stat().st_size,
                probe.get("duration", 0),
                probe.get("has_audio", False),
                output_path.name
            )
            return True
        else:
            if tmp_path.exists():
                tmp_path.unlink()
            return False
    except Exception as e:
        logger.error("[MEDIA] Atomic cache download failed for %s: %s", remote_url, e)
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except Exception:
                pass
        return False
    finally:
        _IN_FLIGHT_DOWNLOADS.discard(file_key)

def render_ken_burns_video(
    photo_path: Path,
    duration: float,
    output_path: Path,
    aspect_ratio: str = "9:16"
) -> bool:
    """Applies a smooth cinematic Ken Burns pan/zoom to transform a photo into video."""
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

    vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},"
        f"zoompan=z='min(zoom+0.0015,1.25)':d={total_frames}"
        f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps={fps},"
        f"format=yuv420p"
    )
    cmd = [
        FFMPEG_BIN, "-y",
        "-loop", "1",
        "-i", str(photo_path),
        "-vf", vf,
        "-t", f"{duration:.2f}",
        "-r", "30",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        str(output_path)
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except Exception as e:
        logger.error("[VIDEO] Ken Burns render failed: %s", e)
        return False
