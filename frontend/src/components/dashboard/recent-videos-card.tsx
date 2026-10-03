import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Play, ArrowRight, Trash2, CheckSquare, Square, RefreshCw, X, AlertTriangle, Sparkles } from "lucide-react";
import { useJob } from "@/store/job-context";
import { deleteJob, deleteJobsBatch } from "@/api/client";

export const RecentVideosCard: React.FC = () => {
  const { recentJobs, refreshRecentJobs } = useJob();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [undoBanner, setUndoBanner] = useState<{ id: string; title: string; timer: NodeJS.Timeout } | null>(null);

  const displayJobs = recentJobs.slice(0, 6);

  const handleOpenDeleteModal = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    setShowConfirmModal(true);
  };

  const confirmDeleteSingle = async () => {
    if (!deletingId) return;
    const targetJob = recentJobs.find((j) => j.job_id === deletingId);
    const title = targetJob?.plan?.title || targetJob?.input || "Video";

    setShowConfirmModal(false);
    await deleteJob(deletingId);
    await refreshRecentJobs();

    // Set 10-second undo banner
    if (undoBanner) clearTimeout(undoBanner.timer);
    const timer = setTimeout(() => setUndoBanner(null), 10000);
    setUndoBanner({ id: deletingId, title, timer });
    setDeletingId(null);
  };

  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    await deleteJobsBatch(selectedIds);
    setSelectedIds([]);
    setBulkMode(false);
    await refreshRecentJobs();
  };

  const storageFreedEstimate = (selectedIds.length * 8.5).toFixed(1);

  return (
    <div className="flex flex-col h-full justify-between space-y-3 relative">
      {/* Undo Toast Banner */}
      <AnimatePresence>
        {undoBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-12 left-0 right-0 z-30 p-2.5 rounded-xl bg-[#ff0055] text-white flex items-center justify-between text-xs shadow-lg"
          >
            <div className="flex items-center gap-2 truncate">
              <Trash2 size={14} />
              <span className="truncate">Deleted "{undoBanner.title.slice(0, 24)}..."</span>
            </div>
            <button
              onClick={() => {
                clearTimeout(undoBanner.timer);
                setUndoBanner(null);
                refreshRecentJobs();
              }}
              className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 font-bold text-[10px] uppercase font-mono transition-all"
            >
              Undo (10s)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Controls Bar */}
      <div className="flex items-center justify-between text-xs">
        <button
          onClick={() => {
            setBulkMode(!bulkMode);
            setSelectedIds([]);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all font-mono text-[11px] ${
            bulkMode ? "bg-[#ff0055]/20 text-[#ff0055] border border-[#ff0055]/40" : "text-white/50 hover:text-white"
          }`}
        >
          {bulkMode ? <CheckSquare size={13} /> : <Square size={13} />}
          <span>{bulkMode ? `Bulk Mode (${selectedIds.length})` : "Select"}</span>
        </button>

        {bulkMode && selectedIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-md transition-all"
          >
            <Trash2 size={12} /> Delete {selectedIds.length} ({storageFreedEstimate} MB)
          </button>
        )}
      </div>

      {/* Grid or Empty State */}
      {displayJobs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-white/40 space-y-3 border border-dashed border-white/10 rounded-2xl bg-black/20">
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
            <Film size={32} className="text-[#ff0055] opacity-60" />
          </motion.div>
          <div>
            <p className="text-sm font-bold text-white">No Videos Yet</p>
            <p className="text-xs text-white/40">Generate your first AI video above!</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-52 pr-1">
          <AnimatePresence>
            {displayJobs.map((job) => (
              <motion.div
                key={job.job_id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, filter: "blur(8px)" }}
                transition={{ duration: 0.3 }}
                className="relative group"
              >
                <Link
                  to={`/result/${job.job_id}`}
                  className={`block rounded-2xl overflow-hidden border glass-panel aspect-9/16 max-h-36 shadow-md transition-all flex flex-col justify-between p-2 relative ${
                    selectedIds.includes(job.job_id)
                      ? "border-[#ff0055] ring-2 ring-[#ff0055]"
                      : "border-white/10 hover:border-[#ff0055]/60 hover:shadow-[0_0_20px_rgba(255,0,85,0.3)]"
                  }`}
                >
                  {job.thumbnail_url ? (
                    <img
                      src={job.thumbnail_url}
                      alt={job.input}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                      <Film size={20} className="text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                  {/* Header Row: Duration + Delete / Checkbox */}
                  <div className="relative z-10 flex justify-between items-center text-[9px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-black/70 text-white/80 border border-white/10">
                      {job.options.duration}s
                    </span>

                    <div className="flex items-center gap-1">
                      {bulkMode ? (
                        <button
                          onClick={(e) => handleToggleSelect(e, job.job_id)}
                          className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                            selectedIds.includes(job.job_id)
                              ? "bg-[#ff0055] text-white border-[#ff0055]"
                              : "bg-black/60 border-white/20 text-white/50"
                          }`}
                        >
                          ✓
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleOpenDeleteModal(e, job.job_id)}
                          title="Delete Video"
                          className="p-1 rounded-full bg-black/60 hover:bg-rose-600 text-white/60 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Play Hover */}
                  <div className="relative z-10 space-y-1">
                    <p className="text-[11px] font-heading font-bold text-white line-clamp-2 leading-tight">
                      {job.plan?.title || job.input}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-[#ff0055] font-medium">
                      <Play size={10} fill="currentColor" /> Watch Video
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer info */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/40">
        <span>{recentJobs.length} video jobs stored</span>
        <Link to="/library" className="flex items-center gap-1 text-[#ff0055] hover:underline">
          View Library <ArrowRight size={12} />
        </Link>
      </div>

      {/* Premium Confirmation Delete Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-3xl bg-[#171516] border border-white/15 p-6 space-y-4 text-white text-center shadow-2xl"
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="font-heading font-bold text-lg">Delete Video Permanently?</h4>
              <p className="text-xs text-white/50 mt-1">This will erase the video file, metadata, and thumbnails from storage.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSingle}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-all shadow-lg"
              >
                Delete Permanently
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
