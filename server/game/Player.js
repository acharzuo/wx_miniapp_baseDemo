const Room = require("./Room");

/**
 * 表示一个玩家，处理玩家的公共游戏逻辑，消息处理部分需要具体的玩家实现（请参考 ComputerPlayer 和 HumanPlayer）
 */
module.exports = class Player {
    constructor(user) {
        this.id = user.uid;
        this.user = user;
        this.room = null;
        this.gameData = {
            // 当前的选择（剪刀/石头/布）
            choice: null,
            // 局积分
            roundScore: 0,
            // 总积分
            totalScore: 0,
            // 连胜次数
            winStreak: 0
        };
    }

    /**
     * 上线当前玩家，并且异步返回给玩家分配的房间
     */
    online(room) {
        // 处理玩家 'join' 消息
        // 为玩家寻找一个可用的房间，并且异步返回
        this.receive('join', () => {
            if (this.room) {
                this.room.removePlayer(this);
            }
            room = this.room = room || Room.findRoomWithSeat() || Room.create();
            room.addPlayer(this);
        });

        // 处理玩家 'choise' 消息
        // 需要记录玩家当前的选择，并且通知到房间里的其它玩家
        this.receive('choice', ({ choice }) => {
            this.gameData.choice = choice;
            this.broadcast('movement', {
                uid: this.user.uid,
                movement: "choice"
            });
        });

        // 处理玩家 'leave' 消息
        // 让玩家下线
        this.receive('leave', () => this.offline);
    }

    /**
     * 下线当前玩家，从房间离开
     */
    offline() {
        if (this.room) {
            this.room.removePlayer(this);
            this.room = null;
        }
        this.user = null;
        this.gameData = null;
    }

    /**
     * 发送指定消息给当前玩家，需要具体子类实现
     * @abstract
     * @param {string} message 消息类型
     * @param {*} data 消息数据
     */
    send(message, data) {
        throw new Error('Not implement: AbstractPlayer.send()');
    }

    /**
     * 处理玩家发送的消息，需要具体子类实现
     * @abstract
     * @param {string} message 消息类型
     * @param {Function} handler
     */
    receive(message, handler) {
        throw new Error('Not implement: AbstractPlayer.receive()');
    }

    /**
     * 给玩家所在房间里的其它玩家发送消息
     * @param {string} message 消息类型
     * @param {any} data 消息数据
     */
    broadcast(message, data) {
        if (!this.room) return;
        this.others().forEach(neighbor => neighbor.send(message, data));
    }

    /**
     * 获得玩家所在房间里的其他玩家
     */
    others() {
        return this.room.players.filter(player => player != this);
    }
}