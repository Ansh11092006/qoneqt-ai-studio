import React from "react";
import { Monitor, Smartphone, Tv, Film, Globe, Share2, Video, Sparkles } from "lucide-react";

export interface FormatOption {
  id: string;
  name: string;
  ratio: string;
  w: number;
  h: number;
  platform: string;
  icon: React.ReactNode;
}

export const FORMAT_PRESETS: FormatOption[] = [
  { id: "9:16", name: "Shorts / Reels", ratio: "9:16", w: 1080, h: 1920, platform: "TikTok, IG Shorts, YouTube Shorts", icon: <Smartphone size={16} /> },
  { id: "1:1", name: "Square Feed", ratio: "1:1", w: 1080, h: 1080, platform: "Instagram Feed, Facebook", icon: <Tv size={16} /> },
  { id: "4:5", name: "Portrait Feed", ratio: "4:5", w: 1080, h: 1350, platform: "Instagram & Facebook Portrait", icon: <Tv size={16} /> },
  { id: "16:9", name: "Widescreen HD", ratio: "16:9", w: 1920, h: 1080, platform: "YouTube, TV & Web", icon: <Video size={16} /> },
  { id: "21:9", name: "Cinematic Scope", ratio: "21:9", w: 2560, h: 1080, platform: "Cinema & UltraWide Monitors", icon: <Film size={16} /> },
  { id: "16:10", name: "Presentation", ratio: "16:10", w: 1920, h: 1200, platform: "Keynote & Mac Display", icon: <Monitor size={16} /> },
  { id: "2:3", name: "Pinterest Pin", ratio: "2:3", w: 1000, h: 1500, platform: "Pinterest & Blogs", icon: <Share2 size={16} /> },
  { id: "1.91:1", name: "LinkedIn Post", ratio: "1.91:1", w: 1200, h: 627, platform: "LinkedIn & Twitter/X", icon: <Globe size={16} /> },
  { id: "custom", name: "Custom Studio", ratio: "Custom", w: 1080, h: 1920, platform: "User Defined Dimensions", icon: <Sparkles size={16} /> },
];

interface FormatStudioProps {
  selectedFormat: string;
  onSelectFormat: (id: string) => void;
  resolution: string;
  onSelectResolution: (res: string) => void;
  generateAllFormats: boolean;
  onToggleGenerateAll: (val: boolean) => void;
  customWidth: number;
  onWidthChange: (w: number) => void;
  customHeight: number;
  onHeightChange: (h: number) => void;
}

export const FormatStudio: React.FC<FormatStudioProps> = ({
  selectedFormat,
  onSelectFormat,
  resolution,
  onSelectResolution,
  generateAllFormats,
  onToggleGenerateAll,
  customWidth,
  onWidthChange,
  customHeight,
  onHeightChange,
}) => {
  const activePreset = FORMAT_PRESETS.find((f) => f.id === selectedFormat) || FORMAT_PRESETS[0];

  return (
    <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-heading font-bold text-sm flex items-center gap-2">
            <Sparkles className="text-[#ff0055]" size={16} /> Video Format Studio
          </h4>
          <p className="text-[11px] text-white/50">Choose target aspect ratio, resolution & platform layout</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#ff0055]/50 transition-all">
          <input
            type="checkbox"
            checked={generateAllFormats}
            onChange={(e) => onToggleGenerateAll(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#ff0055]"
          />
          <span className="text-xs font-mono font-semibold text-[#ff0055]">Auto Generate All Formats</span>
        </label>
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
        {FORMAT_PRESETS.map((fmt) => (
          <button
            key={fmt.id}
            onClick={() => onSelectFormat(fmt.id)}
            className={`p-2 rounded-xl flex flex-col items-center justify-center text-center border transition-all ${
              selectedFormat === fmt.id
                ? "bg-[#ff0055]/15 border-[#ff0055] text-white shadow-[0_0_15px_rgba(255,0,85,0.3)]"
                : "bg-white/5 border-white/8 text-white/50 hover:text-white hover:border-white/20"
            }`}
          >
            <span className={selectedFormat === fmt.id ? "text-[#ff0055]" : "text-white/40"}>{fmt.icon}</span>
            <span className="text-[11px] font-mono font-bold mt-1">{fmt.ratio}</span>
            <span className="text-[8px] text-white/30 truncate max-w-full">{fmt.name.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {/* Selected Format Spec & Resolution selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10 items-center">
        {/* Format Live Info */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-16 rounded-lg border-2 border-[#ff0055] bg-black/80 flex items-center justify-center text-[10px] font-mono text-[#ff0055] font-bold shadow-md shrink-0"
            style={{
              aspectRatio: selectedFormat === "custom" ? `${customWidth}/${customHeight}` : activePreset.ratio.replace(":", "/"),
              height: "56px",
              width: "auto",
            }}
          >
            {activePreset.ratio}
          </div>
          <div>
            <p className="text-xs font-bold text-white">{activePreset.name}</p>
            <p className="text-[10px] font-mono text-[#ff0055]">{activePreset.platform}</p>
            <p className="text-[10px] font-mono text-white/40">
              {selectedFormat === "custom" ? `${customWidth} × ${customHeight}px` : `${activePreset.w} × ${activePreset.h}px`}
            </p>
          </div>
        </div>

        {/* Custom Input or Resolution Pills */}
        {selectedFormat === "custom" ? (
          <div className="flex items-center gap-2">
            <div>
              <label className="text-[9px] font-mono text-white/40 block">Width (px)</label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => onWidthChange(Number(e.target.value))}
                className="w-20 p-1.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white font-mono"
              />
            </div>
            <span className="text-white/40 text-xs mt-3">×</span>
            <div>
              <label className="text-[9px] font-mono text-white/40 block">Height (px)</label>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => onHeightChange(Number(e.target.value))}
                className="w-20 p-1.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white font-mono"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-[10px] font-mono text-white/40 mr-1">Quality:</span>
            {(["720p", "1080p", "1440p", "4K", "8K"] as const).map((r) => (
              <button
                key={r}
                onClick={() => onSelectResolution(r)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border ${
                  resolution === r
                    ? "bg-[#ff0055] text-white border-[#ff0055] shadow-md"
                    : "bg-white/5 text-white/50 border-white/10 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
