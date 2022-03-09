const express    = require("express");
const app        = express();
const http       = require("http");
const { emit }   = require("process");
const server     = http.createServer(app);
const io         = require('socket.io')(server);
const Jimp       = require("jimp");
const imageArray = ['/frog', '/landscape', '/shark'];

const LISTEN_PORT       = 8080;           //default port 80
const ABS_STATIC_PATH   = __dirname + '/public';

app.get('/', function (req, res) {
    res.sendFile('index.html', {root:ABS_STATIC_PATH});
});

app.get('/3D', function (req, res) {
    res.sendFile('3d-view.html', {root:ABS_STATIC_PATH});
});

app.get('/2D', function (req, res) {
    res.sendFile('2d-view.html', {root:ABS_STATIC_PATH});
});

app.get('/frog', function (req, res) {
    res.sendFile('/assets/images/frog.jfif', {root:ABS_STATIC_PATH});
});

app.get('/landscape', function (req, res) {
    res.sendFile('/assets/images/landscape.jfif', {root:ABS_STATIC_PATH});
});

app.get('/shark', function (req, res) {
    res.sendFile('/assets/images/shark.jfif', {root:ABS_STATIC_PATH});
});

var clientData = {};
var chosenImg;
var playerReady = {
    team_one_artist: false,
    team_one_assistant: false,
    team_two_artist: false,
    team_two_assistant: false,
};

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

io.on('connection', (socket) => {
    console.log(`${socket.id} has connected.`);

    clientData[socket.id] = {socket: socket};
    socket.on('choose_team', (data) => {
        console.log(`Joining room: ${data}`);
        clientData[socket.id].room = data;
        socket.join(data);
    });

    socket.on('choose_role', (data) => {
        clientData[socket.id].role = data;
    });

    socket.on('player_ready', (data) => {
        playerReady[`${clientData[socket.id].room}_${clientData[socket.id].role}`] = true;
        console.log(playerReady)
        let readyCount = 0;
        for (const [key, value] of Object.entries(playerReady)) {
            if (value === true) { readyCount++; }
        }
        io.sockets.emit('ready_count_update', readyCount);
        console.log('Players ready:', readyCount);
        if(readyCount == 4) {
            for (const key of Object.entries(playerReady)) {
                playerReady[key] = false;
            }
            chosenImg = imageArray[getRandomInt(3)];
            io.sockets.emit('start_game', chosenImg);
            setTimeout(() => { io.sockets.emit('end_game') }, 60000);
        }
    });

    socket.on('get_ready_players', (data) => {
        let readyCount = 0;
        for (const [key, value] of Object.entries(playerReady)) {
            if (value === true) { readyCount++; }
        }
        io.sockets.emit('ready_count_update', readyCount);
        console.log('Players ready:', readyCount);
    });

    socket.on('rate_final_result', (data) => {
        let userInputImg = data.split(',');
        Jimp.read(Buffer.from(userInputImg[1], 'base64'))
            .then(processedUserImg => {
                Jimp.read(`./public/assets/images${chosenImg}.jfif`)
                    .then(referenceImg => {
                        console.log(`Percent: ${Jimp.diff(processedUserImg, referenceImg).percent}`);
                        let percent = -(((Jimp.diff(processedUserImg, referenceImg).percent) * 100) - 100).toFixed(4);
                        io.sockets.to(clientData[socket.id].room).emit('send_results', percent);
                    })
                    .catch(err => {
                        console.error(err);
                    });
            })
            .catch(err => {
                console.error(err);
            });
    });

    socket.on('update_drawing', (data) => {
        console.log(`sending updated drawing to ${clientData[socket.id].room}`);
        io.sockets.to(clientData[socket.id].room).emit("send_drawing", data);
    });

    socket.on('disconnect', () => {
        console.log(`${socket.id} has disconnected.`);
        playerReady[`${clientData[socket.id].room}_${clientData[socket.id].role}`] = false;
        let readyCount = 0;
        for (const [key, value] of Object.entries(playerReady)) {;
            if (value === true) { readyCount++; }
        }
        io.sockets.emit('ready_count_update', readyCount);
        delete clientData[socket.id];
    });

    // sockets for colour emit events
    socket.on("red", (data) => {
        console.log(`red event received for ${clientData[socket.id].room}`);
        io.sockets.to(clientData[socket.id].room).emit("color_change", {r:255, g:0, b:0});
    });

    socket.on("blue", (data) => {
        console.log(`blue event received for ${clientData[socket.id].room}`);
        io.sockets.to(clientData[socket.id].room).emit("color_change", {r:0, g:0, b:255});
    });

    socket.on("green", (data) => {
        console.log(`green event received for ${clientData[socket.id].room}`);
        io.sockets.to(clientData[socket.id].room).emit("color_change", {r:0, g:255, b:0});
    });

    socket.on("yellow", (data) => {
        console.log(`yellow event received for ${clientData[socket.id].room}`);
        io.sockets.to(clientData[socket.id].room).emit("color_change", {r:255, g:255, b:0});
    });

    socket.on("black", (data) => {
        console.log(`black event received for ${clientData[socket.id].room}`);
        io.sockets.to(clientData[socket.id].room).emit("color_change", {r:0, g:0, b:0});
    });
});

server.listen(LISTEN_PORT);                         //starts server
app.use(express.static(__dirname + '/public'));     //the client can access these files via http
console.log("Listening on port: " + LISTEN_PORT);   //a console output so we know something is happening