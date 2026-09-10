# 组间记(曾用名 FitSync)原生微信小程序说明

## 运行说明

1. 打开 **微信开发者工具**
2. 选择 **小程序 -> 导入项目**
3. 目录指向 `miniprogram/`
4. AppID 使用测试号或真实 AppID
5. 点击编译；如看不到最新交互，先清缓存再重新编译

## 架构概览

原生 JS + WXML + WXSS，无 Taro、TypeScript、云开发、第三方 UI 库。

```
miniprogram/
  app.js / app.json / app.wxss
  project.config.json / sitemap.json
  data/exercises.js                 # 预置动作库 + 动作分类/角色工具
  utils/storage.js                  # 微信本地存储封装
  utils/trainingSession.js          # 训练会话纯逻辑
  pages/home/                       # 首页：今日状态 + 训练入口
  pages/training/                   # 训练主链路：选动作 -> 开始设置 -> 记录 -> 休息 -> 总结
  pages/exercise-form/              # 自定义动作新增/编辑/删除
  pages/records/                    # 历史训练记录
```

## 当前产品状态

Phase 3 已推进到“可长期使用的本地训练记录工具”：

- [x] 3 Tab 导航：首页、训练、记录
- [x] 黑绿极简视觉主题
- [x] 6 分类动作库：胸、背、肩、腿、手臂、核心
- [x] 动作角色：热身、主项、辅项、孤立
- [x] 每类 6-8 个预置动作，总量约 40 个
- [x] 当前分类内“常用”动作，基于最近训练记录推导
- [x] 自定义动作新增、编辑、删除
- [x] 自定义动作字段：名称、分类、角色、目标组数、默认重量、默认次数
- [x] 开始训练设置层：目标组数可输入，休息时间可选 60/90/120/180 秒
- [x] 训练中专注模式：上一组信息面板、组数圆点、大号记录按钮
- [x] 记录 Sheet：重量可输入两位小数，次数可直接输入
- [x] 1.5 秒延迟确认记录，按钮文案为“记录本组”
- [x] 热身组不推进正式组数，但保留在明细中
- [x] 3 秒撤销 Toast，最终组撤销会恢复训练并删除刚保存的记录
- [x] 休息结束轻震动 + 视觉提示
- [x] 漏记提醒：训练页停留 120 秒后提示“补记一组 / 忽略”
- [x] 记录页展示历史记录、自定义动作标识、每组明细
- [x] 本地 storage 持久化当前训练、历史记录、休息时间、自定义动作

## 数据模型

### 动作

```js
{
  id,
  name,
  category,
  categoryName,
  role,
  roleName,
  targetSets,
  defaultWeight,
  defaultReps,
  source // preset | custom
}
```

### 训练会话

```js
{
  exerciseId,
  exerciseName,
  categoryName,
  exerciseSource,
  targetSets,
  currentSet,
  lastWeight,
  lastReps,
  sets[],
  isResting,
  restEndTime,
  startedAt,
  completedAt
}
```

### 单组记录

```js
{
  setNumber,
  formalSetNumber,
  weight,
  reps,
  isWarmup,
  timestamp
}
```

### 训练记录

```js
{
  id,
  exerciseId,
  exerciseName,
  categoryName,
  exerciseSource,
  sets[],
  totalSets,
  totalVolume,
  startedAt,
  completedAt
}
```

## 验收命令

```powershell
node miniprogram\tests\trainingSession.test.js
Get-ChildItem -Path miniprogram -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
rg -n "FIGHT|Fight|fight|getFight|confirmFontSize" miniprogram/pages miniprogram/utils miniprogram/data miniprogram/tests
```

`rg` 命令应无结果，表示旧确认文案和旧字号逻辑没有残留在运行代码中。

## 后续迭代

- [ ] Phase 4：截图风格总结卡
- [ ] 主题可选：黑绿 vs 黑红/黑琥珀方向重新评估
- [ ] Tab 图标：81x81 PNG
- [ ] 更完整的记录统计：周/月训练量、动作进步趋势
- [ ] 云端同步与微信登录，等本地体验稳定后再做

## 与 Next.js Demo 的关系

- 小程序工程位于 `miniprogram/`
- Next.js demo 保留为视觉和交互参考
- 两者独立，当前产品化主线以原生微信小程序为准
