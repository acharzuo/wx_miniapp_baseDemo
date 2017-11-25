
const Emitter = require('./emitter');

/**
 * 基于小程序 WebSocket 接口封装信道
 */
module.exports = class Tunnel {
    constructor() {
        Emitter.setup(this.emitter = {});
    }

    connect(url, header) {

        // 小程序 wx.connectSocket() API header 参数无效，把会话信息附加在 URL 上
        const query = Object.keys(header).map(key => `${key}=${encodeURIComponent(header[key])}`).join('&');
        const seperator = url.indexOf('?') > -1 ? '&' : '?';
        url = [url, query].join(seperator);

        return new Promise((resolve, reject) => {
            wx.onSocketOpen(resolve);
            wx.onSocketError(reject);
            wx.onSocketMessage(packet => {
                try {
                    const { message, data } = JSON.parse(packet.data);
                    this.emitter.emit(message, data);
                } catch (e) {
                    console.log('Handle packet failed: ' + packet.data, e);
                }
            });
            wx.onSocketClose(() => this.emitter.emit('close'));
            wx.connectSocket({ url, header });
        });
    }

    on(message, handle) {
        this.emitter.on(message, handle);
    }

    emit(message, data) {
        wx.sendSocketMessage({
            data: JSON.stringify({ message, data })
        });
    }
}