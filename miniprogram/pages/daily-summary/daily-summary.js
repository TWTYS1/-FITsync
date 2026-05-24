const { getRecords } = require('../../utils/storage');
const { buildDailySummary, buildRecordDays } = require('../../utils/dailySummary');

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
      maxWeight: 0,
      hasWeightPr: false,
      featuredExercises: [],
      hasMoreFeaturedExercises: false,
      historyGrid28Days: []
    },
    hasRecords: false,
    focusText: 'REST DAY',
    dayNumberText: '000',
    summaryMaxWeightLabel: '0kg',
    featuredExercises: [],
    hasMoreFeaturedExercises: false,
    detailRows: []
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

    const featuredExercises = (summary.featuredExercises || []).map(function (ex) {
      return {
        name: ex.name,
        categoryName: ex.categoryName,
        sets: ex.sets,
        volume: ex.volume,
        maxWeight: ex.maxWeight,
        maxWeightLabel: formatWeightLabel(ex.maxWeight),
        isWeightPr: ex.isWeightPr
      };
    });

    var detailRows = [];
    if (hasRecords) {
      var recordDays = buildRecordDays(records);
      var todayDay = recordDays.find(function (day) { return day.dateKey === summary.dateKey; });
      if (todayDay && todayDay.exerciseRows) {
        detailRows = todayDay.exerciseRows.map(function (row) {
          return {
            exerciseName: row.exerciseName,
            categoryName: row.categoryName,
            sets: row.sets,
            volume: row.volume,
            maxWeight: row.maxWeight,
            maxWeightLabel: formatWeightLabel(row.maxWeight),
            isWeightPr: row.isWeightPr
          };
        });
      }
    }

    this.setData({
      dateParam: dateParam || summary.dateKey,
      summary,
      hasRecords,
      focusText: summary.categoryNames.length ? summary.categoryNames.join(' / ') : 'REST DAY',
      dayNumberText: String(summary.dayNumber || 0).padStart(3, '0'),
      summaryMaxWeightLabel: formatWeightLabel(summary.maxWeight),
      featuredExercises: featuredExercises,
      hasMoreFeaturedExercises: !!summary.hasMoreFeaturedExercises,
      detailRows: detailRows
    });
  },

  parseDateParam(dateParam) {
    if (!dateParam) return Date.now();
    const parts = String(dateParam).split('-').map(function (part) { return Number(part); });
    if (parts.length !== 3 || parts.some(function (part) { return !part; })) return Date.now();
    return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
  },

  onBack() {
    wx.navigateBack({
      fail: function () {
        wx.switchTab({ url: '/pages/training/training' });
      }
    });
  }
});

function formatWeightLabel(value) {
  var numeric = Number(value) || 0;
  var rounded = Math.round(numeric * 100) / 100;
  var text = rounded.toFixed(2).replace(/\.?0+$/, '');
  return text + 'kg';
}
