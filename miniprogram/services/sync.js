/**
 * 训练记录云端同步
 *
 * 策略:本地优先 + 后台异步
 *
 *   用户体验 —— 记录写入本地即刻生效,UI 绝不等待网络
 *   可靠性   —— 上传失败静默入队,下次启动 / 登录成功后自动补传
 *   幂等性   —— recordId 取本地记录 id(`session-${startedAt}`),天然唯一,重传不产生脏数据
 *
 * 设计约束:
 *   健身房弱网是常态。所有同步失败都必须是静默的,
 *   绝不能因为同步问题弹出任何打断训练节奏的提示。
 */

const { callCloud } = require('../utils/request');
const { isCloudEnabled } = require('../utils/config');
const auth = require('./auth');
const monitor = require('../utils/monitor');
const network = require('../utils/network');
const storage = require('../utils/storage');

/**
 * 同步是否可执行
 * 需同时满足:云能力已启用 + 当前为真实登录用户(非匿名降级态)
 */
function canSync() {
  return isCloudEnabled() && auth.isRealUser();
}

/**
 * 本地记录的 id 即云端 recordId,补上字段保证一致
 */
function toCloudPayload(record) {
  return Object.assign({}, record, {
    recordId: record.id || record.recordId
  });
}

/**
 * 合并本地与云端记录
 *
 * 以 id 去重,保留 completedAt 较新的一份,再按时间倒序。
 * 这样无论是「本地新、云端旧」还是「换设备后云端新、本地空」,都能得到正确结果。
 *
 * @param {Array} local  本地 storage 中的记录
 * @param {Array} remote 云端拉取的记录
 */
function mergeRecords(local, remote) {
  const map = {};

  (local || []).concat(remote || []).forEach(function (item) {
    const key = item.id || item.recordId;
    if (!key) return;

    const prev = map[key];
    if (!prev) {
      map[key] = item;
      return;
    }

    const incomingTime = Number(item.completedAt) || 0;
    const existingTime = Number(prev.completedAt) || 0;
    if (incomingTime > existingTime) {
      map[key] = item;
    }
  });

  return Object.keys(map)
    .map(function (key) {
      return map[key];
    })
    .sort(function (a, b) {
      return (Number(b.startedAt) || 0) - (Number(a.startedAt) || 0);
    });
}

/**
 * 上传单条记录
 *
 * @param {Object} record 本地训练记录
 * @returns {Promise<Boolean>} 是否上传成功
 *
 * 注意:无论网络如何,本方法都不会 reject。
 */
function uploadRecord(record) {
  if (!record || !record.id) {
    return Promise.resolve(false);
  }

  const recordId = record.id;

  // 先入队保证不丢,上传成功后再出队
  storage.enqueueSync({
    recordId: recordId,
    record: toCloudPayload(record)
  });

  if (!canSync()) {
    monitor.info('sync-pending', { recordId: recordId, reason: 'not ready' });
    return Promise.resolve(false);
  }

  if (!network.isOnline()) {
    monitor.info('sync-pending', { recordId: recordId, reason: 'offline' });
    return Promise.resolve(false);
  }

  return callCloud('recordSync', {
    action: 'push',
    records: [toCloudPayload(record)]
  }, { silent: true })
    .then(function () {
      storage.removeSyncTask(recordId);
      return true;
    })
    .catch(function (err) {
      monitor.info('sync-enqueued', { recordId: recordId, code: err && err.code });
      return false;
    });
}

/**
 * 重传队列中累积的失败任务
 *
 * @returns {Promise<Number>} 成功补传的条数
 */
function flushQueue() {
  const queue = storage.getSyncQueue();
  if (!queue.length) return Promise.resolve(0);

  if (!canSync() || !network.isOnline()) {
    return Promise.resolve(0);
  }

  const records = queue.map(function (item) {
    return item.record;
  });

  return callCloud('recordSync', {
    action: 'push',
    records: records
  }, { silent: true })
    .then(function (result) {
      // 队列中的记录已全部尝试写入,成功与否都清空,避免无限重试
      queue.forEach(function (item) {
        storage.removeSyncTask(item.recordId);
      });
      const upserted = (result && result.upserted) || 0;
      monitor.info('flush-queue-done', { total: records.length, upserted: upserted });
      return records.length;
    })
    .catch(function (err) {
      monitor.info('flush-queue-failed', { code: err && err.code });
      return 0;
    });
}

/**
 * 拉取云端记录并与本地合并
 *
 * @returns {Promise<Array>} 合并后的记录列表
 */
function pullAndMerge() {
  const local = storage.getRecords();

  if (!canSync()) {
    return Promise.resolve(local);
  }

  const since = storage.getLastSyncAt();

  return callCloud('recordSync', {
    action: 'pull',
    since: since || 0
  }, { silent: true })
    .then(function (result) {
      const remote = (result && result.records) || [];
      const merged = mergeRecords(local, remote);

      wx.setStorageSync('training_records', merged);
      storage.setLastSyncAt(Date.now());

      monitor.info('pull-merge-done', {
        local: local.length,
        remote: remote.length,
        merged: merged.length
      });

      return merged;
    })
    .catch(function (err) {
      monitor.info('pull-failed', { code: err && err.code });
      // 拉取失败不影响本地数据
      return local;
    });
}

/**
 * 云端删除记录
 */
function deleteRecord(recordId) {
  if (!recordId) return Promise.resolve(false);

  // 若尚未上传成功队列里还有它,直接出队,无需再调云端
  storage.removeSyncTask(recordId);

  if (!canSync()) return Promise.resolve(false);

  return callCloud('recordSync', {
    action: 'delete',
    recordId: recordId
  }, { silent: true })
    .then(function () {
      return true;
    })
    .catch(function (err) {
      monitor.info('sync-delete-failed', { code: err && err.code });
      return false;
    });
}

/**
 * 全量同步:先补传积压队列,再拉取合并
 *
 * 建议在 App.onLaunch、页面 onShow、用户登录态切换后调用。
 * 全程异步静默,不阻塞 UI。
 *
 * @returns {Promise<Array>} 合并后的记录列表
 */
function fullSync() {
  if (!canSync()) {
    return Promise.resolve(storage.getRecords());
  }

  return flushQueue().then(function () {
    return pullAndMerge();
  });
}

/**
 * 登录成功后自动补传积压数据
 * 场景:用户先以匿名身份训练若干次,之后网络恢复并完成真实登录
 */
auth.onLoginSuccess(function () {
  setTimeout(function () {
    fullSync();
  }, 0);
});

module.exports = {
  canSync,
  mergeRecords,
  uploadRecord,
  flushQueue,
  pullAndMerge,
  deleteRecord,
  fullSync
};
