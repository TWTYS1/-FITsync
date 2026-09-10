/**
 * 埋点与漏斗分析
 *
 * 数据决定迭代方向。本模块负责采集关键事件,回答三个问题:
 *   1. 新用户能不能完成首训?(激活漏斗)
 *   2. 训练过程中用户在哪一步流失?(主链路漏斗)
 *   3. 有多少人愿意分享?(增长系数)
 *
 * 策略:
 *   - 事件先进本地队列(持久化),绝不因网络问题阻塞主线程
 *   - 达到阈值后批量上报
 *   - 云能力未启用时仅本地累计,仍可通过 getFunnel() 查看
 */

const { callCloud } = require('../utils/request');
const { getConfig, isCloudEnabled } = require('../utils/config');
const auth = require('./auth');
const monitor = require('../utils/monitor');

const QUEUE_KEY = 'fitsync_analytics_queue';
const MAX_QUEUE = 100;      // 队列上限,超出丢弃最旧的
const FLUSH_THRESHOLD = 20; // 达到该数量触发上报

/**
 * 关键事件枚举
 */
const EVENTS = {
  APP_LAUNCH: 'app_launch',
  HOME_VIEW: 'home_view',
  TRAINING_START: 'training_start',
  EXERCISE_SELECT: 'exercise_select',
  SET_CONFIRMED: 'set_confirmed',
  REST_SKIPPED: 'rest_skipped',
  SESSION_COMPLETE: 'session_complete',
  SUMMARY_VIEW: 'summary_view',
  RECORD_SHARED: 'record_shared',
  SUBSCRIBE_REQUEST: 'subscribe_request',
  AGREEMENT_ACCEPT: 'agreement_accept'
};

function readQueue() {
  try {
    return wx.getStorageSync(QUEUE_KEY) || [];
  } catch (e) {
    return [];
  }
}

function writeQueue(queue) {
  try {
    wx.setStorageSync(QUEUE_KEY, queue);
  } catch (e) {
    // storage 写满或异常时静默失败,埋点不应影响主流程
  }
}

function getUserId() {
  const user = auth.getCurrentUser();
  return (user && user.id) || '';
}

/**
 * 上报一条事件
 *
 * @param {String} event     事件名,建议取 EVENTS 中的枚举
 * @param {Object} properties 附加属性
 */
function track(event, properties) {
  if (!event) return;

  const cfg = getConfig();
  if (!cfg.enableAnalytics && cfg.env === 'develop') {
    // 开发环境默认不上报,避免污染数据;仍保留控制台输出
    console.log('[track]', event, properties || {});
    return;
  }

  const payload = {
    event: event,
    props: properties || {},
    ts: Date.now(),
    userId: getUserId(),
    env: cfg.env
  };

  if (cfg.enableLog) {
    console.log('[track]', event, properties || {});
  }

  const queue = readQueue();
  queue.push(payload);

  // 超限保留最新的 MAX_QUEUE 条
  if (queue.length > MAX_QUEUE) {
    queue.splice(0, queue.length - MAX_QUEUE);
  }

  writeQueue(queue);

  if (queue.length >= FLUSH_THRESHOLD) {
    flush();
  }
}

/**
 * 批量上报并清空队列
 */
function flush() {
  const queue = readQueue();
  if (!queue.length) return Promise.resolve(0);

  if (!isCloudEnabled() || !auth.isRealUser()) {
    return Promise.resolve(0);
  }

  return callCloud('recordSync', {
    action: 'analytics',
    events: queue
  }, { silent: true })
    .then(function () {
      writeQueue([]);
      return queue.length;
    })
    .catch(function (err) {
      monitor.info('analytics-flush-failed', { code: err && err.code });
      return 0;
    });
}

/**
 * 本地漏斗统计(调试 / 无云端时查看)
 *
 * @returns {Object} { eventName: count }
 */
function getFunnel() {
  const queue = readQueue();
  const result = {};

  queue.forEach(function (item) {
    result[item.event] = (result[item.event] || 0) + 1;
  });

  return result;
}

/**
 * 清空本地埋点数据
 */
function clearQueue() {
  writeQueue([]);
}

module.exports = {
  EVENTS,
  track,
  flush,
  getFunnel,
  clearQueue,
  readQueue
};
