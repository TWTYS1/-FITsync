"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Flame } from "lucide-react";
import type { PendingSet } from "@/lib/types";

interface ExerciseSheetProps {
  open: boolean;
  pendingSet: PendingSet;
  targetSet: number;
  totalSets: number;
  onConfirm: () => void;
  onWeightChange: (delta: number) => void;
  onRepsChange: (delta: number) => void;
  onToggleWarmup: () => void;
  onCancel: () => void;
}

export default function ExerciseSheet({
  open,
  pendingSet,
  targetSet,
  totalSets,
  onConfirm,
  onWeightChange,
  onRepsChange,
  onToggleWarmup,
  onCancel,
}: ExerciseSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg rounded-t-3xl border border-b-0 border-amber-500/20 bg-surface p-6 pb-10"
          >
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />

            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-extrabold text-amber-500">
                  第 {targetSet} / {totalSets} 组
                </p>
                <p className="text-sm text-muted">确认本组数据</p>
              </div>
              <button
                onClick={onCancel}
                className="rounded-full p-2 text-muted hover:bg-surface-elevated hover:text-fg transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Main data display */}
            <div className="mb-6 flex items-center justify-center gap-8 py-6">
              {/* Weight */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onWeightChange(-2.5)}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-elevated text-amber-500 active:scale-90 transition-transform"
                    aria-label="Decrease weight by 2.5kg"
                  >
                    <Minus size={20} />
                  </button>
                  <div className="flex flex-col items-center min-w-[80px]">
                    <span className="text-4xl font-extrabold tabular-nums">
                      {pendingSet.weight}
                    </span>
                    <span className="text-sm text-muted">kg</span>
                  </div>
                  <button
                    onClick={() => onWeightChange(2.5)}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-elevated text-amber-500 active:scale-90 transition-transform"
                    aria-label="Increase weight by 2.5kg"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onWeightChange(-2.5)}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-muted hover:border-amber-500/40 hover:text-amber-500 transition-colors"
                  >
                    -2.5kg
                  </button>
                  <button
                    onClick={() => onWeightChange(2.5)}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-muted hover:border-amber-500/40 hover:text-amber-500 transition-colors"
                  >
                    +2.5kg
                  </button>
                  <button
                    onClick={() => onWeightChange(5)}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-muted hover:border-amber-500/40 hover:text-amber-500 transition-colors"
                  >
                    +5kg
                  </button>
                </div>
              </div>

              {/* Separator */}
              <div className="h-20 w-px bg-border" />

              {/* Reps */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRepsChange(-1)}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-elevated text-amber-500 active:scale-90 transition-transform"
                    aria-label="Decrease reps by 1"
                  >
                    <Minus size={20} />
                  </button>
                  <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-4xl font-extrabold tabular-nums">
                      {pendingSet.reps}
                    </span>
                    <span className="text-sm text-muted">次</span>
                  </div>
                  <button
                    onClick={() => onRepsChange(1)}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-elevated text-amber-500 active:scale-90 transition-transform"
                    aria-label="Increase reps by 1"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onRepsChange(-1)}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-muted hover:border-amber-500/40 hover:text-amber-500 transition-colors"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => onRepsChange(1)}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-muted hover:border-amber-500/40 hover:text-amber-500 transition-colors"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>

            {/* Warmup toggle */}
            <div className="mb-4 flex justify-center">
              <button
                onClick={onToggleWarmup}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  pendingSet.isWarmup
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-400"
                    : "border-border text-muted hover:border-zinc-600"
                }`}
              >
                <Flame size={16} />
                热身组
              </button>
            </div>

            {/* Confirm button */}
            <button
              onClick={onConfirm}
              className="flex h-16 w-full items-center justify-center rounded-2xl bg-amber-500 text-lg font-extrabold text-black shadow-lg shadow-amber-500/25 active:scale-[0.97] transition-transform"
            >
              确认第 {targetSet} 组
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
