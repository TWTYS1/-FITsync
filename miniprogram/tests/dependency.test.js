/**
 * 依赖链完整性测试(dependency.test.js)
 * 三层校验:
 *   A. app.json 注册的页面四件套(.js/.json/.wxml/.wxss)真实存在
 *   B. mock 微信运行环境后,所有 JS 模块可被成功 require(无模块级错误)
 *   C. 解构 require 的成员在目标模块的 exports 中真实存在(防拼写/漏导出)
 * 运行:node miniprogram/tests/dependency.test.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var failures = [];
var passed = 0;

function fail(msg) {
  failures.push(msg);
  console.error('FAIL: ' + msg);
}

function ok(msg) {
  passed++;
}

/* ============ Mock 微信运行环境 ============ */
function wxApi(result) {
  return function (opt) {
    opt = opt || {};
    if (typeof opt.success === 'function') opt.success(result);
    if (typeof opt.complete === 'function') opt.complete(result);
    return Promise.resolve(result);
  };
}

var wx = {
  getStorageSync: function () { return ''; },
  setStorageSync: function () {},
  removeStorageSync: function () {},
  getAccountInfoSync: function () {
    return { miniProgram: { envVersion: 'develop', appId: 'test-appid' } };
  },
  getRealtimeLogManager: function () {
    return { info: function () {}, warn: function () {}, error: function () {}, setFilterMsg: function () {}, addFilterMsg: function () {} };
  },
  getUpdateManager: function () {
    return { onCheckForUpdate: function () {}, onUpdateReady: function () {}, onUpdateFailed: function () {}, applyUpdate: function () {} };
  },
  onNetworkStatusChange: function () {},
  onAppShow: function () {},
  onAppHide: function () {},
  onError: function () {},
  getNetworkType: wxApi({ networkType: 'wifi' }),
  login: wxApi({ code: 'test-code' }),
  request: wxApi({ statusCode: 200, data: {} }),
  cloud: { init: function () {}, callFunction: wxApi({ result: {} }), CloudID: function () {} },
  requestSubscribeMessage: wxApi({}),
  showToast: function () {},
  showLoading: function () {},
  hideLoading: function () {},
  showModal: wxApi({ confirm: true }),
  navigateTo: function () {},
  switchTab: function () {},
  navigateBack: function () {},
  setNavigationBarTitle: function () {},
  canIUse: function () { return true; },
  getSystemInfoSync: function () { return { platform: 'devtools', SDKVersion: '3.0.0', windowWidth: 375, windowHeight: 667 }; },
  env: { USER_DATA_PATH: '/tmp' }
};

global.wx = wx;
global.App = function (cfg) { return cfg; };
global.Page = function (cfg) { return cfg; };
global.Component = function (cfg) { return cfg; };
global.Behavior = function (cfg) { return cfg; };
global.getApp = function () {
  return {
    globalData: {},
    ensureLogin: function () { return Promise.resolve({ id: 'guest-test' }); }
  };
};
global.getCurrentPages = function () { return []; };

/* ============ A. 页面四件套存在性 ============ */
console.log('=== [A] app.json 页面注册校验 ===');
var appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
(appJson.pages || []).forEach(function (pagePath) {
  ['.js', '.json', '.wxml', '.wxss'].forEach(function (ext) {
    var full = path.join(ROOT, pagePath + ext);
    if (fs.existsSync(full)) {
      ok();
    } else {
      fail('页面文件缺失: ' + pagePath + ext);
    }
  });
});

var tabBar = appJson.tabBar || {};
[].concat((tabBar.list || []).map(function (item) { return item.iconPath; }), (tabBar.list || []).map(function (item) { return item.selectedIconPath; })).filter(Boolean).forEach(function (iconPath) {
  if (fs.existsSync(path.join(ROOT, iconPath))) { ok(); } else { fail('tabBar 图标缺失: ' + iconPath); }
});

/* ============ B. 所有 JS 模块可加载 ============ */
console.log('=== [B] 模块加载校验 ===');
function listJsFiles(dir, acc) {
  fs.readdirSync(dir).forEach(function (name) {
    if (name === 'node_modules' || name === 'tests' || name === 'cloud') return;
    var full = path.join(dir, name);
    var stat = fs.statSync(full);
    if (stat.isDirectory()) { listJsFiles(full, acc); }
    else if (name.endsWith('.js')) { acc.push(full); }
  });
  return acc;
}

var allJs = listJsFiles(ROOT, []);
var moduleCache = {};
allJs.forEach(function (file) {
  try {
    moduleCache[file] = require(file);
    ok();
  } catch (e) {
    fail('模块加载失败: ' + path.relative(ROOT, file) + ' -> ' + e.message);
  }
});

/* ============ C. 解构 require 成员存在性 ============ */
console.log('=== [C] 解构成员校验 ===');
var requirePattern = /(?:const|var|let)\s*\{([^}]+)\}\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;

allJs.forEach(function (file) {
  var src = fs.readFileSync(file, 'utf8');
  var match;
  requirePattern.lastIndex = 0;
  while ((match = requirePattern.exec(src)) !== null) {
    var names = match[1].split(',').map(function (n) {
      return n.trim().split(/\s*:\s*/).pop().trim();
    }).filter(Boolean);
    var targetPath = path.resolve(path.dirname(file), match[2]);
    var target = moduleCache[targetPath];
    if (!target) {
      try { target = require(targetPath); moduleCache[targetPath] = target; } catch (e) { target = null; }
    }
    if (!target) {
      fail(path.relative(ROOT, file) + ' require 了不存在的模块: ' + match[2]);
      continue;
    }
    names.forEach(function (name) {
      if (!(name in target)) {
        fail(path.relative(ROOT, file) + ' 使用了 ' + match[2] + ' 未导出的成员: ' + name);
      } else {
        ok();
      }
    });
  }
});

/* ============ 结果 ============ */
console.log('========================================');
console.log('RESULT  PASS: ' + passed + '   FAIL: ' + failures.length);
if (failures.length > 0) {
  console.error('\n失败清单:');
  failures.forEach(function (f) { console.error('  - ' + f); });
  process.exit(1);
} else {
  console.log('dependency tests passed');
}
