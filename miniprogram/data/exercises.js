/**
 * FitSync 动作库
 *
 * 六类：胸 / 背 / 肩 / 腿 / 手臂 / 核心
 * 角色：热身 / 主项 / 辅项 / 孤立
 *
 * 预置动作 source = 'preset'，自定义动作 source = 'custom'
 * 统一通过 getMergedExercises() 获取合并后列表
 */

const ROLE = {
  warmup: '热身',
  main: '主项',
  accessory: '辅项',
  isolation: '孤立'
};

const ROLE_ORDER = ['warmup', 'main', 'accessory', 'isolation'];

const CATEGORY_MAP = {
  chest: '胸',
  back: '背',
  shoulder: '肩',
  legs: '腿',
  arms: '手臂',
  core: '核心'
};

const CATEGORY_KEYS = ['chest', 'back', 'shoulder', 'legs', 'arms', 'core'];

/* ================================================================
 * 预置动作库 (~40 个)
 * ================================================================ */

const PRESET_EXERCISES = [
  // ---- 胸 ----
  { id: 'bench-press',       name: '杠铃卧推',     category: 'chest',    categoryName: '胸', role: 'main',        roleName: ROLE.main,        targetSets: 5,  defaultWeight: 60,  defaultReps: 8  },
  { id: 'db-bench-press',    name: '哑铃卧推',     category: 'chest',    categoryName: '胸', role: 'main',        roleName: ROLE.main,        targetSets: 5,  defaultWeight: 28,  defaultReps: 10 },
  { id: 'incline-bench',     name: '上斜杠铃卧推', category: 'chest',    categoryName: '胸', role: 'main',        roleName: ROLE.main,        targetSets: 4,  defaultWeight: 50,  defaultReps: 8  },
  { id: 'db-fly',            name: '哑铃飞鸟',     category: 'chest',    categoryName: '胸', role: 'isolation',   roleName: ROLE.isolation,   targetSets: 4,  defaultWeight: 14,  defaultReps: 12 },
  { id: 'cable-fly',         name: '绳索夹胸',     category: 'chest',    categoryName: '胸', role: 'isolation',   roleName: ROLE.isolation,   targetSets: 4,  defaultWeight: 10,  defaultReps: 15 },
  { id: 'dip',               name: '双杠臂屈伸',   category: 'chest',    categoryName: '胸', role: 'accessory',   roleName: ROLE.accessory,   targetSets: 4,  defaultWeight: 0,   defaultReps: 10 },
  { id: 'push-up',           name: '俯卧撑',       category: 'chest',    categoryName: '胸', role: 'warmup',      roleName: ROLE.warmup,      targetSets: 3,  defaultWeight: 0,   defaultReps: 15 },

  // ---- 背 ----
  { id: 'pull-up',           name: '引体向上',     category: 'back',     categoryName: '背', role: 'main',        roleName: ROLE.main,        targetSets: 5,  defaultWeight: 0,   defaultReps: 8  },
  { id: 'barbell-row',       name: '杠铃划船',     category: 'back',     categoryName: '背', role: 'main',        roleName: ROLE.main,        targetSets: 5,  defaultWeight: 60,  defaultReps: 8  },
  { id: 'lat-pulldown',      name: '高位下拉',     category: 'back',     categoryName: '背', role: 'main',        roleName: ROLE.main,        targetSets: 5,  defaultWeight: 45,  defaultReps: 10 },
  { id: 'seated-row',        name: '坐姿划船',     category: 'back',     categoryName: '背', role: 'accessory',   roleName: ROLE.accessory,   targetSets: 4,  defaultWeight: 40,  defaultReps: 12 },
  { id: 'db-row',            name: '哑铃划船',     category: 'back',     categoryName: '背', role: 'accessory',   roleName: ROLE.accessory,   targetSets: 4,  defaultWeight: 26,  defaultReps: 10 },
  { id: 'straight-arm-pd',   name: '直臂下压',     category: 'back',     categoryName: '背', role: 'isolation',   roleName: ROLE.isolation,   targetSets: 4,  defaultWeight: 15,  defaultReps: 15 },
  { id: 'face-pull',         name: '面拉',         category: 'back',     categoryName: '背', role: 'warmup',      roleName: ROLE.warmup,      targetSets: 3,  defaultWeight: 10,  defaultReps: 15 },

  // ---- 肩 ----
  { id: 'db-shoulder-press', name: '哑铃推举',     category: 'shoulder', categoryName: '肩', role: 'main',        roleName: ROLE.main,        targetSets: 5,  defaultWeight: 20,  defaultReps: 10 },
  { id: 'bb-shoulder-press', name: '杠铃推举',     category: 'shoulder', categoryName: '肩', role: 'main',        roleName: ROLE.main,        targetSets: 5,  defaultWeight: 40,  defaultReps: 8  },
  { id: 'lateral-raise',     name: '侧平举',       category: 'shoulder', categoryName: '肩', role: 'isolation',   roleName: ROLE.isolation,   targetSets: 4,  defaultWeight: 8,   defaultReps: 15 },
  { id: 'front-raise',       name: '前平举',       category: 'shoulder', categoryName: '肩', role: 'isolation',   roleName: ROLE.isolation,   targetSets: 4,  defaultWeight: 8,   defaultReps: 15 },
  { id: 'rear-delt-fly',     name: '俯身飞鸟',     category: 'shoulder', categoryName: '肩', role: 'isolation',   roleName: ROLE.isolation,   targetSets: 4,  defaultWeight: 6,   defaultReps: 15 },
  { id: 'pike-push-up',      name: '倒立撑',       category: 'shoulder', categoryName: '肩', role: 'accessory',   roleName: ROLE.accessory,   targetSets: 4,  defaultWeight: 0,   defaultReps: 8  },
  { id: 'band-external-rot', name: '弹力带肩外旋', category: 'shoulder', categoryName: '肩', role: 'warmup',      roleName: ROLE.warmup,      targetSets: 2,  defaultWeight: 0,   defaultReps: 15 },

  // ---- 腿 ----
  { id: 'squat',             name: '杠铃深蹲',     category: 'legs',     categoryName: '腿', role: 'main',        roleName: ROLE.main,        targetSets: 5,  defaultWeight: 80,  defaultReps: 8  },
  { id: 'leg-press',         name: '腿举',         category: 'legs',     categoryName: '腿', role: 'main',        roleName: ROLE.main,        targetSets: 4,  defaultWeight: 120, defaultReps: 10 },
  { id: 'romanian-dl',       name: '罗马尼亚硬拉', category: 'legs',     categoryName: '腿', role: 'main',        roleName: ROLE.main,        targetSets: 5,  defaultWeight: 80,  defaultReps: 8  },
  { id: 'leg-extension',     name: '腿屈伸',       category: 'legs',     categoryName: '腿', role: 'isolation',   roleName: ROLE.isolation,   targetSets: 4,  defaultWeight: 45,  defaultReps: 15 },
  { id: 'leg-curl',          name: '腿弯举',       category: 'legs',     categoryName: '腿', role: 'isolation',   roleName: ROLE.isolation,   targetSets: 4,  defaultWeight: 35,  defaultReps: 15 },
  { id: 'bulgarian-split',   name: '保加利亚分腿蹲', category: 'legs',   categoryName: '腿', role: 'accessory',   roleName: ROLE.accessory,   targetSets: 4,  defaultWeight: 20,  defaultReps: 10 },
  { id: 'hip-thrust',        name: '臀推',         category: 'legs',     categoryName: '腿', role: 'accessory',   roleName: ROLE.accessory,   targetSets: 4,  defaultWeight: 60,  defaultReps: 12 },
  { id: 'bodyweight-squat',  name: '空蹲',         category: 'legs',     categoryName: '腿', role: 'warmup',      roleName: ROLE.warmup,      targetSets: 2,  defaultWeight: 0,   defaultReps: 15 },

  // ---- 手臂 ----
  { id: 'barbell-curl',      name: '杠铃弯举',     category: 'arms',     categoryName: '手臂', role: 'main',      roleName: ROLE.main,        targetSets: 4,  defaultWeight: 25,  defaultReps: 10 },
  { id: 'db-curl',           name: '哑铃弯举',     category: 'arms',     categoryName: '手臂', role: 'isolation', roleName: ROLE.isolation,   targetSets: 4,  defaultWeight: 12,  defaultReps: 12 },
  { id: 'hammer-curl',       name: '锤式弯举',     category: 'arms',     categoryName: '手臂', role: 'isolation', roleName: ROLE.isolation,   targetSets: 4,  defaultWeight: 12,  defaultReps: 12 },
  { id: 'close-grip-bench',  name: '窄距卧推',     category: 'arms',     categoryName: '手臂', role: 'main',      roleName: ROLE.main,        targetSets: 4,  defaultWeight: 45,  defaultReps: 10 },
  { id: 'tricep-pushdown',   name: '绳索下压',     category: 'arms',     categoryName: '手臂', role: 'isolation', roleName: ROLE.isolation,   targetSets: 4,  defaultWeight: 18,  defaultReps: 15 },
  { id: 'skull-crusher',     name: '仰卧臂屈伸',   category: 'arms',     categoryName: '手臂', role: 'accessory', roleName: ROLE.accessory,   targetSets: 4,  defaultWeight: 25,  defaultReps: 12 },
  { id: 'wrist-curl',        name: '腕弯举',       category: 'arms',     categoryName: '手臂', role: 'accessory', roleName: ROLE.accessory,   targetSets: 3,  defaultWeight: 15,  defaultReps: 15 },

  // ---- 核心 ----
  { id: 'crunch',            name: '卷腹',         category: 'core',     categoryName: '核心', role: 'main',      roleName: ROLE.main,        targetSets: 4,  defaultWeight: 0,   defaultReps: 20 },
  { id: 'plank',             name: '平板支撑',     category: 'core',     categoryName: '核心', role: 'accessory', roleName: ROLE.accessory,   targetSets: 3,  defaultWeight: 0,   defaultReps: 1  },
  { id: 'hanging-leg-raise', name: '悬垂举腿',     category: 'core',     categoryName: '核心', role: 'main',      roleName: ROLE.main,        targetSets: 4,  defaultWeight: 0,   defaultReps: 12 },
  { id: 'russian-twist',     name: '俄罗斯转体',   category: 'core',     categoryName: '核心', role: 'isolation', roleName: ROLE.isolation,   targetSets: 4,  defaultWeight: 0,   defaultReps: 20 },
  { id: 'lying-leg-raise',   name: '仰卧抬腿',     category: 'core',     categoryName: '核心', role: 'accessory', roleName: ROLE.accessory,   targetSets: 4,  defaultWeight: 0,   defaultReps: 15 },
  { id: 'side-plank',        name: '侧平板',       category: 'core',     categoryName: '核心', role: 'accessory', roleName: ROLE.accessory,   targetSets: 3,  defaultWeight: 0,   defaultReps: 1  },
];

/* ================================================================
 * 工具函数
 * ================================================================ */

/**
 * 合并预置动作 + 自定义动作
 * @param {Array} customExercises - 来自 localStorage 的自定义动作
 */
function getMergedExercises(customExercises) {
  const customs = (customExercises || []).map(function (e) {
    return Object.assign({}, e, { source: 'custom' });
  });
  return PRESET_EXERCISES.concat(customs);
}

/**
 * 获取所有分类（按 CATEGORY_KEYS 顺序）
 */
function getCategories() {
  return CATEGORY_KEYS.map(function (key) {
    return { key: key, name: CATEGORY_MAP[key] };
  });
}

/**
 * 获取某分类下的全部动作（预置 + 自定义），按角色排序
 */
function getExercisesByCategory(category, customExercises) {
  return getMergedExercises(customExercises)
    .filter(function (e) { return e.category === category; })
    .sort(function (a, b) {
      var ai = ROLE_ORDER.indexOf(a.role);
      var bi = ROLE_ORDER.indexOf(b.role);
      if (ai !== bi) return ai - bi;
      // 同角色内预置优先
      if (a.source !== b.source) return a.source === 'preset' ? -1 : 1;
      return 0;
    });
}

/**
 * 通过 id 获取动作（先在预置中找，再在自定义中找）
 */
function getExerciseById(id, customExercises) {
  var merged = getMergedExercises(customExercises);
  return merged.find(function (e) { return e.id === id; });
}

/**
 * 计算当前分类"常用"动作（最近练过的最多2个）
 * 通过训练记录匹配 exerciseName，取最近完成的
 */
function getFrequentExercises(category, records, customExercises) {
  if (!records || records.length === 0) return [];

  var seen = {};
  var result = [];
  var merged = getMergedExercises(customExercises);

  // 按 completedAt 倒序排列的记录中提取当前分类的动作
  var sorted = records.slice().sort(function (a, b) {
    return (b.completedAt || b.startedAt) - (a.completedAt || a.startedAt);
  });

  for (var i = 0; i < sorted.length; i++) {
    var r = sorted[i];
    // 老记录可能没有 categoryName，用当前分类名直接匹配
    // 新记录用 categoryName 匹配
    if (r.categoryName !== CATEGORY_MAP[category]) continue;

    var name = r.exerciseName;
    if (!name || seen[name]) continue;

    seen[name] = true;
    // 从合并动作库中查找匹配，拿到完整 exercise 对象。
    var match = merged.find(function (e) {
      if (r.exerciseId && e.id === r.exerciseId) return true;
      return e.name === name && e.category === category;
    });
    if (match) {
      result.push(match);
    } else {
      // 自定义动作或已删除的动作：构造最小对象
      result.push({
        id: r.exerciseId || '',
        name: name,
        category: r.category || category,
        categoryName: r.categoryName || CATEGORY_MAP[category],
        role: r.role || 'main',
        roleName: ROLE[r.role] || ROLE.main,
        source: r.exerciseSource || 'preset'
      });
    }

    if (result.length >= 2) break;
  }

  return result;
}

module.exports = {
  ROLE,
  ROLE_ORDER,
  CATEGORY_MAP,
  CATEGORY_KEYS,
  PRESET_EXERCISES,
  getCategories,
  getExercisesByCategory,
  getExerciseById,
  getFrequentExercises,
  getMergedExercises
};
