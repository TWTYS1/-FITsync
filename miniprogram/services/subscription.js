/**
 * 订阅消息
 *
 * 微信规则(务必遵守):
 *   1. 必须由用户「主动点击」触发,不能在 onLaunch / onShow 自动弹出
 *   2. 一次性订阅:用户每授权一次,开发者获得一次下发额度
 *   3. 模板 ID 必须先在小程序后台申请并获得审核通过
 *
 * 最佳触发时机:
 *   训练完成页 —— 此时用户成就感最强,且刚完成一次点击行为,符合「主动触发」规则。
 *   切忌在启动、首页、训练过程中弹出,那既违规又招人烦。
 */

const { callCloud } = require('../utils/request');
const { isCloudEnabled } = require('../utils/config');
const auth = require('./auth');
const monitor = require('../utils/monitor');

/**
 * 订阅消息模板配置
 *
 * TODO:上线前替换为小程序后台申请到的真实模板 ID。
 * 未配置时本模块所有方法自动降级为空操作,
 * 保证开发阶段不会因为「模板 ID 不存在」而报错。
 */
const TEMPLATE_CONFIG = {
  remind: '', // 每日训练提醒
  weekly: '' // 周报总结
};

/**
 * 取出已配置的有效模板 ID
 */
function getValidTemplateIds() {
  return Object.keys(TEMPLATE_CONFIG)
    .map(function (key) {
      return TEMPLATE_CONFIG[key];
    })
    .filter(function (id) {
      return id && String(id).trim().length > 0;
    });
}

/**
 * 当前是否已配置了可用模板
 */
function isConfigured() {
  return getValidTemplateIds().length > 0;
}

/**
 * 向云端登记授权额度
 * 由 dailyRemind 定时任务消费
 */
function registerToCloud(acceptedIds, count) {
  if (!isCloudEnabled() || !auth.isRealUser()) {
    return Promise.resolve(false);
  }

  return callCloud('recordSync', {
    action: 'subscription',
    remindEnabled: true,
    count: count,
    templateIds: acceptedIds
  }, { silent: true })
    .then(function () {
      monitor.info('subscription-registered', { count: count });
      return true;
    })
    .catch(function (err) {
      monitor.info('subscription-register-failed', { code: err && err.code });
      return false;
    });
}

/**
 * 申请训练提醒订阅
 *
 * @param {Object} options
 * @param {Array}  options.tmplIds 指定模板,默认取全部已配置模板
 * @returns {Promise<Array>} 用户接受的模板 ID 列表,永不 reject
 */
function requestSubscribe(options) {
  const opts = options || {};

  return new Promise(function (resolve) {
    const tmplIds = (opts.tmplIds && opts.tmplIds.length)
      ? opts.tmplIds
      : getValidTemplateIds();

    // 未配置模板 → 静默跳过,不打扰开发流程
    if (!tmplIds.length) {
      monitor.info('subscription-skipped', { reason: 'template not configured' });
      resolve([]);
      return;
    }

    if (typeof wx.requestSubscribeMessage !== 'function') {
      monitor.info('subscription-skipped', { reason: 'api unsupported' });
      resolve([]);
      return;
    }

    wx.requestSubscribeMessage({
      tmplIds: tmplIds,
      success(res) {
        const accepted = tmplIds.filter(function (id) {
          return res[id] === 'accept';
        });

        if (accepted.length) {
          registerToCloud(accepted, accepted.length);
        }

        monitor.info('subscription-result', {
          requested: tmplIds.length,
          accepted: accepted.length
        });

        resolve(accepted);
      },
      fail(err) {
        // 用户取消或调用失败都属于正常情况,不算错误
        monitor.info('subscription-declined', { errMsg: err && err.errMsg });
        resolve([]);
      }
    });
  });
}

module.exports = {
  TEMPLATE_CONFIG,
  getValidTemplateIds,
  isConfigured,
  requestSubscribe
};
