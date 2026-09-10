# Claude Code Prompt: FitSync Phase 4d Recovery

## Current Project State

Project path:

```powershell
D:\vibecoding\project2_fit
```

Expected current branch:

```text
phase4d-exercise-overrides
```

This branch is currently working on preset exercise personal defaults. There may already be uncommitted changes in:

```text
miniprogram/pages/training/training.js
miniprogram/pages/training/training.wxml
miniprogram/tests/trainingSession.test.js
miniprogram/utils/storage.js
```

Do not overwrite or simplify those changes. Continue on top of the current work.

First run:

```powershell
git status --short --branch
```

If the branch is not `phase4d-exercise-overrides`, stop and ask before editing.

## Why This Change Exists

There are two small recovery items for Phase 4d:

1. Rest time should remain manually selected, but the app needs a `300s` option for heavy sets.
2. The daily summary card currently looks like it only shows the first few movements because the movement list inside the card is height-limited.

The correct product direction:

- Keep the black-green daily card clean and screenshot-friendly.
- Add a full details table below the card for review.
- Do not turn the card itself into a huge scroll-heavy report.
- Do not implement automatic rest selection yet.

## Task 1: Add 300s Rest Option

Current rest options are:

```js
[60, 90, 120, 180]
```

Add:

```js
300
```

So options become:

```js
[60, 90, 120, 180, 300]
```

Update every rest duration whitelist and option list, likely including:

```text
miniprogram/pages/training/training.js
miniprogram/utils/storage.js
```

Make sure `300`:

- Appears in the start training sheet.
- Can be saved to local storage.
- Persists after reopening the mini program.
- Controls the actual rest countdown after recording a set.

Do not implement automatic rest selection in this round.

## Task 2: Add Full Daily Details Below The Summary Card

Main files:

```text
miniprogram/pages/daily-summary/daily-summary.js
miniprogram/pages/daily-summary/daily-summary.wxml
miniprogram/pages/daily-summary/daily-summary.wxss
```

Current problem:

```css
.exercise-section {
  max-height: 170rpx;
  overflow: hidden;
}
```

This makes the card look like it only shows the first few movements when the user trained many movements in one day.

Do not cram all movements into the screenshot card. Instead, keep the card as the visual cover, and add a complete details section below it:

```text
Black-green daily card
Screenshot hint

Today's Details
Full movement detail table

Back button
```

## Daily Details Content

Add a section below the card, for example:

```text
今日明细
DETAILS

杠铃卧推      5组   MAX 80kg   2400kg   PR
上斜卧推      4组   MAX 60kg   1600kg
绳索夹胸      4组   MAX 15kg    600kg
侧平举        4组   MAX 8kg     320kg
```

If the screen is too narrow, prefer stacked rows instead of a cramped table:

```text
杠铃卧推                       PR
胸
5 组 · MAX 80kg
训练量 2400kg
```

Each row should include:

- Movement name
- Category
- Formal set count
- Max formal-set weight
- Formal-set volume
- PR badge if applicable

## Data Requirements

The daily summary page currently has `recordRows`. Extend it to include:

```js
{
  id,
  name,
  category,
  sets,
  volume,
  maxWeight,
  isWeightPr
}
```

Use the same PR logic as the rest of the project:

- Only formal sets count.
- Warmup sets do not count toward sets, volume, or max weight.
- A PR requires historical formal-set weight.
- Today's formal-set max weight must be greater than the previous historical formal-set max weight.
- Equal weight is not PR.
- If the movement only has historical warmup sets, today's first formal weight is not PR.

If `utils/dailySummary.js` already has `buildRecordDays` or helper logic for PR, reuse or align with it. Avoid duplicating divergent PR rules.

## Visual Requirements

The details section should follow the Carbon black-green style:

- Black background
- Green accent
- Thin borders
- Higher information density than the screenshot card
- Clear row spacing
- No white table
- No dashboard-like complexity
- No text overlap on mobile

The black-green card itself should remain clean and screenshot-friendly.

Do not remove:

- DAY number
- Date
- Focus/category text
- MAX/TIME/TOTAL SETS metrics
- 28-day activity grid
- FitSync brand
- Screenshot hint

If the current card still says `VOLUME(KG)` and that change has not landed yet, keep the planned direction: the card should use `MAX(KG)` for the first large metric, not `VOLUME(KG)`.

## Empty State

If the selected day has no records:

- The card can continue showing `NO TRAINING`.
- The details section should either be hidden or show:

```text
完成训练后会生成今日明细
```

## No Regression

Do not simplify, delete, bypass, or downgrade existing behavior.

Must preserve:

- Training page exercise selection
- Category exercise list
- Frequent exercises
- Custom exercise create/edit/delete
- Current preset exercise personal default override work
- Start sheet target set input
- Start sheet default weight/reps input if already added
- Start sheet rest duration selection
- Set record sheet weight input
- Set record sheet reps input
- Warmup switch
- 1.5s delayed confirm
- Undo toast
- Red undo toast must not get stuck again
- Missed set reminder
- Rest finished hint
- Today training strip
- Daily summary card entry
- Daily summary card page
- Records daily review table
- Records page click-to-expand behavior
- Summary actions:
  - Continue another exercise
  - View today's card

If a change risks any of these, stop and ask instead of forcing through.

## Out Of Scope

Do not implement:

- Automatic rest selection
- Save image / canvas export
- Multiple themes
- Real swipe-up gesture
- Cloud sync
- WeChat login
- Full training plan system
- 1RM estimation
- User-custom PR
- Social feed, leaderboard, or sharing flow
- Training flow refactor

## Tests

Run:

```powershell
node miniprogram\tests\trainingSession.test.js
Get-ChildItem -Path miniprogram -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Expected:

```text
all tests passed
JS syntax check has no errors
```

Add or update tests where appropriate:

- `300` is a valid rest duration.
- `saveRestDurationSeconds(300)` preserves `300`.
- Rest countdown can use `300`.
- Daily details rows include `sets`, `volume`, `maxWeight`, and `isWeightPr`.
- Warmup sets do not affect `sets`, `volume`, or `maxWeight`.
- PR logic does not regress.

## Manual Verification

In WeChat DevTools:

1. Open a preset exercise.
2. Confirm the start sheet includes `300s`.
3. Select `300s` and start training.
4. Record one set and confirm the rest countdown starts from 300 seconds.
5. Complete several movements in one day.
6. Open the daily summary card.
7. Confirm the top card remains clean and screenshot-friendly.
8. Scroll below the card and confirm a complete `今日明细` section appears.
9. Confirm all movements show, not only the first few.
10. Confirm PR, max weight, set count, and volume look correct.

## Git Notes

Do not submit these local files or directories:

```text
.claude/
.superpowers/
FitSync作品说明书.docx
INTERACTION_GUIDE.docx
fitsync-summary-prototypes/
fitsync-summary-prototypes.zip
```

Only submit relevant mini program files.

When done, report:

- Current branch
- Files changed
- Behavior changed
- Test results
- Whether uncommitted local files remain
