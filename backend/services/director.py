import json
import logging
import asyncio
from typing import Optional
from google import genai
from google.genai import types

from backend.config import get_gemini_key, GEMINI_API_KEY, GEMINI_MODEL, DEMO_MODE
from backend.models import ContentPlan, Scene, Theme, Palette, JobOptions
from backend.services.theme import get_theme_for_prompt

logger = logging.getLogger("director")
logging.basicConfig(level=logging.INFO)

# High quality deterministic plans for demo topics and offline resilience
DEMO_PLANS = {
    "cybersecurity": ContentPlan(
        title="5 Cybersecurity Mistakes College Students Make",
        hook="Are you making these 5 deadly cybersecurity mistakes on campus right now?",
        language="en",
        theme=Theme(
            mood="Cyber Defense & Code",
            palette=Palette(
                bg1="#030712",
                bg2="#0f172a",
                accent="#00ff66",
                text="#f0fdf4"
            ),
            background_type="matrix_rain",
            loading_style="terminal",
            loading_messages=[
                "Deciphering topic security vulnerabilities...",
                "Engineering high-retention viral script...",
                "Compiling scene threat vector breakdowns...",
                "Acquiring high-definition cyber surveillance media...",
                "Synthesizing authoritative tactical voiceover...",
                "Rendering composite MP4 with cyber subtitle tracks...",
                "Executing automated multi-point quality check..."
            ]
        ),
        scenes=[
            Scene(
                id=1,
                narration="Are you making these 5 deadly cybersecurity mistakes on campus right now?",
                on_screen_text="5 Campus Cyber Mistakes",
                visual_query="student laptop dark room",
                visual_description="A college student staring intensely at a glowing laptop in a dark dorm room.",
                duration_sec=5.0,
                transition="zoom"
            ),
            Scene(
                id=2,
                narration="Mistake 1: Connecting to free campus Wi-Fi without a verified VPN tunnel.",
                on_screen_text="1. Unencrypted Campus Wi-Fi",
                visual_query="hacker typing green code",
                visual_description="Close up of hands rapidly typing terminal commands on an illuminated keyboard.",
                duration_sec=6.0,
                transition="cut"
            ),
            Scene(
                id=3,
                narration="Mistake 2: Reusing your favorite master password across student portal and personal email.",
                on_screen_text="2. Reusing Same Password",
                visual_query="password security alert lock",
                visual_description="Digital red padlock flashing a security warning on a smartphone screen.",
                duration_sec=6.0,
                transition="cut"
            ),
            Scene(
                id=4,
                narration="Mistake 3: Clicking urgent financial aid or syllabus phishing links from fake professors.",
                on_screen_text="3. Campus Phishing Traps",
                visual_query="phishing email warning screen",
                visual_description="A mouse cursor hovering over a suspicious phishing email link with an alert icon.",
                duration_sec=6.0,
                transition="fade"
            ),
            Scene(
                id=5,
                narration="Activate two-factor authentication and lock down your digital identity today.",
                on_screen_text="Protect Your Accounts Now",
                visual_query="cyber defense shield graphic",
                visual_description="A futuristic glowing digital shield protecting data streams.",
                duration_sec=5.0,
                transition="zoom"
            )
        ],
        cta="Follow for more daily tech security survival guides on Qoneqt!",
        hashtags=["#CyberSecurity", "#StudentLife", "#TechTips", "#OnlineSafety", "#qoneqt"],
        caption_for_post="5 Cybersecurity mistakes putting college students at risk right now. Stay protected! #qoneqt #cybersecurity"
    ),
    "fitness": ContentPlan(
        title="3 Workout Mistakes Killing Your Gains",
        hook="Stop doing this in the gym if you actually want to build muscle fast!",
        language="en",
        theme=Theme(
            mood="High-Intensity Fire & Grit",
            palette=Palette(
                bg1="#090503",
                bg2="#1c0b05",
                accent="#ff4500",
                text="#fff7ed"
            ),
            background_type="embers",
            loading_style="pulse",
            loading_messages=[
                "Analyzing athletic performance angle...",
                "Drafting explosive motivational hook...",
                "Structuring high-cadence workout scenes...",
                "Gathering kinetic fitness visuals...",
                "Generating energetic coaching voiceover...",
                "Compounding dynamic video layers and captions...",
                "Running final conditioning QC assessment..."
            ]
        ),
        scenes=[
            Scene(
                id=1,
                narration="Stop doing this in the gym if you actually want to build muscle fast!",
                on_screen_text="Stop Killing Your Gains",
                visual_query="heavy barbell gym lift",
                visual_description="Athlete gripping a heavy chalked barbell in an intense workout setting.",
                duration_sec=5.0,
                transition="zoom"
            ),
            Scene(
                id=2,
                narration="First mistake: Ego lifting heavy weights with half reps and zero muscular tension.",
                on_screen_text="1. Zero Full Range",
                visual_query="weightlifter lifting dumbbell intense",
                visual_description="Close up of muscular arm curling a heavy dumbbell with focused form.",
                duration_sec=6.0,
                transition="cut"
            ),
            Scene(
                id=3,
                narration="Second: Neglecting protein timing and sleeping under six hours every single night.",
                on_screen_text="2. Poor Recovery & Sleep",
                visual_query="athlete drinking protein shaker",
                visual_description="Fitness athlete resting and drinking after an exhaustive training session.",
                duration_sec=6.0,
                transition="cut"
            ),
            Scene(
                id=4,
                narration="Focus on controlled progressive overload, track your numbers, and watch the results explode.",
                on_screen_text="Track Every Single Set",
                visual_query="gym athlete celebrating workout",
                visual_description="Energetic athlete finishing workout with confidence in modern training facility.",
                duration_sec=6.0,
                transition="fade"
            )
        ],
        cta="Save this video and smash follow for more proven fitness blueprints!",
        hashtags=["#FitnessTips", "#GymMotivation", "#MuscleBuilding", "#WorkoutRoutine", "#qoneqt"],
        caption_for_post="Are you making these 3 workout mistakes in the gym? Fix them today to unlock real growth. #qoneqt #fitness"
    ),
    "travel": ContentPlan(
        title="3 Hidden Gems in Japan Tourists Miss",
        hook="Skip the crowded tourist traps: here are 3 magical secret spots in Japan.",
        language="en",
        theme=Theme(
            mood="Golden Sunrise & Horizon",
            palette=Palette(
                bg1="#0a0a14",
                bg2="#1e1b4b",
                accent="#fb923c",
                text="#fffbeb"
            ),
            background_type="sunrise_clouds",
            loading_style="globe",
            loading_messages=[
                "Plotting destination coordinates and travel angles...",
                "Crafting inspirational wanderlust narrative...",
                "Curating breathtaking landscape scene sequence...",
                "Collecting pristine 4K scenic footage...",
                "Voicing authentic storytelling audio...",
                "Blending transitions and cinematic subtitles...",
                "Inspecting visual aesthetic quality standards..."
            ]
        ),
        scenes=[
            Scene(
                id=1,
                narration="Skip the crowded tourist traps: here are 3 magical secret spots in Japan.",
                on_screen_text="Secret Gems in Japan",
                visual_query="japan kyoto bamboo misty",
                visual_description="Misty morning light piercing through serene Japanese bamboo groves.",
                duration_sec=5.0,
                transition="zoom"
            ),
            Scene(
                id=2,
                narration="First: The ancient moss village of Shirakawa-go, hidden deep inside misty mountain valleys.",
                on_screen_text="1. Historic Shirakawago Valleys",
                visual_query="shirakawago thatched roof mountain",
                visual_description="Traditional historic thatched-roof cottages surrounded by lush green mountains.",
                duration_sec=6.0,
                transition="cut"
            ),
            Scene(
                id=3,
                narration="Second: The floating Torii gate of Oarai, where ocean waves crash against sacred rock shrines.",
                on_screen_text="2. Ocean Torii Shrine",
                visual_query="japan torii gate ocean waves",
                visual_description="Sunrise ocean waves splashing violently against a sacred red Torii gate.",
                duration_sec=6.0,
                transition="cut"
            ),
            Scene(
                id=4,
                narration="Add these to your travel bucket list and experience the real soul of Japan.",
                on_screen_text="Experience Authentic Japan",
                visual_query="mount fuji sunrise clouds",
                visual_description="Majestic view of Mount Fuji glowing in dawn pastel sunlight.",
                duration_sec=6.0,
                transition="fade"
            )
        ],
        cta="Tag your favorite travel partner and explore the world with Qoneqt!",
        hashtags=["#JapanTravel", "#HiddenGems", "#Wanderlust", "#BucketList", "#qoneqt"],
        caption_for_post="3 Secret Japan travel locations tourists always miss. Save this for your upcoming journey! #qoneqt #travel"
    )
}

def get_demo_plan(prompt: str) -> ContentPlan:
    """Returns a matching demo plan or synthesizes one using the prompt and theme engine."""
    p_lower = prompt.lower()
    if any(k in p_lower for k in ["cyber", "security", "hack", "password", "phish", "student"]):
        return DEMO_PLANS["cybersecurity"]
    elif any(k in p_lower for k in ["fit", "gym", "workout", "muscle", "exercise", "gain"]):
        return DEMO_PLANS["fitness"]
    elif any(k in p_lower for k in ["travel", "japan", "trip", "tourist", "vacation"]):
        return DEMO_PLANS["travel"]
    
    # Generic synthesized plan matching prompt
    theme = get_theme_for_prompt(prompt)
    return ContentPlan(
        title=prompt.strip()[:60].title(),
        hook=f"Here is what you absolutely must know about {prompt.strip()[:35]}!",
        language="en",
        theme=theme,
        scenes=[
            Scene(
                id=1,
                narration=f"Here is what you absolutely must know about {prompt.strip()[:35]}!",
                on_screen_text=prompt.strip()[:24].title(),
                visual_query="cinematic dramatic lighting portrait",
                visual_description="Cinematic vertical framing capturing intense attention.",
                duration_sec=5.0,
                transition="zoom"
            ),
            Scene(
                id=2,
                narration="Most people completely overlook the fundamental secret behind this topic.",
                on_screen_text="The Overlooked Truth",
                visual_query="modern technology abstract motion",
                visual_description="Futuristic dynamic motion showcasing information flow.",
                duration_sec=6.0,
                transition="cut"
            ),
            Scene(
                id=3,
                narration="When you apply this principle consistently, everything changes in your daily workflow.",
                on_screen_text="Apply The Principle",
                visual_query="focused creator working desk",
                visual_description="Professional creator working attentively in a modern studio.",
                duration_sec=6.0,
                transition="cut"
            ),
            Scene(
                id=4,
                narration="Take action on this insight right now and level up your results today.",
                on_screen_text="Level Up Now",
                visual_query="inspirational horizon sunlight city",
                visual_description="Inspiring skyline bathed in golden sunlight.",
                duration_sec=5.0,
                transition="fade"
            )
        ],
        cta="Follow for more daily breakthroughs on Qoneqt AI Studio!",
        hashtags=["#Trending", "#DailyInsights", "#FutureReady", "#CreatorHub", "#qoneqt"],
        caption_for_post=f"The truth about {prompt.strip()[:40]}. Share your thoughts below! #qoneqt"
    )

def build_director_prompt(
    mode: str,
    user_input: str,
    options: JobOptions,
    detected_theme: Theme
) -> str:
    target_duration = options.duration
    target_scenes = 4 if target_duration <= 20 else (5 if target_duration <= 35 else (6 if target_duration <= 50 else 7))
    lang_name = "Hindi" if options.language == "hi" else "English"
    style_spec = f"Video Style: {options.video_style} | Music: {options.music_style} | Voice: {options.voice_style}"
    
    base_prompt = f"""
You are the Executive AI Cinematic Film Director at Qoneqt AI Studio.
Tagline: "One idea in. One publish-ready video out."
Platform: Qoneqt Global Feed / Multi-Platform ({options.aspect_ratio} format).
{style_spec}

Direct an end-to-end cinematic viral video plan for:
Input: "{user_input}"
Mode: "{mode}" (if "script", preserve exact user narration while dividing into scenes)
Target Total Duration: ~{target_duration} seconds ({target_scenes} scenes)
Tone: {options.tone}
Language: {lang_name} (code: '{options.language}')

CRITICAL INSTRUCTIONS:
1. Hook: Scene 1 narration MUST be an irresistible, scroll-stopping hook (first 3 seconds).
   The "hook" field must match Scene 1 narration.
2. Scene Count: Create exactly {target_scenes} scenes.
   Each scene duration must be between 3.5 and 7.0 seconds. The sum of scene durations should approximate {target_duration}s.
3. Cinematic Camera & Shot Directives:
   - shot_type: Assign a professional shot from: "Drone Shot", "Tracking Shot", "Orbit Shot", "Dolly Zoom", "Slow Motion Shot", "Close-Up", "Wide Cinematic Shot", "Establishing Shot", "Hero Shot".
   - camera_movement: e.g. "Slow forward push-in", "Dynamic pan left to right", "Sweeping upward crane", "Static low angle".
   - color_grade: e.g. "Cinematic Teal & Orange", "Cyberpunk Neon", "Bleach Bypass", "Vintage Warm", "Monochrome Noir", "Natural Vibrant".
4. On-screen text: Punchy, maximum 6 words per scene.
5. Visual Query: 2 to 4 high-precision stock keywords suitable for Pixabay search (e.g. "student laptop dark", "hacker green code").
6. Theme: Provide a matching Theme object including mood, hex palette (bg1, bg2, accent, text), background_type, loading_style, and exactly 7 loading_messages.
   Suggested background_type: {detected_theme.background_type}
   Suggested loading_style: {detected_theme.loading_style}
7. director_notes: Include a 1-2 sentence overarching cinematic vision (lighting, rhythm, sound design cues).
8. Output: Strictly valid JSON conforming to the requested schema. No conversational filler.
"""
    return base_prompt.strip()

async def generate_content_plan(
    mode: str,
    user_input: str,
    options: Optional[JobOptions] = None
) -> ContentPlan:
    """
    Calls Gemini API with JSON response-schema to generate a validated ContentPlan.
    Retries twice on invalid JSON, with fallback to demo mode or synthesized plan.
    """
    if options is None:
        options = JobOptions()

    detected_theme = get_theme_for_prompt(user_input)

    gemini_key = get_gemini_key()
    # If DEMO_MODE is forced or GEMINI_API_KEY is not set, use resilient demo fallback
    if DEMO_MODE or not gemini_key:
        logger.info("Using Demo Mode / Cached Plan generator (DEMO_MODE=%s, has_key=%s)", DEMO_MODE, bool(gemini_key))
        demo_plan = get_demo_plan(user_input)
        # Adapt language and options
        demo_plan.language = options.language
        return demo_plan

    client = genai.Client(api_key=gemini_key)
    model_name = GEMINI_MODEL or "gemini-2.5-flash"
    
    prompt_text = build_director_prompt(mode, user_input, options, detected_theme)
    
    last_error = None
    for attempt in range(1, 4):
        try:
            logger.info("Calling Gemini (%s) for ContentPlan (attempt %d/3)...", model_name, attempt)
            
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=model_name,
                contents=prompt_text,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_json_schema=ContentPlan.model_json_schema(),
                    temperature=0.7 if attempt == 1 else 0.4,
                )
            )
            
            raw_text = response.text
            if not raw_text:
                raise ValueError("Empty response text from Gemini")
                
            plan_data = json.loads(raw_text)
            
            # Enforce 7 loading messages
            if "theme" in plan_data and "loading_messages" in plan_data["theme"]:
                msgs = plan_data["theme"]["loading_messages"]
                if len(msgs) < 7:
                    msgs.extend(detected_theme.loading_messages[len(msgs):])
                elif len(msgs) > 7:
                    plan_data["theme"]["loading_messages"] = msgs[:7]
            
            plan = ContentPlan.model_validate(plan_data)
            
            # Guarantee hook aligns with scene 1
            if plan.scenes and (not plan.hook or plan.hook != plan.scenes[0].narration):
                plan.hook = plan.scenes[0].narration
                
            return plan

        except Exception as e:
            logger.warning("Gemini attempt %d failed: %s", attempt, str(e))
            last_error = e
            # If rate limit or connection issue, try simpler prompt on retry
            prompt_text = f"Generate a video plan for '{user_input}'. Output JSON only matching schema."
            await asyncio.sleep(1.0 * attempt)

    logger.error("All Gemini attempts failed: %s. Falling back to resilient plan.", last_error)
    return get_demo_plan(user_input)
