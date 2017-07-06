var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var crypto = require('crypto')

var matches = [];
var waitfor = [];
var sockets = {};

var debug = true;

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

  if(debug) {
    console.log('added to search match: '+uuid);
    var s = '[';
    waitfor.forEach(function(elm) {
      s = s + elm.uuid + ' ';
    });
    s += ']';
    console.log('total search match: '+s);
  }
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

    if(debug) {
      console.log('a match closed: '+JSON.stringify(match));
      console.log('total matches: '+JSON.stringify(matches));
    }
  }
}, 1000);

io.on('connection', function(socket){
  if(debug) console.log('on connect: '+socket.handshake.query.uuid);
  var uuid = socket.handshake.query.uuid;
  sockets[uuid] = socket;
  socket.on('chess', function(place, color, matchId){
    socket.broadcast.to(matchId).emit('chess', place, color);
  });
  socket.on('disconnect', function(){
  	if(debug) console.log('on disconnect: '+uuid);
    // remove request of waiting-for matching
    var foundWaitforIdx = waitfor.findIndex(function(elm) {
      return elm.uuid == uuid;
    });
    if(foundWaitforIdx > -1) {
      waitfor[foundWaitforIdx].res.set("Connection", "close");
      waitfor.splice(foundWaitforIdx, 1);
    }
    if(debug) {
      console.log('removed from search match: '+uuid);
      var s = '[';
      waitfor.forEach(function(elm) {
        s = s + elm.uuid + ' ';
      });
      s += ']';
      console.log('total search match: '+s);
    }

    // remove match
    var foundMatchIdx = matches.findIndex(function(elm) {
      var keyset = Object.keys(elm);
      var kIdx = keyset.findIndex(function(k) {
        return k == uuid;
      });
      if(kIdx > -1) return true;
      else return false;
    });
    if(foundMatchIdx > -1) {
      var match = matches[foundMatchIdx], matchId = match.matchId;
      socket.broadcast.to(matchId).emit('end chess', 'Opponent leaves!');
      matches.splice(foundMatchIdx, 1);
    }
    if(debug) {
      console.log('a match closed: '+JSON.stringify(match));
      console.log('total matches: '+JSON.stringify(matches));
    }
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
