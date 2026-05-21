# Claude Code Prompt: FitSync Phase 3 收尾提交与推送

请在当前仓库 `D:\vibecoding\project2_fit` 中完成 Phase 3 收尾、提交和推送。当前目标分支是 `phase3-exercises`。

## 目标

把 Phase 3 小程序改动整理成可交付版本并推送到 GitHub。不要继续新增业务功能，不要进入 Phase 4。

## 必须先确认

```powershell
git status --short --branch
```

期望当前分支是：

```text
phase3-exercises
```

如果不是，请先停下来，不要提交。

## 必须验证

请运行以下命令：

```powershell
node miniprogram\tests\trainingSession.test.js
Get-ChildItem -Path miniprogram -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
rg -n "FIGHT|Fight|fight|getFight|confirmFontSize" miniprogram/pages miniprogram/utils miniprogram/data miniprogram/tests
```

预期：

- `trainingSession` 测试输出 `all tests passed`
- JS 语法检查无错误
- `rg` 对旧确认文案和旧字号逻辑的搜索无结果

如果验证失败，请先修复失败项，再提交。

## 手动验收建议

在微信开发者工具中：

1. 重新编译，必要时清除数据缓存。
2. 进入训练页，选择动作，确认开始设置层的目标组数可以直接输入。
3. 新增自定义动作，确认目标组数、默认重量、默认次数均可直接输入。
4. 开始训练，记录一组，确认 `记录本组` 需要按满 1.5 秒。
5. 记录后确认撤销 Toast 是细边红风格，并且 3 秒内可撤销。
6. 休息结束有视觉提示，训练页停留 120 秒有漏记提醒。

## 允许提交的文件范围

只提交 Phase 3 相关文件：

```text
.gitignore
FitSync_ROADMAP.html
PHASE3_EXERCISES_PLAN.md
CLAUDE_PHASE3_PUSH_PROMPT.md
miniprogram/
```

其中 `miniprogram/project.private.config.json` 应保持不提交；它已被 `.gitignore` 忽略。

## 禁止提交

不要提交以下本地辅助文件或目录：

```text
.claude/
.superpowers/
FitSync作品说明书.docx
INTERACTION_GUIDE.docx
```

也不要提交任何未确认用途的新文件。

## 建议提交命令

先检查状态：

```powershell
git status --short --branch
```

暂存明确范围：

```powershell
git add .gitignore FitSync_ROADMAP.html PHASE3_EXERCISES_PLAN.md CLAUDE_PHASE3_PUSH_PROMPT.md miniprogram
git restore --staged -- miniprogram/project.private.config.json
```

再次检查暂存内容，确保没有 `.claude/`、`.superpowers/`、Word 文档，也没有 `miniprogram/project.private.config.json`：

```powershell
git status --short
git diff --cached --stat
git diff --cached --name-only
```

提交：

```powershell
git commit -m "feat: complete FitSync phase 3 exercises"
```

推送：

```powershell
git push -u origin phase3-exercises
```

## 提交后回复用户

请回复：

- commit hash
- 推送分支
- 验证命令结果
- 是否还有未提交的本地文件
- GitHub 分支链接或 PR 链接
