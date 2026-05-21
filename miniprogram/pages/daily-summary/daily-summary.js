const { getRecords } = require('../../utils/storage');
const { buildDailySummary } = require('../../utils/dailySummary');

Page({
  data: {
    summary: {
      dateKey: '',
      date: '',
      weekday: '',
      dayNumber: 0,
      records: [],
      exerciseCount: 0,
      categoryNames: [],
      totalSets: 0,
      totalVolume: 0,
      totalDurationMinutes: 0,
      historyGrid28Days: []
    },
    hasRecords: false,
    focusText: 'REST DAY',
    dayNumberText: '000',
    recordRows: []
  },

  onLoad(options) {
    this.refresh(options && options.date);
  },

  onShow() {
    if (this.data.dateParam) {
      this.refresh(this.data.dateParam);
    }
  },

  refresh(dateParam) {
    const targetDate = this.parseDateParam(dateParam);
    const records = getRecords();
    const summary = buildDailySummary(records, targetDate);
    const hasRecords = summary.records.length > 0;

    this.setData({
      dateParam: dateParam || summary.dateKey,
      summary,
      hasRecords,
      focusText: summary.categoryNames.length ? summary.categoryNames.join(' / ') : 'REST DAY',
      dayNumberText: String(summary.dayNumber || 0).padStart(3, '0'),
      recordRows: summary.records.map((record) => ({
        id: record.id,
        name: record.exerciseName,
        category: record.categoryName,
        sets: this.getFormalSetCount(record),
        volume: this.getRecordVolume(record)
      }))
    });
  },

  parseDateParam(dateParam) {
    if (!dateParam) return Date.now();
    const parts = String(dateParam).split('-').map((part) => Number(part));
    if (parts.length !== 3 || parts.some((part) => !part)) return Date.now();
    return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
  },

  getFormalSetCount(record) {
    return (record.sets || []).filter((set) => !set.isWarmup).length;
  },

  getRecordVolume(record) {
    return (record.sets || []).filter((set) => !set.isWarmup).reduce((sum, set) => {
      return sum + (Number(set.weight) || 0) * (Number(set.reps) || 0);
    }, 0);
  },

  onBack() {
    wx.navigateBack({
      fail() {
        wx.switchTab({ url: '/pages/training/training' });
      }
    });
  }
});
