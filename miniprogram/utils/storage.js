/**
 * 微信本地存储封装
 * 所有训练状态和记录都通过这里读写，避免页面直接操作 wx.storage
 */

const KEYS = {
  CURRENT_SESSION: 'current_session',
  TRAINING_RECORDS: 'training_records',
  REST_DURATION_SECONDS: 'rest_duration_seconds',
  CUSTOM_EXERCISES: 'custom_exercises'
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
  if ([60, 90, 120, 180].includes(saved)) {
    return saved;
  }
  return DEFAULT_REST_DURATION_SECONDS;
}

function saveRestDurationSeconds(seconds) {
  const normalized = [60, 90, 120, 180].includes(Number(seconds))
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

module.exports = {
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
  deleteCustomExercise
};
