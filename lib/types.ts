export interface Exercise {
  id: string;
  name: string;
  targetSets: number;
  defaultWeight: number;
  defaultReps: number;
  icon: string;
}

export interface SetRecord {
  setNumber: number;
  weight: number;
  reps: number;
  isWarmup: boolean;
  timestamp: number;
}

export interface ActiveExercise {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  completedSets: SetRecord[];
  currentSet: number;
  lastWeight: number;
  lastReps: number;
  isResting: boolean;
  restEndTime: number | null;
  isCompleted: boolean;
}

export interface PendingSet {
  weight: number;
  reps: number;
  isWarmup: boolean;
}

export type Tab = "training" | "log";
