import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar, Radio, Cpu, Sparkles, Activity, Globe, Zap,
  TrendingUp, Shield, Film, Layers, Play, CheckCircle2,
  Share2, Eye, Compass, ArrowUpRight, ChevronRight, BarChart3,
  Sliders, Search, RefreshCw, Plus, Folder, LayoutTemplate,
  Image as ImageIcon, BarChart2, Settings, Terminal, Award
} from "lucide-react";
import {
  fetchCommunityIntelligence, fetchTrendRadar, simulateViralDNA,
  generateStoryUniverse, fetchMultiPlatformIntelligence,
  CommunityInsight, TrendRadarItem, ViralSimulation,
  StoryUniverse, MultiPlatformAdaptation
} from "@/api/client";
import { useJob } from "@/store/job-context";

type ActiveTab =
  | "radar"
  | "community"
  | "viral_dna"
  | "story_universe"
  | "director"
  | "multiplatform"
  | "quality";

export const CommandCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { startJob } = useJob();

  // State
  const [activeTab, setActiveTab] = useState<ActiveTab>("radar");
  const [trends, setTrends] = useState<TrendRadarItem[]>([]);
  const [community, setCommunity] = useState<CommunityInsight[]>([]);
  const [multiplatform, setMultiplatform] = useState<MultiPlatformAdaptation[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulator & Universe Input State
  const [simPrompt, setSimPrompt] = useState("Create a cinematic video about a futuristic cybersecurity city protected by AI");
  const [simResult, setSimResult] = useState<ViralSimulation | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const [universePrompt, setUniversePrompt] = useState("5 Cybersecurity Mistakes College Students Make");
  const [universeResult, setUniverseResult] = useState<StoryUniverse | null>(null);
  const [universeLoading, setUniverseLoading] = useState(false);

  const [launchingJob, setLaunchingJob] = useState<string | null>(null);

  // Load initial intelligence feeds
  useEffect(() => {
    const loadFeeds = async () => {
      setLoading(true);
      try {
        const [tData, cData, mData] = await Promise.all([
          fetchTrendRadar(),
          fetchCommunityIntelligence(),
          fetchMultiPlatformIntelligence(),
        ]);
        setTrends(tData);
        setCommunity(cData);
        setMultiplatform(mData);
      } catch (e) {
        console.error("Failed to load command center intelligence", e);
      } finally {
        setLoading(false);
      }
    };
    loadFeeds();
  }, []);

  // Run initial simulator
  useEffect(() => {
    handleRunSimulation();
    handleGenerateUniverse();
  }, []);

  const handleRunSimulation = async (customPrompt?: string) => {
    const p = customPrompt || simPrompt;
    if (!p.trim()) return;
    setSimLoading(true);
    try {
      const res = await simulateViralDNA(p);
      setSimResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  };

  const handleGenerateUniverse = async (customPrompt?: string) => {
    const p = customPrompt || universePrompt;
    if (!p.trim()) return;
    setUniverseLoading(true);
    try {
      const res = await generateStoryUniverse(p);
      setUniverseResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setUniverseLoading(false);
    }
  };

  const handleLaunchPipeline = async (promptText: string, options?: any) => {
    setLaunchingJob(promptText);
    try {
      const jobId = await startJob(promptText, "topic", {
        duration: 30,
        video_style: "Cinematic",
        music_style: "Cinematic",
        is_cinematic_director: true,
        ...options,
      });
      navigate(`/job/${jobId}`);
    } catch (e) {
      console.error("Failed to launch from Command Center", e);
      setLaunchingJob(null);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-3 sm:px-6 relative overflow-hidden bg-[#070506]">
      {/* Background HUD Holographic Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#ff0055_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#ff0055]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 relative z-10">
        {/* ======================================================== */}
        {/* LEFT HUD SIDEBAR NAVIGATION */}
        {/* ======================================================== */}
        <aside className="rounded-3xl bg-[#120f10]/80 border border-white/10 backdrop-blur-2xl p-4 flex flex-col justify-between shadow-2xl h-fit lg:sticky lg:top-24">
          <div className="space-y-6">
            {/* HUD Status Header */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ff0055] animate-ping" />
                  <span className="text-[10px] font-mono tracking-widest text-[#ff0055] uppercase font-black">
                    ORBITAL HUD V4.8
                  </span>
                </div>
                <Activity size={12} className="text-white/40" />
              </div>
              <p className="text-[11px] font-bold text-white tracking-tight">AI Command Center</p>
              <div className="text-[9px] font-mono text-white/40 flex items-center justify-between">
                <span>INTEL STATUS</span>
                <span className="text-emerald-400">100% ONLINE</span>
              </div>
            </div>

            {/* Sidebar Main Routes */}
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest px-2 block mb-2">
                Platform Navigation
              </span>
              {[
                { label: "Create Video", icon: <Plus size={14} />, href: "/create" },
                { label: "Projects / Library", icon: <Folder size={14} />, href: "/library" },
                { label: "Batch Studio", icon: <LayoutTemplate size={14} />, href: "/batch" },
                { label: "Media Uploads", icon: <ImageIcon size={14} />, href: "/create" },
                { label: "Analytics 3D", icon: <BarChart2 size={14} />, href: "/analytics" },
                { label: "AI Command Center", icon: <Radar size={14} />, href: "/command-center", active: true },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  to={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    item.active
                      ? "bg-[#ff0055] text-white shadow-[0_0_20px_rgba(255,0,85,0.4)]"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </Link>
              ))}
            </div>

            {/* Intelligence Modules Switcher */}
            <div className="space-y-1 pt-4 border-t border-white/5">
              <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest px-2 block mb-2">
                Intelligence Subsystems
              </span>
              {[
                { id: "radar", label: "Trend Radar", icon: <Radar size={13} /> },
                { id: "community", label: "Community Intel", icon: <Globe size={13} /> },
                { id: "viral_dna", label: "Viral Simulator", icon: <Zap size={13} /> },
                { id: "story_universe", label: "Story Universe", icon: <Film size={13} /> },
                { id: "director", label: "Content Director", icon: <Cpu size={13} /> },
                { id: "multiplatform", label: "Multi-Platform", icon: <Share2 size={13} /> },
                { id: "quality", label: "QC Command", icon: <Shield size={13} /> },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveTab(sub.id as ActiveTab)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === sub.id
                      ? "bg-white/10 text-white border border-white/15"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {sub.icon}
                    <span>{sub.label}</span>
                  </div>
                  {activeTab === sub.id && <ChevronRight size={12} className="text-[#ff0055]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Quick HUD Metrics */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 mt-6 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-white/50">
              <span>VIRAL PREDICTOR</span>
              <span className="font-mono text-emerald-400">98.4%</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-[#ff0055] to-emerald-400 h-full w-[88%]" />
            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* MAIN HOLOGRAPHIC COMMAND CENTER WORKSPACE */}
        {/* ======================================================== */}
        <main className="space-y-6">
          {/* Top HUD Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#181315] via-[#1f1619] to-[#140e11] border border-white/10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Radar size={180} className="text-[#ff0055] animate-spin [animation-duration:30s]" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff0055]/20 border border-[#ff0055]/40 text-[#ff0055] text-[10px] font-mono font-black uppercase tracking-wider">
                  <Sparkles size={11} /> PRE-PRODUCTION NEURAL LABORATORY
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
                  Autonomous AI Intelligence & Viral Radar
                </h1>
                <p className="text-xs sm:text-sm text-white/60 max-w-2xl">
                  Analyze trends, model audience retention, and engineer multi-part story franchises before burning render tokens.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/create")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ff0055] hover:bg-[#e0004c] text-white text-xs font-bold transition-all shadow-[0_0_25px_rgba(255,0,85,0.5)] cursor-pointer"
                >
                  <Film size={14} />
                  <span>Cinematic AI Director</span>
                </button>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* ACTIVE TAB CONTENT DISPLAY */}
          {/* ======================================================== */}
          <AnimatePresence mode="wait">
            {/* 1. TREND RADAR TAB */}
            {activeTab === "radar" && (
              <motion.div
                key="radar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                    <span className="text-[10px] font-mono text-white/40 uppercase">LIVE TREND OPPORTUNITIES</span>
                    <div className="text-3xl font-heading font-black text-white">{trends.length} Hot Clusters</div>
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <TrendingUp size={12} /> +340% search velocity this week
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                    <span className="text-[10px] font-mono text-white/40 uppercase">AVG HOOK POTENTIAL</span>
                    <div className="text-3xl font-heading font-black text-[#ff0055]">94.2 / 100</div>
                    <p className="text-[11px] text-white/50">Calculated via Viral DNA Neural Engine</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                    <span className="text-[10px] font-mono text-white/40 uppercase">RECOMMENDED TARGET</span>
                    <div className="text-2xl font-heading font-bold text-white">9:16 Cinematic Short</div>
                    <p className="text-[11px] text-white/50">TikTok & IG Reels primary recommendation</p>
                  </div>
                </div>

                {/* Trend Opportunity Table / Cards */}
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radar size={16} className="text-[#ff0055]" />
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                        Emerging Viral Opportunities & 1-Click Launch
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono text-white/40">SORTED BY VELOCITY SCORE</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {trends.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-[#ff0055]/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#ff0055]/20 text-[#ff0055]">
                              {item.category}
                            </span>
                            <span className="text-xs font-mono text-emerald-400 font-bold">
                              +{item.search_growth_pct}% Search Growth
                            </span>
                            <span className="text-xs font-mono text-white/40">Difficulty: {item.difficulty}</span>
                          </div>
                          <h3 className="text-base font-bold text-white tracking-tight group-hover:text-[#ff0055] transition-colors">
                            {item.keyword}
                          </h3>
                          <p className="text-xs text-white/60 italic">
                            Angle: "{item.recommended_angle}"
                          </p>
                        </div>

                        {/* Velocity & Launch Action */}
                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-white/5">
                          <div className="text-right">
                            <div className="text-[10px] font-mono text-white/40">OPPORTUNITY</div>
                            <div className="text-lg font-black font-mono text-white">{item.opportunity_score}/100</div>
                          </div>

                          <button
                            disabled={launchingJob === item.keyword}
                            onClick={() => handleLaunchPipeline(item.keyword)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-[#ff0055] text-white text-xs font-bold transition-all border border-white/10 group-hover:shadow-[0_0_15px_rgba(255,0,85,0.4)] cursor-pointer"
                          >
                            {launchingJob === item.keyword ? (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                              <Sparkles size={12} />
                            )}
                            <span>{launchingJob === item.keyword ? "Directing..." : "Direct Video"}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. COMMUNITY INTELLIGENCE TAB */}
            {activeTab === "community" && (
              <motion.div
                key="community"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {community.map((comm, idx) => (
                    <div
                      key={idx}
                      className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4 shadow-xl"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-[#ff0055] font-bold uppercase tracking-widest">
                            CLUSTER #{idx + 1}
                          </span>
                          <h3 className="text-lg font-bold text-white tracking-tight">{comm.topic}</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-mono text-white/40">VIRAL POTENTIAL</div>
                          <div className="text-base font-mono font-black text-emerald-400">
                            {comm.virality_potential}/100
                          </div>
                        </div>
                      </div>

                      {/* Sentiment Distribution Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-white/60">
                          <span className="text-emerald-400">Pos: {comm.sentiment_positive}%</span>
                          <span className="text-white/40">Neu: {comm.sentiment_neutral}%</span>
                          <span className="text-rose-400">Neg: {comm.sentiment_negative}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden flex bg-white/5">
                          <div style={{ width: `${comm.sentiment_positive}%` }} className="bg-emerald-400 h-full" />
                          <div style={{ width: `${comm.sentiment_neutral}%` }} className="bg-white/30 h-full" />
                          <div style={{ width: `${comm.sentiment_negative}%` }} className="bg-rose-500 h-full" />
                        </div>
                      </div>

                      {/* Keywords */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-white/40 uppercase">Top Discussion Keywords</span>
                        <div className="flex flex-wrap gap-1.5">
                          {comm.trending_keywords.map((kw, kIdx) => (
                            <span
                              key={kIdx}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-white/5 border border-white/10 text-white/80"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Popular Opinions */}
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                        <span className="text-[9px] font-mono text-white/40 uppercase">Community Consensus</span>
                        {comm.popular_opinions.map((op, oIdx) => (
                          <p key={oIdx} className="text-xs text-white/70 italic leading-relaxed">
                            "{op}"
                          </p>
                        ))}
                      </div>

                      <button
                        onClick={() => handleLaunchPipeline(comm.topic)}
                        className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-[#ff0055] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles size={12} />
                        <span>Build Video from this Community Topic</span>
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 3. VIRAL SIMULATOR & DNA SCANNER TAB */}
            {activeTab === "viral_dna" && (
              <motion.div
                key="viral_dna"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Simulator Prompt Input Box */}
                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#ff0055] uppercase font-bold tracking-widest">
                      // PREDICTIVE AUDIENCE RETENTION SIMULATOR
                    </span>
                    <span className="text-[10px] font-mono text-white/40">NEURAL DNA ENGINE V4</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={simPrompt}
                      onChange={(e) => setSimPrompt(e.target.value)}
                      placeholder="Enter a video idea to simulate viral metrics..."
                      className="flex-1 px-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-sm text-white focus:outline-none focus:border-[#ff0055] transition-colors"
                    />
                    <button
                      disabled={simLoading}
                      onClick={() => handleRunSimulation()}
                      className="px-6 py-3 rounded-2xl bg-[#ff0055] hover:bg-[#e0004c] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,0,85,0.4)]"
                    >
                      {simLoading ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <Zap size={14} />
                      )}
                      <span>{simLoading ? "Simulating..." : "Scan Viral DNA"}</span>
                    </button>
                  </div>
                </div>

                {/* Simulation Output Dashboard */}
                {simResult && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: 5-Metric DNA Radar */}
                    <div className="lg:col-span-4 p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
                      <span className="text-[10px] font-mono text-white/40 uppercase">VIRAL DNA METRIC SCORES</span>

                      <div className="space-y-3">
                        {[
                          { label: "Hook Strength (0-3s)", score: simResult.hook_strength, color: "#ff0055" },
                          { label: "Retention Rate (30s)", score: simResult.retention_predicted_pct, color: "#10b981" },
                          { label: "Shareability Score", score: simResult.shareability_score, color: "#3b82f6" },
                          { label: "Curiosity Gap", score: simResult.curiosity_gap, color: "#f59e0b" },
                          { label: "Emotional Resonance", score: simResult.emotional_resonance, color: "#8b5cf6" },
                          { label: "Replay Factor", score: simResult.replay_score, color: "#ec4899" },
                        ].map((metric, mIdx) => (
                          <div key={mIdx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-white">
                              <span>{metric.label}</span>
                              <span className="font-mono">{metric.score}/100</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                              <div
                                style={{ width: `${metric.score}%`, backgroundColor: metric.color }}
                                className="h-full rounded-full transition-all duration-700"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-white/5 text-center">
                        <span className="text-[10px] font-mono text-white/40 uppercase block">POTENTIAL REACH TIER</span>
                        <span className="text-base font-black font-heading text-emerald-400">
                          {simResult.estimated_views_tier}
                        </span>
                      </div>
                    </div>

                    {/* Right: Visual Retention Curve & Hook Upgrades */}
                    <div className="lg:col-span-8 space-y-6">
                      {/* Retention Curve Chart */}
                      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-white/40 uppercase">
                            PREDICTED 30-SECOND RETENTION CURVE
                          </span>
                          <span className="text-xs font-mono text-emerald-400">
                            Avg Completion: {simResult.retention_predicted_pct}%
                          </span>
                        </div>

                        {/* Dynamic SVG Retention Curve */}
                        <div className="h-44 w-full relative flex items-end pt-6 pb-2">
                          <svg className="w-full h-full overflow-visible" viewBox="0 0 700 120" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ff0055" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#ff0055" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            {/* Area */}
                            <path
                              d={`M 0 ${120 - simResult.retention_curve[0].retention * 1.1} 
                                  L 100 ${120 - simResult.retention_curve[1].retention * 1.1} 
                                  L 200 ${120 - simResult.retention_curve[2].retention * 1.1} 
                                  L 320 ${120 - simResult.retention_curve[3].retention * 1.1} 
                                  L 440 ${120 - simResult.retention_curve[4].retention * 1.1} 
                                  L 560 ${120 - simResult.retention_curve[5].retention * 1.1} 
                                  L 700 ${120 - simResult.retention_curve[6].retention * 1.1} 
                                  L 700 120 L 0 120 Z`}
                              fill="url(#retGrad)"
                            />
                            {/* Line */}
                            <path
                              d={`M 0 ${120 - simResult.retention_curve[0].retention * 1.1} 
                                  L 100 ${120 - simResult.retention_curve[1].retention * 1.1} 
                                  L 200 ${120 - simResult.retention_curve[2].retention * 1.1} 
                                  L 320 ${120 - simResult.retention_curve[3].retention * 1.1} 
                                  L 440 ${120 - simResult.retention_curve[4].retention * 1.1} 
                                  L 560 ${120 - simResult.retention_curve[5].retention * 1.1} 
                                  L 700 ${120 - simResult.retention_curve[6].retention * 1.1}`}
                              fill="none"
                              stroke="#ff0055"
                              strokeWidth="3"
                            />
                          </svg>
                        </div>

                        <div className="flex justify-between text-[10px] font-mono text-white/40 border-t border-white/5 pt-2">
                          <span>0s (Hook)</span>
                          <span>5s</span>
                          <span>12s</span>
                          <span>18s</span>
                          <span>24s</span>
                          <span>30s (CTA)</span>
                        </div>
                      </div>

                      {/* Hook Upgrades */}
                      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
                        <span className="text-[10px] font-mono text-[#ff0055] uppercase font-bold">
                          AI DIRECTOR HOOK OPTIMIZATION RECOMMENDATIONS
                        </span>
                        <div className="space-y-2">
                          {simResult.recommended_hook_upgrades.map((upg, uIdx) => (
                            <div key={uIdx} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                              <Sparkles size={14} className="text-[#ff0055] mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-white/80 leading-relaxed">{upg}</p>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => handleLaunchPipeline(simPrompt)}
                          className="w-full py-3 rounded-xl bg-[#ff0055] hover:bg-[#e0004c] text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,0,85,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Film size={14} />
                          <span>Generate Cinematic Video with these Upgrades</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. STORY UNIVERSE FRANCHISE GENERATOR TAB */}
            {activeTab === "story_universe" && (
              <motion.div
                key="story_universe"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Universe Seed Input */}
                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
                  <span className="text-[10px] font-mono text-[#ff0055] uppercase font-bold tracking-widest">
                    // MULTI-PART EPISODIC UNIVERSE EXPANSION ENGINE
                  </span>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={universePrompt}
                      onChange={(e) => setUniversePrompt(e.target.value)}
                      placeholder="Enter a root video topic to spin off into a series..."
                      className="flex-1 px-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-sm text-white focus:outline-none focus:border-[#ff0055] transition-colors"
                    />
                    <button
                      disabled={universeLoading}
                      onClick={() => handleGenerateUniverse()}
                      className="px-6 py-3 rounded-2xl bg-[#ff0055] hover:bg-[#e0004c] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,0,85,0.4)]"
                    >
                      {universeLoading ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <Film size={14} />
                      )}
                      <span>{universeLoading ? "Expanding..." : "Generate Series"}</span>
                    </button>
                  </div>
                </div>

                {/* Universe Output Episodes */}
                {universeResult && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/8">
                      <div>
                        <h3 className="text-base font-bold text-white">{universeResult.universe_title}</h3>
                        <p className="text-xs text-white/60">{universeResult.audience_hook}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-white/40">FRANCHISE SCORE</span>
                        <div className="text-lg font-black font-mono text-emerald-400">
                          {universeResult.franchise_potential}/100
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {universeResult.episodes.map((ep) => (
                        <div
                          key={ep.episode}
                          className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#ff0055]/20 text-[#ff0055]">
                                EPISODE {ep.episode}
                              </span>
                              <span className="text-xs font-mono text-white/40">{ep.target_aspect} Format</span>
                            </div>
                            <h4 className="text-sm font-bold text-white">{ep.title}</h4>
                            <p className="text-xs text-[#ff0055] font-semibold italic">"{ep.hook}"</p>
                            <p className="text-xs text-white/70">{ep.concept}</p>
                            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-amber-400/90 font-mono">
                              Cliffhanger: {ep.cliffhanger}
                            </div>
                          </div>

                          <button
                            onClick={() => handleLaunchPipeline(`${ep.title} - ${ep.hook}`)}
                            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-[#ff0055] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                          >
                            <Play size={12} />
                            <span>Produce Episode {ep.episode} Now</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 5. MULTI-PLATFORM INTELLIGENCE TAB */}
            {activeTab === "multiplatform" && (
              <motion.div
                key="multiplatform"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {multiplatform.map((mp, idx) => (
                    <div
                      key={idx}
                      className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-white">{mp.platform}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#ff0055]/20 text-[#ff0055]">
                            {mp.aspect_ratio}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-white/70">
                          <div className="flex justify-between font-mono text-[11px]">
                            <span className="text-white/40">Optimal Length:</span>
                            <span className="text-white font-bold">{mp.optimal_length_sec} seconds</span>
                          </div>
                          <div className="flex justify-between font-mono text-[11px]">
                            <span className="text-white/40">Pacing Multiplier:</span>
                            <span className="text-emerald-400 font-bold">{mp.pacing_multiplier}x</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                          <span className="text-[9px] font-mono text-white/40 uppercase">Recommended Hook Structure</span>
                          <p className="text-xs text-white/90">{mp.hook_format}</p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-white/40 uppercase">Optimized Hashtags</span>
                          <div className="flex flex-wrap gap-1">
                            {mp.recommended_hashtags.map((ht, hIdx) => (
                              <span key={hIdx} className="text-[9px] font-mono text-white/60 bg-white/5 px-2 py-0.5 rounded">
                                {ht}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleLaunchPipeline("How Autonomous AI Transforms Short-Form Production", {
                            aspect_ratio: mp.aspect_ratio,
                            duration: mp.optimal_length_sec,
                          })
                        }
                        className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-[#ff0055] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                      >
                        <Film size={12} />
                        <span>Direct for {mp.platform}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 6. AI QUALITY CONTROL & DIRECTOR TABS */}
            {(activeTab === "director" || activeTab === "quality") && (
              <motion.div
                key="director_quality"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Automated Scene-by-Scene QC Matrix */}
                  <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#ff0055] uppercase font-bold">
                        // 7-POINT MULTI-MODAL QC TELEMETRY
                      </span>
                      <Shield size={14} className="text-emerald-400" />
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { title: "Audio & Neural Voice Sync", score: "99/100", status: "Optimal" },
                        { title: "Dynamic Subtitle Micro-Pacing", score: "96/100", status: "Optimal" },
                        { title: "Black Frame & Contrast Audit", score: "100/100", status: "Passed" },
                        { title: "Hook Retention Friction Check", score: "94/100", status: "Passed" },
                        { title: "Mobile Safe-Area Visual Alignment", score: "98/100", status: "Optimal" },
                      ].map((qc, qIdx) => (
                        <div
                          key={qIdx}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5"
                        >
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            <span className="text-xs font-medium text-white">{qc.title}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-400">{qc.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cinematic Director Shot Arsenal */}
                  <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#ff0055] uppercase font-bold">
                        // CINEMATIC CAMERA & SHOT SELECTION
                      </span>
                      <Cpu size={14} className="text-[#ff0055]" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { shot: "Drone Shot", desc: "Sweeping high-altitude aerial view" },
                        { shot: "Tracking Shot", desc: "Dynamic lateral subject tracking" },
                        { shot: "Dolly Zoom", desc: "Vertigo perspective compression" },
                        { shot: "Orbit 360", desc: "Centric subject rotation" },
                        { shot: "Slow Motion", desc: "120fps physics emphasis" },
                        { shot: "Hero Shot", desc: "Low-angle dramatic reveal" },
                      ].map((shot, sIdx) => (
                        <div key={sIdx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                          <span className="text-xs font-bold text-white">{shot.shot}</span>
                          <p className="text-[10px] text-white/50">{shot.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default CommandCenterPage;
