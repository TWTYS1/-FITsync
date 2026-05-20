const assert = require('assert');
const {
  createSession,
  addSet,
  undoSets,
  getFightLabel,
  getFightFontSize,
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

assert.strictEqual(getFightLabel(0), 'FIGHT!');
assert.strictEqual(getFightLabel(33), 'FIGHT!');
assert.strictEqual(getFightLabel(34), 'FIGHT!!');
assert.strictEqual(getFightLabel(66), 'FIGHT!!');
assert.strictEqual(getFightLabel(67), 'FIGHT!!!');
assert.strictEqual(getFightLabel(99), 'FIGHT!!!');
assert.strictEqual(getFightLabel(100), 'FIGHT!!!!');

assert.strictEqual(getFightFontSize(0), 32);
assert.strictEqual(getFightFontSize(33), 32);
assert.strictEqual(getFightFontSize(34), 38);
assert.strictEqual(getFightFontSize(66), 38);
assert.strictEqual(getFightFontSize(67), 44);
assert.strictEqual(getFightFontSize(99), 44);
assert.strictEqual(getFightFontSize(100), 50);

console.log('trainingSession tests passed');
