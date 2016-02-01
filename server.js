var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mqtt = require('mqtt');

var manufacturer;
var clients=[];


app.get('/:manufacturer', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function(){
    console.log('listening to port 3000');
});

var client = mqtt.connect('mqtt://54.200.3.119:1883');

io.sockets.on('connection',function(socket){
    
    var addedClient = false;
    
    socket.on('subscribe',function(data){
        console.log('Subscribing to :'+data.topic);
        client.subscribe(data.topic);
        var topic =data.topic;
        var split = topic.split('/');
        manufacturer = split[1];
    });
    socket.on('mqtt',function(data){
    });
    
    socket.on('register',function(name){
        if(addedClient) return;
            
        socket.username = name;
        addedClient = true;
        clients[name] = socket.id;
        socket.emit('update_clients',name);
            
    });
     console.log('a user connected'+socket.id);
    socket.on('disconnect', function(){
            console.log('user disconnected');
    });
    
});
 
client.on('message',function(topic,message){
    console.log("Client.on"+String(message)+ " "+String(topic));
    var split = topic.split('/');
    manufacturer = split[1];
    console.log("manu: "+manufacturer);
    //var manufacturerID = checkID(manufacturer);
    console.log("manufacturerID: "+checkID(manufacturer));
    //io.sockets.socket(manufacturerID).emit('mqtt',{'topic':String(topic), 'payload':String(message)});
});

function checkID(client){
    var value = "";
    
    for(var key in clients){
        console.log('key'+key);
        if (clients[key] == client)
            value = key;
    }
    console.log("Key: "+value);
    return value;
}
