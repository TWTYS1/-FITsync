/**
 * 预置动作库
 * 五类：胸、肩、腿、背、腹
 * 数据结构设计为可扩展，后续可接入自定义动作
 */
const exercises = [
  // 胸
  { id: "bench-press", name: "杠铃卧推", category: "chest", categoryName: "胸", targetSets: 5, defaultWeight: 60, defaultReps: 8 },
  { id: "dumbbell-fly", name: "哑铃飞鸟", category: "chest", categoryName: "胸", targetSets: 4, defaultWeight: 14, defaultReps: 12 },

  // 肩
  { id: "shoulder-press", name: "哑铃推举", category: "shoulder", categoryName: "肩", targetSets: 5, defaultWeight: 20, defaultReps: 10 },
  { id: "lateral-raise", name: "侧平举", category: "shoulder", categoryName: "肩", targetSets: 4, defaultWeight: 8, defaultReps: 15 },

  // 腿
  { id: "squat", name: "杠铃深蹲", category: "legs", categoryName: "腿", targetSets: 5, defaultWeight: 80, defaultReps: 8 },
  { id: "leg-press", name: "腿举", category: "legs", categoryName: "腿", targetSets: 4, defaultWeight: 120, defaultReps: 10 },

  // 背
  { id: "pull-up", name: "引体向上", category: "back", categoryName: "背", targetSets: 5, defaultWeight: 0, defaultReps: 8 },
  { id: "barbell-row", name: "杠铃划船", category: "back", categoryName: "背", targetSets: 4, defaultWeight: 60, defaultReps: 10 },

  // 腹
  { id: "crunch", name: "卷腹", category: "abs", categoryName: "腹", targetSets: 4, defaultWeight: 0, defaultReps: 20 },
];

/**
 * 获取所有分类（用于训练页分类导航）
 */
function getCategories() {
  const seen = new Set();
  return exercises
    .filter((e) => {
      if (seen.has(e.category)) return false;
      seen.add(e.category);
      return true;
    })
    .map((e) => ({ key: e.category, name: e.categoryName }));
}

/**
 * 获取某分类下的所有动作
 */
function getExercisesByCategory(category) {
  return exercises.filter((e) => e.category === category);
}

/**
 * 通过 id 获取动作
 */
function getExerciseById(id) {
  return exercises.find((e) => e.id === id);
}

module.exports = {
  exercises,
  getCategories,
  getExercisesByCategory,
  getExerciseById
};
