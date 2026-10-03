import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX, Eye, Heart,
  Share2, Sparkles, Plus, Compass, Globe, Filter, Users,
  Flame, Clock, Award, Smartphone, X, ChevronRight, Check,
  RotateCcw, Maximize2, Minimize2
} from "lucide-react";
import { getUniverseConfig, UNIVERSE_CONFIGS, UniverseConfig } from "@/config/universeConfig";
import {
  fetchUniverseFeed,
  UniverseFeedResponse,
  UniverseVideoItem
} from "@/services/firebaseUniverseService";

/* ── Floating Particles Matching Universe Accent ── */
const UniverseParticles: React.FC<{ color: string }> = ({ color }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
    {Array.from({ length: 12 }).map((_, i) => (
      <div
        key={i}
        className="absolute w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: color,
          opacity: 0.35,
          left: `${5 + (i * 13) % 90}%`,
          top: `${8 + (i * 17) % 80}%`,
          animation: `particleDrift ${4 + (i % 4)}s ease-in-out infinite`,
          animationDelay: `${i * 0.4}s`,
        }}
      />
    ))}
  </div>
);

/* ── Time Formatter Helper ── */
const formatDuration = (secs: number): string => {
  if (isNaN(secs) || secs <= 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

/* ── Interactive Video Card Component ── */
interface VideoCardProps {
  video: UniverseVideoItem;
  accentColor: string;
  onSelect: (video: UniverseVideoItem) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, accentColor, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(video.duration || null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isHovered && video.videoUrl) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovered, video.videoUrl]);

  const handleMetadataLoaded = () => {
    if (videoRef.current && videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      setDetectedDuration(Math.round(videoRef.current.duration));
    }
  };

  const displayDurationSec = detectedDuration || video.duration;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => onSelect(video)}
      className="group relative cursor-pointer rounded-2xl overflow-hidden bg-[#171516] border border-white/10 hover:border-white/30 transition-all flex flex-col justify-between"
      style={{
        boxShadow: isHovered ? `0 0 25px ${accentColor}33` : "none",
      }}
    >
      {/* Media Preview Box */}
      <div className="relative w-full aspect-video bg-black/60 overflow-hidden">
        {video.thumbnailUrl && (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isHovered && video.videoUrl ? "opacity-0" : "opacity-100"
            }`}
            loading="lazy"
          />
        )}

        {/* Hover preview video (Muted short looping preview for browsing) */}
        {video.videoUrl && (
          <video
            ref={videoRef}
            src={video.videoUrl}
            muted
            loop
            playsInline
            preload="metadata"
            onLoadedMetadata={handleMetadataLoaded}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          />
        )}

        {/* Ambient Dark Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

        {/* Source Badge (Qoneqt AI vs Qoneqt Discovery) */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {video.source === "qoneqt-ai" ? (
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-black flex items-center gap-1 shadow-md"
              style={{ backgroundColor: accentColor }}
            >
              <Sparkles size={9} /> Qoneqt AI
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium text-white/80 bg-black/50 backdrop-blur-md border border-white/10">
              Qoneqt Discovery
            </span>
          )}
        </div>

        {/* Real Source Duration Badge */}
        {displayDurationSec ? (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[9px] font-mono text-white/90 border border-white/10">
            {formatDuration(displayDurationSec)}
          </div>
        ) : null}

        {/* Play Icon Overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isHovered ? "opacity-100 scale-110" : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: accentColor, color: "#000" }}
          >
            <Play size={18} fill="#000" className="ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-heading font-bold text-xs sm:text-sm text-white line-clamp-2 group-hover:text-white transition-colors">
            {video.title}
          </h3>
          <p className="text-[10px] text-white/40 font-mono mt-1">
            {video.creatorId}
          </p>
        </div>

        <div className="pt-2 border-t border-white/8 flex items-center justify-between text-[10px] font-mono text-white/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye size={11} className="text-white/40" /> {video.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart size={11} className="text-[#ff0055]" /> {video.likes}
            </span>
          </div>

          {video.topics && video.topics[0] && (
            <span
              className="px-1.5 py-0.5 rounded text-[8px] border truncate max-w-[90px]"
              style={{ borderColor: `${accentColor}30`, color: accentColor }}
            >
              #{video.topics[0]}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ── Interactive Video Player Modal (Full Source Video, Full Duration & Audio) ── */
interface VideoModalProps {
  video: UniverseVideoItem | null;
  universe: UniverseConfig;
  onClose: () => void;
  onRemix: (video: UniverseVideoItem) => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ video, universe, onClose, onRemix }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false); // Audio active upon user interaction
  const [volume, setVolume] = useState(0.9);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video?.duration || 0);
  const [progress, setProgress] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const [hasAudio, setHasAudio] = useState<boolean | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const el = containerRef.current || playerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Whenever a new video source is loaded, reset playback state cleanly
  useEffect(() => {
    const v = playerRef.current;
    if (!v || !video?.videoUrl) return;

    v.pause();
    setCurrentTime(0);
    setProgress(0);
    setIsPlaying(false);
    setIsEnded(false);
    setError(null);
    setIsBuffering(false);
    v.volume = volume;
    v.muted = isMuted;

    v.load();

    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn("[VideoPlayer] Autoplay with sound restricted, falling back to muted:", err);
          if (v.muted === false) {
            v.muted = true;
            setIsMuted(true);
            v.play().catch(() => {});
          }
        });
    }
  }, [video?.videoUrl]);

  const togglePlay = () => {
    const v = playerRef.current;
    if (!v) return;
    if (isEnded) {
      v.currentTime = 0;
      setCurrentTime(0);
      setProgress(0);
      setIsEnded(false);
      v.play().catch(() => {});
      setIsPlaying(true);
      return;
    }
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      v.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const v = playerRef.current;
    if (!v) return;
    const nextMuted = !isMuted;
    v.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      setVolume(0.8);
      v.volume = 0.8;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const v = playerRef.current;
    if (v) {
      v.volume = val;
      v.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  // ONLY READ position from HTML5 video element — NEVER alter currentTime or duration here
  const handleTimeUpdate = () => {
    const v = playerRef.current;
    if (!v) return;

    const cur = v.currentTime;
    const dur = v.duration;

    setCurrentTime(cur);

    if (Number.isFinite(dur) && dur > 0) {
      setDuration(dur);
      setProgress((cur / dur) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    const v = playerRef.current;
    if (!v) return;

    const dur = v.duration;
    if (Number.isFinite(dur) && dur > 0) {
      setDuration(dur);
    }

    const vAny = v as any;
    const audioDetected = Boolean(
      (vAny.audioTracks && vAny.audioTracks.length > 0) ||
      (vAny.mozHasAudio) ||
      (vAny.webkitAudioDecodedByteCount !== undefined ? vAny.webkitAudioDecodedByteCount > 0 : true)
    );
    setHasAudio(audioDetected);

    console.log("[VIDEO]", {
      event: "loadedmetadata",
      currentTime: v.currentTime,
      duration: v.duration,
      readyState: v.readyState
    });
  };

  // Only user seeking modifies video.currentTime
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = playerRef.current;
    if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const nextTime = Math.max(0, Math.min(ratio * v.duration, v.duration));

    v.currentTime = nextTime;
    setCurrentTime(nextTime);
    setProgress((nextTime / v.duration) * 100);
    if (isEnded) setIsEnded(false);
  };

  // onEnded only executes when HTML5 video actually signals ended
  const handleVideoEnded = () => {
    const v = playerRef.current;
    if (!v || !v.ended) return;

    setIsPlaying(false);
    setIsEnded(true);
    setProgress(100);
    console.log("[VIDEO]", {
      event: "ended",
      currentTime: v.currentTime,
      duration: v.duration,
      ended: v.ended
    });
  };

  const handleVideoError = () => {
    console.error("[VIDEO] Playback error on source:", video?.videoUrl);
    setError("Unable to play this video. The media stream might be temporarily unreachable.");
  };

  const handleRetry = () => {
    setError(null);
    const v = playerRef.current;
    if (v) {
      v.load();
      v.play().catch(() => {});
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const v = playerRef.current;
      if (!v) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "KeyM") {
        toggleMute();
      } else if (e.code === "KeyF") {
        toggleFullscreen();
      } else if (e.code === "ArrowLeft") {
        const next = Math.max(0, v.currentTime - 5);
        v.currentTime = next;
        setCurrentTime(next);
      } else if (e.code === "ArrowRight") {
        const next = Math.min(v.duration || duration, v.currentTime + 5);
        v.currentTime = next;
        setCurrentTime(next);
      } else if (e.code === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration, isEnded, isPlaying, isMuted, volume]);

  if (!video) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl">
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-5xl bg-[#141213] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[92vh]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/70 hover:bg-black/90 text-white/70 hover:text-white transition-all border border-white/10"
        >
          <X size={18} />
        </button>

        {/* ── VIDEO PLAYER SIDE (Full Source Video + Unmuted Original Audio + Controls) ── */}
        <div className="relative md:w-3/5 bg-black flex flex-col items-center justify-center aspect-video md:aspect-auto select-none overflow-hidden group">
          {error ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-rose-400">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-colors"
              >
                Retry Playback
              </button>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={playerRef}
                src={video.videoUrl}
                playsInline
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleVideoEnded}
                onError={handleVideoError}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onClick={togglePlay}
                className="w-full h-full object-contain max-h-[60vh] md:max-h-[82vh] cursor-pointer"
              />

              {/* Center Replay Screen when video reaches 100% duration */}
              {isEnded && (
                <div
                  onClick={togglePlay}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 cursor-pointer z-20"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-110 transition-transform"
                    style={{ backgroundColor: universe.color }}
                  >
                    <RotateCcw size={24} />
                  </div>
                  <span className="text-xs font-mono font-bold tracking-wider uppercase text-white/90">
                    Replay Video
                  </span>
                </div>
              )}

              {/* Buffering Indicator */}
              {isBuffering && !isEnded && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* ── Granular Player Scrubbing & Controls Bar ── */}
          <div className="w-full bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pt-6 space-y-2.5 z-20">
            {/* Interactive Timeline Scrubber (00:00 -> 00:xx) */}
            <div
              onClick={handleSeek}
              className="relative w-full h-2 rounded-full bg-white/15 hover:h-2.5 transition-all cursor-pointer group/seek flex items-center"
              title="Click or drag to scrub"
            >
              <div
                className="h-full rounded-full transition-all relative"
                style={{
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                  backgroundColor: universe.color,
                  boxShadow: `0 0 10px ${universe.color}80`,
                }}
              >
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity"
                  style={{ border: `2px solid ${universe.color}` }}
                />
              </div>
            </div>

            {/* Bottom Row: Play/Pause, Volume, Time & Audio Track Pill */}
            <div className="flex items-center justify-between text-white text-xs font-mono">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-1 rounded-lg hover:bg-white/15 text-white transition-colors"
                  title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                >
                  {isEnded ? <RotateCcw size={16} /> : isPlaying ? <Pause size={16} /> : <Play size={16} fill="white" />}
                </button>

                {/* Volume Slider with Mute Toggle */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    onClick={toggleMute}
                    className="p-1 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors"
                    title={isMuted ? "Unmute (M)" : "Mute (M)"}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 accent-white rounded-lg cursor-pointer opacity-75 hover:opacity-100 transition-opacity"
                  />
                </div>

                {/* Exact Video Time / Duration Display */}
                <span className="text-[11px] font-mono text-white/70">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              </div>

              {/* Audio Source Status Tag & Fullscreen */}
              <div className="flex items-center gap-2">
                {hasAudio === false ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-white/10 text-white/50 border border-white/10">
                    Video Only (No Audio)
                  </span>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold flex items-center gap-1 border"
                    style={{
                      backgroundColor: `${universe.color}20`,
                      borderColor: `${universe.color}40`,
                      color: universe.color,
                    }}
                  >
                    <Volume2 size={10} /> Original Audio Track
                  </span>
                )}

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors ml-1"
                  title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── DETAILS & ACTIONS SIDE ── */}
        <div className="md:w-2/5 p-6 flex flex-col justify-between space-y-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{universe.emoji}</span>
                <span className="text-xs font-mono font-bold tracking-wider uppercase" style={{ color: universe.color }}>
                  {universe.title}
                </span>
              </div>
              <h2 className="font-heading font-black text-xl text-white leading-tight">
                {video.title}
              </h2>
              <p className="text-xs font-mono text-white/40 mt-1">
                Published by <span className="text-white/70">{video.creatorId}</span>
              </p>
            </div>

            <p className="text-xs text-white/60 leading-relaxed font-sans">
              {video.description || "Curated visual content from the Qoneqt Multiverse."}
            </p>

            {/* Video Duration & Quality Specs */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/8 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-white/60">
                <span>Total Duration:</span>
                <span className="text-white font-bold">{formatDuration(duration)}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Audio Stream:</span>
                <span className="text-white font-bold">{hasAudio === false ? "None (Silent Clip)" : "Original Audio Track"}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Source Engine:</span>
                <span style={{ color: universe.color }} className="font-bold">
                  {video.source === "qoneqt-ai" ? "Qoneqt AI Studio" : "Qoneqt Discovery"}
                </span>
              </div>
            </div>

            {/* Topics */}
            {video.topics && video.topics.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">Associated Topics</span>
                <div className="flex flex-wrap gap-1.5">
                  {video.topics.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono border"
                      style={{
                        borderColor: `${universe.color}35`,
                        color: universe.color,
                        backgroundColor: `${universe.color}10`,
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Engagement Stats */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-white/5 border border-white/8 text-center font-mono">
              <div>
                <span className="text-xs font-bold text-white block">{video.views}</span>
                <span className="text-[9px] text-white/40">Views</span>
              </div>
              <div>
                <span className="text-xs font-bold text-[#ff0055] block">{video.likes}</span>
                <span className="text-[9px] text-white/40">Likes</span>
              </div>
              <div>
                <span className="text-xs font-bold text-cyan-400 block">{video.comments}</span>
                <span className="text-[9px] text-white/40">Comments</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <button
              onClick={() => onRemix(video)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-black transition-all hover:brightness-110 shadow-lg"
              style={{
                backgroundColor: universe.color,
                boxShadow: `0 0 20px ${universe.color}40`,
              }}
            >
              <Sparkles size={14} /> Create Video with this Topic
            </button>

            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
              {copied ? "Link Copied to Clipboard" : "Share Portal Link"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════
   MAIN REUSABLE UNIVERSE PAGE COMPONENT
   ═══════════════════════════════════════════════════════ */
export const UniversePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const universe = useMemo(() => {
    return getUniverseConfig(id || "cyberverse");
  }, [id]);

  const [feed, setFeed] = useState<UniverseFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string>("All");
  const [activeFilterTab, setActiveFilterTab] = useState<"all" | "trending" | "latest" | "ai_picks" | "shorts" | "qoneqt">("all");
  const [selectedVideo, setSelectedVideo] = useState<UniverseVideoItem | null>(null);

  // Load Universe Feed
  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);

    const topicQuery = selectedTopic === "All" ? undefined : selectedTopic;
    fetchUniverseFeed(universe.id, topicQuery)
      .then((data) => {
        if (isSubscribed) setFeed(data);
      })
      .catch((err) => {
        console.error("Failed to load universe feed:", err);
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [universe.id, selectedTopic]);

  // Filter video list based on tab
  const displayVideos = useMemo(() => {
    if (!feed) return [];
    switch (activeFilterTab) {
      case "trending":
        return feed.trending;
      case "latest":
        return feed.latest;
      case "ai_picks":
        return feed.ai_picks;
      case "shorts":
        return feed.shorts;
      case "qoneqt":
        return feed.qoneqt_videos;
      default:
        // Combine trending + latest + qoneqt without duplicates
        const map = new Map<string, UniverseVideoItem>();
        feed.qoneqt_videos.forEach((v) => map.set(v.videoId, v));
        feed.trending.forEach((v) => map.set(v.videoId, v));
        feed.latest.forEach((v) => map.set(v.videoId, v));
        return Array.from(map.values());
    }
  }, [feed, activeFilterTab]);

  const handleCreateInUniverse = (topicText?: string) => {
    const prompt = topicText ? `Create a video about ${topicText}` : universe.heroPrompt;
    navigate(`/create?universe=${universe.id}&prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Universe Navigation Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/feed")}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono text-white/60 hover:text-white bg-white/5 border border-white/10 hover:border-white/20 transition-all"
            >
              <ArrowLeft size={14} /> Back to Multiverse
            </button>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-xs font-mono text-white/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: universe.color }} />
              {universe.explorers} Active Explorers
            </span>
          </div>

          {/* Universe Fast-Switcher */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {Object.values(UNIVERSE_CONFIGS).filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i).map((u) => {
              const isActive = u.id === universe.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    navigate(`/universe/${u.id}`);
                    setSelectedTopic("All");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono transition-all whitespace-nowrap border ${
                    isActive
                      ? "text-white font-bold"
                      : "text-white/40 border-white/8 hover:text-white hover:border-white/20"
                  }`}
                  style={isActive ? {
                    borderColor: `${u.color}50`,
                    background: `${u.color}15`,
                    boxShadow: `0 0 14px ${u.color}25`,
                  } : {}}
                >
                  <span>{u.emoji}</span>
                  <span className="hidden md:inline">{u.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Universe Hero Banner ── */}
        <div
          className="relative rounded-3xl overflow-hidden p-6 sm:p-10 border backdrop-blur-xl"
          style={{
            background: `linear-gradient(135deg, ${universe.bgColor}, ${universe.bgColor}ee 60%, ${universe.color}15 100%)`,
            borderColor: `${universe.color}35`,
            boxShadow: `0 0 50px ${universe.color}15`,
          }}
        >
          <UniverseParticles color={universe.color} />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
              <span className="text-xl">{universe.emoji}</span>
              <span className="font-bold tracking-widest uppercase" style={{ color: universe.color }}>
                {universe.subtitle}
              </span>
            </div>

            <h1
              className="font-heading text-4xl sm:text-6xl font-black text-white tracking-tight"
              style={{ textShadow: `0 0 35px ${universe.color}40` }}
            >
              {universe.title}
            </h1>

            <p className="text-sm sm:text-base text-white/70 leading-relaxed font-sans">
              {universe.description}
            </p>

            {/* Quick Action Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleCreateInUniverse()}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-black transition-all hover:brightness-110 shadow-lg"
                style={{
                  backgroundColor: universe.color,
                  boxShadow: `0 0 25px ${universe.color}50`,
                }}
              >
                <Plus size={16} /> Create Video for {universe.title}
              </button>
            </div>
          </div>
        </div>

        {/* ── Topic Chips Filter ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              <Filter size={12} /> Explore by Topic
            </span>
            <span className="text-[11px] font-mono text-white/40">
              Showing: <strong className="text-white">{selectedTopic}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {["All", ...universe.topics].map((topic) => {
              const isSelected = selectedTopic === topic;
              return (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap border ${
                    isSelected
                      ? "text-black font-bold shadow-md"
                      : "text-white/60 bg-white/5 border-white/10 hover:border-white/25 hover:text-white"
                  }`}
                  style={isSelected ? {
                    backgroundColor: universe.color,
                    borderColor: universe.color,
                    boxShadow: `0 0 15px ${universe.color}40`,
                  } : {}}
                >
                  {topic === "All" ? "✨ All Topics" : `#${topic}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── EMPTY STATE BANNER (When no Qoneqt AI videos exist yet) ── */}
        {feed && !feed.has_qoneqt_videos && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 sm:p-6 rounded-3xl bg-white/[0.03] border border-dashed border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${universe.color}20`, color: universe.color }}
              >
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm sm:text-base text-white">
                  No Qoneqt AI videos yet.
                </h3>
                <p className="text-xs text-white/50">
                  Be the pioneer creator to publish the first AI-directed video in {universe.title}!
                </p>
              </div>
            </div>

            <button
              onClick={() => handleCreateInUniverse()}
              className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black transition-all hover:brightness-110 shadow-md"
              style={{
                backgroundColor: universe.color,
                boxShadow: `0 0 15px ${universe.color}40`,
              }}
            >
              <Plus size={14} /> + Create Video
            </button>
          </motion.div>
        )}

        {/* ── Section Filter Tabs (All, Trending, Latest, AI Picks, Shorts, Qoneqt AI) ── */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-[#141213] rounded-2xl border border-white/10 flex-wrap">
            {[
              { id: "all", label: "All Content", icon: <Globe size={13} /> },
              { id: "trending", label: "Trending", icon: <Flame size={13} /> },
              { id: "latest", label: "Latest", icon: <Clock size={13} /> },
              { id: "ai_picks", label: "AI Picks", icon: <Award size={13} /> },
              { id: "shorts", label: "Shorts (9:16)", icon: <Smartphone size={13} /> },
              { id: "qoneqt", label: "Qoneqt AI Studio", icon: <Sparkles size={13} /> },
            ].map((tab) => {
              const isActive = activeFilterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilterTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-white text-black shadow-lg"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs font-mono text-white/40">
            {displayVideos.length} Portals Available
          </div>
        </div>

        {/* ── VIDEO FEED GRID ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : displayVideos.length === 0 ? (
          <div className="text-center py-16 space-y-4 rounded-3xl bg-white/[0.02] border border-white/8">
            <Compass size={36} className="mx-auto text-white/30" />
            <h3 className="font-heading text-lg font-bold text-white">No videos found for this topic</h3>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              Try selecting another topic chip or generate the first video using Qoneqt Cinematic Director.
            </p>
            <button
              onClick={() => setSelectedTopic("All")}
              className="px-4 py-2 rounded-xl text-xs font-mono text-white bg-white/10 hover:bg-white/20 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {displayVideos.map((video) => (
              <VideoCard
                key={video.videoId}
                video={video}
                accentColor={universe.color}
                onSelect={(v) => setSelectedVideo(v)}
              />
            ))}
          </div>
        )}

      </div>

      {/* ── Interactive Video Viewer Modal ── */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoModal
            video={selectedVideo}
            universe={universe}
            onClose={() => setSelectedVideo(null)}
            onRemix={(v) => {
              setSelectedVideo(null);
              handleCreateInUniverse(v.title);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
