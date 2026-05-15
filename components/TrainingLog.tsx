"use client";

import { motion } from "framer-motion";
import { ClipboardList, Dumbbell } from "lucide-react";
import { useStore } from "@/lib/store";

export default function TrainingLog() {
  const { state } = useStore();
  const { todayLogs, activeExercise } = state;

  // Group logs by exercise (using activeExercise name for sets during session)
  const allLogs = todayLogs;

  if (allLogs.length === 0 && !activeExercise) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-5 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated">
          <ClipboardList size={28} className="text-muted" />
        </div>
        <h3 className="mb-1 text-lg font-bold">暂无训练记录</h3>
        <p className="text-sm text-muted">开始训练后，完成的每组都会出现在这里</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-5 pt-4 pb-8">
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-amber-500/60">
          今日记录
        </h2>
        <p className="mt-1 text-2xl font-extrabold">
          {allLogs.length} 组已完成
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-auto">
        {/* Active exercise sets */}
        {activeExercise && activeExercise.completedSets.length > 0 && (
          <div className="rounded-2xl border border-amber-500/20 bg-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell size={16} className="text-amber-500" />
              <span className="font-bold text-amber-500">
                {activeExercise.exerciseName}
              </span>
              <span className="text-xs text-muted">进行中</span>
            </div>
            {activeExercise.completedSets.map((s, i) => (
              <motion.div
                key={s.timestamp}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-500">
                    {s.setNumber}
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {s.weight}kg × {s.reps}
                  </span>
                  {s.isWarmup && (
                    <span className="rounded-full border border-orange-500/30 bg-orange-500/5 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
                      热身
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted">
                  {new Date(s.timestamp).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </motion.div>
            ))}
          </div>
        )}

        {/* No logs but active exercise with no sets */}
        {activeExercise &&
          activeExercise.completedSets.length === 0 &&
          allLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Dumbbell size={24} className="text-muted mb-3" />
              <p className="text-sm text-muted">完成第一组后开始记录</p>
            </div>
          )}
      </div>
    </div>
  );
}
