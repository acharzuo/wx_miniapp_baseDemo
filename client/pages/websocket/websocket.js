const app = getApp();
const config = app.config;
const wafer = require('../../vendors/wafer-client-sdk/index');
const lab = require('../../lib/lab');

Page({
  data: {
    status: 'waiting',
    url: 'wss://' + config.host + '/ws',
    connecting: false,
    hintLine1: '完成服务器开发，',
    hintLine2: '让服务器支持 WebSocket 连接'
  },

  /**
   * WebSocket 是否已经连接
   */
  socketOpen: false,

  /**
   * 开始连接 WebSocket
   */
  connect() {
    this.setData({
      status: 'waiting',
      connecting: true,
      hintLine1: '正在连接',
      hintLine2: '...'
    });
    this.listen();
    wafer.setLoginUrl(`https://${config.host}/login`);
    wafer.login({
      success: () => {
        const header = wafer.buildSessionHeader();
        const query = Object.keys(header).map(key => `${key}=${encodeURIComponent(header[key])}`).join('&');
        wx.connectSocket({
          // 小程序 wx.connectSocket() API header 参数无效，把会话信息附加在 URL 上
          url: `${this.data.url}?${query}`,
          header
        });
      },
      fail: (err) => {
        this.setData({
          status: 'warn',
          connecting: false,
          hintLine1: '登录失败',
          hintLine2: err.message || err
        });
      }
    });
  },

  /**
   * 监听 WebSocket 事件
   */
  listen() {
    wx.onSocketOpen(() => {
      this.socketOpen = true;
      this.setData({
        status: 'success',
        connecting: false,
        hintLine1: '连接成功',
        hintLine2: '现在可以通过 WebSocket 发送接收消息了'
      });
      console.info('WebSocket 已连接');
    });
    wx.onSocketMessage((message) => {
      this.setData({
        hintLine2: message.data
      });
      lab.finish('websocket');
    });
    wx.onSocketClose(() => {
      this.setData({
        status: 'waiting',
        hintLine1: 'WebSocket 已关闭'
      });
      console.info('WebSocket 已关闭');
    });
    wx.onSocketError(() => {
      setTimeout(() => {
        this.setData({
          status: 'warn',
          connecting: false,
          hintLine1: '发生错误',
          hintLine2: 'WebSocket 连接建立失败'
        });
      });
      console.error('WebSocket 错误');
    });
  },

  /**
   * 发送一个包含当前时间信息的消息
   */
  send() {
    wx.sendSocketMessage({
      data: new Date().toTimeString().split(' ').shift() + '.' + (new Date().getMilliseconds())
    });
  },
  
  /**
   * 关闭 WebSocket 连接
   */
  close() {
    this.socketOpen = false;
    wx.closeSocket();
  }
});