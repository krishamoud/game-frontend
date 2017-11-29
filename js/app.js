var io = require('socket.io-client');
var $ = require('jquery');
// var ChatClient = require('./chat-client');
var Canvas = require('./canvas');
var global = require('./global');
var Face = require('./faces');
var playerNameInput = document.getElementById('playerNameInput');
var socket;
var reason;

var debug = function(args) {
    if (console && console.log) {
        console.log(args);
    }
};

if ( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) {
    global.mobile = true;
}

function startGame(type) {
    global.playerName = playerNameInput.value.replace(/(<([^>]+)>)/ig, '').substring(0,25);
    global.playerType = type;

    global.screenWidth = window.innerWidth;
    global.screenHeight = window.innerHeight;

    document.getElementById('startMenuWrapper').style.maxHeight = '0px';
    document.getElementById('gameAreaWrapper').style.opacity = 1;
    if (!socket) {
        // socket = io('http://localhost:9090', {path: '/api/v1/connect', query:"type=" + type});
        socket = new WebSocket(`ws://172.20.0.223:9090/api/v1/connect?type=${type}`);
        setupSocket(socket);
    }
    if (!global.animLoopHandle)
        animloop();
    waitForSocketConnection(socket);
}

// Make the function wait until the connection is made...
function waitForSocketConnection(socket) {
  setTimeout(
    function() {
      if (socket.readyState === 1) {
        console.log("Connection is made")
        socket.send(JSON.stringify({type: 'respawn'}));
        // window.chat.socket = socket;
        // window.chat.registerFunctions();
        window.canvas.socket = socket;
        global.socket = socket;
        return;
      } else {
        console.log("wait for connection...")
        waitForSocketConnection(socket);
      }
    }, 5); // wait 5 milisecond for the connection...
}

// Checks if the nick chosen contains valid alphanumeric characters (and underscores).
function validNick() {
    var regex = /^\w*$/;
    debug('Regex Test', regex.exec(playerNameInput.value));
    return regex.exec(playerNameInput.value) !== null;
}

window.onload = function() {

    var btn = document.getElementById('startButton'),
        btnS = document.getElementById('spectateButton'),
        nickErrorText = document.querySelector('#startMenu .input-error');

    btnS.onclick = function () {
        startGame('spectate');
    };

    btn.onclick = function () {

        // Checks if the nick is valid.
        if (validNick()) {
            nickErrorText.style.opacity = 0;
            startGame('player');
        } else {
            nickErrorText.style.opacity = 1;
        }
    };

    var settingsMenu = document.getElementById('settingsButton');
    var settings = document.getElementById('settings');
    var instructions = document.getElementById('instructions');

    settingsMenu.onclick = function () {
        if (settings.style.maxHeight == '300px') {
            settings.style.maxHeight = '0px';
        } else {
            settings.style.maxHeight = '300px';
        }
    };

    playerNameInput.addEventListener('keypress', function (e) {
        var key = e.which || e.keyCode;

        if (key === global.KEY_ENTER) {
            if (validNick()) {
                nickErrorText.style.opacity = 0;
                startGame('player');
            } else {
                nickErrorText.style.opacity = 1;
            }
        }
    });
};

// TODO: Break out into GameControls.

var foodConfig = {
    border: 0,
};

var playerConfig = {
    border: 6,
    textColor: '#FFFFFF',
    textBorder: '#000000',
    textBorderSize: 3,
    defaultSize: 30
};

var player = {
    id: -1,
    x: global.screenWidth / 2,
    y: global.screenHeight / 2,
    screenWidth: global.screenWidth,
    screenHeight: global.screenHeight,
    massTotal: 10,
    w: 10,
    scale: 1,
    target: {x: global.screenWidth / 2, y: global.screenHeight / 2}
};
global.player = player;

var foods = [];
var ballistics = [];
var viruses = [];
var fireFood = [];
var users = [];
var leaderboard = [];
var target = {x: player.x, y: player.y};
global.target = target;

window.canvas = new Canvas();
// window.chat = new ChatClient();

var visibleBorderSetting = document.getElementById('visBord');
visibleBorderSetting.onchange = settings.toggleBorder;

var showMassSetting = document.getElementById('showMass');
showMassSetting.onchange = settings.toggleMass;

var continuitySetting = document.getElementById('continuity');
continuitySetting.onchange = settings.toggleContinuity;

var roundFoodSetting = document.getElementById('roundFood');
roundFoodSetting.onchange = settings.toggleRoundFood;

var c = window.canvas.cv;
var graph = c.getContext('2d');

$( "#feed" ).click(function() {
    socket.send(JSON.stringify({type:'1'}));
    window.canvas.reenviar = false;
});

$( "#split" ).click(function() {
    socket.send(JSON.stringify({type:'2'}));
    window.canvas.reenviar = false;
});

// socket stuff.
function setupSocket(socket) {
    socket.onmessage = function(evt) {
      try {
        const cmd = JSON.parse(evt.data)
        switch (cmd.type) {
          case 'pongcheck':
            pongcheck();
            break;
          case 'connect_failed':
            connect_failed()
            break;
          case 'disconnect':
            disconnect()
            break;
          case 'welcome':
            welcome(cmd.data)
            break;
          case 'gameSetup':
            gameSetup(cmd.data)
            break
          case 'playerDied':
            playerDied(cmd.data)
            break;
          case 'playerDisconnect':
            playerDisconnect(cmd.data);
            break;
          case 'leaderboard':
            leaderboard(cmd.data);
            break;
          case 'serverMSG':
            serverMSG(cmd.data);
            break;
          case 'serverSendPlayerChat':
            serverSendPlayerChat(cmd.data);
            break;
          case 'serverTellPlayerMove':
            serverTellPlayerMove(cmd.data.players, cmd.data.visibleFood, cmd.data.visibleBallistics, cmd.data.visibleVirus);
            break;
          case 'RIP':
            RIP();
            break;
          case 'kick':
            kick(cmd.data);
            break;
          case 'virusSplit':
            virusSplit(cmd.data)
          default:
        }
      } catch (e) {
        console.log(e)
      }

    }
}

// Handle ping.
function pongcheck() {
    var latency = Date.now() - global.startPingTime;
    debug('Latency: ' + latency + 'ms');
    // window.chat.addSystemLine('Ping: ' + latency + 'ms');
};

// Handle error.
function connect_failed() {
    socket.close();
    global.disconnected = true;
};

function disconnect() {
    socket.close();
    global.disconnected = true;
};

// Handle connection.
function welcome(playerSettings) {
    player = playerSettings;
    player.name = global.playerName;
    player.screenWidth = global.screenWidth;
    player.screenHeight = global.screenHeight;
    player.target = window.canvas.target;
    global.player = player;
    // window.chat.player = player;
    socket.send(JSON.stringify({type:'gotit', data: player}));
    global.gameStart = true;
    debug('Game started at: ' + global.gameStart);
    // window.chat.addSystemLine('Connected to the game!');
    // window.chat.addSystemLine('Type <b>-help</b> for a list of commands.');
    if (global.mobile) {
        document.getElementById('gameAreaWrapper').removeChild(document.getElementById('chatbox'));
    }
    c.focus();
};

function gameSetup(data) {
    global.gameWidth = data.gameWidth;
    global.gameHeight = data.gameHeight;
    resize();
};

function leaderboard(data) {
    leaderboard = data.leaderboard;
    var status = '<span class="title">Leaderboard</span>';
    for (var i = 0; i < leaderboard.length; i++) {
        status += '<br />';
        if (leaderboard[i].id == player.id){
            if(leaderboard[i].name.length !== 0)
                status += '<span class="me">' + (i + 1) + '. ' + leaderboard[i].name + "</span>";
            else
                status += '<span class="me">' + (i + 1) + ". An unnamed cell</span>";
        } else {
            if(leaderboard[i].name.length !== 0)
                status += (i + 1) + '. ' + leaderboard[i].name;
            else
                status += (i + 1) + '. An unnamed cell';
        }
    }
    //status += '<br />Players: ' + data.players;
    document.getElementById('status').innerHTML = status;
};

// Handle movement.
function serverTellPlayerMove(userData, foodsList, ballisticList, virusList) {
    var playerData;
    for(var i =0; i< userData.length; i++) {
        if(userData[i].id == "") {
            playerData = userData[i];
            i = userData.length;
        }
    }
    if(global.playerType == 'player') {
        // .25 = 100 * x
        // .50 = 200 * x
        // .50 / 200 =
        var minScreen = Math.min(global.screenHeight / 4, global.screenWidth / 4);
        var xoffset = player.x + playerData.w/2;
        var yoffset = player.y - playerData.point.y;
        player.w = playerData.w;
        player.x = playerData.point.x;
        player.y = playerData.point.y;
        player.hue = playerData.hue;
        player.massTotal = playerData.massTotal;
        player.cells = playerData.cells;
        player.xoffset = isNaN(xoffset) ? 0 : xoffset;
        player.yoffset = isNaN(yoffset) ? 0 : yoffset;
    }
    users = userData;
    foods = foodsList;
    viruses = virusList;
    ballistics = ballisticList;
};

// Death.
function RIP() {
    global.gameStart = false;
    global.died = true;
    window.setTimeout(function() {
        document.getElementById('gameAreaWrapper').style.opacity = 0;
        document.getElementById('startMenuWrapper').style.maxHeight = '1000px';
        global.died = false;
        if (global.animLoopHandle) {
            window.cancelAnimationFrame(global.animLoopHandle);
            global.animLoopHandle = undefined;
        }
    }, 2500);
};

function kick(data) {
    global.gameStart = false;
    reason = data;
    global.kicked = true;
    socket.close();
};

function virusSplit(virusCell) {
    socket.send(JSON.stringify({type:'2', data:virusCell}));
    reenviar = false;
};

function drawCircle(centerX, centerY, radius, sides) {
    graph.beginPath();
    graph.arc(centerX, centerY,radius,0,2*Math.PI);
    graph.stroke();
    graph.fill();
}

function drawFood(food) {
    graph.scale(player.scale, player.scale);
    graph.strokeStyle = 'hsl(' + food.hue + ', 100%, 45%)';
    graph.fillStyle = 'hsl(' + food.hue + ', 100%, 50%)';
    graph.lineWidth = foodConfig.border;
    var scaledW = global.screenWidth / player.scale;
    var scaledH = global.screenHeight / player.scale;
    drawCircle(food.point.x - player.x + scaledW / 2,
               food.point.y - player.y + scaledH / 2,
               food.radius, global.foodSides);
    graph.scale(1/player.scale, 1/player.scale);
}

function drawBallistics(ballistic) {
  graph.scale(player.scale, player.scale);
  var scaledW = global.screenWidth / player.scale;
  var scaledH = global.screenHeight / player.scale;
  graph.fillStyle = "black";
  drawCircle(ballistic.point.x - player.x + scaledW / 2,
             ballistic.point.y - player.y + scaledH / 2,
             ballistic.radius, global.foodSides);
  graph.scale(1/player.scale, 1/player.scale);

}

function drawVirus(virus) {
    graph.strokeStyle = virus.stroke;
    graph.fillStyle = virus.fill;
    graph.lineWidth = virus.strokeWidth;
    drawCircle(virus.point.x - player.x + global.screenWidth / 2,
               virus.point.y - player.y + global.screenHeight / 2,
               virus.radius, global.virusSides);
}

function drawFireFood(mass) {
    graph.strokeStyle = 'hsl(' + mass.hue + ', 100%, 45%)';
    graph.fillStyle = 'hsl(' + mass.hue + ', 100%, 50%)';
    graph.lineWidth = playerConfig.border+10;
    drawCircle(mass.x - player.x + global.screenWidth / 2,
               mass.y - player.y + global.screenHeight / 2,
               mass.radius-5, 18 + (~~(mass.masa/5)));
}

function drawPlayers(order) {
    var scaledW = global.screenWidth / player.scale;
    var scaledH = global.screenHeight / player.scale;
    var start = {
        x: player.x - (scaledW / 2),
        y: player.y - (scaledH / 2)
      };

    for(var z=0; z<order.length; z++) {
        graph.scale(player.scale, player.scale);
        var userCurrent = users[order[z].nCell];
        var cellCurrent = users[order[z].nCell].cells[order[z].nDiv];
        var x=0;
        var y=0;

        graph.strokeStyle = "black";
        graph.fillStyle = 'hsl(' + userCurrent.hue + ', 100%, 50%)';
        graph.lineWidth = playerConfig.border;
        var enemy = {
          x: userCurrent.point.x - player.x + scaledW / 2,
          y: userCurrent.point.y - player.y + scaledH / 2,
        };
        var circle = {
            x: cellCurrent.cell.x - start.x,
            y: cellCurrent.cell.y - start.y
        };
        if (userCurrent.shape === "circle" && userCurrent.id == "") {
          x = scaledW / 2;
          y = scaledH / 2;
          drawCircle(x, y, cellCurrent.radius);
        } else if (userCurrent.shape === "circle") {
          drawCircle(enemy.x, enemy.y, cellCurrent.radius);
        } else if (userCurrent.shape == "square" && userCurrent.id == "") {
          graph.beginPath();
          x = scaledW / 2;
          y = scaledH / 2;
          graph.rect(x - ((userCurrent.w) / 2), y - ((userCurrent.h) / 2), userCurrent.w, userCurrent.h);
        } else {
          graph.beginPath();
          graph.rect(enemy.x - userCurrent.w / 2, enemy.y - userCurrent.h / 2, userCurrent.w, userCurrent.h);
        }
        graph.lineJoin = 'round';
        graph.lineCap = 'round';
        graph.fill();
        graph.stroke();
        var nameCell = "";
        if(userCurrent.id == "")
            nameCell = player.name;
        else
            nameCell = userCurrent.name;

        var fontSize = Math.max(cellCurrent.radius / 3, 12);
        graph.lineWidth = playerConfig.textBorderSize;
        graph.fillStyle = playerConfig.textColor;
        graph.strokeStyle = playerConfig.textBorder;
        graph.miterLimit = 1;
        graph.lineJoin = 'round';
        graph.textAlign = 'center';
        graph.textBaseline = 'middle';
        graph.font = 'bold ' + fontSize + 'px sans-serif';

        if (global.toggleMassState === 0) {
            graph.strokeText(nameCell, circle.x, circle.y);
            graph.fillText(nameCell, circle.x, circle.y);
        } else {
            graph.strokeText(nameCell, circle.x, circle.y);
            graph.fillText(nameCell, circle.x, circle.y);
            graph.font = 'bold ' + Math.max(fontSize / 3 * 2, 10) + 'px sans-serif';
            if(nameCell.length === 0) fontSize = 0;
            graph.strokeText(Math.round(cellCurrent.mass), circle.x, circle.y+fontSize);
            graph.fillText(Math.round(cellCurrent.mass), circle.x, circle.y+fontSize);
        }
        if (userCurrent.id === "") {
          if (userCurrent.shape === "square") {
            drawFace(x - (userCurrent.w / 2), y - (userCurrent.h / 2), userCurrent.w, userCurrent.h, cellCurrent.radius, userCurrent.shape, userCurrent.eyeAngle, userCurrent.eyeLength);
          } else {
            drawFace(x - ((userCurrent.w) / 2), y, userCurrent.w, userCurrent.h, cellCurrent.radius, userCurrent.shape, userCurrent.eyeAngle, userCurrent.eyeLength);
          }
        } else {
          if (userCurrent.shape === "square") {
            drawFace(enemy.x - userCurrent.w / 2, enemy.y - userCurrent.h / 2, userCurrent.w, userCurrent.h, cellCurrent.radius, userCurrent.shape, userCurrent.eyeAngle, userCurrent.eyeLength);
          } else {
            drawFace(enemy.x - userCurrent.w / 2, enemy.y, userCurrent.w, userCurrent.h, cellCurrent.radius, userCurrent.shape, userCurrent.eyeAngle, userCurrent.eyeLength);
          }
        }
        graph.beginPath()
        graph.fillStyle="#FF0000";
        var healthBarLen = userCurrent.w * 0.75;
        var healthBarWidth = userCurrent.w * 0.1;
        var healthX, healthY;
        if (userCurrent.id == "") {
          x = scaledW / 2;
          y = scaledH / 2;
          healthX = x - healthBarLen/2;
          healthY = y + userCurrent.w/2*1.15
          graph.fillRect(healthX, healthY, (userCurrent.massCurrent / userCurrent.massTotal) * healthBarLen, healthBarWidth);
        } else {

        }
        graph.scale(1/player.scale, 1/player.scale);
    }
}

// Converts from degrees to radians.
Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};

function drawFace(x, y, w, h, r, s, d, l) {
  if (s == "circle") {
    var rp = r - (0.5 * r);
    var xp1 = x + r + Math.cos(Math.radians(45)) * rp;
    var xp2 = x + r - Math.cos(Math.radians(45)) * rp;
    var yp1 = y - Math.sin(Math.radians(45)) * rp;
    Face.eye.normal(xp1, yp1, w, r, d, l, graph);
    Face.eye.normal(xp2, yp1, w, r, d, l, graph);
    Face.mouth.happy(xp1, xp2, yp1 + rp, yp1 + rp, graph);
  } else {
    var xq = w / 4;
    var yq = h / 4;
    Face.eye.normal(x +xq, y + yq, w, r, d, l, graph);
    Face.eye.normal(x + xq*3, y + yq, w, r, d, l, graph);
    Face.mouth.happy(x + xq, x + xq*3, y + yq * 2.5, y + yq * 2.5, graph);
  }

}

function drawMouth(x1, x2, y1, y2) {
  graph.beginPath();
  graph.moveTo(x1, y1);
  graph.lineTo(x2, y2);
  // graph.bezierCurveTo(x1, y1 + (r*0.5), x2, y1 + (r *0.5), x2, y2)
  graph.stroke();
}

function valueInRange(min, max, value) {
    return Math.min(max, Math.max(min, value));
}

function drawgrid() {
    graph.beginPath();
    // graph.fillStyle = "black";
    // var gradient = graph.createLinearGradient(0, 0, global.screenWidth, global.screenHeight);
    // gradient.addColorStop(0, 'red');
    // gradient.addColorStop(1 / 6, 'orange');
    // gradient.addColorStop(2 / 6, 'yellow');
    // gradient.addColorStop(3 / 6, 'green');
    // gradient.addColorStop(4 / 6, 'blue');
    // gradient.addColorStop(5 / 6, 'indigo');
    // gradient.addColorStop(1, 'violet');
    graph.fillRect(0, 0, global.screenWidth, global.screenHeight);
     graph.lineWidth = 1;
     // graph.strokeStyle = gradient;
     graph.globalAlpha = 0.15;
     var div = 1;
     if (player.scale > 1) {
       div = 9
     } else {
       div = 9
     }
     graph.beginPath();

    for (var x = global.xoffset - player.x; x < global.screenWidth; x += global.screenHeight / div) {
        graph.moveTo(x, 0);
        graph.lineTo(x, global.screenHeight);
    }

    for (var y = global.yoffset - player.y ; y < global.screenHeight; y += global.screenHeight / div) {
        graph.moveTo(0, y);
        graph.lineTo(global.screenWidth, y);
    }

    graph.stroke();
    graph.globalAlpha = 1;
}

function drawborder() {
    graph.lineWidth = 1;
    graph.strokeStyle = playerConfig.borderColor;

    // Left-vertical.
    if (player.x <= global.screenWidth/2) {
        graph.beginPath();
        graph.moveTo(global.screenWidth/2 - player.x, 0 ? player.y > global.screenHeight/2 : global.screenHeight/2 - player.y);
        graph.lineTo(global.screenWidth/2 - player.x, global.gameHeight + global.screenHeight/2 - player.y);
        graph.strokeStyle = global.lineColor;
        graph.stroke();
    }

    // Top-horizontal.
    if (player.y <= global.screenHeight/2) {
        graph.beginPath();
        graph.moveTo(0 ? player.x > global.screenWidth/2 : global.screenWidth/2 - player.x, global.screenHeight/2 - player.y);
        graph.lineTo(global.gameWidth + global.screenWidth/2 - player.x, global.screenHeight/2 - player.y);
        graph.strokeStyle = global.lineColor;
        graph.stroke();
    }

    // Right-vertical.
    if (global.gameWidth - player.x <= global.screenWidth/2) {
        graph.beginPath();
        graph.moveTo(global.gameWidth + global.screenWidth/2 - player.x,
                     global.screenHeight/2 - player.y);
        graph.lineTo(global.gameWidth + global.screenWidth/2 - player.x,
                     global.gameHeight + global.screenHeight/2 - player.y);
        graph.strokeStyle = global.lineColor;
        graph.stroke();
    }

    // Bottom-horizontal.
    if (global.gameHeight - player.y <= global.screenHeight/2) {
        graph.beginPath();
        graph.moveTo(global.gameWidth + global.screenWidth/2 - player.x,
                     global.gameHeight + global.screenHeight/2 - player.y);
        graph.lineTo(global.screenWidth/2 - player.x,
                     global.gameHeight + global.screenHeight/2 - player.y);
        graph.strokeStyle = global.lineColor;
        graph.stroke();
    }
}

window.requestAnimFrame = (function() {
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.msRequestAnimationFrame     ||
            function( callback ) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

window.cancelAnimFrame = (function(handle) {
    return  window.cancelAnimationFrame     ||
            window.mozCancelAnimationFrame;
})();

function animloop() {
    global.animLoopHandle = window.requestAnimFrame(animloop);
    gameLoop();
}

function lerp(v0, v1, t) {
    return v0*(1-t)+v1*t
}

function gameLoop() {
    var div = Math.min(global.screenWidth / 4, global.screenHeight / 4);
    var scale = div / player.w;
    player.scale = scale;
    if (global.died) {
        graph.fillStyle = '#333333';
        graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

        graph.textAlign = 'center';
        graph.fillStyle = '#FFFFFF';
        graph.font = 'bold 30px sans-serif';
        graph.fillText('You died!', global.screenWidth / 2, global.screenHeight / 2);
    }
    else if (!global.disconnected) {
        if (global.gameStart) {
            graph.fillStyle = global.backgroundColor;
            graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

            drawgrid();
            ballistics.forEach(drawBallistics);
            foods.forEach(drawFood);

            if (global.borderDraw) {
                drawborder();
            }
            var orderMass = [];
            for(var i=0; i<users.length; i++) {
                for(var j=0; j<users[i].cells.length; j++) {
                    orderMass.push({
                        nCell: i,
                        nDiv: j,
                        mass: users[i].cells[j].mass
                    });
                }
            }
            orderMass.sort(function(obj1, obj2) {
                return obj1.mass - obj2.mass;
            });
            drawPlayers(orderMass);
            socket.send(JSON.stringify({type:'0', data:window.canvas.target})); // playerSendTarget "Heartbeat".

        } else {
            graph.fillStyle = '#333333';
            graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

            graph.textAlign = 'center';
            graph.fillStyle = '#FFFFFF';
            graph.font = 'bold 30px sans-serif';
            graph.fillText('Game Over!', global.screenWidth / 2, global.screenHeight / 2);
        }
    } else {
        graph.fillStyle = '#333333';
        graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

        graph.textAlign = 'center';
        graph.fillStyle = '#FFFFFF';
        graph.font = 'bold 30px sans-serif';
        if (global.kicked) {
            if (reason !== '') {
                graph.fillText('You were kicked for:', global.screenWidth / 2, global.screenHeight / 2 - 20);
                graph.fillText(reason, global.screenWidth / 2, global.screenHeight / 2 + 20);
            }
            else {
                graph.fillText('You were kicked!', global.screenWidth / 2, global.screenHeight / 2);
            }
        }
        else {
              graph.fillText('Disconnected!', global.screenWidth / 2, global.screenHeight / 2);
        }
    }
}

window.addEventListener('resize', resize);

function resize() {
    if (!socket) return;

    player.screenWidth = c.width = global.screenWidth = global.playerType == 'player' ? window.innerWidth : global.gameWidth;
    player.screenHeight = c.height = global.screenHeight = global.playerType == 'player' ? window.innerHeight : global.gameHeight;

    if (global.playerType == 'spectate') {
        player.x = global.gameWidth / 2;
        player.y = global.gameHeight / 2;
    }

    socket.send(JSON.stringify({type:'windowResized', data:{ screenWidth: global.screenWidth, screenHeight: global.screenHeight }}));
}
