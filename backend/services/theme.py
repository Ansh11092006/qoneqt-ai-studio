import re
import asyncio
from typing import Optional
from backend.models import Theme, Palette

# Preset Theme Definitions for ~15 Categories
THEME_PRESETS = {
    "cybersecurity": Theme(
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
    "fitness": Theme(
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
    "travel": Theme(
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
    "finance": Theme(
        mood="Prestige Wealth & Precision",
        palette=Palette(
            bg1="#060c07",
            bg2="#064e3b",
            accent="#fbbf24",
            text="#fefce8"
        ),
        background_type="particles",
        loading_style="chart",
        loading_messages=[
            "Evaluating market indicators and economic angles...",
            "Formulating high-yield financial hook...",
            "Segmenting alpha investment breakdowns...",
            "Sourcing premium institutional market footage...",
            "Recording crisp executive narration...",
            "Assembling chart graphics and dynamic captions...",
            "Auditing production precision & audio clarity..."
        ]
    ),
    "space": Theme(
        mood="Deep Cosmic Mystery",
        palette=Palette(
            bg1="#02040a",
            bg2="#0f172a",
            accent="#38bdf8",
            text="#f0f9ff"
        ),
        background_type="stars",
        loading_style="rocket",
        loading_messages=[
            "Calculating orbital trajectory of the prompt...",
            "Drafting awe-inspiring cosmic script...",
            "Charting celestial scene transitions...",
            "Deploying telescope array for deep-space visuals...",
            "Broadcasting deep resonant voiceover transmission...",
            "Composing interstellar video stream...",
            "Verifying atmospheric telemetric QC..."
        ]
    ),
    "gaming": Theme(
        mood="Synthwave Arcade Cyber",
        palette=Palette(
            bg1="#0a0314",
            bg2="#2e1065",
            accent="#ec4899",
            text="#fdf2f8"
        ),
        background_type="neon_grid",
        loading_style="terminal",
        loading_messages=[
            "Loading gaming lore and gameplay highlights...",
            "Writing high-octane hype gamer hook...",
            "Pacing fast-cut competitive scenes...",
            "Buffering cinematic gameplay capture...",
            "Recording electric esports-grade commentary...",
            "Rendering glitch transitions and burned subs...",
            "Verifying framerate and audio level QC..."
        ]
    ),
    "nature": Theme(
        mood="Oceanic Tides & Earth",
        palette=Palette(
            bg1="#021415",
            bg2="#064e3b",
            accent="#2dd4bf",
            text="#f0fdfa"
        ),
        background_type="waves",
        loading_style="globe",
        loading_messages=[
            "Gathering ecological insights and wilderness themes...",
            "Authoring natural wonder documentary script...",
            "Storyboarding breathtaking biodiversity scenes...",
            "Harvesting pristine organic nature captures...",
            "Synthesizing tranquil, grounded voice narration...",
            "Synthesizing organic video elements and subs...",
            "Validating acoustic balance and color fidelity..."
        ]
    ),
    "education": Theme(
        mood="Focus & Discovery",
        palette=Palette(
            bg1="#060913",
            bg2="#172554",
            accent="#60a5fa",
            text="#eff6ff"
        ),
        background_type="particles",
        loading_style="chart",
        loading_messages=[
            "Synthesizing academic thesis and educational angle...",
            "Writing clear, engaging educational script...",
            "Structuring modular learning steps and key takeaways...",
            "Fetching illustrative instructional b-roll...",
            "Generating articulate explanatory voice...",
            "Compiling video timelines with punchy on-screen text...",
            "Reviewing educational retention QC score..."
        ]
    ),
    "food": Theme(
        mood="Warm Gourmet Savor",
        palette=Palette(
            bg1="#140604",
            bg2="#451a03",
            accent="#f97316",
            text="#fff7ed"
        ),
        background_type="embers",
        loading_style="pulse",
        loading_messages=[
            "Extracting secret culinary flavors and recipe hooks...",
            "Writing mouthwatering taste-test script...",
            "Timing sizzling recipe steps and reveal cuts...",
            "Procuring delicious close-up cooking b-roll...",
            "Recording warm appetizing voiceover...",
            "Plating together high-def cuts and animated text...",
            "Testing video appetizing factor & clarity QC..."
        ]
    ),
    "music": Theme(
        mood="Electric Soundwave",
        palette=Palette(
            bg1="#08031a",
            bg2="#3b0764",
            accent="#a855f7",
            text="#faf5ff"
        ),
        background_type="waves",
        loading_style="pulse",
        loading_messages=[
            "Analyzing acoustic rhythm and genre vibrations...",
            "Crafting lyrical rhythm-matched narration...",
            "Sequencing dynamic beat-drop scenes...",
            "Curating vibrant concert and studio cinematography...",
            "Synthesizing expressive rhythmic vocal performance...",
            "Mastering audio-visual sync and styled lyrics...",
            "Running frequency response and peak QC..."
        ]
    ),
    "film": Theme(
        mood="Cinematic Velvet Noir",
        palette=Palette(
            bg1="#050508",
            bg2="#18181b",
            accent="#e11d48",
            text="#fff1f2"
        ),
        background_type="aurora",
        loading_style="film_reel",
        loading_messages=[
            "Drafting director screenplay vision...",
            "Authoring dramatic 3-act narrative hook...",
            "Storyboarding cinematic camera angles and pans...",
            "Collecting studio-grade cinematic footage...",
            "Voice-directing nuanced theatrical delivery...",
            "Color-grading cuts with cinematic burn-in subs...",
            "Checking frame pacing and cinema standards..."
        ]
    ),
    "startup": Theme(
        mood="Hyper-Growth Momentum",
        palette=Palette(
            bg1="#030712",
            bg2="#111827",
            accent="#6366f1",
            text="#e0e7ff"
        ),
        background_type="neon_grid",
        loading_style="rocket",
        loading_messages=[
            "Deconstructing founder pitch and disruption thesis...",
            "Writing compelling product-market fit script...",
            "Designing viral growth milestone scenes...",
            "Collecting modern tech office and build b-roll...",
            "Generating confident visionary voiceover...",
            "Merging presentation flow with highlight titles...",
            "Measuring conversion hook QC metrics..."
        ]
    ),
    "news": Theme(
        mood="Breaking Dispatch",
        palette=Palette(
            bg1="#030712",
            bg2="#1e293b",
            accent="#ef4444",
            text="#f8fafc"
        ),
        background_type="particles",
        loading_style="globe",
        loading_messages=[
            "Investigating headline facts and breaking news wires...",
            "Drafting urgent journalistic lead...",
            "Chronologizing investigative timeline scenes...",
            "Fetching verified broadcast news visual feed...",
            "Recording authoritative news anchor voiceover...",
            "Rendering ticker text and high-contrast captions...",
            "Fact-checking audio sync and broadcast compliance..."
        ]
    ),
    "art": Theme(
        mood="Avant-Garde Aesthetic",
        palette=Palette(
            bg1="#090510",
            bg2="#31103f",
            accent="#d946ef",
            text="#fae8ff"
        ),
        background_type="aurora",
        loading_style="film_reel",
        loading_messages=[
            "Curating creative moodboard and aesthetic theory...",
            "Penning poetic thought-provoking script...",
            "Composing gallery-worthy visual scenes...",
            "Selecting expressive artistic master visual b-roll...",
            "Recording intimate reflective voiceover...",
            "Blending delicate transitions and elegant typography...",
            "Evaluating artistic balance and compositional QC..."
        ]
    ),
    "default": Theme(
        mood="Qoneqt Studio Aurora",
        palette=Palette(
            bg1="#070913",
            bg2="#0f172a",
            accent="#6366f1",
            text="#f8fafc"
        ),
        background_type="aurora",
        loading_style="pulse",
        loading_messages=[
            "Analyzing topic context and creator intent...",
            "Writing high-retention short-form video script...",
            "Planning visual scenes and keyword queries...",
            "Fetching vertical video footage and photography...",
            "Generating studio-quality voiceover audio...",
            "Composing video timeline, transitions, and captions...",
            "Running multi-point automated quality inspection..."
        ]
    )
}

# Keyword Matching Map
KEYWORDS_MAP = {
    "cybersecurity": ["cyber", "security", "hack", "phish", "password", "malware", "privacy", "vpn", "code", "dev", "linux", "bug", "firewall", "encryption"],
    "fitness": ["fitness", "gym", "workout", "muscle", "exercise", "weight", "diet", "protein", "training", "cardio", "runner", "crossfit", "bodybuilding", "athletes"],
    "travel": ["travel", "trip", "flight", "destination", "hotel", "wanderlust", "vacation", "explore", "tourist", "backpack", "adventure", "city", "japan", "europe", "beach", "island"],
    "finance": ["finance", "money", "invest", "stock", "crypto", "bitcoin", "wealth", "trading", "market", "economy", "bank", "budget", "passive income", "millionaire"],
    "space": ["space", "nasa", "galaxy", "planet", "mars", "orbit", "rocket", "astronaut", "universe", "cosmos", "star", "telescope", "alien"],
    "gaming": ["gaming", "game", "esports", "fps", "rpg", "gta", "minecraft", "playstation", "xbox", "steam", "gamer", "streamer", "twitch"],
    "nature": ["nature", "ocean", "forest", "animal", "wildlife", "earth", "climate", "tree", "river", "mountain", "sea", "jungle"],
    "education": ["college", "student", "study", "exam", "school", "university", "learn", "history", "degree", "homework", "tips for students", "mistake"],
    "food": ["food", "cook", "recipe", "chef", "meal", "bake", "restaurant", "delicious", "kitchen", "dinner", "snack", "eat"],
    "music": ["music", "song", "beat", "rap", "hip hop", "instrument", "concert", "dj", "guitar", "piano", "band"],
    "startup": ["startup", "founder", "saas", "venture", "pitch", "business", "entrepreneur", "growth", "mvp"],
    "news": ["news", "breaking", "politics", "election", "war", "report", "crisis", "press", "scandal"],
    "art": ["art", "design", "painting", "fashion", "style", "aesthetic", "draw", "museum", "outfit"],
    "film": ["film", "movie", "cinema", "director", "hollywood", "actor", "scene", "trailer"]
}

def get_theme_for_prompt(prompt: str) -> Theme:
    """Instant local keyword matching for prompt -> Theme."""
    if not prompt or not prompt.strip():
        return THEME_PRESETS["default"]
    
    clean_text = prompt.lower()
    
    # Check specific keyword matches
    best_category = None
    best_score = 0
    
    for category, keywords in KEYWORDS_MAP.items():
        score = sum(1 for kw in keywords if re.search(r"\b" + re.escape(kw) + r"\b", clean_text))
        if score > best_score:
            best_score = score
            best_category = category
            
    if best_category and best_score > 0:
        return THEME_PRESETS.get(best_category, THEME_PRESETS["default"])
        
    # Check if education or cybersecurity matches partials
    if "cyber" in clean_text or "hack" in clean_text:
        return THEME_PRESETS["cybersecurity"]
    if "student" in clean_text or "college" in clean_text:
        return THEME_PRESETS["cybersecurity"] if "cyber" in clean_text else THEME_PRESETS["education"]

    return THEME_PRESETS["default"]
