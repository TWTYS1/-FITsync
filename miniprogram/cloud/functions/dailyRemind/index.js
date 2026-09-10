/**
 * 组间记每日训练提醒(定时触发)
 *
 * 触发时间:每天 20:00(见 config.json 的 cron 配置)
 *
 * 逻辑:
 *   1. 取出所有开启了「每日提醒」的用户
 *   2. 检查该用户今天是否已有训练记录 —— 已训练则跳过
 *   3. 检查是否还有剩余订阅授权次数(一次性订阅,发一次消耗一次)
 *   4. 发送订阅消息并扣减次数
 */

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// TODO:替换为你在小程序后台申请到的模板 ID
const REMIND_TEMPLATE_ID = process.env.REMIND_TEMPLATE_ID || 'TODO_REPLACE_WITH_YOUR_TEMPLATE_ID';

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

exports.main = async () => {
  if (!REMIND_TEMPLATE_ID || REMIND_TEMPLATE_ID.indexOf('TODO') === 0) {
    console.warn('未配置订阅消息模板 ID,跳过本次提醒');
    return { ok: true, data: { sent: 0, reason: 'template not configured' } };
  }

  const todayStart = startOfToday();
  let sent = 0;
  let skipped = 0;

  try {
    const subsRes = await db
      .collection('subscriptions')
      .where({ remindEnabled: true })
      .limit(100)
      .get();

    const subs = subsRes.data || [];

    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i];
      const openid = sub._openid;

      if (!openid) continue;

      // 剩余授权次数
      if (!sub.remindCount || sub.remindCount <= 0) {
        skipped++;
        continue;
      }

      // 今日是否已训练
      const recordRes = await db
        .collection('records')
        .where({ _openid: openid, startedAt: _.gte(todayStart) })
        .limit(1)
        .get();

      if (recordRes.data.length > 0) {
        skipped++;
        continue;
      }

      try {
        await cloud.openapi.subscribeMessage.send({
          touser: openid,
          templateId: REMIND_TEMPLATE_ID,
          page: 'pages/home/home',
          lang: 'zh_CN',
          miniprogramState: 'formal',
          data: {
            // 字段名需与你申请的模板实际字段一致
            thing1: { value: '今日训练提醒' },
            thing2: { value: '今天还没记录训练,来一组?' }
          }
        });

        await db.collection('subscriptions').doc(sub._id).update({
          data: { remindCount: _.inc(-1) }
        });

        sent++;
      } catch (e) {
        console.error('send failed for ' + openid + ':', e);
        skipped++;
      }
    }

    return { ok: true, data: { sent: sent, skipped: skipped } };
  } catch (e) {
    return { ok: false, code: 'REMIND_FAILED', message: e.message || '提醒任务失败' };
  }
};
