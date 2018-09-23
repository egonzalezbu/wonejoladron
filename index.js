const ladronPercentaje = 0.3;

var WebSocketServer = require('websocket').server;
var http = require('http');

console.log("PUEBLO LADRON!");

let wonejos = [];
let connections = [];
let logs = [];


let state = 'starting';

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
  logs.push({timestamp: new Date().toLocaleTimeString(), text: text});
  updateLogs();
}

function killLadron(wonejo, ladron){
    addLog(`${wonejo.name} acusó a ${ladron.name} de ser un ladrón`);
    let localWonejo = wonejos.find((won) => {return won.code == wonejo.code});
    localWonejo.played = true;
    let localLadron = wonejos.find((won) => {return won.code == ladron.code});
    localLadron.accusations++;
    if(!wonejos.find((won) => {return !won.played && won.alive})){
        let accusedWonejo = wonejos[0];
        let tie = false;
        for(let wonejo of wonejos){
            if(wonejo.accusations > accusedWonejo.accusations){
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

function initDay(){
    state = 'day';
    addLog('Ha comenzado el día!');
    for(let wonejo of wonejos){
        wonejo.played = false;
        wonejo.accusations = 0;
    }
}

function initNight() {
    
}

function gameOver() {
    let aliveWonejos = wonejos.filter((won) => {return won.alive && !won.ladron});
    let aliveLadrones = wonejos.filter((won) => {return won.alive && won.ladron});
    if(aliveLadrones.length == 0){
        addLog('Los Wonejos han matado a todos los ladrones!');
        addLog('Victoria para los Wonejos!');
        endGame();
        return true;
    }
    if(aliveLadrones.length >= aliveWonejos.length){
        addLog('Los Ladrones han matado a todos los wonejos!');
        addLog('Victoria para los Ladrones!');
        endGame();
        return true;
    }
    return false;
    
}

function endGame(){
    
}