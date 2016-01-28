var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mqtt = require('mqtt');

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function(){
    console.log('listening to port 3000');
});

var client = mqtt.connect('mqtt://54.200.3.119:1883');

io.sockets.on('connection',function(socket){
    socket.on('subscribe',function(data){
        console.log('Subscribing to :'+data.topic);
        client.subscribe(data.topic);
    });
});
    
io.sockets.on('connection', function(socket){
     console.log('a user connected');
    socket.on('disconnect', function(){
            console.log('user disconnected');
    });
    socket.on('mqtt',function(data){
        console.log(data.payload);
    });
});

client.on('message',function(topic,message){
    console.log(String(message)+ " "+String(topic));
    io.sockets.in(topic).emit('mqtt',{'topic':String(topic), 'payload':String(message)});
});
