function pad2(value) {
  return String(value).padStart(2, '0');
}

function startOfLocalDay(input) {
  const date = input ? new Date(input) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getDateKey(input) {
  const date = new Date(startOfLocalDay(input));
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getDisplayDate(input) {
  const date = new Date(startOfLocalDay(input));
  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
}

function getWeekday(input) {
  const names = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return names[new Date(startOfLocalDay(input)).getDay()];
}

function isSameLocalDay(timestamp, dayStart) {
  if (!timestamp) return false;
  const start = startOfLocalDay(timestamp);
  return start === dayStart;
}

function getFormalSets(record) {
  return (record.sets || []).filter((set) => !set.isWarmup);
}

function getRecordVolume(record) {
  return getFormalSets(record).reduce((sum, set) => {
    return sum + (Number(set.weight) || 0) * (Number(set.reps) || 0);
  }, 0);
}

function getRecordDurationMinutes(record) {
  if (!record.startedAt || !record.completedAt || record.completedAt < record.startedAt) return 0;
  return Math.round((record.completedAt - record.startedAt) / 60000);
}

function uniqueInOrder(values) {
  const seen = {};
  return values.filter((value) => {
    if (!value || seen[value]) return false;
    seen[value] = true;
    return true;
  });
}

function buildHistoryGrid28Days(records, targetDate) {
  const targetStart = startOfLocalDay(targetDate);
  const activeDays = {};

  records.forEach((record) => {
    const timestamp = record.startedAt || record.completedAt;
    if (!timestamp) return;
    activeDays[getDateKey(timestamp)] = true;
  });

  return Array.from({ length: 28 }, (_, index) => {
    const dayStart = targetStart - (27 - index) * 24 * 60 * 60 * 1000;
    const dateKey = getDateKey(dayStart);
    return {
      dateKey,
      active: !!activeDays[dateKey]
    };
  });
}

function buildDailySummary(records, targetDate) {
  const allRecords = Array.isArray(records) ? records : [];
  const dayStart = startOfLocalDay(targetDate);
  const dayRecords = allRecords
    .filter((record) => isSameLocalDay(record.startedAt || record.completedAt, dayStart))
    .sort((a, b) => (a.startedAt || a.completedAt || 0) - (b.startedAt || b.completedAt || 0));

  const totalSets = dayRecords.reduce((sum, record) => sum + getFormalSets(record).length, 0);
  const totalVolume = dayRecords.reduce((sum, record) => sum + getRecordVolume(record), 0);
  const totalDurationMinutes = dayRecords.reduce((sum, record) => sum + getRecordDurationMinutes(record), 0);
  const startedTimes = dayRecords.map((record) => record.startedAt).filter(Boolean);
  const completedTimes = dayRecords.map((record) => record.completedAt).filter(Boolean);
  const exerciseNames = uniqueInOrder(dayRecords.map((record) => record.exerciseName));
  const categoryNames = uniqueInOrder(dayRecords.map((record) => record.categoryName));
  const activeDayCount = uniqueInOrder(allRecords
    .map((record) => record.startedAt || record.completedAt)
    .filter(Boolean)
    .map((timestamp) => getDateKey(timestamp))).length;

  return {
    dateKey: getDateKey(dayStart),
    date: getDisplayDate(dayStart),
    weekday: getWeekday(dayStart),
    dayNumber: activeDayCount,
    records: dayRecords,
    exerciseCount: exerciseNames.length,
    exerciseNames,
    categoryNames,
    totalSets,
    totalVolume,
    totalDurationMinutes,
    startedAt: startedTimes.length ? Math.min.apply(null, startedTimes) : null,
    completedAt: completedTimes.length ? Math.max.apply(null, completedTimes) : null,
    historyGrid28Days: buildHistoryGrid28Days(allRecords, dayStart)
  };
}

module.exports = {
  buildDailySummary,
  buildHistoryGrid28Days,
  getDateKey
};
