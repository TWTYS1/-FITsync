/**
 * 训练会话纯逻辑计算
 * 不依赖页面、不操作 storage，只做数据变换
 */

const REST_DURATION_MS = 90 * 1000;
const DEFAULT_REST_DURATION_SECONDS = 90;

/**
 * 初始化训练会话
 */
function createSession(exercise, overrides = {}) {
  const targetSets = Math.max(1, Math.min(10, Number(overrides.targetSets) || exercise.targetSets));
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    categoryName: exercise.categoryName,
    exerciseSource: exercise.source || 'preset',
    targetSets,
    defaultWeight: exercise.defaultWeight,
    defaultReps: exercise.defaultReps,
    currentSet: 1,
    lastWeight: exercise.defaultWeight,
    lastReps: exercise.defaultReps,
    sets: [],
    isResting: false,
    restEndTime: null,
    startedAt: Date.now(),
    completedAt: null
  };
}

function getConfirmLabel() {
  return '记录本组';
}

function getFormalSets(sets) {
  return sets.filter((s) => !s.isWarmup);
}

function getCompletedFormalSetCount(session) {
  return getFormalSets(session.sets).length;
}

/**
 * 新增一组
 */
function addSet(session, weight, reps, isWarmup, restDurationSeconds = DEFAULT_REST_DURATION_SECONDS) {
  const now = Date.now();
  const warmup = !!isWarmup;
  const restDurationMs = Math.max(1, Number(restDurationSeconds) || DEFAULT_REST_DURATION_SECONDS) * 1000;
  const set = {
    setNumber: session.sets.length + 1,
    formalSetNumber: warmup ? null : session.currentSet,
    weight,
    reps,
    isWarmup: warmup,
    timestamp: now
  };

  const sets = [...session.sets, set];
  const newCurrentSet = warmup ? session.currentSet : session.currentSet + 1;
  const isCompleted = !warmup && newCurrentSet > session.targetSets;

  return {
    ...session,
    sets,
    currentSet: newCurrentSet,
    lastWeight: weight,
    lastReps: reps,
    isResting: !isCompleted,
    restEndTime: isCompleted ? null : now + restDurationMs,
    completedAt: isCompleted ? now : null
  };
}

/**
 * 撤销最后一组
 */
function undoSets(session) {
  if (session.sets.length === 0) return session;

  const removed = session.sets[session.sets.length - 1];
  const sets = session.sets.slice(0, -1);
  const prev = sets.length > 0 ? sets[sets.length - 1] : null;
  const fallbackWeight = session.defaultWeight ?? 0;
  const fallbackReps = session.defaultReps ?? 0;

  return {
    ...session,
    sets,
    currentSet: removed.isWarmup ? session.currentSet : Math.max(1, session.currentSet - 1),
    lastWeight: prev ? prev.weight : fallbackWeight,
    lastReps: prev ? prev.reps : fallbackReps,
    isResting: false,
    restEndTime: null,
    completedAt: null
  };
}

/**
 * 跳过休息
 */
function skipRest(session) {
  return {
    ...session,
    isResting: false,
    restEndTime: null
  };
}

/**
 * 计算剩余休息秒数
 */
function getRestSeconds(session) {
  if (!session.restEndTime) return 0;
  return Math.max(0, Math.ceil((session.restEndTime - Date.now()) / 1000));
}

/**
 * 检查休息是否结束
 */
function isRestOver(session) {
  return getRestSeconds(session) <= 0;
}

/**
 * 计算训练量
 */
function getTotalVolume(sets) {
  return getFormalSets(sets).reduce((sum, s) => sum + s.weight * s.reps, 0);
}

/**
 * 生成训练总结记录
 */
function createRecord(session) {
  const formalSets = getFormalSets(session.sets);
  return {
    id: `session-${session.startedAt}`,
    exerciseName: session.exerciseName,
    categoryName: session.categoryName,
    exerciseId: session.exerciseId,
    exerciseSource: session.exerciseSource || 'preset',
    sets: session.sets,
    totalSets: formalSets.length,
    totalVolume: getTotalVolume(session.sets),
    startedAt: session.startedAt,
    completedAt: session.completedAt || Date.now()
  };
}

module.exports = {
  REST_DURATION_MS,
  DEFAULT_REST_DURATION_SECONDS,
  createSession,
  getConfirmLabel,
  addSet,
  undoSets,
  skipRest,
  getRestSeconds,
  isRestOver,
  getFormalSets,
  getCompletedFormalSetCount,
  getTotalVolume,
  createRecord
};
