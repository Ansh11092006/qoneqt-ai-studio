import React, { useEffect, useState } from "react";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import { fetchTrending, TrendingChip } from "@/api/client";

interface TrendingCardProps {
  onSelectPrompt: (prompt: string) => void;
}

export const TrendingCard: React.FC<TrendingCardProps> = ({ onSelectPrompt }) => {
  const [chips, setChips] = useState<TrendingChip[]>([]);

  useEffect(() => {
    fetchTrending().then(setChips);
  }, []);

  return (
    <div className="flex flex-col h-full justify-between space-y-3">
      <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-[175px] pr-1">
        {chips.map((chip) => (
          <button
            key={chip.id}
            onClick={() => onSelectPrompt(chip.label)}
            className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--accent)] text-left transition-all text-xs text-white/80 hover:text-white"
          >
            <span className="truncate max-w-[190px]">{chip.label}</span>
            <ArrowUpRight
              size={12}
              className="text-white/40 group-hover:text-[var(--accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0"
            />
          </button>
        ))}
      </div>
      <p className="text-[11px] font-mono text-white/40 border-t border-white/10 pt-2 flex items-center justify-between">
        <span>Click any topic to autofill</span>
        <span className="text-[var(--accent)]">● Real-time</span>
      </p>
    </div>
  );
};
