"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Timer, SkipForward } from "lucide-react";
import { REST_DURATION_SECONDS } from "@/lib/mockData";

interface RestTimerProps {
  restEndTime: number;
  onSkip: () => void;
}

export default function RestTimer({ restEndTime, onSkip }: RestTimerProps) {
  const now = Date.now();
  const remaining = Math.max(0, Math.ceil((restEndTime - now) / 1000));
  const total = REST_DURATION_SECONDS;
  const progress = remaining / total;
  // SVG circle: circumference = 2 * PI * r = 2 * PI * 52 ≈ 326.73
  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - progress);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex flex-col items-center gap-6"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-amber-500/60">
          组间休息
        </p>

        {/* Circular progress */}
        <div className="relative flex items-center justify-center">
          <svg
            width="140"
            height="140"
            viewBox="0 0 120 120"
            className="-rotate-90"
          >
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-surface-elevated"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: "linear" }}
              style={{
                filter: "drop-shadow(0 0 6px rgba(245, 158, 11, 0.5))",
              }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-extrabold tabular-nums">
              {remaining}
            </span>
            <span className="text-xs text-muted">秒</span>
          </div>
        </div>

        <button
          onClick={onSkip}
          className="flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-muted hover:border-amber-500/40 hover:text-amber-500 active:scale-95 transition-all"
        >
          <SkipForward size={16} />
          跳过休息
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
