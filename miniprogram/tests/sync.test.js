/**
 * 云端同步 + 分享话术 单元测试
 *
 * 运行:node miniprogram/tests/sync.test.js
 *
 * 覆盖重点是 mergeRecords —— 它决定了用户换设备、重传、离线后
 * 训练数据会不会丢、会不会被旧数据回滚。这块必须锁死。
 */

global.wx = {
  getStorageSync: () => null,
  setStorageSync: () => {},
  removeStorageSync: () => {},
  getSystemInfoSync: () => ({}),
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getRealtimeLogManager: () => null,
  getLogManager: () => null,
  onNetworkStatusChange: () => {},
  getNetworkType: () => {},
  login: () => {},
  cloud: undefined
};

const sync = require('../services/sync');
const share = require('../services/share');

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

function run() {
  console.log('\n[1] mergeRecords 双向合并');
  const local = [
    { id: 'a', startedAt: 3000, completedAt: 3100 },
    { id: 'b', startedAt: 2000, completedAt: 2100 }
  ];
  const remote = [
    { id: 'b', startedAt: 2000, completedAt: 2500 }, // 云端版本更新
    { id: 'c', startedAt: 1000, completedAt: 1100 }  // 本地缺失(换设备场景)
  ];
  const merged = sync.mergeRecords(local, remote);

  assert('去重后共 3 条', merged.length === 3);
  assert('按 startedAt 倒序,a 排第一', merged[0].id === 'a');
  assert('同 id 保留较新版本(b=2500)', merged[1].id === 'b' && merged[1].completedAt === 2500);
  assert('云端独有的 c 被合并进来', merged[2].id === 'c');

  console.log('\n[2] 空边界处理');
  assert('local 空 -> 全取 remote', sync.mergeRecords([], remote).length === 2);
  assert('remote 空 -> 全取 local', sync.mergeRecords(local, []).length === 2);
  assert('两者都空 -> 空数组', sync.mergeRecords([], []).length === 0);
  assert('null 入参不崩溃', sync.mergeRecords(null, null).length === 0);

  console.log('\n[3] 幂等性:重复上传不产生脏数据');
  assert('同一批记录重复合并仍为 2 条', sync.mergeRecords(local, local).length === 2);

  console.log('\n[4] 时间戳保护:旧数据不覆盖新数据');
  const oldRemote = [{ id: 'a', startedAt: 3000, completedAt: 1000 }];
  const protectedMerge = sync.mergeRecords(local, oldRemote);
  assert('本地新数据未被云端旧数据回滚', protectedMerge[0].completedAt === 3100);

  console.log('\n[5] 无 id 的脏数据不污染结果');
  const dirty = [{ startedAt: 9999, completedAt: 9999 }];
  assert('缺少 id 的记录被丢弃', sync.mergeRecords(dirty, []).length === 0);

  console.log('\n[6] 分享话术生成');
  const s1 = share.buildTrainingShare({ id: 'x', exerciseName: '卧推', totalSets: 5, totalVolume: 2400 });
  assert('普通分享含动作名与总容量', s1.title.indexOf('卧推') > -1 && s1.title.indexOf('2400') > -1);
  const s2 = share.buildTrainingShare({ id: 'y', exerciseName: '深蹲', totalSets: 5, totalVolume: 3000, isWeightPr: true });
  assert('破纪录走 PR 专属文案', s2.title.indexOf('破') > -1);
  assert('分享路径带渠道归因参数', s1.path.indexOf('from=share') > -1);
  assert('无数据时降级为首页分享', share.buildTrainingShare(null).path.indexOf('pages/home') > -1);
  assert('每日总结分享含当天容量', share.buildDailySummaryShare({
    records: [{}], exerciseCount: 3, totalVolume: 5000, maxWeight: 0, hasWeightPr: false
  }).title.indexOf('5000') > -1);

  console.log('\n========================================');
  console.log('RESULT  PASS: ' + pass + '   FAIL: ' + fail);
  console.log('========================================');

  if (fail === 0) {
    console.log('sync tests passed');
  }
}

run();

process.exit(fail > 0 ? 1 : 0);
