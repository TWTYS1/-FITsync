/**
 * 服务层单元测试:登录降级 / 存储队列 / 订阅消息 / 每日汇总
 *
 * 运行:node miniprogram/tests/services.test.js
 *
 * 测试的核心是「降级链路」——云不可用时,登录、订阅、同步都必须
 * 无声降级而不是崩溃。健身房弱网是常态,这条线必须锁死。
 */

// 有状态的 storage mock:模拟真实 wx.storage 的读写行为
const store = {};
global.wx = {
  getStorageSync: (key) => (key in store ? store[key] : ''),
  setStorageSync: (key, value) => { store[key] = value; },
  removeStorageSync: (key) => { delete store[key]; },
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getRealtimeLogManager: () => null,
  getLogManager: () => null,
  onNetworkStatusChange: () => {},
  getNetworkType: () => {},
  login: () => { throw new Error('guest 模式不应触发 wx.login'); },
  cloud: undefined
};

const auth = require('../services/auth');
const storage = require('../utils/storage');
const subscription = require('../services/subscription');
const dailySummary = require('../utils/dailySummary');

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log('  PASS  ' + name);
  } else {
    fail++;
    console.log('  FAIL  ' + name);
  }
}

function ts(y, m, d, hour, min) {
  return new Date(y, m - 1, d, hour || 10, min || 0, 0).getTime();
}

async function run() {
  console.log('\n[1] 登录降级:云未配置时永不失败');
  const user = await auth.ensureLogin();
  assert('ensureLogin resolve 而非 reject', !!user);
  assert('降级为 guest 用户', user.isGuest === true);
  assert('guest 有稳定 id(非空字符串)', typeof user.id === 'string' && user.id.length > 0);
  assert('isRealUser 对 guest 返回 false', auth.isRealUser() === false);

  console.log('\n[2] guest 身份稳定性');
  const again = await auth.ensureLogin();
  assert('二次调用直接返回缓存,不重复登录', again.id === user.id);
  assert('getOrCreateLocalGuestId 幂等', storage.getOrCreateLocalGuestId() === storage.getOrCreateLocalGuestId());

  console.log('\n[3] 登录成功回调注册');
  let hookFired = false;
  auth.onLoginSuccess(function () { hookFired = true; });
  await auth.ensureLogin();
  assert('guest 降级路径不触发登录成功回调', hookFired === false);

  console.log('\n[4] 同步队列:入队 / 去重 / 出队');
  storage.enqueueSync({ recordId: 'r1', record: { id: 'r1' } });
  storage.enqueueSync({ recordId: 'r2', record: { id: 'r2' } });
  storage.enqueueSync({ recordId: 'r1', record: { id: 'r1' } }); // 重复
  assert('重复 recordId 不重复入队', storage.getSyncQueue().length === 2);
  storage.removeSyncTask('r1');
  assert('出队只移除目标任务', storage.getSyncQueue().length === 1 && storage.getSyncQueue()[0].recordId === 'r2');
  storage.removeSyncTask('r2');
  assert('队列可清空', storage.getSyncQueue().length === 0);

  console.log('\n[5] 同步水位 lastSyncAt');
  assert('默认水位为 0(从未同步)', storage.getLastSyncAt() === 0);
  storage.setLastSyncAt(1757600000000);
  assert('水位读写一致', storage.getLastSyncAt() === 1757600000000);

  console.log('\n[6] 订阅消息:模板未配置时静默跳过');
  assert('默认未配置模板', subscription.isConfigured() === false);
  const accepted = await subscription.requestSubscribe();
  assert('未配置模板返回空数组且不报错', Array.isArray(accepted) && accepted.length === 0);

  console.log('\n[7] 订阅消息:配置模板后的授权流程');
  subscription.TEMPLATE_CONFIG.remind = 'TMPL_TEST_1';
  subscription.TEMPLATE_CONFIG.weekly = '';
  assert('isConfigured 检测到已配置模板', subscription.isConfigured() === true);
  assert('空模板 ID 被过滤', subscription.getValidTemplateIds().length === 1);

  // mock:用户接受 remind,拒绝其他
  global.wx.requestSubscribeMessage = function (opts) {
    opts.success({ TMPL_TEST_1: 'accept' });
  };
  const accepted2 = await subscription.requestSubscribe();
  assert('用户接受的模板被正确返回', accepted2.length === 1 && accepted2[0] === 'TMPL_TEST_1');

  // mock:用户全部拒绝
  global.wx.requestSubscribeMessage = function (opts) {
    opts.success({ TMPL_TEST_1: 'reject' });
  };
  const rejected = await subscription.requestSubscribe();
  assert('用户拒绝时返回空数组,不 reject', rejected.length === 0);

  // mock:调用失败(如用户关闭弹窗)
  global.wx.requestSubscribeMessage = function (opts) {
    opts.fail({ errMsg: 'requestSubscribeMessage:fail cancel' });
  };
  const failed = await subscription.requestSubscribe();
  assert('调用失败也返回空数组,不 reject', failed.length === 0);
  delete global.wx.requestSubscribeMessage;

  console.log('\n[8] 每日汇总:当天过滤与容量计算');
  const dayRecords = [
    {
      exerciseName: '卧推', categoryName: '胸',
      startedAt: ts(2026, 9, 10, 10), completedAt: ts(2026, 9, 10, 10, 30),
      sets: [
        { weight: 40, reps: 10, isWarmup: true },
        { weight: 60, reps: 8 },
        { weight: 65, reps: 6 }
      ]
    },
    {
      exerciseName: '深蹲', categoryName: '腿',
      startedAt: ts(2026, 9, 10, 11), completedAt: ts(2026, 9, 10, 11, 40),
      sets: [{ weight: 100, reps: 5 }]
    },
    {
      exerciseName: '昨天的硬拉', categoryName: '背',
      startedAt: ts(2026, 9, 9, 10), completedAt: ts(2026, 9, 9, 10, 30),
      sets: [{ weight: 120, reps: 3 }]
    }
  ];
  const summary = dailySummary.buildDailySummary(dayRecords, ts(2026, 9, 10, 12));
  assert('只统计当天记录(2 条)', summary.records.length === 2);
  assert('热身组不计入组数', summary.totalSets === 3);
  assert('热身组不计入容量(60*8+65*6+100*5=1370)', summary.totalVolume === 1370);
  assert('当天最大重量取正式组(100)', summary.maxWeight === 100);
  assert('无历史时不误报 PR', summary.hasWeightPr === false);
  assert('动作名去重且保持顺序', summary.exerciseNames.join(',') === '卧推,深蹲');

  console.log('\n[9] PR 判定:突破历史最大重量');
  const prRecords = dayRecords.concat([
    {
      exerciseName: '卧推', categoryName: '胸',
      startedAt: ts(2026, 9, 11, 10), completedAt: ts(2026, 9, 11, 10, 30),
      sets: [{ weight: 70, reps: 5 }] // 历史最大 65 → 70 破纪录
    }
  ]);
  const prSummary = dailySummary.buildDailySummary(prRecords, ts(2026, 9, 11, 12));
  assert('突破历史最大重量时标记 PR', prSummary.hasWeightPr === true);
  assert('PR 日最大重量为 70', prSummary.maxWeight === 70);

  console.log('\n[10] buildRecordDays:按天分组倒序');
  const days = dailySummary.buildRecordDays(prRecords);
  assert('分成三天(9.9 / 9.10 / 9.11)', days.length === 3);
  assert('日期倒序(9.11 在前)', days[0].dateKey === '2026-09-11');
  assert('当天组数只算正式组', days[1].totalSets === 3);

  console.log('\n[11] 28 天活跃网格');
  const grid = summary.historyGrid28Days;
  assert('网格固定 28 格', grid.length === 28);
  assert('最后一格是当天且 active', grid[27].dateKey === '2026-09-10' && grid[27].active === true);
  assert('无训练日标记 inactive', grid[0].active === false);

  console.log('\n[12] 异常时长兜底');
  const badRecord = {
    exerciseName: '异常', categoryName: '胸',
    startedAt: 5000, completedAt: 1000, // completedAt < startedAt
    sets: []
  };
  const badSummary = dailySummary.buildDailySummary([badRecord], 1000);
  assert('completedAt 早于 startedAt 时时长记 0,不产生负数', badSummary.totalDurationMinutes === 0);

  console.log('\n========================================');
  console.log('RESULT  PASS: ' + pass + '   FAIL: ' + fail);
  console.log('========================================');

  if (fail === 0) console.log('services tests passed');
}

run().then(function () {
  process.exit(fail > 0 ? 1 : 0);
});
