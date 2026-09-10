const { getRecords } = require('../../utils/storage');
const { buildDailySummary, buildRecordDays } = require('../../utils/dailySummary');
const share = require('../../services/share');

Page({
  data: {
    recordDays: [],
    todaySummary: null,
    hasTodaySummary: false,
    expandedDateKey: ''
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const records = getRecords();
    const todaySummary = buildDailySummary(records, Date.now());
    const recordDays = buildRecordDays(records);
    this.setData({
      todaySummary,
      hasTodaySummary: todaySummary.records.length > 0,
      recordDays: recordDays.map(function (day) {
        return Object.assign({}, day, {
          dateLabel: formatDateLabel(day.dateKey)
        });
      })
    });
  },

  onOpenTodaySummary() {
    if (!this.data.hasTodaySummary) return;
    wx.navigateTo({
      url: '/pages/daily-summary/daily-summary?date=' + this.data.todaySummary.dateKey
    });
  },

  onToggleDay(e) {
    var dateKey = e.currentTarget.dataset.datekey;
    this.setData({
      expandedDateKey: this.data.expandedDateKey === dateKey ? '' : dateKey
    });
  },

  /* ============ 分享 ============ */

  onShareAppMessage() {
    return share.buildRecordsShare();
  },

  onShareTimeline() {
    return {
      title: '我的力量训练记录都在「组间记」',
      query: 'from=timeline&scene=records'
    };
  }
});

function formatDateLabel(dateKey) {
  var today = new Date();
  var todayKey = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  var yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayKey = yesterday.getFullYear() + '-' +
    String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
    String(yesterday.getDate()).padStart(2, '0');

  if (dateKey === todayKey) return '今天';
  if (dateKey === yesterdayKey) return '昨天';
  var parts = dateKey.split('-');
  return Number(parts[1]) + '/' + Number(parts[2]);
}
