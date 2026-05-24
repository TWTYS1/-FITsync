const { getCategories, getExercisesByCategory, getExerciseById, getFrequentExercises, CATEGORY_KEYS } = require('../../data/exercises');
const {
  createSession,
  getConfirmLabel,
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
  getRecords,
  getRestDurationSeconds,
  saveRestDurationSeconds,
  getCustomExercises,
  saveExerciseOverride,
  applyExerciseOverride,
  applyExerciseOverrides
} = require('../../utils/storage');
const {
  buildDailySummary
} = require('../../utils/dailySummary');

const CONFIRM_HOLD_MS = 1500;
const UNDO_TOAST_SECONDS = 3;
const MISSED_SET_MS = 120 * 1000;

Page({
  data: {
    // State: 'exercises' | 'training' | 'resting' | 'summary'
    state: 'exercises',

    // Category tabs
    categories: [],
    activeCategory: '',

    // Exercises (merged preset + custom)
    exercises: [],
    frequentExercises: [],
    customExercises: [],
    todaySummary: null,
    hasTodaySummary: false,

    // Start settings sheet
    showStartSheet: false,
    startExercise: null,
    startTargetSets: 5,
    startTargetSetsText: '5',
    startDefaultWeight: 0,
    startDefaultWeightText: '0',
    startDefaultReps: 8,
    startDefaultRepsText: '8',
    startRestDurationSeconds: DEFAULT_REST_DURATION_SECONDS,
    saveAsDefault: false,

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
    confirmHint: getConfirmLabel(),

    // Rest timer text
    restSeconds: 0,
    restProgressDeg: 0,
    restFinishedHint: false,
    restDurationSeconds: DEFAULT_REST_DURATION_SECONDS,
    restDurationOptions: [60, 90, 120, 180, 300],

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
    const customExercises = getCustomExercises();
    const restDurationSeconds = getRestDurationSeconds();
    const activeCategory = categories.length > 0 ? categories[0].key : '';

    this.setData({
      categories,
      customExercises,
      activeCategory,
      restDurationSeconds
    });

    this.refreshExercises(activeCategory);

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
      this.resetToExercises(true);
      return;
    }

    if (mode === 'continue') {
      const saved = getSession();
      if (saved) {
        this.enterTraining(saved);
      } else {
        this.resetToExercises(false);
      }
      return;
    }

    // Refresh custom exercises when returning from exercise-form page
    const customExercises = getCustomExercises();
    this.setData({ customExercises });
    this.refreshExercises(this.data.activeCategory);
    this.refreshTodaySummary();
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

  /* ========== Category & Exercise Selection ========== */

  refreshExercises(category) {
    const raw = getExercisesByCategory(category, this.data.customExercises);
    const exercises = applyExerciseOverrides(raw);
    // Add role header flag
    let lastRole = null;
    const annotated = exercises.map(function (ex) {
      const showRoleHeader = ex.role !== lastRole;
      if (showRoleHeader) lastRole = ex.role;
      return Object.assign({}, ex, { showRoleHeader: showRoleHeader });
    });
    const records = getRecords();
    const frequent = applyExerciseOverrides(
      getFrequentExercises(category, records, this.data.customExercises)
    );
    const todaySummary = buildDailySummary(records, Date.now());
    this.setData({
      exercises: annotated,
      frequentExercises: frequent,
      todaySummary,
      hasTodaySummary: todaySummary.records.length > 0
    });
  },

  refreshTodaySummary() {
    const todaySummary = buildDailySummary(getRecords(), Date.now());
    this.setData({
      todaySummary,
      hasTodaySummary: todaySummary.records.length > 0
    });
  },

  onTapCategoryTab(e) {
    this.stopMissedSetTimer();
    const { key } = e.currentTarget.dataset;
    this.setData({ activeCategory: key });
    this.refreshExercises(key);
  },

  onTapExercise(e) {
    this.stopMissedSetTimer();
    const { id } = e.currentTarget.dataset;
    var exercise = getExerciseById(id, this.data.customExercises);
    if (!exercise) return;
    exercise = applyExerciseOverride(exercise);
    var weight = exercise.defaultWeight || 0;
    var reps = exercise.defaultReps || 8;

    this.setData({
      showStartSheet: true,
      startExercise: exercise,
      startTargetSets: exercise.targetSets,
      startTargetSetsText: String(exercise.targetSets),
      startDefaultWeight: weight,
      startDefaultWeightText: this.formatWeight(weight),
      startDefaultReps: reps,
      startDefaultRepsText: String(reps),
      startRestDurationSeconds: this.data.restDurationSeconds,
      saveAsDefault: false
    });
  },

  onTapFrequent(e) {
    this.onTapExercise(e);
  },

  /* ========== Start Settings Sheet ========== */

  onCloseStartSheet() {
    this.setData({ showStartSheet: false, startExercise: null });
  },

  onStartSetsMinus() {
    const val = Math.max(1, this.data.startTargetSets - 1);
    this.setData({ startTargetSets: val, startTargetSetsText: String(val) });
  },

  onStartSetsPlus() {
    const val = Math.min(10, this.data.startTargetSets + 1);
    this.setData({ startTargetSets: val, startTargetSetsText: String(val) });
  },

  onStartSetsInput(e) {
    const text = String(e.detail.value || '').replace(/[^\d]/g, '');
    const val = Number.parseInt(text, 10);
    this.setData({
      startTargetSetsText: text,
      startTargetSets: Number.isFinite(val) ? this.clampTargetSets(val) : 1
    });
  },

  onStartSetsBlur() {
    const val = Number.parseInt(this.data.startTargetSetsText, 10);
    const targetSets = Number.isFinite(val)
      ? this.clampTargetSets(val)
      : this.clampTargetSets(this.data.startTargetSets || 1);
    this.setData({
      startTargetSets: targetSets,
      startTargetSetsText: String(targetSets)
    });
  },

  onStartWeightMinus() {
    var val = Math.max(0, this.round2(this.data.startDefaultWeight - 2.5));
    this.setData({ startDefaultWeight: val, startDefaultWeightText: this.formatWeight(val) });
  },

  onStartWeightPlus() {
    var val = this.round2(this.data.startDefaultWeight + 2.5);
    this.setData({ startDefaultWeight: val, startDefaultWeightText: this.formatWeight(val) });
  },

  onStartWeightInput(e) {
    var text = this.normalizeDecimalText(e.detail.value, 2);
    var val = Number.parseFloat(text);
    this.setData({
      startDefaultWeightText: text,
      startDefaultWeight: Number.isFinite(val) ? this.round2(val) : 0
    });
  },

  onStartWeightBlur() {
    var weight = this.parseWeight(this.data.startDefaultWeightText, this.data.startDefaultWeight);
    this.setData({
      startDefaultWeight: weight,
      startDefaultWeightText: this.formatWeight(weight)
    });
  },

  onStartRepsMinus() {
    var val = Math.max(1, this.data.startDefaultReps - 1);
    this.setData({ startDefaultReps: val, startDefaultRepsText: String(val) });
  },

  onStartRepsPlus() {
    var val = this.data.startDefaultReps + 1;
    this.setData({ startDefaultReps: val, startDefaultRepsText: String(val) });
  },

  onStartRepsInput(e) {
    var text = String(e.detail.value || '').replace(/[^\d]/g, '');
    var val = Number.parseInt(text, 10);
    this.setData({
      startDefaultRepsText: text,
      startDefaultReps: Number.isFinite(val) ? Math.max(1, val) : 1
    });
  },

  onStartRepsBlur() {
    var reps = Math.max(1, Number.parseInt(this.data.startDefaultRepsText, 10) || this.data.startDefaultReps || 8);
    this.setData({
      startDefaultReps: reps,
      startDefaultRepsText: String(reps)
    });
  },

  onToggleSaveAsDefault() {
    this.setData({ saveAsDefault: !this.data.saveAsDefault });
  },

  onSelectRestOption(e) {
    const { seconds } = e.currentTarget.dataset;
    this.setData({ startRestDurationSeconds: Number(seconds) });
  },

  onStartTraining() {
    var exercise = this.data.startExercise;
    if (!exercise) return;
    var targetSets = this.clampTargetSets(Number.parseInt(this.data.startTargetSetsText, 10) || this.data.startTargetSets);
    var defaultWeight = this.parseWeight(this.data.startDefaultWeightText, this.data.startDefaultWeight);
    var defaultReps = Math.max(1, Number.parseInt(this.data.startDefaultRepsText, 10) || this.data.startDefaultReps || 8);
    var startRestDurationSeconds = this.data.startRestDurationSeconds;

    if (this.data.saveAsDefault) {
      saveExerciseOverride(exercise.id, {
        targetSets: targetSets,
        defaultWeight: defaultWeight,
        defaultReps: defaultReps
      });
    }

    saveRestDurationSeconds(startRestDurationSeconds);
    this.setData({
      restDurationSeconds: startRestDurationSeconds,
      showStartSheet: false,
      startTargetSets: targetSets,
      startTargetSetsText: String(targetSets),
      startDefaultWeight: defaultWeight,
      startDefaultWeightText: this.formatWeight(defaultWeight),
      startDefaultReps: defaultReps,
      startDefaultRepsText: String(defaultReps),
      saveAsDefault: false
    });

    var configuredExercise = Object.assign({}, exercise, {
      targetSets: targetSets,
      defaultWeight: defaultWeight,
      defaultReps: defaultReps
    });

    var session = createSession(configuredExercise, {
      targetSets
    });
    this.enterTraining(session);
  },

  onAddCustomExercise() {
    wx.navigateTo({
      url: '/pages/exercise-form/exercise-form?category=' + this.data.activeCategory
    });
  },

  onOpenTodaySummary() {
    const summary = this.data.todaySummary || buildDailySummary(getRecords(), Date.now());
    if (!summary.records.length) return;
    this.stopUndoToast();
    this.setData({ undoToast: null });
    wx.navigateTo({
      url: '/pages/daily-summary/daily-summary?date=' + summary.dateKey
    });
  },

  onEditCustomExercise(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/exercise-form/exercise-form?id=' + id
    });
  },

  /* ========== Training Flow (unchanged) ========== */

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

  resetToExercises(shouldClearStorage) {
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
      state: 'exercises',
      showStartSheet: false,
      startExercise: null,
      startTargetSets: 5,
      startTargetSetsText: '5',
      startDefaultWeight: 0,
      startDefaultWeightText: '0',
      startDefaultReps: 8,
      startDefaultRepsText: '8',
      startRestDurationSeconds: restDurationSeconds,
      saveAsDefault: false,
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
      confirmHint: getConfirmLabel(),
      restDurationSeconds,
      restSeconds: 0,
      restProgressDeg: 0,
      restFinishedHint: false,
      undoToast: null,
      missedSetPrompt: false,
      summary: null
    });
    this.refreshExercises(this.data.activeCategory);
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
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return h + ':' + m;
  },

  toggleLastSetPanel() {
    this.setData({ lastSetPanelExpanded: !this.data.lastSetPanelExpanded });
  },

  /* ========== Sheet (unchanged) ========== */

  onOpenSheet() {
    const s = this.data.session;
    if (!s) return;
    this.stopMissedSetTimer();
    this.confirmCommitted = false;
    this.setData({
      showSheet: true,
      sheetWeight: s.lastWeight,
      sheetReps: s.lastReps,
      sheetWeightText: this.formatWeight(s.lastWeight),
      sheetRepsText: String(s.lastReps),
      sheetIsWarmup: false,
      confirmHolding: false,
      confirmProgress: 0,
      confirmHint: getConfirmLabel(),
      missedSetPrompt: false
    });
  },

  onCloseSheet() {
    if (this.data.confirmHolding) return;
    this.stopConfirmHold(false);
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
    return parts[0] + '.' + parts.slice(1).join('').slice(0, decimalPlaces);
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

  clampTargetSets(value) {
    return Math.max(1, Math.min(10, Number(value) || 1));
  },

  onToggleWarmup() {
    this.setData({ sheetIsWarmup: !this.data.sheetIsWarmup });
  },

  /* ========== Delayed Confirm ========== */

  onConfirmTouchStart() {
    if (!this.data.showSheet || this.confirmTimer || this.confirmCommitted) return;
    this.confirmStartedAt = Date.now();
    this.confirmCommitted = false;

    this.setData({
      confirmHolding: true,
      confirmProgress: 0,
      confirmHint: getConfirmLabel()
    });

    this.confirmTimer = setInterval(() => {
      const elapsed = Date.now() - this.confirmStartedAt;
      const progress = Math.min(100, Math.round((elapsed / CONFIRM_HOLD_MS) * 100));
      this.setData({
        confirmProgress: progress,
        confirmHint: getConfirmLabel(progress)
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
        confirmHint: getConfirmLabel()
      });
    }
  },

  /* ========== Confirm Set (unchanged) ========== */

  onConfirmSet() {
    const { sheetWeightText, sheetRepsText, sheetIsWarmup, session, restDurationSeconds } = this.data;
    if (!session) return;

    const weight = this.parseWeight(sheetWeightText, this.data.sheetWeight);
    const reps = Math.max(1, Number.parseInt(sheetRepsText, 10) || this.data.sheetReps || 1);
    const updated = addSet(session, weight, reps, sheetIsWarmup, restDurationSeconds);
    const latestSet = this.getLatestSet(updated);

    this.setData({
      showSheet: false,
      session: updated,
      setDots: this.buildDots(updated),
      latestSet,
      latestSetLabel: this.getSetLabel(latestSet),
      latestSetTimeText: this.formatSetTime(latestSet),
      completedFormalSetCount: getCompletedFormalSetCount(updated),
      confirmHolding: false,
      confirmProgress: 0,
      confirmHint: getConfirmLabel(),
      sheetWeight: weight,
      sheetReps: reps,
      sheetWeightText: this.formatWeight(weight),
      sheetRepsText: String(reps),
      missedSetPrompt: false
    });
    this.confirmCommitted = false;
    this.stopMissedSetTimer();

    if (updated.completedAt) {
      this.stopRestTimer();
      const record = createRecord(updated);
      saveRecord(record);
      clearSession();
      this.startUndoToast(latestSet);
      const todaySummary = buildDailySummary(getRecords(), Date.now());

      this.setData({
        state: 'summary',
        summary: this.decorateRecord(record),
        todaySummary,
        hasTodaySummary: todaySummary.records.length > 0,
        restSeconds: 0,
        restProgressDeg: 0
      });
    } else {
      this.startUndoToast(latestSet);
      this.setData({
        state: 'resting',
        restSeconds: getRestSeconds(updated),
        restProgressDeg: this.getRestProgressDeg(getRestSeconds(updated)),
        restFinishedHint: false
      });
      this.startRestTimer();
      saveSession(updated);
    }
  },

  /* ========== Undo (unchanged) ========== */

  onUndoSet() {
    if (!this.data.session) return;
    if (this.data.summary && this.data.summary.id) {
      removeRecord(this.data.summary.id);
    }
    const updated = undoSets(this.data.session);
    const latestSet = this.getLatestSet(updated);
    const todaySummary = buildDailySummary(getRecords(), Date.now());
    this.stopUndoToast();
    this.setData({
      session: updated,
      setDots: this.buildDots(updated),
      latestSet,
      latestSetLabel: this.getSetLabel(latestSet),
      latestSetTimeText: this.formatSetTime(latestSet),
      completedFormalSetCount: getCompletedFormalSetCount(updated),
      state: 'training',
      restSeconds: 0,
      restProgressDeg: 0,
      restFinishedHint: false,
      missedSetPrompt: false,
      undoToast: null,
      summary: null,
      todaySummary,
      hasTodaySummary: todaySummary.records.length > 0
    });
    this.stopRestTimer();
    this.clearRestFinishedHint();
    saveSession(updated);
    this.startMissedSetTimer();
  },

  /* ========== Rest Timer (unchanged) ========== */

  getRestProgressDeg(restSeconds) {
    const total = Math.max(1, this.data.restDurationSeconds || DEFAULT_REST_DURATION_SECONDS);
    return Math.max(0, Math.min(360, ((total - restSeconds) / total) * 360));
  },

  startRestTimer() {
    this.stopRestTimer();
    this.lastRenderedRestSeconds = null;
    this.restTimer = setInterval(() => {
      const s = this.data.session;
      if (!s) return;

      const sec = getRestSeconds(s);
      const display = sec <= 0 ? 0 : sec;

      if (this.lastRenderedRestSeconds !== display) {
        this.lastRenderedRestSeconds = display;
        this.setData({
          restSeconds: display,
          restProgressDeg: this.getRestProgressDeg(display)
        });
      }

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
      }
    }, 250);
  },

  stopRestTimer() {
    if (this.restTimer) {
      clearInterval(this.restTimer);
      this.restTimer = null;
    }
    this.lastRenderedRestSeconds = null;
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
      restFinishedHint: false
    });
    saveSession(updated);
    this.startMissedSetTimer();
  },

  clearRestFinishedHint() {
    if (this.restFinishedHintTimer) {
      clearTimeout(this.restFinishedHintTimer);
      this.restFinishedHintTimer = null;
    }
    this.setData({ restFinishedHint: false });
  },

  showRestFinishedHint() {
    this.clearRestFinishedHint();
    try {
      wx.vibrateShort({ type: 'light' });
    } catch (e) {
      if (wx.vibrateShort) wx.vibrateShort();
    }
    this.setData({ restFinishedHint: true });
    this.restFinishedHintTimer = setTimeout(() => {
      this.setData({ restFinishedHint: false });
    }, 5000);
  },

  /* ========== Missed Set Prompt ========== */

  startMissedSetTimer() {
    this.stopMissedSetTimer();
    if (!this.data.session || this.data.state !== 'training' || this.data.showSheet) return;
    this.setData({ missedSetPrompt: false });
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

  /* ========== Undo Toast ========== */

  startUndoToast(set) {
    this.stopUndoToast();
    this.setData({
      undoToast: {
        setLabel: this.getSetLabel(set),
        seconds: UNDO_TOAST_SECONDS
      }
    });
    this.undoTickTimer = setInterval(() => {
      const u = this.data.undoToast;
      if (!u) {
        this.stopUndoToast();
        return;
      }
      if (u.seconds <= 1) {
        this.stopUndoToast();
        this.setData({ undoToast: null });
        return;
      }
      this.setData({ undoToast: { setLabel: u.setLabel, seconds: u.seconds - 1 } });
    }, 1000);
    this.undoTimer = setTimeout(() => {
      this.setData({ undoToast: null });
      this.stopUndoToast();
    }, UNDO_TOAST_SECONDS * 1000);
  },

  stopUndoToast() {
    if (this.undoTimer) {
      clearTimeout(this.undoTimer);
      this.undoTimer = null;
    }
    if (this.undoTickTimer) {
      clearInterval(this.undoTickTimer);
      this.undoTickTimer = null;
    }
  },

  /* ========== Summary (unchanged) ========== */

  onFinishSummary() {
    this.stopUndoToast();
    this.setData({
      state: 'exercises',
      session: null,
      summary: null,
      setDots: [],
      latestSet: null,
      latestSetLabel: '',
      latestSetTimeText: '',
      completedFormalSetCount: 0,
      lastSetPanelExpanded: false,
      undoToast: null
    });
    this.refreshExercises(this.data.activeCategory);
  },

  onContinueAfterSummary() {
    this.onFinishSummary();
  },

  decorateRecord(record) {
    return {
      ...record,
      sets: record.sets.map((set) => ({
        ...set,
        setLabel: this.getSetLabel(set)
      }))
    };
  }
});
