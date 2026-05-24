# FitSync — 健身训练专注记录工具

> 不是在"记录健身"，而是在"不打断训练节奏的前提下完成记录"。

## 痛点研究

### 现有产品的共同问题

市面上的健身记录 App（Strong、Hevy、训记等）功能很全，但有一个共同问题：**记录流程太重**。

典型流程：完成一组 → 解锁手机 → 找到输入框 → 输入重量 → 输入次数 → 点击保存 → 下一组。这个流程在组间休息 90 秒内完成，体验是割裂的。

更关键的是，力量训练者经常在做了两三组后**忘记自己做到第几组了**。这不是记忆力问题——当你力竭到力不从心、大脑缺氧时，组数确实会混。

### 核心 Insight

**训练中的手机交互应该像秒表，而不是电子表格。**

用户需要的是一个在组间休息时只需 1 次点击就能标记"完成一组"的工具，详细数据可以在训练结束后再补充。

### 竞品对比

| 维度 | Strong / Hevy | 训记 | FitSync |
|------|:---:|:---:|:---:|
| 记录一组所需点击次数 | 3-5 次 | 3-4 次 | **1 次** |
| 组间计时 | 手动启动 | 手动 | **自动触发** |
| 遗忘组数提醒 | 无 | 无 | **进度条 + 圆点指示器** |
| 单手操作 | 勉强 | 差 | **优化** |
| 界面密度 | 高 | 高 | **极简训练模式** |

## 设计哲学

### 为什么是深色 + 琥珀色

- **深色底**（`#050505`）：健身房光线通常偏暗，白底界面刺眼。深色让用户在组间休息时只需扫一眼，不抢注意力。
- **琥珀色**（`#f59e0b`）：铁馆的暖光色调，传递热量和能量感，而不是冷冰冰的科技蓝。
- **大号字体 + 高对比度**：力竭时视线模糊也能看清组数和重量。

### 交互决策

1. **80px + 按钮**：健身时手指可能出汗、颤抖，小按钮容易误触。大按钮降低操作精度要求。
2. **默认复制上一组数据**：80% 的情况下用户不会改重量，减少不必要的操作。
3. **快捷微调代替输入框**：±2.5kg / ±1 次的按钮比键盘输入快一个数量级，且不会因为输错数字导致数据混乱。
4. **3 秒撤销**：误操作后的后悔期。不做二次确认弹窗——那会打断节奏。直接撤销更轻量。
5. **自动组间计时**：不需要用户额外操作。确认一组后自动开始倒计时，90 秒后视觉提醒。

## 技术架构

### 技术栈选型

| 技术 | 选型理由 |
|------|----------|
| **Next.js 16 (App Router)** | SSR 能力为后续多设备同步做准备；App Router 是 React 生态标准 |
| **TypeScript** | 类型安全，减少运行时错误 |
| **Tailwind CSS v4** | 原子化 CSS，深色主题用设计令牌统一管理，无需写 CSS 文件 |
| **Framer Motion** | 物理弹簧动画，比 CSS transition 更自然；Sheet 滑入、按钮按压反馈、完成庆祝 |
| **lucide-react** | 轻量 SVG 图标库，tree-shaking 友好 |
| **localStorage** | MVP 阶段无需后端，数据持久化在浏览器 |

### 为什么 MVP 不要数据库

- MVP 的唯一目的是**验证核心交互假设**：一次点击记录是否真的比竞品快。
- localStorage 足够支撑单设备单日使用。
- 后端（Supabase）应在交互验证通过后再引入，避免过早过度设计。

### 目录结构

```
project2_fit/
├── app/
│   ├── globals.css          # 深色主题 CSS 变量 + Tailwind 配置
│   ├── layout.tsx           # 根布局，注入 StoreProvider
│   └── page.tsx             # 单页应用入口，底部 Tab 切换
├── components/
│   ├── TrainingFocus.tsx    # 核心组件：训练中专注模式
│   ├── TrainingLog.tsx      # 今日训练日志（只读）
│   ├── ExerciseSheet.tsx    # 底部 Sheet：确认组数 + 微调
│   ├── RestTimer.tsx        # SVG 圆形进度休息计时器
│   └── CompletionModal.tsx  # 训练完成总结弹窗
├── lib/
│   ├── types.ts             # TypeScript 类型定义
│   ├── mockData.ts          # 预设动作模板（4 个核心动作）
│   └── store.tsx            # 状态管理：Context + useReducer + localStorage
└── public/
```

### 数据流

```
用户点击 [+] → ExerciseSheet 滑入 → 微调重量/次数
  → 确认 → dispatch(CONFIRM_SET, payload)
    → reducer: 写入 completedSets[]
    → localStorage 持久化
    → 组数 +1 → 自动触发 RestTimer
    → undoSet 写入 → 3s 后可撤销
    → 达到目标组数 → CompletionModal
```

状态管理使用 React Context + useReducer，而非引入 Redux/Zustand。原因：
- 状态结构简单（7 个 action type，无异步副作用）
- Context 足够覆盖单页应用的数据流
- 减少依赖，降低简历项目的复杂度质疑

### 核心组件实现要点

**TrainingFocus.tsx**
- 三种 UI 状态：动作选择（无 activeExercise）→ 训练中 → 休息中 / 已完成
- 本地 state 管理 pending weight/reps/warmup（避免 store 中冗余的临时状态）
- restEndTime 基于时间戳而非倒计时数值，页面切换回来时间仍然准确

**RestTimer.tsx**
- SVG circle + stroke-dasharray 实现圆形进度
- 琥珀色 glow 滤镜 `drop-shadow(0 0 6px rgba(245,158,11,0.5))`
- `setInterval(500ms)` 轮询而不是 `useEffect` 逐秒递减——保证时间精度

**ExerciseSheet.tsx**
- Framer Motion `spring` 动画从底部滑入，damping=28 模拟 iOS Sheet 手感
- Backdrop blur 隔离训练界面
- 重量和次数独立调整区域，中间分隔线

## 运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 浏览器打开
open http://localhost:3000
```

推荐在 Chrome DevTools 中切换到移动端视图（375px 宽）体验。

## 后续迭代路线

| 阶段 | 内容 | 优先级 |
|------|------|:---:|
| **Phase 2** | Supabase 接入：用户系统 + 云端同步 | 高 |
| **Phase 3** | 训练计划模板：Push/Pull/Legs 预设 | 高 |
| **Phase 4** | 饮食记录 + BMR 计算 | 中 |
| **Phase 5** | Dashboard：卧推/引体向上趋势图（Recharts） | 中 |
| **Phase 6** | PWA 支持：离线使用 + 主屏安装 | 低 |
| **Phase 7** | Apple Watch 伴侣 App | 低 |

## 简历亮点建议

面试时可以重点讲：

1. **痛点洞察**：不是"健身 App 很难做"，而是"组间记录这一个环节被所有人做重了"，证明你有产品 sense。
2. **交互决策**：为什么要 80px 按钮而不是常规 44px，为什么默认复制上一组，每一项都有推理过程。
3. **技术克制**：MVP 不用数据库、不引入状态管理库、不用 UI 组件库，每一层依赖都有理由。
4. **实物演示**：手机打开 `http://localhost:3000`，当场走一遍完整训练流程。

---

*Built with 微信小程序原生框架 (WeChat Mini Program Native Framework).*

## 版本历史

### Phase 4F — 今日总结卡视觉精修 + 个人默认值覆盖（当前版本）

**今日总结卡视觉精修：**

- 主重量从 `VOLUME(KG)` / 裸数字改为 `100kg` 风格（`今日最重` 标签 + 数值 + `kg` 后缀）。
- 顶部指标行改为：今日最重 / 动作 / 时长 / 正式组，去掉 `MAX`、`SETS`、大写 `KG` 等表格感文案。
- Featured 动作行改为 `组数 / 重量 / PR 小标` 三列网格布局，等宽字体对齐。
- 新增"今日明细"区域：按天聚合每个动作的正式组数、最重、PR，使用与 Featured 一致的视觉表达。
- 超过 2 个动作时，Featured 区域展示黑绿点状省略号。

**PR 逻辑修正：**

- 只有该动作存在历史正式组，且今天正式组最大重量严格大于历史最大重量，才标记 PR。
- 热身组完全排除在最大重量和 PR 判断之外（`isWarmup` 过滤）。
- 新增 `getExerciseHistoricalMaxWeight()` 计算严格在目标日期之前的历史最大重量。

**Featured 排序规则（`selectFeaturedExercises`）：**

- 有 PR 时：PR 动作优先排在第一位，第二位从剩余动作中选最大重量最高的。
- 无 PR 时：选最大重量最高的两个动作。
- 同重量 PR 冲突时按重量降序，确保语义一致。

**预设动作个人默认值覆盖：**

- 开始训练 Sheet 新增默认重量 ±2.5kg 步进器和默认次数 ±1 步进器。
- 新增"保存为我的默认"开关（`saveAsDefault`），一键将当前目标组数/默认重量/默认次数写入本地存储。
- 存储 key `exercise_overrides`，支持读取、写入、规范化（组数 1-10、重量 ≥0、次数 ≥1）。
- 训练页选择动作时自动通过 `applyExerciseOverrides` 应用覆盖值。
- 休息时间选项增加 300 秒（5 分钟）。

**测试覆盖：**

- 新增 `buildRecordDays` 测试：多天聚合、PR 判断（有历史/无历史/等重/热身组）、空记录边界。
- 新增 `getExerciseHistoricalMaxWeight` 测试：跨天历史最大、热身组排除、无正式组历史。
- 新增 Featured 排序规则测试：有 PR 优先、无 PR 按重量、3+ 动作触发省略号。
- 新增 Exercise Overrides 测试：覆盖写入/读取/应用、值规范化、空/null 边界。
- 新增 WXML/JS 源码检查断言，确保 `MAX(KG)`、`SETS`、大写 `KG` 等旧文案已清除。

**产品文档：**

- 新增 `FitSync_PRODUCT_TECH_ROADMAP.html`：产品设计与技术路线文档。
