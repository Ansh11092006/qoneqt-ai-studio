import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Check, FileText, Sparkles, Film, ShieldAlert } from "lucide-react";
import { JobStatus } from "@/api/client";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobStatus | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, job }) => {
  const [format, setFormat] = useState<"mp4" | "mov" | "webm" | "gif">("mp4");
  const [resolution, setResolution] = useState<"720p" | "1080p" | "4k">("1080p");
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copiedSrt, setCopiedSrt] = useState(false);

  if (!isOpen || !job) return null;

  const accent = job.plan?.theme?.palette?.accent || "#ff0055";

  const generateSrtContent = () => {
    if (!job.plan?.scenes) return "1\n00:00:00,000 --> 00:00:03,000\n" + (job.plan?.hook || "Qoneqt AI Video");
    let srt = "";
    let currTime = 0;
    job.plan.scenes.forEach((s, idx) => {
      const start = new Date(currTime * 1000).toISOString().substr(11, 12).replace('.', ',');
      const end = new Date((currTime + s.duration_sec) * 1000).toISOString().substr(11, 12).replace('.', ',');
      srt += `${idx + 1}\n${start} --> ${end}\n${s.on_screen_text}\n\n`;
      currTime += s.duration_sec;
    });
    return srt;
  };

  const handleDownloadSrt = () => {
    const content = generateSrtContent();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qoneqt-${job.job_id.slice(-8)}.srt`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedSrt(true);
    setTimeout(() => setCopiedSrt(false), 2000);
  };

  const handleDownloadVideo = () => {
    if (!job.video_url) return;
    setDownloading(true);
    const a = document.createElement("a");
    a.href = job.video_url;
    a.download = `qoneqt-${job.job_id.slice(-8)}-${resolution}.${format}`;
    a.click();
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg rounded-3xl bg-[#141213] border border-white/15 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-6 text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles style={{ color: accent }} size={20} />
              <h3 className="font-heading font-black text-xl">Export Studio</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Formats Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-white/50 uppercase tracking-widest">Output Format</label>
            <div className="grid grid-cols-4 gap-2">
              {(["mp4", "mov", "webm", "gif"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all border ${
                    format === fmt
                      ? "bg-white/15 text-white border-white/40 shadow-lg"
                      : "bg-white/5 text-white/50 border-white/8 hover:text-white"
                  }`}
                  style={format === fmt ? { borderColor: accent, color: accent } : {}}
                >
                  .{fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Resolution Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-white/50 uppercase tracking-widest">Resolution Quality</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "720p", label: "720p HD", sub: "Standard" },
                { id: "1080p", label: "1080p Full HD", sub: "Production" },
                { id: "4k", label: "4K Ultra HD", sub: "Pro Cinema" },
              ].map((res) => (
                <button
                  key={res.id}
                  onClick={() => setResolution(res.id as any)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    resolution === res.id
                      ? "bg-white/15 border-white/40 shadow-lg"
                      : "bg-white/5 border-white/8 opacity-60 hover:opacity-100"
                  }`}
                  style={resolution === res.id ? { borderColor: accent } : {}}
                >
                  <p className="text-xs font-bold text-white">{res.label}</p>
                  <p className="text-[9px] font-mono text-white/40">{res.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Toggles */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/8">
              <div>
                <p className="text-xs font-semibold text-white">Burn-In ASS Captions</p>
                <p className="text-[10px] text-white/40">Render word-highlighted captions into video</p>
              </div>
              <input
                type="checkbox"
                checked={burnSubtitles}
                onChange={(e) => setBurnSubtitles(e.target.checked)}
                className="w-4 h-4 accent-[#ff0055]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleDownloadSrt}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold transition-all text-white"
            >
              {copiedSrt ? <><Check size={14} className="text-emerald-400" /> SRT Downloaded</> : <><FileText size={14} /> Download .SRT</>}
            </button>

            <button
              onClick={handleDownloadVideo}
              disabled={downloading || !job.video_url}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-black font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              style={{ backgroundColor: accent, boxShadow: `0 0 25px ${accent}66` }}
            >
              <Download size={16} />
              {downloading ? "Exporting..." : `Download ${format.toUpperCase()}`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
