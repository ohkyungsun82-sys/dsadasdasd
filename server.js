const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let players = {};
let world = {};

// 초기 기본 지형 생성 (간단한 바닥)
for (let x = -20; x <= 20; x++) {
    world[`${x},10`] = 3; // 잔디
    world[`${x},11`] = 1; // 흙
    world[`${x},12`] = 1; // 흙
}

io.on('connection', (socket) => {
    console.log(`플레이어 접속: ${socket.id}`);

    players[socket.id] = {
        id: socket.id,
        x: 0,
        y: 200
    };

    // 초기 데이터 전송
    socket.emit('init', {
        id: socket.id,
        world: world,
        players: players
    });

    // 다른 플레이어에게 접속 알림
    socket.broadcast.emit('currentPlayers', players);

    // 플레이어 이동 처리
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // 블록 설치
    socket.on('placeBlock', (data) => {
        const key = `${data.x},${data.y}`;
        world[key] = data.type;
        io.emit('worldUpdate', world);
    });

    // 블록 파괴
    socket.on('breakBlock', (data) => {
        const key = `${data.x},${data.y}`;
        if (world[key]) {
            delete world[key];
            io.emit('worldUpdate', world);
        }
    });

    // 접속 해제
    socket.on('disconnect', () => {
        console.log(`플레이어 퇴장: ${socket.id}`);
        delete players[socket.id];
        io.emit('currentPlayers', players);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});