import React, { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface BentoCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  className?: string;
  children: ReactNode;
}

// Static lookup maps to prevent Tailwind v4 purging dynamic classes
const colSpanClasses: Record<number, string> = {
  1: "col-span-1 md:col-span-1 lg:col-span-1",
  2: "col-span-1 md:col-span-2 lg:col-span-2",
  3: "col-span-1 md:col-span-2 lg:col-span-3",
  4: "col-span-1 md:col-span-2 lg:col-span-4",
};

const rowSpanClasses: Record<number, string> = {
  1: "row-span-1",
  2: "row-span-1 lg:row-span-2",
};

export const BentoCard: React.FC<BentoCardProps> = ({
  title,
  description,
  icon,
  colSpan = 1,
  rowSpan = 1,
  className,
  children,
}) => {
  const colClass = colSpanClasses[colSpan] || colSpanClasses[1];
  const rowClass = rowSpanClasses[rowSpan] || rowSpanClasses[1];

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 25 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={cn(
        colClass,
        rowClass,
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl",
        "bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl",
        "transition-all duration-300 hover:border-white/20 hover:shadow-2xl",
        "hover:shadow-[0_0_30px_-5px_var(--accent)]",
        className
      )}
    >
      {/* Card Header */}
      <div className="p-5 sm:p-6 pb-2 flex items-start justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[var(--accent)] shadow-inner transition-transform group-hover:scale-105">
                {icon}
              </div>
            )}
            <h3 className="font-heading text-base sm:text-lg font-bold text-white tracking-tight">
              {title}
            </h3>
          </div>
          {description && (
            <p className="text-xs text-white/50 leading-relaxed pl-0.5">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 sm:p-6 pt-2 flex-1 flex flex-col relative z-10">
        {children}
      </div>

      {/* Subtle bottom-right gradient glow */}
      <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-[var(--accent)] opacity-5 blur-3xl pointer-events-none group-hover:opacity-15 transition-opacity" />
    </motion.div>
  );
};
