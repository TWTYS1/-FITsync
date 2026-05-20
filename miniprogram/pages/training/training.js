const { getCategories, getExercisesByCategory, getExerciseById } = require('../../data/exercises');
const {
  createSession,
  getFightLabel,
  getFightFontSize,
  addSet,
  undoSets,
  skipRest,
  getRestSeconds,
  isRestOver,
  DEFAULT_REST_DURATION_SECONDS,
  getCompletedFormalSetCount,
  createRecord
} = require('../../utils/trainingSession');
const {
  saveSession,
  getSession,
  clearSession,
  saveRecord,
  removeRecord,
  getRestDurationSeconds,
  saveRestDurationSeconds
} = require('../../utils/storage');

const CONFIRM_HOLD_MS = 2000;
const UNDO_TOAST_SECONDS = 3;
const MISSED_SET_MS = 120 * 1000;

Page({
  data: {
    // State: 'categories' | 'exercises' | 'training' | 'resting' | 'summary'
    state: 'categories',

    // Categories & exercises
    categories: [],
    currentCategory: '',
    currentCategoryName: '',
    exercises: [],

    // Start settings sheet
    showStartSheet: false,
    startExercise: null,
    startTargetSets: 5,
    startRestDurationSeconds: DEFAULT_REST_DURATION_SECONDS,

    // Active training data
    session: null,
    setDots: [],
    latestSet: null,
    latestSetLabel: '',
    latestSetTimeText: '',
    completedFormalSetCount: 0,
    lastSetPanelExpanded: false,

    // Sheet
    showSheet: false,
    sheetWeight: 0,
    sheetReps: 0,
    sheetWeightText: '0',
    sheetRepsText: '1',
    sheetIsWarmup: false,
    confirmHolding: false,
    confirmProgress: 0,
    confirmHint: 'FIGHT!',
    confirmFontSize: 32,

    // Rest timer text
    restSeconds: 0,
    restProgressDeg: 0,
    restFinishedHint: false,
    restDurationSeconds: DEFAULT_REST_DURATION_SECONDS,
    restDurationOptions: [60, 90, 120, 180],

    // Lightweight prompts
    undoToast: null,
    missedSetPrompt: false,

    // Summary
    summary: null
  },

  restTimer: null,
  lastRenderedRestSeconds: null,
  confirmTimer: null,
  confirmStartedAt: 0,
  confirmCommitted: false,
  undoTimer: null,
  undoTickTimer: null,
  missedSetTimer: null,
  restFinishedHintTimer: null,

  onLoad() {
    const categories = getCategories();
    const restDurationSeconds = getRestDurationSeconds();
    this.setData({ categories, restDurationSeconds });

    // Resume session if exists
    const saved = getSession();
    if (saved) {
      this.enterTraining(saved);
    }
  },

  onShow() {
    const app = getApp();
    const mode = app.globalData.trainingEntryMode;
    app.globalData.trainingEntryMode = '';

    if (mode === 'new') {
      this.resetToCategories(true);
      return;
    }

    if (mode === 'continue') {
      const saved = getSession();
      if (saved) {
        this.enterTraining(saved);
      } else {
        this.resetToCategories(false);
      }
    }
  },

  onHide() {
    this.stopRestTimer();
    this.stopMissedSetTimer();
  },

  onUnload() {
    this.stopRestTimer();
    this.stopConfirmHold();
    this.stopUndoToast();
    this.stopMissedSetTimer();
    this.clearRestFinishedHint();
  },

  /* ========== Navigation ========== */

  onTapCategory(e) {
    this.stopMissedSetTimer();
    const { key, name } = e.currentTarget.dataset;
    const exercises = getExercisesByCategory(key);
    this.setData({
      state: 'exercises',
      currentCategory: key,
      currentCategoryName: name,
      exercises,
      showStartSheet: false,
      startExercise: null
    });
  },

  onBackToCategories() {
    this.stopMissedSetTimer();
    this.setData({ state: 'categories', showStartSheet: false, startExercise: null });
  },

  onTapExercise(e) {
    this.stopMissedSetTimer();
    const { id } = e.currentTarget.dataset;
    const exercise = getExerciseById(id);
    if (!exercise) return;

    this.setData({
      showStartSheet: true,
      startExercise: exercise,
      startTargetSets: exercise.targetSets,
      startRestDurationSeconds: this.data.restDurationSeconds
    });
  },

  /* ========== Training Flow ========== */

  enterTraining(session) {
    let normalized = this.normalizeSession(session);
    if (normalized.isResting && isRestOver(normalized)) {
      normalized = skipRest(normalized);
    }
    const latestSet = this.getLatestSet(normalized);
    const dots = this.buildDots(normalized);
    const isResting = normalized.isResting && !isRestOver(normalized);
    const restSeconds = isResting ? getRestSeconds(normalized) : 0;

    this.setData({
      state: isResting ? 'resting' : 'training',
      session: normalized,
      setDots: dots,
      latestSet,
      latestSetLabel: this.getSetLabel(latestSet),
      latestSetTimeText: this.formatSetTime(latestSet),
      completedFormalSetCount: getCompletedFormalSetCount(normalized),
      lastSetPanelExpanded: false,
      restSeconds,
      restProgressDeg: this.getRestProgressDeg(restSeconds)
    });

    if (isResting) {
      this.startRestTimer();
      this.stopMissedSetTimer();
    } else if (normalized) {
      this.startMissedSetTimer();
    }

    saveSession(normalized);
  },

  normalizeSession(session) {
    return {
      ...session,
      defaultWeight: session.defaultWeight ?? session.lastWeight ?? 0,
      defaultReps: session.defaultReps ?? session.lastReps ?? 1
    };
  },

  resetToCategories(shouldClearStorage) {
    this.stopRestTimer();
    this.stopConfirmHold();
    this.stopUndoToast();
    this.stopMissedSetTimer();
    this.clearRestFinishedHint();
    if (shouldClearStorage) {
      clearSession();
    }
    const restDurationSeconds = getRestDurationSeconds();
    this.setData({
      state: 'categories',
      currentCategory: '',
      currentCategoryName: '',
      exercises: [],
      showStartSheet: false,
      startExercise: null,
      startTargetSets: 5,
      startRestDurationSeconds: restDurationSeconds,
      session: null,
      setDots: [],
      latestSet: null,
      latestSetLabel: '',
      latestSetTimeText: '',
      completedFormalSetCount: 0,
      lastSetPanelExpanded: false,
      showSheet: false,
      sheetWeight: 0,
      sheetReps: 0,
      sheetWeightText: '0',
      sheetRepsText: '1',
      sheetIsWarmup: false,
      confirmHolding: false,
      confirmProgress: 0,
      confirmHint: getFightLabel(0),
      confirmFontSize: getFightFontSize(0),
      restDurationSeconds,
      restSeconds: 0,
      restProgressDeg: 0,
      restFinishedHint: false,
      undoToast: null,
      missedSetPrompt: false,
      summary: null
    });
  },

  buildDots(session) {
    const dots = [];
    const completedFormalSets = getCompletedFormalSetCount(session);
    for (let i = 0; i < session.targetSets; i++) {
      dots.push({
        index: i + 1,
        done: i < completedFormalSets,
        current: i + 1 === session.currentSet
      });
    }
    return dots;
  },

  getLatestSet(session) {
    return session && session.sets.length > 0
      ? session.sets[session.sets.length - 1]
      : null;
  },

  getSetLabel(set) {
    if (!set) return '';
    if (set.isWarmup) return '热身组';
    return `第 ${set.formalSetNumber || set.setNumber} 组`;
  },

  formatSetTime(set) {
    if (!set || !set.timestamp) return '';
    const date = new Date(set.timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} 完成`;
  },

  decorateRecord(record) {
    return {
      ...record,
      sets: record.sets.map((set) => ({
        ...set,
        setLabel: this.getSetLabel(set)
      }))
    };
  },

  getRestProgressDeg(restSeconds) {
    const total = this.data.restDurationSeconds || DEFAULT_REST_DURATION_SECONDS;
    return Math.max(0, Math.min(360, Math.round(((total - restSeconds) / total) * 360)));
  },

  /* ========== Sheet ========== */

  onOpenSheet() {
    const s = this.data.session;
    if (!s) return;
    this.stopMissedSetTimer();
    this.setData({
      showSheet: true,
      sheetWeight: s.lastWeight,
      sheetReps: s.lastReps,
      sheetWeightText: this.formatWeight(s.lastWeight),
      sheetRepsText: String(s.lastReps),
      sheetIsWarmup: false,
      confirmHolding: false,
      confirmProgress: 0,
      confirmHint: getFightLabel(0),
      confirmFontSize: getFightFontSize(0),
      missedSetPrompt: false
    });
  },

  onCloseSheet() {
    this.stopConfirmHold();
    this.setData({ showSheet: false });
    if (this.data.state === 'training' && this.data.session) {
      this.startMissedSetTimer();
    }
  },

  onSheetWeightMinus() {
    const val = Math.max(0, this.round2(this.data.sheetWeight - 2.5));
    this.setData({ sheetWeight: val, sheetWeightText: this.formatWeight(val) });
  },

  onSheetWeightPlus() {
    const val = this.round2(this.data.sheetWeight + 2.5);
    this.setData({ sheetWeight: val, sheetWeightText: this.formatWeight(val) });
  },

  onSheetRepsMinus() {
    const val = Math.max(1, this.data.sheetReps - 1);
    this.setData({ sheetReps: val, sheetRepsText: String(val) });
  },

  onSheetRepsPlus() {
    const val = this.data.sheetReps + 1;
    this.setData({ sheetReps: val, sheetRepsText: String(val) });
  },

  onSheetWeightInput(e) {
    const text = this.normalizeDecimalText(e.detail.value, 2);
    const val = Number.parseFloat(text);
    this.setData({
      sheetWeightText: text,
      sheetWeight: Number.isFinite(val) ? this.round2(val) : 0
    });
  },

  onSheetWeightBlur() {
    const weight = this.parseWeight(this.data.sheetWeightText, this.data.sheetWeight);
    this.setData({
      sheetWeight: weight,
      sheetWeightText: this.formatWeight(weight)
    });
  },

  onSheetRepsInput(e) {
    const text = String(e.detail.value || '').replace(/[^\d]/g, '');
    const val = Number.parseInt(text, 10);
    this.setData({
      sheetRepsText: text,
      sheetReps: Number.isFinite(val) ? Math.max(1, val) : 1
    });
  },

  onSheetRepsBlur() {
    const reps = Math.max(1, Number.parseInt(this.data.sheetRepsText, 10) || this.data.sheetReps || 1);
    this.setData({
      sheetReps: reps,
      sheetRepsText: String(reps)
    });
  },

  normalizeDecimalText(value, decimalPlaces) {
    const raw = String(value || '').replace(/[^\d.]/g, '');
    const parts = raw.split('.');
    if (parts.length === 1) return parts[0];
    return `${parts[0]}.${parts.slice(1).join('').slice(0, decimalPlaces)}`;
  },

  parseWeight(value, fallback) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return this.round2(Math.max(0, fallback || 0));
    return this.round2(Math.max(0, parsed));
  },

  round2(value) {
    return Math.round(value * 100) / 100;
  },

  formatWeight(value) {
    return String(this.round2(value));
  },

  onToggleWarmup() {
    this.setData({ sheetIsWarmup: !this.data.sheetIsWarmup });
  },

  /* ========== Start Settings ========== */

  onCloseStartSheet() {
    this.setData({
      showStartSheet: false,
      startExercise: null
    });
  },

  onStartSetsMinus() {
    this.setData({ startTargetSets: Math.max(1, this.data.startTargetSets - 1) });
  },

  onStartSetsPlus() {
    this.setData({ startTargetSets: Math.min(10, this.data.startTargetSets + 1) });
  },

  onStartRestDurationChange(e) {
    const index = Number(e.detail.value);
    const next = this.data.restDurationOptions[index] || DEFAULT_REST_DURATION_SECONDS;
    this.setData({ startRestDurationSeconds: next });
  },

  onConfirmStartTraining() {
    const exercise = this.data.startExercise;
    if (!exercise) return;

    const restDurationSeconds = saveRestDurationSeconds(this.data.startRestDurationSeconds);
    const session = createSession(exercise, { targetSets: this.data.startTargetSets });
    this.setData({
      showStartSheet: false,
      startExercise: null,
      restDurationSeconds
    });
    this.enterTraining(session);
  },

  onRestDurationChange(e) {
    const index = Number(e.detail.value);
    const next = this.data.restDurationOptions[index] || DEFAULT_REST_DURATION_SECONDS;
    const restDurationSeconds = saveRestDurationSeconds(next);
    this.setData({ restDurationSeconds });
  },

  /* ========== Long Press Confirm ========== */

  onConfirmTouchStart() {
    if (!this.data.showSheet || this.confirmTimer) return;

    this.confirmStartedAt = Date.now();
    this.confirmCommitted = false;
    this.setData({
      confirmHolding: true,
      confirmProgress: 0,
      confirmHint: getFightLabel(0),
      confirmFontSize: getFightFontSize(0)
    });

    this.confirmTimer = setInterval(() => {
      const elapsed = Date.now() - this.confirmStartedAt;
      const progress = Math.min(100, Math.round((elapsed / CONFIRM_HOLD_MS) * 100));
      this.setData({
        confirmProgress: progress,
        confirmHint: getFightLabel(progress),
        confirmFontSize: getFightFontSize(progress)
      });

      if (elapsed >= CONFIRM_HOLD_MS && !this.confirmCommitted) {
        this.confirmCommitted = true;
        this.stopConfirmHold(true);
        this.onConfirmSet();
      }
    }, 50);
  },

  onConfirmTouchEnd() {
    if (this.confirmCommitted) return;
    this.stopConfirmHold(false);
  },

  stopConfirmHold(keepProgress) {
    if (this.confirmTimer) {
      clearInterval(this.confirmTimer);
      this.confirmTimer = null;
    }
    this.confirmStartedAt = 0;
    if (!keepProgress) {
      this.confirmCommitted = false;
      this.setData({
        confirmHolding: false,
        confirmProgress: 0,
        confirmHint: getFightLabel(0),
        confirmFontSize: getFightFontSize(0)
      });
    }
  },

  /* ========== Confirm Set ========== */

  onConfirmSet() {
    const { sheetWeightText, sheetRepsText, sheetIsWarmup, session } = this.data;
    if (!session) return;

    const weight = this.parseWeight(sheetWeightText, this.data.sheetWeight);
    const reps = Math.max(1, Number.parseInt(sheetRepsText, 10) || this.data.sheetReps || 1);
    const updated = addSet(session, weight, reps, sheetIsWarmup, this.data.restDurationSeconds);
    const latestSet = this.getLatestSet(updated);
    const restSeconds = getRestSeconds(updated);

    this.setData({
      showSheet: false,
      confirmHolding: false,
      confirmProgress: 0,
      confirmHint: getFightLabel(0),
      confirmFontSize: getFightFontSize(0),
      session: updated,
      setDots: this.buildDots(updated),
      latestSet,
      latestSetLabel: this.getSetLabel(latestSet),
      latestSetTimeText: this.formatSetTime(latestSet),
      completedFormalSetCount: getCompletedFormalSetCount(updated),
      lastSetPanelExpanded: false,
      sheetWeight: weight,
      sheetReps: reps,
      sheetWeightText: this.formatWeight(weight),
      sheetRepsText: String(reps)
    });

    if (updated.completedAt) {
      // Training complete
      this.stopRestTimer();
      const record = createRecord(updated);
      saveRecord(record);
      clearSession();
      this.showUndoToast(latestSet);

      this.setData({
        state: 'summary',
        summary: this.decorateRecord(record)
      });
    } else {
      // Enter rest
      this.showUndoToast(latestSet);
      this.setData({
        state: 'resting',
        restSeconds,
        restProgressDeg: this.getRestProgressDeg(restSeconds),
        restFinishedHint: false,
        missedSetPrompt: false
      });
      this.startRestTimer();
      saveSession(updated);
    }
  },

  /* ========== Undo ========== */

  onUndoSet() {
    if (!this.data.session) return;
    if (this.data.summary && this.data.summary.id) {
      removeRecord(this.data.summary.id);
    }
    const updated = undoSets(this.data.session);
    const latestSet = this.getLatestSet(updated);
    this.stopUndoToast();
    this.stopMissedSetTimer();
    this.setData({
      session: updated,
      setDots: this.buildDots(updated),
      latestSet,
      latestSetLabel: this.getSetLabel(latestSet),
      latestSetTimeText: this.formatSetTime(latestSet),
      completedFormalSetCount: getCompletedFormalSetCount(updated),
      lastSetPanelExpanded: false,
      state: 'training',
      restSeconds: 0,
      restProgressDeg: 0,
      undoToast: null,
      restFinishedHint: false,
      missedSetPrompt: false,
      summary: null
    });
    this.stopRestTimer();
    saveSession(updated);
    this.startMissedSetTimer();
  },

  showUndoToast(set) {
    this.stopUndoToast();
    this.setData({
      undoToast: {
        setLabel: this.getSetLabel(set),
        seconds: UNDO_TOAST_SECONDS
      }
    });

    let remaining = UNDO_TOAST_SECONDS;
    this.undoTickTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        this.stopUndoToast();
        return;
      }
      this.setData({
        undoToast: {
          setLabel: this.getSetLabel(set),
          seconds: remaining
        }
      });
    }, 1000);
  },

  stopUndoToast() {
    if (this.undoTickTimer) {
      clearInterval(this.undoTickTimer);
      this.undoTickTimer = null;
    }
    if (this.undoTimer) {
      clearTimeout(this.undoTimer);
      this.undoTimer = null;
    }
    if (this.data.undoToast) {
      this.setData({ undoToast: null });
    }
  },

  startMissedSetTimer() {
    this.stopMissedSetTimer();
    if (!this.data.session || this.data.state !== 'training') return;
    this.missedSetTimer = setTimeout(() => {
      if (this.data.state === 'training' && this.data.session && !this.data.showSheet) {
        this.setData({ missedSetPrompt: true });
      }
    }, MISSED_SET_MS);
  },

  stopMissedSetTimer() {
    if (this.missedSetTimer) {
      clearTimeout(this.missedSetTimer);
      this.missedSetTimer = null;
    }
  },

  onMissedSetRecord() {
    this.setData({ missedSetPrompt: false });
    this.onOpenSheet();
  },

  onMissedSetIgnore() {
    this.setData({ missedSetPrompt: false });
    this.startMissedSetTimer();
  },

  onToggleLastSetPanel() {
    if (!this.data.latestSet) return;
    this.setData({ lastSetPanelExpanded: !this.data.lastSetPanelExpanded });
  },

  showRestFinishedHint() {
    this.clearRestFinishedHint();
    try {
      wx.vibrateShort({ type: 'light' });
    } catch (e) {
      // Older devtools or platforms may not support typed vibration.
      wx.vibrateShort();
    }
    this.setData({ restFinishedHint: true });
    this.restFinishedHintTimer = setTimeout(() => {
      this.setData({ restFinishedHint: false });
    }, 5000);
  },

  clearRestFinishedHint() {
    if (this.restFinishedHintTimer) {
      clearTimeout(this.restFinishedHintTimer);
      this.restFinishedHintTimer = null;
    }
    if (this.data.restFinishedHint) {
      this.setData({ restFinishedHint: false });
    }
  },

  /* ========== Rest Timer ========== */

  startRestTimer() {
    this.stopRestTimer();
    this.lastRenderedRestSeconds = null;
    this.restTimer = setInterval(() => {
      const s = this.data.session;
      if (!s) return;

      const sec = getRestSeconds(s);
      if (sec <= 0) {
        const updated = skipRest(s);
        this.stopRestTimer();
        this.setData({
          session: updated,
          state: 'training',
          restSeconds: 0,
          restProgressDeg: 0
        });
        saveSession(updated);
        this.showRestFinishedHint();
        this.startMissedSetTimer();
      } else {
        if (sec !== this.lastRenderedRestSeconds) {
          this.lastRenderedRestSeconds = sec;
          this.setData({
            restSeconds: sec,
            restProgressDeg: this.getRestProgressDeg(sec)
          });
        }
      }
    }, 1000);
  },

  stopRestTimer() {
    if (this.restTimer) {
      clearInterval(this.restTimer);
      this.restTimer = null;
    }
  },

  onSkipRest() {
    const updated = skipRest(this.data.session);
    this.stopRestTimer();
    this.clearRestFinishedHint();
    this.setData({
      session: updated,
      state: 'training',
      restSeconds: 0,
      restProgressDeg: 0,
      missedSetPrompt: false
    });
    saveSession(updated);
    this.startMissedSetTimer();
  },

  /* ========== Summary ========== */

  onFinishSummary() {
    this.resetToCategories(false);
  }
});
