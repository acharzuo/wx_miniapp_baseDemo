"use strict"; 

require('../../lib/regenerator-runtime');

const regeneratorRuntime = global.regeneratorRuntime;

// 引入 co 和 promisify 帮助我们进行异步处理
const co = require('../../lib/co');
const promisify = require('../../lib/promisify');

// 引入 Wafer 客户端 SDK 支持会话
const wafer = require('../../vendors/wafer-client-sdk/index');

// 简单的小程序 WebSocket 信道封装
const Tunnel = require('../../lib/tunnel');

// 登录接口转成返回 Promise 形式
const login = promisify(wafer.login);

// 获得小程序实例
const app = getApp();

// 用于记录实验成功
const lab = require('../../lib/lab');

// 设置会话登录地址
wafer.setLoginUrl(`https://${app.config.host}/login`);

// 文案
const WIN_TEXTS = ['很棒', '秒杀', '赢了', 'Winner', '胜利', '不要大意', '无敌啊'];
const LOSE_TEXTS = ['失误', '卧槽', '不可能', 'Loser', '行不行啊', '加油', '大侠再来'];
const EQ_TEXTS = ['平局', '平分秋色', '对方学你', '照镜子', '半斤八两', '换一个', '一样的'];
const pickText = texts => texts[Math.floor(texts.length * Math.random())];

// 定义页面
Page({
    data: {
        // 是否已经和服务器连接
        connected: false,

        // 游戏是否进行中
        playing: false,

        // 当前需要展示的游戏信息
        gameInfo: "",

        // 开始游戏按钮文本
        startButtonText: "开始",

        //「我」的信息，包括昵称、头像、分数、选择
        myName: "",
        myAvatar: null,
        myScore: 0,
        myStreak: 0,
        myChoice: Math.floor(Math.random() * 10000) % 3 + 1,

        //「你」的信息
        youHere: false,
        yourName: "",
        yourAvatar: null,
        yourScore: 0,
        yourStreak: 0,
        yourChoice: 1,
        yourMove: 0,

        // 取得胜利的是谁
        win: null
    },

    // 页面显示后，开始连接
    onShow: function() {
        this.begin();
    },

    // 进行登录和链接，完成后开始启动游戏服务
    begin: co.wrap(function *() {
        try {
            this.setData({ gameInfo: "正在登陆" });
            yield login();

            this.setData({ gameInfo: "正在连接"});
            yield this.connect();
        } catch (error) {
            console.error('error on login or connect: ', error);
        }
        this.serve();
    }),

    // 链接到服务器后进行身份识别
    connect: co.wrap(function *() {

        const tunnel = this.tunnel = new Tunnel();
        try {
            yield tunnel.connect(`wss://${app.config.host}/game`, wafer.buildSessionHeader());
        } catch (connectError) {
            console.error({ connectError });
            this.setData({ gameInfo: "连接错误" });
            throw connectError;
        }
        tunnel.on('close', () => {
            this.setData({
                connected: false,
                gameInfo: "连接已中断"
            });
        });
        this.setData({ 
            gameInfo: "准备",
            connected: true,
            gameState: 'connected'
        });
        return new Promise((resolve, reject) => {
            // 10 秒后超时
            const timeout = setTimeout(() => reject, 10000);
            tunnel.on('id', ({ uname, uid, uavatar }) => {
                this.uid = uid;
                this.setData({
                    myName: uname,
                    myAvatar: uavatar
                });
                resolve(tunnel);
                clearTimeout(timeout);
            });
        });
    }),

    // 开始进行游戏服务
    serve: co.wrap(function *() {
        const tunnel = this.tunnel;

        // 游戏开始，初始化对方信息，启动计时器
        tunnel.on('start', packet => {
            const you = packet.players.filter(user => user.uid !== this.uid).pop();

            this.setData({
                playing: false,
                done: false,
                finding: true,
                gameInfo: '正在寻找玩伴...'
            });
            setTimeout(() => {
                this.setData({
                    youHere: true, 
                    yourName: you.uname,
                    yourAvatar: you.uavatar,
                    finding: false,
                    playing: true,
                    gameInfo: "准备"
                });
            }, 10);

            let gameTime = packet.gameTime;
            clearInterval(this.countdownId);
            this.countdownId = setInterval(() => {
                if (gameTime > 0) {
                    this.setData({ gameInfo: --gameTime });
                } else {
                    clearInterval(this.countdownId);
                }
            }, 1000);

            this.tunnel.emit('choice', { choice: this.data.myChoice });
        });

        // 对方有动静的时候，触发提醒
        let movementTimer = 0;
        const movementTimeout = 300;
        tunnel.on('movement', packet => {
            const lastMove = this.lastMove;

            this.setData({ yourMove: lastMove == 1 ? 2 : 1 });

            clearTimeout(movementTimer);
            movementTimer = setTimeout(() => {
                this.lastMove = this.data.yourMove;
                this.setData({ yourMove: 0 });
            }, 300);
        });

        // 服务器通知结果
        tunnel.on('result', packet => {
            
            // 清除计时器
            clearInterval(this.countdownId);

            // 双方结果
            const myResult = packet.result.find(x => x.uid == this.uid);
            const yourResult = packet.result.find(x => x.uid != this.uid);

            // 本局结果
            let gameInfo, win = 'nobody';

            if (myResult.roundScore == 0 && yourResult.roundScore == 0) {
                gameInfo = pickText(EQ_TEXTS);
            }
            else if (myResult.roundScore > 0) {
                gameInfo = pickText(WIN_TEXTS);
                win = 'me';
            }
            else {
                gameInfo = pickText(LOSE_TEXTS);
                win = 'you'
            }

            // 更新到视图
            this.setData({
                gameInfo,
                myScore: myResult.totalScore,
                myStreak: myResult.winStreak,
                yourChoice: yourResult.choice,
                yourScore: yourResult.totalScore,
                yourStreak: yourResult.winStreak,
                gameState: 'finish',
                win,
                startButtonText: win == 'you' ? "不服" : "再来", 
                done: true
            });

            lab.finish('game');
            setTimeout(() => this.setData({ playing: false }), 1000);
        });
    }),

    requestComputer() {
        if (this.tunnel) {
            this.tunnel.emit('requestComputer');
        }
    },

    // 点击开始游戏按钮，发送加入游戏请求
    startGame: co.wrap(function *() {
        if (this.data.playing) return;
        if (!this.data.connected) return;

        this.setData({
            playing: false,
            done: false,
            finding: true,
            gameInfo: '正在寻找玩伴...'
        });
        this.tunnel.emit('join');
    }),

    // 点击手势，更新选择是石头、剪刀还是布
    switchChoice(e) {
        if (!this.data.playing) return;
        let myChoice = this.data.myChoice + 1;
        if (myChoice == 4) {
            myChoice = 1;
        }
        this.setData({ myChoice });
        this.tunnel.emit('choice', { choice: myChoice });
    }
});
