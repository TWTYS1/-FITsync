/**
 * 组间记训练记录同步云函数
 *
 * 支持三种操作:
 *   pull   —— 拉取用户全部/增量记录
 *   push   —— 批量上传(基于 recordId 幂等 upsert)
 *   delete —— 按 recordId 删除
 *
 * 幂等设计:
 *   recordId 由客户端生成为 `session-${startedAt}`,天然唯一。
 *   重复上传同一条记录不会产生脏数据,这是「失败重试队列」能够安全工作的前提。
 */

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const PAGE_SIZE = 100;
const MAX_RECORDS = 3000; // 安全阀,防止异常数据拖垮云函数

/**
 * 拉取记录(带分页)
 */
async function pull(openid, since) {
  const coll = db.collection('records');
  const result = [];
  let skip = 0;

  const where = { _openid: openid };
  if (since) {
    where.updatedAt = _.gt(Number(since));
  }

  while (skip < MAX_RECORDS) {
    const res = await coll
      .where(where)
      .orderBy('startedAt', 'desc')
      .skip(skip)
      .limit(PAGE_SIZE)
      .get();

    const list = res.data || [];
    result.push.apply(result, list);

    if (list.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  // 去除 _openid 等服务端字段,只返回客户端需要的数据
  const clean = result.map(function (item) {
    return {
      id: item.recordId,
      recordId: item.recordId,
      exerciseId: item.exerciseId,
      exerciseName: item.exerciseName,
      categoryName: item.categoryName,
      exerciseSource: item.exerciseSource,
      sets: item.sets,
      totalSets: item.totalSets,
      totalVolume: item.totalVolume,
      startedAt: item.startedAt,
      completedAt: item.completedAt,
      updatedAt: item.updatedAt
    };
  });

  return {
    ok: true,
    data: {
      records: clean,
      serverTime: Date.now()
    }
  };
}

/**
 * 批量上传(幂等 upsert)
 */
async function push(openid, records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { ok: true, data: { upserted: 0, skipped: 0 } };
  }

  const coll = db.collection('records');
  const now = Date.now();

  let upserted = 0;
  let skipped = 0;

  // 串行处理,避免并发写入同一文档
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (!record || !record.recordId) {
      skipped++;
      continue;
    }

    const existing = await coll
      .where({ _openid: openid, recordId: record.recordId })
      .limit(1)
      .get();

    const payload = {
      recordId: record.recordId,
      exerciseId: record.exerciseId || '',
      exerciseName: record.exerciseName || '',
      categoryName: record.categoryName || '',
      exerciseSource: record.exerciseSource || 'preset',
      sets: Array.isArray(record.sets) ? record.sets : [],
      totalSets: Number(record.totalSets) || 0,
      totalVolume: Number(record.totalVolume) || 0,
      startedAt: Number(record.startedAt) || now,
      completedAt: Number(record.completedAt) || now,
      updatedAt: now
    };

    if (existing.data.length > 0) {
      // 已存在:只有当本地数据更新时才覆盖,防止旧数据回滚新数据
      const remote = existing.data[0];
      if (Number(record.completedAt) > Number(remote.completedAt || 0)) {
        await coll.doc(remote._id).update({ data: payload });
        upserted++;
      } else {
        skipped++;
      }
    } else {
      await coll.add({
        data: Object.assign({ _openid: openid, createdAt: now }, payload)
      });
      upserted++;
    }
  }

  // 同步刷新用户汇总统计
  await refreshUserStats(openid);

  return {
    ok: true,
    data: { upserted: upserted, skipped: skipped }
  };
}

/**
 * 删除记录
 */
async function remove(openid, recordId) {
  if (!recordId) {
    return { ok: false, code: 'NO_RECORD_ID', message: '缺少 recordId' };
  }

  const coll = db.collection('records');
  const existing = await coll
    .where({ _openid: openid, recordId: recordId })
    .limit(1)
    .get();

  if (existing.data.length === 0) {
    return { ok: true, data: { deleted: 0 } };
  }

  await coll.doc(existing.data[0]._id).remove();
  await refreshUserStats(openid);

  return { ok: true, data: { deleted: 1 } };
}

/**
 * 登记订阅消息授权
 *
 * 一次性订阅消息的特点:用户每次授权可换取若干次下发额度。
 * 客户端授权成功后调用本方法累加额度,供 dailyRemind 定时任务消费。
 */
async function saveSubscription(openid, event) {
  const coll = db.collection('subscriptions');
  const now = Date.now();
  const addCount = Number(event.count) || 0;

  const existing = await coll.where({ _openid: openid }).limit(1).get();

  if (existing.data.length > 0) {
    await coll.doc(existing.data[0]._id).update({
      data: {
        remindEnabled: event.remindEnabled !== false,
        remindCount: _.inc(addCount),
        templateIds: event.templateIds || [],
        updatedAt: now
      }
    });
  } else {
    await coll.add({
      data: {
        _openid: openid,
        remindEnabled: event.remindEnabled !== false,
        remindCount: addCount,
        templateIds: event.templateIds || [],
        createdAt: now,
        updatedAt: now
      }
    });
  }

  return { ok: true, data: { registered: true } };
}

/**
 * 批量写入埋点事件
 *
 * 埋点数据量大但价值高,单独存放在 analytics 集合,
 * 避免与 records 业务数据互相拖累查询性能。
 */
async function saveAnalytics(openid, events) {
  if (!Array.isArray(events) || events.length === 0) {
    return { ok: true, data: { saved: 0 } };
  }

  const coll = db.collection('analytics');
  const now = Date.now();

  const docs = events.slice(0, 100).map(function (item) {
    return {
      _openid: openid,
      event: item.event || '',
      props: item.props || {},
      ts: Number(item.ts) || now,
      env: item.env || '',
      createdAt: now
    };
  });

  try {
    await Promise.all(docs.map(function (doc) {
      return coll.add({ data: doc });
    }));
    return { ok: true, data: { saved: docs.length } };
  } catch (e) {
    return { ok: true, data: { saved: 0, error: e.message } };
  }
}

/**
 * 重算用户汇总数据
 */
async function refreshUserStats(openid) {
  try {
    const users = db.collection('users');
    const records = db.collection('records');

    const userRes = await users.where({ _openid: openid }).limit(1).get();
    if (userRes.data.length === 0) return;

    const all = await records.where({ _openid: openid }).limit(MAX_RECORDS).get();
    const list = all.data || [];

    const totalWorkouts = list.length;
    const totalVolume = list.reduce(function (sum, item) {
      return sum + (Number(item.totalVolume) || 0);
    }, 0);

    // 计算连续训练天数
    const daySet = {};
    list.forEach(function (item) {
      const ts = Number(item.startedAt) || item.completedAt;
      if (!ts) return;
      const d = new Date(ts);
      const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      daySet[key] = true;
    });

    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 730; i++) {
      const key = cursor.getFullYear() + '-' + (cursor.getMonth() + 1) + '-' + cursor.getDate();
      if (daySet[key]) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        // 今天还没训练不算断签,从昨天继续计算
        if (i === 0) {
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
        break;
      }
    }

    const userId = userRes.data[0]._id;
    const prevStats = userRes.data[0].stats || {};
    const maxStreak = Math.max(Number(prevStats.maxStreak) || 0, streak);

    await users.doc(userId).update({
      data: {
        'stats.totalWorkouts': totalWorkouts,
        'stats.totalVolume': totalVolume,
        'stats.currentStreak': streak,
        'stats.maxStreak': maxStreak
      }
    });
  } catch (e) {
    // 统计刷新失败不应影响主流程
    console.error('refreshUserStats failed:', e);
  }
}

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { ok: false, code: 'NO_OPENID', message: '无法获取用户身份' };
    }

    const action = event.action || 'pull';

    if (action === 'pull') {
      return await pull(openid, event.since);
    }

    if (action === 'push') {
      return await push(openid, event.records);
    }

    if (action === 'delete') {
      return await remove(openid, event.recordId);
    }

    if (action === 'subscription') {
      return await saveSubscription(openid, event);
    }

    if (action === 'analytics') {
      return await saveAnalytics(openid, event.events);
    }

    return { ok: false, code: 'UNKNOWN_ACTION', message: '未知操作:' + action };
  } catch (e) {
    return {
      ok: false,
      code: 'SYNC_FAILED',
      message: e.message || '同步失败'
    };
  }
};
