/**
 * 登录与用户态管理
 *
 * 设计原则 ——「登录永不失败,永不阻塞」
 *
 *  训练是本产品的第一优先级。任何网络抖动、后端故障、未配置云环境,
 *  都不应该让用户卡在登录环节无法开始训练。
 *
 *  因此 ensureLogin() 永远 resolve:
 *   - 云可用   → 换取真实 openid 用户
 *   - 云不可用 → 降级为本地匿名 guest 用户(依旧有稳定 id)
 *
 *  后续云端就绪时,sync 模块会自动补传本地数据。
 */

const { callCloud } = require('../utils/request');
const { isCloudEnabled } = require('../utils/config');
const monitor = require('../utils/monitor');
const storage = require('../utils/storage');

var loginPromise = null;
var loginSuccessHooks = [];

/**
 * 本地匿名用户
 */
function buildGuestUser() {
  return {
    id: storage.getOrCreateLocalGuestId(),
    openid: '',
    isGuest: true,
    source: 'local'
  };
}

/**
 * 注册「登录成功」回调,供同步模块在数据补传时触发
 * @param {Function} fn 接收 user 对象
 */
function onLoginSuccess(fn) {
  if (typeof fn === 'function') {
    loginSuccessHooks.push(fn);
  }
}

function fireLoginHooks(user) {
  loginSuccessHooks.forEach(function (fn) {
    try {
      fn(user);
    } catch (e) {
      monitor.captureException('login-hook', e);
    }
  });
}

function applyCloudUser(payload) {
  const data = payload || {};
  const user = {
    id: data.openid || data.userId || storage.getOrCreateLocalGuestId(),
    openid: data.openid || '',
    unionid: data.unionid || '',
    isGuest: false,
    source: 'cloud'
  };

  if (data.token) {
    storage.setToken(data.token, data.refreshToken);
  }
  storage.setUserInfo(user);

  return user;
}

/**
 * 走一遍 wx.login + 云函数换取用户身份
 * @returns {Promise<{ok:Boolean, user:Object|null, err:Object|null}>}
 */
function doLogin() {
  return new Promise(function (resolve) {
    if (!isCloudEnabled()) {
      monitor.info('login-skip', { reason: 'cloud disabled' });
      const guest = buildGuestUser();
      storage.setUserInfo(guest);
      resolve({ ok: true, user: guest, guest: true });
      return;
    }

    wx.login({
      success(res) {
        if (!res.code) {
          const guest = buildGuestUser();
          storage.setUserInfo(guest);
          resolve({ ok: true, user: guest, guest: true, err: { message: 'wx.login 未返回 code' } });
          return;
        }

        callCloud('login', { code: res.code }, { silent: true })
          .then(function (data) {
            const user = applyCloudUser(data);
            monitor.info('login-success', { id: user.id });
            fireLoginHooks(user);
            resolve({ ok: true, user: user, guest: false });
          })
          .catch(function (err) {
            monitor.captureException('login-cloud-fail', err);
            const guest = buildGuestUser();
            storage.setUserInfo(guest);
            resolve({ ok: true, user: guest, guest: true, err: err });
          });
      },
      fail(err) {
        monitor.captureException('wx-login-fail', err);
        const guest = buildGuestUser();
        storage.setUserInfo(guest);
        resolve({ ok: true, user: guest, guest: true, err: err });
      }
    });
  });
}

/**
 * 确保已登录(幂等 + 并发去重)
 * 已有有效用户则直接返回,不重复调用 wx.login(避免触发频率限制)
 *
 * @param {Boolean} force 是否强制刷新登录态
 * @returns {Promise<Object>} user,永不 reject
 */
function ensureLogin(force) {
  if (!force) {
    const cached = storage.getUserInfo();
    if (cached && cached.id) {
      return Promise.resolve(cached);
    }
  }

  if (loginPromise) return loginPromise;

  loginPromise = doLogin().then(function (result) {
    loginPromise = null;
    return result.user;
  });

  return loginPromise;
}

/**
 * 同步获取当前用户(可能为 null)
 */
function getCurrentUser() {
  return storage.getUserInfo();
}

/**
 * 当前是否为真实登录用户
 */
function isRealUser() {
  const user = storage.getUserInfo();
  return !!(user && !user.isGuest && user.openid);
}

function logout() {
  storage.clearToken();
  storage.setUserInfo(null);
}

module.exports = {
  ensureLogin,
  getCurrentUser,
  isRealUser,
  onLoginSuccess,
  logout,
  buildGuestUser
};
