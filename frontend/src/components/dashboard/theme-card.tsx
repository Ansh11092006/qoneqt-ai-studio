import React from "react";
import { Palette, Sparkles } from "lucide-react";
import { useJob } from "@/store/job-context";

export const ThemeCard: React.FC = () => {
  const { currentTheme } = useJob();
  const { mood, palette, background_type, loading_style } = currentTheme;

  return (
    <div className="flex flex-col h-full justify-between space-y-3">
      {/* Mood Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/50 font-mono uppercase text-[10px]">Active Mood</span>
          <span className="flex items-center gap-1 text-[var(--accent)] font-mono text-[10px]">
            <Sparkles size={10} /> Live Synced
          </span>
        </div>
        <p className="font-heading font-bold text-white text-base truncate">{mood}</p>
      </div>

      {/* Palette Swatches */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-white/40 uppercase block">Palette Swatches</span>
        <div className="grid grid-cols-4 gap-1.5">
          <div className="flex flex-col items-center">
            <div
              className="w-full h-7 rounded-md border border-white/20 shadow-inner"
              style={{ backgroundColor: palette.bg1 }}
            />
            <span className="text-[9px] font-mono text-white/50 mt-1">bg1</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className="w-full h-7 rounded-md border border-white/20 shadow-inner"
              style={{ backgroundColor: palette.bg2 }}
            />
            <span className="text-[9px] font-mono text-white/50 mt-1">bg2</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className="w-full h-7 rounded-md border border-white/20 shadow-md ring-1 ring-white/30"
              style={{ backgroundColor: palette.accent }}
            />
            <span className="text-[9px] font-mono text-[var(--accent)] mt-1 font-bold">accent</span>
          </div>
          <div className="flex flex-col items-center">
            <div
              className="w-full h-7 rounded-md border border-white/20 shadow-inner"
              style={{ backgroundColor: palette.text }}
            />
            <span className="text-[9px] font-mono text-white/50 mt-1">text</span>
          </div>
        </div>
      </div>

      {/* Specs Footer */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/60">
        <div>
          <span className="text-white/40 block text-[9px] uppercase">Background</span>
          <span className="text-white capitalize">{background_type.replace("_", " ")}</span>
        </div>
        <div className="text-right">
          <span className="text-white/40 block text-[9px] uppercase">Loading Style</span>
          <span className="text-[var(--accent)] capitalize">{loading_style.replace("_", " ")}</span>
        </div>
      </div>
    </div>
  );
};
