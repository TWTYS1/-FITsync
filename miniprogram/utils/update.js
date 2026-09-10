/**
 * 版本更新管理
 *
 * 小程序发布新版后,微信会在合适的时机静默下载。
 * 本模块负责:检测到新版就绪后提示用户重启,避免用户长期停留在旧版本。
 *
 * 注意:该 API 仅在真机生效,开发者工具中会有相应降级提示。
 */

const monitor = require('./monitor');

/**
 * 检查并应用更新
 * 建议在 App.onLaunch 中调用(非正式版可直接返回)
 */
function checkUpdate(options) {
  const opts = options || {};

  if (typeof wx.getUpdateManager !== 'function') {
    // 基础库过低或运行在不支持的环境
    monitor.info('update-unsupported');
    if (opts.silent !== true) {
      // 不做任何打扰,静默跳过即可
    }
    return;
  }

  let updateManager = null;
  try {
    updateManager = wx.getUpdateManager();
  } catch (e) {
    monitor.captureException('update-manager-init', e);
    return;
  }

  updateManager.onCheckForUpdate(function (res) {
    if (res && res.hasUpdate) {
      monitor.info('update-available');
    }
  });

  updateManager.onUpdateReady(function () {
    wx.showModal({
      title: '更新提示',
      content: '新版本已经准备好,是否重启应用?',
      confirmText: '立即重启',
      confirmColor: '#22c55e',
      cancelText: '稍后再说',
      success(res) {
        if (res.confirm) {
          updateManager.applyUpdate();
        }
      }
    });
  });

  updateManager.onUpdateFailed(function () {
    monitor.warn('update-failed');
    // 下载失败不打扰用户,下次启动会重新尝试
  });
}

module.exports = {
  checkUpdate
};
