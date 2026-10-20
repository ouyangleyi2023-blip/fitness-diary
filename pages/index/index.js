const U = require('../../utils/util.js');
const S = require('../../utils/store.js');

Page({
  data: {
    greeting: '', name: '', date: '', dateText: '',
    streak: 0, total: 0,
    today: { exercises: [], volume: 0, sets: 0, duration: 0, done: false },
    week: [], weekDone: 0, goal: 4, pct: 0,
    weightInput: '', hasWeight: false, weightDelta: 0, lastWeight: ''
  },

  onLoad: function () { this.refresh(); },
  onShow: function () { this.refresh(); },
  onPullDownRefresh: function () { this.refresh(); wx.stopPullDownRefresh(); },

  refresh: function () {
    const date = U.today();
    const profile = S.getProfile();
    const log = S.getLog(date);
    const today = S.decorate(log);

    // 近 7 天
    const days = U.lastDays(7);
    const series = S.volumeSeries(days);
    let max = 1;
    series.forEach(function (s) { if (s.volume > max) max = s.volume; });
    const week = days.map(function (d, i) {
      const s = series[i];
      const h = s.done ? Math.max(16, Math.round(s.volume / max * 96)) : 8;
      return {
        date: d, label: U.weekday(d).slice(1), h: h,
        done: s.done, isToday: i === days.length - 1
      };
    });

    // 本周进度
    const wds = U.weekDates();
    const wStats = S.rangeStats(wds);

    // 体重
    const ws = S.getWeights();
    const w = S.weightOf(date);
    let delta = 0;
    if (w != null && ws.length > 1) {
      for (let i = ws.length - 1; i >= 0; i--) {
        if (ws[i].date < date) { delta = U.round1(w - ws[i].kg); break; }
      }
    }

    this.setData({
      greeting: U.greeting(),
      name: profile.name || '健身达人',
      date: date,
      dateText: U.dateTextFull(date),
      streak: S.streak(),
      total: S.totalDays(),
      today: today,
      week: week,
      weekDone: wStats.days,
      goal: profile.goal || 4,
      pct: Math.min(100, Math.round(wStats.days / (profile.goal || 4) * 100)),
      weightInput: w != null ? String(w) : '',
      hasWeight: w != null,
      weightDelta: delta,
      lastWeight: ws.length ? ws[ws.length - 1].kg : ''
    });
  },

  goTrain: function () {
    wx.switchTab({ url: '/pages/train/train' });
  },

  goBody: function () {
    wx.navigateTo({ url: '/pages/body/body' });
  },

  onWeightInput: function (e) {
    this.setData({ weightInput: e.detail.value });
  },

  saveWeight: function () {
    const v = parseFloat(this.data.weightInput);
    if (!v || v < 20 || v > 300) {
      wx.showToast({ title: '请输入有效体重', icon: 'none' });
      return;
    }
    S.setWeight(this.data.date, U.round1(v));
    wx.showToast({ title: '已记录', icon: 'success' });
    this.refresh();
  },

  // 直接打卡（无动作时按「完成训练」处理）
  toggleDone: function () {
    const log = S.getLog(this.data.date);
    if (!log.exercises.length) {
      wx.showToast({ title: '先添加训练动作', icon: 'none' });
      return;
    }
    log.done = !log.done;
    S.saveLog(log);
    wx.showToast({ title: log.done ? '今日已打卡 🔥' : '已取消打卡', icon: 'none' });
    this.refresh();
  }
});
