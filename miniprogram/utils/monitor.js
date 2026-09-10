/**
 * 错误监控与日志
 *
 * 用法:在 app.js 的 App({}) 中挂载导出的 handler
 *
 *   const monitor = require('./utils/monitor');
 *   App({
 *     onLaunch() { monitor.init(); },
 *     onError: monitor.onError,
 *     onUnhandledRejection: monitor.onUnhandledRejection,
 *     onPageNotFound: monitor.onPageNotFound
 *   })
 *
 * 日志通道:
 *  - realtimeLog:实时日志,可在小程序管理后台「实时日志」查看,保留 7 天
 *  - logManager:本地日志,保留较久但需用户主动上报才有意义
 *  - localQueue:内存队列,便于开发者在调试面板查看最近错误
 */

const MAX_LOCAL_QUEUE = 20;
var localQueue = [];
var realtimeLog = null;
var normalLog = null;
var initialized = false;

function getRealtimeLog() {
  if (realtimeLog !== null) return realtimeLog;
  if (typeof wx.getRealtimeLogManager === 'function') {
    realtimeLog = wx.getRealtimeLogManager() || false;
  } else {
    realtimeLog = false;
  }
  return realtimeLog;
}

function getNormalLog() {
  if (normalLog !== null) return normalLog;
  if (typeof wx.getLogManager === 'function') {
    normalLog = wx.getLogManager({ level: 1 }) || false;
  } else {
    normalLog = false;
  }
  return normalLog;
}

function pushLocal(level, payload) {
  localQueue.unshift(
    Object.assign({ level: level, time: Date.now() }, payload)
  );
  if (localQueue.length > MAX_LOCAL_QUEUE) {
    localQueue = localQueue.slice(0, MAX_LOCAL_QUEUE);
  }
}

/**
 * info 级别的日志仅输出到控制台/本地日志,不进实时日志(避免噪音)
 */
function info(tag, detail) {
  const line = '[组间记][INFO] ' + tag + (detail !== undefined ? ' | ' + safeStringify(detail) : '');
  try {
    const logger = getNormalLog();
    if (logger) logger.info(line);
  } catch (e) {}
  pushLocal('info', { tag: tag, detail: safeStringify(detail) });
}

function warn(tag, detail) {
  const line = '[组间记][WARN] ' + tag + (detail !== undefined ? ' | ' + safeStringify(detail) : '');
  try {
    const logger = getNormalLog();
    if (logger) logger.warn(line);
    const rt = getRealtimeLog();
    if (rt) rt.warn(line);
  } catch (e) {}
  pushLocal('warn', { tag: tag, detail: safeStringify(detail) });
}

function error(tag, detail) {
  const line = '[组间记][ERROR] ' + tag + (detail !== undefined ? ' | ' + safeStringify(detail) : '');
  try {
    const logger = getNormalLog();
    if (logger) logger.error(line);
    const rt = getRealtimeLog();
    if (rt) rt.error(line);
  } catch (e) {}
  pushLocal('error', { tag: tag, detail: safeStringify(detail) });
}

/**
 * 安全序列化,避免循环引用或超长字符串导致日志写入异常
 */
function safeStringify(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.slice(0, 500);
  try {
    return JSON.stringify(value).slice(0, 1000);
  } catch (e) {
    try {
      return String(value).slice(0, 500);
    } catch (e2) {
      return '[unserializable]';
    }
  }
}

function getDeviceContext() {
  const ctx = {};
  try {
    const info = wx.getSystemInfoSync();
    ctx.model = info.model;
    ctx.system = info.system;
    ctx.version = info.version;
    ctx.sdkVersion = info.SDKVersion;
  } catch (e) {}
  try {
    const account = wx.getAccountInfoSync();
    if (account && account.miniProgram) {
      ctx.appId = account.miniProgram.appId;
      ctx.envVersion = account.miniProgram.envVersion;
      ctx.appVersion = account.miniProgram.version;
    }
  } catch (e) {}
  return ctx;
}

function init() {
  if (initialized) return;
  initialized = true;

  try {
    const ctx = getDeviceContext();
    info('launch', ctx);
  } catch (e) {}
}

/* ============ 供 App() 挂载的钩子 ============ */

function onError(msg, stack) {
  error('js-error', { message: msg, stack: stack });
}

function onUnhandledRejection(res) {
  error('unhandled-rejection', {
    reason: safeStringify(res && res.reason)
  });
}

function onPageNotFound(res) {
  warn('page-not-found', {
    path: res && res.path,
    query: res && res.query
  });
}

/**
 * 主动上报业务异常(如云同步失败)
 */
function captureException(tag, err) {
  error(tag, {
    code: err && err.code,
    message: (err && err.message) || String(err)
  });
}

/**
 * 获取本地错误队列(调试用)
 */
function getLocalQueue() {
  return localQueue.slice();
}

module.exports = {
  init,
  info,
  warn,
  error,
  captureException,
  getLocalQueue,
  getDeviceContext,
  safeStringify,
  onError,
  onUnhandledRejection,
  onPageNotFound
};
