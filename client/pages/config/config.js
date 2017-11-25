const app = getApp();
const config = app.config;
const lab = require('../../lib/lab');

const done = config.host != '<请配置访问域名>';


Page({
  data: {
    done,
    status: done ? 'success' : 'waiting',
    host: config.host,
    hintLine1: done ? '域名已配置' : '请修改小程序源码 app.js',
    hintLine2: done ? '小程序实验将使用下面域名进行' : '配置小程序使用的服务器域名'
  },
  goBack() {
    wx.navigateBack();
  },
  onShow() {
    if (done) {
      lab.finish('config');
    }
  }
});