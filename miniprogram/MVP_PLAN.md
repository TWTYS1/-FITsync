# FitSync 原生微信小程序 MVP

## 运行说明

1. 打开 **微信开发者工具**
2. 选择 **小程序 → 导入项目**
3. 目录指向 `miniprogram/`
4. AppID 使用 **测试号**（或填入真实 AppID）
5. 点击编译即可预览

## 架构概览

原生 JS + WXML + WXSS，无 Taro、TypeScript、云开发、第三方框架。

```
miniprogram/
  app.js / app.json / app.wxss     # 应用入口
  project.config.json / sitemap.json
  data/exercises.js                 # 预置动作库（5分类）
  utils/storage.js                  # 微信本地存储封装
  utils/trainingSession.js          # 训练会话纯逻辑
  pages/home/                       # 首页：今日状态 + 训练入口
  pages/training/                   # 训练：分类 → 选动作 → 训练中 → 休息 → 总结
  pages/records/                    # 记录：今日和历史训练记录
```

## 数据模型

### 动作
```js
{ id, name, category, categoryName, targetSets, defaultWeight, defaultReps }
```

### 训练会话
```js
{ exerciseId, exerciseName, categoryName, targetSets, currentSet, lastWeight, lastReps, sets[], isResting, restEndTime, startedAt, completedAt }
```

### 单组记录
```js
{ setNumber, weight, reps, isWarmup, timestamp }
```

### 训练记录（持久化）
```js
{ id, exerciseName, categoryName, sets[], totalSets, totalVolume, startedAt, completedAt }
```

## 已实现功能

- [x] 3 Tab 导航：首页、训练、记录
- [x] 黑绿极简视觉主题
- [x] 预置动作库：胸、肩、腿、背、腹 5 分类 10 个动作
- [x] 首页今日训练统计 + 开始/继续训练入口
- [x] 训练页：分类选择 → 动作选择
- [x] 训练中专注模式：组数圆点、上组数据、大号 + 按钮
- [x] 底部 Sheet 确认面板：重量 ±2.5kg、次数 ±1、热身组开关
- [x] 自动 90 秒休息倒计时（conic-gradient 环形进度）
- [x] 跳过休息 / 撤销上一组
- [x] 训练完成总结：训练量、组数、每组明细
- [x] 记录页：按时间倒序展示，日期格式化
- [x] localStorage 持久化（当前训练断点续练 + 历史记录）

## 待后续迭代

- [ ] 2 秒长按确认（当前为普通点击确认）
- [ ] 3 秒撤销倒计时
- [ ] 休息结束轻提醒（震动/音效）
- [ ] 自定义动作
- [ ] 更完整动作库
- [ ] 漏记提醒
- [ ] 截图风格总结卡
- [ ] 主题可选：黑绿 vs 黑琥珀
- [ ] Tab 图标（需要 81x81 PNG 素材）

## 与 Next.js Demo 的关系

- 小程序工程位于 `miniprogram/`，Next.js demo 位于 `app/`、`components/`、`lib/`
- 两者独立，互不影响
- 小程序版借鉴了 Next.js 版的设计语言和交互模式，但技术栈完全不同
