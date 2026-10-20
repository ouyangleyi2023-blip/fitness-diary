const U = require('../../utils/util.js');
const S = require('../../utils/store.js');
const E = require('../../utils/exercises.js');

Page({
  data: {
    date: '', dateText: '', isToday: true,
    rows: [],
    duration: 0, note: '',
    summary: { count: 0, sets: 0, volume: 0, done: false },
    tplName: '', hasTpl: false,
    freqList: [],
    showPicker: false, pickerPart: 'chest', parts: [], pickerList: [], keyword: '', customName: ''
  },

  _log: null,

  onLoad: function () {
    this.setData({ parts: E.PARTS });
    this.load(U.today());
  },
  onShow: function () {
    if (!this._log) this.load(U.today());
  },

  load: function (date) {
    this._log = S.getLog(date);
    const tpl = S.getTemplate(U.dow(date));
    this.setData({
      date: date,
      dateText: U.dateTextFull(date),
      isToday: U.isToday(date),
      duration: this._log.duration || '',
      note: this._log.note || '',
      tplName: tpl ? tpl.name : '',
      hasTpl: !!tpl,
      freqList: S.freqRank(6).map(function (x) { return { name: x.name, count: x.count, color: x.color }; })
    });
    // 训练日 + 空清单 + 开启了自动带入 → 直接套用模板并填入上次成绩
    if (!this._log.exercises.length && tpl && this.data.isToday) {
      const n = S.applyTemplate(date);
      if (n) {
        this._log = S.getLog(date);
        wx.showToast({ title: '已套用「' + tpl.name + '」并带入上次成绩', icon: 'none', duration: 2200 });
      }
    }
    this.render();
  },

  // 一键套用当天的训练模板
  applyTpl: function () {
    const n = S.applyTemplate(this.data.date);
    if (!n) { wx.showToast({ title: '今天已有动作，或未设置模板', icon: 'none' }); return; }
    this._log = S.getLog(this.data.date);
    this.render();
    wx.showToast({ title: '已套用「' + this.data.tplName + '」', icon: 'none' });
  },

  // 重新渲染动作行 + 汇总（含与上次成绩的对比、PR 标记）
  render: function () {
    const log = this._log;
    const date = this.data.date;
    const self = this;
    const rows = log.exercises.map(function (ex) {
      let vol = 0, bestE = 0;
      (ex.sets || []).forEach(function (s) {
        if (ex.mode === 'weight') {
          vol += U.num(s.w) * U.num(s.r);
          const e = S.e1rm(s.w, s.r);
          if (e > bestE) bestE = e;
        }
      });
      const last = S.lastPerf(ex.name, date);          // 本次之前的最近一次
      const best = S.bestOf(ex.name);
      const curW = ex.mode === 'weight' ? U.num(ex.sets[0] ? ex.sets[0].w : 0) : 0;
      const lastW = last && last.mode === 'weight' ? U.num(last.sets[0].w) : 0;
      // 上次首组重量 → 单位统一后的展示文案
      let lastText = '首次记录';
      if (last) {
        const s0 = last.sets[0];
        lastText = '上次 ' + U.dateText(last.date) + ' · ' +
          (ex.mode === 'weight' ? U.num(s0.w) + 'kg×' + U.num(s0.r)
            : (ex.mode === 'time' ? U.num(s0.r) + '分钟' : U.num(s0.r) + '次'));
      }
      return {
        id: ex.id, name: ex.name, part: ex.part, mode: ex.mode,
        color: E.partInfo(ex.part).color, partName: E.partInfo(ex.part).name,
        sets: ex.sets, volume: Math.round(vol),
        unitW: ex.mode === 'weight' ? 'kg' : (ex.mode === 'time' ? '分钟' : '次'),
        showW: ex.mode === 'weight',
        lastText: lastText,
        hasLast: !!last,
        delta: lastW && curW ? Math.round((curW - lastW) * 10) / 10 : 0,
        isPR: bestE > 0 && best.e1rm > 0 && bestE >= best.e1rm
      };
    });
    const dec = S.decorate(log);
    this.setData({
      rows: rows,
      summary: { count: dec.exercises.length, sets: dec.sets, volume: dec.volume, done: !!log.done }
    });
  },

  persist: function () {
    this._log.duration = U.num(this.data.duration);
    this._log.note = this.data.note;
    S.saveLog(this._log);
  },

  /* ---------- 日期 ---------- */
  changeDay: function (e) {
    const d = U.addDays(this.data.date, Number(e.currentTarget.dataset.d));
    if (d > U.today()) { wx.showToast({ title: '不能记录未来', icon: 'none' }); return; }
    this.persist();
    this.load(d);
  },

  /* ---------- 动作选择 ---------- */
  openPicker: function () {
    this.setData({ showPicker: true, pickerPart: 'chest', keyword: '', customName: '' });
    this.filterList();
  },
  closePicker: function () { this.setData({ showPicker: false }); },
  selectPart: function (e) {
    this.setData({ pickerPart: e.currentTarget.dataset.p });
    this.filterList();
  },
  onSearch: function (e) {
    this.setData({ keyword: e.detail.value });
    this.filterList();
  },
  filterList: function () {
    const list = E.search(this.data.keyword, this.data.pickerPart);
    this.setData({
      pickerList: list.map(function (x) {
        return { name: x.name, part: x.part, mode: x.mode, color: E.partInfo(x.part).color, modeText: E.MODE_TEXT[x.mode] };
      })
    });
  },
  pickExercise: function (e) {
    const d = e.currentTarget.dataset;
    this.addExercise(d.name, d.part, d.mode);
    this.setData({ showPicker: false });
  },
  onCustomInput: function (e) { this.setData({ customName: e.detail.value }); },
  addCustom: function () {
    const n = (this.data.customName || '').trim();
    if (!n) { wx.showToast({ title: '请输入动作名', icon: 'none' }); return; }
    this.addExercise(n, this.data.pickerPart, 'weight');
    this.setData({ showPicker: false, customName: '' });
  },

  addExercise: function (name, part, mode) {
    // 已存在则不重复添加
    for (let i = 0; i < this._log.exercises.length; i++) {
      if (this._log.exercises[i].name === name) {
        wx.showToast({ title: '「' + name + '」已在清单中', icon: 'none' });
        return;
      }
    }
    const p = S.getProfile();
    const last = p.autoFill ? S.lastPerf(name, this.data.date) : null;
    const cnt = p.defSets || 3;
    const sets = [];
    for (let i = 0; i < cnt; i++) {
      if (last && last.sets[i]) sets.push({ id: U.uid(), w: last.sets[i].w, r: last.sets[i].r, ok: false });
      else if (last) {
        const t = last.sets[last.sets.length - 1];
        sets.push({ id: U.uid(), w: t.w, r: t.r, ok: false });
      } else {
        sets.push({ id: U.uid(), w: '', r: mode === 'time' ? '' : '', ok: false });
      }
    }
    this._log.exercises.push({ id: U.uid(), name: name, part: part, mode: mode, sets: sets });
    this.persist();
    this.render();
    wx.showToast({
      title: last ? '已带入上次：' + U.num(last.sets[0].w) + 'kg×' + U.num(last.sets[0].r) : '已添加 ' + name,
      icon: 'none'
    });
  },

  /* ---------- 组数编辑 ---------- */
  addSet: function (e) {
    const i = Number(e.currentTarget.dataset.i);
    const ex = this._log.exercises[i];
    const last = ex.sets[ex.sets.length - 1] || { w: '', r: '' };
    ex.sets.push({ id: U.uid(), w: last.w, r: last.r });
    this.persist();
    this.render();
  },

  delSet: function (e) {
    const i = Number(e.currentTarget.dataset.i);
    const j = Number(e.currentTarget.dataset.j);
    this._log.exercises[i].sets.splice(j, 1);
    if (!this._log.exercises[i].sets.length) this._log.exercises[i].sets.push({ id: U.uid(), w: '', r: '' });
    this.persist();
    this.render();
  },

  delEx: function (e) {
    const i = Number(e.currentTarget.dataset.i);
    const self = this;
    wx.showModal({
      title: '删除动作', content: '确定删除「' + this._log.exercises[i].name + '」？',
      success: function (res) {
        if (!res.confirm) return;
        self._log.exercises.splice(i, 1);
        self.persist();
        self.render();
      }
    });
  },

  onSetInput: function (e) {
    const ds = e.currentTarget.dataset;
    const i = Number(ds.i), j = Number(ds.j), f = ds.f;
    const v = e.detail.value;
    this._log.exercises[i].sets[j][f] = v;
    const setData = {};
    setData['rows[' + i + '].sets[' + j + '].' + f] = v;
    // 重新计算该动作容量
    const ex = this._log.exercises[i];
    let vol = 0;
    ex.sets.forEach(function (s) { if (ex.mode === 'weight') vol += U.num(s.w) * U.num(s.r); });
    setData['rows[' + i + '].volume'] = Math.round(vol);
    const dec = S.decorate(this._log);
    setData['summary.volume'] = dec.volume;
    this.setData(setData);
    this.persist();
  },

  onDuration: function (e) { this.setData({ duration: e.detail.value }); this.persist(); },
  onNote: function (e) { this.setData({ note: e.detail.value }); this.persist(); },

  finish: function () {
    if (!this._log.exercises.length) {
      wx.showToast({ title: '先添加训练动作', icon: 'none' });
      return;
    }
    this._log.done = true;
    this.persist();
    this.render();
    wx.showToast({ title: '训练完成，打卡成功 🔥', icon: 'none', duration: 1800 });
  },

  clearDay: function () {
    const self = this;
    wx.showModal({
      title: '清空当天', content: '将删除 ' + this.data.dateText + ' 的全部训练记录',
      success: function (res) {
        if (!res.confirm) return;
        self._log = S.emptyLog(self.data.date);
        S.saveLog(self._log);
        self.setData({ duration: '', note: '' });
        self.render();
      }
    });
  }
});
