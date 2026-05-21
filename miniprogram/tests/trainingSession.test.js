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

console.log('all tests passed');
