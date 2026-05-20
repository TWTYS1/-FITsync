App({
  onLaunch() {
    // Initialize storage with defaults if empty
    const records = wx.getStorageSync('training_records');
    if (!records) {
      wx.setStorageSync('training_records', []);
    }
  },

  globalData: {
    trainingEntryMode: ''
  }
});
