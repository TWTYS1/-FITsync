/**
 * 组间记(曾用名 FitSync)小程序入口
 *
 * 启动链路严格遵守「核心优先」原则:
 *   本地数据 → 监控/网络/版本 → 云初始化(可失败) → 静默登录(异步不阻塞)
 *
 * 任何一步失败都不应该让用户无法开始训练。
 */

const monitor = require('./utils/monitor');
const network = require('./utils/network');
const update = require('./utils/update');
const storage = require('./utils/storage');
const auth = require('./services/auth');
const analytics = require('./services/analytics');
const { getConfig, isCloudEnabled } = require('./utils/config');

App({
  globalData: {
    // 原有:训练入口模式(new / continue),由 home.js 写入、training.js 消费
    trainingEntryMode: '',

    // 上线基建新增
    agreementAccepted: false,
    cloudReady: false,
    userId: ''
  },

  onLaunch() {
    // 1. 本地数据兜底初始化
    const records = wx.getStorageSync('training_records');
    if (!records) {
      wx.setStorageSync('training_records', []);
    }

    // 2. 工程基建:监控 / 网络 / 版本更新
    monitor.init();
    network.init();
    update.checkUpdate({ silent: true });

    // 3. 隐私协议状态
    this.globalData.agreementAccepted = storage.isAgreementAccepted();

    analytics.track(analytics.EVENTS.APP_LAUNCH, {
      env: getConfig().env
    });

    // 4. 云开发初始化(失败降级为纯本地模式,不影响使用)
    this.initCloud();

    // 5. 静默登录:异步进行,绝不阻塞首屏
    const app = this;
    auth.ensureLogin().then(function (user) {
      app.globalData.userId = (user && user.id) || '';
    });
  },

  /**
   * 初始化微信云开发
   */
  initCloud() {
    if (!isCloudEnabled()) {
      monitor.info('cloud-disabled', { reason: 'cloudEnv 未配置' });
      this.globalData.cloudReady = false;
      return;
    }

    try {
      const cfg = getConfig();
      wx.cloud.init({
        env: cfg.cloudEnv,
        traceUser: true
      });
      this.globalData.cloudReady = true;
      monitor.info('cloud-init-success', { env: cfg.cloudEnv });
    } catch (e) {
      monitor.captureException('cloud-init-fail', e);
      this.globalData.cloudReady = false;
    }
  },

  /**
   * 首次启动是否需要引导至协议页
   * 由首页 onShow 调用,避免在 onLaunch 阶段跳转页面失败
   */
  isAgreementAccepted() {
    return storage.isAgreementAccepted();
  },

  markAgreementAccepted() {
    this.globalData.agreementAccepted = true;
  },

  /**
   * 小程序切后台:上报积压的埋点数据
   */
  onHide() {
    analytics.flush();
  },

  /* ============ 全局异常钩子 ============ */

  onError: monitor.onError,
  onUnhandledRejection: monitor.onUnhandledRejection,
  onPageNotFound: monitor.onPageNotFound
});
