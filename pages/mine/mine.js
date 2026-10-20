const U = require('../../utils/util.js');
const S = require('../../utils/store.js');
const E = require('../../utils/exercises.js');

Page({
  data: {
    profile: {},
    goals: S.GOALS, levels: S.LEVELS, slots: S.SLOTS, presets: Object.keys(E.PRESET_TPL),
    goalOpts: ['muscle', 'fat', 'strength', 'keep'],
    levelOpts: ['new', 'mid', 'adv'],
    slotOpts: ['morning', 'noon', 'evening', 'night'],
    weekDays: [false, false, false, false, false, false, false],
    tpls: {},                  // { 0: {name, exs:[]}, 3: {…} }
    selTpl: null,              // 当前编辑的模板 dow
    tplEditing: [],            // {name, part, mode, sets, reps} 编辑中行
    tplNewName: '', tplNewSets: '', tplNewReps: '',
    streak: 0, total: 0, weightCount: 0, lastWeight: '',
    todaySteps: 0, todayRings: 0,
    editing: false,            // 习惯档案展开/收起
    version: '2.0.0'
  },

  onLoad: function () { this.refresh(); },
  onShow: function () { this.refresh(); },

  refresh: function () {
    const p = S.getProfile();
    const ws = S.getWeights();
    const wd = (p.weekDays || []).slice();
    while (wd.length < 7) wd.push(0);
    const mark = [false, false, false, false, false, false, false];
    (p.weekDays || []).forEach(function (n) { if (n >= 0 && n < 7) mark[n] = true; });
    this.setData({
      profile: p,
      weekDays: mark,
      tpls: JSON.parse(JSON.stringify(S.getTemplates())),
      streak: S.streak(),
      total: S.totalDays(),
      weightCount: ws.length,
      lastWeight: ws.length ? ws[ws.length - 1].kg + 'kg' : '未记录',
      todaySteps: S.getSteps(U.today()),
      todayRings: ws.length ? Math.round(ws[ws.length - 1].kg * 10) / 10 : 0
    });
  },

  /* ---------- 习惯档案 ---------- */
  toggleEdit: function () { this.setData({ editing: !this.data.editing }); },

  onName: function (e) { S.saveProfile({ name: e.detail.value }); this.setData({ 'profile.name': e.detail.value }); },
  onHeight: function (e) { S.saveProfile({ height: U.num(e.detail.value) }); },
  onGoal: function (e) { S.saveProfile({ goal: e.detail.value }); this.setData({ 'profile.goal': e.detail.value }); this.refresh(); },
  onLevel: function (e) { S.saveProfile({ level: e.detail.value }); this.setData({ 'profile.level': e.detail.value }); },
  onSlot: function (e) { S.saveProfile({ slot: e.detail.value }); this.setData({ 'profile.slot': e.detail.value }); },
  onDefSets: function (e) { S.saveProfile({ defSets: U.num(e.detail.value) || 3 }); },
  onRestSec: function (e) { S.saveProfile({ restSec: U.num(e.detail.value) || 90 }); },
  onUnit: function (e) { S.saveProfile({ unit: e.detail.value }); this.setData({ 'profile.unit': e.detail.value }); },
  toggleAuto: function (e) { S.saveProfile({ autoFill: e.detail.value }); this.setData({ 'profile.autoFill': e.detail.value }); },
  toggleGender: function (e) { S.saveProfile({ gender: e.detail.value }); this.setData({ 'profile.gender': e.detail.value }); },

  toggleWeekDay: function (e) {
    const i = Number(e.currentTarget.dataset.i);
    const wd = this.data.profile.weekDays.slice();
    const idx = wd.indexOf(i);
    if (idx >= 0) wd.splice(idx, 1); else wd.push(i);
    wd.sort();
    S.saveProfile({ weekDays: wd });
    this.refresh();
  },

  /* ---------- 步数 ---------- */
  onSteps: function (e) { S.setSteps(U.today(), U.num(e.detail.value)); this.setData({ todaySteps: U.num(e.detail.value) }); },

  /* ---------- 模板编辑 ---------- */
  pickTpl: function (e) {
    const i = Number(e.currentTarget.dataset.i);
    const tpl = this.data.tpls[i];
    this.setData({
      selTpl: i,
      tplEditing: tpl ? JSON.parse(JSON.stringify(tpl.exs)) : [],
      tplNewName: '', tplNewSets: '', tplNewReps: ''
    });
  },
  newTpl: function () { this.setData({ selTpl: -1, tplEditing: [], tplNewName: '', tplNewSets: '', tplNewReps: '' }); },
  closeTpl: function () { this.setData({ selTpl: null }); },

  tplPickKey: function (e) {
    // 从预设快速生成
    const key = e.currentTarget.dataset.k;
    const tpl = E.buildTpl(key);
    this.setData({ tplEditing: tpl.exs, tplNewName: tpl.name });
  },
  onTplName: function (e) { this.setData({ tplNewName: e.detail.value }); },
  onTplSets: function (e) { this.setData({ tplNewSets: e.detail.value }); },
  onTplReps: function (e) { this.setData({ tplNewReps: e.detail.value }); },
  addTplRow: function () {
    const n = (this.data.tplNewName || '').trim();
    if (!n) { wx.showToast({ title: '请输入动作名', icon: 'none' }); return; }
    const L = E.find(n) || { p: 'core', m: 'weight' };
    const sets = U.num(this.data.tplNewSets) || 3;
    const reps = U.num(this.data.tplNewReps) || (L.m === 'time' ? 10 : 10);
    this.setData({
      tplEditing: this.data.tplEditing.concat([{ name: n, part: L.p, mode: L.m, sets: sets, reps: reps }]),
      tplNewName: '', tplNewSets: '', tplNewReps: ''
    });
  },
  delTplRow: function (e) {
    const i = Number(e.currentTarget.dataset.i);
    const ed = this.data.tplEditing.slice();
    ed.splice(i, 1);
    this.setData({ tplEditing: ed });
  },
  saveTpl: function () {
    if (this.data.selTpl === null) return;
    const wd = this.data.selTpl === -1 ? -1 : this.data.selTpl;
    if (this.data.tplEditing.length === 0) {
      wx.showToast({ title: '请至少添加一个动作', icon: 'none' }); return;
    }
    if (wd === -1) {
      // 新建：选个未占用的 dow
      const used = [];
      Object.keys(this.data.tpls).forEach(function (k) { used.push(Number(k)); });
      let free = -1;
      for (let i = 0; i < 7; i++) { if (used.indexOf(i) < 0) { free = i; break; } }
      if (free < 0) { wx.showToast({ title: '每周每天都有模板了', icon: 'none' }); return; }
      S.saveTemplate(free, { name: this.data.tplNewName || '我的计划', exs: this.data.tplEditing });
    } else {
      S.saveTemplate(wd, { name: this.data.tplNewName || ('星期 ' + (wd + 1)), exs: this.data.tplEditing });
    }
    wx.showToast({ title: '已保存', icon: 'success' });
    this.setData({ selTpl: null });
    this.refresh();
  },
  deleteTpl: function () {
    if (this.data.selTpl === null || this.data.selTpl === -1) return;
    const wd = this.data.selTpl;
    wx.showModal({
      title: '删除模板', content: '删除星期 ' + ['日', '一', '二', '三', '四', '五', '六'][wd] + ' 的训练模板？',
      success: function (res) {
        if (!res.confirm) return;
        S.removeTemplate(wd);
        this.setData({ selTpl: null });
        this.refresh();
      }.bind(this)
    });
  },

  goBody: function () { wx.navigateTo({ url: '/pages/body/body' }); },

  exportData: function () {
    wx.setClipboardData({
      data: S.exportJSON(),
      success: function () { wx.showToast({ title: '数据已复制', icon: 'success' }); }
    });
  },

  clearData: function () {
    const self = this;
    wx.showModal({
      title: '清空全部数据',
      content: '所有训练记录与体重数据将被删除，不可恢复',
      confirmColor: '#FF4D2E',
      success: function (res) {
        if (!res.confirm) return;
        S.clearAll();
        wx.showToast({ title: '已清空', icon: 'success' });
        self.refresh();
      }
    });
  },

  loadDemo: function () {
    const self = this;
    wx.showModal({
      title: '载入示例数据',
      content: '将生成最近 6 周的训练、体重与步数示例',
      success: function (res) {
        if (!res.confirm) return;
        const ok = S.seedDemo();
        wx.showToast({ title: ok ? '已载入' : '已有数据', icon: 'none' });
        self.refresh();
      }
    });
  }
});
