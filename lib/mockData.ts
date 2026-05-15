import type { Exercise } from "./types";

export const MOCK_EXERCISES: Exercise[] = [
  {
    id: "bench-press",
    name: "卧推",
    targetSets: 5,
    defaultWeight: 60,
    defaultReps: 8,
    icon: "💪",
  },
  {
    id: "pull-up",
    name: "引体向上",
    targetSets: 5,
    defaultWeight: 0,
    defaultReps: 8,
    icon: "🏋️",
  },
  {
    id: "squat",
    name: "深蹲",
    targetSets: 5,
    defaultWeight: 80,
    defaultReps: 8,
    icon: "🦵",
  },
  {
    id: "deadlift",
    name: "硬拉",
    targetSets: 5,
    defaultWeight: 100,
    defaultReps: 6,
    icon: "🔗",
  },
];

export const REST_DURATION_SECONDS = 90;
