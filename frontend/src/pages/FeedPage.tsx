import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Globe, Play, Heart, Sparkles, TrendingUp, ArrowLeft,
  Zap, Palette, Rocket, Gamepad2, Telescope, ShirtIcon,
  Users, Eye, ChevronRight, X
} from "lucide-react";
import { JobStatus } from "@/api/client";

/* ═══════════════════════════════════════════════════════
   CSS ANIMATIONS
   ═══════════════════════════════════════════════════════ */
const FEED_STYLES = `
@keyframes portalGlow {
  0%, 100% { box-shadow: 0 0 20px var(--portal-color-dim), inset 0 0 15px var(--portal-color-dim); }
  50% { box-shadow: 0 0 40px var(--portal-color), inset 0 0 25px var(--portal-color-dim); }
}
@keyframes particleDrift {
  0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.5; }
  33% { transform: translateY(-30px) translateX(15px) scale(1.3); opacity: 0.9; }
  66% { transform: translateY(-15px) translateX(-10px) scale(0.7); opacity: 0.3; }
}
@keyframes hologramFlicker {
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.6; }
  94% { opacity: 1; }
  97% { opacity: 0.8; }
  98% { opacity: 1; }
}
@keyframes energyPulse {
  0% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.15); opacity: 0.6; }
  100% { transform: scale(1); opacity: 0.3; }
}
@keyframes starField {
  0% { background-position: 0 0, 0 0, 0 0; }
  100% { background-position: 500px 1000px, 400px 800px, 300px 600px; }
}
.anim-portal-glow { animation: portalGlow 3s ease-in-out infinite; }
.anim-drift { animation: particleDrift 5s ease-in-out infinite; }
.anim-holo-flicker { animation: hologramFlicker 4s linear infinite; }
.anim-energy-pulse { animation: energyPulse 2s ease-in-out infinite; }
`;

/* ── Universe Definitions ── */
interface Universe {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  bgColor: string;
  keywords: string[];
  explorers: string;
  portals: string;
  icon: React.ReactNode;
}

const UNIVERSES: Universe[] = [
  {
    id: "cyberverse", name: "CYBERVERSE", emoji: "🌐",
    description: "Technology, AI, Coding & Digital Innovation",
    color: "#00ffff", bgColor: "#0a1628",
    keywords: ["AI", "Tech", "Code", "Startup"],
    explorers: "42.3K", portals: "1.2M",
    icon: <Globe size={28} />,
  },
  {
    id: "fashionverse", name: "FASHIONVERSE", emoji: "👗",
    description: "Fashion, Beauty, Style & Luxury Brands",
    color: "#ff6b9d", bgColor: "#1a0a2e",
    keywords: ["Fashion", "Beauty", "Style", "Luxury"],
    explorers: "38.1K", portals: "890K",
    icon: <ShirtIcon size={28} />,
  },
  {
    id: "startupverse", name: "STARTUPVERSE", emoji: "🚀",
    description: "Business, Finance & Entrepreneurship",
    color: "#00ff88", bgColor: "#0d1117",
    keywords: ["Startup", "Finance", "Business", "Growth"],
    explorers: "51.7K", portals: "1.5M",
    icon: <Rocket size={28} />,
  },
  {
    id: "creatoverse", name: "CREATOVERSE", emoji: "🎨",
    description: "Art, Music, Content & Creative Design",
    color: "#8b5cf6", bgColor: "#0f0a2a",
    keywords: ["Art", "Music", "Design", "Content"],
    explorers: "67.2K", portals: "2.1M",
    icon: <Palette size={28} />,
  },
  {
    id: "gamingverse", name: "GAMINGVERSE", emoji: "🎮",
    description: "Gaming, Esports & Entertainment",
    color: "#ff0040", bgColor: "#0a0a14",
    keywords: ["Gaming", "Esports", "Stream", "Play"],
    explorers: "89.4K", portals: "3.4M",
    icon: <Gamepad2 size={28} />,
  },
  {
    id: "futureverse", name: "FUTUREVERSE", emoji: "🔮",
    description: "Science, Space & Next-Gen Innovation",
    color: "#ffd700", bgColor: "#050510",
    keywords: ["Science", "Space", "Future", "Innovation"],
    explorers: "33.8K", portals: "780K",
    icon: <Telescope size={28} />,
  },
];

/* ── Mock Portals per Universe ── */
interface PortalItem {
  id: string;
  title: string;
  creator: string;
  views: string;
  likes: string;
}

const MOCK_PORTALS: Record<string, PortalItem[]> = {
  cyberverse: [
    { id: "c1", title: "GPT-5 Just Broke The Internet", creator: "@ai_insider", views: "4.2M", likes: "312K" },
    { id: "c2", title: "I Built An AI Clone Of Myself", creator: "@techbro", views: "2.8M", likes: "198K" },
    { id: "c3", title: "Quantum Computing Explained in 60s", creator: "@quantumdev", views: "1.9M", likes: "145K" },
    { id: "c4", title: "The Code That Hacked NASA", creator: "@cyberking", views: "6.1M", likes: "487K" },
    { id: "c5", title: "AI Will Replace These 10 Jobs", creator: "@futurecast", views: "3.3M", likes: "221K" },
    { id: "c6", title: "Building AGI In My Basement", creator: "@madscientist", views: "1.1M", likes: "89K" },
  ],
  fashionverse: [
    { id: "f1", title: "Met Gala 2025 Best Looks", creator: "@fashionista", views: "8.4M", likes: "612K" },
    { id: "f2", title: "How I Built a Luxury Brand at 22", creator: "@luxuryqueen", views: "3.7M", likes: "278K" },
    { id: "f3", title: "AI Fashion Design Revolution", creator: "@styleai", views: "2.1M", likes: "156K" },
    { id: "f4", title: "Milan Fashion Week Highlights", creator: "@runwaypro", views: "5.2M", likes: "389K" },
    { id: "f5", title: "Minimalist Wardrobe Guide", creator: "@capsuleking", views: "1.8M", likes: "134K" },
    { id: "f6", title: "Vintage Luxury Finds Under \u002450", creator: "@thriftlux", views: "2.9M", likes: "201K" },
  ],
  startupverse: [
    { id: "s1", title: "From Zero to \u002410M ARR", creator: "@founderlife", views: "5.6M", likes: "423K" },
    { id: "s2", title: "VC Funding Secrets Nobody Tells You", creator: "@investorpro", views: "3.1M", likes: "234K" },
    { id: "s3", title: "How I Sold My Startup For \u002450M", creator: "@exitking", views: "7.8M", likes: "567K" },
    { id: "s4", title: "The Future of Fintech", creator: "@fintechguru", views: "2.4M", likes: "178K" },
    { id: "s5", title: "5 Startup Ideas For 2025", creator: "@ideamaker", views: "4.2M", likes: "312K" },
    { id: "s6", title: "Day Trading Secrets Revealed", creator: "@traderpro", views: "1.7M", likes: "128K" },
  ],
  creatorverse: [
    { id: "a1", title: "I Made Art With AI And Won A Prize", creator: "@aiartist", views: "3.9M", likes: "291K" },
    { id: "a2", title: "Music Production In 60 Seconds", creator: "@beatmaker", views: "2.6M", likes: "195K" },
    { id: "a3", title: "How To Go Viral As A Creator", creator: "@viralcoach", views: "6.3M", likes: "478K" },
    { id: "a4", title: "Digital Art That Sold For \u002410K", creator: "@nftcreator", views: "4.1M", likes: "309K" },
    { id: "a5", title: "Content Creation Setup Tour", creator: "@setupking", views: "1.5M", likes: "112K" },
    { id: "a6", title: "Animation Workflow Secrets", creator: "@animatepro", views: "2.2M", likes: "164K" },
  ],
  gamingverse: [
    { id: "g1", title: "GTA 6 Trailer Breakdown", creator: "@gamebreaker", views: "12.4M", likes: "934K" },
    { id: "g2", title: "I Beat Dark Souls Blindfolded", creator: "@challengeking", views: "8.7M", likes: "645K" },
    { id: "g3", title: "Best PC Build Under \u00241000", creator: "@buildmaster", views: "3.2M", likes: "241K" },
    { id: "g4", title: "Esports Pro Shares Secrets", creator: "@esportspro", views: "5.1M", likes: "378K" },
    { id: "g5", title: "Top 10 Indie Games 2025", creator: "@indiegamer", views: "2.8M", likes: "209K" },
    { id: "g6", title: "VR Gaming Changed My Life", creator: "@vrgamer", views: "1.9M", likes: "142K" },
  ],
  futureverse: [
    { id: "x1", title: "NASA Found Something Impossible", creator: "@spacenerd", views: "9.2M", likes: "689K" },
    { id: "x2", title: "Mars Colony Update 2025", creator: "@marsbound", views: "4.5M", likes: "334K" },
    { id: "x3", title: "The Brain Upload Experiment", creator: "@neurolink", views: "6.8M", likes: "512K" },
    { id: "x4", title: "Nuclear Fusion Just Worked", creator: "@energyfuture", views: "3.6M", likes: "267K" },
    { id: "x5", title: "Robot That Passed The Turing Test", creator: "@robotics", views: "7.1M", likes: "534K" },
    { id: "x6", title: "Time Travel Theory Proven?", creator: "@physicist", views: "2.3M", likes: "171K" },
  ],
};

/* ── Floating Particles ── */
const UniverseParticles: React.FC<{ color: string; count?: number }> = ({ color, count = 6 }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="absolute w-1.5 h-1.5 rounded-full anim-drift"
        style={{
          backgroundColor: color, opacity: 0.4,
          left: `${8 + (i * 15) % 85}%`, top: `${10 + (i * 19) % 75}%`,
          animationDelay: `${i * 0.7}s`, animationDuration: `${4 + (i % 3)}s`,
        }}
      />
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export const FeedPage: React.FC = () => {
  const navigate = useNavigate();
  const [realJobs, setRealJobs] = useState<JobStatus[]>([]);
  const [activeUniverse, setActiveUniverse] = useState<string | null>(null);

  // Inject styles
  useEffect(() => {
    const existing = document.getElementById("feed-anims");
    if (!existing) {
      const style = document.createElement("style");
      style.id = "feed-anims";
      style.textContent = FEED_STYLES;
      document.head.appendChild(style);
    }
    return () => { document.getElementById("feed-anims")?.remove(); };
  }, []);

  // Fetch real completed jobs
  useEffect(() => {
    fetch("/api/jobs?limit=10")
      .then((r) => r.json())
      .then((jobs: JobStatus[]) => setRealJobs(jobs.filter((j) => j.status === "completed")))
      .catch(() => {});
  }, []);

  const activeData = useMemo(() => {
    if (!activeUniverse) return null;
    return UNIVERSES.find(u => u.id === activeUniverse) ?? null;
  }, [activeUniverse]);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto space-y-8">

        <AnimatePresence mode="wait">
          {!activeUniverse ? (
            /* ════════ UNIVERSE GRID ════════ */
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-8">

              {/* Header */}
              <div className="text-center space-y-3">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-white/50">
                  <Globe size={12} className="text-[var(--accent)]" /> MULTIVERSE ACTIVE · 6 DIMENSIONS · LIVE
                </motion.div>
                <h1 className="font-heading text-4xl sm:text-5xl font-black text-white tracking-tight">
                  QONEQT <span className="text-[var(--accent)]">MULTIVERSE</span>
                </h1>
                <p className="text-white/40 text-base max-w-lg mx-auto">
                  Travel through AI content universes. Discover viral portals, trending dimensions, and next-gen content.
                </p>
                {/* Glowing divider */}
                <div className="h-px max-w-xs mx-auto bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-40" />
              </div>

              {/* Real Jobs Banner */}
              {realJobs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[var(--accent)]" />
                    <p className="text-xs font-mono text-white/50 uppercase tracking-widest">Your Portals</p>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {realJobs.slice(0, 6).map((job) => (
                      <motion.div key={job.job_id}
                        whileHover={{ scale: 1.03 }}
                        onClick={() => navigate(`/result/${job.job_id}`)}
                        className="flex-shrink-0 w-36 rounded-xl overflow-hidden border border-[var(--accent)]/30 hover:border-[var(--accent)] transition-all cursor-pointer bg-black/60">
                        <div style={{ aspectRatio: "9/16" }} className="relative">
                          {job.thumbnail_url ? (
                            <img src={job.thumbnail_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full bg-black/80 flex items-center justify-center">
                              <Play size={20} className="text-white/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-2">
                            <p className="text-[9px] text-white font-semibold line-clamp-2">{job.plan?.title ?? job.input.slice(0, 40)}</p>
                            <span className="text-[8px] text-[var(--accent)] font-mono">@you · LIVE</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Universe Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {UNIVERSES.map((uni, i) => (
                  <motion.div
                    key={uni.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    onClick={() => navigate(`/universe/${uni.id}`)}
                    className="relative group cursor-pointer rounded-2xl overflow-hidden border backdrop-blur-xl anim-portal-glow"
                    style={{
                      minHeight: "300px",
                      background: `linear-gradient(160deg, ${uni.bgColor}, ${uni.bgColor}ee, ${uni.color}08)`,
                      borderColor: `${uni.color}25`,
                      ["--portal-color" as string]: `${uni.color}40`,
                      ["--portal-color-dim" as string]: `${uni.color}15`,
                    }}
                  >
                    <UniverseParticles color={uni.color} />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 text-center space-y-4 min-h-[300px]">
                      {/* Energy ring */}
                      <div className="relative">
                        <div className="absolute inset-[-12px] rounded-full border-2 anim-energy-pulse" style={{ borderColor: `${uni.color}30` }} />
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                          style={{ background: `${uni.color}15`, boxShadow: `0 0 30px ${uni.color}20` }}>
                          {uni.emoji}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-lg font-black tracking-wider anim-holo-flicker" style={{ color: uni.color }}>
                          {uni.name}
                        </h3>
                        <p className="text-xs text-white/50">{uni.description}</p>
                      </div>

                      {/* Keywords */}
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {uni.keywords.map((kw) => (
                          <span key={kw} className="px-2 py-0.5 rounded-full text-[9px] font-mono border"
                            style={{ color: `${uni.color}cc`, borderColor: `${uni.color}30`, background: `${uni.color}08` }}>
                            {kw}
                          </span>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-[10px] text-white/40 font-mono">
                        <span className="flex items-center gap-1"><Users size={10} /> {uni.explorers} Explorers</span>
                        <span className="flex items-center gap-1"><Eye size={10} /> {uni.portals} Portals</span>
                        <span className="flex items-center gap-1 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE</span>
                      </div>

                      {/* Enter Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/universe/${uni.id}`);
                        }}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-black transition-all hover:brightness-110 shadow-lg group-hover:shadow-xl"
                        style={{ backgroundColor: uni.color, boxShadow: `0 0 20px ${uni.color}40` }}>
                        Enter Universe <ChevronRight size={14} />
                      </button>
                    </div>

                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <div className="text-center space-y-4 pt-4">
                <div className="h-px max-w-xs mx-auto bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-30" />
                <button onClick={() => navigate("/create")}
                  className="px-8 py-3 rounded-xl text-black font-bold text-sm transition-all hover:opacity-90"
                  style={{ backgroundColor: "var(--accent)", boxShadow: "0 0 30px var(--accent)44" }}>
                  Create Your Own Portal →
                </button>
              </div>
            </motion.div>
          ) : (
            /* ════════ INSIDE UNIVERSE ════════ */
            <motion.div key="inside" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {activeData && (
                <>
                  {/* Universe Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setActiveUniverse(null)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 border border-white/10 transition-all">
                        <ArrowLeft size={14} /> Exit
                      </button>
                      <span className="text-2xl">{activeData.emoji}</span>
                      <h2 className="text-xl font-black tracking-wider" style={{ color: activeData.color }}>
                        {activeData.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeData.color }} />
                      {activeData.explorers} Explorers Online
                    </div>
                  </div>

                  {/* Real Jobs in this universe */}
                  {realJobs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Your Portals In This Dimension</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {realJobs.slice(0, 6).map((job, i) => (
                          <motion.div key={job.job_id}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            whileHover={{ scale: 1.03, rotateY: 3 }}
                            onClick={() => navigate(`/result/${job.job_id}`)}
                            className="cursor-pointer rounded-xl overflow-hidden border backdrop-blur-xl"
                            style={{ borderColor: `${activeData.color}30`, background: `${activeData.bgColor}cc` }}>
                            <div style={{ aspectRatio: "9/16" }} className="relative">
                              {job.thumbnail_url ? (
                                <img src={job.thumbnail_url} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <div className="w-full h-full bg-black/80 flex items-center justify-center">
                                  <Play size={20} style={{ color: activeData.color }} className="opacity-50" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-2">
                                <p className="text-[9px] text-white font-semibold line-clamp-2">{job.plan?.title ?? job.input.slice(0, 40)}</p>
                                <span className="text-[8px] font-mono" style={{ color: activeData.color }}>@you</span>
                              </div>
                              <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-black"
                                style={{ backgroundColor: activeData.color }}>YOURS</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${activeData.color}30, transparent)` }} />
                    <span className="text-[10px] font-mono text-white/20">DIMENSION PORTALS</span>
                    <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${activeData.color}30, transparent)` }} />
                  </div>

                  {/* Mock Portals */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {(MOCK_PORTALS[activeData.id] ?? []).map((portal, i) => (
                      <motion.div key={portal.id}
                        initial={{ opacity: 0, y: 15, rotateX: -5 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                        whileHover={{ scale: 1.04, rotateY: 2 }}
                        className="group cursor-pointer rounded-xl overflow-hidden border backdrop-blur-xl transition-all"
                        style={{
                          borderColor: `${activeData.color}20`,
                          background: `linear-gradient(180deg, ${activeData.bgColor}ee, ${activeData.color}05)`,
                        }}
                      >
                        <div style={{ aspectRatio: "9/16" }} className="relative">
                          {/* Gradient placeholder visual */}
                          <div className="absolute inset-0"
                            style={{
                              background: `linear-gradient(${135 + i * 30}deg, ${activeData.bgColor}, ${activeData.color}18, ${activeData.bgColor})`,
                            }} />

                          {/* Center play orb */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center opacity-60 group-hover:opacity-100 transition-all group-hover:scale-110"
                              style={{ background: `${activeData.color}20`, boxShadow: `0 0 20px ${activeData.color}30` }}>
                              <Play size={16} style={{ color: activeData.color }} className="ml-0.5" />
                            </div>
                          </div>

                          {/* Content overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2.5">
                            <p className="text-[10px] font-semibold text-white leading-snug line-clamp-2">{portal.title}</p>
                            <p className="text-[9px] mt-0.5" style={{ color: `${activeData.color}cc` }}>{portal.creator}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="flex items-center gap-0.5 text-[8px] font-mono text-white/60">
                                <Eye size={8} /> {portal.views}
                              </span>
                              <span className="flex items-center gap-0.5 text-[8px] font-mono text-white/60">
                                <Heart size={8} className="text-rose-400" /> {portal.likes}
                              </span>
                            </div>
                          </div>

                          {/* Top badge */}
                          {i < 2 && (
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5"
                              style={{ backgroundColor: `${activeData.color}cc`, color: "#000" }}>
                              <TrendingUp size={8} /> TRENDING
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Create in this universe */}
                  <div className="text-center pt-4">
                    <button onClick={() => navigate("/create")}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 shadow-lg"
                      style={{ backgroundColor: activeData.color, color: "#000", boxShadow: `0 0 25px ${activeData.color}40` }}>
                      Create Portal in {activeData.name} →
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FeedPage;
