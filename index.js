var WebSocketServer = require('websocket').server;
var http = require('http');

console.log("PUEBLO LADRON!");

var server = http.createServer(function(request, response) {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
});
server.listen(6969, function() { });

// create the server
wsServer = new WebSocketServer({
  httpServer: server
});

// WebSocket server
wsServer.on('request', function(request) {
  var connection = request.accept(null, request.origin);
  console.log('Se conectó un Wonejo');

  // This is the most important callback for us, we'll handle
  // all messages from users here.
  connection.on('message', function(message) {
      console.log("Ha llegado Carta!");
    if (message.type === 'utf8') {
      console.log(message);
    }
  });

  connection.on('close', function(connection) {
    // close user connection
  });
});