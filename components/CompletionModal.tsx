"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Check } from "lucide-react";
import type { SetRecord } from "@/lib/types";

interface CompletionModalProps {
  exerciseName: string;
  sets: SetRecord[];
  onDone: () => void;
}

export default function CompletionModal({
  exerciseName,
  sets,
  onDone,
}: CompletionModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 260 }}
          className="w-full max-w-sm rounded-3xl border border-amber-500/30 bg-surface p-8 text-center"
        >
          {/* Trophy icon with glow */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 ring-2 ring-amber-500/30">
            <Trophy size={40} className="text-amber-500" />
          </div>

          <h2 className="mb-2 text-2xl font-extrabold">训练完成</h2>
          <p className="mb-6 text-muted">{exerciseName} · 完成全部 {sets.length} 组</p>

          {/* Summary */}
          <div className="mb-8 space-y-2 rounded-2xl bg-surface-elevated p-4">
            {sets.map((s) => (
              <div
                key={s.setNumber}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted">
                  第 {s.setNumber} 组
                  {s.isWarmup && (
                    <span className="ml-1 text-orange-400">热身</span>
                  )}
                </span>
                <span className="font-bold tabular-nums">
                  {s.weight}kg × {s.reps}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-500 font-semibold">总训练量</span>
                <span className="font-extrabold tabular-nums">
                  {sets.reduce((sum, s) => sum + s.weight * s.reps, 0)} kg
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onDone}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 text-lg font-extrabold text-black shadow-lg shadow-amber-500/25 active:scale-[0.97] transition-transform"
          >
            <Check size={22} />
            完成
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
