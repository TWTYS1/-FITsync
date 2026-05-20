const { clearSession, getSession, getTodayRecords } = require('../../utils/storage');

Page({
  data: {
    todayCount: 0,
    todayVolume: 0,
    activeSession: null
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const todayRecords = getTodayRecords();
    const todayCount = todayRecords.length;
    const todayVolume = todayRecords.reduce((sum, r) => sum + (r.totalVolume || 0), 0);
    const activeSession = getSession();

    this.setData({
      todayCount,
      todayVolume,
      activeSession
    });
  },

  onStartTraining() {
    if (this.data.activeSession) {
      wx.showModal({
        title: '开始新的训练？',
        content: '当前未完成的训练会被放弃，已完成的历史记录不会受影响。',
        confirmText: '新训练',
        confirmColor: '#22c55e',
        success: (res) => {
          if (res.confirm) {
            this.startFreshTraining();
          }
        }
      });
      return;
    }

    this.startFreshTraining();
  },

  startFreshTraining() {
    const app = getApp();
    clearSession();
    app.globalData.trainingEntryMode = 'new';
    wx.switchTab({ url: '/pages/training/training' });
  },

  onContinueTraining() {
    const app = getApp();
    app.globalData.trainingEntryMode = 'continue';
    wx.switchTab({ url: '/pages/training/training' });
  }
});
