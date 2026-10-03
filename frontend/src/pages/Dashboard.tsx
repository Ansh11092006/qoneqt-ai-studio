import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BentoGrid } from "@/components/ui/bento-grid";
import { BentoCard } from "@/components/ui/bento-grid-utils/bento-card";
import {
  Wand2, TrendingUp, Palette, UploadCloud, Terminal,
  Film, BarChart3, Globe, Layers, Zap,
} from "lucide-react";
import { CreateCard } from "@/components/dashboard/create-card";
import { TrendingCard } from "@/components/dashboard/trending-card";
import { ThemeCard } from "@/components/dashboard/theme-card";
import { UploadCard } from "@/components/dashboard/upload-card";
import { MonitorCard } from "@/components/dashboard/monitor-card";
import { RecentVideosCard } from "@/components/dashboard/recent-videos-card";
import { useJob } from "@/store/job-context";

export const Dashboard: React.FC = () => {
  const { recentJobs } = useJob();
  const navigate = useNavigate();
  const [externalPrompt, setExternalPrompt] = useState("");
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [scriptText, setScriptText] = useState("");

  const lastJob = recentJobs[0];
  const qcScore = lastJob?.qc_report?.score ?? null;
  const passedChecks = lastJob?.qc_report?.checks.filter((c) => c.passed).length ?? 0;
  const totalChecks = lastJob?.qc_report?.checks.length ?? 0;

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 pb-16 pt-24 space-y-16">
      {/* 1. HERO SECTION (Matching Image 4) */}
      <div className="max-w-4xl mx-auto text-center space-y-6 pt-4 relative z-10">
        <p className="text-xs font-mono font-bold tracking-widest text-[#ff0055] uppercase">
          FREE • NO CODE • LIVE IN SECONDS
        </p>
        <h1 className="font-heading text-5xl sm:text-7xl font-black text-white tracking-tight leading-[1.05]">
          Free AI short video builder and generator <br />
          <span className="text-[#ff0055] drop-shadow-[0_0_35px_rgba(255,0,85,0.6)]">that actually ships.</span>
        </h1>
        <p className="text-white/70 text-base sm:text-xl max-w-2xl mx-auto font-normal leading-relaxed">
          Create professional, short-form 9:16 videos with AI. Describe your idea, preview your storyboard, and ship publish-ready videos with zero editing.
        </p>
        <p className="text-white/40 text-xs font-mono">
          Create high-impact, cinematic 9:16 videos ready for publishing.
        </p>

        {/* Hero Cream Input Card (Matching Image 4 bottom) */}
        <div className="max-w-2xl mx-auto mt-8 p-3 sm:p-4 rounded-[28px] bg-[#ded8d4] text-black shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/20 text-left transition-transform hover:scale-[1.01]">
          <div className="p-3">
            <textarea
              value={externalPrompt}
              onChange={(e) => setExternalPrompt(e.target.value)}
              placeholder="Describe your idea..."
              rows={3}
              className="w-full bg-transparent border-none outline-none text-black placeholder-neutral-500 font-sans text-base sm:text-lg resize-none"
            />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-neutral-300 px-2">
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-neutral-300 text-neutral-600 transition-colors">
                📎
              </button>
              <span className="px-3 py-1 rounded-full bg-neutral-200/80 text-neutral-700 text-xs font-medium">
                Short-form video ▾
              </span>
            </div>
            <button
              onClick={() => {
                if (externalPrompt.trim()) {
                  // scroll to create card or generate
                  const createEl = document.getElementById("create-section");
                  if (createEl) createEl.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="px-6 py-2.5 rounded-full bg-[#ff0055] hover:bg-[#e0004c] text-white font-bold text-sm flex items-center gap-2 shadow-[0_4px_20px_rgba(255,0,85,0.4)] transition-all cursor-pointer"
            >
              <span>Create</span> ➔
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Create Section Anchor */}
      <div id="create-section" className="pt-4">
        <h3 className="font-heading font-black text-2xl text-white text-center mb-6">
          AI Studio <span className="text-[#ff0055]">Interactive Dashboard</span>
        </h3>
      </div>

      <BentoGrid>
        {/* ROW 1 — Create Video (span 2) + Trending + Live Theme */}
        <BentoCard
          title="Create Video"
          description="Enter any topic, paste a script, or pick a trend to start"
          icon={<Wand2 size={16} />}
          colSpan={2}
        >
          <CreateCard
            externalPrompt={externalPrompt}
            assetIds={assetIds}
          />
        </BentoCard>

        <BentoCard
          title="Trending Now"
          description="Tap to auto-fill the prompt box"
          icon={<TrendingUp size={16} />}
          colSpan={1}
        >
          <TrendingCard onSelectPrompt={(t) => setExternalPrompt(t)} />
        </BentoCard>

        <BentoCard
          title="Live Theme"
          description="Updates as you type · Feature A"
          icon={<Palette size={16} />}
          colSpan={1}
        >
          <ThemeCard />
        </BentoCard>

        {/* ROW 2 — Upload Assets (span 2) + Pipeline Monitor (span 2) */}
        <BentoCard
          title="Upload Assets"
          description="Your clips override automatic B-Roll in every scene"
          icon={<UploadCloud size={16} />}
          colSpan={2}
        >
          <UploadCard
            onScriptLoaded={(text) => {
              setScriptText(text);
              setExternalPrompt(text.split("\n")[0].trim().slice(0, 120));
            }}
            onAssetsChanged={setAssetIds}
          />
        </BentoCard>

        <BentoCard
          title="Pipeline Monitor"
          description="7-step diagram · Live SSE telemetry during generation"
          icon={<Terminal size={16} />}
          colSpan={2}
        >
          <MonitorCard />
        </BentoCard>

        {/* ROW 3 — Recent Videos (span 2) + QC Score (span 1) + Global Feed (span 1) */}
        <BentoCard
          title="Recent Videos"
          description="Last 6 renders with QC scores and poster frames"
          icon={<Film size={16} />}
          colSpan={2}
        >
          <RecentVideosCard />
        </BentoCard>

        <BentoCard
          title="QC Score"
          description="Latest video automated quality audit"
          icon={<BarChart3 size={16} />}
          colSpan={1}
        >
          <div className="flex flex-col items-center justify-center h-full py-4 space-y-4">
            {qcScore !== null ? (
              <>
                {/* Score Ring */}
                <div className="relative w-24 h-24">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke="var(--accent)" strokeWidth="8"
                      strokeDasharray={`${(qcScore / 100) * 263.9} 263.9`}
                      strokeLinecap="round"
                      style={{ filter: "drop-shadow(0 0 8px var(--accent))" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="font-heading text-2xl font-black text-white">{qcScore}</span>
                    <span className="text-[9px] font-mono text-white/50">/100</span>
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-xs font-mono text-white/70">{passedChecks}/{totalChecks} checks passed</div>
                  <div className="text-[10px] text-white/40">Latest: {lastJob?.plan?.title?.slice(0, 28) ?? "—"}</div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-white/40 space-y-2">
                <BarChart3 size={28} className="opacity-40" />
                <p className="text-xs">QC report appears<br />after first render</p>
              </div>
            )}
          </div>
        </BentoCard>

        <BentoCard
          title="Global Feed"
          description="Publish to Qoneqt · Prototype integration"
          icon={<Globe size={16} />}
          colSpan={1}
        >
          <div className="flex flex-col h-full justify-between space-y-3">
            <div className="rounded-xl bg-black/40 border border-white/10 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] font-bold text-xs">Q</div>
                <div>
                  <p className="text-[11px] font-bold text-white">Qoneqt Global Feed</p>
                  <p className="text-[9px] text-white/40">Prototype Integration</p>
                </div>
              </div>
              {lastJob?.plan && (
                <p className="text-[11px] text-white/70 line-clamp-2">{lastJob.plan.caption_for_post}</p>
              )}
              {lastJob?.plan?.hashtags && (
                <div className="flex flex-wrap gap-1">
                  {lastJob.plan.hashtags.slice(0, 3).map((h) => (
                    <span key={h} className="text-[9px] font-mono text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded">{h}</span>
                  ))}
                </div>
              )}
            </div>

            {lastJob?.status === "completed" && (
              <button
                onClick={() => navigate(`/result/${lastJob.job_id}`)}
                className="w-full py-2 rounded-xl bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-semibold transition-all"
              >
                View & Publish Last Video →
              </button>
            )}

            <p className="text-[10px] font-mono text-white/30 text-center">Mock publish integration — clearly labeled</p>
          </div>
        </BentoCard>

        {/* ROW 4 — Batch Queue (span 2) + Scalability Visual (span 2) */}
        <BentoCard
          title="Batch Queue"
          description="Up to 10 ideas → 10 videos · 2 concurrent"
          icon={<Layers size={16} />}
          colSpan={2}
        >
          <BatchMiniCard />
        </BentoCard>

        <BentoCard
          title="Scalable Pipeline"
          description="Conceptual illustration"
          icon={<Zap size={16} />}
          colSpan={2}
        >
          <div className="flex flex-col justify-center h-full space-y-3">
            {[
              { label: "1 idea", output: "1 video", delay: 0 },
              { label: "10 ideas", output: "10 videos", delay: 1 },
              { label: "Any topic", output: "Same pipeline", delay: 2 },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/80 min-w-[80px] text-center">
                  {row.label}
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-[var(--accent)] to-transparent opacity-60" />
                <Zap size={14} className="text-[var(--accent)] shrink-0" />
                <div className="flex-1 h-px bg-gradient-to-l from-[var(--accent)] to-transparent opacity-60" />
                <div className="px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-xs font-mono text-[var(--accent)] min-w-[90px] text-center">
                  {row.output}
                </div>
              </div>
            ))}
            <p className="text-[10px] font-mono text-white/30 text-center pt-1">
              Repeatable pipeline · Zero manual steps · FFmpeg + Gemini + edge-tts
            </p>
          </div>
        </BentoCard>
      </BentoGrid>

      {/* 2. THE PROBLEM SECTION: The Fragmented Workflow */}
      <div className="max-w-7xl mx-auto mt-20 mb-16 px-4">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-xs font-mono text-rose-400">
            <span>⚠️ The Bottleneck</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-black text-white">
            The Fragmented Content Nightmare
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            "Creating content is easy. Creating it consistently at scale isn't. The bottleneck is coordinating the workflow."
          </p>
        </div>

        {/* 8-Step Broken Workflow Timeline */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 relative">
          {[
            { step: "01", name: "IDEA", icon: "💡", sub: "Brainstorming" },
            { step: "02", name: "RESEARCH", icon: "🔍", sub: "Manual Search" },
            { step: "03", name: "SCRIPT", icon: "📝", sub: "Copywriting" },
            { step: "04", name: "VISUALS", icon: "🖼️", sub: "Stock Searching" },
            { step: "05", name: "VOICE", icon: "🎙️", sub: "Recording TTS" },
            { step: "06", name: "EDIT", icon: "✂️", sub: "Timeline Splicing" },
            { step: "07", name: "CAPTIONS", icon: "💬", sub: "Syncing Subtitles" },
            { step: "08", name: "PUBLISH", icon: "🚀", sub: "Manual Upload" },
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center relative space-y-2 group hover:border-rose-500/40 transition-all">
              <span className="text-[10px] font-mono text-white/30">{item.step}</span>
              <span className="text-2xl">{item.icon}</span>
              <span className="font-heading font-bold text-xs text-white tracking-wider">{item.name}</span>
              <span className="text-[9px] font-mono text-white/40">{item.sub}</span>
              {idx < 7 && (
                <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-white/20 font-mono text-xs">
                  ➔
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. THE SOLUTION SECTION: The Automated Engine */}
      <div className="max-w-7xl mx-auto my-20 px-4">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-xs font-mono text-[var(--accent)]">
            <span>⚡ Qoneqt AI Engine</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-black text-white">
            One Cohesive System. Zero Juggling.
          </h2>
          <p className="text-white/60 text-sm">
            Replacing disconnected software with a single automated, end-to-end video pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl glass-panel border border-white/10 space-y-4 hover:border-[var(--accent)]/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] text-xl font-bold">
              01
            </div>
            <h3 className="font-heading font-bold text-xl text-white">End-to-End</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              No context switching. Prompts flow seamlessly through scriptwriting, voiceover synthesis, stock clip sourcing, and subtitle burning into a final MP4.
            </p>
          </div>

          <div className="p-8 rounded-3xl glass-panel border border-white/10 space-y-4 hover:border-[var(--accent)]/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] text-xl font-bold">
              02
            </div>
            <h3 className="font-heading font-bold text-xl text-white">Repeatable</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Input any topic, trend, or script and rely on identical studio quality every single time. Scale from 1 video a week to 10 videos a day effortlessly.
            </p>
          </div>

          <div className="p-8 rounded-3xl glass-panel border border-white/10 space-y-4 hover:border-[var(--accent)]/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] text-xl font-bold">
              03
            </div>
            <h3 className="font-heading font-bold text-xl text-white">Qoneqt-Focused</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Native 9:16 vertical ratio, word-highlighted captions, and engaging hooks designed specifically to maximize retention on the Qoneqt Global Feed.
            </p>
          </div>
        </div>
      </div>

      {/* 4. TECHNICAL ARCHITECTURE NODE DIAGRAM */}
      <div className="max-w-7xl mx-auto my-20 px-4">
        <div className="p-8 rounded-3xl glass-panel border border-white/10 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--accent)]">
              Micro-Service Node Flow
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
              Technical Architecture & Transparency
            </h2>
            <p className="text-xs text-white/50">
              Deterministic automated data processing from prompt input to publish-ready video asset
            </p>
          </div>

          {/* Node Diagram Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-center">
            {[
              { title: "User Input", sub: "Topic / Script", icon: "💬" },
              { title: "React + Vite", sub: "Frontend UI", icon: "⚡" },
              { title: "FastAPI", sub: "SSE Orchestrator", icon: "⚙️" },
              { title: "Gemini Flash", sub: "Structured Plan", icon: "🧠" },
              { title: "JSON Schema", sub: "Directorial JSON", icon: "📋" },
              { title: "FFmpeg", sub: "Media Composer", icon: "🎥" },
              { title: "Global Feed", sub: "Published MP4", icon: "🌐" },
            ].map((node, i) => (
              <React.Fragment key={i}>
                <div className="p-4 rounded-2xl bg-black/60 border border-white/15 flex flex-col items-center text-center space-y-1 hover:border-[var(--accent)] transition-all">
                  <span className="text-xl">{node.icon}</span>
                  <span className="font-heading font-bold text-xs text-white leading-tight">{node.title}</span>
                  <span className="text-[9px] font-mono text-[var(--accent)]">{node.sub}</span>
                </div>
                {i < 6 && (
                  <div className="hidden lg:flex items-center justify-center text-[var(--accent)] opacity-60 font-mono text-sm">
                    ➔
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Inline mini batch card to avoid an extra file
const BatchMiniCard: React.FC = () => {
  const [ideas, setIdeas] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [queued, setQueued] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleBatch = async () => {
    const list = ideas.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10);
    if (!list.length) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideas: list }),
      });
      const data = await res.json();
      setQueued(data.job_ids || []);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      <textarea
        value={ideas}
        onChange={(e) => setIdeas(e.target.value)}
        placeholder={"5 Cybersecurity Mistakes College Students Make\n3 Workout Mistakes Killing Your Gains\n3 Hidden Gems in Japan Tourists Miss\n(one idea per line, max 10)"}
        rows={4}
        className="w-full p-3 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-white/30 focus:border-[var(--accent)] focus:outline-none resize-none"
      />
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleBatch}
          disabled={submitting || !ideas.trim()}
          className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-black text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md hover:shadow-[0_0_20px_var(--accent)]"
        >
          {submitting ? "Queuing..." : `Queue ${ideas.split("\n").filter(Boolean).length || 0} Videos`}
        </button>
        {queued.length > 0 && (
          <button onClick={() => navigate("/library")} className="text-xs text-[var(--accent)] hover:underline whitespace-nowrap">
            View {queued.length} in Library →
          </button>
        )}
      </div>
      {queued.length > 0 && (
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {queued.length} jobs queued · 2 concurrent rendering
        </div>
      )}
    </div>
  );
};
