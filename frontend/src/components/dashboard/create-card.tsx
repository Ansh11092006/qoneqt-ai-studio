import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Film, ArrowRight, Loader2, Video, Camera,
  Shield, Check, Droplets, Sliders, RefreshCw, Wand2, Eye,
  Layers, Clock, Monitor
} from "lucide-react";
import {
  generateRealVideo, GenerateVideoPayload, fetchProviderStatus,
  ProviderStatus, WatermarkPayload
} from "@/api/client";

interface CreateCardProps {
  onScriptPasted?: (text: string) => void;
  externalPrompt?: string;
  assetIds?: string[];
}

const STYLES = [
  { id: "Cinematic", label: "Cinematic", emoji: "🎬", desc: "8K 35mm film grain, anamorphic flare" },
  { id: "Anime", label: "Anime", emoji: "🌸", desc: "Studio Ghibli & Makoto Shinkai cel shading" },
  { id: "3D Animation", label: "3D Animation", emoji: "🧸", desc: "Pixar & DreamWorks raytraced Octane" },
  { id: "Realistic", label: "Realistic", emoji: "📸", desc: "Raw photo natural ambient documentary" },
  { id: "Fantasy", label: "Fantasy", emoji: "✨", desc: "Mystical volumetric glow & particles" },
  { id: "Sci-fi", label: "Sci-fi", emoji: "🚀", desc: "Cyberpunk neon & holographic reflections" },
  { id: "Product Ad", label: "Product Ad", emoji: "💎", desc: "Apple commercial macro studio lighting" },
] as const;

const CAMERA_MOTIONS = [
  { id: "Slow zoom", label: "Slow Zoom", icon: "🔍", desc: "Dramatic focal push-in" },
  { id: "Drone shot", label: "Drone Shot", icon: "🚁", desc: "Sweeping aerial perspective" },
  { id: "Tracking shot", label: "Tracking Shot", icon: "🏃", desc: "Seamless motion following" },
  { id: "Orbit", label: "Orbit 360°", icon: "🔄", desc: "Smooth orbital rotation" },
  { id: "Pan", label: "Cinematic Pan", icon: "↔️", desc: "Fluid horizontal landscape" },
  { id: "Handheld", label: "Handheld", icon: "📹", desc: "Organic realistic camera shake" },
] as const;

export const CreateCard: React.FC<CreateCardProps> = ({
  externalPrompt,
}) => {
  const navigate = useNavigate();

  // Video Options State
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<GenerateVideoPayload["style"]>("Cinematic");
  const [cameraMotion, setCameraMotion] = useState<GenerateVideoPayload["camera_motion"]>("Slow zoom");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");

  // Watermark Settings State
  const [showWatermarkSettings, setShowWatermarkSettings] = useState(false);
  const [watermark, setWatermark] = useState<WatermarkPayload>({
    enabled: true,
    text: "Qoneqt.ai",
    position: "bottom-right",
    opacity: 0.6,
    size: "medium",
  });

  // System State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  useEffect(() => {
    fetchProviderStatus().then(setProviderStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (externalPrompt) {
      setPrompt(externalPrompt);
    }
  }, [externalPrompt]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const payload: GenerateVideoPayload = {
        prompt: prompt.trim(),
        style,
        camera_motion: cameraMotion,
        duration,
        aspect_ratio: aspectRatio,
        watermark,
      };

      const result = await generateRealVideo(payload);
      if (result.job_id) {
        navigate(`/result/${result.job_id}`);
      }
    } catch (err: any) {
      console.error("Video generation request failed", err);
      setError(err.message || "Failed to generate video. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleGenerate} className="flex flex-col space-y-6">
      {/* ── Search Engine Style Prompt Bar ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono uppercase tracking-widest text-white/50 flex items-center gap-2">
            <Sparkles size={14} className="text-[#ff0055]" />
            AI Video Search & Prompt Engine
          </label>

          {/* Provider status badges */}
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className={`px-2 py-0.5 rounded-full border ${
              providerStatus?.gemini.connected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-white/5 text-white/40 border-white/10"
            }`}>
              {providerStatus?.gemini.connected ? "✓ Gemini AI Connected" : "Gemini: Prompt Engine"}
            </span>

            <span className={`px-2 py-0.5 rounded-full border ${
              providerStatus?.pexels.connected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-white/5 text-white/40 border-white/10"
            }`}>
              {providerStatus?.pexels.connected ? "✓ Pexels B-Roll Active" : "Cinematic Fallback Active"}
            </span>
          </div>
        </div>

        {/* Large Search Box */}
        <div className="relative group">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Describe any scene... e.g. 'A futuristic cyberpunk city in rain with neon flying cars' or 'A magical ancient forest with glowing blue deer'..."
            rows={3}
            className="w-full p-4 pr-32 rounded-2xl bg-black/60 border border-white/15 text-sm text-white placeholder-white/30 focus:border-[#ff0055] focus:outline-none focus:ring-1 focus:ring-[#ff0055] transition-all resize-none shadow-inner"
          />

          <button
            type="submit"
            disabled={!prompt.trim() || loading}
            className="absolute right-3 bottom-4 px-5 py-2.5 rounded-xl bg-[#ff0055] hover:bg-[#e0004c] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,0,85,0.4)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Directing...</span>
              </>
            ) : (
              <>
                <span>Generate</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="text-xs text-rose-400 font-mono bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
            ⚠ {error}
          </p>
        )}
      </div>

      {/* ── Visual Style Selector ── */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-widest text-white/50 block">
          1. Select Visual Style
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyle(s.id)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                style === s.id
                  ? "bg-[#ff0055]/15 border-[#ff0055] shadow-[0_0_15px_rgba(255,0,85,0.2)]"
                  : "bg-white/[0.03] border-white/8 hover:border-white/20 text-white/60 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{s.emoji}</span>
                {style === s.id && <Check size={12} className="text-[#ff0055]" />}
              </div>
              <p className="text-xs font-bold text-white mt-1.5">{s.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Camera Motion & Format Matrix ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Camera Motion */}
        <div className="space-y-2 md:col-span-1">
          <label className="text-xs font-mono uppercase tracking-widest text-white/50 flex items-center gap-1.5">
            <Camera size={13} /> 2. Camera Motion
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {CAMERA_MOTIONS.map((cm) => (
              <button
                key={cm.id}
                type="button"
                onClick={() => setCameraMotion(cm.id)}
                className={`p-2 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                  cameraMotion === cm.id
                    ? "bg-[#ff0055]/15 border-[#ff0055] text-white font-bold"
                    : "bg-white/[0.03] border-white/8 text-white/60 hover:text-white"
                }`}
              >
                <span>{cm.icon} {cm.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-widest text-white/50 flex items-center gap-1.5">
            <Monitor size={13} /> 3. Aspect Ratio
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "16:9", label: "16:9 Landscape", sub: "YouTube / TV" },
              { id: "9:16", label: "9:16 Vertical", sub: "TikTok / Reels" },
              { id: "1:1", label: "1:1 Square", sub: "Instagram Feed" },
            ].map((ar) => (
              <button
                key={ar.id}
                type="button"
                onClick={() => setAspectRatio(ar.id as any)}
                className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer ${
                  aspectRatio === ar.id
                    ? "bg-[#ff0055]/15 border-[#ff0055] text-white font-bold"
                    : "bg-white/[0.03] border-white/8 text-white/60 hover:text-white"
                }`}
              >
                <p className="text-xs font-bold text-white">{ar.id}</p>
                <p className="text-[9px] text-white/40">{ar.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-widest text-white/50 flex items-center gap-1.5">
            <Clock size={13} /> 4. Duration
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { sec: 5, label: "5 Seconds", desc: "Ultra-fast dynamic shot" },
              { sec: 10, label: "10 Seconds", desc: "Extended cinematic scene" },
            ].map((d) => (
              <button
                key={d.sec}
                type="button"
                onClick={() => setDuration(d.sec as any)}
                className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer ${
                  duration === d.sec
                    ? "bg-[#ff0055]/15 border-[#ff0055] text-white font-bold"
                    : "bg-white/[0.03] border-white/8 text-white/60 hover:text-white"
                }`}
              >
                <p className="text-xs font-bold text-white">{d.label}</p>
                <p className="text-[9px] text-white/40">{d.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Watermark Settings (Burned in via FFmpeg) ── */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/8 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-[#ff0055]" />
            <span className="text-xs font-bold text-white">FFmpeg Watermark Engine</span>
            <span className="text-[10px] text-white/40 font-mono">Burned into final video file</span>
          </div>

          <button
            type="button"
            onClick={() => setShowWatermarkSettings(!showWatermarkSettings)}
            className="text-xs text-[#ff0055] hover:underline font-mono"
          >
            {showWatermarkSettings ? "Hide Settings" : "Configure Watermark"}
          </button>
        </div>

        {showWatermarkSettings && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-white/5">
            {/* Enabled */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-white/40 block">ENABLE WATERMARK</span>
              <button
                type="button"
                onClick={() => setWatermark(w => ({ ...w, enabled: !w.enabled }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  watermark.enabled ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-white/5 text-white/40 border-white/10"
                }`}
              >
                {watermark.enabled ? "✓ Enabled" : "✕ Disabled"}
              </button>
            </div>

            {/* Text */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-white/40 block">WATERMARK TEXT</span>
              <input
                type="text"
                value={watermark.text}
                onChange={(e) => setWatermark(w => ({ ...w, text: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#ff0055]"
              />
            </div>

            {/* Position */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-white/40 block">POSITION</span>
              <select
                value={watermark.position}
                onChange={(e) => setWatermark(w => ({ ...w, position: e.target.value as any }))}
                className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white focus:outline-none"
              >
                <option value="bottom-right" className="bg-neutral-900">Bottom Right</option>
                <option value="bottom-left" className="bg-neutral-900">Bottom Left</option>
                <option value="top-right" className="bg-neutral-900">Top Right</option>
                <option value="top-left" className="bg-neutral-900">Top Left</option>
                <option value="center" className="bg-neutral-900">Center</option>
              </select>
            </div>

            {/* Opacity & Size */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-white/40 block">OPACITY & SIZE</span>
              <div className="flex gap-2">
                <select
                  value={watermark.opacity}
                  onChange={(e) => setWatermark(w => ({ ...w, opacity: parseFloat(e.target.value) }))}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value={0.3} className="bg-neutral-900">30% Opacity</option>
                  <option value={0.5} className="bg-neutral-900">50% Opacity</option>
                  <option value={0.7} className="bg-neutral-900">70% Opacity</option>
                  <option value={1.0} className="bg-neutral-900">100% Solid</option>
                </select>

                <select
                  value={watermark.size}
                  onChange={(e) => setWatermark(w => ({ ...w, size: e.target.value as any }))}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="small" className="bg-neutral-900">Small</option>
                  <option value="medium" className="bg-neutral-900">Medium</option>
                  <option value="large" className="bg-neutral-900">Large</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};
