/**
 * 组间记登录云函数
 *
 * 云开发优势:可通过 cloud.getWXContext() 直接拿到 OPENID,
 * 无需像传统方案那样用 code + appid + secret 换取 openid,
 * 省掉了 appsecret 管理和 code2session 接口调用。
 *
 * 传入的 code 仅作兼容保留,实际不参与身份换取。
 */

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const DEFAULT_STATS = {
  totalWorkouts: 0,
  totalVolume: 0,
  currentStreak: 0,
  maxStreak: 0
};

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const unionid = wxContext.UNIONID || '';
    const appid = wxContext.APPID || '';

    if (!openid) {
      return { ok: false, code: 'NO_OPENID', message: '无法获取用户身份' };
    }

    const users = db.collection('users');
    const now = Date.now();

    const existing = await users.where({ _openid: openid }).limit(1).get();

    let userId = '';
    let stats = Object.assign({}, DEFAULT_STATS);

    if (existing.data.length > 0) {
      const user = existing.data[0];
      userId = user._id;
      stats = Object.assign({}, DEFAULT_STATS, user.stats || {});

      await users.doc(userId).update({
        data: { lastActiveAt: now }
      });
    } else {
      const added = await users.add({
        data: {
          _openid: openid,
          unionid: unionid,
          appid: appid,
          createdAt: now,
          lastActiveAt: now,
          stats: stats
        }
      });
      userId = added._id;
    }

    return {
      ok: true,
      data: {
        openid: openid,
        unionid: unionid,
        userId: userId,
        stats: stats,
        isNewUser: existing.data.length === 0
      }
    };
  } catch (e) {
    return {
      ok: false,
      code: 'LOGIN_FAILED',
      message: e.message || '登录失败'
    };
  }
};
