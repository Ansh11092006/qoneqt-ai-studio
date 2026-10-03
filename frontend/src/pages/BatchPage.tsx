import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Play, CheckCircle2, Loader2, AlertCircle, Clock, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { JobStatus } from "@/api/client";

interface BatchJobRow {
  idea: string;
  jobId?: string;
  status: "pending" | "queued" | "running" | "completed" | "failed";
  progress: number;
}

export const BatchPage: React.FC = () => {
  const [ideas, setIdeas] = useState("");
  const [rows, setRows] = useState<BatchJobRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const ideaList = ideas.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10);

  const handleSubmit = async () => {
    if (!ideaList.length) return;
    setSubmitting(true);

    // Init rows
    const initialRows: BatchJobRow[] = ideaList.map((idea) => ({
      idea,
      status: "pending",
      progress: 0,
    }));
    setRows(initialRows);

    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideas: ideaList }),
      });
      const data = await res.json();
      const jobIds: string[] = data.job_ids ?? [];

      // Update rows with job IDs
      setRows((prev) =>
        prev.map((row, i) => ({
          ...row,
          jobId: jobIds[i],
          status: "queued",
        }))
      );

      // Start polling
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch("/api/jobs?limit=50");
          const allJobs: JobStatus[] = await pollRes.json();
          setRows((prev) => {
            const updated = prev.map((row) => {
              if (!row.jobId) return row;
              const job = allJobs.find((j) => j.job_id === row.jobId);
              if (!job) return row;
              const STEPS = ["understanding", "script", "scenes", "visuals", "voice", "compose", "qc"];
              const stepIdx = STEPS.indexOf(job.current_step ?? "");
              const progress = job.status === "completed" ? 100
                : job.status === "failed" ? 0
                : stepIdx >= 0 ? Math.round(((stepIdx + 1) / 7) * 95)
                : 5;
              return {
                ...row,
                status: job.status as BatchJobRow["status"],
                progress,
              };
            });
            const allDone = updated.every((r) => r.status === "completed" || r.status === "failed");
            if (allDone && pollRef.current) clearInterval(pollRef.current);
            return updated;
          });
        } catch {}
      }, 2500);
    } catch (e) {
      setRows((prev) => prev.map((r) => ({ ...r, status: "failed" })));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const completedCount = rows.filter((r) => r.status === "completed").length;
  const failedCount = rows.filter((r) => r.status === "failed").length;
  const runningCount = rows.filter((r) => r.status === "running").length;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-[var(--accent)]" />
            <h1 className="font-heading text-3xl font-black text-white">
              Batch <span className="text-[var(--accent)]">Queue</span>
            </h1>
          </div>
          <p className="text-sm text-white/50">Generate up to 10 videos in parallel · 2 concurrent renders</p>
        </div>

        {/* Input */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-white">Ideas (one per line)</label>
            <span className={`text-xs font-mono ${ideaList.length >= 10 ? "text-red-400" : "text-white/40"}`}>
              {ideaList.length}/10
            </span>
          </div>
          <textarea
            value={ideas}
            onChange={(e) => setIdeas(e.target.value)}
            disabled={submitting || rows.length > 0}
            rows={8}
            placeholder={"5 Cybersecurity Mistakes Students Make\n3 Workout Mistakes Killing Your Gains\n3 Hidden Gems in Japan Tourists Miss\nHow AI Will Change Content Creation in 2025\nThe Truth About Passive Income Online\n(one idea per line, max 10)"}
            className="w-full p-4 rounded-xl bg-black/50 border border-white/15 text-sm text-white placeholder-white/30 focus:border-[var(--accent)] focus:outline-none resize-none font-mono disabled:opacity-50"
          />

          <button
            onClick={handleSubmit}
            disabled={submitting || ideaList.length === 0 || rows.length > 0}
            className="w-full py-3.5 rounded-xl text-black font-heading font-black text-base uppercase tracking-wider transition-all hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
            style={{
              backgroundColor: "var(--accent)",
              boxShadow: "0 0 30px var(--accent)44",
            }}
          >
            {submitting ? "Queuing…" : `Generate ${ideaList.length} Video${ideaList.length !== 1 ? "s" : ""}`}
          </button>
        </div>

        {/* Progress rows */}
        <AnimatePresence>
          {rows.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Summary bar */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={12} /> {completedCount} done
                </span>
                {runningCount > 0 && (
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <Loader2 size={12} className="animate-spin" /> {runningCount} rendering
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="flex items-center gap-1.5 text-red-400">
                    <XCircle size={12} /> {failedCount} failed
                  </span>
                )}
                <span className="text-white/30 ml-auto">{rows.length - completedCount - failedCount} remaining</span>
              </div>

              {/* Job rows */}
              <div className="space-y-3">
                {rows.map((row, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {row.status === "completed" && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
                        {row.status === "running" && <Loader2 size={16} className="animate-spin text-[var(--accent)] shrink-0" />}
                        {row.status === "queued" && <Clock size={16} className="text-yellow-400 shrink-0" />}
                        {row.status === "failed" && <AlertCircle size={16} className="text-red-400 shrink-0" />}
                        {row.status === "pending" && <Clock size={16} className="text-white/30 shrink-0" />}
                        <p className="text-sm text-white truncate">{row.idea}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-white/40">{row.progress}%</span>
                        {row.status === "completed" && row.jobId && (
                          <Link
                            to={`/result/${row.jobId}`}
                            className="flex items-center gap-1 text-[10px] font-mono text-[var(--accent)] hover:underline whitespace-nowrap"
                          >
                            <Play size={10} /> Watch
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: row.status === "failed" ? "#ef4444"
                            : row.status === "completed" ? "#22c55e"
                            : "var(--accent)",
                        }}
                        animate={{ width: `${row.progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Reset */}
              {rows.every((r) => r.status === "completed" || r.status === "failed") && (
                <button
                  onClick={() => { setRows([]); setIdeas(""); }}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-semibold transition-all"
                >
                  + Queue New Batch
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
