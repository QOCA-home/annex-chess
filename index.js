var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var crypto = require('crypto')

var matches = [];
var waitfor = [];
var sockets = {};

app.use(express.static('client'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/search_match', function(req, res){
  var uuid = req.query.uuid;
  var foundWaitfor = waitfor.find(function(elm) {
  	return elm.uuid == uuid;
  });
  if(!foundWaitfor) waitfor.push({uuid: uuid, res: res});
});

setInterval(function() {
  if(waitfor.length >= 2) {
  	var u1 = waitfor[0].uuid, u2 = waitfor[1].uuid;
  	var r1 = waitfor[0].res, r2 = waitfor[1].res;
  	var s1 = sockets[u1], s2 = sockets[u2];
  	var matchId = crypto.createHash('md5').update(u1+u2).digest("hex");

  	var match = {};
  	match['matchId'] = matchId;
  	match[u1] = 'black';
  	match[u2] = 'white';

  	r1.json(match);
  	r2.json(match);

  	s1.join(matchId);
  	s2.join(matchId);

  	matches.push(match);
  	waitfor.splice(0, 1);
  	waitfor.splice(0, 1);
  }
}, 1000);

io.on('connection', function(socket){
  sockets[socket.handshake.query.uuid] = socket;
  socket.on('chess', function(place, color, matchId){
    socket.broadcast.to(matchId).emit('chess', place, color);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
