import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Film, Mic, Music, Camera, Palette, Clock, Layers,
  Type, Wand2, Zap, Globe, Monitor, Clapperboard, Video,
  Rocket, ShoppingBag, Tv, Smartphone, AudioLines, ScanLine,
  Check, Brain, Eye, Settings, Shield
} from "lucide-react";
import { CreateCard } from "@/components/dashboard/create-card";
import { UploadCard } from "@/components/dashboard/upload-card";

/* ═══════════════════════════════════════════════════════
   13-STEP PIPELINE
   ═══════════════════════════════════════════════════════ */
const PIPELINE_STEPS = [
  { id: 1, label: "Understand", icon: <Brain size={12} /> },
  { id: 2, label: "Concept", icon: <Sparkles size={12} /> },
  { id: 3, label: "Script", icon: <Type size={12} /> },
  { id: 4, label: "Storyboard", icon: <Layers size={12} /> },
  { id: 5, label: "Visuals", icon: <Eye size={12} /> },
  { id: 6, label: "Camera", icon: <Camera size={12} /> },
  { id: 7, label: "Voice", icon: <Mic size={12} /> },
  { id: 8, label: "Music", icon: <Music size={12} /> },
  { id: 9, label: "SFX", icon: <AudioLines size={12} /> },
  { id: 10, label: "Captions", icon: <Type size={12} /> },
  { id: 11, label: "MoGraph", icon: <ScanLine size={12} /> },
  { id: 12, label: "Preview", icon: <Monitor size={12} /> },
  { id: 13, label: "Render", icon: <Film size={12} /> },
];

/* ═══════════════════════════════════════════════════════
   GENERATION MODES
   ═══════════════════════════════════════════════════════ */
const GEN_MODES = [
  { id: "quick", label: "Quick Video", emoji: "⚡", color: "#f59e0b" },
  { id: "cinematic", label: "Cinematic", emoji: "🎬", color: "#ff0055" },
  { id: "documentary", label: "Documentary", emoji: "📽️", color: "#8b5cf6" },
  { id: "product", label: "Product Ad", emoji: "🏷️", color: "#06b6d4" },
  { id: "youtube", label: "YouTube", emoji: "📺", color: "#ef4444" },
  { id: "tiktok", label: "TikTok Viral", emoji: "🎵", color: "#00f2ea" },
  { id: "reel", label: "Instagram Reel", emoji: "📱", color: "#e1306c" },
  { id: "global", label: "Qoneqt Global", emoji: "🌐", color: "#ffd700" },
];

/* ═══════════════════════════════════════════════════════
   QUALITY BADGES
   ═══════════════════════════════════════════════════════ */
const QUALITY_BADGES = [
  "Ultra HD", "4K", "60 FPS", "HDR", "Pro Color Grade", "Cinematic DOF", "Film Look",
];

/* ═══════════════════════════════════════════════════════
   AI DIRECTOR DECISIONS
   ═══════════════════════════════════════════════════════ */
const DIRECTOR_DECISIONS = [
  { label: "Visual Style", value: "Cinematic Film", icon: <Palette size={13} /> },
  { label: "Camera Angles", value: "Cinematic Mix", icon: <Camera size={13} /> },
  { label: "Story Flow", value: "Rising → Climax", icon: <Layers size={13} /> },
  { label: "Scene Timing", value: "Dynamic Pacing", icon: <Clock size={13} /> },
  { label: "Music Mood", value: "Cinematic Ambient", icon: <Music size={13} /> },
  { label: "Editing Style", value: "Hollywood Cut", icon: <Clapperboard size={13} /> },
];

export const CreatePage: React.FC = () => {
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [externalPrompt, setExternalPrompt] = useState("");
  const [selectedMode, setSelectedMode] = useState("cinematic");

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Premium Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ff0055]/10 border border-[#ff0055]/30 text-xs font-mono text-[#ff0055]">
            <Film size={12} /> CINEMATIC AI DIRECTOR · ACTIVE
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-white tracking-tight">
            Qoneqt <span className="text-[#ff0055]">Cinematic AI Director</span>
          </h1>
          <p className="text-white/40 text-sm max-w-xl mx-auto">
            One prompt. Complete professional video. Automatically. 13-stage AI pipeline transforms your vision into cinematic reality.
          </p>
        </motion.div>

        {/* ── 13-Step Pipeline Strip ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-x-auto scrollbar-none"
        >
          <div className="flex items-center gap-1 py-2 min-w-max mx-auto justify-center">
            {PIPELINE_STEPS.map((step, i) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8 text-[10px] font-mono text-white/40 whitespace-nowrap transition-all hover:bg-white/8 hover:text-white/60">
                  <span className="text-white/25">{step.icon}</span>
                  <span>{step.label}</span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="w-3 h-px bg-white/10 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>

        {/* ── Generation Modes ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest text-center">Generation Mode</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {GEN_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  selectedMode === mode.id
                    ? "text-white"
                    : "text-white/40 border-white/10 hover:border-white/20 hover:text-white/60"
                }`}
                style={selectedMode === mode.id ? {
                  borderColor: `${mode.color}50`,
                  background: `${mode.color}15`,
                  boxShadow: `0 0 15px ${mode.color}15`,
                } : {}}
              >
                <span>{mode.emoji}</span> {mode.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Main Create Form ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6 shadow-2xl"
          style={{ boxShadow: "0 0 40px rgba(255,0,85,0.05)" }}
        >
          <CreateCard externalPrompt={externalPrompt} assetIds={assetIds} />
        </motion.div>

        {/* ── AI Director Panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 justify-center">
            <Settings size={12} className="text-[#ff0055]" />
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">AI Director Decisions</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {DIRECTOR_DECISIONS.map((d, i) => (
              <motion.div
                key={d.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/8 text-center space-y-1 hover:border-white/15 transition-all"
              >
                <div className="flex items-center justify-center text-white/30">{d.icon}</div>
                <p className="text-[9px] text-white/30 font-mono uppercase">{d.label}</p>
                <p className="text-[10px] text-white/70 font-semibold">{d.value}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Quality Badges ── */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {QUALITY_BADGES.map((badge) => (
            <span key={badge} className="px-2 py-0.5 rounded-full text-[9px] font-mono text-white/30 bg-white/5 border border-white/8">
              {badge}
            </span>
          ))}
        </div>

        {/* ── Upload Assets ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-6"
        >
          <h2 className="font-heading font-bold text-white text-lg mb-4">
            Upload Assets <span className="text-white/30 text-sm font-normal">(optional)</span>
          </h2>
          <UploadCard
            onScriptLoaded={(text) => setExternalPrompt(text.split("\n")[0].trim().slice(0, 120))}
            onAssetsChanged={setAssetIds}
          />
        </motion.div>

        {/* ── Watermark Notice ── */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-[10px] text-white/25 font-mono">
            <Shield size={10} />
            All generated videos include QONEQT watermark
          </div>
          <p className="text-[10px] text-white/20 font-mono">
            Pipeline: Prompt → AI Research → Script → Storyboard → Visual Gen → Voice → Animation → Editing → QC → Final Render
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
