from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field

# Theme Palette & Specification
class Palette(BaseModel):
    bg1: str = Field(description="Primary background color in hex, e.g. #0a0f1d")
    bg2: str = Field(description="Secondary background gradient color in hex, e.g. #111827")
    accent: str = Field(description="Vibrant accent color in hex, e.g. #00ff66")
    text: str = Field(description="High-contrast text color in hex, e.g. #f8fafc")

class Theme(BaseModel):
    mood: str = Field(description="One or two word mood, e.g. Futuristic Cyber, High Energy, Serene")
    palette: Palette
    background_type: Literal[
        "matrix_rain",
        "aurora",
        "particles",
        "stars",
        "sunrise_clouds",
        "embers",
        "neon_grid",
        "waves"
    ]
    loading_style: Literal[
        "terminal",
        "globe",
        "rocket",
        "film_reel",
        "chart",
        "pulse"
    ]
    loading_messages: List[str] = Field(
        description="Exactly 7 short themed loading messages corresponding to the 7 pipeline steps",
        min_length=7,
        max_length=7
    )

# Scene Specification
class Scene(BaseModel):
    id: int
    narration: str = Field(description="Spoken voiceover text for this scene")
    on_screen_text: str = Field(description="Short punchy text shown on screen, max 6 words")
    visual_query: str = Field(description="Search keywords for stock video/photo, 2 to 4 words")
    visual_description: str = Field(description="Detailed visual instruction for scene mood and framing")
    duration_sec: float = Field(description="Scene duration in seconds (typically 3.0 to 7.0)")
    transition: Literal["fade", "cut", "zoom"] = "fade"
    shot_type: Optional[str] = Field(default="Wide Cinematic Shot", description="Cinematic shot category: Drone Shot, Tracking Shot, Orbit Shot, Dolly Zoom, Slow Motion Shot, Close-Up, Wide Cinematic Shot, Establishing Shot, Hero Shot")
    camera_movement: Optional[str] = Field(default="Slow forward push-in", description="Camera trajectory: Pan Left, Crane Up, Orbit 360, Tracking Push")
    color_grade: Optional[str] = Field(default="Cinematic Teal & Orange", description="Color grading palette LUT preset")

# Complete Content Plan
class ContentPlan(BaseModel):
    title: str = Field(description="Engaging video title")
    hook: str = Field(description="Opening hook narration, exactly matches or introduces scene 1")
    language: Literal["en", "hi"] = "en"
    theme: Theme
    scenes: List[Scene] = Field(description="4 to 7 scenes structured for vertical short-form video")
    cta: str = Field(description="Call to action line for the end card and final scene")
    hashtags: List[str] = Field(description="5 to 8 trending hashtags including #qoneqt")
    caption_for_post: str = Field(description="Social caption optimized for the Qoneqt Global Feed")
    director_notes: Optional[str] = Field(default=None, description="Cinematic director notes for pacing, camera, and mood")

# Quality Check Models
class QCCheckItem(BaseModel):
    name: str
    category_id: str = "general"
    status: Literal["passed", "warning", "failed"] = "passed"
    passed: bool = True
    score: int = 95
    detail: str
    fix_action: Optional[str] = None

class QCReport(BaseModel):
    score: int = Field(ge=0, le=100)
    checks: List[QCCheckItem]
    suggestions: List[str] = Field(default_factory=list)
    detected_issues: List[str] = Field(default_factory=list)
    global_ready: bool = False
    brand_safety: str = "Approved"
    content_safety: str = "Approved"
    watermark_applied: bool = True
    platform_optimization: str = "Complete"
    projected_metrics: Dict[str, Any] = Field(default_factory=lambda: {
        "estimated_reach": "250K - 1.2M",
        "audience_match": "98.4%",
        "engagement_prediction": "14.2% CTR",
        "watch_time_prediction": "89% Retention",
        "viral_potential": "Tier 1 Global Discovery"
    })

# Job Request & State Models
class WatermarkConfig(BaseModel):
    type: Literal["qoneqt", "creator", "logo", "text", "hybrid"] = "qoneqt"
    text: str = "Qoneqt AI Studio"
    position: Literal["top-left", "top-right", "bottom-left", "bottom-right", "center"] = "top-right"
    opacity: float = Field(default=0.8, ge=0.0, le=1.0)
    size: Literal["small", "medium", "large"] = "medium"
    animation: Literal["static", "fade-in", "fade-out", "pulse", "glow"] = "static"

class RegenerateRequest(BaseModel):
    components: List[Literal["full", "hook", "script", "scenes", "voice", "music", "captions", "thumbnail", "intro", "outro", "cta", "visual_style", "watermark"]]
    scene_ids: Optional[List[int]] = None  # for targeted scene regeneration
    watermark_config: Optional[WatermarkConfig] = None

class SceneDiagnosis(BaseModel):
    scene_id: int
    issues: List[str]
    severity: Literal["ok", "warning", "error"]
    ai_score: int
    recommendation: str

class VideoDiagnosis(BaseModel):
    overall_score: int
    scene_diagnoses: List[SceneDiagnosis]
    estimated_fix_time_sec: int
    estimated_quality_after: int
    auto_fixable: bool

class JobOptions(BaseModel):
    duration: int = 30  # 15, 30, 45, 60
    tone: Literal["Educational", "Hype", "Storytelling", "News", "Calm"] = "Educational"
    language: Literal["en", "hi"] = "en"
    voice: Literal["M", "F"] = "M"
    asset_ids: List[str] = Field(default_factory=list)
    aspect_ratio: str = "9:16"  # 9:16, 1:1, 4:5, 16:9, 21:9, 16:10, 2:3, 1.91:1, custom
    resolution: str = "1080p"   # 720p, 1080p, 1440p, 4K, 8K
    custom_width: Optional[int] = 1080
    custom_height: Optional[int] = 1920
    generate_all_formats: bool = False
    category: str = "Published" # Draft, Published, Scheduled, Archived
    watermark: bool = True
    watermark_config: Optional[WatermarkConfig] = None
    video_style: str = "Cinematic" # Cinematic, Hollywood, Documentary, Luxury Brand Ad, Cyberpunk, Sci-Fi, Anime, Realistic, Corporate, Travel, Technology, Sports, Product Launch
    music_style: str = "Cinematic" # Epic, Inspirational, Corporate, Cinematic, Emotional, Sci-Fi, Luxury
    voice_style: str = "Storytelling" # Documentary, Energetic, Luxury, Storytelling, Professional
    is_cinematic_director: bool = False

class CreateJobRequest(BaseModel):
    mode: Literal["topic", "script", "trending"] = "topic"
    input: str
    options: JobOptions = Field(default_factory=JobOptions)

class JobStatus(BaseModel):
    job_id: str
    mode: str
    input: str
    options: JobOptions
    status: Literal["queued", "running", "completed", "failed"]
    current_step: Optional[str] = None
    step_status: Optional[str] = None
    message: Optional[str] = None
    elapsed_sec: float = 0.0
    plan: Optional[ContentPlan] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    master_video_url: Optional[str] = None
    watermark_applied: bool = False
    qc_report: Optional[QCReport] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str

# AI Command Center Data Models
class CommunityInsight(BaseModel):
    topic: str
    sentiment_positive: float
    sentiment_neutral: float
    sentiment_negative: float
    volume_mentions: int
    trending_keywords: List[str]
    popular_opinions: List[str]
    audience_demographic: Dict[str, int]
    virality_potential: int

class TrendRadarItem(BaseModel):
    id: str
    keyword: str
    category: str
    velocity_score: int
    search_growth_pct: int
    opportunity_score: int
    difficulty: Literal["Low", "Medium", "High"]
    recommended_angle: str

class RetentionPoint(BaseModel):
    sec: int
    retention: int

class ViralSimulation(BaseModel):
    prompt: str
    hook_strength: int
    retention_predicted_pct: int
    shareability_score: int
    replay_score: int
    emotional_resonance: int
    curiosity_gap: int
    estimated_views_tier: str
    retention_curve: List[RetentionPoint]
    recommended_hook_upgrades: List[str]

class StorySeriesItem(BaseModel):
    episode: int
    title: str
    hook: str
    concept: str
    cliffhanger: str
    target_aspect: str

class StoryUniverse(BaseModel):
    root_topic: str
    universe_title: str
    episodes: List[StorySeriesItem]
    franchise_potential: int
    audience_hook: str

class MultiPlatformAdaptation(BaseModel):
    platform: Literal["YouTube Shorts", "Instagram Reels", "TikTok", "LinkedIn", "Facebook"]
    aspect_ratio: str
    optimal_length_sec: int
    hook_format: str
    recommended_hashtags: List[str]
    caption_style: str
    pacing_multiplier: float

