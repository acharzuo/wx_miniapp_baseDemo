const lab = require('../../lib/lab');

Page({
    data: {
        labs: [
            { id: 'config', title: '实验准备：配置请求域名' },
            { id: 'https', title: '实验一：HTTPS' },
            { id: 'session', title: '实验二：会话' },
            { id: 'websocket', title: '实验三：WebSocket' },
            { id: 'game', title: '实验四：剪刀石头布小游戏' }
        ],
        done: lab.getFinishLabs()
    },

    onShow() {
        this.setData({ done: lab.getFinishLabs() });
    },

    clear() {
        lab.clear();
        this.setData({ done: lab.getFinishLabs() });
    }
});