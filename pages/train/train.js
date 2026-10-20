const U = require('../../utils/util.js');
const S = require('../../utils/store.js');
const E = require('../../utils/exercises.js');

Page({
  data: {
    date: '', dateText: '', isToday: true,
    rows: [],
    duration: 0, note: '',
    summary: { count: 0, sets: 0, volume: 0, done: false },
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
    this.setData({
      date: date,
      dateText: U.dateTextFull(date),
      isToday: U.isToday(date),
      duration: this._log.duration || '',
      note: this._log.note || ''
    });
    this.render();
  },

  // 重新渲染动作行 + 汇总
  render: function () {
    const log = this._log;
    const rows = log.exercises.map(function (ex) {
      let vol = 0;
      (ex.sets || []).forEach(function (s) {
        if (ex.mode === 'weight') vol += U.num(s.w) * U.num(s.r);
      });
      return {
        id: ex.id, name: ex.name, part: ex.part, mode: ex.mode,
        color: E.partInfo(ex.part).color, partName: E.partInfo(ex.part).name,
        sets: ex.sets, volume: Math.round(vol),
        unitW: ex.mode === 'weight' ? 'kg' : (ex.mode === 'time' ? '分钟' : '次'),
        showW: ex.mode === 'weight'
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
    const ex = { id: U.uid(), name: name, part: part, mode: mode, sets: [{ id: U.uid(), w: '', r: '' }] };
    this._log.exercises.push(ex);
    this.persist();
    this.render();
    wx.showToast({ title: '已添加 ' + name, icon: 'none' });
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
