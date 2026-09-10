/**
 * 分享配置生成
 *
 * 分享是微信生态 ROI 最高的获客通道。
 * 本模块把「话术」集中管理,避免各个页面各写一套、口径不一致。
 *
 * 设计原则:
 *   - 成果型分享(带具体成绩)远优于入口型分享(干巴巴的卡片)
 *   - path 统一带 utm 参数,为后续渠道归因留好数据基础
 */

/**
 * 通用:首页分享
 */
function buildHomeShare(extraQuery) {
  return {
    title: '组间记 — 一次点击完成训练记录',
    path: '/pages/home/home' + buildQuery({ from: 'share' }, extraQuery)
  };
}

/**
 * 训练成果分享 —— 最强的拉新素材
 *
 * @param {Object} record 训练记录
 */
function buildTrainingShare(record) {
  if (!record) return buildHomeShare();

  const name = record.exerciseName || '训练';
  const sets = record.totalSets || 0;
  const volume = roundNumber(record.totalVolume || 0);

  let title;
  if (record.isWeightPr) {
    title = '刚刚' + name + '破个人纪录了,冲!';
  } else if (volume > 0) {
    title = '今天' + name + ' ' + sets + '组,总容量 ' + volume + 'kg';
  } else {
    title = '今天完成了' + name + ' ' + sets + '组训练';
  }

  return {
    title: title,
    path: '/pages/home/home' + buildQuery({
      from: 'share',
      scene: 'training',
      sid: record.id || ''
    })
  };
}

/**
 * 每日总结分享
 *
 * @param {Object} summary buildDailySummary 的产物
 */
function buildDailySummaryShare(summary) {
  if (!summary || !summary.records || summary.records.length === 0) {
    return buildHomeShare();
  }

  const count = summary.exerciseCount || 0;
  const volume = roundNumber(summary.totalVolume || 0);
  const maxWeight = roundNumber(summary.maxWeight || 0);

  let title;
  if (summary.hasWeightPr && maxWeight > 0) {
    title = '今天破纪录了!最大重量 ' + maxWeight + 'kg';
  } else if (volume > 0) {
    title = '今日打卡 · ' + count + '个动作 · 总容量 ' + volume + 'kg';
  } else {
    title = '今日打卡 · 完成 ' + count + '个动作';
  }

  return {
    title: title,
    path: '/pages/home/home' + buildQuery({
      from: 'share',
      scene: 'summary',
      d: summary.dateKey || ''
    })
  };
}

/**
 * 历史记录页分享
 */
function buildRecordsShare() {
  return {
    title: '我的力量训练记录都在「组间记」',
    path: '/pages/home/home' + buildQuery({ from: 'share', scene: 'records' })
  };
}

/**
 * 朋友圈分享(仅返回标题与 query)
 */
function buildTimelineSummary(summary) {
  const base = buildDailySummaryShare(summary);
  const queryIndex = base.path.indexOf('?');
  return {
    title: base.title,
    query: queryIndex > -1 ? base.path.slice(queryIndex + 1) : ''
  };
}

/* ============ 内部工具 ============ */

/**
 * 拼接 query string,自动忽略空值
 */
function buildQuery(baseParams, extraQuery) {
  const params = Object.assign({}, baseParams, extraQuery || {});
  const parts = Object.keys(params).filter(function (key) {
    const value = params[key];
    return value !== undefined && value !== null && value !== '';
  }).map(function (key) {
    return key + '=' + encodeURIComponent(params[key]);
  });

  return parts.length ? '?' + parts.join('&') : '';
}

function roundNumber(value) {
  return Math.round(Number(value) || 0);
}

module.exports = {
  buildHomeShare,
  buildTrainingShare,
  buildDailySummaryShare,
  buildRecordsShare,
  buildTimelineSummary,
  buildQuery
};
