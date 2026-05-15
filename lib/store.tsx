"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { ActiveExercise, SetRecord, PendingSet, Tab } from "./types";
import { MOCK_EXERCISES, REST_DURATION_SECONDS } from "./mockData";

interface AppState {
  activeExercise: ActiveExercise | null;
  todayLogs: SetRecord[];
  currentTab: Tab;
  pendingSet: PendingSet | null;
  undoSet: SetRecord | null;
}

type Action =
  | { type: "START_EXERCISE"; exerciseId: string }
  | { type: "CONFIRM_SET"; payload: PendingSet }
  | { type: "UNDO_SET" }
  | { type: "DISMISS_UNDO" }
  | { type: "SKIP_REST" }
  | { type: "UPDATE_PENDING_WEIGHT"; delta: number }
  | { type: "UPDATE_PENDING_REPS"; delta: number }
  | { type: "TOGGLE_PENDING_WARMUP" }
  | { type: "CANCEL_PENDING" }
  | { type: "REST_TICK" }
  | { type: "COMPLETE_EXERCISE" }
  | { type: "DISMISS_COMPLETION" }
  | { type: "SWITCH_TAB"; tab: Tab }
  | { type: "RESTORE_STATE"; state: Partial<AppState> };

const STORAGE_KEY = "fitsync_state";

function buildInitialState(): AppState {
  return {
    activeExercise: null,
    todayLogs: [],
    currentTab: "training",
    pendingSet: null,
    undoSet: null,
  };
}

function saveState(state: AppState) {
  try {
    const toSave = {
      activeExercise: state.activeExercise,
      todayLogs: state.todayLogs,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage not available
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "START_EXERCISE": {
      const ex = MOCK_EXERCISES.find((e) => e.id === action.exerciseId);
      if (!ex) return state;
      const now = Date.now();
      const active: ActiveExercise = {
        exerciseId: ex.id,
        exerciseName: ex.name,
        targetSets: ex.targetSets,
        completedSets: [],
        currentSet: 1,
        lastWeight: ex.defaultWeight,
        lastReps: ex.defaultReps,
        isResting: false,
        restEndTime: null,
        isCompleted: false,
      };
      return { ...state, activeExercise: active };
    }

    case "CONFIRM_SET": {
      if (!state.activeExercise) return state;
      const set: SetRecord = {
        setNumber: state.activeExercise.currentSet,
        weight: action.payload.weight,
        reps: action.payload.reps,
        isWarmup: action.payload.isWarmup,
        timestamp: Date.now(),
      };
      const completedSets = [...state.activeExercise.completedSets, set];
      const newCurrentSet = state.activeExercise.currentSet + 1;
      const isCompleted = newCurrentSet > state.activeExercise.targetSets;

      const updated: AppState = {
        ...state,
        activeExercise: {
          ...state.activeExercise,
          completedSets,
          currentSet: newCurrentSet,
          lastWeight: set.weight,
          lastReps: set.reps,
          isResting: !isCompleted,
          restEndTime: isCompleted
            ? null
            : Date.now() + REST_DURATION_SECONDS * 1000,
          isCompleted,
        },
        todayLogs: [...state.todayLogs, set],
        pendingSet: null,
        undoSet: set,
      };
      saveState(updated);
      return updated;
    }

    case "UNDO_SET": {
      if (!state.activeExercise || !state.undoSet) return state;
      const completedSets = state.activeExercise.completedSets.filter(
        (s) => s.timestamp !== state.undoSet!.timestamp
      );
      const updated: AppState = {
        ...state,
        activeExercise: {
          ...state.activeExercise,
          completedSets,
          currentSet: Math.max(1, state.activeExercise.currentSet - 1),
          lastWeight:
            completedSets.length > 0
              ? completedSets[completedSets.length - 1].weight
              : MOCK_EXERCISES.find(
                  (e) => e.id === state.activeExercise!.exerciseId
                )!.defaultWeight,
          lastReps:
            completedSets.length > 0
              ? completedSets[completedSets.length - 1].reps
              : MOCK_EXERCISES.find(
                  (e) => e.id === state.activeExercise!.exerciseId
                )!.defaultReps,
          isResting: false,
          restEndTime: null,
        },
        todayLogs: state.todayLogs.filter(
          (s) => s.timestamp !== state.undoSet!.timestamp
        ),
        undoSet: null,
      };
      saveState(updated);
      return updated;
    }

    case "DISMISS_UNDO": {
      return { ...state, undoSet: null };
    }

    case "SKIP_REST": {
      if (!state.activeExercise) return state;
      return {
        ...state,
        activeExercise: { ...state.activeExercise, isResting: false, restEndTime: null },
      };
    }

    case "UPDATE_PENDING_WEIGHT": {
      if (!state.pendingSet) return state;
      return {
        ...state,
        pendingSet: {
          ...state.pendingSet,
          weight: Math.max(0, state.pendingSet.weight + action.delta),
        },
      };
    }

    case "UPDATE_PENDING_REPS": {
      if (!state.pendingSet) return state;
      return {
        ...state,
        pendingSet: {
          ...state.pendingSet,
          reps: Math.max(1, state.pendingSet.reps + action.delta),
        },
      };
    }

    case "TOGGLE_PENDING_WARMUP": {
      if (!state.pendingSet) return state;
      return {
        ...state,
        pendingSet: {
          ...state.pendingSet,
          isWarmup: !state.pendingSet.isWarmup,
        },
      };
    }

    case "CANCEL_PENDING": {
      return { ...state, pendingSet: null };
    }

    case "REST_TICK": {
      return state;
    }

    case "COMPLETE_EXERCISE": {
      if (!state.activeExercise) return state;
      const updated: AppState = {
        ...state,
        activeExercise: null,
      };
      saveState(updated);
      return updated;
    }

    case "DISMISS_COMPLETION": {
      const updated: AppState = {
        ...state,
        activeExercise: null,
      };
      saveState(updated);
      return updated;
    }

    case "SWITCH_TAB": {
      return { ...state, currentTab: action.tab };
    }

    case "RESTORE_STATE": {
      return { ...state, ...action.state };
    }

    default:
      return state;
  }
}

interface StoreContextValue {
  state: AppState;
  startExercise: (exerciseId: string) => void;
  openPendingSet: () => void;
  confirmSet: () => void;
  undoSet: () => void;
  dismissUndo: () => void;
  skipRest: () => void;
  updatePendingWeight: (delta: number) => void;
  updatePendingReps: (delta: number) => void;
  togglePendingWarmup: () => void;
  cancelPending: () => void;
  completeExercise: () => void;
  switchTab: (tab: Tab) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AppState>;
        dispatch({ type: "RESTORE_STATE", state: parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  // Undo auto-dismiss after 3 seconds
  useEffect(() => {
    if (!state.undoSet) return;
    const timer = setTimeout(() => dispatch({ type: "DISMISS_UNDO" }), 3000);
    return () => clearTimeout(timer);
  }, [state.undoSet]);

  const startExercise = useCallback(
    (exerciseId: string) => dispatch({ type: "START_EXERCISE", exerciseId }),
    []
  );

  const openPendingSet = useCallback(() => {
    // When + is pressed, open pending with last weight/reps pre-filled
    // This is called from the component which reads activeExercise
    dispatch({ type: "CANCEL_PENDING" }); // noop if null, just ensures clean state
  }, []);

  const confirmSet = useCallback(
    (payload: PendingSet) => dispatch({ type: "CONFIRM_SET", payload }),
    []
  );
  const undoSet = useCallback(() => dispatch({ type: "UNDO_SET" }), []);
  const dismissUndo = useCallback(() => dispatch({ type: "DISMISS_UNDO" }), []);
  const skipRest = useCallback(() => dispatch({ type: "SKIP_REST" }), []);
  const updatePendingWeight = useCallback(
    (delta: number) => dispatch({ type: "UPDATE_PENDING_WEIGHT", delta }),
    []
  );
  const updatePendingReps = useCallback(
    (delta: number) => dispatch({ type: "UPDATE_PENDING_REPS", delta }),
    []
  );
  const togglePendingWarmup = useCallback(
    () => dispatch({ type: "TOGGLE_PENDING_WARMUP" }),
    []
  );
  const cancelPending = useCallback(
    () => dispatch({ type: "CANCEL_PENDING" }),
    []
  );
  const completeExercise = useCallback(
    () => dispatch({ type: "COMPLETE_EXERCISE" }),
    []
  );
  const switchTab = useCallback(
    (tab: Tab) => dispatch({ type: "SWITCH_TAB", tab }),
    []
  );

  return (
    <StoreContext.Provider
      value={{
        state,
        startExercise,
        openPendingSet,
        confirmSet,
        undoSet,
        dismissUndo,
        skipRest,
        updatePendingWeight,
        updatePendingReps,
        togglePendingWarmup,
        cancelPending,
        completeExercise,
        switchTab,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
