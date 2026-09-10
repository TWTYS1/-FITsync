/**
 * 网络状态管理
 *
 * 健身房常弱网/断网,核心训练流程必须保证离线可用。
 * 本模块只负责「感知」网络状态,不阻断任何业务操作。
 *
 * 用法:
 *   const network = require('./utils/network');
 *   network.init();                 // app.js 启动时调用一次
 *   if (network.isOnline()) { ... } // 需要时查询
 *   network.onChange(cb);           // 订阅变化
 */

const monitor = require('./monitor');

var state = {
  online: true,      // 保守默认为在线,避免误判导致功能不可用
  networkType: 'unknown'
};

var listeners = [];

/**
 * 初始化并监听网络变化
 */
function init() {
  refresh();

  if (typeof wx.onNetworkStatusChange === 'function') {
    wx.onNetworkStatusChange(function (res) {
      const online = !!res.isConnected;
      const networkType = res.networkType || 'unknown';

      if (online !== state.online || networkType !== state.networkType) {
        monitor.info('network-change', { online: online, networkType: networkType });
      }

      state.online = online;
      state.networkType = networkType;
      emit();
    });
  }

  return state;
}

/**
 * 主动拉取一次网络状态
 */
function refresh() {
  if (typeof wx.getNetworkType !== 'function') return state;

  wx.getNetworkType({
    success(res) {
      const networkType = res.networkType || 'unknown';
      state.networkType = networkType;
      state.online = networkType !== 'none';
      emit();
    },
    fail() {
      // 获取失败时保持原状态,不改变用户可用性预期
    }
  });

  return state;
}

function emit() {
  const snapshot = getStatus();
  listeners.forEach(function (fn) {
    try {
      fn(snapshot);
    } catch (e) {
      // 单个订阅者异常不能影响其他订阅者
    }
  });
}

/**
 * 当前是否在线
 */
function isOnline() {
  return state.online;
}

/**
 * 网络类型:wifi / 4g / 5g / none / unknown
 */
function getNetworkType() {
  return state.networkType;
}

/**
 * 完整状态快照
 */
function getStatus() {
  return {
    online: state.online,
    networkType: state.networkType
  };
}

/**
 * 订阅网络变化
 * @param {Function} fn 回调,接收 { online, networkType }
 */
function onChange(fn) {
  if (typeof fn !== 'function') return;
  listeners.push(fn);
}

/**
 * 取消订阅
 */
function offChange(fn) {
  listeners = listeners.filter(function (item) {
    return item !== fn;
  });
}

module.exports = {
  init,
  refresh,
  isOnline,
  getNetworkType,
  getStatus,
  onChange,
  offChange
};
