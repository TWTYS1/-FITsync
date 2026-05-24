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

function selectFeaturedExercises(exercises) {
  const rows = Array.isArray(exercises) ? exercises.slice() : [];
  if (!rows.length) return [];

  const prRows = rows
    .filter(function (row) { return row.isWeightPr; })
    .sort(function (a, b) { return b.maxWeight - a.maxWeight; });

  if (!prRows.length) {
    return rows.sort(function (a, b) { return b.maxWeight - a.maxWeight; }).slice(0, 2);
  }

  const picked = [prRows[0]];
  const remaining = rows
    .filter(function (row) { return row.name !== picked[0].name; })
    .sort(function (a, b) { return b.maxWeight - a.maxWeight; });

  if (remaining.length) picked.push(remaining[0]);
  return picked;
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

  var dayMaxWeight = 0;
  var hasWeightPr = false;
  var dayDateKey = getDateKey(dayStart);
  exerciseNames.forEach(function (exName) {
    var exRecords = dayRecords.filter(function (r) { return r.exerciseName === exName; });
    var allSets = [];
    exRecords.forEach(function (r) {
      (r.sets || []).forEach(function (s) { allSets.push(s); });
    });
    var formalSets = allSets.filter(function (s) { return !s.isWarmup; });
    var exMaxWeight = formalSets.length > 0
      ? Math.max.apply(null, formalSets.map(function (s) { return Number(s.weight) || 0; }))
      : 0;
    if (exMaxWeight > dayMaxWeight) dayMaxWeight = exMaxWeight;
    if (exMaxWeight > 0) {
      var hist = getExerciseHistoricalMaxWeight(allRecords, exName, dayDateKey);
      if (hist.hasFormalHistory && exMaxWeight > hist.maxWeight) hasWeightPr = true;
    }
  });

  var allFeaturedExercises = [];
  exerciseNames.forEach(function (exName) {
    var exRecords = dayRecords.filter(function (r) { return r.exerciseName === exName; });
    var allSets = [];
    exRecords.forEach(function (r) {
      (r.sets || []).forEach(function (s) { allSets.push(s); });
    });
    var formalSets = allSets.filter(function (s) { return !s.isWarmup; });
    var exMaxWeight = formalSets.length > 0
      ? Math.max.apply(null, formalSets.map(function (s) { return Number(s.weight) || 0; }))
      : 0;
    var exHist = getExerciseHistoricalMaxWeight(allRecords, exName, dayDateKey);
    var exIsPr = exMaxWeight > 0 && exHist.hasFormalHistory && exMaxWeight > exHist.maxWeight;
    var exVolume = formalSets.reduce(function (sum, s) {
      return sum + (Number(s.weight) || 0) * (Number(s.reps) || 0);
    }, 0);
    allFeaturedExercises.push({
      name: exName,
      categoryName: exRecords[0].categoryName || '',
      sets: formalSets.length,
      volume: exVolume,
      maxWeight: exMaxWeight,
      isWeightPr: exIsPr
    });
  });
  var featuredExercises = selectFeaturedExercises(allFeaturedExercises);
  var hasMoreFeaturedExercises = allFeaturedExercises.length > featuredExercises.length;

  return {
    dateKey: dayDateKey,
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
    maxWeight: dayMaxWeight,
    hasWeightPr: hasWeightPr,
    featuredExercises: featuredExercises,
    hasMoreFeaturedExercises: hasMoreFeaturedExercises,
    startedAt: startedTimes.length ? Math.min.apply(null, startedTimes) : null,
    completedAt: completedTimes.length ? Math.max.apply(null, completedTimes) : null,
    historyGrid28Days: buildHistoryGrid28Days(allRecords, dayStart)
  };
}

function getExerciseHistoricalMaxWeight(records, exerciseName, beforeDateKey) {
  var maxWeight = 0;
  var hasFormalHistory = false;
  (Array.isArray(records) ? records : []).forEach(function (record) {
    if (record.exerciseName !== exerciseName) return;
    var recordDateKey = getDateKey(record.startedAt || record.completedAt);
    if (!recordDateKey || recordDateKey >= beforeDateKey) return;
    (record.sets || []).forEach(function (set) {
      if (set.isWarmup) return;
      hasFormalHistory = true;
      var w = Number(set.weight) || 0;
      if (w > maxWeight) maxWeight = w;
    });
  });
  return { maxWeight: maxWeight, hasFormalHistory: hasFormalHistory };
}

function buildRecordDays(records) {
  var allRecords = Array.isArray(records) ? records : [];

  var dayMap = {};
  allRecords.forEach(function (record) {
    var timestamp = record.startedAt || record.completedAt;
    if (!timestamp) return;
    var dk = getDateKey(timestamp);
    if (!dayMap[dk]) dayMap[dk] = [];
    dayMap[dk].push(record);
  });

  var dateKeys = Object.keys(dayMap).sort(function (a, b) {
    if (a > b) return -1;
    if (a < b) return 1;
    return 0;
  });

  return dateKeys.map(function (dateKey) {
    var dayRecords = dayMap[dateKey];

    dayRecords.sort(function (a, b) {
      return (a.startedAt || a.completedAt || 0) - (b.startedAt || b.completedAt || 0);
    });

    var exerciseNames = uniqueInOrder(dayRecords.map(function (r) { return r.exerciseName; }));
    var exerciseRows = exerciseNames.map(function (exName) {
      var exRecords = dayRecords.filter(function (r) { return r.exerciseName === exName; });
      var allSets = [];
      exRecords.forEach(function (r) {
        (r.sets || []).forEach(function (s) { allSets.push(s); });
      });

      var formalSets = allSets.filter(function (s) { return !s.isWarmup; });
      var volume = formalSets.reduce(function (sum, s) {
        return sum + (Number(s.weight) || 0) * (Number(s.reps) || 0);
      }, 0);
      var maxWeight = formalSets.length > 0
        ? Math.max.apply(null, formalSets.map(function (s) { return Number(s.weight) || 0; }))
        : 0;

      var hist = getExerciseHistoricalMaxWeight(allRecords, exName, dateKey);
      var isWeightPr = maxWeight > 0 && hist.hasFormalHistory && maxWeight > hist.maxWeight;

      return {
        exerciseName: exName,
        categoryName: exRecords[0].categoryName || '',
        sets: formalSets.length,
        volume: volume,
        maxWeight: maxWeight,
        isWeightPr: isWeightPr
      };
    });

    var totalSets = exerciseRows.reduce(function (sum, row) { return sum + row.sets; }, 0);
    var totalVolume = exerciseRows.reduce(function (sum, row) { return sum + row.volume; }, 0);
    var totalDurationMinutes = dayRecords.reduce(function (sum, r) {
      return sum + getRecordDurationMinutes(r);
    }, 0);
    var dayMaxWeight = exerciseRows.reduce(function (max, row) {
      return row.maxWeight > max ? row.maxWeight : max;
    }, 0);

    return {
      dateKey: dateKey,
      records: dayRecords,
      exerciseCount: exerciseNames.length,
      exerciseNames: exerciseNames,
      totalSets: totalSets,
      totalVolume: totalVolume,
      totalDurationMinutes: totalDurationMinutes,
      maxWeight: dayMaxWeight,
      exerciseRows: exerciseRows
    };
  });
}

module.exports = {
  buildDailySummary,
  buildHistoryGrid28Days,
  buildRecordDays,
  getDateKey,
  getExerciseHistoricalMaxWeight
};
