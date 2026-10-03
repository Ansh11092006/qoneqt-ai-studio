import json
import logging
import asyncio
import re
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from backend.config import get_gemini_key, GEMINI_MODEL
from backend.models import (
    PromptUnderstanding, ContentPlan, Scene, Theme, Palette, JobOptions
)
from backend.services.theme import get_theme_for_prompt

logger = logging.getLogger("prompt_engine")

UNDERSTANDING_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "mainSubject": {"type": "STRING", "description": "Primary subject, e.g. cybersecurity analyst"},
        "topic": {"type": "STRING", "description": "Core theme/event, e.g. ransomware attack"},
        "action": {"type": "STRING", "description": "Key activity taking place"},
        "environment": {"type": "STRING", "description": "Setting/surroundings, e.g. futuristic SOC"},
        "characters": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "People or character roles involved"},
        "objects": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "Key equipment, props, or physical elements"},
        "events": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "Chronological events mentioned in prompt"},
        "visualStyle": {"type": "STRING", "description": "Cinematic style, e.g. cinematic tech thriller"},
        "cameraStyle": {"type": "STRING", "description": "Cinematic camera movement and angles"},
        "lighting": {"type": "STRING", "description": "Lighting condition, e.g. dramatic blue lighting"},
        "mood": {"type": "STRING", "description": "Atmosphere and emotional tone, e.g. tense"},
        "location": {"type": "STRING", "description": "Specific venue or space"},
        "timeOfDay": {"type": "STRING", "description": "Time of day, e.g. night"},
        "sequence": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "Ordered progression of story beats"},
        "importantDetails": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "Key constraints, colors, specific objects"},
        "promptType": {
            "type": "STRING",
            "description": "story, explainer, advertisement, documentary, or social_short"
        }
    },
    "required": ["mainSubject", "topic", "action", "environment", "mood", "lighting", "sequence"]
}

async def call_gemini_with_fallback(
    prompt_text: str,
    schema: Optional[Dict[str, Any]] = None,
    system_instruction: Optional[str] = None,
    temperature: float = 0.2
) -> str:
    """Invokes Gemini with exponential backoff and multi-model fallback."""
    gemini_key = get_gemini_key()
    if not gemini_key:
        raise ValueError("GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=gemini_key, http_options=types.HttpOptions(timeout=10000))
    candidate_models = [
        GEMINI_MODEL or "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
    ]

    last_exc = None
    for model_name in candidate_models:
        for attempt in range(1, 3):
            try:
                cfg_args = {"temperature": temperature}
                if schema:
                    cfg_args["response_mime_type"] = "application/json"
                    cfg_args["response_schema"] = schema
                if system_instruction:
                    cfg_args["system_instruction"] = system_instruction

                config = types.GenerateContentConfig(**cfg_args)
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.models.generate_content,
                        model=model_name,
                        contents=prompt_text,
                        config=config
                    ),
                    timeout=12.0
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as exc:
                last_exc = exc
                err_str = str(exc)
                logger.warning("[GEMINI] Model %s attempt %d failed: %s", model_name, attempt, exc)
                # If quota exhausted (429) or high demand (503), immediately move to next model
                if any(x in err_str for x in ["429", "RESOURCE_EXHAUSTED", "503", "UNAVAILABLE"]):
                    logger.warning("[GEMINI] %s unavailable (%s), switching model immediately...", model_name, err_str[:60])
                    break
                await asyncio.sleep(0.5)

    raise last_exc or RuntimeError("All Gemini candidate models failed")


# -------------------------------------------------------------
# STEP 1: UNDERSTAND THE USER PROMPT
# -------------------------------------------------------------
async def understand_prompt(prompt: str, options: Optional[JobOptions] = None) -> PromptUnderstanding:
    """
    Deconstructs user prompt using Gemini into structured narrative & visual semantics.
    Extracts mainSubject, topic, environment, characters, objects, sequence, lighting, mood, etc.
    """
    system_prompt = (
        "You are an Elite Hollywood Cinematographer and Visual Story Director. "
        "Your task is to thoroughly analyze the user's video prompt. Do NOT search the web. "
        "Extract the COMPLETE IDEA and semantic visual requirements into structured JSON. "
        "Detect if the prompt is a story, explainer, advertisement, documentary, or social_short. "
        "Pay extreme attention to specific subjects, environments, lighting, moods, and chronological sequence."
    )

    user_query = f"""
Analyze this user video creation prompt in depth:
Prompt: "{prompt.strip()}"

Extract:
- mainSubject (e.g. cybersecurity analyst, sports car, aerospace engineer)
- topic (e.g. ransomware attack detection, luxury vehicle performance)
- action (core actions happening)
- environment (e.g. futuristic SOC, mountain highway, laboratory)
- characters (list of specific roles)
- objects (key technology, vehicles, monitors, servers, props)
- events (chronological narrative beats)
- visualStyle (cinematic, dramatic, photorealistic)
- cameraStyle (e.g. dramatic close-ups, wide establishing shots, dynamic push-in)
- lighting (e.g. dramatic blue lighting, golden hour sunrise, moody shadows)
- mood (tense, luxurious, inspiring, urgent)
- location (indoor SOC, racetrack, space station)
- timeOfDay (night, dusk, dawn, day)
- sequence (step-by-step chronological action sequence)
- importantDetails (crucial visual specifics mentioned)
- promptType (story, explainer, advertisement, documentary, social_short)
"""

    try:
        gen_cfg = options.generation_config if options else None

        async def _call_qoneqt_free():
            return await call_gemini_with_fallback(
                prompt_text=user_query,
                schema=UNDERSTANDING_SCHEMA,
                system_instruction=system_prompt,
                temperature=0.2
            )

        from backend.services.ai_service import dispatch_director_ai, GenerationConfig
        cfg_obj = None
        if gen_cfg:
            cfg_obj = GenerationConfig(
                provider=gen_cfg.provider,
                provider_id=gen_cfg.provider_id,
                model=gen_cfg.model,
                allow_fallback=gen_cfg.allow_fallback
            )

        raw_json = await dispatch_director_ai(
            prompt=user_query,
            system_prompt=system_prompt,
            config=cfg_obj,
            fallback_callable=_call_qoneqt_free
        )
        data = json.loads(raw_json)
        return PromptUnderstanding.model_validate(data)
    except Exception as exc:
        logger.error("[UNDERSTANDING] Gemini semantic extraction failed: %s, using heuristic fallback", exc)
        return _fallback_understanding(prompt)


def _fallback_understanding(prompt: str) -> PromptUnderstanding:
    """Heuristic fallback when offline or during transient API failure."""
    p_lower = prompt.lower()
    
    # Prompt type detection
    p_type = "story"
    if any(k in p_lower for k in ["how to", "explain", "guide", "tutorial", "steps"]):
        p_type = "explainer"
    elif any(k in p_lower for k in ["ad", "commercial", "luxury", "brand", "product", "buy"]):
        p_type = "advertisement"
    elif any(k in p_lower for k in ["documentary", "history", "nature", "exploration"]):
        p_type = "documentary"
    elif any(k in p_lower for k in ["viral", "short", "tiktok", "reels", "20-second"]):
        p_type = "social_short"

    # Cybersecurity SOC detection
    if any(k in p_lower for k in ["cyber", "soc", "security", "ransomware", "hack", "analyst", "server"]):
        return PromptUnderstanding(
            mainSubject="cybersecurity analyst",
            topic="ransomware attack detection and containment",
            action="detecting suspicious network traffic, tracing server, isolating system, stopping attack",
            environment="futuristic SOC",
            characters=["cybersecurity analyst"],
            objects=["security dashboards", "monitors", "infected server", "network graphs"],
            events=[
                "detect suspicious activity in SOC",
                "investigate anomalous network traffic",
                "trace attack to infected server",
                "isolate compromised system",
                "neutralize attack and restore security"
            ],
            visualStyle="cinematic tech thriller",
            cameraStyle="dramatic close-ups and smooth push-ins",
            lighting="dramatic dark blue lighting with glowing screen reflections",
            mood="tense and high-stakes",
            location="dark futuristic SOC",
            timeOfDay="night",
            sequence=[
                "Wide shot of futuristic SOC at night",
                "Analyst notices unusual network activity",
                "Close-up of security dashboard showing suspicious traffic",
                "Analyst traces attack to infected server",
                "Analyst isolates compromised server",
                "Threat contained and attack halted"
            ],
            importantDetails=["dark blue lighting", "multiple monitors", "incident response progression"],
            promptType=p_type
        )

    # General fallback
    return PromptUnderstanding(
        mainSubject=prompt.strip()[:40],
        topic=prompt.strip()[:40],
        action="visual progression",
        environment="cinematic setting",
        characters=[],
        objects=[],
        events=["opening hook", "core insight", "key demonstration", "concluding resolution"],
        visualStyle="cinematic",
        cameraStyle="cinematic camera movements",
        lighting="cinematic dynamic lighting",
        mood="compelling",
        location="cinematic environment",
        timeOfDay="any",
        sequence=["establishing scene", "unfolding event", "critical climax", "resolution"],
        importantDetails=[],
        promptType=p_type
    )


# -------------------------------------------------------------
# STEP 2, 3, 9, 10: SEMANTIC STORYBOARD WITH TARGETED SEARCH QUERIES
# -------------------------------------------------------------
STORYBOARD_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "title": {"type": "STRING"},
        "hook": {"type": "STRING", "description": "High retention opening hook narration matching scene 1"},
        "directorNotes": {"type": "STRING", "description": "Overarching lighting, pacing, and color grade directives"},
        "cta": {"type": "STRING"},
        "hashtags": {"type": "ARRAY", "items": {"type": "STRING"}},
        "captionForPost": {"type": "STRING"},
        "scenes": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "id": {"type": "INTEGER"},
                    "intent": {"type": "STRING", "description": "Narrative purpose and action of this scene"},
                    "narration": {"type": "STRING", "description": "Voiceover audio spoken during this scene"},
                    "onScreenText": {"type": "STRING", "description": "Short punchy text shown on screen, max 6 words"},
                    "visualQuery": {
                        "type": "STRING",
                        "description": "2 to 4 HIGH-PRECISION stock footage keywords suitable for Pixabay video search"
                    },
                    "fallbackQueries": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"},
                        "description": "3 alternative queries if first query returns poor relevance"
                    },
                    "visualDescription": {"type": "STRING", "description": "Detailed visual instruction for framing and mood"},
                    "requiredVisuals": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"},
                        "description": "Mandatory visual elements required in the clip"
                    },
                    "negativeConcepts": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"},
                        "description": "FORBIDDEN unrelated concepts to reject (e.g. office meeting, cooking, traffic)"
                    },
                    "durationSec": {"type": "NUMBER"},
                    "shotType": {"type": "STRING"},
                    "cameraMovement": {"type": "STRING"},
                    "colorGrade": {"type": "STRING"}
                },
                "required": [
                    "id", "intent", "narration", "onScreenText", "visualQuery",
                    "fallbackQueries", "requiredVisuals", "negativeConcepts", "durationSec"
                ]
            }
        }
    },
    "required": ["title", "hook", "scenes", "cta"]
}

async def generate_semantic_storyboard(
    understanding: PromptUnderstanding,
    original_prompt: str,
    options: JobOptions
) -> ContentPlan:
    """
    Creates a chronological cinematic storyboard where EVERY scene moves the story forward.
    Generates scene-specific visual queries, required visuals, and negative concepts.
    Maintains story continuity across character, environment, lighting, and style.
    """
    target_duration = options.duration
    target_scenes = 4 if target_duration <= 20 else (5 if target_duration <= 35 else (6 if target_duration <= 50 else 7))
    lang_name = "Hindi" if options.language == "hi" else "English"

    detected_theme = get_theme_for_prompt(original_prompt)

    prompt_instructions = f"""
You are the Executive Cinematic Film Director at Qoneqt AI Studio.
Create a real, chronological, cinematic storyboard that visually communicates the user's complete idea.

Original User Prompt: "{original_prompt}"
Structured Understanding:
- Prompt Type: {understanding.promptType}
- Main Subject: {understanding.mainSubject}
- Topic: {understanding.topic}
- Core Action: {understanding.action}
- Environment: {understanding.environment}
- Location & Time: {understanding.location}, {understanding.timeOfDay}
- Key Objects: {', '.join(understanding.objects)}
- Sequence Beats: {json.dumps(understanding.sequence)}
- Visual Style & Mood: {understanding.visualStyle} | {understanding.mood}
- Lighting: {understanding.lighting}

REQUIREMENTS:
1. SCENE CONTINUITY (CRITICAL):
   The video must feel like ONE continuous production.
   Maintain the same visual style, same environment ({understanding.environment}), consistent color tone, and chronological progression.
   DO NOT create random disjointed scenes (e.g. scene 1 hacker, scene 2 random businessman, scene 3 sunny office).
   Keep every scene anchored in {understanding.environment} with {understanding.lighting}.

2. TARGETED SEARCH QUERIES (CRITICAL):
   Do NOT search using the entire prompt sentence!
   Stock video search engines (Pixabay) need 2 to 4 high-precision keywords that exist in stock metadata.
   Example:
   - Scene 1: query="futuristic cybersecurity operations center", fallbackQueries=["cyber security dark room", "surveillance operations center", "cybersecurity monitors"]
   - Scene 2: query="cyber security analyst screen", fallbackQueries=["hacker computer dark", "cyber attack alert", "analyst monitoring dashboard"]
   - Scene 3: query="network traffic data flow", fallbackQueries=["cyber data stream", "digital server network", "data code matrix"]
   - Scene 4: query="data center server rack", fallbackQueries=["server room cybersecurity", "server blinking lights dark", "data center infrastructure"]
   - Scene 5: query="cyber defense lock screen", fallbackQueries=["security firewall network", "cyber security shield", "data protection safe"]

3. REQUIRED VISUALS & NEGATIVE CONCEPTS:
   For EACH scene:
   - requiredVisuals: 3-5 specific visual elements that MUST be visible.
   - negativeConcepts: 3-5 unrelated concepts to immediately disqualify (e.g. ["office meeting", "business presentation", "coffee shop", "street traffic", "cooking", "smiling businessman"]).

4. PACING & DURATION:
   Create exactly {target_scenes} scenes.
   Each scene duration between 3.5s and 6.5s so sum ≈ {target_duration}s.

5. LANGUAGE & VOICE:
   Language: {lang_name}
   Narration must match the high-tension, authoritative tone.

Output valid JSON matching schema.
"""

    try:
        gen_cfg = options.generation_config if options else None

        async def _call_qoneqt_storyboard():
            return await call_gemini_with_fallback(
                prompt_text=prompt_instructions,
                schema=STORYBOARD_SCHEMA,
                system_instruction="You are an award-winning cinematic director and prompt engineer.",
                temperature=0.3
            )

        from backend.services.ai_service import dispatch_director_ai, GenerationConfig
        cfg_obj = None
        if gen_cfg:
            cfg_obj = GenerationConfig(
                provider=gen_cfg.provider,
                provider_id=gen_cfg.provider_id,
                model=gen_cfg.model,
                allow_fallback=gen_cfg.allow_fallback
            )

        raw_json = await dispatch_director_ai(
            prompt=prompt_instructions,
            system_prompt="You are an award-winning cinematic director and prompt engineer. Respond with valid JSON matching the requested storyboard schema.",
            config=cfg_obj,
            fallback_callable=_call_qoneqt_storyboard
        )
        plan_data = json.loads(raw_json)

        # Build Scene models
        scenes: List[Scene] = []
        for s in plan_data.get("scenes", []):
            scenes.append(Scene(
                id=s.get("id", len(scenes) + 1),
                narration=s.get("narration", ""),
                on_screen_text=s.get("onScreenText", ""),
                visual_query=s.get("visualQuery", ""),
                visual_description=s.get("visualDescription", ""),
                duration_sec=float(s.get("durationSec", 5.0)),
                shot_type=s.get("shotType", "Wide Cinematic Shot"),
                camera_movement=s.get("cameraMovement", "Slow forward push-in"),
                color_grade=s.get("colorGrade", f"{understanding.lighting} - Cinematic Grade"),
                intent=s.get("intent", ""),
                requiredVisuals=s.get("requiredVisuals", []),
                negativeConcepts=s.get("negativeConcepts", []),
                fallback_queries=s.get("fallbackQueries", []),
                status="pending"
            ))

        content_plan = ContentPlan(
            title=plan_data.get("title", f"{understanding.mainSubject} {understanding.topic}".title()),
            hook=plan_data.get("hook", scenes[0].narration if scenes else original_prompt),
            language=options.language,
            theme=detected_theme,
            scenes=scenes,
            cta=plan_data.get("cta", "Follow Qoneqt AI Studio for more high-impact stories!"),
            hashtags=plan_data.get("hashtags", ["#Qoneqt", "#Cinematic", f"#{understanding.topic.replace(' ', '')}"]),
            caption_for_post=plan_data.get("captionForPost", f"{original_prompt} | Made with Qoneqt AI Studio"),
            director_notes=plan_data.get("directorNotes", f"Lighting: {understanding.lighting} | Mood: {understanding.mood}"),
            understanding=understanding
        )
        return content_plan

    except Exception as exc:
        logger.error("[STORYBOARD] Gemini storyboard generation failed: %s, using fallback", exc)
        return _fallback_storyboard(understanding, original_prompt, options, detected_theme)


def _fallback_storyboard(
    understanding: PromptUnderstanding,
    original_prompt: str,
    options: JobOptions,
    theme: Theme
) -> ContentPlan:
    """Robust fallback storyboard honoring the specific cyber attack prompt or general prompt."""
    target_duration = options.duration
    p_lower = original_prompt.lower()

    if any(k in p_lower for k in ["cyber", "soc", "ransomware", "security", "analyst"]):
        scenes = [
            Scene(
                id=1,
                intent="Establishing shot of futuristic SOC at night with multiple glowing monitors",
                narration="Inside the command center, the midnight shift detects anomalous activity on the perimeter.",
                on_screen_text="Intrusion Detected in SOC",
                visual_query="cybersecurity operations center",
                visual_description="Wide cinematic shot of a dark high-tech security operations center illuminated by blue monitors.",
                duration_sec=5.0,
                shot_type="Wide Cinematic Shot",
                camera_movement="Slow forward push-in",
                color_grade="Dark Blue Neon & Cyan",
                requiredVisuals=["SOC", "multiple monitors", "dark environment", "security operations"],
                negativeConcepts=["office meeting", "business conference", "coffee shop", "generic laptop", "cooking", "traffic"],
                fallback_queries=["cyber security dark room", "surveillance operations center", "high tech control room screen"],
                status="pending"
            ),
            Scene(
                id=2,
                intent="Analyst discovers suspicious network traffic and ransomware signature",
                narration="Security telemetry flashes red as an aggressive ransomware payload attempts infiltration.",
                on_screen_text="Ransomware Breach Alert",
                visual_query="cyber attack alert screen",
                visual_description="Close up of security monitors flashing code, virus warnings, and threat indicators.",
                duration_sec=6.0,
                shot_type="Close-Up",
                camera_movement="Tracking push on screen",
                color_grade="Dark Blue & Red Alert",
                requiredVisuals=["cyber attack", "security alert", "monitors", "code", "threat detection"],
                negativeConcepts=["cars", "street", "meeting", "food", "lifestyle"],
                fallback_queries=["hacker computer dark", "computer virus alert", "cyber security threat"],
                status="pending"
            ),
            Scene(
                id=3,
                intent="Close-up of security dashboard investigating packet traffic and network flow",
                narration="Tracing packet flows in real time, the analyst pinpoints anomalous data exfiltration.",
                on_screen_text="Tracing Network Telemetry",
                visual_query="network traffic data flow",
                visual_description="High-tech digital network graph and glowing data packets transferring across server nodes.",
                duration_sec=6.0,
                shot_type="Macro Detail Shot",
                camera_movement="Fluid pan across data streams",
                color_grade="Deep Cyber Blue & Teal",
                requiredVisuals=["network flow", "data stream", "server network", "digital nodes", "telemetry"],
                negativeConcepts=["highway traffic", "street cars", "city roads", "kitchen", "office chat"],
                fallback_queries=["digital cyber code", "data network server", "abstract technology data"],
                status="pending"
            ),
            Scene(
                id=4,
                intent="Tracing the breach to the compromised core server rack",
                narration="The threat vectors lead directly to a compromised critical database cluster.",
                on_screen_text="Compromised Server Identified",
                visual_query="data center server rack",
                visual_description="Moody server room with rows of dark blinking server racks and fiber optic cables.",
                duration_sec=6.0,
                shot_type="Tracking Shot",
                camera_movement="Low angle dolly through server corridor",
                color_grade="Moody Server Blue",
                requiredVisuals=["server racks", "data center", "blinking led indicators", "server room"],
                negativeConcepts=["laptop in cafe", "office cubicle", "outdoor", "people talking in meeting"],
                fallback_queries=["server room cybersecurity", "server blinking lights dark", "data center infrastructure"],
                status="pending"
            ),
            Scene(
                id=5,
                intent="Isolating infected server and stopping the attack completely",
                narration="Emergency network isolation engaged. The ransomware is quarantined and the attack is stopped.",
                on_screen_text="Attack Quarantined & Stopped",
                visual_query="cyber defense shield graphic",
                visual_description="Digital security shield locking down network channels and green perimeter restoration.",
                duration_sec=7.0,
                shot_type="Hero Shot",
                camera_movement="Slow zoom out on secured network",
                color_grade="Cyber Cyan & Green Safe",
                requiredVisuals=["cyber defense", "security lock", "firewall", "data protection", "contained threat"],
                negativeConcepts=["business handshake", "cars", "retail store", "meeting room"],
                fallback_queries=["data security protection", "cyber shield digital", "computer network secured"],
                status="pending"
            )
        ]
        return ContentPlan(
            title="SOC Ransomware Incident Contained",
            hook="Inside the command center, the midnight shift detects anomalous activity on the perimeter.",
            language=options.language,
            theme=theme,
            scenes=scenes,
            cta="Follow Qoneqt for daily tactical cybersecurity breakdowns!",
            hashtags=["#CyberSecurity", "#Ransomware", "#InfoSec", "#SOC", "#qoneqt"],
            caption_for_post="Dramatic SOC ransomware attack stopped in real time. #qoneqt #cybersecurity",
            director_notes="Maintain dramatic blue ambient lighting, tense pacing, and real-time dashboard telemetry throughout.",
            understanding=understanding
        )

    # General fallback
    scenes = [
        Scene(
            id=1,
            intent=f"Establishing shot for {original_prompt[:30]}",
            narration=f"Here is the untold truth about {original_prompt[:35]}.",
            on_screen_text=original_prompt[:24].title(),
            visual_query="cinematic dramatic lighting portrait",
            visual_description="Cinematic shot establishing the core theme.",
            duration_sec=5.0,
            shot_type="Wide Cinematic Shot",
            camera_movement="Slow forward push-in",
            color_grade="Cinematic Teal & Orange",
            requiredVisuals=["dramatic lighting", "cinematic setting"],
            negativeConcepts=["low quality", "blurry", "amateur"],
            fallback_queries=["cinematic atmospheric scene", "dramatic background"],
            status="pending"
        ),
        Scene(
            id=2,
            intent="Exploring the primary insight",
            narration="Most people miss the critical detail that defines this entire dynamic.",
            on_screen_text="The Critical Shift",
            visual_query="modern technology dynamic motion",
            visual_description="Dynamic visual showcasing motion and development.",
            duration_sec=6.0,
            shot_type="Tracking Shot",
            camera_movement="Smooth lateral track",
            color_grade="Cinematic Contrast",
            requiredVisuals=["dynamic movement", "modern visual"],
            negativeConcepts=["static", "boring"],
            fallback_queries=["abstract futuristic motion", "clean professional visual"],
            status="pending"
        ),
        Scene(
            id=3,
            intent="Climax and key takeaway",
            narration="When you master this perspective, the entire outcome transforms.",
            on_screen_text="Master The Outcome",
            visual_query="inspirational horizon sunlight city",
            visual_description="Inspiring conclusion highlighting success.",
            duration_sec=6.0,
            shot_type="Hero Shot",
            camera_movement="Slow ascending crane",
            color_grade="Golden Dawn",
            requiredVisuals=["horizon", "inspirational lighting"],
            negativeConcepts=["dark", "gloomy"],
            fallback_queries=["epic cinematic landscape", "triumph celebration"],
            status="pending"
        )
    ]
    return ContentPlan(
        title=original_prompt[:40].title(),
        hook=scenes[0].narration,
        language=options.language,
        theme=theme,
        scenes=scenes,
        cta="Follow for more daily breakthroughs on Qoneqt AI Studio!",
        hashtags=["#Trending", "#CinematicAI", "#CreatorHub", "#qoneqt"],
        caption_for_post=f"{original_prompt[:40]} | Created with Qoneqt AI Studio",
        director_notes="High visual coherence and cinematic rhythm.",
        understanding=understanding
    )


# -------------------------------------------------------------
# STEP 6: QUERY REFINEMENT ENGINE
# -------------------------------------------------------------
async def refine_scene_query(
    scene_intent: str,
    required_visuals: List[str],
    negative_concepts: List[str],
    attempt_history: List[str]
) -> List[str]:
    """
    Uses Gemini to generate 3-5 alternative high-precision search queries
    specifically tailored for stock media indexing if previous queries scored low.
    """
    prompt = f"""
We are searching for stock video clips for a specific scene, but previous queries returned poor results.
Scene Intent: "{scene_intent}"
Required Visual Elements: {', '.join(required_visuals)}
Forbidden / Negative Concepts: {', '.join(negative_concepts)}
Previous Queries Tried (Failed): {', '.join(attempt_history)}

Generate 3 to 4 NEW, DIFFERENT, 2-to-3-word stock queries that are commonly indexed on stock footage platforms (Pixabay/Pexels).
Queries must be concise (2-3 words), concrete nouns/actions, without filler words.
Return JSON array of strings only, e.g. ["query one", "query two", "query three"]
"""
    try:
        raw_json = await call_gemini_with_fallback(
            prompt_text=prompt,
            system_instruction="You are a stock media metadata and search specialist.",
            temperature=0.3
        )
        # Parse list
        queries = json.loads(raw_json)
        if isinstance(queries, list):
            return [q.strip() for q in queries if isinstance(q, str) and q.strip()]
    except Exception as e:
        logger.warning("[REFINE] Gemini query refinement failed: %s", e)

    # Heuristic fallback
    words = [w for w in required_visuals if len(w.split()) <= 3]
    return words[:3] if words else ["cyber security", "data center", "technology screen"]
