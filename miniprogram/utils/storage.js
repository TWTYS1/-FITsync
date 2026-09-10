/**
 * 微信本地存储封装
 * 所有训练状态和记录都通过这里读写，避免页面直接操作 wx.storage
 */

const KEYS = {
  CURRENT_SESSION: 'current_session',
  TRAINING_RECORDS: 'training_records',
  REST_DURATION_SECONDS: 'rest_duration_seconds',
  CUSTOM_EXERCISES: 'custom_exercises',
  EXERCISE_OVERRIDES: 'exercise_overrides',

  // ---- 上线基建新增 ----
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
  LOCAL_GUEST_ID: 'local_guest_id',
  AGREEMENT_ACCEPTED: 'agreement_accepted',
  SYNC_QUEUE: 'sync_queue',
  LAST_SYNC_AT: 'last_sync_at'
};

const DEFAULT_REST_DURATION_SECONDS = 90;

/**
 * 保存当前训练会话（未完成的训练）
 */
function saveSession(session) {
  wx.setStorageSync(KEYS.CURRENT_SESSION, session);
}

/**
 * 读取当前训练会话，无则返回 null
 */
function getSession() {
  return wx.getStorageSync(KEYS.CURRENT_SESSION) || null;
}

/**
 * 清除当前训练会话
 */
function clearSession() {
  wx.removeStorageSync(KEYS.CURRENT_SESSION);
}

/**
 * 获取所有训练记录（按时间倒序）
 */
function getRecords() {
  return wx.getStorageSync(KEYS.TRAINING_RECORDS) || [];
}

/**
 * 保存一条训练记录
 */
function saveRecord(record) {
  const records = getRecords();
  records.unshift(record);
  wx.setStorageSync(KEYS.TRAINING_RECORDS, records);
}

function removeRecord(recordId) {
  const records = getRecords().filter((record) => record.id !== recordId);
  wx.setStorageSync(KEYS.TRAINING_RECORDS, records);
}

/**
 * 获取今日训练记录
 */
function getTodayRecords() {
  const records = getRecords();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return records.filter((r) => {
    const d = new Date(r.startedAt);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return ds === todayStr;
  });
}

function getRestDurationSeconds() {
  const saved = Number(wx.getStorageSync(KEYS.REST_DURATION_SECONDS));
  if ([60, 90, 120, 180, 300].includes(saved)) {
    return saved;
  }
  return DEFAULT_REST_DURATION_SECONDS;
}

function saveRestDurationSeconds(seconds) {
  const normalized = [60, 90, 120, 180, 300].includes(Number(seconds))
    ? Number(seconds)
    : DEFAULT_REST_DURATION_SECONDS;
  wx.setStorageSync(KEYS.REST_DURATION_SECONDS, normalized);
  return normalized;
}

/* ================================================================
 * 自定义动作 CRUD
 * ================================================================ */

function getCustomExercises() {
  return wx.getStorageSync(KEYS.CUSTOM_EXERCISES) || [];
}

function saveCustomExercise(exercise) {
  const exercises = getCustomExercises();
  const id = 'custom_' + Date.now();
  const newExercise = Object.assign({}, exercise, { id: id, source: 'custom' });
  exercises.push(newExercise);
  wx.setStorageSync(KEYS.CUSTOM_EXERCISES, exercises);
  return newExercise;
}

function updateCustomExercise(id, updates) {
  const exercises = getCustomExercises();
  const index = exercises.findIndex(function (e) { return e.id === id; });
  if (index === -1) return null;
  exercises[index] = Object.assign({}, exercises[index], updates);
  wx.setStorageSync(KEYS.CUSTOM_EXERCISES, exercises);
  return exercises[index];
}

function deleteCustomExercise(id) {
  const exercises = getCustomExercises().filter(function (e) { return e.id !== id; });
  wx.setStorageSync(KEYS.CUSTOM_EXERCISES, exercises);
}

/* ================================================================
 * 预设动作个人默认值覆盖
 * ================================================================ */

function getExerciseOverrides() {
  return wx.getStorageSync(KEYS.EXERCISE_OVERRIDES) || {};
}

function getExerciseOverride(exerciseId) {
  var overrides = getExerciseOverrides();
  return overrides[exerciseId] || null;
}

function saveExerciseOverride(exerciseId, values) {
  var overrides = getExerciseOverrides();
  var rawSets = Number(values.targetSets);
  var targetSets = Number.isFinite(rawSets) ? Math.max(1, Math.min(10, rawSets)) : 5;
  var rawWeight = Number(values.defaultWeight);
  var defaultWeight = Number.isFinite(rawWeight) ? Math.max(0, Math.round(rawWeight * 100) / 100) : 0;
  var rawReps = Number(values.defaultReps);
  var defaultReps = Number.isFinite(rawReps) ? Math.max(1, rawReps) : 8;
  overrides[exerciseId] = {
    targetSets: targetSets,
    defaultWeight: defaultWeight,
    defaultReps: defaultReps,
    updatedAt: Date.now()
  };
  wx.setStorageSync(KEYS.EXERCISE_OVERRIDES, overrides);
}

function applyExerciseOverride(exercise) {
  if (!exercise || !exercise.id) return exercise;
  var override = getExerciseOverride(exercise.id);
  if (!override) return exercise;
  return Object.assign({}, exercise, {
    targetSets: override.targetSets,
    defaultWeight: override.defaultWeight,
    defaultReps: override.defaultReps
  });
}

function applyExerciseOverrides(exercises) {
  return (exercises || []).map(function (ex) {
    return applyExerciseOverride(ex);
  });
}

/* ================================================================
 * 用户态 — 上线基建新增
 * ================================================================ */

function getToken() {
  return wx.getStorageSync(KEYS.ACCESS_TOKEN) || '';
}

function setToken(token, refreshToken) {
  wx.setStorageSync(KEYS.ACCESS_TOKEN, token || '');
  if (refreshToken) {
    wx.setStorageSync(KEYS.REFRESH_TOKEN, refreshToken);
  }
}

function clearToken() {
  wx.removeStorageSync(KEYS.ACCESS_TOKEN);
  wx.removeStorageSync(KEYS.REFRESH_TOKEN);
}

function getUserInfo() {
  return wx.getStorageSync(KEYS.USER_INFO) || null;
}

function setUserInfo(user) {
  wx.setStorageSync(KEYS.USER_INFO, user || null);
}

/**
 * 本地匿名用户标识
 * 用于「云能力不可用」时仍能稳定标识一台设备上的使用者,
 * 保证同步队列等逻辑有可用的身份键。
 */
function getOrCreateLocalGuestId() {
  let guestId = wx.getStorageSync(KEYS.LOCAL_GUEST_ID);
  if (!guestId) {
    guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    wx.setStorageSync(KEYS.LOCAL_GUEST_ID, guestId);
  }
  return guestId;
}

/**
 * 隐私协议是否已同意
 */
function isAgreementAccepted() {
  return !!wx.getStorageSync(KEYS.AGREEMENT_ACCEPTED);
}

function getAgreementRecord() {
  return wx.getStorageSync(KEYS.AGREEMENT_ACCEPTED) || null;
}

/* ================================================================
 * 同步队列 — 失败重试
 * ================================================================ */

function getSyncQueue() {
  return wx.getStorageSync(KEYS.SYNC_QUEUE) || [];
}

function setSyncQueue(queue) {
  wx.setStorageSync(KEYS.SYNC_QUEUE, queue || []);
}

function enqueueSync(task) {
  const queue = getSyncQueue();
  // 同一 recordId 去重,避免重复堆积
  const exists = queue.some(function (item) {
    return item.recordId && task.recordId && item.recordId === task.recordId;
  });
  if (exists) return queue;

  queue.push(Object.assign({ createdAt: Date.now(), retryCount: 0 }, task));
  setSyncQueue(queue);
  return queue;
}

function removeSyncTask(recordId) {
  const queue = getSyncQueue().filter(function (item) {
    return item.recordId !== recordId;
  });
  setSyncQueue(queue);
  return queue;
}

function getLastSyncAt() {
  return Number(wx.getStorageSync(KEYS.LAST_SYNC_AT)) || 0;
}

function setLastSyncAt(timestamp) {
  wx.setStorageSync(KEYS.LAST_SYNC_AT, timestamp || Date.now());
}

module.exports = {
  KEYS,
  saveSession,
  getSession,
  clearSession,
  getRecords,
  saveRecord,
  removeRecord,
  getTodayRecords,
  getRestDurationSeconds,
  saveRestDurationSeconds,
  getCustomExercises,
  saveCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
  getExerciseOverrides,
  getExerciseOverride,
  saveExerciseOverride,
  applyExerciseOverride,
  applyExerciseOverrides,

  // 用户态
  getToken,
  setToken,
  clearToken,
  getUserInfo,
  setUserInfo,
  getOrCreateLocalGuestId,
  isAgreementAccepted,
  getAgreementRecord,

  // 同步队列
  getSyncQueue,
  setSyncQueue,
  enqueueSync,
  removeSyncTask,
  getLastSyncAt,
  setLastSyncAt
};
