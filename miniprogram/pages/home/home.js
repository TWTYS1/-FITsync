const { clearSession, getSession, getTodayRecords } = require('../../utils/storage');
const share = require('../../services/share');
const analytics = require('../../services/analytics');

Page({
  data: {
    todayCount: 0,
    todayVolume: 0,
    activeSession: null
  },

  // 协议引导在当前页面生命周期内只提示一次,避免用户返回后反复弹出
  agreementPrompted: false,

  onLoad(options) {
    analytics.track(analytics.EVENTS.HOME_VIEW, {
      from: (options && options.from) || 'direct',
      scene: (options && options.scene) || ''
    });

    // 冷启动静默对齐一次云端数据
    this.syncOnce();
  },

  onShow() {
    this.checkAgreement();
    this.refresh();
  },

  /**
   * 首次启动未同意协议 → 引导至协议页
   * 放在 onShow 而非 onLaunch 执行,确保页面栈已就绪可以跳转
   */
  checkAgreement() {
    if (this.agreementPrompted) return;

    const app = getApp();
    if (!app || app.isAgreementAccepted()) return;

    this.agreementPrompted = true;
    wx.navigateTo({ url: '/pages/agreement/agreement?from=launch' });
  },

  /**
   * 静默同步:拉取云端记录并合并
   * 懒加载 sync 模块,减少首屏依赖链
   */
  syncOnce() {
    try {
      const sync = require('../../services/sync');
      sync.fullSync();
    } catch (e) {
      // 同步失败绝不影响页面展示
    }
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
    analytics.track(analytics.EVENTS.TRAINING_START, { mode: 'new' });
    wx.switchTab({ url: '/pages/training/training' });
  },

  onContinueTraining() {
    const app = getApp();
    app.globalData.trainingEntryMode = 'continue';
    analytics.track(analytics.EVENTS.TRAINING_START, { mode: 'continue' });
    wx.switchTab({ url: '/pages/training/training' });
  },

  /* ============ 分享 ============ */

  onShareAppMessage() {
    return share.buildHomeShare();
  },

  onShareTimeline() {
    return {
      title: '组间记 — 一次点击完成训练记录',
      query: 'from=timeline'
    };
  }
});
