import os
import shutil
from pathlib import Path
from dotenv import load_dotenv

# Find root .env or backend .env
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

def reload_env():
    load_dotenv(ROOT_DIR / ".env", override=True)

def get_gemini_key() -> str:
    reload_env()
    return os.getenv("GEMINI_API_KEY", "").strip()

def get_pexels_key() -> str:
    reload_env()
    return os.getenv("PEXELS_API_KEY", "").strip()

def get_video_provider() -> str:
    reload_env()
    return os.getenv("VIDEO_PROVIDER", "replicate").strip().lower()

def get_video_api_key() -> str:
    reload_env()
    # Check multiple candidate env names
    return (
        os.getenv("VIDEO_API_KEY", "") or
        os.getenv("REPLICATE_API_TOKEN", "") or
        os.getenv("RUNWAY_API_KEY", "") or
        os.getenv("LUMA_API_KEY", "") or
        os.getenv("PIKA_API_KEY", "") or
        os.getenv("KLING_API_KEY", "")
    ).strip()

def get_replicate_token() -> str:
    reload_env()
    return (os.getenv("REPLICATE_API_TOKEN", "") or os.getenv("VIDEO_API_KEY", "")).strip()

def get_video_model() -> str:
    reload_env()
    return os.getenv("VIDEO_MODEL", "minimax/video-01").strip()

def get_watermark_defaults() -> dict:
    reload_env()
    return {
        "enabled": os.getenv("WATERMARK_ENABLED", "true").strip().lower() in ("true", "1", "yes"),
        "text": os.getenv("WATERMARK_TEXT", "Qoneqt.ai").strip(),
        "position": os.getenv("WATERMARK_POSITION", "bottom-right").strip().lower(),
        "opacity": float(os.getenv("WATERMARK_OPACITY", "0.6")),
        "size": os.getenv("WATERMARK_SIZE", "medium").strip().lower()
    }

GEMINI_API_KEY = get_gemini_key()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
PEXELS_API_KEY = get_pexels_key()
DEMO_MODE = os.getenv("DEMO_MODE", "false").strip().lower() in ("true", "1", "yes")

PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")

# Storage Directories
DATA_DIR = ROOT_DIR / "data"
JOBS_DIR = DATA_DIR / "jobs"
UPLOADS_DIR = DATA_DIR / "uploads"
DEMO_ASSETS_DIR = ROOT_DIR / "demo_assets"

DATA_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
DEMO_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

# Locate FFmpeg and FFprobe binaries
def find_binary(name: str) -> str:
    # 1. Environment override
    env_var = f"{name.upper()}_PATH"
    if os.getenv(env_var):
        p = Path(os.getenv(env_var))
        if p.exists():
            return str(p)
            
    # 2. System PATH
    found = shutil.which(name)
    if found:
        return found
        
    # 3. Check node_modules installer
    candidate_dirs = [
        ROOT_DIR / "node_modules" / f"@{name}-installer" / "win32-x64" / f"{name}.exe",
        ROOT_DIR / "node_modules" / f"@{name}-installer" / "darwin-x64" / name,
        ROOT_DIR / "node_modules" / f"@{name}-installer" / "linux-x64" / name,
    ]
    for c in candidate_dirs:
        if c.exists():
            return str(c)
            
    return name

FFMPEG_BIN = find_binary("ffmpeg")
FFPROBE_BIN = find_binary("ffprobe")
