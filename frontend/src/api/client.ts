export interface Palette {
  bg1: string;
  bg2: string;
  accent: string;
  text: string;
}

export interface Theme {
  mood: string;
  palette: Palette;
  background_type:
    | "matrix_rain"
    | "aurora"
    | "particles"
    | "stars"
    | "sunrise_clouds"
    | "embers"
    | "neon_grid"
    | "waves";
  loading_style: "terminal" | "globe" | "rocket" | "film_reel" | "chart" | "pulse";
  loading_messages: string[];
}

export interface Scene {
  id: number;
  narration: string;
  on_screen_text: string;
  visual_query: string;
  visual_description: string;
  duration_sec: number;
  transition: "fade" | "cut" | "zoom";
  shot_type?: string;
  camera_movement?: string;
  color_grade?: string;
}

export interface ContentPlan {
  title: string;
  hook: string;
  language: "en" | "hi";
  theme: Theme;
  scenes: Scene[];
  cta: string;
  hashtags: string[];
  caption_for_post: string;
  director_notes?: string;
}

export interface QCCheckItem {
  name: string;
  category_id: string;
  status: "passed" | "warning" | "failed";
  passed: boolean;
  score: number;
  detail: string;
  fix_action?: string;
}

export interface QCReport {
  score: number;
  checks: QCCheckItem[];
  suggestions: string[];
  detected_issues?: string[];
  global_ready?: boolean;
  brand_safety?: string;
  content_safety?: string;
  watermark_applied?: boolean;
  platform_optimization?: string;
  projected_metrics?: {
    estimated_reach: string;
    audience_match: string;
    engagement_prediction: string;
    watch_time_prediction: string;
    viral_potential: string;
  };
}

export interface JobOptions {
  duration: number;
  tone: "Educational" | "Hype" | "Storytelling" | "News" | "Calm";
  language: "en" | "hi";
  voice: "M" | "F";
  asset_ids: string[];
  aspect_ratio?: string;
  resolution?: string;
  custom_width?: number;
  custom_height?: number;
  generate_all_formats?: boolean;
  category?: string;
  watermark?: boolean;
  watermark_config?: WatermarkConfig;
  video_style?: string;
  music_style?: string;
  voice_style?: string;
  is_cinematic_director?: boolean;
}

export interface WatermarkConfig {
  type: "qoneqt" | "creator" | "logo" | "text" | "hybrid";
  text: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  opacity: number;
  size: "small" | "medium" | "large";
  animation: "static" | "fade-in" | "fade-out" | "pulse" | "glow";
}

export interface RegenerateRequest {
  components: Array<"full" | "hook" | "script" | "scenes" | "voice" | "music" | "captions" | "thumbnail" | "intro" | "outro" | "cta" | "visual_style" | "watermark">;
  scene_ids?: number[];
  watermark_config?: WatermarkConfig;
}

export interface SceneDiagnosis {
  scene_id: number;
  issues: string[];
  severity: "ok" | "warning" | "error";
  ai_score: number;
  recommendation: string;
}

export interface VideoDiagnosis {
  overall_score: number;
  scene_diagnoses: SceneDiagnosis[];
  estimated_fix_time_sec: number;
  estimated_quality_after: number;
  auto_fixable: boolean;
}

export interface JobStatus {
  job_id: string;
  mode: string;
  input: string;
  options: JobOptions;
  status: "queued" | "running" | "completed" | "failed";
  current_step?: string;
  step_status?: string;
  message?: string;
  elapsed_sec: number;
  plan?: ContentPlan;
  video_url?: string;
  thumbnail_url?: string;
  master_video_url?: string;
  watermark_applied?: boolean;
  qc_report?: QCReport;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface TrendingChip {
  id: string;
  label: string;
  category: string;
}

const API_BASE = "";

export async function fetchTheme(prompt: string): Promise<Theme> {
  const res = await fetch(`${API_BASE}/api/theme`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("Failed to detect theme");
  return res.json();
}

export async function createJob(
  input: string,
  mode: "topic" | "script" | "trending" = "topic",
  options: Partial<JobOptions> = {}
): Promise<{ job_id: string; status: string }> {
  const defaultOpts: JobOptions = {
    duration: 30,
    tone: "Educational",
    language: "en",
    voice: "M",
    asset_ids: [],
    ...options,
  };
  const res = await fetch(`${API_BASE}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, input, options: defaultOpts }),
  });
  if (!res.ok) throw new Error("Failed to create video job");
  return res.json();
}

export async function getJob(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
  if (!res.ok) throw new Error("Failed to load job");
  return res.json();
}

export async function listJobs(limit = 15): Promise<JobStatus[]> {
  const res = await fetch(`${API_BASE}/api/jobs?limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTrending(): Promise<TrendingChip[]> {
  const res = await fetch(`${API_BASE}/api/trending`);
  if (!res.ok) return [];
  return res.json();
}

export async function uploadAsset(file: File): Promise<{
  asset_id: string;
  kind: "script" | "media" | "logo";
  url: string;
  text?: string;
}> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/uploads`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function publishVideo(jobId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/publish/${jobId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to publish video");
  return res.json();
}

export async function createBatchJobs(
  ideas: string[],
  options?: Partial<JobOptions>
): Promise<{ job_ids: string[]; queued_count: number }> {
  const res = await fetch(`${API_BASE}/api/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ideas, options }),
  });
  if (!res.ok) throw new Error("Failed to queue batch jobs");
  return res.json();
}

export async function deleteJob(jobId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
    method: "DELETE",
  });
  return res.ok;
}

export async function deleteJobsBatch(jobIds: string[]): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/jobs/batch-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_ids: jobIds }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.deleted_ids || [];
}

export async function duplicateJob(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/duplicate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to duplicate job");
  return res.json();
}

export async function diagnoseJob(jobId: string): Promise<VideoDiagnosis> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/diagnose`);
  if (!res.ok) throw new Error("Failed to diagnose video");
  return res.json();
}

export async function regenerateJob(
  jobId: string,
  request: RegenerateRequest
): Promise<{ status: string; new_job_id?: string; components?: string[] }> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error("Failed to trigger regeneration");
  return res.json();
}

export async function applyWatermark(
  jobId: string,
  config: WatermarkConfig
): Promise<{ status: string; job_id: string }> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/apply-watermark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("Failed to apply watermark");
  return res.json();
}

// ---- AI COMMAND CENTER INTERFACES & APIS ----

export interface CommunityInsight {
  topic: string;
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
  volume_mentions: number;
  trending_keywords: string[];
  popular_opinions: string[];
  audience_demographic: Record<string, number>;
  virality_potential: number;
}

export interface TrendRadarItem {
  id: string;
  keyword: string;
  category: string;
  velocity_score: number;
  search_growth_pct: number;
  opportunity_score: number;
  difficulty: "Low" | "Medium" | "High";
  recommended_angle: string;
}

export interface ViralSimulation {
  prompt: string;
  hook_strength: number;
  retention_predicted_pct: number;
  shareability_score: number;
  replay_score: number;
  emotional_resonance: number;
  curiosity_gap: number;
  estimated_views_tier: string;
  retention_curve: Array<{ sec: number; retention: number }>;
  recommended_hook_upgrades: string[];
}

export interface StorySeriesItem {
  episode: number;
  title: string;
  hook: string;
  concept: string;
  cliffhanger: string;
  target_aspect: string;
}

export interface StoryUniverse {
  root_topic: string;
  universe_title: string;
  episodes: StorySeriesItem[];
  franchise_potential: number;
  audience_hook: string;
}

export interface MultiPlatformAdaptation {
  platform: "YouTube Shorts" | "Instagram Reels" | "TikTok" | "LinkedIn" | "Facebook";
  aspect_ratio: string;
  optimal_length_sec: number;
  hook_format: string;
  recommended_hashtags: string[];
  caption_style: string;
  pacing_multiplier: number;
}

export async function fetchCommunityIntelligence(): Promise<CommunityInsight[]> {
  const res = await fetch(`${API_BASE}/api/command-center/community`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTrendRadar(): Promise<TrendRadarItem[]> {
  const res = await fetch(`${API_BASE}/api/command-center/trends`);
  if (!res.ok) return [];
  return res.json();
}

export async function simulateViralDNA(prompt: string): Promise<ViralSimulation> {
  const res = await fetch(`${API_BASE}/api/command-center/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("Failed to simulate viral DNA");
  return res.json();
}

export async function generateStoryUniverse(prompt: string): Promise<StoryUniverse> {
  const res = await fetch(`${API_BASE}/api/command-center/universe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("Failed to generate story universe");
  return res.json();
}

export async function fetchMultiPlatformIntelligence(): Promise<MultiPlatformAdaptation[]> {
  const res = await fetch(`${API_BASE}/api/command-center/multiplatform`);
  if (!res.ok) return [];
  return res.json();
}

export async function autoFixQC(jobId: string): Promise<QCReport> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/qc-autofix`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to auto-fix QC issues");
  return res.json();
}

export interface ProviderStatus {
  gemini: {
    connected: boolean;
    model: string;
    status: string;
  };
  pexels: {
    connected: boolean;
    status: string;
  };
  demo_mode: boolean;
}

export interface WatermarkPayload {
  enabled: boolean;
  text: string;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";
  opacity: number;
  size: "small" | "medium" | "large";
}

export interface GenerateVideoPayload {
  prompt: string;
  style: "Cinematic" | "Anime" | "3D Animation" | "Realistic" | "Fantasy" | "Sci-fi" | "Product Ad";
  camera_motion: "Slow zoom" | "Drone shot" | "Tracking shot" | "Orbit" | "Pan" | "Handheld";
  duration: 5 | 10;
  aspect_ratio: "16:9" | "9:16" | "1:1";
  watermark?: WatermarkPayload;
}

export interface VideoJobResponse {
  job_id: string;
  status: "queued" | "enhancing_prompt" | "generating_video" | "downloading_video" | "applying_watermark" | "completed" | "failed";
  progress: number;
  prompt: string;
  enhanced_prompt?: string;
  style?: string;
  camera_motion?: string;
  duration?: number;
  aspect_ratio?: string;
  video_url?: string;
  watermarked_video_url?: string;
  thumbnail_url?: string;
  provider_used?: string;
  error?: string;
}

export async function generateRealVideo(payload: GenerateVideoPayload): Promise<{ job_id: string; status: string }> {
  const res = await fetch(`${API_BASE}/api/generate-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create video generation job" }));
    throw new Error(err.detail || "Video generation request failed");
  }
  return res.json();
}

export async function fetchVideoStatus(jobId: string): Promise<VideoJobResponse> {
  const res = await fetch(`${API_BASE}/api/video-status/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch video status");
  return res.json();
}

export async function fetchProviderStatus(): Promise<ProviderStatus> {
  const res = await fetch(`${API_BASE}/api/providers/status`);
  if (!res.ok) throw new Error("Failed to fetch provider status");
  return res.json();
}






