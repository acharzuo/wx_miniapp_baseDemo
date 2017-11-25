const app = getApp();
const config = app.config;
const lab = require('../../lib/lab');

Page({
  data: {
    status: 'waiting',
    url: 'https://' + config.host + '/hello',
    requesting: false,
    hintLine1: '完成服务器开发，',
    hintLine2: '使得下面的地址可以访问'
  },
  request() {
    this.setData({
      requesting: true,
      status: 'waiting',
      hintLine1: '正在发送',
      hintLine2: '...'
    });
    wx.request({
      url: this.data.url,
      method: 'GET',
      success: (res) => {
        if (+res.statusCode == 200) {
          this.setData({
            status: 'success',
            hintLine1: '服务器响应成功',
            hintLine2: '返回：' + res.data
          });
          lab.finish('https');
        } else {
          this.setData({
            status: 'warn',
            hintLine1: '响应错误',
            hintLine2: '响应码：' + res.statusCode
          });
        }
      },
      fail: (res) => {
        console.log(res);
        this.setData({
          status: 'warn',
          hintLine1: '请求失败',
          hintLine2: res.errMsg
        });
      },
      complete: () => {
        this.setData({
          requesting: false
        });
      }
    });
  }
});