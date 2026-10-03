import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film, Clock, BarChart3, CheckCircle2, XCircle, Play,
  Search, Filter, Trash2, Copy, Download, Sparkles, SlidersHorizontal
} from "lucide-react";
import { JobStatus, deleteJob, duplicateJob } from "@/api/client";
import { ExportModal } from "@/components/ExportModal";

const statusColors: Record<string, string> = {
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  queued: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const LibraryPage: React.FC = () => {
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"newest" | "score" | "duration">("newest");
  const [exportJob, setExportJob] = useState<JobStatus | null>(null);
  const navigate = useNavigate();

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs?limit=100");
      setJobs(await res.json());
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const t = setInterval(fetchJobs, 6000);
    return () => clearInterval(t);
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteJob(id);
    await fetchJobs();
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const newJob = await duplicateJob(id);
      await fetchJobs();
      navigate(`/job/${newJob.job_id}`);
    } catch {}
  };

  const handleExport = (e: React.MouseEvent, job: JobStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setExportJob(job);
  };

  // Filter & Sort logic
  const filteredJobs = jobs
    .filter((j) => {
      const matchesSearch =
        (j.plan?.title || j.input).toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.job_id.includes(searchQuery);
      const jobCategory = j.options.category || "Published";
      const matchesCategory = category === "All" || jobCategory === category;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "score") {
        return (b.qc_report?.score || 0) - (a.qc_report?.score || 0);
      }
      if (sortBy === "duration") {
        return b.options.duration - a.options.duration;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-black text-white">
              Video <span className="text-[#ff0055]">Library</span>
            </h1>
            <p className="text-sm text-white/50 mt-1">Manage, duplicate, search and export your AI video assets ({jobs.length} total)</p>
          </div>
          <Link
            to="/create"
            className="px-5 py-2.5 rounded-xl bg-[#ff0055] hover:bg-[#e0004c] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(255,0,85,0.4)] transition-all w-fit"
          >
            + Create New Video
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-[#141213] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {["All", "Published", "Draft", "Scheduled", "Archived"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  category === cat
                    ? "bg-[#ff0055] text-white font-bold shadow-md"
                    : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos or prompts..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#ff0055]"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none"
            >
              <option value="newest" className="bg-neutral-900">Sort: Newest</option>
              <option value="score" className="bg-neutral-900">Sort: Highest QC Score</option>
              <option value="duration" className="bg-neutral-900">Sort: Duration</option>
            </select>
          </div>
        </div>

        {/* Library Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-[#ff0055] border-t-transparent animate-spin" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/40 space-y-4 border border-dashed border-white/10 rounded-3xl bg-black/20">
            <Film size={48} className="opacity-40 text-[#ff0055]" />
            <p className="text-lg">No matching videos found</p>
            <p className="text-xs text-white/30">Try clearing your search query or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredJobs.map((job, i) => (
                <motion.div
                  key={job.job_id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="group rounded-2xl overflow-hidden bg-[#171516] border border-white/10 hover:border-[#ff0055]/60 transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,0,85,0.25)] flex flex-col justify-between">
                    {/* Thumbnail */}
                    <div className="relative aspect-[9/16] bg-black/60 overflow-hidden">
                      {job.thumbnail_url ? (
                        <img
                          src={job.thumbnail_url}
                          alt={job.plan?.title ?? "Video"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-black">
                          <Film size={32} className="text-white/30" />
                        </div>
                      )}

                      {/* Card Overlay Controls */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-3 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex justify-between items-center">
                          <span className="px-2 py-0.5 rounded-full bg-black/70 text-[9px] font-mono text-white/80 border border-white/10">
                            {job.options.aspect_ratio || "9:16"}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleDuplicate(e, job.job_id)}
                              title="Duplicate Video"
                              className="p-1.5 rounded-full bg-black/80 hover:bg-white/20 text-white transition-all"
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              onClick={(e) => handleExport(e, job)}
                              title="Export Studio"
                              className="p-1.5 rounded-full bg-black/80 hover:bg-[#ff0055] text-white transition-all"
                            >
                              <Download size={12} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, job.job_id)}
                              title="Delete Permanently"
                              className="p-1.5 rounded-full bg-black/80 hover:bg-rose-600 text-white transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Watch CTA Button */}
                        <button
                          onClick={() => navigate(job.status === "completed" ? `/result/${job.job_id}` : `/job/${job.job_id}`)}
                          className="w-full py-2 rounded-xl bg-[#ff0055] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg"
                        >
                          <Play size={12} fill="currentColor" /> Watch Video
                        </button>
                      </div>

                      {/* Top Badges (Static) */}
                      <div className="absolute top-2 right-2 group-hover:opacity-0 transition-opacity">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border backdrop-blur ${statusColors[job.status] ?? statusColors.queued}`}>
                          {job.status}
                        </span>
                      </div>

                      {job.qc_report && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur group-hover:opacity-0 transition-opacity">
                          <CheckCircle2 size={10} className="text-emerald-400" />
                          <span className="text-[10px] font-mono text-white font-bold">{job.qc_report.score}/100</span>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-3.5 space-y-2">
                      <p className="text-white font-heading font-bold text-sm leading-snug line-clamp-2">
                        {job.plan?.title ?? job.input}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-white/40 font-mono pt-1 border-t border-white/5">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {job.options.duration}s
                        </span>
                        <span className="text-[#ff0055] font-bold">
                          {job.options.resolution || "1080p"}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Export Center Modal */}
        <ExportModal
          isOpen={!!exportJob}
          onClose={() => setExportJob(null)}
          job={exportJob}
        />
      </div>
    </div>
  );
};
