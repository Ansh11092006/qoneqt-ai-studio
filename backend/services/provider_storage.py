import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field

from backend.config import DATA_DIR
from backend.services.crypto_utils import encrypt_secret, decrypt_secret, mask_key

logger = logging.getLogger("provider_storage")

PROVIDERS_FILE = DATA_DIR / "user_providers.json"

# Supported provider definitions with metadata & capabilities
SUPPORTED_PROVIDERS: Dict[str, Dict[str, Any]] = {
    "gemini": {
        "id": "gemini",
        "name": "Google Gemini",
        "description": "High-speed reasoning, 2M+ context, and multimodal cinematic generation",
        "capabilities": ["text", "director"],
        "default_models": [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-1.5-flash",
            "gemini-1.5-pro"
        ],
        "default_model": "gemini-2.5-flash",
        "default_base_url": "https://generativelanguage.googleapis.com",
        "requires_base_url": False,
        "docs_url": "https://aistudio.google.com/app/apikey",
        "key_placeholder": "AIzaSy..."
    },
    "openai": {
        "id": "openai",
        "name": "OpenAI",
        "description": "GPT-4o, reasoning models & high-precision screenplay writing",
        "capabilities": ["text", "director"],
        "default_models": [
            "gpt-4o",
            "gpt-4o-mini",
            "o3-mini",
            "gpt-4-turbo"
        ],
        "default_model": "gpt-4o",
        "default_base_url": "https://api.openai.com/v1",
        "requires_base_url": False,
        "docs_url": "https://platform.openai.com/api-keys",
        "key_placeholder": "sk-proj-..."
    },
    "openrouter": {
        "id": "openrouter",
        "name": "OpenRouter",
        "description": "Universal routing to 200+ models: Claude, DeepSeek, Llama, Gemini",
        "capabilities": ["text", "director"],
        "default_models": [
            "anthropic/claude-3.7-sonnet",
            "deepseek/deepseek-r1",
            "meta-llama/llama-3.3-70b-instruct",
            "google/gemini-2.5-flash"
        ],
        "default_model": "anthropic/claude-3.7-sonnet",
        "default_base_url": "https://openrouter.ai/api/v1",
        "requires_base_url": False,
        "docs_url": "https://openrouter.ai/keys",
        "key_placeholder": "sk-or-v1-..."
    },
    "anthropic": {
        "id": "anthropic",
        "name": "Anthropic",
        "description": "Claude 3.7 Sonnet & Haiku for elite creative direction & nuanced dialogue",
        "capabilities": ["text", "director"],
        "default_models": [
            "claude-3-7-sonnet-20250219",
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022"
        ],
        "default_model": "claude-3-7-sonnet-20250219",
        "default_base_url": "https://api.anthropic.com/v1",
        "requires_base_url": False,
        "docs_url": "https://console.anthropic.com/settings/keys",
        "key_placeholder": "sk-ant-api03-..."
    },
    "groq": {
        "id": "groq",
        "name": "Groq LPU",
        "description": "Ultra-low latency LPU inference (500+ tokens/sec) for instant storyboards",
        "capabilities": ["text", "director"],
        "default_models": [
            "llama-3.3-70b-versatile",
            "deepseek-r1-distill-llama-70b",
            "mixtral-8x7b-32768"
        ],
        "default_model": "llama-3.3-70b-versatile",
        "default_base_url": "https://api.groq.com/openai/v1",
        "requires_base_url": False,
        "docs_url": "https://console.groq.com/keys",
        "key_placeholder": "gsk_..."
    },
    "fal": {
        "id": "fal",
        "name": "fal.ai",
        "description": "Generative video & image engine (Kling Video, Minimax, Luma, Flux)",
        "capabilities": ["video", "image"],
        "default_models": [
            "fal-ai/kling-video/v1/standard/text-to-video",
            "fal-ai/minimax/video-01",
            "fal-ai/luma-dream-machine",
            "fal-ai/flux/dev"
        ],
        "default_model": "fal-ai/kling-video/v1/standard/text-to-video",
        "default_base_url": "https://queue.fal.run",
        "requires_base_url": False,
        "docs_url": "https://fal.ai/dashboard/keys",
        "key_placeholder": "key-..."
    },
    "custom": {
        "id": "custom",
        "name": "Custom Provider",
        "description": "Any OpenAI-compatible or local inference server (Ollama, vLLM, LMStudio)",
        "capabilities": ["text", "director"],
        "default_models": ["custom-model"],
        "default_model": "custom-model",
        "default_base_url": "http://localhost:11434/v1",
        "requires_base_url": True,
        "docs_url": "",
        "key_placeholder": "sk-custom-..."
    }
}

class UserProviderRecord(BaseModel):
    provider_id: str
    name: str
    encrypted_api_key: str
    masked_key: str
    base_url: str = ""
    selected_model: str = ""
    available_models: List[str] = Field(default_factory=list)
    capabilities: List[str] = Field(default_factory=list)
    status: str = "configured"  # "configured", "verified", "failed"
    last_tested: Optional[float] = None
    last_error: Optional[str] = None
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)

class UserProviderSettings(BaseModel):
    user_id: str = "default_user"
    active_mode: str = "qoneqt"  # "qoneqt" | "user"
    active_provider_id: Optional[str] = None
    active_model: Optional[str] = None
    allow_fallback: bool = False
    providers: Dict[str, UserProviderRecord] = Field(default_factory=dict)

def _load_all_records() -> Dict[str, Any]:
    if not PROVIDERS_FILE.exists():
        return {}
    try:
        with open(PROVIDERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error("Failed to read user_providers.json: %s", e)
        return {}

def _save_all_records(data: Dict[str, Any]):
    try:
        PROVIDERS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(PROVIDERS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error("Failed to write user_providers.json: %s", e)

def get_user_settings(user_id: str = "default_user") -> UserProviderSettings:
    """Loads internal settings including encrypted keys for backend use."""
    all_data = _load_all_records()
    u_data = all_data.get(user_id)
    if not u_data:
        return UserProviderSettings(user_id=user_id)
    try:
        return UserProviderSettings(**u_data)
    except Exception as e:
        logger.error("Failed parsing user provider settings for %s: %s", user_id, e)
        return UserProviderSettings(user_id=user_id)

def get_safe_user_settings(user_id: str = "default_user") -> Dict[str, Any]:
    """Returns safe user settings with masked keys and NO ciphertext or secret exposed."""
    settings = get_user_settings(user_id)
    safe_providers = {}
    for pid, p in settings.providers.items():
        spec = SUPPORTED_PROVIDERS.get(pid, {})
        safe_providers[pid] = {
            "provider_id": p.provider_id,
            "name": p.name,
            "masked_key": p.masked_key,
            "has_key": bool(p.encrypted_api_key),
            "base_url": p.base_url,
            "selected_model": p.selected_model or spec.get("default_model", ""),
            "available_models": p.available_models or spec.get("default_models", []),
            "capabilities": p.capabilities or spec.get("capabilities", ["text"]),
            "status": p.status,
            "last_tested": p.last_tested,
            "last_error": p.last_error,
            "updated_at": p.updated_at
        }
    return {
        "user_id": settings.user_id,
        "active_mode": settings.active_mode,
        "active_provider_id": settings.active_provider_id,
        "active_model": settings.active_model,
        "allow_fallback": settings.allow_fallback,
        "providers": safe_providers,
        "catalog": SUPPORTED_PROVIDERS
    }

def save_provider_config(
    user_id: str,
    provider_id: str,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    base_url: Optional[str] = None,
    available_models: Optional[List[str]] = None,
    status: str = "configured",
    last_error: Optional[str] = None
) -> Dict[str, Any]:
    """Saves or updates provider configuration with encrypted credential storage."""
    all_data = _load_all_records()
    u_data = all_data.get(user_id, {
        "user_id": user_id,
        "active_mode": "qoneqt",
        "active_provider_id": None,
        "active_model": None,
        "allow_fallback": False,
        "providers": {}
    })
    
    spec = SUPPORTED_PROVIDERS.get(provider_id, {
        "name": provider_id.title(),
        "capabilities": ["text"],
        "default_model": "",
        "default_models": []
    })

    current_p = u_data.get("providers", {}).get(provider_id, {})
    
    if api_key and api_key.strip():
        enc_key = encrypt_secret(api_key.strip())
        masked = mask_key(api_key.strip())
    else:
        enc_key = current_p.get("encrypted_api_key", "")
        masked = current_p.get("masked_key", "")

    selected_model = model or current_p.get("selected_model") or spec.get("default_model", "")
    models_list = available_models or current_p.get("available_models") or spec.get("default_models", [])
    if selected_model and selected_model not in models_list:
        models_list = [selected_model] + [m for m in models_list if m != selected_model]

    now = time.time()
    record = {
        "provider_id": provider_id,
        "name": spec.get("name", provider_id.title()),
        "encrypted_api_key": enc_key,
        "masked_key": masked,
        "base_url": base_url if base_url is not None else current_p.get("base_url", spec.get("default_base_url", "")),
        "selected_model": selected_model,
        "available_models": models_list,
        "capabilities": spec.get("capabilities", ["text"]),
        "status": status,
        "last_tested": now if status == "verified" else current_p.get("last_tested"),
        "last_error": last_error,
        "created_at": current_p.get("created_at", now),
        "updated_at": now
    }

    if "providers" not in u_data:
        u_data["providers"] = {}
    u_data["providers"][provider_id] = record

    # If this is the first user provider configured, and user is in BYOK mode without active provider
    if u_data.get("active_mode") == "user" and not u_data.get("active_provider_id"):
        u_data["active_provider_id"] = provider_id
        u_data["active_model"] = selected_model

    all_data[user_id] = u_data
    _save_all_records(all_data)
    return get_safe_user_settings(user_id)

def delete_provider_config(user_id: str, provider_id: str) -> Dict[str, Any]:
    """Removes a provider configuration and resets active pointer if deleted."""
    all_data = _load_all_records()
    u_data = all_data.get(user_id)
    if u_data and "providers" in u_data and provider_id in u_data["providers"]:
        del u_data["providers"][provider_id]
        if u_data.get("active_provider_id") == provider_id:
            # Switch back to qoneqt or another configured provider
            remaining = list(u_data["providers"].keys())
            if remaining:
                u_data["active_provider_id"] = remaining[0]
                u_data["active_model"] = u_data["providers"][remaining[0]].get("selected_model", "")
            else:
                u_data["active_mode"] = "qoneqt"
                u_data["active_provider_id"] = None
                u_data["active_model"] = None
        all_data[user_id] = u_data
        _save_all_records(all_data)
    return get_safe_user_settings(user_id)

def update_active_settings(
    user_id: str,
    active_mode: Optional[str] = None,
    active_provider_id: Optional[str] = None,
    active_model: Optional[str] = None,
    allow_fallback: Optional[bool] = None
) -> Dict[str, Any]:
    """Updates the user's active provider selection and fallback preference."""
    all_data = _load_all_records()
    u_data = all_data.get(user_id, {
        "user_id": user_id,
        "active_mode": "qoneqt",
        "active_provider_id": None,
        "active_model": None,
        "allow_fallback": False,
        "providers": {}
    })

    if active_mode in ("qoneqt", "user"):
        u_data["active_mode"] = active_mode
    if active_provider_id is not None:
        u_data["active_provider_id"] = active_provider_id
    if active_model is not None:
        u_data["active_model"] = active_model
    if allow_fallback is not None:
        u_data["allow_fallback"] = bool(allow_fallback)

    all_data[user_id] = u_data
    _save_all_records(all_data)
    return get_safe_user_settings(user_id)

def get_decrypted_key(user_id: str, provider_id: str) -> Optional[str]:
    """Returns decrypted API key for backend execution only. Never send to frontend."""
    settings = get_user_settings(user_id)
    rec = settings.providers.get(provider_id)
    if not rec or not rec.encrypted_api_key:
        return None
    return decrypt_secret(rec.encrypted_api_key)
