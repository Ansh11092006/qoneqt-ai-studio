"""
Optimized upload service — upload returns instantly, AI analysis runs in background.

POST /api/uploads          → saves file → returns immediately with status "uploaded"
POST /api/assets/{id}/analyze → triggers background AI analysis
GET  /api/assets/{id}/status  → polls analysis status
"""
import uuid
import json
import logging
import asyncio
from pathlib import Path
from typing import Optional, Dict
from fastapi import UploadFile, HTTPException

from backend.config import UPLOADS_DIR, DATA_DIR

logger = logging.getLogger("uploads")

ASSET_META_DIR = DATA_DIR / "asset_metadata"
ASSET_META_DIR.mkdir(parents=True, exist_ok=True)

MAX_SCRIPT_SIZE = 15 * 1024 * 1024
MAX_MEDIA_SIZE  = 50 * 1024 * 1024
MAX_AUDIO_SIZE  = 25 * 1024 * 1024
MAX_LOGO_SIZE   =  5 * 1024 * 1024

ALLOWED_DOC_EXTS   = {".pdf", ".docx", ".txt", ".md"}
ALLOWED_MEDIA_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm", ".mov"}
ALLOWED_AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".aac"}
ALLOWED_LOGO_EXTS  = {".png", ".jpg", ".jpeg", ".webp", ".svg"}


# ─────────────────────────────────────────────────────────
# Metadata helpers
# ─────────────────────────────────────────────────────────
def _meta_path(asset_id: str) -> Path:
    return ASSET_META_DIR / f"{asset_id}.json"

def _read_meta(asset_id: str) -> Optional[Dict]:
    p = _meta_path(asset_id)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return None

def _write_meta(asset_id: str, data: Dict) -> None:
    _meta_path(asset_id).write_text(json.dumps(data, indent=2), encoding="utf-8")


# ─────────────────────────────────────────────────────────
# FAST PATH: save file, return immediately (NO AI call)
# ─────────────────────────────────────────────────────────
async def handle_uploaded_file(file: UploadFile) -> Dict:
    """
    Saves the uploaded file and returns immediately without waiting for AI analysis.
    Analysis is triggered asynchronously via /api/assets/{id}/analyze.
    """
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()

    content = await file.read()
    file_size = len(content)

    kind_hint = (file.headers.get("x-asset-kind", "") or "").lower()

    if "logo" in filename.lower() or kind_hint == "logo":
        kind = "logo"
    elif ext in ALLOWED_DOC_EXTS:
        kind = "script"
        if file_size > MAX_SCRIPT_SIZE:
            raise HTTPException(400, "Document exceeds 15 MB limit")
    elif ext in ALLOWED_AUDIO_EXTS:
        kind = "audio"
        if file_size > MAX_AUDIO_SIZE:
            raise HTTPException(400, "Audio file exceeds 25 MB limit")
    elif ext in ALLOWED_MEDIA_EXTS:
        kind = "media"
        if file_size > MAX_MEDIA_SIZE:
            raise HTTPException(400, "Media file exceeds 50 MB limit")
    else:
        raise HTTPException(
            400,
            f"Unsupported format '{ext}'. Supported: images (.jpg/.png/.webp), "
            "videos (.mp4/.mov/.webm), documents (.pdf/.docx/.txt), audio (.mp3/.wav/.m4a)"
        )

    asset_id = f"asset_{uuid.uuid4().hex[:10]}"
    saved_filename = f"{asset_id}{ext}"
    saved_path = UPLOADS_DIR / saved_filename

    with open(saved_path, "wb") as f:
        f.write(content)

    # Lightweight fast-path metadata (no Gemini)
    meta: Dict = {
        "asset_id": asset_id,
        "filename": filename,
        "saved_filename": saved_filename,
        "kind": kind,
        "type": kind,
        "size_bytes": file_size,
        "analysisStatus": "pending",
        "analysis": {},
    }

    # Quick image size (PIL from in-memory bytes — very fast)
    if ext in (".jpg", ".jpeg", ".png", ".webp") and kind in ("media", "logo"):
        try:
            from PIL import Image
            from io import BytesIO
            img = Image.open(BytesIO(content))
            meta["analysis"]["width"]  = img.width
            meta["analysis"]["height"] = img.height
        except Exception:
            pass

    # Plain-text documents: extract synchronously (fast for .txt/.md)
    if kind == "script" and ext in (".txt", ".md"):
        try:
            meta["text"] = content.decode("utf-8", errors="ignore").strip()[:4000]
        except Exception:
            pass

    _write_meta(asset_id, meta)

    result: Dict = {
        "asset_id": asset_id,
        "filename": filename,
        "kind": kind,
        "type": kind,
        "url": f"/api/uploads/{saved_filename}",
        "file_path": str(saved_path),
        "size_bytes": file_size,
        "status": "uploaded",
        "analysisStatus": "pending",
    }
    if "text" in meta:
        result["text"] = meta["text"]

    return result


# ─────────────────────────────────────────────────────────
# BACKGROUND ANALYSIS TASK
# ─────────────────────────────────────────────────────────
async def run_asset_analysis(asset_id: str) -> None:
    """
    Runs full AI/multimodal analysis on an already-saved asset.
    Updates {asset_id}.json with analysisStatus and results.
    Intended to be called as a FastAPI BackgroundTask.
    """
    meta = _read_meta(asset_id)
    if not meta:
        logger.warning("analyze: no metadata for %s", asset_id)
        return

    if meta.get("analysisStatus") == "complete":
        logger.info("analyze: %s already complete — skipping", asset_id)
        return

    meta["analysisStatus"] = "analyzing"
    _write_meta(asset_id, meta)

    saved_path = UPLOADS_DIR / meta["saved_filename"]
    if not saved_path.exists():
        meta["analysisStatus"] = "failed"
        meta["analysisError"] = "File not found on disk"
        _write_meta(asset_id, meta)
        return

    kind = meta.get("kind", "media")
    ext  = Path(meta["saved_filename"]).suffix.lower()

    try:
        from backend.services.asset_intelligence import (
            analyze_and_register_asset,
            extract_document_content,
        )

        manifest = await analyze_and_register_asset(
            file_path=saved_path,
            filename=meta["filename"],
            asset_id=asset_id,
            kind=kind,
        )

        meta["analysisStatus"] = "complete"
        meta["analysis"] = manifest.get("analysis", meta.get("analysis", {}))

        # Heavy document extraction (PDF/DOCX) only in background
        if kind == "script" and ext in (".pdf", ".docx"):
            doc_text = await asyncio.to_thread(extract_document_content, saved_path)
            if doc_text:
                meta["text"] = doc_text[:8000]

        _write_meta(asset_id, meta)
        logger.info("analyze: %s complete", asset_id)

    except Exception as exc:
        logger.error("analyze: %s failed — %s", asset_id, exc)
        meta["analysisStatus"] = "failed"
        meta["analysisError"] = str(exc)
        _write_meta(asset_id, meta)


# ─────────────────────────────────────────────────────────
# STATUS QUERY (used by GET /api/assets/{id}/status)
# ─────────────────────────────────────────────────────────
def get_asset_status(asset_id: str) -> Optional[Dict]:
    """Returns current metadata/analysis status for an asset."""
    return _read_meta(asset_id)
