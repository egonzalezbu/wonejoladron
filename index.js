const ladronPercentaje = 0.3;

var WebSocketServer = require('websocket').server;
var http = require('http');
const fs = require('fs');

console.log("PUEBLO LADRON!");

let wonejos = [];
let connections = [];
let logs = [];


let state = 'starting';

fs.readFile('./index.html', (err, html) => {
    if(err) {
        throw err;
    }
    var httpServer = http.createServer((req,res) => {
        res.writeHeader(200, {"Content-Type": "text/html"});  
        res.write(html);  
        res.end(); 
    }).listen(8080, '127.0.0.1', () => {
        console.log("Web Server Listening At Port: 8080");
    });
});

var server = http.createServer(function(request, response) {});
server.listen(6969, function() { });

// create the server
wsServer = new WebSocketServer({
  httpServer: server
});

// WebSocket server
wsServer.on('request', function(request) {
  var connection = request.accept(null, request.origin);
  connections.push(connection);
  console.log(`Se conectó un Wonejo: ${request.origin}`);

  connection.on('message', function(message) {
    let data = JSON.parse(message.utf8Data);
    if(data.method == 'login'){
      login(data.wonejo);
    }
    if(data.method == 'setReady'){
      setReady(data.wonejo);
    }
    if(data.method == 'killLadron'){
        killLadron(data.wonejo, data.ladron);
    }
    if(data.method == 'killWonejo'){
        killWonejo(data.ladron, data.wonejo);
    }
  });

  connection.on('close', function(connection) {
    // close user connection
  });
});

function login(wonejo) {
  console.log(`Se quiere loguear el wonejo ${wonejo.name}`);
  let won = findWonejo(wonejo.code);
  let newWonejo = won ? won : wonejo;
  if(won) addLog(`${newWonejo.name} se ha reconectado!`);
  newWonejo.name = wonejo.name;
  if(!won && state == 'starting') {
    newWonejo.alive = true;
    newWonejo.ready = false;
    newWonejo.ladron = false;
    addLog(`${newWonejo.name} se ha conectado!`);  
  } else if(!won) {
    newWonejo.alive = false;
    newWonejo.ready = true;
    newWonejo.ladron = false;
    addLog(`${newWonejo.name} se ha conectado demasiado tarde`);
  }
  if(!won) wonejos.push(newWonejo);
  updateWonejos();
  updateStatus();
}

function findWonejo(code){
  return wonejos.find((won) => {return won.code == code});
}

function updateWonejos() {
  for(let connection of connections){
    connection.sendUTF(JSON.stringify({method: "updateWonejos", wonejos: wonejos}));
  }
}

function updateLogs() {
  for(let connection of connections){
    connection.sendUTF(JSON.stringify({method: "updateLogs", logs: logs}));
  }
}

function updateStatus() {
  for(let connection of connections){
    connection.sendUTF(JSON.stringify({method: "updateStatus", state: state}));
  }
}

function setReady(won){
  let wonejo = findWonejo(won.code);
  wonejo.ready = true;
  addLog(`${wonejo.name} está listo!`);
  if(!wonejos.find((won) => {return !won.ready})){
    let ladronCount = 0;
    while(ladronCount < Math.floor(wonejos.length * ladronPercentaje)){
      let wonejo = wonejos[Math.floor(Math.random()*wonejos.length)];
      if(!wonejo.ladron){
        wonejo.ladron = true;
        ladronCount++;
        console.log(`${wonejo.name} es un ladrón!`);
      }
    }
    initDay();
    updateStatus();
  }
  updateWonejos();
}

function addLog(text){
  let log = {timestamp: new Date().toLocaleTimeString(), text: text};
  console.log(log);
  logs.push(log);
  updateLogs();
}

function killLadron(wonejo, ladron){
    let localWonejo = wonejos.find((won) => {return won.code == wonejo.code});
    let localLadron = wonejos.find((won) => {return won.code == ladron.code});
    console.log(state == 'day', !localWonejo.played, localWonejo.alive);
    if(state == 'day' && !localWonejo.played && localWonejo.alive){
        addLog(`${localWonejo.name} acusó a ${localLadron.name} de ser un ladrón`);
        localWonejo.played = true;
        localLadron.accusations++;
        if(!wonejos.find((won) => {return !won.played && won.alive})){
            let accusedWonejo = null;
            let tie = false;
            for(let wonejo of wonejos){
                if(!accusedWonejo || wonejo.accusations > accusedWonejo.accusations){
                    tie = false;
                    accusedWonejo = wonejo;
                } else if(wonejo.accusations == accusedWonejo.accusations) tie = true;
            }
            if(!tie) {
                addLog(`Los wonejos han matado a ${accusedWonejo.name} el cual era un ${accusedWonejo.ladron ? "LADRÓN!" : "WONEJO!"}`);
                accusedWonejo.alive = false;
                if(!gameOver()) initNight();
            } else {
                addLog('Ha habido un empate en la votación. Hay que votar nuevamete');
                initDay();
            }
        } 
    }
    updateWonejos();
}

function killWonejo(ladron, wonejo) {
    let localWonejo = wonejos.find((won) => {return won.code == wonejo.code});
    let localLadron = wonejos.find((won) => {return won.code == ladron.code});
    if(state == 'night' && !localLadron.played && localLadron.alive && localLadron.ladron){
        localWonejo.accusations++;
        localLadron.played = true;
        if(!wonejos.find((won) => {return won.lardon && !won.played && won.alive})){
            let killedWonejo = null;
            let tie = false;
            for(let wonejo of wonejos){
                if(!killedWonejo || wonejo.accusations > killedWonejo.accusations){
                    tie = false;
                    killedWonejo = wonejo;
                } else if(wonejo.accusations == killedWonejo.accusations) tie = true;
            }
            if(!tie) {
                addLog(`Los ladrones han matado a ${killedWonejo.name}}`);
                killedWonejo.alive = false;
                if(!gameOver()) initDay();
            } else {
                addLog('Los ladrones no se pusieron de acuerdo, deben votar nuevamente');
                initNight();
            }
        } 
    }
}



function initDay(){
    state = 'day';
    addLog('Ha comenzado el día!');
    for(let wonejo of wonejos){
        wonejo.played = false;
        wonejo.accusations = 0;
    }
    updateStatus();
    updateWonejos();
}

function initNight() {
    state = 'night';
    addLog('Ha comenzado la noche!');
    for(let wonejo of wonejos){
        wonejo.played = wonejo.ladron ? false : true;
        wonejo.accusations = 0;
    }
    updateStatus();
    updateWonejos();
}

function gameOver() {
    let aliveWonejos = wonejos.filter((won) => {return won.alive && !won.ladron});
    let aliveLadrones = wonejos.filter((won) => {return won.alive && won.ladron});
    if(aliveLadrones.length == 0){
        addLog('Los Wonejos han matado a todos los ladrones!');
        addLog('Victoria para los Wonejos!');
        updateWonejos();
        endGame();
        return true;
    }
    if(aliveLadrones.length >= aliveWonejos.length){
        addLog('Los Ladrones han matado a todos los wonejos!');
        addLog('Victoria para los Ladrones!');
        for(let wonejo of wonejos) {
            wonejo.alive = wonejo.ladron && wonejo.alive ? true : false;
        }
        updateWonejos();
        endGame();
        return true;
    }
    return false;
    
}

function endGame(){
    for(let connection of connections){
        connection.sendUTF(JSON.stringify({method: "endGame"}));
    }
    wonejos = [];
    connections = [];
    logs = [];
    state = 'starting';
}