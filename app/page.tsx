"use client";

import { motion } from "framer-motion";
import { Zap, ClipboardList } from "lucide-react";
import { useStore } from "@/lib/store";
import TrainingFocus from "@/components/TrainingFocus";
import TrainingLog from "@/components/TrainingLog";
import type { Tab } from "@/lib/types";

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "training", label: "训练", icon: <Zap size={20} /> },
  { key: "log", label: "记录", icon: <ClipboardList size={20} /> },
];

export default function Home() {
  const { state, switchTab } = useStore();

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {state.currentTab === "training" ? (
          <TrainingFocus />
        ) : (
          <TrainingLog />
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div className="flex shrink-0 border-t border-border bg-surface/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)]">
        {tabs.map((tab) => {
          const isActive = state.currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 transition-colors ${
                isActive ? "text-amber-500" : "text-muted"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -top-px h-0.5 w-10 rounded-full bg-amber-500"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              {tab.icon}
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
