import os
import json
import logging
import asyncio
import httpx
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from backend.config import get_gemini_key
from backend.services.provider_storage import (
    SUPPORTED_PROVIDERS, get_user_settings, get_decrypted_key
)

logger = logging.getLogger("ai_service")

# ═════════════════════════════════════════════════════════════════
# 1. CENTRAL QONEQT FREE MODEL REGISTRY (Section 3 of requirements)
# ═════════════════════════════════════════════════════════════════
QONEQT_FREE_MODELS: Dict[str, List[Dict[str, Any]]] = {
    "text": [
        {
            "id": "qoneqt-fast",
            "name": "Qoneqt Fast",
            "type": "text",
            "provider": "qoneqt",
            "free": True,
            "description": "Sub-second neural director & fast storyboard architect",
            "badge": "Sub-Second",
            "recommended_for": "Quick scripts, social hooks, fast iteration"
        },
        {
            "id": "qoneqt-pro",
            "name": "Qoneqt Pro",
            "type": "text",
            "provider": "qoneqt",
            "free": True,
            "description": "Deep cinematic screenplay & multi-scene narrative director",
            "badge": "Cinematic Pro",
            "recommended_for": "High-production storyboards, documentary, viral pacing"
        }
    ],
    "image": [
        {
            "id": "qoneqt-image",
            "name": "Qoneqt Image",
            "type": "image",
            "provider": "qoneqt",
            "free": True,
            "description": "High-resolution cinematic visual synthesis & color grading",
            "badge": "8K Master",
            "recommended_for": "Thumbnails, visual boards, concept art"
        }
    ],
    "video": [
        {
            "id": "qoneqt-video",
            "name": "Qoneqt Video",
            "type": "video",
            "provider": "qoneqt",
            "free": True,
            "description": "Native multi-scene 9:16 / 16:9 / 1:1 HD cinematic video engine",
            "badge": "Studio HD",
            "recommended_for": "TikTok, YouTube Shorts, Reels, Commercial Ads"
        }
    ]
}

class GenerationConfig(BaseModel):
    provider: str = "qoneqt"             # "qoneqt" | "user"
    provider_id: Optional[str] = None    # "gemini", "openai", "openrouter", "anthropic", "groq", "fal", "custom"
    model: Optional[str] = None
    allow_fallback: bool = False

# ═════════════════════════════════════════════════════════════════
# 2. TEST CONNECTION FOR SUPPORTED PROVIDERS
# ═════════════════════════════════════════════════════════════════
async def test_provider_connection(
    provider_id: str,
    api_key: str,
    base_url: str = ""
) -> Dict[str, Any]:
    """
    Validates API credentials with the respective provider without logging secret keys.
    Returns success status, discovered models if available, or a clean error message.
    """
    clean_key = (api_key or "").strip()
    if not clean_key and provider_id != "custom":
        return {"success": False, "error": "API key cannot be empty"}

    clean_base = (base_url or "").strip().rstrip("/")

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            # 1. Google Gemini
            if provider_id == "gemini":
                url = f"https://generativelanguage.googleapis.com/v1beta/models?key={clean_key}"
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    models = [
                        m["name"].replace("models/", "")
                        for m in data.get("models", [])
                        if "generateContent" in m.get("supportedGenerationMethods", [])
                    ]
                    # Filter for top gemini models
                    filtered = [m for m in models if "gemini" in m.lower()]
                    return {
                        "success": True,
                        "message": "Connected to Google Gemini successfully",
                        "models": filtered[:15] if filtered else SUPPORTED_PROVIDERS["gemini"]["default_models"]
                    }
                else:
                    err_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                    return {"success": False, "error": f"Gemini error: {err_msg}"}

            # 2. OpenAI
            elif provider_id == "openai":
                url = "https://api.openai.com/v1/models"
                headers = {"Authorization": f"Bearer {clean_key}"}
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    all_m = [m["id"] for m in data.get("data", [])]
                    # Select relevant GPT models
                    relevant = [m for m in all_m if any(k in m for k in ("gpt-4", "o1", "o3", "chatgpt"))]
                    return {
                        "success": True,
                        "message": "Connected to OpenAI successfully",
                        "models": relevant[:12] if relevant else SUPPORTED_PROVIDERS["openai"]["default_models"]
                    }
                else:
                    err_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                    return {"success": False, "error": f"OpenAI error: {err_msg}"}

            # 3. OpenRouter
            elif provider_id == "openrouter":
                url = "https://openrouter.ai/api/v1/auth/key"
                headers = {"Authorization": f"Bearer {clean_key}"}
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return {
                        "success": True,
                        "message": "OpenRouter API key verified",
                        "models": SUPPORTED_PROVIDERS["openrouter"]["default_models"]
                    }
                elif resp.status_code == 401:
                    return {"success": False, "error": "Invalid OpenRouter API key"}
                else:
                    # Try models endpoint
                    url_m = "https://openrouter.ai/api/v1/models"
                    resp_m = await client.get(url_m)
                    if resp_m.status_code == 200:
                        return {
                            "success": True,
                            "message": "OpenRouter reachable",
                            "models": SUPPORTED_PROVIDERS["openrouter"]["default_models"]
                        }
                    return {"success": False, "error": f"OpenRouter returned status {resp.status_code}"}

            # 4. Anthropic
            elif provider_id == "anthropic":
                url = "https://api.anthropic.com/v1/models"
                headers = {
                    "x-api-key": clean_key,
                    "anthropic-version": "2023-06-01"
                }
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m["id"] for m in data.get("data", [])]
                    return {
                        "success": True,
                        "message": "Anthropic API key verified",
                        "models": models if models else SUPPORTED_PROVIDERS["anthropic"]["default_models"]
                    }
                else:
                    err_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                    return {"success": False, "error": f"Anthropic error: {err_msg}"}

            # 5. Groq
            elif provider_id == "groq":
                url = "https://api.groq.com/openai/v1/models"
                headers = {"Authorization": f"Bearer {clean_key}"}
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m["id"] for m in data.get("data", [])]
                    return {
                        "success": True,
                        "message": "Groq LPU credentials verified",
                        "models": models if models else SUPPORTED_PROVIDERS["groq"]["default_models"]
                    }
                else:
                    err_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                    return {"success": False, "error": f"Groq error: {err_msg}"}

            # 6. fal.ai
            elif provider_id == "fal":
                url = "https://rest.fal.ai/models"
                headers = {"Authorization": f"Key {clean_key}"}
                resp = await client.get(url, headers=headers)
                if resp.status_code in (200, 204):
                    return {
                        "success": True,
                        "message": "fal.ai credentials verified",
                        "models": SUPPORTED_PROVIDERS["fal"]["default_models"]
                    }
                elif resp.status_code in (401, 403):
                    return {"success": False, "error": "Invalid fal.ai Key"}
                else:
                    # Many fal endpoints return 200 on queue
                    return {
                        "success": True,
                        "message": "fal.ai connection initialized",
                        "models": SUPPORTED_PROVIDERS["fal"]["default_models"]
                    }

            # 7. Custom Provider (OpenAI Compatible)
            elif provider_id == "custom":
                if not clean_base:
                    return {"success": False, "error": "Base URL is required for custom provider"}
                models_url = f"{clean_base}/models"
                headers = {}
                if clean_key:
                    headers["Authorization"] = f"Bearer {clean_key}"
                try:
                    resp = await client.get(models_url, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_list = data.get("data") or data.get("models") or []
                        parsed = [m.get("id") or m.get("name") for m in raw_list if isinstance(m, dict)]
                        return {
                            "success": True,
                            "message": f"Custom endpoint verified ({len(parsed)} models detected)",
                            "models": parsed if parsed else ["custom-model"]
                        }
                    else:
                        return {"success": False, "error": f"Custom endpoint returned HTTP {resp.status_code}"}
                except Exception as ex:
                    return {"success": False, "error": f"Could not reach {clean_base}: {str(ex)[:100]}"}

            else:
                return {"success": False, "error": f"Unknown provider: {provider_id}"}

    except httpx.ConnectTimeout:
        return {"success": False, "error": "Connection timed out. Please check network/proxy."}
    except Exception as e:
        logger.error("Provider test exception for %s: %s", provider_id, e)
        return {"success": False, "error": f"Connection check failed: {str(e)[:120]}"}

# ═════════════════════════════════════════════════════════════════
# 3. COMMON AI COMPLETION DISPATCHER (Section 10 of requirements)
# ═════════════════════════════════════════════════════════════════
async def call_user_ai_completion(
    provider_id: str,
    api_key: str,
    model: str,
    base_url: str,
    prompt: str,
    system_prompt: str = "",
    json_mode: bool = True
) -> str:
    """Dispatches text completion to a user-provided AI service."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        # OpenAI, Groq, OpenRouter, Custom
        if provider_id in ("openai", "groq", "openrouter", "custom"):
            endpoint = base_url if base_url else (
                "https://api.openai.com/v1" if provider_id == "openai"
                else "https://api.groq.com/openai/v1" if provider_id == "groq"
                else "https://openrouter.ai/api/v1"
            )
            chat_url = f"{endpoint.rstrip('/')}/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            if provider_id == "openrouter":
                headers["HTTP-Referer"] = "https://qoneqt.ai"
                headers["X-Title"] = "Qoneqt AI Studio"

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            payload: Dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": 0.7,
            }
            if json_mode:
                payload["response_format"] = {"type": "json_object"}

            resp = await client.post(chat_url, headers=headers, json=payload)
            if resp.status_code != 200:
                err = resp.text[:200]
                raise RuntimeError(f"{provider_id.upper()} error (HTTP {resp.status_code}): {err}")
            data = resp.json()
            return data["choices"][0]["message"]["content"]

        # Anthropic
        elif provider_id == "anthropic":
            url = "https://api.anthropic.com/v1/messages"
            headers = {
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            payload = {
                "model": model or "claude-3-7-sonnet-20250219",
                "max_tokens": 4096,
                "messages": [{"role": "user", "content": prompt}]
            }
            if system_prompt:
                payload["system"] = system_prompt

            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Anthropic error (HTTP {resp.status_code}): {resp.text[:200]}")
            data = resp.json()
            return data["content"][0]["text"]

        # Google Gemini with user key
        elif provider_id == "gemini":
            from google import genai
            from google.genai import types
            gclient = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=15000))
            cfg = types.GenerateContentConfig(
                response_mime_type="application/json" if json_mode else "text/plain",
                system_instruction=system_prompt if system_prompt else None,
                temperature=0.7
            )
            target_model = model or "gemini-2.5-flash"
            resp = await gclient.aio.models.generate_content(
                model=target_model,
                contents=prompt,
                config=cfg
            )
            return resp.text

        else:
            raise NotImplementedError(f"Provider {provider_id} does not support text/director completion")

async def dispatch_director_ai(
    prompt: str,
    system_prompt: str,
    config: Optional[GenerationConfig] = None,
    user_id: str = "default_user",
    fallback_callable = None
) -> str:
    """
    Central AI router:
    - If config.provider == 'qoneqt', runs Qoneqt Free Models directly.
    - If config.provider == 'user', decrypts user key and calls provider.
    - If user API fails:
      - If config.allow_fallback is True, calls fallback_callable (Qoneqt Free).
      - If False, raises explicit error without silent takeover.
    """
    cfg = config or GenerationConfig()
    
    # Check stored user preference if not explicitly overridden
    if not config:
        stored = get_user_settings(user_id)
        cfg.provider = stored.active_mode
        cfg.provider_id = stored.active_provider_id
        cfg.model = stored.active_model
        cfg.allow_fallback = stored.allow_fallback

    if cfg.provider == "qoneqt" or not cfg.provider_id:
        logger.info("[AI_ROUTER] Using Qoneqt Free Models (no API key required)")
        if fallback_callable:
            return await fallback_callable()
        raise RuntimeError("No Qoneqt Free completion handler provided")

    # User BYOK Provider execution
    provider_id = cfg.provider_id
    decrypted_key = get_decrypted_key(user_id, provider_id)
    if not decrypted_key:
        if cfg.allow_fallback and fallback_callable:
            logger.warning("[AI_ROUTER] User provider %s has no configured key; falling back to Qoneqt Free", provider_id)
            return await fallback_callable()
        raise ValueError(f"No API key configured for provider '{provider_id}'. Please configure your key in API Configuration.")

    stored_settings = get_user_settings(user_id)
    p_rec = stored_settings.providers.get(provider_id)
    model = cfg.model or (p_rec.selected_model if p_rec else "")
    base_url = p_rec.base_url if p_rec else ""

    logger.info("[AI_ROUTER] Executing with User API: provider=%s, model=%s", provider_id, model)
    try:
        return await call_user_ai_completion(
            provider_id=provider_id,
            api_key=decrypted_key,
            model=model,
            base_url=base_url,
            prompt=prompt,
            system_prompt=system_prompt,
            json_mode=True
        )
    except Exception as exc:
        logger.error("[AI_ROUTER] User provider %s execution failed: %s", provider_id, exc)
        if cfg.allow_fallback and fallback_callable:
            logger.info("[AI_ROUTER] Fallback enabled. Prompting/routing to Qoneqt Free Models...")
            return await fallback_callable()
        # Strictly do NOT silently take over if fallback is OFF
        raise RuntimeError(f"Your configured provider '{provider_id}' failed: {str(exc)}. Please check your API quota or enable Qoneqt Fallback.")
