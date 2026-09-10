/**
 * 组间记运行环境配置
 *
 * 自动识别微信运行环境(开发版 / 体验版 / 正式版),返回对应配置。
 *
 * 关键设计:云环境 ID 未填写时自动降级为「纯本地模式」。
 * 这样即使后端尚未就绪,训练主流程依然完整可用,不会因为缺少后端而白屏或报错。
 */

const CONFIG = {
  develop: {
    // TODO:填入你的云开发环境 ID,留空则自动降级为纯本地模式
    cloudEnv: '',
    enableLog: true,
    enableAnalytics: false,
    requestTimeout: 10000
  },
  trial: {
    cloudEnv: '',
    enableLog: true,
    enableAnalytics: true,
    requestTimeout: 10000
  },
  release: {
    cloudEnv: '',
    enableLog: false,
    enableAnalytics: true,
    requestTimeout: 8000
  }
};

var cachedConfig = null;

/**
 * 读取当前微信运行环境
 * @returns {'develop'|'trial'|'release'}
 */
function getCurrentEnvKey() {
  try {
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion;
    if (envVersion === 'develop' || envVersion === 'trial') {
      return envVersion;
    }
    return 'release';
  } catch (e) {
    return 'release';
  }
}

/**
 * 获取当前环境配置(带缓存)
 */
function getConfig() {
  if (cachedConfig) return cachedConfig;

  const envKey = getCurrentEnvKey();
  const preset = CONFIG[envKey] || CONFIG.release;
  const cloudEnv = String(preset.cloudEnv || '').trim();

  cachedConfig = Object.assign({}, preset, {
    env: envKey,
    cloudEnv: cloudEnv,
    // 未配置云环境 ID 时自动关闭云能力,保证纯本地可用
    enableCloud: !!cloudEnv
  });

  return cachedConfig;
}

/**
 * 云能力是否可用
 */
function isCloudEnabled() {
  return getConfig().enableCloud;
}

/**
 * 小程序版本号
 */
function getAppVersion() {
  try {
    const info = wx.getAccountInfoSync();
    return (info.miniProgram && info.miniProgram.version) || '0.0.0';
  } catch (e) {
    return '0.0.0';
  }
}

module.exports = {
  getConfig,
  isCloudEnabled,
  getCurrentEnvKey,
  getAppVersion
};
