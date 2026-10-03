import React from "react";
import { Terminal, CheckCircle2, Clock, AlertCircle, Sparkles } from "lucide-react";
import { useJob } from "@/store/job-context";

const PIPELINE_STEPS = [
  { id: "understanding", name: "1. Topic Understanding", desc: "Context & theme detection" },
  { id: "script", name: "2. Script & Hook", desc: "Gemini structured JSON director" },
  { id: "scenes", name: "3. Scene Planning", desc: "Duration pacing & visual queries" },
  { id: "visuals", name: "4. Visual Sourcing", desc: "Uploads > Pexels > Dynamic cards" },
  { id: "voice", name: "5. Voice Synthesis", desc: "edge-tts + word timings" },
  { id: "compose", name: "6. Video Composer", desc: "FFmpeg 1080x1920 + ASS subtitles" },
  { id: "qc", name: "7. Quality Control", desc: "Automated 7-point audit & score" },
];

export const MonitorCard: React.FC = () => {
  const { currentJob, events, isGenerating } = useJob();

  return (
    <div className="flex flex-col h-full justify-between space-y-3">
      {/* Header telemetry badge */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[var(--accent)]" />
          <span className="font-mono text-white/80">
            {isGenerating ? "RUNNING PIPELINE" : "PIPELINE ENGINE IDLE"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-white/50">
          <span className={`w-2 h-2 rounded-full ${isGenerating ? "bg-yellow-400 animate-ping" : "bg-emerald-400"}`} />
          <span>{currentJob ? `Job ${currentJob.job_id.slice(-6)}` : "Standby"}</span>
        </div>
      </div>

      {/* Stepper Display */}
      {!isGenerating && (!events.length || currentJob?.status === "completed") ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
          {PIPELINE_STEPS.slice(0, 4).map((s) => (
            <div key={s.id} className="p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-1">
              <span className="text-[11px] font-heading font-bold text-white block truncate">{s.name}</span>
              <span className="text-[9px] text-white/40 block truncate">{s.desc}</span>
            </div>
          ))}
          {PIPELINE_STEPS.slice(4, 7).map((s) => (
            <div key={s.id} className="p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-1">
              <span className="text-[11px] font-heading font-bold text-white block truncate">{s.name}</span>
              <span className="text-[9px] text-white/40 block truncate">{s.desc}</span>
            </div>
          ))}
          <div className="p-2.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center">
            <span className="text-[10px] font-mono text-[var(--accent)] font-bold text-center">Ready to render</span>
          </div>
        </div>
      ) : (
        /* Real-time SSE events log */
        <div className="space-y-1.5 font-mono text-xs max-h-44 overflow-y-auto pr-1">
          {events.map((ev, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded bg-black/50 border border-white/10 text-white/80"
            >
              <div className="flex items-center gap-2 min-w-0">
                {ev.status === "running" && <Clock size={12} className="text-yellow-400 shrink-0 animate-spin" />}
                {ev.status === "done" && <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
                {ev.status === "failed" && <AlertCircle size={12} className="text-red-400 shrink-0" />}
                {!ev.status && <Sparkles size={12} className="text-[var(--accent)] shrink-0" />}
                <span className="text-[11px] truncate text-white/90">
                  {ev.message || ev.hook || `${ev.step} updated`}
                </span>
              </div>
              {ev.elapsed_sec !== undefined && (
                <span className="text-[10px] text-white/40 shrink-0 ml-2">
                  {ev.elapsed_sec}s
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/40">
        <span>Target: $\le$ 90s end-to-end</span>
        <span className="text-[var(--accent)]">● Real-time SSE Stream</span>
      </div>
    </div>
  );
};
