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

var DBmanufacturer;
var tagid;

var client_res;
var database_res;

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
app.get('/All', function(req, res){
    res.sendFile(__dirname + '/indexAll.html');
});

http.listen(3000, function(){
    console.log('listening to port 3000');
});

//var client = mqtt.connect('mqtt://54.200.3.119:1883');
//var client = mqtt.connect('mqtt://rfidproject.hjcelindro.co.uk:1883');
var client = mqtt.connect('mqtt://rfidproject.hjcelindro.co.uk:1883');
var server = mqtt.connect('mqtt://rfidproject.hjcelindro.co.uk:1883');

//--------------------------------------------------

io.sockets.on('connection',function(socket){
    server.subscribe('response/manufacturer');
    console.log("subscribed to server'");
    
    
    console.log('------------------------------');

    
    socketConnections++;
    io.sockets.emit('users connected',socketConnections);
    
    var addedClient = false;
    
    socket.on('subscribe',function(data){
        console.log('a user connected'+socket.id);
        if(data.topic=='manufacturer/All'){
            client.subscribe('manufacturer/');
            console.log('------------------------------');
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
        //message="";
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
        //console.log("Time from mqtt to client: "+mqtt_time);
    });
    
    socket.on('client response',function(data){
        client_res=data;
        var response = client_res;
        client.publish('response/manufacturer',response);
        io.emit('data_change',{'topic':String(topic), 'payload':data});
        searchManufacturerDatabase();
    });
});
 
client.on('message',function(topic,message){
    on_mqtt = new Date().getTime();
    console.log("Client.on "+String(message)+ " "+String(topic));
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

server.on('message',function(topic,message){
    console.log("client responded with: "+ message);
    var themessage = String(message);
    var split = themessage.split('/');
    var id = split[0];
    var action = split[1];
    
    
    if(action==='collect'){
        console.log('item '+id+' to be collected');
        database_res="Collection";
    }
    else{
        console.log('take item to recycling area');
        database_res="Recycle";
        
    }
    ActionUpdateDatabase(id);
    io.emit('data_change',{'topic':String(topic), 'payload':data});
    searchManufacturerDatabase();

});

//search Database for manufacturer
function searchManufacturerDatabase(){
    console.log("Join Table");
    var pre_query = new Date().getTime();
    //-----this is a query function that gets rfid data from the online database and compares with reader values                
    connection.query('SELECT rfid.item_rfid,rfid.item_manufacturer,rfid.item_location,rfid.Action, Sensor.location, Sensor.idSensor, readings.idSensor, readings.time, readings.dataReading FROM rfid INNER JOIN Sensor ON rfid.item_location=Sensor.location inner join readings on Sensor.location=readings.idSensor',function(err,rows){
        if(err)throw err;
        else{
            var post_query = new Date().getTime();
            var duration = (post_query-pre_query)/1000;
            console.log('------------------------------');
            console.log("database connection taken: "+duration);
            console.log('Data receieved from database'); //display message that data has been acquired from the database
            console.log('------------------------------');
            
            for(var i=0; i<rows.length;i++){
                DBmanufacturer = rows[i].item_manufacturer;
                tagid = rows[i].item_rfid; //to make coding easier
                loc = rows[i].item_location;
                var sensorData = rows[i].dataReading;
                var time = rows[i].time;
                var response_message=rows[i].Action;  
                console.log(tagid+response_message);
                
                if(DBmanufacturer===manufacturer){
                    data = {id:tagid,location:loc,manufacturer:DBmanufacturer,message:sensorData};
                    items.push(data);
                    io.to(manufacturer).emit('mqtt',{'topic':String(topic), 'payload':data});  
                }
                io.to('All').emit('mqtt',{'topic':'manufacturer/All', 'payload':{id:tagid,location:loc,manufacturer:DBmanufacturer,message:sensorData,response:response_message}});
            }
        }//END ELSE STATEMENT
    }); //END QUERY
} //END searchManufacturerDatabase();

//search Database for manufacturer
function ActionUpdateDatabase(rfid){
    console.log("update rfid set Action="+"'"+database_res+"'"+" where item_rfid="+"'"+rfid+"'");
    var pre_query = new Date().getTime();
    //-----this is a query function that gets rfid data from the online database and compares with reader values   
    connection.query("update rfid set Action="+"'"+database_res+"'"+" where item_rfid="+"'"+rfid+"'",function(err,rows){
        if(err)throw err;
        else{
            var post_query = new Date().getTime();
            var duration = (post_query-pre_query)/1000;
            console.log('------------------------------');
            console.log("database connection taken: "+duration);
            console.log('------------------------------');
            for(var i=0; i<rows.length;i++){
                DBmanufacturer = rows[i].item_manufacturer;
                tagid = rows[i].item_rfid; //to make coding easier
                loc = rows[i].item_location;
                var sensorData = rows[i].dataReading;
                var time = rows[i].time;
                var response_message=rows[i].Action;                
                io.to('All').emit('mqtt',{'topic':'manufacturer/All', 'payload':{id:tagid,location:loc,manufacturer:DBmanufacturer,message:sensorData},response:response_message});
            }
        }//END ELSE STATEMENT
    }); //END QUERY
} //END searchManufacturerDatabase();
