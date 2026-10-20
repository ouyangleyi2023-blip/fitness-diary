const U = require('../../utils/util.js');
const S = require('../../utils/store.js');

Page({
  data: {
    profile: { name: '', gender: 'male', height: 172, goal: 4, start: '' },
    goals: [2, 3, 4, 5, 6, 7],
    streak: 0, total: 0, weightCount: 0, lastWeight: '',
    version: '1.0.0'
  },

  onLoad: function () { this.refresh(); },
  onShow: function () { this.refresh(); },

  refresh: function () {
    const p = S.getProfile();
    const ws = S.getWeights();
    this.setData({
      profile: p,
      streak: S.streak(),
      total: S.totalDays(),
      weightCount: ws.length,
      lastWeight: ws.length ? ws[ws.length - 1].kg + 'kg' : '未记录'
    });
  },

  onName: function (e) {
    S.saveProfile({ name: e.detail.value });
    this.setData({ 'profile.name': e.detail.value });
  },

  onHeight: function (e) {
    const v = U.num(e.detail.value);
    S.saveProfile({ height: v });
  },

  setGender: function (e) {
    S.saveProfile({ gender: e.currentTarget.dataset.g });
    this.refresh();
  },

  setGoal: function (e) {
    S.saveProfile({ goal: Number(e.currentTarget.dataset.g) });
    this.refresh();
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
      content: '将生成最近一周的训练与体重示例，方便预览效果',
      success: function (res) {
        if (!res.confirm) return;
        const ok = S.seedDemo();
        wx.showToast({ title: ok ? '已载入' : '已有数据', icon: 'none' });
        self.refresh();
      }
    });
  }
});
