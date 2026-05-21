const { getRecords } = require('../../utils/storage');

Page({
  data: {
    records: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const records = getRecords();
    this.setData({
      records: records.map((r) => ({
        ...r,
        duration: r.startedAt && r.completedAt
          ? Math.round((r.completedAt - r.startedAt) / 60000)
          : 0,
        dateStr: this.formatDate(r.startedAt),
        timeStr: this.formatTime(r.startedAt),
        sourceLabel: r.exerciseSource === 'custom' ? '自定义' : '',
        sets: (r.sets || []).map((s) => ({
          ...s,
          setLabel: s.isWarmup ? '热身组' : `第 ${s.formalSetNumber || s.setNumber} 组`
        }))
      }))
    });
  },

  formatDate(ts) {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const ds = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const ts2 = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const ys = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;

    if (ds === ts2) return '今天';
    if (ds === ys) return '昨天';
    return `${d.getMonth() + 1}/${d.getDate()}`;
  },

  formatTime(ts) {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
});
