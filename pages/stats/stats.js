const U = require('../../utils/util.js');
const S = require('../../utils/store.js');

Page({
  data: {
    range: 'week',
    stats: { days: 0, volume: 0, sets: 0, reps: 0, duration: 0, avgDuration: 0 },
    series: [], chartTitle: '',
    parts: [],
    ym: '', monthLabel: '', cells: []
  },

  onLoad: function () {
    this.setData({ ym: U.monthKey(U.today()) });
    this.refresh();
  },
  onShow: function () { this.refresh(); },

  refresh: function () {
    const range = this.data.range;
    let dates, title;
    if (range === 'week') { dates = U.lastDays(7); title = '近 7 天训练容量'; }
    else if (range === 'month') { dates = U.lastDays(30); title = '近 30 天训练容量'; }
    else { dates = S.allDates(); title = '全部训练记录（按容量）'; }

    const stats = S.rangeStats(dates);
    const parts = S.partStats(dates);
    const series = this.buildSeries(range, dates);
    const ym = this.data.ym || U.monthKey(U.today());
    const p = ym.split('-');

    this.setData({
      stats: stats,
      parts: parts,
      series: series,
      chartTitle: title,
      monthLabel: p[0] + '年' + (+p[1]) + '月',
      cells: S.calendar(ym)
    });
  },

  buildSeries: function (range, dates) {
    let list;
    if (range === 'all') {
      // 按周聚合，取最近 12 周
      const map = {};
      dates.forEach(function (d) {
        const wd = (U.parse(d).getDay() + 6) % 7;
        const key = U.addDays(d, -wd);
        map[key] = (map[key] || 0) + 1;
      });
      const keys = Object.keys(map).sort().slice(-12);
      list = keys.map(function (k) {
        const days = [];
        for (let i = 0; i < 7; i++) days.push(U.addDays(k, i));
        return { date: k, label: (+k.split('-')[1]) + '/' + (+k.split('-')[2]), volume: S.rangeStats(days).volume, done: true };
      });
    } else {
      list = S.volumeSeries(dates);
    }
    let max = 1;
    list.forEach(function (x) { if (x.volume > max) max = x.volume; });
    return list.map(function (x) {
      return {
        label: x.label, volume: x.volume, done: x.volume > 0,
        h: x.volume > 0 ? Math.max(12, Math.round(x.volume / max * 170)) : 6
      };
    });
  },

  switchRange: function (e) {
    this.setData({ range: e.currentTarget.dataset.r });
    this.refresh();
  },

  prevMonth: function () {
    const p = this.data.ym.split('-');
    let y = +p[0], m = +p[1] - 1;
    if (m < 1) { m = 12; y--; }
    this.setData({ ym: y + '-' + U.pad(m) });
    this.refresh();
  },

  nextMonth: function () {
    const p = this.data.ym.split('-');
    let y = +p[0], m = +p[1] + 1;
    if (m > 12) { m = 1; y++; }
    const next = y + '-' + U.pad(m);
    if (next > U.monthKey(U.today())) return;
    this.setData({ ym: next });
    this.refresh();
  }
});
