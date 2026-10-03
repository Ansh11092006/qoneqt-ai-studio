import uuid
import shutil
from pathlib import Path
from typing import Optional, Dict
from fastapi import UploadFile, HTTPException

from backend.config import UPLOADS_DIR

MAX_SCRIPT_SIZE = 1 * 1024 * 1024       # 1MB
MAX_MEDIA_SIZE = 50 * 1024 * 1024       # 50MB
MAX_LOGO_SIZE = 5 * 1024 * 1024         # 5MB

ALLOWED_SCRIPT_EXTS = {".txt", ".md"}
ALLOWED_MEDIA_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm", ".mov"}
ALLOWED_LOGO_EXTS = {".png", ".jpg", ".jpeg", ".webp"}

async def handle_uploaded_file(file: UploadFile) -> Dict:
    """
    Validates and stores an uploaded file.
    Returns: {asset_id, kind: 'script'|'media'|'logo', url, text?}
    """
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()
    
    # Read file content into memory to check size
    content = await file.read()
    file_size = len(content)

    # Determine kind
    if ext in ALLOWED_SCRIPT_EXTS:
        kind = "script"
        if file_size > MAX_SCRIPT_SIZE:
            raise HTTPException(status_code=400, detail="Script file exceeds maximum limit of 1MB")
        try:
            text_content = content.decode("utf-8")
        except UnicodeDecodeError:
            text_content = content.decode("latin-1", errors="ignore")
    elif "logo" in filename.lower() or (ext in ALLOWED_LOGO_EXTS and file_size <= MAX_LOGO_SIZE):
        kind = "logo"
        text_content = None
    elif ext in ALLOWED_MEDIA_EXTS:
        kind = "media"
        if file_size > MAX_MEDIA_SIZE:
            raise HTTPException(status_code=400, detail="Media file exceeds maximum limit of 50MB")
        text_content = None
    else:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format '{ext}'. Allowed: .txt, .md, images (.jpg, .png, .webp), and videos (.mp4, .webm)"
        )

    asset_id = f"asset_{uuid.uuid4().hex[:10]}"
    saved_filename = f"{asset_id}{ext}"
    saved_path = UPLOADS_DIR / saved_filename
    
    with open(saved_path, "wb") as f:
        f.write(content)

    result = {
        "asset_id": asset_id,
        "filename": filename,
        "kind": kind,
        "url": f"/api/uploads/{saved_filename}",
        "file_path": str(saved_path),
        "size_bytes": file_size
    }
    if text_content is not None:
        result["text"] = text_content

    return result
