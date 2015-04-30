var express = require('express');
var http = require('http');

var app = express();
process.env.PORT = process.env.PORT || 7070;

app.use(express.static("public"));

http.globalAgent.maxSockets = 10;
var server = http.createServer(app);
server.listen(process.env.PORT, function() {
  console.log('Node app is running at localhost:' + process.env.PORT);
});
server.on('clientError',function (exception, socket) {
  console.log('>> Client error',exception,socket);
});
