/**
 * 隐私政策 / 用户协议页
 *
 * 两种进入方式:
 *  1. 菜单直接查看   /pages/agreement/agreement
 *  2. 首次启动确认   /pages/agreement/agreement?from=launch
 *
 * 内容采用数据驱动(sections 数组),便于后续法务修订时只改数据不改结构。
 */

var UPDATED_AT = '2026-09-08';
var CONTACT = 'fitsync@example.com';

var PRIVACY_SECTIONS = [
  {
    title: '一、我们收集哪些信息',
    paragraphs: [
      '为了向您提供训练记录服务,组间记 仅会在必要范围内收集信息:',
      '1. 微信身份标识:您登录时我们会获取微信 openid,用于区分不同用户的数据归属。我们不会获取您的微信昵称、头像,除非您主动授权。',
      '2. 训练数据:您主动录入的动作名称、重量、次数、组数、训练时间等。',
      '3. 设备与日志信息:小程序崩溃日志、基础库版本、机型。这类信息用于排查故障,不包含您的训练内容。',
      '我们郑重承诺:组间记 不申请地理位置、通讯录、相册、麦克风、摄像头等任何敏感权限。'
    ]
  },
  {
    title: '二、我们如何使用信息',
    paragraphs: [
      '1. 为您提供训练记录、历史查询、数据统计等核心功能。',
      '2. 在您换设备或重装微信后恢复您的训练历史。',
      '3. 经您明确授权后,向您发送训练提醒(微信订阅消息)。您可以随时在小程序设置中关闭。',
      '4. 用于排查崩溃、优化性能。',
      '我们不会将您的信息用于任何广告推荐或营销用途。'
    ]
  },
  {
    title: '三、信息的存储与安全',
    paragraphs: [
      '您的训练数据储存在微信云开发(腾讯云)服务器中,传输过程全程 HTTPS 加密。',
      '同时,为保障您在健身房弱网环境下的使用体验,数据会在您本机保留一份缓存。您可以随时在「记录」页清除本地数据。',
      '我们承诺不会将您的数据存储在境外服务器。'
    ]
  },
  {
    title: '四、信息的共享、转让与公开披露',
    paragraphs: [
      '我们不会向任何第三方出售或出租您的个人信息。',
      '仅在下述情形下我们可能披露信息:获得您的明确同意;或根据法律法规、司法机关的强制性要求。'
    ]
  },
  {
    title: '五、您的权利',
    paragraphs: [
      '1. 访问与更正:您可在小程序内随时查看和修改您的训练记录。',
      '2. 删除:您可在「记录」页删除单条训练记录,或通过联系我们注销账号并清空全部数据。',
      '3. 撤回授权:您可在微信「设置 - 隐私」中撤回已授予的权限。',
      '4. 注销账号:发送邮件至下方联系方式,我们将在 7 个工作日内处理。'
    ]
  },
  {
    title: '六、未成年人保护',
    paragraphs: [
      '若您未满 18 周岁,请在监护人陪同下阅读并决定是否使用本服务。',
      '未成年人进行力量训练应在专业人士指导下进行。'
    ]
  },
  {
    title: '七、协议的变更',
    paragraphs: [
      '本政策可能随法律法规或产品功能调整而更新。重大变更时我们会在小程序内以弹窗形式提示您。'
    ]
  },
  {
    title: '八、联系我们',
    paragraphs: [
      '如您对本政策有任何疑问、意见或投诉,请发送邮件至 ' + CONTACT + ',我们将在 7 个工作日内回复。'
    ]
  }
];

var TERMS_SECTIONS = [
  {
    title: '一、服务说明',
    paragraphs: [
      '组间记 是一款力量训练记录工具,提供动作库管理、组数记录、组间计时、历史统计等服务。',
      '本服务为工具性质,不构成任何医疗、健身或营养建议。'
    ]
  },
  {
    title: '二、账号规则',
    paragraphs: [
      '您通过微信授权登录后即可使用本服务,账号与您的微信身份绑定。',
      '请妥善保管您的微信账号,因您自身原因导致的账号风险由您自行承担。'
    ]
  },
  {
    title: '三、用户行为规范',
    paragraphs: [
      '您承诺不会利用本服务从事以下行为:',
      '1. 发布、传播违法或违反公序良俗的内容;',
      '2. 通过技术手段干扰、破坏本服务的正常运行;',
      '3. 批量注册账号、爬取数据等滥用行为。'
    ]
  },
  {
    title: '四、健康与运动风险免责声明(请务必阅读)',
    paragraphs: [
      '力量训练存在固有风险,包括但不限于肌肉拉伤、关节损伤、心血管意外等。',
      '您确认:您自愿参与力量训练,并已了解相关风险。在使用 组间记 前,如您有以下情况,请先咨询专业医师:',
      '· 患有心脑血管疾病、高血压、糖尿病等慢性疾病;',
      '· 处于孕期、术后恢复期或伤病未愈;',
      '· 长期未运动后首次进行中高强度训练。',
      '组间记 提供的动作库、默认重量与次数仅为通用参考,不构成针对您个人体质的训练处方。请务必根据自身实际情况调整,并在必要时寻求专业教练指导。',
      '对于因您不当训练造成的任何人身损害,组间记 不承担任何责任。'
    ]
  },
  {
    title: '五、服务的中断与终止',
    paragraphs: [
      '我们努力保障服务持续可用,但因不可抗力、网络故障、系统维护等原因导致的服务中断,我们不承担责任。',
      '若您严重违反本协议,我们有权终止向您提供服务。'
    ]
  },
  {
    title: '六、免责声明',
    paragraphs: [
      '本服务按「现状」提供。受限于移动网络环境,我们不保证数据零丢失,建议您定期查看数据完整性。',
      '在法律允许的最大范围内,我们不对因使用本服务产生的间接损失承担责任。'
    ]
  },
  {
    title: '七、争议解决',
    paragraphs: [
      '本协议适用中华人民共和国法律。因本协议产生的争议,双方应友好协商;协商不成的,提交服务提供方所在地人民法院管辖。'
    ]
  },
  {
    title: '八、联系我们',
    paragraphs: [
      '如有任何疑问,请发送邮件至 ' + CONTACT + '。'
    ]
  }
];

Page({
  data: {
    tab: 'privacy',
    updatedAt: UPDATED_AT,
    contact: CONTACT,
    sections: PRIVACY_SECTIONS,
    fromLaunch: false
  },

  onLoad(options) {
    const tab = options && options.tab === 'terms' ? 'terms' : 'privacy';
    const fromLaunch = !!(options && options.from === 'launch');
    this.applyTab(tab, fromLaunch);

    if (fromLaunch) {
      wx.setNavigationBarTitle({ title: '欢迎使用 组间记' });
    }
  },

  applyTab(tab, fromLaunch) {
    this.setData({
      tab: tab,
      sections: tab === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS,
      fromLaunch: !!fromLaunch
    });
  },

  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.tab) return;
    this.applyTab(tab, this.data.fromLaunch);
  },

  /**
   * 仅在「首次启动」模式下展示同意按钮
   */
  onAgree() {
    try {
      wx.setStorageSync('agreement_accepted', {
        acceptedAt: Date.now(),
        version: UPDATED_AT
      });
    } catch (e) {
      // storage 写入失败不应阻断用户使用
    }
    wx.navigateBack({
      fail: function () {
        wx.switchTab({ url: '/pages/home/home' });
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '组间记 — 专注每一次训练',
      path: '/pages/home/home'
    };
  }
});
