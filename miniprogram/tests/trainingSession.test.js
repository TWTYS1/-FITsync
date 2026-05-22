const assert = require('assert');
const {
  createSession,
  addSet,
  undoSets,
  getConfirmLabel,
  createRecord
} = require('../utils/trainingSession');

function withMockedNow(times, fn) {
  const originalNow = Date.now;
  let index = 0;
  Date.now = () => times[Math.min(index++, times.length - 1)];
  try {
    fn();
  } finally {
    Date.now = originalNow;
  }
}

const benchPress = {
  id: 'bench-press',
  name: '杠铃卧推',
  categoryName: '胸',
  targetSets: 2,
  defaultWeight: 60,
  defaultReps: 8
};

withMockedNow([1000, 2000, 3000, 4000, 5000], () => {
  const session = createSession(benchPress);
  const withWarmup = addSet(session, 40, 10, true);

  assert.strictEqual(withWarmup.currentSet, 1, 'warmup sets must not advance the formal set number');
  assert.strictEqual(withWarmup.sets.length, 1, 'warmup sets should still be kept in set details');
  assert.strictEqual(withWarmup.sets[0].isWarmup, true);

  const withFirstFormal = addSet(withWarmup, 60, 8, false);
  assert.strictEqual(withFirstFormal.currentSet, 2, 'first formal set should advance to set 2');

  const record = createRecord(withFirstFormal);
  assert.strictEqual(record.totalSets, 1, 'summary totalSets should count formal sets only');
  assert.strictEqual(record.totalVolume, 480, 'summary totalVolume should count formal sets only');
});

withMockedNow([1000, 2000], () => {
  const session = createSession(benchPress);
  const withSet = addSet(session, 62.5, 7, false);
  const undone = undoSets(withSet);

  assert.strictEqual(undone.currentSet, 1);
  assert.strictEqual(undone.lastWeight, 60, 'undoing the first set should restore default weight');
  assert.strictEqual(undone.lastReps, 8, 'undoing the first set should restore default reps');
});

withMockedNow([1000, 2000, 3000], () => {
  const session = createSession(benchPress);
  const withSet = addSet(session, 60, 8, false, 120);

  assert.strictEqual(withSet.restEndTime, 122000, 'custom rest duration should control restEndTime');
});

withMockedNow([1000, 2000, 3000], () => {
  const session = createSession({ ...benchPress, targetSets: 1 });
  const completed = addSet(session, 60, 8, false);
  const undone = undoSets(completed);

  assert.strictEqual(completed.completedAt, 2000, 'single-set session should complete');
  assert.strictEqual(undone.completedAt, null, 'undoing final set should clear completion timestamp');
});

withMockedNow([1000], () => {
  const session = createSession(benchPress, { targetSets: 3 });

  assert.strictEqual(session.targetSets, 3, 'session targetSets should allow per-session override');
});

assert.strictEqual(getConfirmLabel(0), '记录本组');
assert.strictEqual(getConfirmLabel(50), '记录本组');
assert.strictEqual(getConfirmLabel(100), '记录本组');

/* ================================================================
 * Exercise data tests
 * ================================================================ */

const {
  getCategories,
  getExercisesByCategory,
  getExerciseById,
  getFrequentExercises,
  PRESET_EXERCISES,
  CATEGORY_KEYS
} = require('../data/exercises');

// 1. Categories
assert.strictEqual(getCategories().length, 6, 'should have 6 categories');
assert.strictEqual(getCategories()[0].key, 'chest');
assert.strictEqual(getCategories()[5].key, 'core');

// 2. Exercises per category (>= 6 each)
CATEGORY_KEYS.forEach(function (key) {
  var exs = getExercisesByCategory(key, []);
  assert.ok(exs.length >= 6, key + ' should have >= 6 preset exercises');
});

// 3. Role ordering: warmup → main → accessory → isolation
var chestExercises = getExercisesByCategory('chest', []);
var roles = chestExercises.map(function (e) { return e.role; });
var roleOrder = ['warmup', 'main', 'accessory', 'isolation'];
for (var i = 0; i < roleOrder.length; i++) {
  for (var j = i + 1; j < roleOrder.length; j++) {
    var idxI = roles.indexOf(roleOrder[i]);
    var idxJ = roles.indexOf(roleOrder[j]);
    if (idxI >= 0 && idxJ >= 0) {
      assert.ok(idxI < idxJ, roleOrder[i] + ' should come before ' + roleOrder[j]);
    }
  }
}

// 4. getExerciseById finds preset exercises
var ex = getExerciseById('squat', []);
assert.strictEqual(ex.name, '杠铃深蹲');
assert.strictEqual(ex.role, 'main');
assert.strictEqual(ex.source, undefined); // preset doesn't have source field in array, only after merge

// 5. Custom exercises merge with preset
var customs = [
  { id: 'custom_1', name: '测试动作', category: 'chest', categoryName: '胸', role: 'main', roleName: '主项', targetSets: 3, defaultWeight: 30, defaultReps: 10, source: 'custom' }
];
var merged = getExercisesByCategory('chest', customs);
var customFound = merged.find(function (e) { return e.id === 'custom_1'; });
assert.ok(customFound, 'custom exercise should appear in merged list');
assert.strictEqual(customFound.source, 'custom');

// 6. Custom exercise deleted doesn't appear
var empty = getExercisesByCategory('chest', []);
var withCustom = getExercisesByCategory('chest', customs);
assert.strictEqual(withCustom.length, empty.length + 1, 'removing custom should reduce count');

// 7. getFrequentExercises returns recent from records
var records = [
  { exerciseName: '杠铃卧推', categoryName: '胸', completedAt: 3000 },
  { exerciseName: '哑铃飞鸟', categoryName: '胸', completedAt: 2000 },
  { exerciseName: '杠铃深蹲', categoryName: '腿', completedAt: 1000 },
  { exerciseName: '杠铃卧推', categoryName: '胸', completedAt: 4000 }  // duplicate name
];
var freq = getFrequentExercises('chest', records);
assert.strictEqual(freq.length, 2, 'should return at most 2 frequent exercises');
assert.strictEqual(freq[0].name, '杠铃卧推', 'most recent should be first');
assert.strictEqual(freq[1].name, '哑铃飞鸟', 'second most recent should be second');

// 7b. getFrequentExercises returns full custom defaults when available
var customFreq = getFrequentExercises('chest', [
  {
    exerciseId: 'custom_1',
    exerciseName: '测试动作',
    categoryName: '胸',
    exerciseSource: 'custom',
    completedAt: 5000
  }
], customs);
assert.strictEqual(customFreq.length, 1, 'custom frequent exercise should be returned');
assert.strictEqual(customFreq[0].id, 'custom_1');
assert.strictEqual(customFreq[0].defaultWeight, 30, 'custom frequent should keep default weight');
assert.strictEqual(customFreq[0].defaultReps, 10, 'custom frequent should keep default reps');
assert.strictEqual(customFreq[0].source, 'custom');

// 8. getFrequentExercises empty records
var noFreq = getFrequentExercises('chest', []);
assert.strictEqual(noFreq.length, 0, 'empty records should return empty');

/* ================================================================
 * Session / record exerciseId + exerciseSource tests
 * ================================================================ */

withMockedNow([1000, 2000], function () {
  var session = createSession({
    id: 'test-ex',
    name: '测试',
    categoryName: '胸',
    targetSets: 2,
    defaultWeight: 50,
    defaultReps: 10,
    source: 'preset'
  });

  assert.strictEqual(session.exerciseId, 'test-ex');
  assert.strictEqual(session.exerciseSource, 'preset');

  var withSet = addSet(session, 50, 10, false);
  var record = createRecord(withSet);

  assert.strictEqual(record.exerciseId, 'test-ex');
  assert.strictEqual(record.exerciseSource, 'preset');
});

// Custom exercise source in session
withMockedNow([1000], function () {
  var session = createSession({
    id: 'custom_xyz',
    name: '自定义动作',
    categoryName: '胸',
    targetSets: 3,
    defaultWeight: 20,
    defaultReps: 12,
    source: 'custom'
  });

  assert.strictEqual(session.exerciseSource, 'custom');
});

/* ================================================================
 * Daily summary aggregation tests
 * ================================================================ */

const {
  buildDailySummary
} = require('../utils/dailySummary');

var targetDay = new Date(2026, 4, 21, 12, 0, 0).getTime();
var otherDay = new Date(2026, 4, 20, 12, 0, 0).getTime();
var todayRecords = [
  {
    id: 'bench',
    exerciseName: '杠铃卧推',
    categoryName: '胸',
    startedAt: new Date(2026, 4, 21, 19, 0, 0).getTime(),
    completedAt: new Date(2026, 4, 21, 19, 25, 0).getTime(),
    sets: [
      { weight: 40, reps: 10, isWarmup: true },
      { weight: 60, reps: 8, isWarmup: false },
      { weight: 62.5, reps: 8, isWarmup: false }
    ]
  },
  {
    id: 'row',
    exerciseName: '坐姿划船',
    categoryName: '背',
    startedAt: new Date(2026, 4, 21, 19, 35, 0).getTime(),
    completedAt: new Date(2026, 4, 21, 20, 10, 0).getTime(),
    sets: [
      { weight: 50, reps: 10, isWarmup: false },
      { weight: 55, reps: 10, isWarmup: false }
    ]
  },
  {
    id: 'yesterday',
    exerciseName: '杠铃深蹲',
    categoryName: '腿',
    startedAt: otherDay,
    completedAt: otherDay + 30 * 60000,
    sets: [
      { weight: 100, reps: 5, isWarmup: false }
    ]
  }
];

var daily = buildDailySummary(todayRecords, targetDay);
assert.strictEqual(daily.dateKey, '2026-05-21', 'daily summary should use local date key');
assert.strictEqual(daily.records.length, 2, 'daily summary should include only target day records');
assert.strictEqual(daily.exerciseCount, 2, 'daily summary should count unique exercises');
assert.deepStrictEqual(daily.categoryNames, ['胸', '背'], 'daily summary should keep category order by first appearance');
assert.strictEqual(daily.totalSets, 4, 'daily summary should count formal sets only');
assert.strictEqual(daily.totalVolume, 2030, 'daily summary should exclude warmup volume');
assert.strictEqual(daily.totalDurationMinutes, 60, 'daily summary should sum per-record durations');
assert.strictEqual(daily.startedAt, new Date(2026, 4, 21, 19, 0, 0).getTime());
assert.strictEqual(daily.completedAt, new Date(2026, 4, 21, 20, 10, 0).getTime());
assert.strictEqual(daily.historyGrid28Days.length, 28, 'history grid should cover 28 days');
assert.strictEqual(daily.historyGrid28Days[26].active, true, 'previous training day should be active');
assert.strictEqual(daily.historyGrid28Days[27].active, true, 'target day should be active');

/* ================================================================
 * Training page regression tests
 * ================================================================ */

const fs = require('fs');
const path = require('path');
const trainingPageSource = fs.readFileSync(path.join(__dirname, '../pages/training/training.js'), 'utf8');
const finishSummaryMatch = trainingPageSource.match(/onFinishSummary\(\) \{[\s\S]*?\n  \},/);
assert.ok(finishSummaryMatch, 'training page should define onFinishSummary');
assert.ok(
  /undoToast:\s*null/.test(finishSummaryMatch[0]),
  'leaving summary to continue training should clear undo toast state'
);

/* ================================================================
 * buildRecordDays tests
 * ================================================================ */

const {
  buildRecordDays
} = require('../utils/dailySummary');

var day1 = new Date(2026, 4, 20, 19, 0, 0).getTime();
var day2 = new Date(2026, 4, 21, 19, 0, 0).getTime();
var multiDayRecords = [
  {
    id: 'a',
    exerciseName: '杠铃卧推',
    categoryName: '胸',
    startedAt: day1,
    completedAt: day1 + 25 * 60000,
    sets: [
      { weight: 40, reps: 10, isWarmup: true },
      { weight: 60, reps: 8, isWarmup: false },
      { weight: 65, reps: 6, isWarmup: false }
    ]
  },
  {
    id: 'b',
    exerciseName: '坐姿划船',
    categoryName: '背',
    startedAt: day1 + 5 * 60000,
    completedAt: day1 + 35 * 60000,
    sets: [
      { weight: 50, reps: 10, isWarmup: false },
      { weight: 55, reps: 8, isWarmup: false }
    ]
  },
  {
    id: 'c',
    exerciseName: '杠铃卧推',
    categoryName: '胸',
    startedAt: day2,
    completedAt: day2 + 20 * 60000,
    sets: [
      { weight: 60, reps: 8, isWarmup: false },
      { weight: 70, reps: 5, isWarmup: false }
    ]
  },
  {
    id: 'd',
    exerciseName: '哑铃弯举',
    categoryName: '手臂',
    startedAt: day2 + 5 * 60000,
    completedAt: day2 + 15 * 60000,
    sets: [
      { weight: 12, reps: 12, isWarmup: false },
      { weight: 12, reps: 10, isWarmup: false }
    ]
  }
];

var days = buildRecordDays(multiDayRecords);
assert.strictEqual(days.length, 2, 'two distinct days should produce 2 day entries');
assert.strictEqual(days[0].dateKey, '2026-05-21', 'newest day should be first');
assert.strictEqual(days[1].dateKey, '2026-05-20', 'oldest day should be last');

// Day 2 (newest) checks
var day2Entry = days[0];
assert.strictEqual(day2Entry.exerciseCount, 2);
assert.strictEqual(day2Entry.totalSets, 4, 'day 2 total formal sets');
assert.strictEqual(day2Entry.totalVolume, 60 * 8 + 70 * 5 + 12 * 12 + 12 * 10, 'day 2 total volume excludes warmup');
assert.strictEqual(day2Entry.totalDurationMinutes, 30);
assert.strictEqual(day2Entry.maxWeight, 70, 'day 2 max weight across all exercises');

// Day 1 checks
var day1Entry = days[1];
assert.strictEqual(day1Entry.exerciseCount, 2);
assert.strictEqual(day1Entry.totalSets, 4, 'day 1 total formal sets (2+2)');
assert.strictEqual(day1Entry.totalVolume, 60 * 8 + 65 * 6 + 50 * 10 + 55 * 8, 'day 1 total volume');
assert.strictEqual(day1Entry.maxWeight, 65);

// Exercise row checks — Day 2 bench press
var benchDay2 = day2Entry.exerciseRows.find(function (r) { return r.exerciseName === '杠铃卧推'; });
assert.ok(benchDay2, 'bench press should appear on day 2');
assert.strictEqual(benchDay2.sets, 2);
assert.strictEqual(benchDay2.volume, 60 * 8 + 70 * 5);
assert.strictEqual(benchDay2.maxWeight, 70);

// PR: bench on day 2 (max 70) > day 1 max (65) → PR
assert.strictEqual(benchDay2.isWeightPr, true, '70 > 65 should be a weight PR');

// No PR for new exercise: 哑铃弯举 only appears on day 2, no history → no PR
var curlDay2 = day2Entry.exerciseRows.find(function (r) { return r.exerciseName === '哑铃弯举'; });
assert.ok(curlDay2);
assert.strictEqual(curlDay2.isWeightPr, false, 'new exercise with no history should not be PR');

// No PR for bench on day 1 (first occurrence in dataset)
var benchDay1 = day1Entry.exerciseRows.find(function (r) { return r.exerciseName === '杠铃卧推'; });
assert.ok(benchDay1);
assert.strictEqual(benchDay1.isWeightPr, false, 'first occurrence should not be PR');

// Equal max weight — no PR
var sameWeightRecords = [
  {
    id: 'e1',
    exerciseName: '杠铃深蹲',
    categoryName: '腿',
    startedAt: day1,
    completedAt: day1 + 30 * 60000,
    sets: [{ weight: 100, reps: 5, isWarmup: false }]
  },
  {
    id: 'e2',
    exerciseName: '杠铃深蹲',
    categoryName: '腿',
    startedAt: day2,
    completedAt: day2 + 30 * 60000,
    sets: [{ weight: 100, reps: 5, isWarmup: false }]
  }
];
var sameDays = buildRecordDays(sameWeightRecords);
var squatDay2 = sameDays[0].exerciseRows.find(function (r) { return r.exerciseName === '杠铃深蹲'; });
assert.strictEqual(squatDay2.isWeightPr, false, 'equal weight should not be PR');

// Warmup excluded from max weight
var warmupOnlyRecords = [
  {
    id: 'w1',
    exerciseName: '热身测试',
    categoryName: '胸',
    startedAt: day1,
    completedAt: day1 + 10 * 60000,
    sets: [{ weight: 100, reps: 5, isWarmup: true }]
  },
  {
    id: 'w2',
    exerciseName: '热身测试',
    categoryName: '胸',
    startedAt: day2,
    completedAt: day2 + 10 * 60000,
    sets: [{ weight: 10, reps: 10, isWarmup: false }]
  }
];
var warmupDays = buildRecordDays(warmupOnlyRecords);
var warmupEx = warmupDays[0].exerciseRows.find(function (r) { return r.exerciseName === '热身测试'; });
assert.strictEqual(warmupEx.maxWeight, 10, 'warmup should not count toward max weight');
assert.strictEqual(warmupEx.isWeightPr, true, '10 > 0 (no historical formal weight) should be PR');
assert.strictEqual(warmupDays[1].exerciseRows[0].maxWeight, 0, 'day with only warmup should have maxWeight 0');

// Empty records
var emptyDays = buildRecordDays([]);
assert.strictEqual(emptyDays.length, 0, 'empty records should produce empty array');

// Records page exports check
var recordsSource = fs.readFileSync(path.join(__dirname, '../pages/records/records.js'), 'utf8');
assert.ok(/buildRecordDays/.test(recordsSource), 'records page should import buildRecordDays');
assert.ok(/onToggleDay/.test(recordsSource), 'records page should define onToggleDay');
assert.ok(/expandedDateKey/.test(recordsSource), 'records page should track expandedDateKey');
assert.ok(/onOpenTodaySummary/.test(recordsSource), 'records page should still define onOpenTodaySummary');

/* ================================================================
 * Exercise overrides tests
 * ================================================================ */

// Minimal wx mock for storage functions in Node
var wxStorage = {};
global.wx = {
  getStorageSync: function (key) { return wxStorage[key]; },
  setStorageSync: function (key, value) { wxStorage[key] = value; },
  removeStorageSync: function (key) { delete wxStorage[key]; }
};

var storageModule = require('../utils/storage');
var applyExerciseOverride = storageModule.applyExerciseOverride;
var applyExerciseOverrides = storageModule.applyExerciseOverrides;
var saveExerciseOverride = storageModule.saveExerciseOverride;
var getExerciseOverride = storageModule.getExerciseOverride;
var getExerciseOverrides = storageModule.getExerciseOverrides;

// No overrides yet — values should stay unchanged
var testEx = { id: 'bench-press', name: '杠铃卧推', targetSets: 3, defaultWeight: 60, defaultReps: 8 };
var result = applyExerciseOverride(testEx);
assert.strictEqual(result.targetSets, 3, 'no override should keep targetSets');
assert.strictEqual(result.defaultWeight, 60, 'no override should keep defaultWeight');
assert.strictEqual(result.defaultReps, 8, 'no override should keep defaultReps');

var resultList = applyExerciseOverrides([testEx]);
assert.strictEqual(resultList.length, 1);
assert.strictEqual(resultList[0].defaultWeight, 60);

// Save override and verify it applies
saveExerciseOverride('bench-press', { targetSets: 5, defaultWeight: 72.5, defaultReps: 10 });
var override = getExerciseOverride('bench-press');
assert.strictEqual(override.targetSets, 5);
assert.strictEqual(override.defaultWeight, 72.5);
assert.strictEqual(override.defaultReps, 10);

var overridden = applyExerciseOverride(testEx);
assert.strictEqual(overridden.targetSets, 5, 'overridden targetSets should apply');
assert.strictEqual(overridden.defaultWeight, 72.5, 'overridden defaultWeight should apply');
assert.strictEqual(overridden.defaultReps, 10, 'overridden defaultReps should apply');

// Override should not affect other exercises
var otherEx = { id: 'squat', name: '杠铃深蹲', targetSets: 4, defaultWeight: 80, defaultReps: 5 };
var otherResult = applyExerciseOverride(otherEx);
assert.strictEqual(otherResult.targetSets, 4, 'other exercise should keep its own targetSets');
assert.strictEqual(otherResult.defaultWeight, 80, 'other exercise should keep its own defaultWeight');

// Normalization: targetSets clamped 1-10
saveExerciseOverride('test-clamp', { targetSets: 99, defaultWeight: -5, defaultReps: 0 });
var clamped = getExerciseOverride('test-clamp');
assert.strictEqual(clamped.targetSets, 10, 'targetSets should clamp to 10');
assert.strictEqual(clamped.defaultWeight, 0, 'negative weight should clamp to 0');
assert.strictEqual(clamped.defaultReps, 1, 'zero reps should clamp to 1');

// applyExerciseOverride on null returns null, no-id object returns itself
assert.strictEqual(applyExerciseOverride(null), null);
var noId = applyExerciseOverride({});
assert.strictEqual(typeof noId, 'object', 'exercise without id should return as-is');

// applyExerciseOverrides on empty array
assert.deepStrictEqual(applyExerciseOverrides([]), []);

// Clean up wx mock
delete global.wx;

// Training page source checks
var trainingSource = fs.readFileSync(path.join(__dirname, '../pages/training/training.js'), 'utf8');
assert.ok(/saveExerciseOverride/.test(trainingSource), 'training page should import saveExerciseOverride');
assert.ok(/applyExerciseOverrides/.test(trainingSource), 'training page should import applyExerciseOverrides');
assert.ok(/applyExerciseOverride/.test(trainingSource), 'training page should import applyExerciseOverride');
assert.ok(/startDefaultWeight/.test(trainingSource), 'start sheet should have defaultWeight field');
assert.ok(/startDefaultReps/.test(trainingSource), 'start sheet should have defaultReps field');
assert.ok(/saveAsDefault/.test(trainingSource), 'start sheet should have saveAsDefault switch');
assert.ok(/onToggleSaveAsDefault/.test(trainingSource), 'should define toggle save handler');
assert.ok(/onStartWeightMinus/.test(trainingSource), 'should define start weight stepper');
assert.ok(/onStartRepsPlus/.test(trainingSource), 'should define start reps stepper');

console.log('all tests passed');
