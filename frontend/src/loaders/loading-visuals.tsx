import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Terminal, Globe, Rocket, Film, TrendingUp, Radio } from "lucide-react";

interface VisualProps {
  accent: string;
  activeMessage: string;
}

// 1. Terminal Loader
export const TerminalLoader: React.FC<VisualProps> = ({ accent, activeMessage }) => {
  const [lines, setLines] = useState<string[]>([
    "root@qoneqt-ai:~# init pipeline --target 1080x1920",
    "Allocating neural tensor buffers... [OK]",
  ]);

  useEffect(() => {
    if (activeMessage) {
      setLines((prev) => [...prev.slice(-4), `> ${activeMessage}`]);
    }
  }, [activeMessage]);

  return (
    <div className="w-full max-w-lg bg-black/75 border border-white/10 rounded-xl p-4 font-mono text-sm shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10 text-white/50 text-xs">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-2 flex items-center gap-1.5 text-white/70">
          <Terminal size={14} style={{ color: accent }} />
          qoneqt_pipeline_daemon.sh
        </span>
      </div>
      <div className="space-y-1.5 min-h-[110px]">
        {lines.map((l, i) => (
          <div key={i} className="text-white/80 leading-relaxed break-all">
            {l}
          </div>
        ))}
        <div className="flex items-center gap-1.5" style={{ color: accent }}>
          <span>&gt;</span>
          <span className="inline-block w-2 h-4 bg-current animate-pulse" />
        </div>
      </div>
    </div>
  );
};

// 2. Globe Loader
export const GlobeLoader: React.FC<VisualProps> = ({ accent }) => {
  return (
    <div className="relative w-44 h-44 flex items-center justify-center">
      {/* Outer rotating ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
        className="absolute inset-0 rounded-full border border-dashed border-white/20"
      />
      {/* Inner accent ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        className="absolute inset-4 rounded-full border border-white/30"
        style={{ borderColor: `${accent}88` }}
      />
      {/* Center glowing orb */}
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: `radial-gradient(circle, ${accent}44 0%, transparent 80%)`,
          boxShadow: `0 0 35px -5px ${accent}66`,
        }}
      >
        <Globe size={42} style={{ color: accent }} />
      </motion.div>
    </div>
  );
};

// 3. Rocket Loader
export const RocketLoader: React.FC<VisualProps> = ({ accent }) => {
  return (
    <div className="relative w-44 h-44 flex flex-col items-center justify-center">
      <motion.div
        animate={{ y: [-8, 8, -8] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="relative z-10"
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: `1px solid ${accent}66`,
            boxShadow: `0 0 30px -4px ${accent}88`,
          }}
        >
          <Rocket size={40} style={{ color: accent }} />
        </div>
      </motion.div>
      {/* Rocket exhaust flame */}
      <motion.div
        animate={{ scaleY: [0.8, 1.4, 0.8], opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 0.3 }}
        className="w-5 h-12 rounded-full -mt-2 blur-xs origin-top"
        style={{
          background: `linear-gradient(to bottom, ${accent}, #ff4500, transparent)`,
        }}
      />
    </div>
  );
};

// 4. Film Reel Loader
export const FilmReelLoader: React.FC<VisualProps> = ({ accent }) => {
  return (
    <div className="flex items-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
        className="w-28 h-28 rounded-full border-4 border-dashed flex items-center justify-center shadow-xl"
        style={{ borderColor: accent, boxShadow: `0 0 25px -4px ${accent}55` }}
      >
        <Film size={36} style={{ color: accent }} />
      </motion.div>
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
        className="w-20 h-20 rounded-full border-4 border-dashed border-white/30 flex items-center justify-center"
      >
        <div className="w-6 h-6 rounded-full bg-white/20" />
      </motion.div>
    </div>
  );
};

// 5. Chart Loader
export const ChartLoader: React.FC<VisualProps> = ({ accent }) => {
  return (
    <div className="w-52 h-36 bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-2xl">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span className="flex items-center gap-1.5 text-white/70">
          <TrendingUp size={14} style={{ color: accent }} /> Growth Matrix
        </span>
        <span style={{ color: accent }} className="font-bold">+94.6%</span>
      </div>
      <div className="flex items-end gap-2.5 h-20 pt-2">
        {[30, 45, 60, 40, 85, 95].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: "15%" }}
            animate={{ height: [`${h * 0.4}%`, `${h}%`, `${h * 0.7}%`] }}
            transition={{ repeat: Infinity, duration: 2, delay: i * 0.15 }}
            className="flex-1 rounded-t-md"
            style={{
              backgroundColor: i === 5 ? accent : `${accent}66`,
              boxShadow: i === 5 ? `0 0 15px ${accent}` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
};

// 6. Pulse Loader (Radar Rings)
export const PulseLoader: React.FC<VisualProps> = ({ accent }) => {
  return (
    <div className="relative w-44 h-44 flex items-center justify-center">
      {[1, 2, 3].map((ring) => (
        <motion.div
          key={ring}
          initial={{ scale: 0.3, opacity: 0.8 }}
          animate={{ scale: [0.3, 1.3], opacity: [0.8, 0] }}
          transition={{
            repeat: Infinity,
            duration: 2.4,
            delay: ring * 0.6,
            ease: "easeOut",
          }}
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: accent }}
        />
      ))}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center relative z-10 shadow-2xl"
        style={{
          background: accent,
          color: "#000000",
          boxShadow: `0 0 35px ${accent}`,
        }}
      >
        <Radio size={28} />
      </div>
    </div>
  );
};
