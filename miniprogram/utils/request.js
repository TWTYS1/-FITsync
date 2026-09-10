/**
 * 统一请求层
 *
 * 提供两种调用方式:
 *  1. callCloud()  —— 调用微信云函数(当前推荐,免域名白名单)
 *  2. request()    —— HTTP 请求(为后续迁移自建后端预留)
 *
 * 设计约定:
 *  - 全部 Promise 化,避免回调地狱
 *  - 云能力未启用时返回 reject({ code: 'CLOUD_DISABLED' }),由调用方决定降级策略
 *  - 绝不因为请求失败而阻塞训练主流程
 */

const { getConfig, isCloudEnabled } = require('./config');

/**
 * 云函数返回体的统一约定
 *   { ok: true,  data: {...} }
 *   { ok: false, code: 'XXX', message: '...' }
 */

function callCloud(name, data, options) {
  const opts = options || {};
  const timeout = opts.timeout || getConfig().requestTimeout;

  return new Promise((resolve, reject) => {
    if (!isCloudEnabled()) {
      reject({ code: 'CLOUD_DISABLED', message: '云能力未启用,已降级为本地模式' });
      return;
    }

    if (typeof wx.cloud === 'undefined' || !wx.cloud.callFunction) {
      reject({ code: 'CLOUD_NOT_INIT', message: '云开发尚未初始化' });
      return;
    }

    let settled = false;

    // 超时兜底:云函数调用无原生 timeout 参数,超时后主动放弃(幂等设计保证下次可重传)
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject({ code: 'TIMEOUT', message: '云函数调用超时(' + timeout + 'ms)' });
    }, timeout);

    wx.cloud.callFunction({
      name: name,
      data: data || {},
      success(res) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        const result = res && res.result;

        if (!result) {
          reject({ code: 'EMPTY_RESULT', message: '云函数返回为空' });
          return;
        }

        if (result.ok === false) {
          reject({
            code: result.code || 'BIZ_ERROR',
            message: result.message || '业务处理失败'
          });
          return;
        }

        resolve(result.data !== undefined ? result.data : result);
      },
      fail(err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject({
          code: 'CLOUD_FAIL',
          message: (err && err.errMsg) || '云函数调用失败',
          detail: err
        });
      }
    });
  });
}

/**
 * HTTP 请求(预留给自建后端)
 *
 * @param {Object} params
 * @param {String} params.url      相对路径
 * @param {String} params.method   GET / POST / PUT / DELETE
 * @param {Object} params.data     请求体
 * @param {Boolean} params.needAuth 是否携带 token
 * @param {Boolean} params.silent  失败时不弹 toast
 */
function request(params) {
  const base = getConfig().apiBase || '';
  const method = (params.method || 'GET').toUpperCase();
  const needAuth = params.needAuth !== false;
  const silent = !!params.silent;

  const header = Object.assign(
    { 'Content-Type': 'application/json' },
    params.header || {}
  );

  if (needAuth) {
    const token = wx.getStorageSync('access_token');
    if (token) header['Authorization'] = 'Bearer ' + token;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: base + params.url,
      method: method,
      data: params.data || {},
      header: header,
      timeout: getConfig().requestTimeout,
      success(res) {
        const status = res.statusCode;

        if (status === 401) {
          wx.removeStorageSync('access_token');
          reject({ code: 401, message: '登录态已失效' });
          return;
        }

        if (status >= 200 && status < 300) {
          const body = res.data || {};
          if (body.ok === false) {
            reject({ code: body.code || 'BIZ_ERROR', message: body.message || '请求失败' });
            return;
          }
          resolve(body.data !== undefined ? body.data : body);
          return;
        }

        if (!silent) {
          wx.showToast({
            title: (res.data && res.data.message) || '请求失败',
            icon: 'none'
          });
        }
        reject({ code: status, message: 'HTTP ' + status });
      },
      fail(err) {
        if (!silent) {
          wx.showToast({ title: '网络异常,请稍后重试', icon: 'none' });
        }
        reject({ code: -1, message: 'network error', detail: err });
      }
    });
  });
}

module.exports = {
  callCloud,
  request
};
