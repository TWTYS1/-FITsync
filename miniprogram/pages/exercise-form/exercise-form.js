const { CATEGORY_MAP, CATEGORY_KEYS, ROLE, ROLE_ORDER } = require('../../data/exercises');
const { getCustomExercises, saveCustomExercise, updateCustomExercise, deleteCustomExercise } = require('../../utils/storage');

Page({
  data: {
    isEdit: false,
    editId: '',

    name: '',
    category: '',
    role: 'main',
    targetSets: 5,
    targetSetsText: '5',
    defaultWeight: 0,
    defaultWeightText: '0',
    defaultReps: 8,
    defaultRepsText: '8',

    categories: [],
    roles: [],
    canDelete: false
  },

  onLoad(options) {
    const categories = CATEGORY_KEYS.map(function (key) {
      return { key: key, name: CATEGORY_MAP[key] };
    });
    const roles = ROLE_ORDER.map(function (key) {
      return { key: key, name: ROLE[key] };
    });

    const isEdit = !!(options && options.id);
    let ex = null;
    if (isEdit) {
      const customs = getCustomExercises();
      ex = customs.find(function (e) { return e.id === options.id; });
    }

    this.setData({
      isEdit,
      editId: isEdit ? options.id : '',
      categories,
      roles,
      canDelete: isEdit,
      name: ex ? ex.name : '',
      category: ex ? ex.category : (options ? options.category || 'chest' : 'chest'),
      role: ex ? ex.role : 'main',
      targetSets: ex ? ex.targetSets : 5,
      targetSetsText: String(ex ? ex.targetSets : 5),
      defaultWeight: ex ? ex.defaultWeight : 0,
      defaultWeightText: String(ex ? ex.defaultWeight : 0),
      defaultReps: ex ? ex.defaultReps : 8,
      defaultRepsText: String(ex ? ex.defaultReps : 8)
    });

    if (isEdit && !ex) {
      wx.showToast({ title: '动作不存在', icon: 'none' });
      wx.navigateBack();
    }
  },

  onInputName(e) {
    this.setData({ name: e.detail.value });
  },

  onSelectCategory(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ category: key });
  },

  onSelectRole(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ role: key });
  },

  onTargetSetsMinus() {
    const val = Math.max(1, this.data.targetSets - 1);
    this.setData({ targetSets: val, targetSetsText: String(val) });
  },

  onTargetSetsPlus() {
    const val = Math.min(10, this.data.targetSets + 1);
    this.setData({ targetSets: val, targetSetsText: String(val) });
  },

  onTargetSetsInput(e) {
    const text = String(e.detail.value || '').replace(/[^\d]/g, '');
    const val = Number.parseInt(text, 10);
    this.setData({
      targetSetsText: text,
      targetSets: Number.isFinite(val) ? this.clampTargetSets(val) : 1
    });
  },

  onTargetSetsBlur() {
    const val = Number.parseInt(this.data.targetSetsText, 10);
    const targetSets = Number.isFinite(val)
      ? this.clampTargetSets(val)
      : this.clampTargetSets(this.data.targetSets || 1);
    this.setData({
      targetSets,
      targetSetsText: String(targetSets)
    });
  },

  onWeightMinus() {
    const val = Math.max(0, this.round2(this.data.defaultWeight - 2.5));
    this.setData({ defaultWeight: val, defaultWeightText: String(val) });
  },

  onWeightPlus() {
    const val = this.round2(this.data.defaultWeight + 2.5);
    this.setData({ defaultWeight: val, defaultWeightText: String(val) });
  },

  onRepsMinus() {
    const val = Math.max(1, this.data.defaultReps - 1);
    this.setData({ defaultReps: val, defaultRepsText: String(val) });
  },

  onRepsPlus() {
    const val = this.data.defaultReps + 1;
    this.setData({ defaultReps: val, defaultRepsText: String(val) });
  },

  onWeightInput(e) {
    const text = this.normalizeDecimalText(e.detail.value, 2);
    const val = Number.parseFloat(text);
    this.setData({
      defaultWeightText: text,
      defaultWeight: Number.isFinite(val) ? this.round2(val) : 0
    });
  },

  onWeightBlur() {
    const weight = this.parseWeight(this.data.defaultWeightText, this.data.defaultWeight);
    this.setData({
      defaultWeight: weight,
      defaultWeightText: String(weight)
    });
  },

  onRepsInput(e) {
    const text = String(e.detail.value || '').replace(/[^\d]/g, '');
    const val = Number.parseInt(text, 10);
    this.setData({
      defaultRepsText: text,
      defaultReps: Number.isFinite(val) ? Math.max(1, val) : 1
    });
  },

  onRepsBlur() {
    const reps = Math.max(1, Number.parseInt(this.data.defaultRepsText, 10) || this.data.defaultReps || 1);
    this.setData({
      defaultReps: reps,
      defaultRepsText: String(reps)
    });
  },

  normalizeDecimalText(value, decimalPlaces) {
    const raw = String(value || '').replace(/[^\d.]/g, '');
    const parts = raw.split('.');
    if (parts.length === 1) return parts[0];
    return parts[0] + '.' + parts.slice(1).join('').slice(0, decimalPlaces);
  },

  parseWeight(value, fallback) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return this.round2(Math.max(0, fallback || 0));
    return this.round2(Math.max(0, parsed));
  },

  round2(value) {
    return Math.round(value * 100) / 100;
  },

  clampTargetSets(value) {
    return Math.max(1, Math.min(10, Number(value) || 1));
  },

  onSave() {
    const { isEdit, editId, name, category, role, targetSets, defaultWeight, defaultReps } = this.data;
    const trimmedName = name.trim();

    if (!trimmedName) {
      wx.showToast({ title: '请输入动作名', icon: 'none' });
      return;
    }

    const data = {
      name: trimmedName,
      category: category,
      categoryName: CATEGORY_MAP[category] || '',
      role: role,
      roleName: ROLE[role] || '',
      targetSets: this.clampTargetSets(Number.parseInt(this.data.targetSetsText, 10) || targetSets),
      defaultWeight: this.parseWeight(this.data.defaultWeightText, defaultWeight),
      defaultReps: Math.max(1, Number.parseInt(this.data.defaultRepsText, 10) || Number(defaultReps) || 1)
    };

    if (isEdit) {
      updateCustomExercise(editId, data);
      wx.showToast({ title: '已更新', icon: 'success' });
    } else {
      saveCustomExercise(data);
      wx.showToast({ title: '已添加', icon: 'success' });
    }

    setTimeout(function () {
      wx.navigateBack();
    }, 500);
  },

  onDelete() {
    if (!this.data.isEdit) return;

    wx.showModal({
      title: '删除自定义动作？',
      content: '删除后不影响已有的训练记录。',
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: function (res) {
        if (res.confirm) {
          deleteCustomExercise(this.data.editId);
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(function () {
            wx.navigateBack();
          }, 500);
        }
      }.bind(this)
    });
  }
});
