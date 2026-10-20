const U = require('../../utils/util.js');
const S = require('../../utils/store.js');

Page({
  data: {
    list: [], input: '', latest: '', delta: 0, minKg: '', maxKg: '', avgKg: '', today: ''
  },

  onLoad: function () {
    this.setData({ today: U.today() });
    this.refresh();
  },
  onShow: function () { this.refresh(); },

  refresh: function () {
    const ws = S.getWeights().slice(-30);
    const list = ws.slice().reverse().map(function (w, i, arr) {
      const prev = arr[i + 1];
      return {
        date: w.date, kg: w.kg, text: U.dateText(w.date),
        delta: prev ? U.round1(w.kg - prev.kg) : 0
      };
    });
    let min = 0, max = 0, sum = 0;
    ws.forEach(function (w, i) {
      if (i === 0 || w.kg < min) min = w.kg;
      if (i === 0 || w.kg > max) max = w.kg;
      sum += w.kg;
    });
    // 近 7 天变化
    let delta = 0;
    if (ws.length >= 2) {
      const last = ws[ws.length - 1];
      for (let i = ws.length - 2; i >= 0; i--) {
        if (U.addDays(ws[i].date, 7) >= last.date) { delta = U.round1(last.kg - ws[i].kg); break; }
      }
    }
    this.setData({
      list: list,
      latest: ws.length ? ws[ws.length - 1].kg : '',
      delta: delta,
      minKg: min ? U.round1(min) : '',
      maxKg: max ? U.round1(max) : '',
      avgKg: ws.length ? U.round1(sum / ws.length) : '',
      input: ''
    });
    this.drawChart(ws);
  },

  onInput: function (e) { this.setData({ input: e.detail.value }); },

  save: function () {
    const v = parseFloat(this.data.input);
    if (!v || v < 20 || v > 300) { wx.showToast({ title: '请输入有效体重', icon: 'none' }); return; }
    S.setWeight(U.today(), U.round1(v));
    wx.showToast({ title: '已记录', icon: 'success' });
    this.refresh();
  },

  del: function (e) {
    const date = e.currentTarget.dataset.date;
    const self = this;
    wx.showModal({
      title: '删除记录', content: '删除 ' + date + ' 的体重记录？',
      success: function (res) {
        if (!res.confirm) return;
        const d = S.read();
        d.weights = d.weights.filter(function (w) { return w.date !== date; });
        S.write(d);
        self.refresh();
      }
    });
  },

  // 折线图（canvas 2d）
  drawChart: function (ws) {
    const self = this;
    if (!ws || ws.length < 2) return;
    const q = wx.createSelectorQuery();
    q.select('#wchart').fields({ node: true, size: true }).exec(function (res) {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = (wx.getSystemInfoSync && wx.getSystemInfoSync().pixelRatio) || 2;
      const W = res[0].width, H = res[0].height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      const pad = { l: 34, r: 14, t: 16, b: 24 };
      const vals = ws.map(function (w) { return w.kg; });
      let mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
      if (mx - mn < 1) { mn -= 0.5; mx += 0.5; }
      const span = mx - mn;
      const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
      const X = function (i) { return pad.l + (ws.length === 1 ? iw / 2 : iw * i / (ws.length - 1)); };
      const Y = function (v) { return pad.t + ih * (1 - (v - mn) / span); };

      // 网格 + 刻度
      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.font = '10px sans-serif';
      ctx.lineWidth = 1;
      for (let g = 0; g <= 3; g++) {
        const v = mn + span * g / 3;
        const y = Y(v);
        ctx.beginPath();
        ctx.moveTo(pad.l, y);
        ctx.lineTo(W - pad.r, y);
        ctx.stroke();
        ctx.fillText(v.toFixed(1), 2, y + 3);
      }

      // 面积
      const grd = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
      grd.addColorStop(0, 'rgba(255,107,53,.32)');
      grd.addColorStop(1, 'rgba(255,107,53,0)');
      ctx.beginPath();
      ctx.moveTo(X(0), Y(vals[0]));
      vals.forEach(function (v, i) { ctx.lineTo(X(i), Y(v)); });
      ctx.lineTo(X(vals.length - 1), H - pad.b);
      ctx.lineTo(X(0), H - pad.b);
      ctx.closePath();
      ctx.fillStyle = grd;
      ctx.fill();

      // 折线
      ctx.beginPath();
      vals.forEach(function (v, i) { i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)); });
      ctx.strokeStyle = '#FF6B35';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 点
      vals.forEach(function (v, i) {
        ctx.beginPath();
        ctx.arc(X(i), Y(v), i === vals.length - 1 ? 4 : 2.4, 0, Math.PI * 2);
        ctx.fillStyle = i === vals.length - 1 ? '#FF6B35' : '#1E222B';
        ctx.fill();
        if (i === vals.length - 1) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // 首尾日期
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillText(ws[0].date.slice(5), pad.l, H - 6);
      const lastTxt = ws[ws.length - 1].date.slice(5);
      ctx.fillText(lastTxt, W - pad.r - ctx.measureText(lastTxt).width, H - 6);
    });
  }
});
