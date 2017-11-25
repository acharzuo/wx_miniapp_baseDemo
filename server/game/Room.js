
/**
enum GameChoice {
    // 剪刀
    Scissors = 1,
    // 石头
    Rock = 2,
    // 布
    Paper = 3
}
*/
function judge(choice1, choice2) {
    // 和局
    if (choice1 == choice2) return 0;
    // Player 1 没出，Player 2 胜出
    if (!choice1) return 1;
    // Player 2 没出，Player 1 胜出
    if (!choice2) return -1;
    // 都出了就这么算
    return (choice1 - choice2 + 3) % 3 == 1 ? -1 : 1;
}

/** @type {Room[]} */
const globalRoomList = [];

// 每个房间最多两人
const MAX_ROOT_MEMBER = 2;

// 游戏时间，单位秒
const GAME_TIME = 3;

let nextRoomId = 0;

/** 表示一个房间 */
module.exports = class Room {

    /** 获取所有房间 */
    static all() {
        return globalRoomList.slice();
    }

    /** 获取有座位的房间 */
    static findRoomWithSeat() {
        return globalRoomList.find(x => !x.isFull());
    }

    /** 创建新房间 */
    static create() {
        const room = new Room();
        globalRoomList.unshift(room);
        return room;
    }

    constructor() {
        this.id = `room${nextRoomId++}`;
        this.players = [];
    }

    /** 添加玩家 */
    addPlayer(player) {
        const { uid, uname } = player.user;
        console.log(`Player ${uid}(${uname}) enter ${this.id}`);
        this.players.push(player);
        if (this.isFull()) {
            this.startGame();
        }
    }

    /** 删除玩家 */
    removePlayer(player) {
        const { uid, uname } = player.user;
        console.log(`Player ${uid}(${uname}) leave ${this.id}`);
        const playerIndex = this.players.indexOf(player);
        if (playerIndex != -1) {
            this.players.splice(playerIndex, 1);
        }
        if (this.players.length === 0) {
            console.log(`Room ${this.id} is empty now`);
            const roomIndex = globalRoomList.indexOf(this);
            if (roomIndex > -1) {
                globalRoomList.splice(roomIndex, 1);
            }
        }
    }

    /** 玩家已满 */
    isFull() {
        return this.players.length == MAX_ROOT_MEMBER;
    }

    /** 开始游戏 */
    startGame() {
        // 保留这行日志输出可以让实验室检查到实验的完成情况
        console.log('game started!');

        // 当局积分清零
        this.players.forEach(player => player.gameData.roundScore = 0);

        // 集合玩家用户和游戏数据
        const players = this.players.map(player => Object.assign({}, player.user, player.gameData));

        // 通知所有玩家开始
        for (let player of this.players) {
            player.send('start', {
                gameTime: GAME_TIME,
                players
            });
        }

        // 计时结束
        setTimeout(() => this.finishGame(), GAME_TIME * 1000);
    }

    /** 结束游戏 */
    finishGame() {
        const players = this.players;

        // 两两对比算分
        for (let i = 0; i < MAX_ROOT_MEMBER; i++) {
            let p1 = players[i];
            if (!p1) break;
            for (let j = i + 1; j < MAX_ROOT_MEMBER; j++) {
                let p2 = players[j];
                const result = judge(p1.gameData.choice, p2.gameData.choice);
                p1.gameData.roundScore -= result;
                p2.gameData.roundScore += result;
            }
        }
        // 计算连胜奖励
        for (let player of players) {
            const gameData = player.gameData;
            // 胜局积分
            if (gameData.roundScore > 0) {
                gameData.winStreak++;
                gameData.roundScore *= gameData.winStreak;
            }
            // 败局清零
            else if (gameData.roundScore < 0) {
                gameData.roundScore = 0;
                gameData.winStreak = 0;
            }
            // 累积总分
            gameData.totalScore += gameData.roundScore;
        }
        // 计算结果
        const result = players.map(player => {
            const { uid } = player.user;
            const { roundScore, totalScore, winStreak, choice } = player.gameData;
            return { uid, roundScore, totalScore, winStreak, choice };
        });
        // 通知所有玩家游戏结果
        for (let player of players) {
            player.send('result', { result });
        }
    }
}