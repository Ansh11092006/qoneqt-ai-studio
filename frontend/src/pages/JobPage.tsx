import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, AlertCircle, Loader2, RefreshCw, ArrowRight,
  Brain, Type, Layers, Eye, Camera, Mic, Music, AudioLines,
  ScanLine, Monitor, Film, Sparkles, Zap
} from "lucide-react";
import { useJob } from "@/store/job-context";
import {
  TerminalLoader, GlobeLoader, RocketLoader,
  FilmReelLoader, ChartLoader, PulseLoader,
} from "@/loaders/loading-visuals";
import { Theme, getJob, JobStatus } from "@/api/client";

/* ═══════════════════════════════════════════════════════
   PIPELINE CONFIGURATION
   ═══════════════════════════════════════════════════════ */
const STEP_META: Record<string, { label: string; icon: React.ReactNode; fullLabel: string }> = {
  understanding: { label: "Understand", icon: <Brain size={14} />, fullLabel: "Topic Understanding" },
  script:        { label: "Script",     icon: <Type size={14} />,  fullLabel: "Script & Hook Generation" },
  scenes:        { label: "Scenes",     icon: <Layers size={14} />, fullLabel: "Scene Planning & Storyboard" },
  visuals:       { label: "Visuals",    icon: <Eye size={14} />,   fullLabel: "AI Visual Generation" },
  voice:         { label: "Voice",      icon: <Mic size={14} />,   fullLabel: "Voice Synthesis & Audio" },
  compose:       { label: "Compose",    icon: <Film size={14} />,  fullLabel: "Video Composition & Rendering" },
  qc:            { label: "QC",         icon: <Sparkles size={14} />, fullLabel: "Quality Control & Analysis" },
};

const ALL_STEPS = ["understanding", "script", "scenes", "visuals", "voice", "compose", "qc"];

/* ═══════════════════════════════════════════════════════
   CSS ANIMATIONS
   ═══════════════════════════════════════════════════════ */
const JOB_STYLES = `
@keyframes scanLineJob {
  0% { top: 0; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}
@keyframes orbitalRing {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes energyLineFlow {
  0% { background-position: 0% center; }
  100% { background-position: 200% center; }
}
@keyframes stepGlow {
  0%, 100% { box-shadow: 0 0 8px var(--step-color); }
  50% { box-shadow: 0 0 20px var(--step-color), 0 0 35px var(--step-color); }
}
.anim-scan-job { animation: scanLineJob 2s ease-in-out infinite; }
.anim-orbital { animation: orbitalRing 6s linear infinite; }
.anim-energy-flow {
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  background-size: 200% 100%;
  animation: energyLineFlow 2s linear infinite;
}
.anim-step-glow { animation: stepGlow 2s ease-in-out infinite; }
`;

function getStepStatus(stepId: string, currentStep: string | undefined, stepStatus: string | undefined, jobStatus: string) {
  if (jobStatus === "completed") return "done";
  if (jobStatus === "failed") {
    const currentIdx = ALL_STEPS.indexOf(currentStep || "");
    const thisIdx = ALL_STEPS.indexOf(stepId);
    if (thisIdx < currentIdx) return "done";
    if (thisIdx === currentIdx) return "failed";
    return "pending";
  }
  const currentIdx = ALL_STEPS.indexOf(currentStep || "");
  const thisIdx = ALL_STEPS.indexOf(stepId);
  if (thisIdx < currentIdx) return "done";
  if (thisIdx === currentIdx) return stepStatus === "done" ? "done" : "running";
  return "pending";
}

function LoadingVisual({ theme, activeMessage }: { theme: Theme; activeMessage: string }) {
  const { loading_style, palette } = theme;
  const accent = palette.accent;
  switch (loading_style) {
    case "terminal": return <TerminalLoader accent={accent} activeMessage={activeMessage} />;
    case "globe": return <GlobeLoader accent={accent} activeMessage={activeMessage} />;
    case "rocket": return <RocketLoader accent={accent} activeMessage={activeMessage} />;
    case "film_reel": return <FilmReelLoader accent={accent} activeMessage={activeMessage} />;
    case "chart": return <ChartLoader accent={accent} activeMessage={activeMessage} />;
    default: return <PulseLoader accent={accent} activeMessage={activeMessage} />;
  }
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export const JobPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentJob, currentTheme, partialHook, partialScenes } = useJob();
  const [displayedHook, setDisplayedHook] = useState("");
  const hookRef = useRef("");
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);
  const [localJob, setLocalJob] = useState<JobStatus | null>(null);

  // Inject styles
  useEffect(() => {
    const existing = document.getElementById("job-anims");
    if (!existing) {
      const style = document.createElement("style");
      style.id = "job-anims";
      style.textContent = JOB_STYLES;
      document.head.appendChild(style);
    }
    return () => { document.getElementById("job-anims")?.remove(); };
  }, []);

  // Fetch job status & poll
  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    let pollTimer: NodeJS.Timeout;

    const checkJob = async () => {
      try {
        const data = await getJob(id);
        if (!isMounted) return;
        setLocalJob(data);
        if (data.status === "completed") {
          navigate(`/result/${id}`, { replace: true });
        } else if (data.status === "queued" || data.status === "running") {
          pollTimer = setTimeout(checkJob, 1000);
        }
      } catch (e) {
        console.error("Failed to check job status", e);
      }
    };

    checkJob();
    return () => { isMounted = false; if (pollTimer) clearTimeout(pollTimer); };
  }, [id, navigate]);

  // Redirect on completion
  useEffect(() => {
    const activeStatus = currentJob?.job_id === id ? currentJob?.status : localJob?.status;
    if (activeStatus === "completed") {
      navigate(`/result/${id}`, { replace: true });
    }
  }, [currentJob?.status, localJob?.status, id, navigate]);

  // Typewriter for hook
  useEffect(() => {
    if (!partialHook || partialHook === hookRef.current) return;
    hookRef.current = partialHook;
    setDisplayedHook("");
    let i = 0;
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    typewriterRef.current = setInterval(() => {
      i++;
      setDisplayedHook(partialHook.slice(0, i));
      if (i >= partialHook.length) clearInterval(typewriterRef.current!);
    }, 28);
    return () => { if (typewriterRef.current) clearInterval(typewriterRef.current); };
  }, [partialHook]);

  const job = currentJob?.job_id === id ? currentJob : localJob;
  const theme = job?.plan?.theme ?? currentTheme;
  const accent = theme.palette.accent;
  const activeMessage = job?.message || theme.loading_messages[
    Math.max(0, ALL_STEPS.indexOf(job?.current_step || "understanding"))
  ] || "Initializing pipeline...";

  const elapsed = job?.elapsed_sec ?? 0;
  const currentStepIdx = ALL_STEPS.indexOf(job?.current_step || "understanding");
  const progress = job?.status === "completed"
    ? 100
    : Math.min(95, (currentStepIdx / 7) * 100 + 5);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-3xl space-y-8"
      >
        {/* ── Header ── */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-white/60">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
            Job {id?.slice(-8)} · {elapsed.toFixed(1)}s elapsed
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-black text-white">
            {job?.status === "completed" ? "✓ Ready to watch!" : "Directing Your Cinematic Vision…"}
          </h1>
          {job?.input && (
            <p className="text-sm text-white/40 max-w-md mx-auto italic">"{job.input.slice(0, 80)}"</p>
          )}
        </div>

        {/* ── Loading Visual with Orbital Ring ── */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Orbital ring */}
            {job?.status !== "completed" && job?.status !== "failed" && (
              <div className="absolute inset-[-20px] rounded-full border border-dashed anim-orbital pointer-events-none"
                style={{ borderColor: `${accent}25` }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                  style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }} />
              </div>
            )}

            {/* Neon glow background */}
            {job?.status !== "completed" && job?.status !== "failed" && (
              <div className="absolute inset-[-10px] rounded-full opacity-20 blur-xl"
                style={{ backgroundColor: accent }} />
            )}

            {job?.status === "completed" ? (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                className="w-24 h-24 rounded-full flex items-center justify-center text-black shadow-2xl"
                style={{ backgroundColor: accent, boxShadow: `0 0 60px ${accent}88` }}>
                <CheckCircle2 size={44} />
              </motion.div>
            ) : job?.status === "failed" ? (
              <div className="w-24 h-24 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <AlertCircle size={40} />
              </div>
            ) : (
              <LoadingVisual theme={theme} activeMessage={activeMessage} />
            )}
          </div>
        </div>

        {/* ── Cinematic Status Text ── */}
        {job?.status === "running" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs font-mono uppercase tracking-[0.2em] text-white/30"
          >
            {activeMessage}
          </motion.p>
        )}

        {/* ── Hook Typewriter ── */}
        <AnimatePresence>
          {displayedHook && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 text-center border bg-black/40 backdrop-blur-xl"
              style={{ borderColor: `${accent}30` }}
            >
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">
                ↳ Hook Detected
              </p>
              <p className="text-base sm:text-xl font-heading font-bold text-white leading-snug">
                "{displayedHook}
                <span className="inline-block w-0.5 h-5 ml-1 animate-pulse align-middle" style={{ backgroundColor: accent }} />
                "
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Progress Bar ── */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-mono text-white/40">
            <span className="truncate max-w-[70%]">{activeMessage}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ backgroundColor: `${accent}15`, color: accent }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-white/8 rounded-full overflow-hidden relative">
            <motion.div
              className="h-full rounded-full relative"
              style={{ background: `linear-gradient(90deg, ${accent}, ${accent}bb)` }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            >
              {/* Pulsing leading edge */}
              <div className="absolute right-0 top-0 bottom-0 w-4 rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${accent})`, boxShadow: `0 0 12px ${accent}` }} />
            </motion.div>
          </div>
        </div>

        {/* ── 7-Step Cinematic Pipeline ── */}
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest text-center">
            AI Production Pipeline
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {ALL_STEPS.map((stepId, idx) => {
              const status = getStepStatus(stepId, job?.current_step, job?.step_status, job?.status ?? "running");
              const meta = STEP_META[stepId];
              const msg = theme.loading_messages[idx];
              return (
                <motion.div
                  key={stepId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`relative p-3.5 rounded-xl border backdrop-blur-sm transition-all overflow-hidden ${
                    status === "running"
                      ? "border-[var(--accent)] bg-[var(--accent)]/8"
                      : status === "done"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : status === "failed"
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-white/8 bg-white/[0.02]"
                  }`}
                  style={status === "running" ? { ["--step-color" as string]: accent } : {}}
                >
                  {/* Scan line animation for active step */}
                  {status === "running" && (
                    <div className="absolute left-0 right-0 h-px anim-scan-job pointer-events-none"
                      style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    {status === "running" && <Loader2 size={13} className="animate-spin" style={{ color: accent }} />}
                    {status === "done" && <CheckCircle2 size={13} className="text-emerald-400" />}
                    {status === "failed" && <AlertCircle size={13} className="text-red-400" />}
                    {status === "pending" && <Clock size={13} className="text-white/20" />}
                    <span className={`text-[10px] font-mono font-bold ${
                      status === "running" ? "text-[var(--accent)]" :
                      status === "done" ? "text-emerald-400" :
                      status === "failed" ? "text-red-400" : "text-white/25"
                    }`}>
                      Step {idx + 1}
                    </span>
                    <span className="text-white/20 ml-auto">{meta.icon}</span>
                  </div>
                  <p className={`text-[11px] font-heading font-semibold leading-tight ${
                    status === "pending" ? "text-white/25" : "text-white/85"
                  }`}>
                    {meta.fullLabel}
                  </p>
                  {status === "running" && msg && (
                    <p className="text-[9px] text-white/40 mt-1.5 line-clamp-2">{msg}</p>
                  )}
                </motion.div>
              );
            })}

            {/* ETA Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="p-3.5 rounded-xl border border-white/8 bg-white/[0.02] flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap size={13} className="text-white/20" />
                <span className="text-[10px] font-mono text-white/25">ETA</span>
              </div>
              <div>
                <p className="text-lg font-heading font-black text-white">
                  {job?.status === "completed" ? "Done!" : `~${Math.max(0, 90 - elapsed).toFixed(0)}s`}
                </p>
                <p className="text-[9px] text-white/25 font-mono">Target ≤90s</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Scene Cards Reveal ── */}
        <AnimatePresence>
          {partialScenes && partialScenes.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest text-center">
                ↳ AI Storyboard ({partialScenes.length} scenes)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {partialScenes.map((s: any, i: number) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 text-xs space-y-1.5 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold" style={{ backgroundColor: `${accent}20`, color: accent }}>
                        Scene {s.id}
                      </span>
                      <span className="text-white/30 text-[10px] font-mono">{s.duration_sec}s</span>
                    </div>
                    <p className="text-white/85 font-semibold truncate leading-tight">{s.on_screen_text}</p>
                    <p className="text-white/30 text-[9px] truncate">{s.visual_query}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error State ── */}
        {job?.status === "failed" && (
          <div className="rounded-2xl p-5 border border-red-500/30 bg-red-500/5 backdrop-blur-xl space-y-3 text-center">
            <p className="text-red-400 font-semibold">{job.error || "Generation failed"}</p>
            <button onClick={() => navigate("/")}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm transition-all">
              <RefreshCw size={14} /> Return to Dashboard
            </button>
          </div>
        )}

        {/* ── Completed CTA ── */}
        {job?.status === "completed" && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate(`/result/${id}`)}
            className="w-full py-4 rounded-2xl text-black font-heading font-black text-lg uppercase tracking-wider flex items-center justify-center gap-3 shadow-2xl transition-all hover:opacity-90 hover:scale-[1.01]"
            style={{ backgroundColor: accent, boxShadow: `0 0 50px ${accent}88` }}
          >
            Watch Your Video <ArrowRight size={22} />
          </motion.button>
        )}

        {/* ── Pipeline Footer ── */}
        <p className="text-center text-[9px] font-mono text-white/15">
          Pipeline: Prompt → AI Research → Script → Storyboard → Visual Gen → Voice → Compose → QC → Render
        </p>
      </motion.div>
    </div>
  );
};

export default JobPage;
