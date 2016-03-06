var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mqtt = require('mqtt');

var manufacturer;
var loc;
var tagid;
var socketConnections = [];
var clients=[];
var items = [];
var all =[];
var data;
var topic;
var on_mqtt;
var mqtt_manu;
var message;

var client_res;

var mysql = require('mysql');
/*var connection = mysql.createConnection({
    host: 'br-cdbr-azure-south-a.cloudapp.net', //using microsoft azure mySQL
    user: 'bbbfe6f5303166',
    password: '6a070d81',
    database: 'RFIDtags'
});*/
var connection = mysql.createConnection({
    host: 'iotproject.c0hpcx3lq7af.us-west-2.rds.amazonaws.com', //using microsoft azure mySQL
    user: 'hjcelindro',
    password: 'Hannah0914',
    database: 'rfidtags'
});

//-----------------DATABASE CONNECTIONS-------

//connect to the database
connection.connect(function(err){
    if(err) { //if connection fails
        console.error("error connecting: "+err.stack); //display error code and message
        return;
    }
    console.log("Connected as: "+connection.threadId); //confirmation of connection with threadID
});

//----------------------------------

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

//app.get('/loaderio-41e810be3dcd045326017c299ff7a803', function(req, res){
//    res.sendFile(__dirname + '/loaderio-41e810be3dcd045326017c299ff7a803.txt');
//});

http.listen(3000, function(){
    console.log('listening to port 3000');
});

//var client = mqtt.connect('mqtt://54.200.3.119:1883');
var client = mqtt.connect('mqtt://rfidproject.hjcelindro.co.uk:1883');

//--------------------------------------------------

io.sockets.on('connection',function(socket){
    
    console.log('a user connected'+socket.id);
    
    socketConnections++;
    io.sockets.emit('users connected',socketConnections);
    
    var addedClient = false;
    
    socket.on('subscribe',function(data){
        if(data.topic=='manufacturer/All'){
            client.subscribe('manufacturer/')
            console.log('Subscribing to: manufacturer/');
            manfacturer="All";
        }
        else{
            client.subscribe(data.topic);
            console.log('Subscribing to :'+data.topic);
            topic =data.topic;
            var split = topic.split('/');
            manufacturer = split[1];
        }
        searchManufacturerDatabase();
    });
    
    socket.on('mqtt',function(data){});
    socket.on('data_change',function(data){});
    
    socket.on('register',function(name){
        socket.emit('update_clients',name);
        socket.join(name); //join room for the manufacturer
    });
    socket.on('disconnect', function(){
        socketConnections--;
        io.sockets.emit('users connected',socketConnections);
        console.log('user disconnected');
    });
    socket.on('time taken',function(data){
        var mqtt_time = (data - on_mqtt)/1000;
        console.log("Time from mqtt to client: "+mqtt_time);
    });
    
    socket.on('client response',function(data){
        client_res=data;
        searchRFIDDatabase();
    });
});
 
client.on('message',function(topic,message){
    on_mqtt = new Date().getTime();
    console.log("Client.on"+String(message)+ " "+String(topic));
    var split = topic.split('/');
    if(topic=='manufacturer/'){
        mqtt_manu="All";
    }
    else{
        mqtt_manu = split[1];
    }
    if(mqtt_manu==manufacturer||mqtt_manu=='All'){
        io.emit('data_change',{'topic':String(topic), 'payload':data});
        searchManufacturerDatabase();
    }
});


//search Database for manufacturer
function searchManufacturerDatabase(){
    console.log("Manufacturer: "+manufacturer);
    var pre_query = new Date().getTime();
    //-----this is a query function that gets rfid data from the online database and compares with reader values                
    connection.query('SELECT * FROM rfid',function(err,rows){
        if(err)throw err;
        else{
            var post_query = new Date().getTime();
            var duration = (post_query-pre_query)/1000;
            console.log("database connection taken: "+duration);
            console.log('Data receieved from database'); //display message that data has been acquired from the database
            
            for(var i=0; i<rows.length;i++){
                var DBmanufacturer = rows[i].item_manufacturer;
                var tagid = rows[i].item_rfid; //to make coding easier
                loc = rows[i].item_location;
                searchSensorDatabase(loc);
                io.to('All').emit('mqtt',{'topic':'manufacturer/All', 'payload':{id:tagid,location:loc,manufacturer:DBmanufacturer,message:message}});
                if(DBmanufacturer===manufacturer){
                    data = {id:tagid,location:loc,manufacturer:DBmanufacturer,message:message};
                    items.push(data);
                    io.to(manufacturer).emit('mqtt',{'topic':String(topic), 'payload':data});   
                }
            }
        }//END ELSE STATEMENT
    }); //END QUERY
} //END searchManufacturerDatabase();

//search Database for manufacturer
function searchSensorDatabase(data){
    console.log("Sensor Database Loading");
    var pre_query = new Date().getTime();
    //-----this is a query function that gets rfid data from the online database               
    connection.query('SELECT * FROM Sensor',function(err,rows){
        if(err)throw err;
        else{
            var post_query = new Date().getTime();
            var duration = (post_query-pre_query)/1000;
            
            console.log("sensor database connection taken: "+duration);
            console.log('Data receieved from database'); //display message that data has been acquired from the database
            console.log("-----------------------------------------");
            for(var i=0; i<rows.length;i++){
                var sensordata = rows[i].Temperature;
                var area = rows[i].location;
                console.log("loc: "+loc+" location: "+area+" Sensor data: "+sensordata);
                if(data===area){
                    var message = "This item has been exposed to temperature: "+sensordata;
                    items.push(data);
                }
            }
        }//END ELSE STATEMENT
    }); //END QUERY
} //END searchManufacturerDatabase();
