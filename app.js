const S = require('./utils/store.js');

App({
  globalData: { version: '1.0.0' },
  onLaunch: function () {
    // 首次启动写入示例数据，方便立即看到效果；可在「我的」中一键清空
    try { S.seedDemo(); } catch (e) { }
  }
});
