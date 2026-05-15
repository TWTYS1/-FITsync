"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Dumbbell, Undo2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { MOCK_EXERCISES } from "@/lib/mockData";
import ExerciseSheet from "./ExerciseSheet";
import RestTimer from "./RestTimer";
import CompletionModal from "./CompletionModal";
import type { Exercise } from "@/lib/types";

export default function TrainingFocus() {
  const { state, startExercise, confirmSet, undoSet, skipRest, completeExercise } = useStore();
  const [showSheet, setShowSheet] = useState(false);
  const [pendingWeight, setPendingWeight] = useState(0);
  const [pendingReps, setPendingReps] = useState(0);
  const [pendingWarmup, setPendingWarmup] = useState(false);

  const { activeExercise, undoSet: undo } = state;

  // Open sheet when + is pressed - init pending values from last set
  const handlePlusPress = useCallback(() => {
    if (activeExercise) {
      setPendingWeight(activeExercise.lastWeight);
      setPendingReps(activeExercise.lastReps);
      setPendingWarmup(false);
      setShowSheet(true);
    }
  }, [activeExercise]);

  // Handle confirm - pass all data to store
  const handleConfirm = useCallback(() => {
    confirmSet({ weight: pendingWeight, reps: pendingReps, isWarmup: pendingWarmup });
    setShowSheet(false);
  }, [confirmSet, pendingWeight, pendingReps, pendingWarmup]);

  // Handle cancel sheet
  const handleCancelSheet = useCallback(() => {
    setShowSheet(false);
  }, []);

  // Rest timer polling
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!activeExercise?.isResting) return;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [activeExercise?.isResting]);

  // Check if rest is over
  useEffect(() => {
    if (
      activeExercise?.isResting &&
      activeExercise.restEndTime &&
      now >= activeExercise.restEndTime
    ) {
      skipRest();
    }
  }, [now, activeExercise?.isResting, activeExercise?.restEndTime, skipRest]);

  // --- Exercise Selection Screen ---
  if (!activeExercise) {
    return (
      <div className="flex flex-col h-full px-5 pt-4 pb-8">
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-amber-500/60">
            选择动作
          </h2>
          <p className="mt-1 text-2xl font-extrabold">开始训练</p>
        </div>

        <div className="grid grid-cols-2 gap-3 flex-1 content-start">
          {MOCK_EXERCISES.map((ex: Exercise, i: number) => (
            <motion.button
              key={ex.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => startExercise(ex.id)}
              className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-left active:scale-[0.97] transition-transform hover:border-amber-500/30"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-2xl">
                {ex.icon}
              </div>
              <div className="text-center">
                <p className="font-bold">{ex.name}</p>
                <p className="text-xs text-muted">
                  {ex.targetSets} 组 · {ex.defaultWeight > 0 ? `${ex.defaultWeight}kg` : `自重`}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4">
          <div className="flex items-center gap-3">
            <Dumbbell size={18} className="text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-500">FitSync</p>
              <p className="text-xs text-muted">点击 + 记录每组，自动计时休息</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Active Training Screen ---
  const isResting = activeExercise.isResting && activeExercise.restEndTime && now < activeExercise.restEndTime;

  return (
    <div className="flex flex-col h-full px-5 pt-4 pb-8 relative">
      {/* Undo toast */}
      <AnimatePresence>
        {undo && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="absolute top-4 inset-x-5 z-30"
          >
            <button
              onClick={undoSet}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-surface-elevated px-4 py-3 text-sm font-semibold text-amber-500 shadow-lg active:scale-[0.98] transition-transform"
            >
              <Undo2 size={16} />
              撤销第 {undo.setNumber} 组 (3秒内)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top: Exercise name + progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-amber-500/60">
            {activeExercise.exerciseName}
          </h2>
          <span className="text-sm font-bold text-muted">
            {activeExercise.currentSet > activeExercise.targetSets
              ? activeExercise.targetSets
              : activeExercise.currentSet}{" "}
            / {activeExercise.targetSets} 组
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
          <motion.div
            className="h-full rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min(
                ((activeExercise.currentSet - 1) / activeExercise.targetSets) * 100,
                100
              )}%`,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Middle: Rest Timer or Set Info */}
      <div className="flex-1 flex items-center justify-center">
        {isResting ? (
          <RestTimer restEndTime={activeExercise.restEndTime!} onSkip={skipRest} />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted">
              {activeExercise.completedSets.length === 0 ? "准备开始" : "上一组"}
            </p>
            <div className="text-center">
              <span className="text-7xl font-extrabold tabular-nums">
                {activeExercise.lastWeight}
              </span>
              <span className="text-2xl font-bold text-muted"> kg</span>
            </div>
            <div className="flex items-center gap-1 text-3xl font-bold text-muted">
              <span className="text-5xl font-extrabold tabular-nums text-fg">
                {activeExercise.lastReps}
              </span>
              <span className="self-end text-lg">次</span>
            </div>
            {activeExercise.completedSets.length > 0 && (
              <p className="text-xs text-muted">
                已完成 {activeExercise.completedSets.length} 组 · 还有{" "}
                {activeExercise.targetSets - activeExercise.currentSet + 1} 组
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom: + Button */}
      {!isResting && (
        <div className="flex justify-center mt-4">
          <motion.button
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.04 }}
            onClick={handlePlusPress}
            className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.4),0_0_80px_rgba(245,158,11,0.2)] active:shadow-[0_0_24px_rgba(245,158,11,0.5)] transition-shadow"
            aria-label="Record a set"
          >
            <Plus size={44} strokeWidth={3} className="text-black" />
          </motion.button>
        </div>
      )}

      {/* Set counter dots */}
      <div className="flex justify-center gap-2 mt-6">
        {Array.from({ length: activeExercise.targetSets }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i < activeExercise.completedSets.length
                ? "bg-amber-500"
                : "bg-surface-elevated"
            }`}
          />
        ))}
      </div>

      {/* ExerciseSheet */}
      <ExerciseSheet
        open={showSheet}
        pendingSet={{ weight: pendingWeight, reps: pendingReps, isWarmup: pendingWarmup }}
        targetSet={activeExercise.currentSet}
        totalSets={activeExercise.targetSets}
        onConfirm={handleConfirm}
        onCancel={handleCancelSheet}
        onWeightChange={(d) => setPendingWeight((w) => Math.max(0, w + d))}
        onRepsChange={(d) => setPendingReps((r) => Math.max(1, r + d))}
        onToggleWarmup={() => setPendingWarmup((w) => !w)}
      />

      {/* CompletionModal */}
      {activeExercise.isCompleted && (
        <CompletionModal
          exerciseName={activeExercise.exerciseName}
          sets={activeExercise.completedSets}
          onDone={completeExercise}
        />
      )}
    </div>
  );
}
