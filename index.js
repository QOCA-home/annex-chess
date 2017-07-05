var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.use(express.static('client'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	console.log('on connect');
  socket.on('chat message', function(msg, color){
    // io.emit('chat message', msg);
    console.log(msg);
    console.log(color);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
