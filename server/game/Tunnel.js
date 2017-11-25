const EventEmitter = require('events');

/**
 * 封装 WebSocket 信道
 */
module.exports = class Tunnel {
    constructor(ws) {
        this.emitter = new EventEmitter();
        this.ws = ws;
        ws.on('message', packet => {
            try {
                // 约定每个数据包格式：{ message: 'type', data: any }
                const { message, data } = JSON.parse(packet);
                this.emitter.emit(message, data);
            } catch (err) {
                console.log('unknown packet: ' + packet);
            }
        });
    }

    on(message, handle) {
        this.emitter.on(message, handle);
    }

    emit(message, data) {
        this.ws.send(JSON.stringify({ message, data }));
    }
}